import React, { useState, useRef, useEffect } from 'react'
import { Camera, Hand, Play, Pause, RotateCcw, Settings, Zap, Target, Activity } from 'lucide-react'
import GestureDetector from './components/GestureDetector'
import GestureHistory from './components/GestureHistory'
import ControlPanel from './components/ControlPanel'
import StatsPanel from './components/StatsPanel'

export interface GestureData {
  id: string
  type: string
  confidence: number
  timestamp: Date
  coordinates?: { x: number; y: number }
}

function App() {
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectedGestures, setDetectedGestures] = useState<GestureData[]>([])
  const [sensitivity, setSensitivity] = useState(0.7)
  const [showSettings, setShowSettings] = useState(false)
  const [stats, setStats] = useState({
    totalGestures: 0,
    accuracy: 95.2,
    avgConfidence: 0.85,
    sessionTime: 0
  })

  const sessionStartTime = useRef<Date | null>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isDetecting && sessionStartTime.current) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime.current!.getTime()) / 1000)
        setStats(prev => ({ ...prev, sessionTime: elapsed }))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isDetecting])

  const handleStartDetection = () => {
    setIsDetecting(true)
    sessionStartTime.current = new Date()
  }

  const handleStopDetection = () => {
    setIsDetecting(false)
  }

  const handleGestureDetected = (gesture: Omit<GestureData, 'id' | 'timestamp'>) => {
    const newGesture: GestureData = {
      ...gesture,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    }
    
    setDetectedGestures(prev => [newGesture, ...prev.slice(0, 49)]) // Keep last 50 gestures
    setStats(prev => ({
      ...prev,
      totalGestures: prev.totalGestures + 1,
      avgConfidence: (prev.avgConfidence + gesture.confidence) / 2
    }))
  }

  const handleReset = () => {
    setDetectedGestures([])
    setStats({
      totalGestures: 0,
      accuracy: 95.2,
      avgConfidence: 0.85,
      sessionTime: 0
    })
    sessionStartTime.current = null
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <Hand className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">GestureAI</h1>
                <p className="text-sm text-gray-300">Real-time Hand Recognition</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-6 text-sm text-gray-300">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4" />
                  <span>Session: {formatTime(stats.sessionTime)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>Accuracy: {stats.accuracy}%</span>
                </div>
              </div>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Detection Area */}
          <div className="lg:col-span-2 space-y-6">
            <GestureDetector
              isDetecting={isDetecting}
              onGestureDetected={handleGestureDetected}
              sensitivity={sensitivity}
            />
            
            {/* Control Buttons */}
            <div className="flex items-center justify-center space-x-4">
              {!isDetecting ? (
                <button
                  onClick={handleStartDetection}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Play className="h-5 w-5" />
                  <span>Start Detection</span>
                </button>
              ) : (
                <button
                  onClick={handleStopDetection}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Pause className="h-5 w-5" />
                  <span>Stop Detection</span>
                </button>
              )}
              
              <button
                onClick={handleReset}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
              >
                <RotateCcw className="h-5 w-5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <StatsPanel stats={stats} />
            
            {showSettings && (
              <ControlPanel
                sensitivity={sensitivity}
                onSensitivityChange={setSensitivity}
              />
            )}
            
            <GestureHistory gestures={detectedGestures} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
