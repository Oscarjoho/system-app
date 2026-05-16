import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type StatKey = 'health' | 'strength' | 'endurance' | 'intelligence' | 'charisma' | 'discipline'

export interface Profile {
  id: string
  username: string
  age: number
  is_admin: boolean
  created_at: string
}

export interface Stats {
  user_id: string
  health_xp: number
  strength_xp: number
  endurance_xp: number
  intelligence_xp: number
  charisma_xp: number
  discipline_xp: number
}

export interface Quest {
  id: string
  title: string
  type: 'daily' | 'weekly' | 'boss'
  stat: StatKey
  xp_reward: number
  is_standard: boolean
}

export interface Subtask {
  id: string
  quest_id: string
  label: string
  order_index: number
}

export interface UserQuest {
  id: string
  user_id: string
  quest_id: string
  completed_at: string | null
  subtasks_done: string[]
}
