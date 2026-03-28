'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Routine,
  RoutineCategory,
  Profile,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  DAY_LABELS,
  DayOfWeek,
} from '@/types'
import { supabase } from '@/lib/supabase'

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES: RoutineCategory[] = ['mati', 'tarda', 'nit', 'cap_de_setmana']
const DAY_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0]

const ROUTINE_TEMPLATES: Omit<Routine, 'id'>[] = [
  { name: 'Fer els deures', description: 'Fer els deures del dia de forma concentrada', category: 'tarda', emoji: '📚', base_points_good: 15, base_points_ok: 5, base_points_bad: -7, is_weekend_only: false, active_weekdays: 62, is_active: true, order_index: 65 },
  { name: 'Fer el llit', description: 'Fer el llit de bon matí sense que ningú ho digui', category: 'mati', emoji: '🛏️', base_points_good: 8, base_points_ok: 2, base_points_bad: -4, is_weekend_only: false, active_weekdays: 62, is_active: true, order_index: 35 },
  { name: 'Posar la taula', description: 'Posar la taula per sopar de forma autònoma', category: 'nit', emoji: '🍴', base_points_good: 8, base_points_ok: 2, base_points_bad: -4, is_weekend_only: false, active_weekdays: 62, is_active: true, order_index: 75 },
  { name: 'Recollir habitació', description: "Tenir l'habitació ordenada i recollida", category: 'nit', emoji: '🧹', base_points_good: 10, base_points_ok: 3, base_points_bad: -5, is_weekend_only: false, active_weekdays: 62, is_active: true, order_index: 95 },
  { name: 'Lectura', description: 'Llegir un llibre 15 minuts en silenci', category: 'nit', emoji: '📖', base_points_good: 10, base_points_ok: 3, base_points_bad: -5, is_weekend_only: false, active_weekdays: 62, is_active: true, order_index: 85 },
  { name: 'Activitat en família', description: 'Participar en una activitat familiar sense queixes', category: 'cap_de_setmana', emoji: '🎨', base_points_good: 12, base_points_ok: 4, base_points_bad: -6, is_weekend_only: true, active_weekdays: 65, is_active: true, order_index: 125 },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type EditingRoutine = Partial<Routine> & {
  isNew?: boolean
  girlAssignments?: Record<string, boolean>
}

// key: `${girlId}__${day}`
type RoutineScheduleMap = Record<string, boolean>

// ─── Main component ──────────────────────────────────────────────────────────

interface RoutinesManagementTabProps {
  girls: Profile[]
  onToast: (msg: string) => void
}

export default function RoutinesManagementTab({ girls, onToast }: RoutinesManagementTabProps) {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditingRoutine | null>(null)
  const [saving, setSaving] = useState(false)
  const [archiveConfirm, setArchiveConfirm] = useState<string | null>(null)
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  // Schedule state for the expanded inline grid
  const [scheduleMap, setScheduleMap] = useState<RoutineScheduleMap>({})
  const [scheduleDirty, setScheduleDirty] = useState(false)
  const [scheduleSaving, setScheduleSaving] = useState(false)

  const fetchRoutines = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('routines').select('*').order('order_index')
    if (data) setRoutines(data as Routine[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchRoutines() }, [fetchRoutines])

  const activeRoutines = routines.filter((r) => r.is_active !== false && !r.archived_at)
  const archivedRoutines = routines.filter((r) => !!r.archived_at)
  const existingNames = routines.map((r) => r.name.toLowerCase())
  const availableTemplates = ROUTINE_TEMPLATES.filter((t) => !existingNames.includes(t.name.toLowerCase()))

  // ─── CRUD ────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!editing) return
    const { name, description, emoji, category, base_points_good, base_points_ok, base_points_bad } = editing
    if (!name?.trim() || !emoji || !category) return

    setSaving(true)
    const isWeekend = category === 'cap_de_setmana'
    const payload = {
      name: name.trim(),
      description: (description || '').trim(),
      emoji: emoji.trim(),
      category,
      base_points_good: base_points_good ?? 10,
      base_points_ok: base_points_ok ?? 3,
      base_points_bad: base_points_bad ?? -5,
      is_weekend_only: isWeekend,
      active_weekdays: editing.active_weekdays ?? (isWeekend ? 65 : 62),
      is_active: true,
      order_index: editing.order_index ?? 999,
    }

    let routineId = editing.id

    if (editing.isNew) {
      const { data } = await supabase.from('routines').insert(payload).select('id').single()
      if (data) routineId = data.id
    } else if (routineId) {
      await supabase.from('routines').update(payload).eq('id', routineId)
    }

    // Save girl assignments if present
    if (routineId && editing.girlAssignments) {
      const defaultDays = isWeekend ? [0, 6] : [1, 2, 3, 4, 5]
      const rows: { profile_id: string; routine_id: string; day_of_week: number; enabled: boolean }[] = []

      for (const girl of girls) {
        const enabled = editing.girlAssignments[girl.id] ?? true
        for (const day of DAY_ORDER) {
          rows.push({
            profile_id: girl.id,
            routine_id: routineId,
            day_of_week: day,
            enabled: enabled && defaultDays.includes(day),
          })
        }
      }
      await supabase.from('routine_schedule').upsert(rows, { onConflict: 'profile_id,routine_id,day_of_week' })
    }

    await fetchRoutines()
    setEditing(null)
    setSaving(false)
    onToast('✅ Rutina desada!')
  }

  async function handleArchive(id: string) {
    await supabase.from('routines').update({ archived_at: new Date().toISOString() }).eq('id', id)
    await fetchRoutines()
    setArchiveConfirm(null)
    onToast('📦 Rutina arxivada')
  }

  async function handleRestore(id: string) {
    await supabase.from('routines').update({ archived_at: null }).eq('id', id)
    await fetchRoutines()
    onToast('✅ Rutina restaurada!')
  }

  // ─── Inline schedule grid ──────────────────────────────────────────────

  const loadScheduleForRoutine = useCallback(async (routineId: string) => {
    const routine = routines.find((r) => r.id === routineId)
    if (!routine) return

    // Build defaults
    const defaults: RoutineScheduleMap = {}
    for (const girl of girls) {
      for (const day of DAY_ORDER) {
        const k = `${girl.id}__${day}`
        if (routine.is_weekend_only) {
          defaults[k] = day === 0 || day === 6
        } else {
          defaults[k] = day >= 1 && day <= 5
        }
      }
    }

    const { data } = await supabase
      .from('routine_schedule')
      .select('profile_id, day_of_week, enabled')
      .eq('routine_id', routineId)
      .in('profile_id', girls.map((g) => g.id))

    const result = { ...defaults }
    if (data) {
      for (const row of data as { profile_id: string; day_of_week: number; enabled: boolean }[]) {
        result[`${row.profile_id}__${row.day_of_week}`] = row.enabled
      }
    }
    setScheduleMap(result)
    setScheduleDirty(false)
  }, [girls, routines])

  function toggleSchedule(girlId: string, day: DayOfWeek) {
    const k = `${girlId}__${day}`
    setScheduleMap((prev) => ({ ...prev, [k]: !prev[k] }))
    setScheduleDirty(true)
  }

  async function saveInlineSchedule(routineId: string) {
    setScheduleSaving(true)
    const rows: { profile_id: string; routine_id: string; day_of_week: number; enabled: boolean }[] = []
    for (const girl of girls) {
      for (const day of DAY_ORDER) {
        rows.push({
          profile_id: girl.id,
          routine_id: routineId,
          day_of_week: day,
          enabled: scheduleMap[`${girl.id}__${day}`] ?? false,
        })
      }
    }
    const { error } = await supabase.from('routine_schedule').upsert(rows, { onConflict: 'profile_id,routine_id,day_of_week' })
    setScheduleSaving(false)
    if (error) {
      onToast('❌ Error en desar l\'horari')
    } else {
      setScheduleDirty(false)
      onToast('✅ Horari desat!')
    }
  }

  async function toggleExpandSchedule(routineId: string) {
    if (expandedSchedule === routineId) {
      setExpandedSchedule(null)
    } else {
      setExpandedSchedule(routineId)
      await loadScheduleForRoutine(routineId)
    }
  }

  // ─── Girl assignments loader for edit modal ────────────────────────────

  async function loadGirlAssignments(routineId: string): Promise<Record<string, boolean>> {
    const assignments: Record<string, boolean> = {}
    for (const girl of girls) {
      assignments[girl.id] = true // default: all enabled
    }

    const { data } = await supabase
      .from('routine_schedule')
      .select('profile_id, enabled')
      .eq('routine_id', routineId)
      .in('profile_id', girls.map((g) => g.id))

    if (data && data.length > 0) {
      // A girl is "assigned" if at least one day is enabled
      const enabledByGirl: Record<string, boolean> = {}
      for (const girl of girls) enabledByGirl[girl.id] = false
      for (const row of data as { profile_id: string; enabled: boolean }[]) {
        if (row.enabled) enabledByGirl[row.profile_id] = true
      }
      // Only override if we have schedule data
      for (const girl of girls) {
        assignments[girl.id] = enabledByGirl[girl.id]
      }
    }
    return assignments
  }

  async function startEdit(routine: Routine) {
    const girlAssignments = await loadGirlAssignments(routine.id)
    setEditing({ ...routine, girlAssignments })
  }

  function startNew(template?: Partial<Routine>) {
    const defaultAssignments: Record<string, boolean> = {}
    for (const girl of girls) defaultAssignments[girl.id] = true
    setEditing({
      isNew: true,
      category: 'mati',
      base_points_good: 10,
      base_points_ok: 3,
      base_points_bad: -5,
      is_active: true,
      girlAssignments: defaultAssignments,
      ...template,
    })
  }

  // ─── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <button
        onClick={() => startNew()}
        className="w-full py-3.5 rounded-2xl font-black text-white text-base shadow-lg transition-all active:scale-95"
        style={{ background: 'linear-gradient(135deg, #6C63FF, #3498DB)' }}
      >
        ✨ Nova rutina
      </button>

      {/* Active routines by category */}
      {CATEGORIES.map((cat) => {
        const catRoutines = activeRoutines.filter((r) => r.category === cat)
        if (catRoutines.length === 0) return null
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
              <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: CATEGORY_COLORS[cat] }}>
                {CATEGORY_LABELS[cat]} ({catRoutines.length})
              </h3>
            </div>
            <div className="space-y-2">
              {catRoutines.map((routine) => (
                <div key={routine.id}>
                  <RoutineRow
                    routine={routine}
                    isScheduleExpanded={expandedSchedule === routine.id}
                    onEdit={() => startEdit(routine)}
                    onToggleSchedule={() => toggleExpandSchedule(routine.id)}
                    onArchive={() => setArchiveConfirm(routine.id)}
                  />
                  {/* Inline schedule grid */}
                  <AnimatePresence>
                    {expandedSchedule === routine.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <InlineScheduleGrid
                          girls={girls}
                          scheduleMap={scheduleMap}
                          onToggle={toggleSchedule}
                          dirty={scheduleDirty}
                          saving={scheduleSaving}
                          onSave={() => saveInlineSchedule(routine.id)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {activeRoutines.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-6">Cap rutina activa. Afegeix-ne una!</p>
      )}

      {/* Template suggestions */}
      {availableTemplates.length > 0 && (
        <div>
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 px-1">Suggeriments</h3>
          <p className="text-xs text-gray-400 mb-2 px-1">Rutines predefinides que pots afegir ràpidament</p>
          <div className="space-y-2">
            {availableTemplates.map((t) => (
              <button
                key={t.name}
                onClick={() => startNew(t)}
                className="w-full text-left bg-white/60 border-2 border-dashed border-gray-200 rounded-2xl p-3 flex items-center gap-3 hover:border-gray-400 hover:bg-white transition-all"
              >
                <span className="text-2xl opacity-50">{t.emoji}</span>
                <div className="flex-1">
                  <p className="font-bold text-gray-400 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-300">{CATEGORY_LABELS[t.category]}</p>
                </div>
                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">+ Afegir</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Archived routines */}
      {archivedRoutines.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest px-1 py-2 w-full text-left"
          >
            <span className={`transition-transform ${showArchived ? 'rotate-90' : ''}`}>▶</span>
            📦 Arxivades ({archivedRoutines.length})
          </button>
          <AnimatePresence>
            {showArchived && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-2"
              >
                {archivedRoutines.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white/50 rounded-2xl p-3 flex items-center gap-3 border-2 border-gray-100 opacity-60"
                  >
                    <span className="text-2xl grayscale">{r.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-400 line-through">{r.name}</p>
                      <p className="text-xs text-gray-300">{CATEGORY_LABELS[r.category]}</p>
                    </div>
                    <button
                      onClick={() => handleRestore(r.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      ↩ Restaurar
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Archive confirmation modal */}
      <AnimatePresence>
        {archiveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <p className="text-2xl text-center mb-2">📦</p>
              <h3 className="font-black text-gray-800 text-center text-lg mb-2">Arxivar rutina?</h3>
              <p className="text-gray-500 text-sm text-center mb-6">
                La rutina deixarà d{"'"}aparèixer del dia a dia. Podràs restaurar-la en qualsevol moment.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setArchiveConfirm(null)}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-600"
                >
                  Cancel·lar
                </button>
                <button
                  onClick={() => handleArchive(archiveConfirm)}
                  className="flex-1 py-3 rounded-2xl bg-gray-700 font-bold text-white"
                >
                  📦 Arxivar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit / Create modal */}
      <AnimatePresence>
        {editing && (
          <RoutineEditModal
            routine={editing}
            girls={girls}
            saving={saving}
            onChange={setEditing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── RoutineRow ──────────────────────────────────────────────────────────────

function RoutineRow({
  routine,
  isScheduleExpanded,
  onEdit,
  onToggleSchedule,
  onArchive,
}: {
  routine: Routine
  isScheduleExpanded: boolean
  onEdit: () => void
  onToggleSchedule: () => void
  onArchive: () => void
}) {
  const catColor = CATEGORY_COLORS[routine.category]
  return (
    <div className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border-2 border-transparent">
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
      <span className="text-2xl">{routine.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-gray-800 leading-tight">{routine.name}</p>
        <p className="text-xs text-gray-400 truncate">{routine.description}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onEdit}
          title="Editar"
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <span className="text-base">✏️</span>
        </button>
        <button
          onClick={onToggleSchedule}
          title="Horari per nena"
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isScheduleExpanded ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
        >
          <span className="text-base">📅</span>
        </button>
        <button
          onClick={onArchive}
          title="Arxivar"
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-orange-50 transition-colors"
        >
          <span className="text-base">📦</span>
        </button>
      </div>
    </div>
  )
}

// ─── InlineScheduleGrid ──────────────────────────────────────────────────────

function InlineScheduleGrid({
  girls,
  scheduleMap,
  onToggle,
  dirty,
  saving,
  onSave,
}: {
  girls: Profile[]
  scheduleMap: RoutineScheduleMap
  onToggle: (girlId: string, day: DayOfWeek) => void
  dirty: boolean
  saving: boolean
  onSave: () => void
}) {
  return (
    <div className="bg-gray-50 rounded-b-2xl px-3 pb-3 pt-2 -mt-1 border-2 border-t-0 border-gray-100">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Horari per nena i dia</p>
      <div className="space-y-2">
        {girls.map((girl) => (
          <div key={girl.id} className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white font-black text-[10px] flex-shrink-0"
              style={{ backgroundColor: girl.color }}
            >
              {girl.name[0]}
            </div>
            <span className="text-xs font-bold text-gray-600 w-14 truncate">{girl.name}</span>
            <div className="flex gap-1">
              {DAY_ORDER.map((day) => {
                const k = `${girl.id}__${day}`
                const enabled = scheduleMap[k] ?? false
                return (
                  <button
                    key={day}
                    onClick={() => onToggle(girl.id, day)}
                    className="w-7 h-7 rounded-md text-[10px] font-bold transition-all active:scale-90 border-2 flex items-center justify-center"
                    style={
                      enabled
                        ? { backgroundColor: girl.color, borderColor: girl.color, color: 'white' }
                        : { backgroundColor: 'white', borderColor: '#d1d5db', color: '#9ca3af' }
                    }
                  >
                    {DAY_LABELS[day]}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      {dirty && (
        <button
          onClick={onSave}
          disabled={saving}
          className="mt-3 w-full py-2.5 rounded-xl font-bold text-white text-sm transition-all active:scale-95 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #6C63FF, #3498DB)' }}
        >
          {saving ? '⏳ Desant...' : '💾 Desar horari'}
        </button>
      )}
    </div>
  )
}

// ─── RoutineEditModal ────────────────────────────────────────────────────────

function RoutineEditModal({
  routine,
  girls,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  routine: EditingRoutine
  girls: Profile[]
  saving: boolean
  onChange: (r: EditingRoutine) => void
  onSave: () => void
  onCancel: () => void
}) {
  const isNew = routine.isNew
  const isValid = !!routine.name?.trim() && !!routine.emoji?.trim() && !!routine.category

  function set(field: keyof EditingRoutine, value: unknown) {
    const updated = { ...routine, [field]: value }
    if (field === 'category') {
      updated.is_weekend_only = value === 'cap_de_setmana'
    }
    onChange(updated)
  }

  function toggleGirl(girlId: string) {
    const prev = routine.girlAssignments ?? {}
    onChange({ ...routine, girlAssignments: { ...prev, [girlId]: !prev[girlId] } })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90dvh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-black text-gray-800 text-xl">
            {isNew ? '✨ Nova rutina' : '✏️ Editar rutina'}
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Emoji + Name */}
          <div className="flex gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Emoji</label>
              <input
                type="text"
                value={routine.emoji || ''}
                onChange={(e) => set('emoji', e.target.value)}
                maxLength={4}
                placeholder="🌟"
                className="w-16 text-center text-2xl border-2 border-gray-200 rounded-xl p-2 focus:outline-none focus:border-gray-400"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Nom</label>
              <input
                type="text"
                value={routine.name || ''}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Nom de la rutina"
                className="w-full border-2 border-gray-200 rounded-xl p-2 font-bold text-gray-800 focus:outline-none focus:border-gray-400"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Descripció</label>
            <input
              type="text"
              value={routine.description || ''}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Explica breument la rutina..."
              className="w-full border-2 border-gray-200 rounded-xl p-2 text-gray-700 focus:outline-none focus:border-gray-400"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Categoria</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => set('category', cat)}
                  className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                    routine.category === cat ? 'text-white border-transparent' : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                  style={
                    routine.category === cat
                      ? { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] }
                      : {}
                  }
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Girl assignment toggles */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Nenes assignades</label>
            <div className="flex gap-2">
              {girls.map((girl) => {
                const isOn = routine.girlAssignments?.[girl.id] ?? true
                return (
                  <button
                    key={girl.id}
                    onClick={() => toggleGirl(girl.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                      isOn ? 'text-white' : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}
                    style={isOn ? { backgroundColor: girl.color, borderColor: girl.color } : {}}
                  >
                    {isOn && <span className="text-xs">✓</span>}
                    {girl.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Points */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Punts</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Bé ✅', field: 'base_points_good' as keyof Routine, color: '#58CC02' },
                { label: 'Regular 🟡', field: 'base_points_ok' as keyof Routine, color: '#FF9600' },
                { label: 'Malament ❌', field: 'base_points_bad' as keyof Routine, color: '#FF4B4B' },
              ].map(({ label, field, color }) => (
                <div key={field}>
                  <p className="text-xs font-bold text-center mb-1" style={{ color }}>{label}</p>
                  <input
                    type="number"
                    value={(routine[field] as number) ?? 0}
                    onChange={(e) => set(field, parseInt(e.target.value) || 0)}
                    className="w-full border-2 border-gray-200 rounded-xl p-2 text-center font-black text-gray-800 focus:outline-none focus:border-gray-400"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-600"
          >
            Cancel·lar
          </button>
          <button
            onClick={onSave}
            disabled={saving || !isValid}
            className="flex-1 py-3 rounded-2xl font-bold text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: isValid ? '#3498DB' : '#9CA3AF' }}
          >
            {saving ? '⏳...' : '💾 Guardar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
