'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Profile, LEVEL_EMOJIS, LEVEL_NAMES } from '@/types'
import { getWeeklyPoints, getMonthlyPoints, getLevelFromPoints } from '@/lib/points'

interface GirlStats {
  profile: Profile
  weeklyPoints: number
  monthlyPoints: number
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const [stats, setStats] = useState<GirlStats[]>([])
  const [currentMode, setCurrentMode] = useState<'weekly' | 'monthly'>('weekly')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'nena')
        .order('name')

      if (!profiles) { setLoading(false); return }

      const all = await Promise.all(
        (profiles as Profile[]).map(async (p) => ({
          profile: p,
          weeklyPoints: await getWeeklyPoints(p.id),
          monthlyPoints: await getMonthlyPoints(p.id),
        }))
      )

      setStats(all)
      setLoading(false)
    }
    load()
  }, [])

  const sorted = [...stats].sort((a, b) =>
    currentMode === 'weekly'
      ? b.weeklyPoints - a.weeklyPoints
      : b.monthlyPoints - a.monthlyPoints
  )

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl mb-3" />
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Toggle */}
      <div className="flex bg-gray-100 m-4 rounded-xl p-1">
        {(['weekly', 'monthly'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setCurrentMode(m)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              currentMode === m
                ? 'bg-white shadow text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {m === 'weekly' ? '📅 Setmana' : '📆 Mes'}
          </button>
        ))}
      </div>

      {/* Rankings */}
      <div className="px-4 pb-6 space-y-3">
        {sorted.map((item, rank) => {
          const points = currentMode === 'weekly' ? item.weeklyPoints : item.monthlyPoints
          const level = getLevelFromPoints(item.profile.total_points)
          const levelEmoji = LEVEL_EMOJIS[level]
          const levelName = LEVEL_NAMES[level]

          return (
            <motion.div
              key={item.profile.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: rank * 0.1 }}
            >
              <div
                className="rounded-xl border-2 p-3 flex items-center gap-3"
                style={{ borderColor: `${item.profile.color}40` }}
              >
                {/* Rank */}
                <span className="text-2xl w-8 text-center flex-shrink-0">
                  {rank < 3 ? MEDALS[rank] : `${rank + 1}`}
                </span>

                {/* Avatar */}
                {item.profile.avatar_url ? (
                  <img
                    src={item.profile.avatar_url}
                    alt={item.profile.name}
                    className="w-12 h-12 rounded-full object-cover border-2 flex-shrink-0"
                    style={{ borderColor: item.profile.color }}
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-black flex-shrink-0"
                    style={{ backgroundColor: item.profile.color }}
                  >
                    {item.profile.name[0]}
                  </div>
                )}

                {/* Name + level */}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-800 text-lg leading-tight">{item.profile.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-sm">{levelEmoji}</span>
                    <span className="text-xs font-bold text-gray-500">
                      Niv.{level} {levelName}
                    </span>
                  </div>
                </div>

                {/* Points (exact, no percentage) */}
                <div className="text-right flex-shrink-0">
                  <p
                    className="text-2xl font-black leading-tight"
                    style={{ color: item.profile.color }}
                  >
                    {points}
                  </p>
                  <p className="text-xs text-gray-400">
                    {currentMode === 'weekly' ? 'pts setmana' : 'pts mes'}
                  </p>
                </div>
              </div>
            </motion.div>
          )
        })}

        {sorted.length === 0 && (
          <p className="text-center text-gray-400 py-8">
            Encara no hi ha dades aquesta {currentMode === 'weekly' ? 'setmana' : 'mes'}
          </p>
        )}
      </div>
    </div>
  )
}
