import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

interface QuestReward { stat: string; xp_amount: number }
interface Quest {
  id: string; title: string; type: 'daily' | 'weekly' | 'boss'
  rewards: QuestReward[]; subscribed: boolean
}

const statColors: Record<string, string> = {
  discipline: 'text-blue-300', strength: 'text-blue-500',
  intelligence: 'text-slate-400', endurance: 'text-blue-400',
  health: 'text-blue-700', charisma: 'text-gray-400',
}

const typeLabel: Record<string, string> = {
  daily: 'DAILY', weekly: 'WEEKLY', boss: 'BOSS',
}

interface Props {
  onClose: () => void
  onCreateQuest: () => void
}

export default function QuestLibrary({ onClose, onCreateQuest }: Props) {
  const { user, profile } = useAuth()
  const [quests, setQuests] = useState<Quest[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchQuests = async () => {
    if (!user) return
    const { data: questData } = await supabase.from('quests').select('*, quest_rewards(*)')
    const { data: subData } = await supabase.from('user_quest_subscriptions').select('quest_id').eq('user_id', user.id)
    const subscribedIds = new Set((subData ?? []).map((s: any) => s.quest_id))

    setQuests((questData ?? []).map((q: any) => ({
      id: q.id, title: q.title, type: q.type,
      rewards: q.quest_rewards ?? [],
      subscribed: subscribedIds.has(q.id),
    })))
    setLoading(false)
  }

  useEffect(() => { fetchQuests() }, [user])

  const toggleSubscribe = async (quest: Quest) => {
    if (quest.type === 'boss') return
    if (quest.subscribed) {
      await supabase.from('user_quest_subscriptions').delete().eq('user_id', user!.id).eq('quest_id', quest.id)
    } else {
      await supabase.from('user_quest_subscriptions').insert({ user_id: user!.id, quest_id: quest.id })
    }
    await fetchQuests()
  }

  const filtered = quests.filter(q =>
    q.title.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = (['daily', 'weekly', 'boss'] as const).map(type => ({
    type,
    quests: filtered.filter(q => q.type === type),
  })).filter(g => g.quests.length > 0)

  return (
    <div className="fixed inset-0 bg-black z-40 flex flex-col max-w-md mx-auto">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-800 flex items-center justify-between shrink-0">
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-sm">
          ← TILBAKE
        </button>
        <h2 className="text-xs tracking-widest text-gray-400">ALLE QUESTS</h2>
        {profile?.is_admin ? (
          <button onClick={onCreateQuest}
            className="text-xs text-blue-400 hover:text-blue-300 tracking-wider transition-colors">
            + LAG NY
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-3 shrink-0">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Søk etter quest..."
          autoFocus
          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Quest list */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-5">
        {loading && <p className="text-xs text-gray-600 tracking-widest text-center py-8">LOADING...</p>}

        {!loading && filtered.length === 0 && (
          <p className="text-xs text-gray-600 tracking-widest text-center py-8">Ingen quests funnet</p>
        )}

        {grouped.map(({ type, quests }) => (
          <div key={type} className="space-y-2">
            <h3 className="text-xs text-gray-600 tracking-widest">{typeLabel[type]}</h3>
            {quests.map(quest => (
              <div key={quest.id}
                className={`bg-gray-950 rounded-xl border transition-colors ${
                  quest.type === 'boss' ? 'border-blue-900 opacity-60' :
                  quest.subscribed ? 'border-blue-800' : 'border-gray-800'
                }`}>
                <div className="flex items-center justify-between p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{quest.title}</p>
                    <div className="flex gap-1.5 mt-0.5">
                      {quest.rewards.map(r => (
                        <span key={r.stat} className={`text-xs ${statColors[r.stat] ?? 'text-gray-500'}`}>
                          +{r.xp_amount} {r.stat.slice(0, 3).toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                  {quest.type !== 'boss' && (
                    <button onClick={() => toggleSubscribe(quest)}
                      className={`ml-3 shrink-0 px-3 py-1 rounded-lg text-xs tracking-wider border transition-colors ${
                        quest.subscribed
                          ? 'border-blue-700 text-blue-400 bg-blue-950 hover:bg-red-950 hover:border-red-700 hover:text-red-400'
                          : 'border-gray-700 text-gray-500 hover:border-blue-700 hover:text-blue-400'
                      }`}>
                      {quest.subscribed ? 'LAGT TIL' : '+ LEGG TIL'}
                    </button>
                  )}
                  {quest.type === 'boss' && (
                    <span className="ml-3 text-xs text-blue-900 tracking-wider">AUTO</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
