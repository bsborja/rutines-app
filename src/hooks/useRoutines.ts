'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Routine, RoutineLog, RoutineCategory, EffectivePoints } from '@/types'
import { getTodayLogs, getProfileRoutinePoints } from '@/lib/points'

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRoutines() {
      const { data } = await supabase
        .from('routines')
        .select('*')
        .order('order_index')

      if (data) setRoutines(data as Routine[])
      setLoading(false)
    }

    fetchRoutines()
  }, [])

  return { routines, loading }
}

export function useRoutinesByCategory(category: RoutineCategory) {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRoutines() {
      const { data } = await supabase
        .from('routines')
        .select('*')
        .eq('category', category)
        .order('order_index')

      if (data) setRoutines(data as Routine[])
      setLoading(false)
    }

    fetchRoutines()
  }, [category])

  return { routines, loading }
}

export function useTodayLogs(profileId: string | null) {
  const [logs, setLogs] = useState<RoutineLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) {
      setLogs([])
      setLoading(false)
      return
    }

    let ignore = false

    async function fetchLogs() {
      const data = await getTodayLogs(profileId!)
      if (!ignore) {
        setLogs(data)
        setLoading(false)
      }
    }

    fetchLogs()

    // Realtime subscription for new logs
    const channel = supabase
      .channel(`logs:${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'routine_logs',
          filter: `profile_id=eq.${profileId}`,
        },
        () => {
          fetchLogs()
        },
      )
      .subscribe()

    return () => {
      ignore = true
      supabase.removeChannel(channel)
    }
  }, [profileId])

  const loggedRoutineIds = new Set(logs.map((l) => l.routine_id))

  return { logs, loading, loggedRoutineIds }
}

// Per-profile routine point overrides
// Returns a Map<routineId, EffectivePoints> and a reload function
export function useProfileRoutinePoints(profileId: string | null) {
  const [points, setPoints] = useState<Map<string, EffectivePoints>>(new Map())

  const load = useCallback(async () => {
    if (!profileId) return
    const map = await getProfileRoutinePoints(profileId)
    setPoints(map)
  }, [profileId])

  useEffect(() => {
    load()

    if (!profileId) return
    const channel = supabase
      .channel(`routine_points:${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'routine_points',
          filter: `profile_id=eq.${profileId}`,
        },
        () => { load() },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profileId, load])

  return { points, reload: load }
}
