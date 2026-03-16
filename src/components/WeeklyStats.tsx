'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getWeeklyPoints, getMonthlyPoints, pointsToEuros } from '@/lib/points'

interface WeeklyStatsProps {
  profileId: string
  color: string
}

const WEEKLY_GOAL = 100

export default function WeeklyStats({ profileId, color }: WeeklyStatsProps) {
  const [weeklyPoints, setWeeklyPoints] = useState(0)
  const [monthlyPoints, setMonthlyPoints] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) return
    async function load() {
      const [w, m] = await Promise.all([
        getWeeklyPoints(profileId),
        getMonthlyPoints(profileId),
      ])
      setWeeklyPoints(w)
      setMonthlyPoints(m)
      setLoading(false)
    }
    load()
  }, [profileId])

  const weekProgress = Math.min(weeklyPoints / WEEKLY_GOAL, 1)
  const weekEuros = pointsToEuros(weeklyPoints)
  const monthEuros = pointsToEuros(monthlyPoints)

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-full" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="text-base font-black text-gray-800 mb-3">Punts de la setmana</h3>

      {/* Weekly progress bar */}
      <div className="mb-4">
        <div className="flex justify-between items-end mb-1">
          <div>
            <span className="text-3xl font-black" style={{ color }}>{weeklyPoints}</span>
            <span className="text-gray-400 text-sm ml-1">/ {WEEKLY_GOAL} pts</span>
          </div>
          <span className="text-gray-500 text-sm font-semibold">{weekEuros.toFixed(2)}€</span>
        </div>

        <div className="w-full h-5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${weekProgress * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full relative overflow-hidden"
            style={{ backgroundColor: color }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
          </motion.div>
        </div>

        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">0 pts</span>
          <span className="text-xs text-gray-400">
            {weekProgress >= 1 ? '🎉 Objectiu assolit!' : `${WEEKLY_GOAL} pts (${(WEEKLY_GOAL / 40).toFixed(2)}€)`}
          </span>
        </div>
      </div>

      {/* Monthly stats */}
      <div
        className="rounded-xl p-3 flex items-center justify-between"
        style={{ backgroundColor: `${color}15` }}
      >
        <div>
          <p className="text-xs text-gray-500">Aquest mes</p>
          <p className="text-xl font-black" style={{ color }}>{monthlyPoints} pts</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Equivalent</p>
          <p className="text-xl font-black text-gray-700">{monthEuros.toFixed(2)}€</p>
        </div>
      </div>
    </div>
  )
}
