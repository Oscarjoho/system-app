import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface QuestReward { stat: string; xp_amount: number }
interface Quest { id: string; title: string; type: string; rewards: QuestReward[] }

const STATS = ['strength', 'endurance', 'health', 'intelligence', 'charisma', 'discipline']

interface Props { onClose: () => void }

export default function AdminPage({ onClose }: Props) {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  // Create form
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'daily' | 'weekly' | 'boss'>('daily')
  const [rewards, setRewards] = useState([{ stat: 'strength', xp: 50 }])

  const fetchQuests = async () => {
    const { data } = await supabase.from('quests').select('*, quest_rewards(*)').order('type')
    setQuests((data ?? []).map((q: any) => ({ ...q, rewards: q.quest_rewards ?? [] })))
    setLoading(false)
  }

  useEffect(() => { fetchQuests() }, [])

  const createQuest = async () => {
    if (!title.trim() || rewards.length === 0) return
    const { data: q } = await supabase.from('quests')
      .insert({ title: title.trim(), type, is_standard: true }).select('id').single()
    if (q) {
      await supabase.from('quest_rewards').insert(
        rewards.map(r => ({ quest_id: q.id, stat: r.stat, xp_amount: r.xp }))
      )
    }
    setTitle(''); setRewards([{ stat: 'strength', xp: 50 }]); setShowCreate(false)
    await fetchQuests()
  }

  const deleteQuest = async (id: string) => {
    await supabase.from('quests').delete().eq('id', id)
    await fetchQuests()
  }

  const typeColor: Record<string, string> = {
    daily: 'text-blue-400', weekly: 'text-slate-400', boss: 'text-blue-700'
  }

  return (
    <div className="fixed inset-0 bg-black z-40 flex flex-col max-w-md mx-auto">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-800 flex items-center justify-between shrink-0">
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-sm">
          ← TILBAKE
        </button>
        <h2 className="text-xs tracking-widest text-gray-400">ADMIN — QUESTS</h2>
        <button onClick={() => setShowCreate(p => !p)}
          className="text-xs text-blue-400 hover:text-blue-300 tracking-wider transition-colors">
          {showCreate ? '✕' : '+ LAG NY'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4 pt-4">

        {/* Create form */}
        {showCreate && (
          <div className="bg-gray-950 border border-blue-900 rounded-xl p-4 space-y-3">
            <p className="text-xs text-blue-500 tracking-widest">NY QUEST</p>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Quest tittel"
              className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            <select value={type} onChange={e => setType(e.target.value as any)}
              className="w-full bg-black border border-gray-800 rounded-lg px-2 py-2 text-xs text-gray-300 focus:outline-none">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="boss">Boss</option>
            </select>

            <div className="space-y-2">
              <p className="text-xs text-gray-600 tracking-widest">XP REWARDS</p>
              {rewards.map((r, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={r.stat}
                    onChange={e => setRewards(prev => prev.map((row, idx) => idx === i ? { ...row, stat: e.target.value } : row))}
                    className="flex-1 bg-black border border-gray-800 rounded-lg px-2 py-2 text-xs text-gray-300 focus:outline-none">
                    {STATS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input type="number" value={r.xp} placeholder="XP"
                    onChange={e => setRewards(prev => prev.map((row, idx) => idx === i ? { ...row, xp: parseInt(e.target.value) || 0 } : row))}
                    className="w-16 bg-black border border-gray-800 rounded-lg px-2 py-2 text-xs text-gray-300 focus:outline-none" />
                  {rewards.length > 1 && (
                    <button onClick={() => setRewards(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-gray-600 hover:text-red-400 transition-colors">✕</button>
                  )}
                </div>
              ))}
              <button onClick={() => setRewards(prev => [...prev, { stat: 'endurance', xp: 25 }])}
                className="text-xs text-blue-500 hover:text-blue-400 tracking-wider">
                + legg til XP type
              </button>
            </div>

            <button onClick={createQuest}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-lg text-xs tracking-widest transition-colors">
              LAGRE QUEST
            </button>
          </div>
        )}

        {/* Quest list */}
        {loading && <p className="text-xs text-gray-600 tracking-widest text-center py-8">LOADING...</p>}

        {(['daily', 'weekly', 'boss'] as const).map(t => {
          const filtered = quests.filter(q => q.type === t)
          if (!filtered.length) return null
          return (
            <div key={t} className="space-y-2">
              <h3 className={`text-xs tracking-widest ${typeColor[t]}`}>
                {t === 'daily' ? 'DAILY' : t === 'weekly' ? 'WEEKLY' : 'BOSS'}
              </h3>
              {filtered.map(quest => (
                <div key={quest.id} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-200 truncate">{quest.title}</p>
                    <div className="flex gap-1.5 mt-0.5">
                      {quest.rewards.map(r => (
                        <span key={r.stat} className="text-xs text-gray-600">
                          +{r.xp_amount} {r.stat.slice(0, 3).toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => deleteQuest(quest.id)}
                    className="text-gray-700 hover:text-red-500 transition-colors text-xs ml-3 shrink-0">
                    SLETT
                  </button>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
