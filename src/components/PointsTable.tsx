'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Routine, Profile, EffectivePoints, CATEGORY_LABELS, RoutineCategory } from '@/types'
import { supabase } from '@/lib/supabase'
import { getProfileRoutinePoints } from '@/lib/points'

interface PointsTableProps {
  routines: Routine[]
  girls: Profile[]
}

type AllPoints = Record<string, Map<string, EffectivePoints>> // profileId → routineId → pts
type Edits = Record<string, Record<string, number>>           // profileId → routineId → new points_good

const categories: RoutineCategory[] = ['mati', 'tarda', 'nit', 'cap_de_setmana']

export default function PointsTable({ routines, girls }: PointsTableProps) {
  const [allPoints, setAllPoints] = useState<AllPoints>({})
  const [edits, setEdits] = useState<Edits>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function loadAllPoints() {
    const entries = await Promise.all(
      girls.map(async (g) => {
        const map = await getProfileRoutinePoints(g.id)
        return [g.id, map] as [string, Map<string, EffectivePoints>]
      }),
    )
    setAllPoints(Object.fromEntries(entries))
  }

  useEffect(() => {
    if (girls.length > 0) loadAllPoints()
  }, [girls.map((g) => g.id).join(',')])

  function getCurrentGood(profileId: string, routineId: string): number {
    return allPoints[profileId]?.get(routineId)?.good ?? 10
  }

  function getEditValue(profileId: string, routineId: string): number {
    return edits[profileId]?.[routineId] ?? getCurrentGood(profileId, routineId)
  }

  function handleChange(profileId: string, routineId: string, value: number) {
    const clamped = Math.max(1, Math.min(30, value || 1))
    setEdits((prev) => ({
      ...prev,
      [profileId]: { ...(prev[profileId] ?? {}), [routineId]: clamped },
    }))
  }

  async function handleSave() {
    setSaving(true)
    for (const [profileId, routineEdits] of Object.entries(edits)) {
      for (const [routineId, pointsGood] of Object.entries(routineEdits)) {
        const pointsOk = Math.max(2, Math.round(pointsGood * 0.3))
        const pointsBad = -Math.max(2, Math.round(pointsGood * 0.5))

        await supabase.from('routine_points').upsert(
          {
            profile_id: profileId,
            routine_id: routineId,
            points_good: pointsGood,
            points_ok: pointsOk,
            points_bad: pointsBad,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'profile_id,routine_id' },
        )
      }
    }
    setSaving(false)
    setSaved(true)
    setEdits({})
    setTimeout(() => setSaved(false), 2000)
    await loadAllPoints()
  }

  const hasEdits = Object.values(edits).some((re) => Object.keys(re).length > 0)

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-gray-800">Punts per rutina</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Ajust automàtic cada dilluns 07:00 (oferta-demanda)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && !hasEdits && (
            <span className="text-green-600 text-sm font-bold">✅ Guardat!</span>
          )}
          {hasEdits && (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-white text-sm font-black bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Guardant...' : 'Guardar'}
            </motion.button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left p-3 text-xs font-black text-gray-400 uppercase tracking-wide">
                Rutina
              </th>
              {girls.map((girl) => (
                <th key={girl.id} className="p-2 text-center min-w-[88px]">
                  <div className="flex flex-col items-center gap-1">
                    {girl.avatar_url ? (
                      <img
                        src={girl.avatar_url}
                        alt={girl.name}
                        className="w-8 h-8 rounded-full object-cover border-2"
                        style={{ borderColor: girl.color }}
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black"
                        style={{ backgroundColor: girl.color }}
                      >
                        {girl.name[0]}
                      </div>
                    )}
                    <span className="text-xs font-bold text-gray-600">{girl.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const catRoutines = routines.filter((r) => r.category === cat)
              if (catRoutines.length === 0) return null

              return [
                <tr key={`cat-${cat}`} className="bg-gray-50">
                  <td
                    colSpan={girls.length + 1}
                    className="px-3 py-1.5 text-xs font-black text-gray-500 uppercase tracking-wide"
                  >
                    {CATEGORY_LABELS[cat]}
                  </td>
                </tr>,
                ...catRoutines.map((routine) => (
                  <tr key={routine.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{routine.emoji}</span>
                        <span className="text-xs font-semibold text-gray-700 leading-tight">
                          {routine.name}
                        </span>
                      </div>
                    </td>
                    {girls.map((girl) => {
                      const editVal = getEditValue(girl.id, routine.id)
                      const isEdited = edits[girl.id]?.[routine.id] !== undefined
                      const okVal = Math.max(2, Math.round(editVal * 0.3))
                      const badVal = -Math.max(2, Math.round(editVal * 0.5))

                      return (
                        <td key={girl.id} className="p-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={editVal}
                              onChange={(e) =>
                                handleChange(girl.id, routine.id, parseInt(e.target.value, 10))
                              }
                              className={`w-14 text-center rounded-lg py-1 text-sm font-black border-2 transition-colors ${
                                isEdited
                                  ? 'border-green-400 bg-green-50 text-green-700'
                                  : 'border-gray-200 bg-white text-gray-700'
                              }`}
                            />
                            <div className="flex gap-1 text-xs text-gray-400">
                              <span className="bg-orange-50 text-orange-500 rounded px-1">+{okVal}</span>
                              <span className="bg-red-50 text-red-400 rounded px-1">{badVal}</span>
                            </div>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )),
              ]
            })}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-gray-50 text-xs text-gray-400 text-center">
        Regular ≈ 30% de Bé · Malament ≈ −50% de Bé (ajust automàtic) · Rang: 1–30 pts
      </div>
    </div>
  )
}
