'use client'

import { motion } from 'framer-motion'
import { REWARD_TYPES, POINTS_PER_EURO } from '@/types'
import { pointsToEuros } from '@/lib/points'

interface RewardProgressProps {
  weeklyPoints: number
  color: string
}

export default function RewardProgress({ weeklyPoints, color }: RewardProgressProps) {
  const euros = pointsToEuros(weeklyPoints)

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-black text-gray-800">Recompenses</h3>
        <div className="text-right">
          <p className="text-xl font-black" style={{ color }}>{weeklyPoints} pts</p>
          <p className="text-xs text-gray-500">{euros.toFixed(2)}€ setmana</p>
        </div>
      </div>

      <div className="space-y-3">
        {REWARD_TYPES.map((reward) => {
          const pointsRequired = Math.round(reward.eurosRequired * POINTS_PER_EURO)
          const progress = Math.min(weeklyPoints / pointsRequired, 1)
          const percentage = Math.round(progress * 100)
          const unlocked = weeklyPoints >= pointsRequired
          const remaining = Math.max(0, pointsRequired - weeklyPoints)

          return (
            <div key={reward.id} className="relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{reward.emoji}</span>
                <p
                  className={`text-sm font-semibold flex-1 ${
                    unlocked ? 'text-gray-800' : 'text-gray-600'
                  }`}
                >
                  {reward.label}
                </p>
                <span
                  className={`text-sm font-black ${unlocked ? '' : 'text-gray-500'}`}
                  style={unlocked ? { color } : {}}
                >
                  {unlocked ? '✅' : `${percentage}%`}
                </span>
              </div>

              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: unlocked ? '#58CC02' : color,
                    opacity: unlocked ? 1 : 0.8,
                  }}
                />
              </div>

              <div className="flex justify-between mt-0.5">
                <span className="text-xs text-gray-400">
                  {pointsRequired} pts = {reward.eurosRequired.toFixed(2)}€
                </span>
                {!unlocked && (
                  <span className="text-xs text-gray-400">falten {remaining} pts</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
