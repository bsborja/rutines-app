'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getWeekStart } from '@/lib/points'

interface DayData {
  date: string
  goodCount: number
  okCount: number
  badCount: number
  total: number
}

type DayLevel = 'empty' | 'bad' | 'ok' | 'good' | 'perfect'

// Mon–Fri labels
const WEEKDAY_LABELS = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv']
const WEEKDAY_FULL   = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']

function getDayLevel(good: number, total: number): DayLevel {
  if (total === 0) return 'empty'
  const rate = good / total
  if (rate >= 0.9) return 'perfect'
  if (rate >= 0.6) return 'good'
  if (rate >= 0.3) return 'ok'
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
        .neq('score', 'skip')

      const grouped: Record<string, DayData> = {}
      for (const log of data ?? []) {
        const date = new Date(log.created_at).toISOString().split('T')[0]
        if (!grouped[date]) grouped[date] = { date, goodCount: 0, okCount: 0, badCount: 0, total: 0 }
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

  const weekStart = getWeekStart()
  // Mon–Fri dates (indices 0–4)
  const weekdayDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
  // Sat + Sun dates
  const satDate = (() => { const d = new Date(weekStart); d.setDate(d.getDate() + 5); return d.toISOString().split('T')[0] })()
  const sunDate = (() => { const d = new Date(weekStart); d.setDate(d.getDate() + 6); return d.toISOString().split('T')[0] })()

  const todayStr = new Date().toISOString().split('T')[0]

  // Weekend aggregate
  const satData = dayData[satDate]
  const sunData = dayData[sunDate]
  const wkndGood  = (satData?.goodCount ?? 0) + (sunData?.goodCount ?? 0)
  const wkndTotal = (satData?.total ?? 0)     + (sunData?.total ?? 0)
  const wkndLevel = getDayLevel(wkndGood, wkndTotal)
  const isWeekendToday = todayStr === satDate || todayStr === sunDate
  const isWeekendFuture = satDate > todayStr // whole weekend is future

  // Overall week score (skip already filtered)
  const totalGood = [...weekdayDates, satDate, sunDate].reduce((s, d) => s + (dayData[d]?.goodCount ?? 0), 0)
  const totalAll  = [...weekdayDates, satDate, sunDate].reduce((s, d) => s + (dayData[d]?.total ?? 0), 0)
  const weekScore = totalAll > 0 ? Math.round((totalGood / totalAll) * 100) : null

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
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

      {/* 6 columns: Mon–Fri + weekend block */}
      <div className="flex gap-1.5">
        {/* Weekdays */}
        {weekdayDates.map((date, i) => {
          const data   = dayData[date]
          const good   = data?.goodCount ?? 0
          const total  = data?.total ?? 0
          const level  = getDayLevel(good, total)
          const isToday  = date === todayStr
          const isFuture = date > todayStr

          return (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: isFuture ? 0.35 : 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span className="text-xs font-black" style={isToday ? { color } : { color: '#9CA3AF' }}>
                {WEEKDAY_LABELS[i]}
              </span>
              <div
                className="w-full rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: isFuture ? '#F3F4F6' : LEVEL_COLORS[level],
                  height: 52,
                  outline: isToday ? `2px solid ${color}` : 'none',
                }}
                title={`${WEEKDAY_FULL[i]}: ${LEVEL_LABELS[level]}${total ? ` (${good}/${total} Bé)` : ''}`}
              >
                {!isFuture && (
                  <span className="text-lg select-none">
                    {level === 'empty' ? (isToday ? '⏳' : '—') : LEVEL_EMOJIS[level]}
                  </span>
                )}
              </div>
              {total > 0 && (
                <span className="text-xs font-bold text-gray-500">{good}/{total}</span>
              )}
            </motion.div>
          )
        })}

        {/* Weekend combined block (2× width) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isWeekendFuture ? 0.35 : 1, y: 0 }}
          transition={{ delay: 5 * 0.05 }}
          className="flex flex-col items-center gap-1"
          style={{ flex: 2 }}
        >
          <span className="text-xs font-black" style={isWeekendToday ? { color } : { color: '#9CA3AF' }}>
            Fds
          </span>
          <div
            className="w-full rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: isWeekendFuture ? '#F3F4F6' : LEVEL_COLORS[wkndLevel],
              height: 52,
              outline: isWeekendToday ? `2px solid ${color}` : 'none',
            }}
            title={`Cap de setmana: ${LEVEL_LABELS[wkndLevel]}${wkndTotal ? ` (${wkndGood}/${wkndTotal} Bé)` : ''}`}
          >
            {!isWeekendFuture && (
              <span className="text-lg select-none">
                {wkndLevel === 'empty' ? (isWeekendToday ? '⏳' : '—') : LEVEL_EMOJIS[wkndLevel]}
              </span>
            )}
          </div>
          {wkndTotal > 0 && (
            <span className="text-xs font-bold text-gray-500">{wkndGood}/{wkndTotal}</span>
          )}
        </motion.div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 justify-center mt-3 flex-wrap">
        {(['perfect', 'good', 'ok', 'bad'] as DayLevel[]).map((lvl) => (
          <div key={lvl} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: LEVEL_COLORS[lvl] }} />
            <span className="text-xs text-gray-400">{LEVEL_LABELS[lvl]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
