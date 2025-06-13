import React from 'react'
import { BarChart3, Target, Clock, Zap } from 'lucide-react'

interface StatsPanelProps {
  stats: {
    totalGestures: number
    accuracy: number
    avgConfidence: number
    sessionTime: number
  }
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center space-x-2 mb-4">
        <BarChart3 className="h-5 w-5 text-white" />
        <h3 className="text-lg font-semibold text-white">Session Stats</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-gray-300">Total Gestures</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalGestures}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-green-400" />
            <span className="text-sm text-gray-300">Accuracy</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.accuracy.toFixed(1)}%</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-gray-300">Avg Confidence</span>
          </div>
          <p className="text-2xl font-bold text-white">{(stats.avgConfidence * 100).toFixed(1)}%</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl p-4 border border-orange-500/30">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-4 w-4 text-orange-400" />
            <span className="text-sm text-gray-300">Session Time</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatTime(stats.sessionTime)}</p>
        </div>
      </div>
    </div>
  )
}

export default StatsPanel
