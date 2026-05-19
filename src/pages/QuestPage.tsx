import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import WeeklyPlanPage from './WeeklyPlanPage'

const DAYS = ['MAN', 'TIR', 'ONS', 'TOR', 'FRE', 'LØR', 'SØN']

interface QuestReward { stat: string; xp_amount: number }
interface Quest {
  id: string; title: string; type: string
  subtasks: any[]; rewards: QuestReward[]
  subtasks_done: string[]; completed_at: string | null; user_quest_id: string | null
}
interface CustomQuest { id: string; title: string; type: 'daily' | 'weekly'; completed_at: string | null }

type QuestTab = 'daily' | 'weekly' | 'boss'

const statColors: Record<string, string> = {
  discipline: 'text-blue-300', strength: 'text-blue-500',
  intelligence: 'text-slate-400', endurance: 'text-blue-400',
  health: 'text-blue-700', charisma: 'text-gray-400',
}
const xpStatMap: Record<string, string> = {
  health: 'health_xp', strength: 'strength_xp', endurance: 'endurance_xp',
  intelligence: 'intelligence_xp', charisma: 'charisma_xp', discipline: 'discipline_xp',
}

function getDateForDay(dayIndex: number): string {
  const now = new Date()
  const currentDayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1
  const date = new Date(now)
  date.setDate(now.getDate() + (dayIndex - currentDayIndex))
  return date.toISOString().split('T')[0]
}

function getWeeklyBoss(bosses: Quest[]): Quest | null {
  if (!bosses.length) return null
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  return bosses[weekNum % bosses.length]
}

export default function QuestPage() {
  const { user } = useAuth()
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  const [questTab, setQuestTab] = useState<QuestTab>('daily')
  const [selectedDay, setSelectedDay] = useState(todayIndex)
  const [scheduledQuests, setScheduledQuests] = useState<any[]>([])
  const [weeklyQuests, setWeeklyQuests] = useState<Quest[]>([])
  const [bossQuests, setBossQuests] = useState<Quest[]>([])
  const [customQuests, setCustomQuests] = useState<CustomQuest[]>([])
  const [completions, setCompletions] = useState<Set<string>>(new Set())
  const [weeklyCompletions, setWeeklyCompletions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [animatingOut, setAnimatingOut] = useState<string | null>(null)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<QuestReward[] | null>(null)
  const [showPlan, setShowPlan] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = async () => {
    if (!user) return

    const { data: schedData } = await supabase
      .from('quest_schedule')
      .select('day_of_week, quest_id, quests(id, title, type, quest_rewards(*))')
      .eq('user_id', user.id)
    setScheduledQuests((schedData ?? []).map((s: any) => ({
      ...s.quests, rewards: s.quests?.quest_rewards ?? [], day_of_week: s.day_of_week,
    })).filter((s: any) => s.id))

    const { data: subData } = await supabase
      .from('user_quest_subscriptions')
      .select('quest_id, quests(id, title, type, subtasks(*), quest_rewards(*))')
      .eq('user_id', user.id)
    const allSub = (subData ?? []).map((s: any) => ({
      ...s.quests, rewards: s.quests?.quest_rewards ?? [],
      subtasks: s.quests?.subtasks ?? [], subtasks_done: [], completed_at: null, user_quest_id: null,
    })).filter(Boolean)
    setWeeklyQuests(allSub.filter((q: any) => q.type === 'weekly'))

    const { data: bossData } = await supabase.from('quests').select('*, quest_rewards(*)').eq('type', 'boss')
    setBossQuests((bossData ?? []).map((q: any) => ({
      id: q.id, title: q.title, type: q.type,
      subtasks: [], rewards: q.quest_rewards ?? [], subtasks_done: [], completed_at: null, user_quest_id: null,
    })))

    const { data: cqData } = await supabase.from('custom_quests').select('*').eq('user_id', user.id).order('created_at')
    setCustomQuests(cqData ?? [])
  }

  const fetchCompletions = async () => {
    if (!user) return
    const dateStr = getDateForDay(selectedDay)
    const { data } = await supabase.from('quest_completions').select('quest_id')
      .eq('user_id', user.id).eq('completed_date', dateStr)
    setCompletions(new Set((data ?? []).map((c: any) => c.quest_id)))

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))
    weekStart.setHours(0, 0, 0, 0)
    const { data: wData } = await supabase.from('quest_completions').select('quest_id')
      .eq('user_id', user.id).gte('completed_date', weekStart.toISOString().split('T')[0])
    setWeeklyCompletions(new Set((wData ?? []).map((c: any) => c.quest_id)))
  }

  useEffect(() => { fetchData().finally(() => setLoading(false)) }, [user])
  useEffect(() => { fetchCompletions() }, [user, selectedDay])

  const giveXP = async (rewards: QuestReward[]) => {
    for (const r of rewards) {
      const col = xpStatMap[r.stat]; if (!col) continue
      const { data } = await supabase.from('stats').select(col).eq('user_id', user!.id).single()
      if (data) {
        const cur = (data as unknown as Record<string, number>)[col] ?? 0
        await supabase.from('stats').update({ [col]: cur + r.xp_amount }).eq('user_id', user!.id)
      }
    }
  }

  const showToastMsg = (rewards: QuestReward[]) => {
    setToast(rewards)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2000)
  }

  const completeDayQuest = async (quest: any) => {
    if (completions.has(quest.id)) return
    const dateStr = getDateForDay(selectedDay)
    const { error } = await supabase.from('quest_completions')
      .insert({ user_id: user!.id, quest_id: quest.id, completed_date: dateStr })
    if (!error) { await giveXP(quest.rewards); showToastMsg(quest.rewards) }
    await fetchCompletions()
  }

  const completeWeeklyOrBoss = async (quest: Quest) => {
    if (weeklyCompletions.has(quest.id) || animatingOut || hiddenIds.has(quest.id)) return
    setAnimatingOut(quest.id)
    setTimeout(() => { setHiddenIds(prev => new Set([...prev, quest.id])); setAnimatingOut(null) }, 500)
    const todayStr = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('quest_completions')
      .insert({ user_id: user!.id, quest_id: quest.id, completed_date: todayStr })
    if (!error) { await giveXP(quest.rewards); showToastMsg(quest.rewards) }
    await fetchCompletions()
  }

  const toggleCustomDone = async (cq: CustomQuest) => {
    if (cq.completed_at) return
    await supabase.from('custom_quests').update({ completed_at: new Date().toISOString() }).eq('id', cq.id)
    await fetchData()
  }

  if (showPlan) return <WeeklyPlanPage onClose={() => { setShowPlan(false); fetchData(); fetchCompletions() }} />
  if (loading) return <div className="flex items-center justify-center h-32"><p className="text-xs text-gray-600 tracking-widest">LOADING...</p></div>

  const dayQuests = scheduledQuests.filter((q: any) => q.day_of_week === selectedDay)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const dailyCustom = customQuests.filter(cq => cq.type === 'daily')
  const weeklyCustom = customQuests.filter(cq => cq.type === 'weekly')
  const boss = getWeeklyBoss(bossQuests)

  return (
    <div className="p-4 space-y-4">
      {toast && (
        <div className="fixed top-14 left-0 right-0 flex justify-center gap-2 z-50 pointer-events-none">
          {toast.map((r, i) => (
            <div key={i} className="bg-blue-500 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-widest shadow-lg">
              +{r.xp_amount} {r.stat.slice(0, 3).toUpperCase()}
            </div>
          ))}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {(['daily', 'weekly', 'boss'] as const).map(tab => (
          <button key={tab} onClick={() => setQuestTab(tab)}
            className={`flex-1 py-2.5 text-xs tracking-widest rounded-xl border transition-colors ${
              questTab === tab ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-800 text-gray-600'
            }`}>
            {tab === 'daily' ? 'DAILY' : tab === 'weekly' ? 'WEEKLY' : 'BOSS'}
          </button>
        ))}
      </div>

      {/* ── DAILY ── */}
      {questTab === 'daily' && (
        <div className="space-y-4">
          {/* Day picker */}
          <div className="flex justify-between">
            {DAYS.map((day, i) => {
              const isToday = i === todayIndex
              const isSelected = i === selectedDay
              return (
                <button key={day} onClick={() => setSelectedDay(i)} className="flex flex-col items-center gap-1">
                  <span className={`text-xs tracking-wider ${isSelected ? 'text-blue-400' : 'text-gray-600'}`}>{day}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isSelected ? 'bg-blue-500 border-blue-500 text-white'
                    : isToday ? 'border-blue-800 text-blue-400'
                    : 'border-gray-800 text-gray-700'
                  }`}>
                    <span className="text-xs">{i + 1}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Quests for selected day */}
          <div className="space-y-2">
            <p className="text-xs text-gray-600 tracking-widest">{DAYS[selectedDay]}{selectedDay === todayIndex ? ' — I DAG' : ''}</p>

            {dayQuests.length === 0 && dailyCustom.length === 0 && (
              <p className="text-xs text-gray-700 text-center py-6 tracking-wider">Ingen quests planlagt — trykk PLANLEGG UKEN</p>
            )}

            {dayQuests.map((quest: any) => {
              const done = completions.has(quest.id)
              return (
                <div key={quest.id} onClick={() => completeDayQuest(quest)}
                  className={`flex items-center justify-between bg-black border rounded-xl px-3 py-2.5 transition-all ${done ? 'border-blue-900 opacity-50' : 'border-gray-800'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={done ? 'text-blue-400' : 'text-gray-700'}>{done ? '●' : '○'}</span>
                    <span className={`text-sm truncate ${done ? 'line-through text-gray-500' : 'text-gray-200'}`}>{quest.title}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {quest.rewards?.map((r: any) => (
                      <span key={r.stat} className={`text-xs ${statColors[r.stat] ?? 'text-gray-500'}`}>
                        +{r.xp_amount} {r.stat.slice(0, 3).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}

            {dailyCustom.map(cq => {
              const done = !!cq.completed_at && cq.completed_at >= todayStart
              return (
                <div key={cq.id} onClick={() => toggleCustomDone(cq)}
                  className={`flex items-center justify-between bg-black border border-gray-800 rounded-xl px-3 py-2.5 transition-all ${done ? 'opacity-40' : ''}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={done ? 'text-blue-400' : 'text-gray-700'}>{done ? '●' : '○'}</span>
                    <span className={`text-sm truncate ${done ? 'line-through text-gray-500' : 'text-gray-200'}`}>{cq.title}</span>
                  </div>
                  <span className="text-xs text-gray-700 shrink-0">CUSTOM</span>
                </div>
              )
            })}
          </div>

          {/* Plan button */}
          <button onClick={() => setShowPlan(true)}
            className="w-full py-3 text-xs tracking-widest text-gray-600 hover:text-gray-400 border border-dashed border-gray-800 rounded-xl transition-colors">
            PLANLEGG UKEN
          </button>
        </div>
      )}

      {/* ── WEEKLY ── */}
      {questTab === 'weekly' && (
        <div className="space-y-2">
          {weeklyQuests.filter(q => !hiddenIds.has(q.id)).map(quest => {
            const done = weeklyCompletions.has(quest.id)
            return (
              <div key={quest.id} className={`transition-all duration-500 ${animatingOut === quest.id ? 'opacity-0 -translate-y-3 scale-95' : ''}`}>
                <div onClick={() => !done && completeWeeklyOrBoss(quest)}
                  className={`flex items-center justify-between bg-black border rounded-xl px-3 py-2.5 transition-all ${done ? 'border-blue-900 opacity-50' : 'border-gray-800'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={done ? 'text-blue-400' : 'text-gray-700'}>{done ? '●' : '○'}</span>
                    <span className={`text-sm truncate ${done ? 'line-through text-gray-500' : 'text-gray-200'}`}>{quest.title}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {quest.rewards.map(r => (
                      <span key={r.stat} className={`text-xs ${statColors[r.stat] ?? 'text-gray-400'}`}>
                        +{r.xp_amount} {r.stat.slice(0, 3).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
          {weeklyCustom.map(cq => {
            const done = !!cq.completed_at
            return (
              <div key={cq.id} onClick={() => toggleCustomDone(cq)}
                className={`flex items-center justify-between bg-black border border-gray-800 rounded-xl px-3 py-2.5 ${done ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={done ? 'text-blue-400' : 'text-gray-700'}>{done ? '●' : '○'}</span>
                  <span className={`text-sm truncate ${done ? 'line-through text-gray-500' : 'text-gray-200'}`}>{cq.title}</span>
                </div>
                <span className="text-xs text-gray-700 shrink-0">CUSTOM</span>
              </div>
            )
          })}
          {weeklyQuests.length === 0 && weeklyCustom.length === 0 && (
            <p className="text-xs text-gray-700 text-center py-6 tracking-wider">Ingen weekly quests lagt til</p>
          )}
        </div>
      )}

      {/* ── BOSS ── */}
      {questTab === 'boss' && (
        <div className="space-y-2">
          {boss && !hiddenIds.has(boss.id) ? (
            <div className={`transition-all duration-500 ${animatingOut === boss.id ? 'opacity-0 -translate-y-3 scale-95' : ''}`}>
              <div onClick={() => !weeklyCompletions.has(boss.id) && completeWeeklyOrBoss(boss)}
                className={`flex items-center justify-between bg-black border rounded-xl px-3 py-2.5 transition-all ${weeklyCompletions.has(boss.id) ? 'border-blue-900 opacity-50' : 'border-blue-900'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={weeklyCompletions.has(boss.id) ? 'text-blue-400' : 'text-gray-700'}>
                    {weeklyCompletions.has(boss.id) ? '●' : '○'}
                  </span>
                  <span className={`text-sm truncate ${weeklyCompletions.has(boss.id) ? 'line-through text-gray-500' : 'text-gray-200'}`}>{boss.title}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  {boss.rewards.map(r => (
                    <span key={r.stat} className={`text-xs ${statColors[r.stat] ?? 'text-gray-400'}`}>
                      +{r.xp_amount} {r.stat.slice(0, 3).toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-700 text-center py-6 tracking-wider">Ingen boss quest denne uken</p>
          )}
        </div>
      )}
    </div>
  )
}
