import React from 'react'
import { Clock, Target } from 'lucide-react'
import { GestureData } from '../App'

interface GestureHistoryProps {
  gestures: GestureData[]
}

const GestureHistory: React.FC<GestureHistoryProps> = ({ gestures }) => {
  const getGestureEmoji = (gesture: string) => {
    const emojiMap: { [key: string]: string } = {
      'thumbs_up': '👍',
      'thumbs_down': '👎',
      'peace': '✌️',
      'fist': '✊',
      'open_palm': '🖐️',
      'pointing': '👉',
      'ok_sign': '👌',
      'rock_on': '🤘'
    }
    return emojiMap[gesture] || '👋'
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400'
    if (confidence >= 0.6) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center space-x-2 mb-4">
        <Clock className="h-5 w-5 text-white" />
        <h3 className="text-lg font-semibold text-white">Detection History</h3>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {gestures.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No gestures detected yet</p>
            <p className="text-gray-500 text-sm">Start detection to see results</p>
          </div>
        ) : (
          gestures.map((gesture) => (
            <div
              key={gesture.id}
              className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-lg">{getGestureEmoji(gesture.type)}</span>
                </div>
                <div>
                  <p className="text-white font-medium">
                    {gesture.type.replace('_', ' ').toUpperCase()}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {formatTime(gesture.timestamp)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-medium ${getConfidenceColor(gesture.confidence)}`}>
                  {(gesture.confidence * 100).toFixed(1)}%
                </p>
                <p className="text-gray-500 text-xs">confidence</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default GestureHistory
