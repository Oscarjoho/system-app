import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import QuestLibrary from '../components/QuestLibrary'
import AdminPage from './AdminPage'

const DAYS = ['MAN', 'TIR', 'ONS', 'TOR', 'FRE', 'LØR', 'SØN']

interface Quest { id: string; title: string; stat: string; xp_reward: number; type: string; rewards: any[] }
interface ScheduledQuest extends Quest { day_of_week: number }
interface SubscribedQuest { id: string; title: string; type: string; rewards: any[] }
interface CustomQuest { id: string; title: string; type: 'daily' | 'weekly'; completed_at: string | null }

const statColors: Record<string, string> = {
  discipline: 'text-blue-300', strength: 'text-blue-500',
  intelligence: 'text-slate-400', endurance: 'text-blue-400',
  health: 'text-blue-700', charisma: 'text-gray-400',
}
const xpStatMap: Record<string, string> = {
  health: 'health_xp', strength: 'strength_xp', endurance: 'endurance_xp',
  intelligence: 'intelligence_xp', charisma: 'charisma_xp', discipline: 'discipline_xp',
}

const getDateForDay = (dayIndex: number): string => {
  const now = new Date()
  const currentDayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1
  const date = new Date(now)
  date.setDate(now.getDate() + (dayIndex - currentDayIndex))
  return date.toISOString().split('T')[0]
}

type PlanView = 'main' | 'library' | 'admin'

export default function WeeklyPlanPage({ onClose }: { onClose?: () => void } = {}) {
  const { user } = useAuth()
  const today = new Date().getDay()
  const todayIndex = today === 0 ? 6 : today - 1
  const [selectedDay, setSelectedDay] = useState(todayIndex)
  const [scheduled, setScheduled] = useState<ScheduledQuest[]>([])
  const [subscribed, setSubscribed] = useState<SubscribedQuest[]>([])
  const [customQuests, setCustomQuests] = useState<CustomQuest[]>([])
  const [completions, setCompletions] = useState<Set<string>>(new Set())
  const [showAddDay, setShowAddDay] = useState(false)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<PlanView>('main')

  // Custom quest form
  const [showNewCustom, setShowNewCustom] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<'daily' | 'weekly'>('daily')

  const fetchData = async () => {
    if (!user) return
    const { data: subData } = await supabase
      .from('user_quest_subscriptions')
      .select('quest_id, quests(id, title, stat, xp_reward, type, quest_rewards(*))')
      .eq('user_id', user.id)
    setSubscribed((subData ?? []).map((s: any) => ({ ...s.quests, rewards: s.quests?.quest_rewards ?? [] })).filter(Boolean))

    const { data: schedData } = await supabase
      .from('quest_schedule')
      .select('day_of_week, quest_id, quests(id, title, stat, xp_reward, type, quest_rewards(*))')
      .eq('user_id', user.id)
    setScheduled((schedData ?? []).map((s: any) => ({
      ...s.quests, rewards: s.quests?.quest_rewards ?? [], day_of_week: s.day_of_week,
    })).filter((s: any) => s.id))

    const { data: customData } = await supabase.from('custom_quests').select('*').eq('user_id', user.id).order('created_at')
    setCustomQuests(customData ?? [])
    setLoading(false)
  }

  const fetchCompletions = async () => {
    if (!user) return
    const dateStr = getDateForDay(selectedDay)
    const { data } = await supabase.from('quest_completions').select('quest_id').eq('user_id', user.id).eq('completed_date', dateStr)
    setCompletions(new Set((data ?? []).map((c: any) => c.quest_id)))
  }

  const giveXP = async (rewards: any[]) => {
    for (const r of rewards) {
      const col = xpStatMap[r.stat]; if (!col) continue
      const { data } = await supabase.from('stats').select(col).eq('user_id', user!.id).single()
      if (data) {
        const cur = (data as any)[col] ?? 0
        await supabase.from('stats').update({ [col]: cur + r.xp_amount }).eq('user_id', user!.id)
      }
    }
  }

  const toggleDayCompletion = async (quest: SubscribedQuest) => {
    if (completions.has(quest.id)) return
    const dateStr = getDateForDay(selectedDay)
    const { error } = await supabase.from('quest_completions')
      .insert({ user_id: user!.id, quest_id: quest.id, completed_date: dateStr })
    if (!error) await giveXP(quest.rewards)
    await fetchCompletions()
  }

  useEffect(() => { fetchData() }, [user])
  useEffect(() => { fetchCompletions() }, [user, selectedDay])

  const addToDay = async (quest: SubscribedQuest) => {
    await supabase.from('quest_schedule').upsert({ user_id: user!.id, quest_id: quest.id, day_of_week: selectedDay })
    setShowAddDay(false)
    await fetchData()
  }

  const removeFromDay = async (questId: string) => {
    await supabase.from('quest_schedule').delete().eq('user_id', user!.id).eq('quest_id', questId).eq('day_of_week', selectedDay)
    await fetchData()
  }

  const unsubscribeQuest = async (questId: string) => {
    await supabase.from('user_quest_subscriptions').delete().eq('user_id', user!.id).eq('quest_id', questId)
    await fetchData()
  }

  const addCustomQuest = async () => {
    if (!newTitle.trim()) return
    await supabase.from('custom_quests').insert({ user_id: user!.id, title: newTitle.trim(), type: newType })
    setNewTitle(''); setShowNewCustom(false); await fetchData()
  }

  const toggleCustomDone = async (cq: CustomQuest) => {
    if (cq.completed_at) return
    await supabase.from('custom_quests').update({ completed_at: new Date().toISOString() }).eq('id', cq.id)
    await fetchData()
  }

  const deleteCustomQuest = async (id: string) => {
    await supabase.from('custom_quests').delete().eq('id', id)
    await fetchData()
  }

  const dayQuests = scheduled.filter(q => q.day_of_week === selectedDay)
  const unscheduled = subscribed.filter(q => !dayQuests.find(dq => dq.id === q.id))
  const daysWithQuests = new Set(scheduled.map(q => q.day_of_week))

  if (view === 'library') return (
    <QuestLibrary
      onClose={() => { setView('main'); fetchData() }}
      onCreateQuest={() => setView('admin')}
    />
  )

  if (view === 'admin') return (
    <AdminPage onClose={() => { setView('main'); fetchData() }} />
  )

  if (loading) return <div className="flex items-center justify-center h-32"><p className="text-xs text-gray-600 tracking-widest">LOADING...</p></div>

  return (
    <div className="p-4 space-y-6">

      {onClose && (
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-white tracking-widest mb-2">
          ← TILBAKE
        </button>
      )}

      {/* ── WEEK CALENDAR ── */}
      <div>
        <h3 className="text-xs text-gray-600 tracking-widest mb-3">UKEPLAN</h3>
        <div className="flex justify-between mb-4">
          {DAYS.map((day, i) => {
            const isToday = i === todayIndex
            const isSelected = i === selectedDay
            const hasQuests = daysWithQuests.has(i)
            return (
              <button key={day} onClick={() => { setSelectedDay(i); setShowAddDay(false) }}
                className="flex flex-col items-center gap-1.5">
                <span className={`text-xs tracking-wider ${isSelected ? 'text-blue-400' : 'text-gray-600'}`}>{day}</span>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isSelected ? 'bg-blue-500 border-blue-500 text-white'
                  : isToday ? 'border-blue-800 text-blue-400'
                  : hasQuests ? 'border-gray-700 text-gray-400'
                  : 'border-gray-800 text-gray-700'
                }`}>
                  {hasQuests && !isSelected
                    ? <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    : <span className="text-xs">{i + 1}</span>
                  }
                </div>
              </button>
            )
          })}
        </div>

        {/* Day quests */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600 tracking-widest">{DAYS[selectedDay]}{selectedDay === todayIndex ? ' — I DAG' : ''}</p>
            <span className="text-xs text-gray-700">{dayQuests.length} quests</span>
          </div>
          {dayQuests.map(quest => {
            const done = completions.has(quest.id)
            return (
              <div key={quest.id} className={`flex items-center justify-between bg-black border rounded-xl px-3 py-2.5 transition-all ${done ? 'border-blue-900 opacity-60' : 'border-gray-800'}`}>
                <button onClick={() => toggleDayCompletion(quest)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                  <span className={done ? 'text-blue-400' : 'text-gray-700'}>{done ? '●' : '○'}</span>
                  <span className={`text-sm truncate ${done ? 'line-through text-gray-500' : 'text-gray-200'}`}>{quest.title}</span>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex gap-1">
                    {quest.rewards?.map((r: any) => (
                      <span key={r.stat} className={`text-xs ${statColors[r.stat] ?? 'text-gray-500'}`}>
                        +{r.xp_amount} {r.stat.slice(0, 3).toUpperCase()}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => removeFromDay(quest.id)} className="text-gray-700 hover:text-red-500 transition-colors text-xs ml-1">✕</button>
                </div>
              </div>
            )
          })}
          {showAddDay && (
            <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
              {unscheduled.length === 0
                ? <p className="text-xs text-gray-600 text-center py-3 tracking-wider">Alle quests lagt til denne dagen</p>
                : unscheduled.map(q => (
                  <button key={q.id} onClick={() => addToDay(q)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left border-b border-gray-800 last:border-0 hover:bg-gray-900 transition-colors">
                    <span className="text-sm text-gray-300">{q.title}</span>
                    <div className="flex gap-1">
                      {q.rewards?.map((r: any) => (
                        <span key={r.stat} className={`text-xs ${statColors[r.stat] ?? 'text-gray-500'}`}>+{r.xp_amount} {r.stat.slice(0, 3).toUpperCase()}</span>
                      ))}
                    </div>
                  </button>
                ))
              }
            </div>
          )}
          <button onClick={() => setShowAddDay(p => !p)}
            className="w-full py-2 text-xs tracking-wider text-gray-700 hover:text-gray-500 border border-dashed border-gray-800 rounded-xl transition-colors">
            {showAddDay ? '✕ LUKK' : '+ LEGG TIL QUEST DENNE DAGEN'}
          </button>
        </div>
      </div>

      {/* ── MY QUESTS ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs text-gray-600 tracking-widest">MINE QUESTS</h3>
          <button onClick={() => setView('library')}
            className="text-xs text-blue-400 hover:text-blue-300 tracking-wider transition-colors">
            + LEGG TIL QUEST
          </button>
        </div>
        {subscribed.length === 0 && (
          <p className="text-xs text-gray-700 tracking-wider text-center py-4">Ingen quests lagt til ennå</p>
        )}
        <div className="space-y-2">
          {subscribed.map(q => (
            <div key={q.id} className="flex items-center justify-between bg-black border border-gray-800 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-700 w-12 tracking-wider shrink-0">
                  {q.type === 'daily' ? 'DAILY' : 'WEEKLY'}
                </span>
                <span className="text-sm text-gray-300 truncate">{q.title}</span>
              </div>
              <button onClick={() => unsubscribeQuest(q.id)} className="text-gray-700 hover:text-red-500 transition-colors text-xs ml-2 shrink-0">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* ── CUSTOM QUESTS ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs text-gray-600 tracking-widest">CUSTOM QUESTS</h3>
          <button onClick={() => setShowNewCustom(p => !p)}
            className="text-xs text-gray-500 hover:text-gray-300 tracking-wider transition-colors">
            {showNewCustom ? '✕' : '+ NY'}
          </button>
        </div>

        {showNewCustom && (
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 space-y-2 mb-2">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Hva vil du gjøre?"
              className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            <div className="flex gap-2">
              <select value={newType} onChange={e => setNewType(e.target.value as any)}
                className="flex-1 bg-black border border-gray-800 rounded-lg px-2 py-2 text-xs text-gray-300 focus:outline-none">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <button onClick={addCustomQuest} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-xs tracking-widest">LAGRE</button>
            </div>
          </div>
        )}

        {customQuests.length === 0 && !showNewCustom && (
          <p className="text-xs text-gray-700 tracking-wider text-center py-4">Ingen custom quests</p>
        )}

        <div className="space-y-2">
          {customQuests.map(cq => {
            const done = !!cq.completed_at
            return (
              <div key={cq.id} className={`flex items-center justify-between bg-black border border-gray-800 rounded-xl px-3 py-2.5 ${done ? 'opacity-50' : ''}`}>
                <button onClick={() => toggleCustomDone(cq)} className="flex items-center gap-2 flex-1 text-left">
                  <span className={done ? 'text-blue-400' : 'text-gray-700'}>{done ? '✓' : '○'}</span>
                  <span className={`text-sm ${done ? 'line-through text-gray-600' : 'text-gray-200'}`}>{cq.title}</span>
                  <span className="text-xs text-gray-700 ml-auto">{cq.type === 'daily' ? 'DAILY' : 'WEEKLY'}</span>
                </button>
                <button onClick={() => deleteCustomQuest(cq.id)} className="text-gray-700 hover:text-red-500 transition-colors text-xs ml-3">✕</button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
