'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Routine, RoutineCategory, CATEGORY_LABELS, CATEGORY_COLORS } from '@/types'

// Template routines: pre-defined suggestions not yet in DB
const ROUTINE_TEMPLATES: Omit<Routine, 'id'>[] = [
  {
    name: 'Fer els deures',
    description: 'Fer els deures del dia de forma concentrada i sense distraccions',
    category: 'tarda',
    emoji: '📚',
    base_points_good: 15,
    base_points_ok: 5,
    base_points_bad: -7,
    is_weekend_only: false,
    is_active: true,
    order_index: 65,
  },
  {
    name: 'Fer el llit',
    description: "Fer el llit de bon matí sense que ningú ho hagi de dir",
    category: 'mati',
    emoji: '🛏️',
    base_points_good: 8,
    base_points_ok: 2,
    base_points_bad: -4,
    is_weekend_only: false,
    is_active: true,
    order_index: 35,
  },
  {
    name: 'Posar la taula',
    description: 'Posar la taula per sopar de forma autònoma',
    category: 'nit',
    emoji: '🍴',
    base_points_good: 8,
    base_points_ok: 2,
    base_points_bad: -4,
    is_weekend_only: false,
    is_active: true,
    order_index: 75,
  },
  {
    name: 'Recollir habitació',
    description: "Tenir l'habitació ordenada i recollida",
    category: 'nit',
    emoji: '🧹',
    base_points_good: 10,
    base_points_ok: 3,
    base_points_bad: -5,
    is_weekend_only: false,
    is_active: true,
    order_index: 95,
  },
  {
    name: 'Lectura',
    description: 'Llegir un llibre 15 minuts en silenci',
    category: 'nit',
    emoji: '📖',
    base_points_good: 10,
    base_points_ok: 3,
    base_points_bad: -5,
    is_weekend_only: false,
    is_active: true,
    order_index: 85,
  },
  {
    name: 'Activitat en família',
    description: 'Participar en una activitat familiar sense queixes',
    category: 'cap_de_setmana',
    emoji: '🎨',
    base_points_good: 12,
    base_points_ok: 4,
    base_points_bad: -6,
    is_weekend_only: true,
    is_active: true,
    order_index: 125,
  },
]

const CATEGORIES: RoutineCategory[] = ['mati', 'tarda', 'nit', 'cap_de_setmana']

type EditingRoutine = Partial<Routine> & { isNew?: boolean }

interface RoutineManagerProps {
  onClose: () => void
}

export default function RoutineManager({ onClose }: RoutineManagerProps) {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditingRoutine | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    fetchRoutines()
  }, [])

  async function fetchRoutines() {
    setLoading(true)
    const { data } = await supabase.from('routines').select('*').order('order_index')
    if (data) setRoutines(data as Routine[])
    setLoading(false)
  }

  async function handleSave() {
    if (!editing) return
    const { name, description, emoji, category, base_points_good, base_points_ok, base_points_bad } = editing
    if (!name?.trim() || !emoji || !category) return

    setSaving(true)
    const payload = {
      name: name.trim(),
      description: (description || '').trim(),
      emoji: emoji.trim(),
      category,
      base_points_good: base_points_good ?? 10,
      base_points_ok: base_points_ok ?? 3,
      base_points_bad: base_points_bad ?? -5,
      is_weekend_only: category === 'cap_de_setmana',
      is_active: editing.is_active !== false,
      order_index: editing.order_index ?? 999,
    }

    if (editing.isNew) {
      await supabase.from('routines').insert(payload)
    } else if (editing.id) {
      await supabase.from('routines').update(payload).eq('id', editing.id)
    }

    await fetchRoutines()
    setEditing(null)
    setSaving(false)
  }

  async function handleToggleActive(routine: Routine) {
    await supabase
      .from('routines')
      .update({ is_active: routine.is_active === false })
      .eq('id', routine.id)
    await fetchRoutines()
  }

  async function handleDelete(id: string) {
    await supabase.from('routines').delete().eq('id', id)
    await fetchRoutines()
    setDeleteConfirm(null)
  }

  const activeRoutines = routines.filter((r) => r.is_active !== false)
  const inactiveRoutines = routines.filter((r) => r.is_active === false)
  const existingNames = routines.map((r) => r.name.toLowerCase())
  const availableTemplates = ROUTINE_TEMPLATES.filter(
    (t) => !existingNames.includes(t.name.toLowerCase()),
  )

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-[#F0F4FF] overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#F0F4FF] border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-gray-600 font-bold text-sm hover:text-gray-900 transition-colors"
        >
          ← Enrere
        </button>
        <h1 className="font-black text-gray-800 text-lg">⚙️ Gestió de Rutines</h1>
        <button
          onClick={() => setEditing({ isNew: true, category: 'mati', base_points_good: 10, base_points_ok: 3, base_points_bad: -5, is_active: true })}
          className="bg-gray-800 text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-gray-700 transition-colors"
        >
          + Nova
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Active routines */}
            <section>
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                Rutines actives ({activeRoutines.length})
              </h2>
              {CATEGORIES.map((cat) => {
                const catRoutines = activeRoutines.filter((r) => r.category === cat)
                if (catRoutines.length === 0) return null
                return (
                  <div key={cat} className="mb-4">
                    <p
                      className="text-xs font-bold mb-2 px-1"
                      style={{ color: CATEGORY_COLORS[cat] }}
                    >
                      {CATEGORY_LABELS[cat]}
                    </p>
                    <div className="space-y-2">
                      {catRoutines.map((r) => (
                        <RoutineRow
                          key={r.id}
                          routine={r}
                          onEdit={() => setEditing({ ...r })}
                          onToggle={() => handleToggleActive(r)}
                          onDelete={() => setDeleteConfirm(r.id)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
              {activeRoutines.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">
                  Cap rutina activa. Afegeix-ne una!
                </p>
              )}
            </section>

            {/* Inactive routines */}
            {inactiveRoutines.length > 0 && (
              <section>
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                  Desactivades ({inactiveRoutines.length})
                </h2>
                <div className="space-y-2">
                  {inactiveRoutines.map((r) => (
                    <RoutineRow
                      key={r.id}
                      routine={r}
                      inactive
                      onEdit={() => setEditing({ ...r })}
                      onToggle={() => handleToggleActive(r)}
                      onDelete={() => setDeleteConfirm(r.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Template suggestions */}
            {availableTemplates.length > 0 && (
              <section>
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
                  Suggeriments
                </h2>
                <p className="text-xs text-gray-400 mb-3">
                  Rutines predefinides que pots activar amb un clic
                </p>
                <div className="space-y-2">
                  {availableTemplates.map((t) => (
                    <button
                      key={t.name}
                      onClick={() =>
                        setEditing({
                          ...t,
                          isNew: true,
                        })
                      }
                      className="w-full text-left bg-white/60 border-2 border-dashed border-gray-200 rounded-2xl p-3 flex items-center gap-3 hover:border-gray-400 hover:bg-white transition-all"
                    >
                      <span className="text-2xl opacity-50">{t.emoji}</span>
                      <div className="flex-1">
                        <p className="font-bold text-gray-400 text-sm">{t.name}</p>
                        <p className="text-xs text-gray-300">{CATEGORY_LABELS[t.category]}</p>
                      </div>
                      <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                        + Afegir
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <p className="text-2xl text-center mb-2">⚠️</p>
              <h3 className="font-black text-gray-800 text-center text-lg mb-2">Eliminar rutina?</h3>
              <p className="text-gray-500 text-sm text-center mb-6">
                Aquesta acció no es pot desfer. Es perdran tots els registres associats.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-600"
                >
                  Cancel·lar
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-3 rounded-2xl bg-red-500 font-bold text-white"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit / Setup Wizard */}
      <AnimatePresence>
        {editing && (
          <RoutineEditModal
            routine={editing}
            saving={saving}
            onChange={setEditing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function RoutineRow({
  routine,
  inactive = false,
  onEdit,
  onToggle,
  onDelete,
}: {
  routine: Routine
  inactive?: boolean
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const catColor = CATEGORY_COLORS[routine.category]
  return (
    <div
      className={`bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border-2 transition-all ${
        inactive ? 'opacity-50 border-gray-100' : 'border-transparent'
      }`}
    >
      <div
        className="w-1 self-stretch rounded-full flex-shrink-0"
        style={{ backgroundColor: inactive ? '#D1D5DB' : catColor }}
      />
      <span className={`text-2xl ${inactive ? 'grayscale' : ''}`}>{routine.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm leading-tight ${inactive ? 'text-gray-400' : 'text-gray-800'}`}>
          {routine.name}
        </p>
        <p className="text-xs text-gray-400 truncate">{routine.description}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Toggle active */}
        <button
          onClick={onToggle}
          title={inactive ? 'Activar' : 'Desactivar'}
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <span className="text-base">{inactive ? '👁️' : '🔕'}</span>
        </button>
        {/* Edit */}
        <button
          onClick={onEdit}
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <span className="text-base">✏️</span>
        </button>
        {/* Delete */}
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-red-50 transition-colors"
        >
          <span className="text-base">🗑️</span>
        </button>
      </div>
    </div>
  )
}

function RoutineEditModal({
  routine,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  routine: EditingRoutine
  saving: boolean
  onChange: (r: EditingRoutine) => void
  onSave: () => void
  onCancel: () => void
}) {
  const isNew = routine.isNew
  const isValid = !!routine.name?.trim() && !!routine.emoji?.trim() && !!routine.category

  function set(field: keyof EditingRoutine, value: unknown) {
    const updated = { ...routine, [field]: value }
    // Auto-set is_weekend_only based on category
    if (field === 'category') {
      updated.is_weekend_only = value === 'cap_de_setmana'
    }
    onChange(updated)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
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
          {isNew && routine.name && (
            <p className="text-gray-400 text-sm mt-1">Configura els detalls abans de guardar</p>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Emoji + Name */}
          <div className="flex gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                Emoji
              </label>
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
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                Nom
              </label>
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
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
              Descripció
            </label>
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
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">
              Categoria
            </label>
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

          {/* Points */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">
              Punts
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Bé ✅', field: 'base_points_good' as keyof Routine, color: '#58CC02' },
                { label: 'Regular 🟡', field: 'base_points_ok' as keyof Routine, color: '#FF9600' },
                { label: 'Malament ❌', field: 'base_points_bad' as keyof Routine, color: '#FF4B4B' },
              ].map(({ label, field, color }) => (
                <div key={field}>
                  <p className="text-xs font-bold text-center mb-1" style={{ color }}>
                    {label}
                  </p>
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
            {saving ? '...' : '💾 Guardar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
