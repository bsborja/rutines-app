'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Routine, RoutineLog, RoutineCategory } from '@/types'
import { getTodayLogs, getWeekendLogs } from '@/lib/points'

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRoutines() {
      const { data } = await supabase
        .from('routines')
        .select('*')
        .order('order_index')

      if (data) setRoutines((data as Routine[]).filter((r) => r.is_active !== false))
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
      const dayOfWeek = new Date().getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const data = isWeekend
        ? await getWeekendLogs(profileId!)
        : await getTodayLogs(profileId!)
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
