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
        if (this.gestureBuffer.length > 3) { // Reduced buffer size for faster response
          this.gestureBuffer.shift()
        }
        
        // Check for consistent gesture
        const consistentGesture = this.getMostFrequentGesture()
        if (consistentGesture && Date.now() - this.lastGestureTime > 300) { // Reduced delay
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
    // Simplified and more reliable gesture detection
    const fingersUp = this.getFingersUpSimplified(landmarks, handedness)
    const fingerCount = fingersUp.reduce((sum, finger) => sum + finger, 0)
    
    // Debug logging
    console.log('Fingers up:', fingersUp, 'Count:', fingerCount, 'Handedness:', handedness)
    
    // Basic gesture classification based on finger count and positions
    if (fingerCount === 0) {
      return 'fist'
    } else if (fingerCount === 5) {
      return 'open_palm'
    } else if (fingersUp[0] === 1 && fingerCount === 1) {
      // Only thumb up
      return 'thumbs_up'
    } else if (fingersUp[1] === 1 && fingerCount === 1) {
      // Only index finger up
      return 'pointing'
    } else if (fingersUp[1] === 1 && fingersUp[2] === 1 && fingerCount === 2) {
      // Index and middle finger up
      return 'peace'
    } else if (fingersUp[1] === 1 && fingersUp[4] === 1 && fingerCount === 2) {
      // Index and pinky up
      return 'rock_on'
    } else if (this.isOkGestureSimplified(landmarks)) {
      return 'ok_sign'
    }
    
    return 'unknown'
  }

  private getFingersUpSimplified(landmarks: HandLandmark[], handedness: string): number[] {
    const fingers = []
    
    // Thumb (index 0) - Check horizontal extension
    const thumbTip = landmarks[4]   // Thumb tip
    const thumbMcp = landmarks[2]   // Thumb MCP joint
    const indexMcp = landmarks[5]   // Index MCP for reference
    
    // For thumb, check if it's extended away from the palm
    const thumbDistance = Math.abs(thumbTip.x - indexMcp.x)
    const isThumbUp = thumbDistance > 0.05 && thumbTip.y < thumbMcp.y + 0.02
    fingers.push(isThumbUp ? 1 : 0)
    
    // Other fingers (1-4: Index, Middle, Ring, Pinky)
    const fingerTips = [8, 12, 16, 20]
    const fingerPips = [6, 10, 14, 18]
    const fingerMcps = [5, 9, 13, 17]
    
    for (let i = 0; i < 4; i++) {
      const tipY = landmarks[fingerTips[i]].y
      const pipY = landmarks[fingerPips[i]].y
      const mcpY = landmarks[fingerMcps[i]].y
      
      // Simple check: finger is up if tip is above both PIP and MCP
      const isFingerUp = tipY < pipY && tipY < mcpY
      fingers.push(isFingerUp ? 1 : 0)
    }
    
    return fingers
  }

  private isOkGestureSimplified(landmarks: HandLandmark[]): boolean {
    const thumbTip = landmarks[4]
    const indexTip = landmarks[8]
    const middleTip = landmarks[12]
    const ringTip = landmarks[16]
    const pinkyTip = landmarks[20]
    
    // Check if thumb and index tips are close together
    const thumbIndexDistance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) + 
      Math.pow(thumbTip.y - indexTip.y, 2)
    )
    
    // Check if other fingers are extended upward
    const middleUp = middleTip.y < landmarks[10].y // Middle tip above PIP
    const ringUp = ringTip.y < landmarks[14].y     // Ring tip above PIP
    const pinkyUp = pinkyTip.y < landmarks[18].y   // Pinky tip above PIP
    
    const otherFingersUp = [middleUp, ringUp, pinkyUp].filter(Boolean).length >= 2
    
    return thumbIndexDistance < 0.08 && otherFingersUp
  }

  private calculateConfidence(landmarks: HandLandmark[]): number {
    let visibilityScore = 0
    let stabilityScore = 0
    
    // Check landmark visibility and stability
    for (const landmark of landmarks) {
      // Visibility: landmarks within reasonable frame bounds
      if (landmark.x > 0.1 && landmark.x < 0.9 && landmark.y > 0.1 && landmark.y < 0.9) {
        visibilityScore += 1
      }
      
      // Stability: reasonable z-depth values
      const z = landmark.z || 0
      if (Math.abs(z) < 0.2) {
        stabilityScore += 1
      }
    }
    
    const visibilityRatio = visibilityScore / landmarks.length
    const stabilityRatio = stabilityScore / landmarks.length
    
    // Base confidence with visibility and stability factors
    const baseConfidence = 0.7
    const confidence = baseConfidence + (visibilityRatio * 0.2) + (stabilityRatio * 0.1)
    
    return Math.max(0.6, Math.min(0.95, confidence))
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
    
    // Require at least 2 consistent detections
    return frequency[mostFrequent] >= 2 ? mostFrequent : null
  }

  destroy(): void {
    if (this.camera) {
      this.camera.stop()
    }
    this.gestureBuffer = []
    this.onResultsCallback = null
  }
}
