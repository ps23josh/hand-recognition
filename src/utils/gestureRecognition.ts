// MediaPipe types and interfaces
export interface HandLandmark {
  x: number
  y: number
  z?: number
}

export interface GestureResult {
  type: string
  confidence: number
  landmarks?: HandLandmark[]
}

// MediaPipe will be loaded from CDN
declare global {
  interface Window {
    Hands: any
    Camera: any
  }
}

export class GestureRecognizer {
  private hands: any = null
  private camera: any = null
  private isInitialized = false
  private lastGestureTime = 0
  private gestureBuffer: string[] = []
  private onResultsCallback: ((result: GestureResult | null) => void) | null = null

  constructor() {}

  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    try {
      // Load MediaPipe from CDN
      await this.loadMediaPipeScripts()
      
      // Initialize MediaPipe Hands
      this.hands = new window.Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        }
      })

      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })

      this.hands.onResults((results: any) => {
        this.processResults(results)
      })

      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize MediaPipe:', error)
      throw error
    }
  }

  private async loadMediaPipeScripts(): Promise<void> {
    // Check if already loaded
    if (window.Hands) return

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
      script.onload = () => {
        // Also load camera utils
        const cameraScript = document.createElement('script')
        cameraScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
        cameraScript.onload = () => resolve()
        cameraScript.onerror = () => reject(new Error('Failed to load MediaPipe camera utils'))
        document.head.appendChild(cameraScript)
      }
      script.onerror = () => reject(new Error('Failed to load MediaPipe hands'))
      document.head.appendChild(script)
    })
  }

  async detectGesture(
    videoElement: HTMLVideoElement,
    callback: (result: GestureResult | null) => void
  ): Promise<void> {
    if (!this.isInitialized || !this.hands) {
      throw new Error('GestureRecognizer not initialized')
    }

    this.onResultsCallback = callback

    try {
      // Send frame to MediaPipe
      await this.hands.send({ image: videoElement })
    } catch (error) {
      console.error('Error processing frame:', error)
      callback(null)
    }
  }

  private processResults(results: any): void {
    if (!this.onResultsCallback) return

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0]
      const handedness = results.multiHandedness?.[0]?.label || 'Right'
      
      // Convert MediaPipe landmarks to our format
      const handLandmarks: HandLandmark[] = landmarks.map((landmark: any) => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z
      }))

      // Classify gesture based on landmarks
      const gestureType = this.classifyGesture(handLandmarks, handedness)
      
      if (gestureType !== 'unknown') {
        // Add to gesture buffer for stability
        this.gestureBuffer.push(gestureType)
        if (this.gestureBuffer.length > 5) {
          this.gestureBuffer.shift()
        }
        
        // Check for consistent gesture
        const consistentGesture = this.getMostFrequentGesture()
        if (consistentGesture && Date.now() - this.lastGestureTime > 800) {
          this.lastGestureTime = Date.now()
          
          const confidence = this.calculateConfidence(handLandmarks)
          
          this.onResultsCallback({
            type: consistentGesture,
            confidence: confidence,
            landmarks: handLandmarks
          })
        }
      }
    } else {
      // No hands detected
      this.gestureBuffer = []
      this.onResultsCallback(null)
    }
  }

  private classifyGesture(landmarks: HandLandmark[], handedness: string): string {
    // Finger tip and pip joint indices
    const fingerTips = [4, 8, 12, 16, 20] // Thumb, Index, Middle, Ring, Pinky
    const fingerPips = [3, 6, 10, 14, 18] // PIP joints
    const fingerMcps = [2, 5, 9, 13, 17] // MCP joints

    // Check which fingers are extended
    const fingersUp = this.getFingersUp(landmarks, fingerTips, fingerPips, fingerMcps, handedness)
    
    // Classify based on finger positions
    const fingerCount = fingersUp.reduce((sum, finger) => sum + finger, 0)
    
    // Gesture classification logic
    if (fingerCount === 0) {
      return 'fist'
    } else if (fingerCount === 5) {
      return 'open_palm'
    } else if (fingersUp[1] === 1 && fingerCount === 1) {
      return 'pointing'
    } else if (fingersUp[0] === 1 && fingerCount === 1) {
      return 'thumbs_up'
    } else if (fingersUp[1] === 1 && fingersUp[2] === 1 && fingerCount === 2) {
      return 'peace'
    } else if (fingersUp[0] === 1 && fingersUp[1] === 1 && this.isOkGesture(landmarks)) {
      return 'ok_sign'
    } else if (fingersUp[1] === 1 && fingersUp[2] === 1 && fingersUp[4] === 1 && fingerCount === 3) {
      return 'rock_on'
    }
    
    return 'unknown'
  }

  private getFingersUp(
    landmarks: HandLandmark[], 
    tips: number[], 
    pips: number[], 
    mcps: number[],
    handedness: string
  ): number[] {
    const fingers = []
    
    // Thumb (special case due to different orientation)
    if (handedness === 'Right') {
      fingers.push(landmarks[tips[0]].x > landmarks[pips[0]].x ? 1 : 0)
    } else {
      fingers.push(landmarks[tips[0]].x < landmarks[pips[0]].x ? 1 : 0)
    }
    
    // Other fingers
    for (let i = 1; i < 5; i++) {
      fingers.push(landmarks[tips[i]].y < landmarks[pips[i]].y ? 1 : 0)
    }
    
    return fingers
  }

  private isOkGesture(landmarks: HandLandmark[]): boolean {
    // Check if thumb tip and index tip are close (OK gesture)
    const thumbTip = landmarks[4]
    const indexTip = landmarks[8]
    
    const distance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) + 
      Math.pow(thumbTip.y - indexTip.y, 2)
    )
    
    return distance < 0.05 // Threshold for OK gesture
  }

  private calculateConfidence(landmarks: HandLandmark[]): number {
    // Simple confidence calculation based on landmark stability
    let totalVariance = 0
    
    for (const landmark of landmarks) {
      // Calculate variance from expected positions (simplified)
      const variance = Math.abs(landmark.z || 0)
      totalVariance += variance
    }
    
    const avgVariance = totalVariance / landmarks.length
    const confidence = Math.max(0.5, Math.min(0.95, 1 - avgVariance * 10))
    
    return confidence
  }

  private getMostFrequentGesture(): string | null {
    if (this.gestureBuffer.length === 0) return null
    
    const frequency: { [key: string]: number } = {}
    this.gestureBuffer.forEach(gesture => {
      frequency[gesture] = (frequency[gesture] || 0) + 1
    })
    
    const mostFrequent = Object.keys(frequency).reduce((a, b) => 
      frequency[a] > frequency[b] ? a : b
    )
    
    // Require at least 3 consistent detections
    return frequency[mostFrequent] >= 3 ? mostFrequent : null
  }

  destroy(): void {
    if (this.camera) {
      this.camera.stop()
    }
    this.gestureBuffer = []
    this.onResultsCallback = null
  }
}
