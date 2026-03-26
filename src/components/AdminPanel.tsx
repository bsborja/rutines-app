'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Profile,
  Routine,
  RoutinePointsOverride,
  POINTS_PER_EURO,
  REWARD_TYPES,
  DAY_LABELS,
  DayOfWeek,
} from '@/types'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminPanelProps {
  profiles: Profile[]
  routines: Routine[]
}

// key: `${profileId}__${routineId}`
type PointsMap = Record<string, { good: number; ok: number; bad: number }>

// key: `${routineId}__${day}`
type ScheduleMap = Record<string, boolean>

// key: rewardId
type RewardCostsMap = Record<string, number>

// key: profileId
type WeeklyEurosMap = Record<string, number>

type TabId = 'punts' | 'recalcul' | 'euros' | 'recompenses' | 'horaris'

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'punts', label: 'Punts', emoji: '⚡' },
  { id: 'recalcul', label: 'Recàlcul', emoji: '🤖' },
  { id: 'euros', label: 'Euros/setmana', emoji: '💶' },
  { id: 'recompenses', label: 'Recompenses', emoji: '🎁' },
  { id: 'horaris', label: 'Horaris', emoji: '📅' },
]

const DAY_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0]

// ─── Small reusable UI pieces ─────────────────────────────────────────────────

function StepButton({
  onClick,
  sign,
  color,
  disabled,
}: {
  onClick: () => void
  sign: '+' | '−'
  color: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-6 h-6 rounded-full flex items-center justify-center text-white font-black text-xs transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
      style={{ backgroundColor: disabled ? '#ccc' : color }}
    >
      {sign}
    </button>
  )
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm"
    >
      {message}
    </motion.div>
  )
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-4 ${className}`}>
      {children}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminPanel({ profiles, routines }: AdminPanelProps) {
  const girls = profiles.filter((p) => p.role === 'nena')
  const sortedRoutines = [...routines].sort((a, b) => a.order_index - b.order_index)

  const [activeTab, setActiveTab] = useState<TabId>('punts')
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs transition-all border-2 ${
              activeTab === tab.id
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
            }`}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'punts' && (
            <PointsEditorTab
              girls={girls}
              routines={sortedRoutines}
              onToast={showToast}
            />
          )}
          {activeTab === 'recalcul' && (
            <AutoRecalcTab
              girls={girls}
              routines={sortedRoutines}
              onToast={showToast}
            />
          )}
          {activeTab === 'euros' && (
            <WeeklyEurosTab girls={girls} onToast={showToast} />
          )}
          {activeTab === 'recompenses' && (
            <RewardsTab onToast={showToast} />
          )}
          {activeTab === 'horaris' && (
            <ScheduleTab
              girls={girls}
              routines={sortedRoutines}
              onToast={showToast}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}

// ─── Tab 1: Points editor ─────────────────────────────────────────────────────

function PointsEditorTab({
  girls,
  routines,
  onToast,
}: {
  girls: Profile[]
  routines: Routine[]
  onToast: (msg: string) => void
}) {
  const [points, setPoints] = useState<PointsMap>({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      // Build initial map from base values
      const initial: PointsMap = {}
      for (const girl of girls) {
        for (const routine of routines) {
          const k = `${girl.id}__${routine.id}`
          initial[k] = {
            good: routine.base_points_good,
            ok: routine.base_points_ok,
            bad: routine.base_points_bad,
          }
        }
      }

      // Load overrides
      const { data } = await supabase
        .from('routine_points')
        .select('*')
        .in('profile_id', girls.map((g) => g.id))

      if (data) {
        for (const row of data as RoutinePointsOverride[]) {
          const k = `${row.profile_id}__${row.routine_id}`
          initial[k] = {
            good: row.points_good,
            ok: row.points_ok,
            bad: row.points_bad,
          }
        }
      }

      setPoints(initial)
      setLoading(false)
    }
    load()
  }, [girls, routines])

  function adjust(girlId: string, routineId: string, delta: number) {
    const k = `${girlId}__${routineId}`
    setPoints((prev) => {
      const cur = prev[k] ?? { good: 10, ok: 3, bad: -5 }
      const newGood = Math.min(20, Math.max(5, cur.good + delta))
      const newOk = Math.max(2, Math.round(newGood * 0.3))
      const newBad = -Math.max(2, Math.round(newGood * 0.5))
      return { ...prev, [k]: { good: newGood, ok: newOk, bad: newBad } }
    })
    setDirty(true)
  }

  async function syncAll() {
    setSaving(true)
    const rows = []
    for (const girl of girls) {
      for (const routine of routines) {
        const k = `${girl.id}__${routine.id}`
        const v = points[k]
        if (!v) continue
        rows.push({
          profile_id: girl.id,
          routine_id: routine.id,
          points_good: v.good,
          points_ok: v.ok,
          points_bad: v.bad,
          updated_at: new Date().toISOString(),
        })
      }
    }

    const { error } = await supabase
      .from('routine_points')
      .upsert(rows, { onConflict: 'profile_id,routine_id' })

    setSaving(false)
    if (error) {
      onToast('❌ Error en desar els punts')
    } else {
      setDirty(false)
      onToast('✅ Punts sincronitzats correctament!')
    }
  }

  if (loading) {
    return (
      <SectionCard>
        <p className="text-center text-gray-400 py-8 font-bold">Carregant punts...</p>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-3">
      <SectionCard>
        <h2 className="font-black text-gray-800 text-base mb-1">⚡ Editor de Punts</h2>
        <p className="text-xs text-gray-500 mb-3">
          Ajusta els punts per rutina i nena. Rang: 5–20 pts.
        </p>

        {/* Compact grid table */}
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs border-separate border-spacing-y-1">
            <thead>
              <tr>
                <th className="text-left font-black text-gray-500 pb-1 pl-1 w-24">Rutina</th>
                {girls.map((girl) => (
                  <th
                    key={girl.id}
                    className="text-center font-black pb-1 px-1"
                    style={{ color: girl.color }}
                  >
                    {girl.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {routines.map((routine) => (
                <tr key={routine.id}>
                  <td className="pl-1 py-1">
                    <span className="font-bold text-gray-700 leading-tight block">
                      {routine.emoji}{' '}
                      <span className="text-gray-600">
                        {routine.name.length > 10
                          ? routine.name.slice(0, 10) + '…'
                          : routine.name}
                      </span>
                    </span>
                  </td>
                  {girls.map((girl) => {
                    const k = `${girl.id}__${routine.id}`
                    const v = points[k] ?? { good: routine.base_points_good, ok: 0, bad: 0 }
                    return (
                      <td key={girl.id} className="px-1 py-1">
                        <div className="flex items-center justify-center gap-1">
                          <StepButton
                            sign="−"
                            color={girl.color}
                            disabled={v.good <= 5}
                            onClick={() => adjust(girl.id, routine.id, -1)}
                          />
                          <span
                            className="font-black tabular-nums w-5 text-center"
                            style={{ color: girl.color }}
                          >
                            {v.good}
                          </span>
                          <StepButton
                            sign="+"
                            color={girl.color}
                            disabled={v.good >= 20}
                            onClick={() => adjust(girl.id, routine.id, 1)}
                          />
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Sync button */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <button
              onClick={syncAll}
              disabled={saving}
              className="w-full py-4 rounded-2xl font-black text-white text-base shadow-lg transition-all active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #3498DB)' }}
            >
              {saving ? '⏳ Sincronitzant...' : '🔄 Sincronitzar tots els usuaris'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Tab 2: Auto-recalculation ────────────────────────────────────────────────

function AutoRecalcTab({
  girls,
  routines,
  onToast,
}: {
  girls: Profile[]
  routines: Routine[]
  onToast: (msg: string) => void
}) {
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newPoints, setNewPoints] = useState<PointsMap | null>(null)
  const [summary, setSummary] = useState<string[]>([])

  async function runRecalc() {
    setCalculating(true)
    setSummary([])
    setNewPoints(null)

    const since = new Date()
    since.setDate(since.getDate() - 30)

    // Load all existing overrides to start from
    const { data: overrides } = await supabase
      .from('routine_points')
      .select('*')
      .in('profile_id', girls.map((g) => g.id))

    const overrideMap: PointsMap = {}
    for (const girl of girls) {
      for (const routine of routines) {
        const k = `${girl.id}__${routine.id}`
        const found = (overrides as RoutinePointsOverride[] | null)?.find(
          (o) => o.profile_id === girl.id && o.routine_id === routine.id
        )
        overrideMap[k] = found
          ? { good: found.points_good, ok: found.points_ok, bad: found.points_bad }
          : { good: routine.base_points_good, ok: routine.base_points_ok, bad: routine.base_points_bad }
      }
    }

    // Load logs from last 30 days for all girls
    const { data: logs } = await supabase
      .from('routine_logs')
      .select('profile_id, routine_id, score')
      .in('profile_id', girls.map((g) => g.id))
      .gte('created_at', since.toISOString())

    const newMap: PointsMap = { ...overrideMap }
    const msgs: string[] = []

    for (const girl of girls) {
      for (const routine of routines) {
        const k = `${girl.id}__${routine.id}`
        const routineLogs = (logs ?? []).filter(
          (l) => l.profile_id === girl.id && l.routine_id === routine.id
        )
        const total = routineLogs.length
        if (total === 0) continue

        const goodCount = routineLogs.filter((l) => l.score === 'good').length
        const goodRate = goodCount / total

        const cur = newMap[k]
        let newGood = cur.good

        if (goodRate > 0.75) {
          newGood = Math.max(5, cur.good - 1)
          if (newGood !== cur.good) {
            msgs.push(`${girl.name} · ${routine.emoji}${routine.name}: ${cur.good}→${newGood} pts (fàcil, ${Math.round(goodRate * 100)}% bé)`)
          }
        } else if (goodRate < 0.35) {
          newGood = Math.min(20, cur.good + 2)
          if (newGood !== cur.good) {
            msgs.push(`${girl.name} · ${routine.emoji}${routine.name}: ${cur.good}→${newGood} pts (difícil, ${Math.round(goodRate * 100)}% bé)`)
          }
        }

        const newOk = Math.max(2, Math.round(newGood * 0.3))
        const newBad = -Math.max(2, Math.round(newGood * 0.5))
        newMap[k] = { good: newGood, ok: newOk, bad: newBad }
      }
    }

    setNewPoints(newMap)
    setSummary(msgs.length > 0 ? msgs : ['Cap canvi necessari — les puntuacions ja estan ben ajustades! 🎉'])
    setCalculating(false)
  }

  async function saveRecalc() {
    if (!newPoints) return
    setSaving(true)

    const rows = []
    for (const girl of girls) {
      for (const routine of routines) {
        const k = `${girl.id}__${routine.id}`
        const v = newPoints[k]
        if (!v) continue
        rows.push({
          profile_id: girl.id,
          routine_id: routine.id,
          points_good: v.good,
          points_ok: v.ok,
          points_bad: v.bad,
          updated_at: new Date().toISOString(),
        })
      }
    }

    const { error } = await supabase
      .from('routine_points')
      .upsert(rows, { onConflict: 'profile_id,routine_id' })

    setSaving(false)
    if (error) {
      onToast('❌ Error en desar els canvis')
    } else {
      setNewPoints(null)
      setSummary([])
      onToast('✅ Punts recalculats i desats!')
    }
  }

  return (
    <div className="space-y-3">
      <SectionCard>
        <h2 className="font-black text-gray-800 text-base mb-1">🤖 Recàlcul Automàtic</h2>
        <p className="text-xs text-gray-500 mb-4">
          Analitza els últims 30 dies i ajusta els punts automàticament:
          <br />• &gt;75% bé → −1 pt (rutina fàcil)
          <br />• &lt;35% bé → +2 pts (rutina difícil)
        </p>

        <button
          onClick={runRecalc}
          disabled={calculating}
          className="w-full py-4 rounded-2xl font-black text-white text-base shadow-md transition-all active:scale-95 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #00C896, #3498DB)' }}
        >
          {calculating ? '⏳ Calculant...' : '🤖 Fer recàlcul automàtic'}
        </button>
      </SectionCard>

      {/* Results */}
      <AnimatePresence>
        {summary.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SectionCard>
              <h3 className="font-black text-gray-700 text-sm mb-3">📋 Resultats del recàlcul</h3>
              <div className="space-y-1.5 mb-4">
                {summary.map((msg, i) => (
                  <div
                    key={i}
                    className="text-xs font-semibold text-gray-600 bg-gray-50 rounded-xl px-3 py-2"
                  >
                    {msg}
                  </div>
                ))}
              </div>

              {newPoints && summary[0] !== 'Cap canvi necessari — les puntuacions ja estan ben ajustades! 🎉' && (
                <button
                  onClick={saveRecalc}
                  disabled={saving}
                  className="w-full py-3 rounded-2xl font-black text-white text-sm shadow-md transition-all active:scale-95 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #9B59B6, #6C63FF)' }}
                >
                  {saving ? '⏳ Desant...' : '💾 Guardar canvis'}
                </button>
              )}
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Tab 3: Max weekly euros ──────────────────────────────────────────────────

function WeeklyEurosTab({
  girls,
  onToast,
}: {
  girls: Profile[]
  onToast: (msg: string) => void
}) {
  const [euros, setEuros] = useState<WeeklyEurosMap>({})
  const [dirty, setDirty] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const initial: WeeklyEurosMap = {}
      for (const girl of girls) {
        initial[girl.id] = 2.5 // default
      }

      const { data } = await supabase
        .from('profile_settings')
        .select('profile_id, max_weekly_euros')
        .in('profile_id', girls.map((g) => g.id))

      if (data) {
        for (const row of data as { profile_id: string; max_weekly_euros: number }[]) {
          initial[row.profile_id] = row.max_weekly_euros
        }
      }

      setEuros(initial)
      setLoading(false)
    }
    load()
  }, [girls])

  function adjust(girlId: string, delta: number) {
    setEuros((prev) => {
      const cur = prev[girlId] ?? 2.5
      const next = Math.min(10, Math.max(0.5, parseFloat((cur + delta).toFixed(2))))
      return { ...prev, [girlId]: next }
    })
    setDirty((prev) => ({ ...prev, [girlId]: true }))
  }

  async function save(girlId: string) {
    setSaving((prev) => ({ ...prev, [girlId]: true }))
    const { error } = await supabase
      .from('profile_settings')
      .upsert(
        {
          profile_id: girlId,
          max_weekly_euros: euros[girlId],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id' }
      )

    setSaving((prev) => ({ ...prev, [girlId]: false }))
    if (error) {
      onToast('❌ Error en desar la configuració')
    } else {
      setDirty((prev) => ({ ...prev, [girlId]: false }))
      onToast('✅ Màxim setmanal desat!')
    }
  }

  if (loading) {
    return (
      <SectionCard>
        <p className="text-center text-gray-400 py-8 font-bold">Carregant configuració...</p>
      </SectionCard>
    )
  }

  return (
    <SectionCard>
      <h2 className="font-black text-gray-800 text-base mb-1">💶 Màxim Setmanal per Nena</h2>
      <p className="text-xs text-gray-500 mb-4">
        Ajusta quants euros pot guanyar cada nena per setmana. Passos de 0,50€.
      </p>

      <div className="space-y-3">
        {girls.map((girl) => (
          <div
            key={girl.id}
            className="flex items-center justify-between gap-3 bg-gray-50 rounded-2xl px-4 py-3"
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-2 flex-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                style={{ backgroundColor: girl.color }}
              >
                {girl.name[0]}
              </div>
              <span className="font-black text-gray-800 text-sm">{girl.name}</span>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-2">
              <StepButton
                sign="−"
                color={girl.color}
                disabled={(euros[girl.id] ?? 2.5) <= 0.5}
                onClick={() => adjust(girl.id, -0.5)}
              />
              <span
                className="font-black tabular-nums text-base w-12 text-center"
                style={{ color: girl.color }}
              >
                {(euros[girl.id] ?? 2.5).toFixed(2)}€
              </span>
              <StepButton
                sign="+"
                color={girl.color}
                disabled={(euros[girl.id] ?? 2.5) >= 10}
                onClick={() => adjust(girl.id, 0.5)}
              />
            </div>

            {/* Save button */}
            <button
              onClick={() => save(girl.id)}
              disabled={!dirty[girl.id] || saving[girl.id]}
              className="px-3 py-1.5 rounded-xl font-black text-white text-xs transition-all active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: girl.color }}
            >
              {saving[girl.id] ? '...' : '💾'}
            </button>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ─── Tab 4: Reward costs ──────────────────────────────────────────────────────

function RewardsTab({ onToast }: { onToast: (msg: string) => void }) {
  const [costs, setCosts] = useState<RewardCostsMap>({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      // Init with defaults
      const initial: RewardCostsMap = {}
      for (const r of REWARD_TYPES) {
        initial[r.id] = r.eurosRequired
      }

      const { data } = await supabase
        .from('reward_costs')
        .select('reward_id, euros_required')
        .in('reward_id', REWARD_TYPES.map((r) => r.id))

      if (data) {
        for (const row of data as { reward_id: string; euros_required: number }[]) {
          initial[row.reward_id] = row.euros_required
        }
      }

      setCosts(initial)
      setLoading(false)
    }
    load()
  }, [])

  function adjust(rewardId: string, delta: number) {
    setCosts((prev) => {
      const cur = prev[rewardId] ?? 5
      const next = Math.min(50, Math.max(1, parseFloat((cur + delta).toFixed(2))))
      return { ...prev, [rewardId]: next }
    })
    setDirty(true)
  }

  async function saveAll() {
    setSaving(true)
    const rows = REWARD_TYPES.map((r) => ({
      reward_id: r.id,
      euros_required: costs[r.id] ?? r.eurosRequired,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('reward_costs')
      .upsert(rows, { onConflict: 'reward_id' })

    setSaving(false)
    if (error) {
      onToast('❌ Error en desar les recompenses')
    } else {
      setDirty(false)
      onToast('✅ Cost de recompenses desat!')
    }
  }

  if (loading) {
    return (
      <SectionCard>
        <p className="text-center text-gray-400 py-8 font-bold">Carregant recompenses...</p>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-3">
      <SectionCard>
        <h2 className="font-black text-gray-800 text-base mb-1">🎁 Cost de Recompenses</h2>
        <p className="text-xs text-gray-500 mb-4">
          Edita quants euros cal tenir per accedir a cada recompensa. Passos de 0,50€.
        </p>

        <div className="space-y-3">
          {REWARD_TYPES.map((reward) => {
            const cur = costs[reward.id] ?? reward.eurosRequired
            const pts = Math.round(cur * POINTS_PER_EURO)
            return (
              <div
                key={reward.id}
                className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3"
              >
                <span className="text-2xl flex-shrink-0">{reward.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-800 text-sm leading-tight">{reward.label}</p>
                  <p className="text-xs text-gray-400 font-semibold">{pts} punts</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StepButton
                    sign="−"
                    color="#6C63FF"
                    disabled={cur <= 1}
                    onClick={() => adjust(reward.id, -0.5)}
                  />
                  <span className="font-black tabular-nums text-base w-14 text-center text-purple-600">
                    {cur.toFixed(2)}€
                  </span>
                  <StepButton
                    sign="+"
                    color="#6C63FF"
                    disabled={cur >= 50}
                    onClick={() => adjust(reward.id, 0.5)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <button
              onClick={saveAll}
              disabled={saving}
              className="w-full py-4 rounded-2xl font-black text-white text-base shadow-lg transition-all active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #9B59B6, #6C63FF)' }}
            >
              {saving ? '⏳ Desant...' : '💾 Guardar canvis de recompenses'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Tab 5: Routine schedule ──────────────────────────────────────────────────

function ScheduleTab({
  girls,
  routines,
  onToast,
}: {
  girls: Profile[]
  routines: Routine[]
  onToast: (msg: string) => void
}) {
  const [selectedGirlId, setSelectedGirlId] = useState<string>(girls[0]?.id ?? '')
  const [schedule, setSchedule] = useState<ScheduleMap>({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadSchedule = useCallback(
    async (girlId: string) => {
      setLoading(true)
      // Build defaults
      const defaults: ScheduleMap = {}
      for (const routine of routines) {
        for (const day of DAY_ORDER) {
          const k = `${routine.id}__${day}`
          // is_weekend_only → enabled Sat(6)+Sun(0), disabled Mon-Fri
          if (routine.is_weekend_only) {
            defaults[k] = day === 0 || day === 6
          } else {
            defaults[k] = day >= 1 && day <= 5
          }
        }
      }

      const { data } = await supabase
        .from('routine_schedule')
        .select('routine_id, day_of_week, enabled')
        .eq('profile_id', girlId)

      const result = { ...defaults }
      if (data) {
        for (const row of data as { routine_id: string; day_of_week: number; enabled: boolean }[]) {
          result[`${row.routine_id}__${row.day_of_week}`] = row.enabled
        }
      }

      setSchedule(result)
      setDirty(false)
      setLoading(false)
    },
    [routines]
  )

  useEffect(() => {
    if (selectedGirlId) {
      loadSchedule(selectedGirlId)
    }
  }, [selectedGirlId, loadSchedule])

  function toggle(routineId: string, day: DayOfWeek) {
    const k = `${routineId}__${day}`
    setSchedule((prev) => ({ ...prev, [k]: !prev[k] }))
    setDirty(true)
  }

  async function saveSchedule() {
    setSaving(true)
    const rows = []
    for (const routine of routines) {
      for (const day of DAY_ORDER) {
        const k = `${routine.id}__${day}`
        rows.push({
          profile_id: selectedGirlId,
          routine_id: routine.id,
          day_of_week: day,
          enabled: schedule[k] ?? false,
        })
      }
    }

    const { error } = await supabase
      .from('routine_schedule')
      .upsert(rows, { onConflict: 'profile_id,routine_id,day_of_week' })

    setSaving(false)
    if (error) {
      onToast('❌ Error en desar l\'horari')
    } else {
      setDirty(false)
      onToast('✅ Horari desat correctament!')
    }
  }

  const selectedGirl = girls.find((g) => g.id === selectedGirlId)

  return (
    <div className="space-y-3">
      {/* Girl selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {girls.map((girl) => (
          <button
            key={girl.id}
            onClick={() => setSelectedGirlId(girl.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-sm transition-all border-2`}
            style={
              selectedGirlId === girl.id
                ? { backgroundColor: girl.color, borderColor: girl.color, color: 'white' }
                : { borderColor: '#e5e7eb', color: '#6b7280', backgroundColor: 'white' }
            }
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white font-black text-xs flex-shrink-0"
              style={{ backgroundColor: selectedGirlId === girl.id ? 'rgba(255,255,255,0.3)' : girl.color }}
            >
              {girl.name[0]}
            </div>
            {girl.name}
          </button>
        ))}
      </div>

      <SectionCard>
        <h2 className="font-black text-gray-800 text-base mb-1">
          📅 Horari de Rutines
          {selectedGirl && (
            <span className="ml-2 font-bold text-sm" style={{ color: selectedGirl.color }}>
              — {selectedGirl.name}
            </span>
          )}
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Marca quins dies de la setmana s'activa cada rutina.
        </p>

        {loading ? (
          <p className="text-center text-gray-400 py-6 font-bold">Carregant horari...</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs border-separate border-spacing-y-1">
              <thead>
                <tr>
                  <th className="text-left font-black text-gray-500 pb-1 pl-1 w-24">Rutina</th>
                  {DAY_ORDER.map((day) => (
                    <th
                      key={day}
                      className="text-center font-black text-gray-400 pb-1 px-1 w-8"
                    >
                      {DAY_LABELS[day]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {routines.map((routine) => (
                  <tr key={routine.id}>
                    <td className="pl-1 py-1">
                      <span className="font-bold text-gray-700 leading-tight block">
                        {routine.emoji}{' '}
                        <span className="text-gray-600">
                          {routine.name.length > 10
                            ? routine.name.slice(0, 10) + '…'
                            : routine.name}
                        </span>
                      </span>
                    </td>
                    {DAY_ORDER.map((day) => {
                      const k = `${routine.id}__${day}`
                      const enabled = schedule[k] ?? false
                      return (
                        <td key={day} className="px-1 py-1 text-center">
                          <button
                            onClick={() => toggle(routine.id, day)}
                            className="w-6 h-6 rounded-md transition-all active:scale-90 border-2"
                            style={
                              enabled
                                ? {
                                    backgroundColor: selectedGirl?.color ?? '#6C63FF',
                                    borderColor: selectedGirl?.color ?? '#6C63FF',
                                  }
                                : { backgroundColor: 'white', borderColor: '#d1d5db' }
                            }
                            title={enabled ? 'Desactivar' : 'Activar'}
                          >
                            {enabled && (
                              <span className="text-white text-xs font-black leading-none">✓</span>
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <button
              onClick={saveSchedule}
              disabled={saving}
              className="w-full py-4 rounded-2xl font-black text-white text-base shadow-lg transition-all active:scale-95 disabled:opacity-60"
              style={{
                background: selectedGirl
                  ? `linear-gradient(135deg, ${selectedGirl.color}, ${selectedGirl.color}99)`
                  : 'linear-gradient(135deg, #6C63FF, #3498DB)',
              }}
            >
              {saving ? '⏳ Desant...' : `💾 Desar horari de ${selectedGirl?.name ?? ''}`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
