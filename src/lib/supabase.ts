import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          role: 'nena' | 'pare' | 'mare'
          birth_date: string | null
          avatar_url: string | null
          pin_hash: string | null
          level: number
          total_points: number
          color: string
          is_julia_mode: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      routines: {
        Row: {
          id: string
          name: string
          description: string
          category: 'mati' | 'tarda' | 'nit' | 'cap_de_setmana'
          base_points_good: number
          base_points_ok: number
          base_points_bad: number
          is_weekend_only: boolean
          emoji: string
          order_index: number
        }
      }
      routine_logs: {
        Row: {
          id: string
          profile_id: string
          routine_id: string
          score: 'good' | 'ok' | 'bad'
          points_awarded: number
          logged_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['routine_logs']['Row'], 'id' | 'created_at'>
      }
      weekly_summaries: {
        Row: {
          id: string
          profile_id: string
          week_start: string
          total_points: number
          equivalent_euros: number
          created_at: string
        }
      }
      badges: {
        Row: {
          id: string
          profile_id: string
          badge_type: 'streak_3' | 'streak_7' | 'streak_30'
          earned_at: string
        }
      }
    }
  }
}
