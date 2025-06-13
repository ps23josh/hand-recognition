import React from 'react'
import { Settings, Sliders } from 'lucide-react'

interface ControlPanelProps {
  sensitivity: number
  onSensitivityChange: (value: number) => void
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  sensitivity,
  onSensitivityChange
}) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center space-x-2 mb-4">
        <Settings className="h-5 w-5 text-white" />
        <h3 className="text-lg font-semibold text-white">Detection Settings</h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
              <Sliders className="h-4 w-4" />
              <span>Sensitivity</span>
            </label>
            <span className="text-sm text-gray-400">{Math.round(sensitivity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.3"
            max="0.9"
            step="0.1"
            value={sensitivity}
            onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <h4 className="text-sm font-medium text-blue-400 mb-2">Supported Gestures</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
            <div className="flex items-center space-x-2">
              <span>👍</span>
              <span>Thumbs Up</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>✌️</span>
              <span>Peace</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>✊</span>
              <span>Fist</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🖐️</span>
              <span>Open Palm</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>👉</span>
              <span>Pointing</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>👌</span>
              <span>OK Sign</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ControlPanel
