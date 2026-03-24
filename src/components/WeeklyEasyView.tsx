'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getWeekStart } from '@/lib/points'
import { BehaviorScore } from '@/types'

interface DayData {
  date: string          // YYYY-MM-DD
  goodCount: number
  okCount: number
  badCount: number
  total: number
}

type DayLevel = 'empty' | 'bad' | 'ok' | 'good' | 'perfect'

const DAY_LABELS = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg']
const DAY_FULL   = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge']

function getDayLevel(day: DayData | undefined): DayLevel {
  if (!day || day.total === 0) return 'empty'
  const goodRate = day.goodCount / day.total
  if (goodRate >= 0.9) return 'perfect'
  if (goodRate >= 0.6) return 'good'
  if (goodRate >= 0.3) return 'ok'
  return 'bad'
}

const LEVEL_COLORS: Record<DayLevel, string> = {
  empty:   '#F3F4F6',
  bad:     '#FECACA',
  ok:      '#FEF08A',
  good:    '#86EFAC',
  perfect: '#22C55E',
}
const LEVEL_EMOJIS: Record<DayLevel, string> = {
  empty:   '⬜',
  bad:     '🔴',
  ok:      '🟡',
  good:    '🟢',
  perfect: '✨',
}
const LEVEL_LABELS: Record<DayLevel, string> = {
  empty:   'Sense dades',
  bad:     'Dia difícil',
  ok:      'Dia regular',
  good:    'Bon dia',
  perfect: 'Dia perfecte!',
}

interface WeeklyEasyViewProps {
  profileId: string
  color: string
}

export default function WeeklyEasyView({ profileId, color }: WeeklyEasyViewProps) {
  const [dayData, setDayData] = useState<Record<string, DayData>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const weekStart = getWeekStart()
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const { data } = await supabase
        .from('routine_logs')
        .select('score, created_at')
        .eq('profile_id', profileId)
        .gte('created_at', weekStart)
        .lt('created_at', weekEnd.toISOString())

      const grouped: Record<string, DayData> = {}
      for (const log of data ?? []) {
        const date = new Date(log.created_at).toISOString().split('T')[0]
        if (!grouped[date]) {
          grouped[date] = { date, goodCount: 0, okCount: 0, badCount: 0, total: 0 }
        }
        grouped[date].total++
        if (log.score === 'good') grouped[date].goodCount++
        else if (log.score === 'ok') grouped[date].okCount++
        else grouped[date].badCount++
      }
      setDayData(grouped)
      setLoading(false)
    }
    load()
  }, [profileId])

  // Build Mon–Sun dates for current week
  const weekStart = getWeekStart()
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  const todayStr = new Date().toISOString().split('T')[0]
  const totalGood = weekDates.reduce((s, d) => s + (dayData[d]?.goodCount ?? 0), 0)
  const totalAll  = weekDates.reduce((s, d) => s + (dayData[d]?.total ?? 0), 0)
  const weekScore = totalAll > 0 ? Math.round((totalGood / totalAll) * 100) : null

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="flex gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 h-16 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-black text-gray-800">Aquesta setmana</h3>
        {weekScore !== null && (
          <span className="text-sm font-black px-3 py-1 rounded-full"
            style={{ backgroundColor: `${color}20`, color }}>
            {weekScore}% bé
          </span>
        )}
      </div>

      <div className="flex gap-1.5">
        {weekDates.map((date, i) => {
          const data   = dayData[date]
          const level  = getDayLevel(data)
          const isToday = date === todayStr
          const isFuture = date > todayStr

          return (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: isFuture ? 0.35 : 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex-1 flex flex-col items-center gap-1"
            >
              {/* Day letter */}
              <span
                className={`text-xs font-black ${isToday ? '' : 'text-gray-400'}`}
                style={isToday ? { color } : {}}
              >
                {DAY_LABELS[i]}
              </span>

              {/* Color block */}
              <div
                className={`w-full rounded-xl flex items-center justify-center transition-all ${
                  isToday ? 'ring-2 shadow-sm' : ''
                }`}
                style={{
                  backgroundColor: isFuture ? '#F3F4F6' : LEVEL_COLORS[level],
                  height: 52,
                  ringColor: color,
                  outline: isToday ? `2px solid ${color}` : 'none',
                }}
                title={`${DAY_FULL[i]}: ${LEVEL_LABELS[level]}${data?.total ? ` (${data.goodCount}/${data.total} Bé)` : ''}`}
              >
                {!isFuture && (
                  <span className="text-lg select-none">
                    {level === 'empty' ? (isToday ? '⏳' : '—') : LEVEL_EMOJIS[level]}
                  </span>
                )}
              </div>

              {/* Points if any */}
              {data && data.total > 0 && (
                <span className="text-xs font-bold text-gray-500">
                  {data.goodCount}/{data.total}
                </span>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 justify-center mt-3 flex-wrap">
        {(['perfect', 'good', 'ok', 'bad'] as DayLevel[]).map((lvl) => (
          <div key={lvl} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: LEVEL_COLORS[lvl] }}
            />
            <span className="text-xs text-gray-400">{LEVEL_LABELS[lvl]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
