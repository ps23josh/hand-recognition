import React, { useRef, useEffect, useState } from 'react'
import { Camera, CameraOff, Zap, AlertCircle, Brain } from 'lucide-react'
import { GestureData } from '../App'
import { GestureRecognizer, GestureResult } from '../utils/gestureRecognition'

interface GestureDetectorProps {
  isDetecting: boolean
  onGestureDetected: (gesture: Omit<GestureData, 'id' | 'timestamp'>) => void
  sensitivity: number
}

const GestureDetector: React.FC<GestureDetectorProps> = ({
  isDetecting,
  onGestureDetected,
  sensitivity
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gestureRecognizer = useRef<GestureRecognizer | null>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const [hasCamera, setHasCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [currentGesture, setCurrentGesture] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(0)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [currentLandmarks, setCurrentLandmarks] = useState<any[] | null>(null)

  useEffect(() => {
    initializeCamera()
    initializeGestureRecognizer()
    
    return () => {
      stopCamera()
      if (gestureRecognizer.current) {
        gestureRecognizer.current.destroy()
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isDetecting && hasCamera && modelReady) {
      startDetection()
    } else {
      stopDetection()
    }
  }, [isDetecting, hasCamera, modelReady])

  const initializeGestureRecognizer = async () => {
    try {
      setIsModelLoading(true)
      gestureRecognizer.current = new GestureRecognizer()
      await gestureRecognizer.current.initialize()
      setModelReady(true)
      setIsModelLoading(false)
    } catch (error) {
      console.error('Failed to initialize MediaPipe:', error)
      setIsModelLoading(false)
      setCameraError('Failed to initialize MediaPipe. Please check your internet connection.')
      setModelReady(false)
    }
  }

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          setHasCamera(true)
          setCameraError(null)
        }
      }
    } catch (error) {
      console.error('Camera access denied:', error)
      setCameraError('Camera access denied. Please allow camera permissions.')
      setHasCamera(false)
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
    }
  }

  const startDetection = () => {
    if (!detectionIntervalRef.current && gestureRecognizer.current && videoRef.current) {
      detectionIntervalRef.current = setInterval(() => {
        performGestureDetection()
      }, 100) // Detect every 100ms for smooth detection
    }
  }

  const stopDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    setCurrentGesture(null)
    setConfidence(0)
    setCurrentLandmarks(null)
  }

  const performGestureDetection = async () => {
    if (!gestureRecognizer.current || !videoRef.current || videoRef.current.readyState !== 4) {
      return
    }

    try {
      await gestureRecognizer.current.detectGesture(
        videoRef.current,
        (result: GestureResult | null) => {
          if (result && result.confidence >= (sensitivity / 100)) {
            setCurrentGesture(result.type)
            setConfidence(result.confidence)
            setCurrentLandmarks(result.landmarks || null)
            
            onGestureDetected({
              type: result.type,
              confidence: result.confidence,
              coordinates: result.landmarks ? {
                // Mirror coordinates to match video display
                x: (1 - result.landmarks[9]?.x) * 640 || 320,
                y: result.landmarks[9]?.y * 480 || 240
              } : { x: 320, y: 240 }
            })

            // Clear gesture after 2 seconds
            setTimeout(() => {
              setCurrentGesture(null)
              setConfidence(0)
            }, 2000)
          } else {
            // Gradually fade out if no gesture detected
            setCurrentGesture(null)
            setConfidence(0)
            setCurrentLandmarks(null)
          }
        }
      )
    } catch (error) {
      console.error('Gesture detection error:', error)
    }
  }

  // Hand landmark connections for drawing skeleton
  const HAND_CONNECTIONS = [
    // Thumb
    [0, 1], [1, 2], [2, 3], [3, 4],
    // Index finger
    [0, 5], [5, 6], [6, 7], [7, 8],
    // Middle finger
    [0, 9], [9, 10], [10, 11], [11, 12],
    // Ring finger
    [0, 13], [13, 14], [14, 15], [15, 16],
    // Pinky
    [0, 17], [17, 18], [18, 19], [19, 20],
    // Palm connections
    [5, 9], [9, 13], [13, 17]
  ]

  const drawHandLandmarks = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    // Draw connections (skeleton)
    ctx.strokeStyle = '#00ff88'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    
    HAND_CONNECTIONS.forEach(([start, end]) => {
      const startPoint = landmarks[start]
      const endPoint = landmarks[end]
      
      if (startPoint && endPoint) {
        ctx.beginPath()
        // Mirror the x coordinates to match the flipped video
        ctx.moveTo((1 - startPoint.x) * width, startPoint.y * height)
        ctx.lineTo((1 - endPoint.x) * width, endPoint.y * height)
        ctx.stroke()
      }
    })

    // Draw landmark points
    landmarks.forEach((landmark, index) => {
      // Mirror the x coordinate to match the flipped video
      const x = (1 - landmark.x) * width
      const y = landmark.y * height
      
      // Different colors for different parts of the hand
      if (index === 0) {
        // Wrist - larger, different color
        ctx.fillStyle = '#ff6b6b'
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, 2 * Math.PI)
        ctx.fill()
      } else if ([4, 8, 12, 16, 20].includes(index)) {
        // Fingertips - bright color
        ctx.fillStyle = '#4ecdc4'
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, 2 * Math.PI)
        ctx.fill()
      } else if ([3, 7, 11, 15, 19].includes(index)) {
        // Finger joints - medium color
        ctx.fillStyle = '#45b7d1'
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()
      } else {
        // Other joints - standard color
        ctx.fillStyle = '#96ceb4'
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.fill()
      }
      
      // Add landmark numbers for debugging (optional)
      if (index % 4 === 0) { // Show numbers for key landmarks only
        ctx.fillStyle = 'white'
        ctx.font = '10px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(index.toString(), x, y - 8)
      }
    })
  }

  const drawDetectionOverlay = () => {
    const canvas = canvasRef.current
    const video = videoRef.current
    
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw hand landmarks if available
    if (currentLandmarks && isDetecting) {
      drawHandLandmarks(ctx, currentLandmarks, canvas.width, canvas.height)
    }

    if (currentGesture && isDetecting) {
      // Save context for text rendering
      ctx.save()
      
      const boxWidth = 200
      const boxHeight = 150
      const x = (canvas.width - boxWidth) / 2
      const y = (canvas.height - boxHeight) / 2

      ctx.strokeStyle = confidence > 0.8 ? '#10b981' : confidence > 0.6 ? '#f59e0b' : '#ef4444'
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, boxWidth, boxHeight)

      // Draw gesture label background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(x, y - 40, boxWidth, 40)
      
      // Draw text normally (not mirrored)
      ctx.fillStyle = 'white'
      ctx.font = '16px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        `${currentGesture.replace('_', ' ').toUpperCase()}`,
        x + boxWidth / 2,
        y - 20
      )
      
      ctx.fillText(
        `${(confidence * 100).toFixed(1)}%`,
        x + boxWidth / 2,
        y - 5
      )
      
      ctx.restore()
    }

    // Draw MediaPipe status indicator
    if (modelReady && isDetecting) {
      ctx.save()
      ctx.fillStyle = 'rgba(16, 185, 129, 0.8)'
      ctx.fillRect(10, 10, 120, 30)
      ctx.fillStyle = 'white'
      ctx.font = '12px Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('MediaPipe Active', 15, 28)
      ctx.restore()
    }

    // Draw landmark count indicator
    if (currentLandmarks && isDetecting) {
      ctx.save()
      ctx.fillStyle = 'rgba(78, 205, 196, 0.8)'
      ctx.fillRect(10, 50, 140, 30)
      ctx.fillStyle = 'white'
      ctx.font = '12px Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`${currentLandmarks.length} Landmarks`, 15, 68)
      ctx.restore()
    }
  }

  useEffect(() => {
    if (isDetecting || currentGesture || currentLandmarks) {
      const interval = setInterval(drawDetectionOverlay, 50)
      return () => clearInterval(interval)
    }
  }, [currentGesture, confidence, isDetecting, modelReady, currentLandmarks])

  const getGestureEmoji = (gesture: string) => {
    const emojiMap: { [key: string]: string } = {
      'thumbs_up': '👍',
      'thumbs_down': '👎',
      'peace': '✌️',
      'fist': '✊',
      'open_palm': '🖐️',
      'pointing': '👉',
      'ok_sign': '👌',
      'rock_on': '🤘',
      'rock': '✊',
      'paper': '🖐️',
      'scissors': '✌️'
    }
    return emojiMap[gesture] || '👋'
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
          <Camera className="h-5 w-5" />
          <span>MediaPipe Hand Detection</span>
        </h2>
        
        <div className="flex items-center space-x-3">
          {isModelLoading && (
            <div className="flex items-center space-x-2 text-blue-400">
              <Brain className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">Loading MediaPipe...</span>
            </div>
          )}
          
          {modelReady && !isModelLoading && (
            <div className="flex items-center space-x-2 text-green-400">
              <Brain className="h-4 w-4" />
              <span className="text-sm font-medium">MediaPipe Ready</span>
            </div>
          )}
          
          {isDetecting && modelReady && (
            <div className="flex items-center space-x-2 text-green-400">
              <Zap className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">Detecting</span>
            </div>
          )}
          
          <div className={`w-3 h-3 rounded-full ${hasCamera && modelReady ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
      </div>

      <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
        {cameraError && !hasCamera ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 mb-2">Camera Error</p>
              <p className="text-gray-400 text-sm">{cameraError}</p>
              <button
                onClick={initializeCamera}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry Camera Access
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]" // Mirror the video for natural interaction
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full" // Canvas overlay matches the mirrored video
            />
            
            {(!hasCamera || isModelLoading) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                <div className="text-center">
                  {isModelLoading ? (
                    <>
                      <Brain className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-pulse" />
                      <p className="text-blue-400">Loading MediaPipe...</p>
                      <p className="text-gray-400 text-sm mt-2">Initializing hand tracking model</p>
                    </>
                  ) : (
                    <>
                      <CameraOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">Initializing camera...</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {currentGesture && (
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">
                Detected: {currentGesture.replace('_', ' ').toUpperCase()}
              </p>
              <p className="text-gray-300 text-sm">
                Confidence: {(confidence * 100).toFixed(1)}% • MediaPipe
                {currentLandmarks && ` • ${currentLandmarks.length} landmarks`}
              </p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-2xl">{getGestureEmoji(currentGesture)}</span>
            </div>
          </div>
        </div>
      )}

      {cameraError && hasCamera && (
        <div className="mt-4 p-4 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <p className="text-yellow-400 text-sm">
              {cameraError}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">
        <p>🟢 Wrist • 🔵 Fingertips • 🟦 Joints • 🟩 Connections</p>
      </div>
    </div>
  )
}

export default GestureDetector
