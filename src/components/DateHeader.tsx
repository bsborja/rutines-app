'use client'

import { motion } from 'framer-motion'

const DAYS = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte']
const MONTHS = [
  'gener', 'febrer', 'març', 'abril', 'maig', 'juny',
  'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre',
]

interface DateHeaderProps {
  color?: string
}

export default function DateHeader({ color = '#6366F1' }: DateHeaderProps) {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun..6=Sat
  const dayName = DAYS[dayOfWeek]
  const dayNumber = now.getDate()
  const monthName = MONTHS[now.getMonth()]
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  const dePrefix = /^[aeiouàèéíòóú]/i.test(monthName) ? "d'" : 'de '

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mx-auto max-w-2xl px-4 py-2 text-center ${
        isWeekend
          ? 'bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 border-y border-amber-200'
          : 'bg-white/60 border-b border-gray-100'
      }`}
    >
      <p className="text-sm font-black" style={{ color: isWeekend ? '#D97706' : color }}>
        {isWeekend && <span className="mr-1">🎉</span>}
        {dayName} {dayNumber} {dePrefix}{monthName}
        {isWeekend && <span className="ml-1">🎉</span>}
      </p>
      {isWeekend && (
        <p className="text-xs text-amber-700 font-bold mt-0.5">Cap de setmana!</p>
      )}
    </motion.div>
  )
}
