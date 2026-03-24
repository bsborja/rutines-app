'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface DaySummary {
  good: number
  total: number
}

type HeatLevel = 0 | 1 | 2 | 3 | 4

const MONTH_LABELS = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des']

function getHeatLevel(day: DaySummary | undefined): HeatLevel {
  if (!day || day.total === 0) return 0
  const rate = day.good / day.total
  if (rate >= 0.9) return 4
  if (rate >= 0.65) return 3
  if (rate >= 0.35) return 2
  return 1
}

function heatColor(level: HeatLevel, color: string): string {
  const opacities = [0, 0.2, 0.45, 0.7, 1]
  if (level === 0) return '#EBEDF0'
  // Parse hex color and apply opacity via mix with white
  return `${color}${Math.round(opacities[level] * 255).toString(16).padStart(2, '0')}`
}

interface ActivityHeatmapProps {
  profileId: string
  color: string
}

export default function ActivityHeatmap({ profileId, color }: ActivityHeatmapProps) {
  const [dayMap, setDayMap] = useState<Record<string, DaySummary>>({})
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<{ date: string; day: DaySummary | undefined } | null>(null)

  useEffect(() => {
    async function load() {
      const from = new Date()
      from.setDate(from.getDate() - 364)
      from.setHours(0, 0, 0, 0)

      const { data } = await supabase
        .from('routine_logs')
        .select('score, created_at')
        .eq('profile_id', profileId)
        .gte('created_at', from.toISOString())

      const map: Record<string, DaySummary> = {}
      for (const log of data ?? []) {
        const date = new Date(log.created_at).toISOString().split('T')[0]
        if (!map[date]) map[date] = { good: 0, total: 0 }
        map[date].total++
        if (log.score === 'good') map[date].good++
      }
      setDayMap(map)
      setLoading(false)
    }
    load()
  }, [profileId])

  // Build 52 weeks × 7 days grid (Sun=0 → Sat=6, but we use Mon-first)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // Start from 52 weeks ago, on a Monday
  const gridStart = new Date(today)
  gridStart.setDate(gridStart.getDate() - 364)
  // Align to Monday
  const startDay = gridStart.getDay() // 0=Sun
  const daysToMon = startDay === 0 ? 1 : (8 - startDay) % 7
  gridStart.setDate(gridStart.getDate() + daysToMon)

  // Build columns (weeks), each column = 7 days Mon→Sun
  const weeks: string[][] = []
  const cur = new Date(gridStart)
  while (cur <= today) {
    const week: string[] = []
    for (let d = 0; d < 7; d++) {
      const dt = new Date(cur)
      dt.setDate(dt.getDate() + d)
      week.push(dt.toISOString().split('T')[0])
    }
    weeks.push(week)
    cur.setDate(cur.getDate() + 7)
  }

  // Month labels: find which column each month starts at
  const monthPositions: { label: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, col) => {
    const month = new Date(week[0]).getMonth()
    if (month !== lastMonth) {
      monthPositions.push({ label: MONTH_LABELS[month], col })
      lastMonth = month
    }
  })

  // Stats
  const totalDays  = Object.values(dayMap).filter((d) => d.total > 0).length
  const totalGood  = Object.values(dayMap).reduce((s, d) => s + d.good, 0)
  const totalLogs  = Object.values(dayMap).reduce((s, d) => s + d.total, 0)

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="h-24 bg-gray-100 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-black text-gray-800">Activitat (últim any)</h3>
        <span className="text-xs text-gray-400 font-semibold">
          {totalDays} dies actius · {totalGood}/{totalLogs} Bé
        </span>
      </div>

      {/* Month labels */}
      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: weeks.length * 13 }}>
          {/* Month row */}
          <div className="flex mb-1" style={{ gap: 2 }}>
            {weeks.map((_, col) => {
              const mp = monthPositions.find((m) => m.col === col)
              return (
                <div key={col} style={{ width: 11, flexShrink: 0 }}>
                  {mp && (
                    <span className="text-xs text-gray-400 font-semibold" style={{ fontSize: 9 }}>
                      {mp.label}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Grid */}
          <div className="flex" style={{ gap: 2, alignItems: 'flex-start' }}>
            {weeks.map((week, col) => (
              <div key={col} className="flex flex-col" style={{ gap: 2 }}>
                {week.map((date) => {
                  const isFuture = date > todayStr
                  const isToday  = date === todayStr
                  const day = dayMap[date]
                  const level = isFuture ? 0 : getHeatLevel(day)
                  const bg = isFuture ? 'transparent' : heatColor(level, color)

                  return (
                    <motion.div
                      key={date}
                      whileHover={{ scale: 1.3 }}
                      onMouseEnter={() => setTooltip({ date, day })}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: 2,
                        backgroundColor: bg,
                        border: isToday ? `1px solid ${color}` : 'none',
                        cursor: 'default',
                        flexShrink: 0,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="mt-2 text-xs text-gray-500 text-center min-h-[18px]">
          {(() => {
            const d = new Date(tooltip.date)
            const label = d.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' })
            const day = tooltip.day
            if (!day || day.total === 0) return `${label} — sense activitat`
            return `${label} — ${day.good}/${day.total} rutines Bé (${Math.round(day.good / day.total * 100)}%)`
          })()}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2">
        <span className="text-xs text-gray-400 mr-1">Menys</span>
        {([0, 1, 2, 3, 4] as HeatLevel[]).map((lvl) => (
          <div
            key={lvl}
            style={{
              width: 11, height: 11, borderRadius: 2,
              backgroundColor: heatColor(lvl, color),
            }}
          />
        ))}
        <span className="text-xs text-gray-400 ml-1">Més</span>
      </div>
    </div>
  )
}
