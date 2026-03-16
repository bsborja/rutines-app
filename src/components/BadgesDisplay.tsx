'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Badge, BADGE_INFO, BadgeType } from '@/types'
import { getCurrentStreak } from '@/lib/points'

interface BadgesDisplayProps {
  profileId: string
  color: string
}

export default function BadgesDisplay({ profileId, color }: BadgesDisplayProps) {
  const [badges, setBadges] = useState<Badge[]>([])
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    async function load() {
      const [{ data }, streakVal] = await Promise.all([
        supabase.from('badges').select('*').eq('profile_id', profileId),
        getCurrentStreak(profileId),
      ])
      if (data) setBadges(data as Badge[])
      setStreak(streakVal)
    }
    load()
  }, [profileId])

  const earnedTypes = new Set(badges.map((b) => b.badge_type))

  const allBadges: BadgeType[] = ['streak_3', 'streak_7', 'streak_30']

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-black text-gray-800">Insígnies</h3>
        <div className="flex items-center gap-1 text-orange-500">
          <span className="text-lg">🔥</span>
          <span className="font-black text-lg">{streak}</span>
          <span className="text-xs text-gray-500">dies</span>
        </div>
      </div>

      <div className="flex gap-3 justify-around">
        {allBadges.map((badgeType) => {
          const info = BADGE_INFO[badgeType]
          const earned = earnedTypes.has(badgeType)

          return (
            <motion.div
              key={badgeType}
              whileTap={earned ? { scale: 1.1 } : {}}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                earned ? 'bg-yellow-50 border-2 border-yellow-200' : 'bg-gray-50 opacity-40'
              }`}
            >
              <span className={`text-3xl ${earned ? '' : 'grayscale'}`}>
                {info.emoji}
              </span>
              <p className="text-xs font-bold text-center text-gray-700 leading-tight">
                {info.label}
              </p>
              {earned && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-xs text-yellow-600 font-semibold"
                >
                  ✓ Guanyat!
                </motion.span>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
