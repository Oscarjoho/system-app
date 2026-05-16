import { useEffect, useState } from 'react'
import { getLevelFromXP, getXPProgress } from '../lib/xp'
import { supabase } from '../lib/supabase'
import type { Stats } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import CharacterFigure from '../components/CharacterFigure'

const statConfig = [
  { key: 'health_xp',       label: 'Health',       short: 'HP',  color: 'bg-blue-700' },
  { key: 'strength_xp',     label: 'Strength',     short: 'STR', color: 'bg-blue-500' },
  { key: 'endurance_xp',    label: 'Endurance',    short: 'END', color: 'bg-blue-400' },
  { key: 'intelligence_xp', label: 'Intelligence', short: 'INT', color: 'bg-slate-400' },
  { key: 'charisma_xp',     label: 'Charisma',     short: 'CHA', color: 'bg-gray-400' },
  { key: 'discipline_xp',   label: 'Discipline',   short: 'DIS', color: 'bg-blue-300' },
] as const

export default function StatusPage() {
  const { profile, user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('stats').select('*').eq('user_id', user.id).single().then(({ data }) => setStats(data))

    const channel = supabase
      .channel('stats-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stats', filter: `user_id=eq.${user.id}` },
        (payload) => setStats(payload.new as Stats))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-xs text-red-400 tracking-widest">INGEN PROFIL FUNNET — LOGG UT OG REGISTRER DEG PÅ NYTT</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-xs text-gray-600 tracking-widest">LOADING...</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">

      {/* Top row: Name/Age left, Character right */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-gray-600 tracking-widest mb-0.5">NAME</p>
            <p className="text-lg font-bold tracking-widest text-white">{profile.username}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 tracking-widest mb-0.5">AGE</p>
            <p className="text-lg font-bold tracking-widest text-white">{profile.age}</p>
          </div>
        </div>
        <div className="flex items-center justify-center bg-gray-950 rounded-xl border border-gray-800 px-5 py-3">
          <CharacterFigure size="sm" />
        </div>
      </div>

      {/* Stats */}
      <div>
        <p className="text-xs text-gray-600 tracking-widest mb-3">STATS</p>
        <div className="space-y-3">
          {statConfig.map((stat) => {
            const xp = stats[stat.key] ?? 0
            const level = getLevelFromXP(xp)
            const progress = getXPProgress(xp)
            const pct = Math.round((progress.current / progress.required) * 100)
            return (
              <div key={stat.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">{stat.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-700">{progress.current} / {progress.required} XP</span>
                    <span className="text-xs font-bold text-white w-10 text-right">LVL {level}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stat.color} rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
