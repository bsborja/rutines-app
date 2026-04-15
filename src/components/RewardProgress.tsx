'use client'

import { motion } from 'framer-motion'
import { REWARD_TYPES, MAX_WEEKLY_EUROS } from '@/types'
import { pointsToEuros } from '@/lib/points'

interface RewardProgressProps {
  weeklyPoints: number
  walletEuros: number    // accumulated balance (the real progress towards rewards)
  color: string
  pointsPerEuro: number  // dynamic ratio for this profile
}

export default function RewardProgress({ weeklyPoints, walletEuros, color, pointsPerEuro }: RewardProgressProps) {
  // El saldo REAL acumulat (que avança fins que es demana la recompensa).
  const euros = Math.max(0, walletEuros)
  // Setmanal només com a indicador secundari.
  const weeklyEuros = Math.min(pointsToEuros(weeklyPoints, pointsPerEuro), MAX_WEEKLY_EUROS)

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-black text-gray-800">Recompenses</h3>
        <div className="text-right">
          <p className="text-xl font-black" style={{ color }}>{euros.toFixed(2)}€</p>
          <p className="text-xs text-gray-500">acumulats · +{weeklyEuros.toFixed(2)}€ setmana</p>
        </div>
      </div>

      <div className="space-y-3">
        {REWARD_TYPES.map((reward) => {
          const progress = Math.min(euros / reward.eurosRequired, 1)
          const percentage = Math.round(progress * 100)
          const unlocked = euros >= reward.eurosRequired
          const remaining = Math.max(0, reward.eurosRequired - euros).toFixed(2)
          const weeksNeeded = Math.ceil(reward.eurosRequired / MAX_WEEKLY_EUROS)

          return (
            <div key={reward.id} className="relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{reward.emoji}</span>
                <p className={`text-sm font-semibold flex-1 ${unlocked ? 'text-gray-800' : 'text-gray-600'}`}>
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
                  {reward.eurosRequired.toFixed(2)}€ · ~{weeksNeeded} setmanes perfectes
                </span>
                {!unlocked && (
                  <span className="text-xs text-gray-400">falten {remaining}€</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
