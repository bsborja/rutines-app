'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { RoutineLog, Routine, BehaviorScore, EffectivePoints } from '@/types'
import { updateProfilePoints } from '@/lib/points'
import { updateWalletEuros } from '@/lib/wallet'

const SCORE_LABELS: Record<BehaviorScore, string> = { good: 'Bé', ok: 'Regular', bad: 'Malament' }
const SCORE_COLORS: Record<BehaviorScore, string> = {
  good: 'bg-green-100 text-green-700',
  ok:   'bg-yellow-100 text-yellow-700',
  bad:  'bg-red-100 text-red-700',
}

interface LogWithRoutine extends RoutineLog {
  routine: Routine
}

interface HistoryLogProps {
  profileId: string
  color: string
  isParent: boolean
  pointsPerEuro: number
  profilePointsMap: Map<string, EffectivePoints>
  routines: Routine[]
}

const PAGE_SIZE = 30

export default function HistoryLog({
  profileId,
  color,
  isParent,
  pointsPerEuro,
  profilePointsMap,
  routines,
}: HistoryLogProps) {
  const [logs, setLogs] = useState<LogWithRoutine[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) setLoading(true)
    else setLoadingMore(true)

    const { data } = await supabase
      .from('routine_logs')
      .select('*, routine:routines(*)')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    const items = (data as LogWithRoutine[]) ?? []
    if (append) {
      setLogs((prev) => [...prev, ...items])
    } else {
      setLogs(items)
    }
    setHasMore(items.length === PAGE_SIZE)
    setLoading(false)
    setLoadingMore(false)
  }, [profileId])

  useEffect(() => {
    load()
  }, [load])

  async function handleEdit(log: LogWithRoutine, newScore: BehaviorScore) {
    setSavingId(log.id)

    // Determine new points for the new score
    const override = profilePointsMap.get(log.routine_id)
    let newPoints: number
    if (newScore === 'good') newPoints = override?.good ?? log.routine.base_points_good
    else if (newScore === 'ok') newPoints = override?.ok ?? log.routine.base_points_ok
    else newPoints = override?.bad ?? log.routine.base_points_bad

    // Reverse old points
    await updateProfilePoints(profileId, -log.points_awarded)
    await updateWalletEuros(profileId, -log.points_awarded / pointsPerEuro)

    // Update log
    await supabase
      .from('routine_logs')
      .update({ score: newScore, points_awarded: newPoints })
      .eq('id', log.id)

    // Apply new points
    await updateProfilePoints(profileId, newPoints)
    await updateWalletEuros(profileId, newPoints / pointsPerEuro)

    setEditingId(null)
    setSavingId(null)
    await load()
  }

  async function handleDelete(log: LogWithRoutine) {
    setSavingId(log.id)
    await updateProfilePoints(profileId, -log.points_awarded)
    await updateWalletEuros(profileId, -log.points_awarded / pointsPerEuro)
    await supabase.from('routine_logs').delete().eq('id', log.id)
    setSavingId(null)
    await load()
  }

  // Group logs by date
  const grouped: { date: string; items: LogWithRoutine[] }[] = []
  let lastDate = ''
  for (const log of logs) {
    const date = new Date(log.created_at).toISOString().split('T')[0]
    if (date !== lastDate) {
      grouped.push({ date, items: [] })
      lastDate = date
    }
    grouped[grouped.length - 1].items.push(log)
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00')
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (dateStr === today) return 'Avui'
    if (dateStr === yesterday) return 'Ahir'
    return d.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm animate-pulse space-y-3">
        <div className="h-5 bg-gray-200 rounded w-1/3" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl" />
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center text-gray-400 font-semibold">
        Sense registres encara
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {grouped.map(({ date, items }) => (
        <div key={date} className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Date header */}
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
            <h4 className="text-sm font-black text-gray-700 capitalize">{formatDate(date)}</h4>
            <span className="text-xs text-gray-400">{items.length} registres</span>
          </div>

          <div className="divide-y divide-gray-50">
            {items.map((log) => {
              const isEditing = editingId === log.id
              const isSaving = savingId === log.id

              return (
                <motion.div
                  key={log.id}
                  layout
                  className="px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {/* Emoji */}
                    <span className="text-2xl flex-shrink-0">{log.routine?.emoji ?? '📋'}</span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">
                        {log.routine?.name ?? 'Rutina'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(log.created_at).toLocaleTimeString('ca-ES', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                        {' · '}
                        {log.points_awarded > 0 ? '+' : ''}{log.points_awarded} pts
                      </p>
                    </div>

                    {/* Score chip or editor */}
                    {!isEditing ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-full ${SCORE_COLORS[log.score]}`}>
                          {SCORE_LABELS[log.score]}
                        </span>
                        {isParent && (
                          <button
                            onClick={() => setEditingId(log.id)}
                            disabled={isSaving}
                            className="text-gray-300 hover:text-gray-500 transition-colors text-lg leading-none"
                            title="Editar"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    ) : (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key="editor"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex items-center gap-1 flex-shrink-0"
                        >
                          {(['good', 'ok', 'bad'] as BehaviorScore[]).map((s) => (
                            <button
                              key={s}
                              disabled={isSaving}
                              onClick={() => handleEdit(log, s)}
                              className={`text-xs font-black px-2 py-1 rounded-full transition-all ${
                                log.score === s
                                  ? SCORE_COLORS[s]
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              } disabled:opacity-50`}
                            >
                              {isSaving && log.score !== s ? '...' : SCORE_LABELS[s]}
                            </button>
                          ))}
                          <button
                            disabled={isSaving}
                            onClick={() => handleDelete(log)}
                            className="text-xs font-black px-2 py-1 rounded-full bg-red-50 text-red-400 hover:bg-red-100 transition-all disabled:opacity-50"
                            title="Eliminar"
                          >
                            🗑
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-300 hover:text-gray-500 transition-colors ml-1"
                          >
                            ✕
                          </button>
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Load more */}
      {hasMore && (
        <button
          onClick={() => load(logs.length, true)}
          disabled={loadingMore}
          className="w-full py-3 rounded-2xl bg-white shadow-sm text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          {loadingMore ? 'Carregant...' : 'Veure més'}
        </button>
      )}
    </div>
  )
}
