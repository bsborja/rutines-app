'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types'

export function useProfile(profileId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profileId) {
      setProfile(null)
      setLoading(false)
      return
    }

    let ignore = false

    async function fetchProfile() {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single()

      if (!ignore) {
        if (err) setError(err.message)
        else setProfile(data as Profile)
        setLoading(false)
      }
    }

    fetchProfile()

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`profile:${profileId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profileId}` },
        (payload) => {
          if (!ignore) setProfile(payload.new as Profile)
        },
      )
      .subscribe()

    return () => {
      ignore = true
      supabase.removeChannel(channel)
    }
  }, [profileId])

  return { profile, loading, error }
}

export function useAllProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false) // true only after a confirmed fetch (even if empty)

  useEffect(() => {
    let ignore = false

    async function fetchProfiles() {
      const { data, error: err } = await supabase.from('profiles').select('*').order('name')
      if (ignore) return
      if (err) {
        setError(err.message)
        setLoading(false)
        // NOTE: do NOT set `loaded` on error — empty list must not be treated as "no profiles"
        return
      }
      setError(null)
      setProfiles((data as Profile[]) ?? [])
      setLoaded(true)
      setLoading(false)
    }

    fetchProfiles()

    const channel = supabase
      .channel('all_profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchProfiles()
      })
      .subscribe()

    return () => {
      ignore = true
      supabase.removeChannel(channel)
    }
  }, [])

  return { profiles, loading, error, loaded }
}
