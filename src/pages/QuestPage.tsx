import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

interface Subtask { id: string; label: string; order_index: number }
interface QuestReward { stat: string; xp_amount: number }
interface Quest {
  id: string; title: string; type: 'daily' | 'weekly' | 'boss'
  subtasks: Subtask[]; rewards: QuestReward[]
  subtasks_done: string[]; completed_at: string | null; user_quest_id: string | null
}
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

function getWeeklyBoss(bosses: Quest[]): Quest | null {
  if (!bosses.length) return null
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  return bosses[weekNum % bosses.length]
}

export default function QuestPage() {
  const { user } = useAuth()
  const [quests, setQuests] = useState<Quest[]>([])
  const [customQuests, setCustomQuests] = useState<CustomQuest[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [animatingOut, setAnimatingOut] = useState<string | null>(null)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<QuestReward[] | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchQuests = async () => {
    if (!user) return

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))
    weekStart.setHours(0, 0, 0, 0)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const { data: questData } = await supabase.from('quests').select('*, subtasks(*), quest_rewards(*)')
    const { data: userQuestData } = await supabase.from('user_quests').select('*').eq('user_id', user.id)
    const { data: completionData } = await supabase
      .from('quest_completions')
      .select('quest_id, completed_date')
      .eq('user_id', user.id)
      .gte('completed_date', weekStartStr)
    const { data: subData } = await supabase.from('user_quest_subscriptions').select('quest_id').eq('user_id', user.id)
    const subscribedIds = new Set((subData ?? []).map((s: any) => s.quest_id))
    const completedToday = new Set((completionData ?? []).filter((c: any) => c.completed_date === todayStr).map((c: any) => c.quest_id))
    const completedThisWeek = new Set((completionData ?? []).map((c: any) => c.quest_id))

    const { data: cqData } = await supabase.from('custom_quests').select('*').eq('user_id', user.id)
    setCustomQuests((cqData ?? []).map((cq: any) => ({
      ...cq,
      completed_at: cq.completed_at && cq.completed_at >= (cq.type === 'daily'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        : weekStart.toISOString()) ? cq.completed_at : null,
    })))

    setQuests((questData ?? []).map((q: any) => {
      const uq = (userQuestData ?? []).find((u: any) => u.quest_id === q.id)
      const isCompleted = q.type === 'daily' ? completedToday.has(q.id) : completedThisWeek.has(q.id)
      return {
        id: q.id, title: q.title, type: q.type,
        subtasks: (q.subtasks ?? []).sort((a: any, b: any) => a.order_index - b.order_index),
        rewards: q.quest_rewards ?? [],
        subtasks_done: uq?.subtasks_done ?? [],
        completed_at: isCompleted ? todayStr : null,
        user_quest_id: uq?.id ?? null,
        subscribed: q.type === 'boss' ? true : subscribedIds.has(q.id),
      }
    }).filter((q: any) => q.subscribed))
  }

  useEffect(() => { fetchQuests().finally(() => setLoading(false)) }, [user])

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

  const showToast = (rewards: QuestReward[]) => {
    setToast(rewards)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2000)
  }

  const toggleCustomDone = async (cq: CustomQuest) => {
    if (cq.completed_at) return
    await supabase.from('custom_quests').update({ completed_at: new Date().toISOString() }).eq('id', cq.id)
    await fetchQuests()
  }

  const animateComplete = (id: string) => {
    setAnimatingOut(id)
    setTimeout(() => { setHiddenIds(prev => new Set([...prev, id])); setAnimatingOut(null) }, 500)
  }

  const completeQuest = async (quest: Quest) => {
    if (animatingOut || hiddenIds.has(quest.id)) return
    animateComplete(quest.id)
    const todayStr = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('quest_completions')
      .insert({ user_id: user!.id, quest_id: quest.id, completed_date: todayStr })
    if (!error) { await giveXP(quest.rewards); showToast(quest.rewards) }
    await fetchQuests()
  }

  const toggleSubtask = async (quest: Quest, subtaskId: string) => {
    let uqId = quest.user_quest_id
    if (!uqId) {
      const { data } = await supabase.from('user_quests')
        .insert({ user_id: user!.id, quest_id: quest.id, subtasks_done: [] }).select('id').single()
      uqId = data?.id ?? null
    }
    if (!uqId) return
    const already = quest.subtasks_done.includes(subtaskId)
    const newDone = already ? quest.subtasks_done.filter(id => id !== subtaskId) : [...quest.subtasks_done, subtaskId]
    const allDone = quest.subtasks.every(s => newDone.includes(s.id))
    await supabase.from('user_quests').update({ subtasks_done: newDone }).eq('id', uqId)
    if (allDone && !quest.completed_at) {
      const todayStr = new Date().toISOString().split('T')[0]
      const { error } = await supabase.from('quest_completions')
        .insert({ user_id: user!.id, quest_id: quest.id, completed_date: todayStr })
      if (!error) { animateComplete(quest.id); await giveXP(quest.rewards); showToast(quest.rewards) }
    }
    await fetchQuests()
  }

  const QuestCard = ({ quest }: { quest: Quest }) => {
    if (hiddenIds.has(quest.id)) return null
    const isAnimating = animatingOut === quest.id
    const isOpen = expanded === quest.id
    const hasSubtasks = quest.subtasks.length > 0
    return (
      <div className={`transition-all duration-500 ease-in-out ${isAnimating ? 'opacity-0 -translate-y-3 scale-95 pointer-events-none' : 'opacity-100'}`}>
        <div className={`bg-black rounded-xl border overflow-hidden ${quest.type === 'boss' ? 'border-blue-900' : 'border-gray-800'}`}>
          <button className="w-full flex items-center justify-between p-3 text-left active:bg-gray-950 transition-colors"
            onClick={() => hasSubtasks ? setExpanded(isOpen ? null : quest.id) : completeQuest(quest)}>
            <div className="flex items-center gap-2">
              <span className="text-gray-700 text-lg">○</span>
              <span className="text-sm text-gray-200">{quest.title}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {quest.rewards.map(r => (
                <span key={r.stat} className={`text-xs font-medium ${statColors[r.stat] ?? 'text-gray-400'}`}>
                  +{r.xp_amount} {r.stat.slice(0, 3).toUpperCase()}
                </span>
              ))}
              {hasSubtasks && <span className="text-gray-700 ml-1 text-xs">{isOpen ? '▲' : '▼'}</span>}
            </div>
          </button>
          {isOpen && hasSubtasks && (
            <div className="px-3 pb-3 space-y-2 border-t border-gray-800 pt-2">
              {quest.subtasks.map(sub => {
                const checked = quest.subtasks_done.includes(sub.id)
                return (
                  <label key={sub.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={() => toggleSubtask(quest, sub.id)} className="accent-blue-500 w-4 h-4" />
                    <span className={`text-sm ${checked ? 'line-through text-gray-600' : 'text-gray-400'}`}>{sub.label}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) return <div className="flex items-center justify-center h-32"><p className="text-xs text-gray-600 tracking-widest">LOADING...</p></div>

  const daily = quests.filter(q => q.type === 'daily' && !q.completed_at)
  const dailyCustom = customQuests.filter(cq => cq.type === 'daily')
  const weekly = quests.filter(q => q.type === 'weekly' && !q.completed_at)
  const weeklyCustom = customQuests.filter(cq => cq.type === 'weekly')
  const boss = getWeeklyBoss(quests.filter(q => q.type === 'boss'))

  return (
    <div className="p-4 space-y-6">
      {toast && (
        <div className="fixed top-14 left-0 right-0 flex justify-center gap-2 z-50 pointer-events-none">
          {toast.map((r, i) => (
            <div key={i} className="bg-blue-500 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-widest shadow-lg">
              +{r.xp_amount} {r.stat.slice(0, 3).toUpperCase()}
            </div>
          ))}
        </div>
      )}

      {(daily.length > 0 || dailyCustom.length > 0) && (
        <div className="space-y-2">
          <h3 className="text-xs text-gray-600 tracking-widest">DAILY</h3>
          {daily.map(q => <QuestCard key={q.id} quest={q} />)}
          {dailyCustom.map(cq => (
            <div key={cq.id} className={`bg-black rounded-xl border border-gray-800 transition-all duration-300 ${cq.completed_at ? 'opacity-40' : ''}`}>
              <button className="w-full flex items-center justify-between p-3 text-left"
                onClick={() => toggleCustomDone(cq)}>
                <div className="flex items-center gap-2">
                  <span className={`text-lg ${cq.completed_at ? 'text-blue-400' : 'text-gray-700'}`}>{cq.completed_at ? '●' : '○'}</span>
                  <span className={`text-sm ${cq.completed_at ? 'line-through text-gray-600' : 'text-gray-200'}`}>{cq.title}</span>
                </div>
                <span className="text-xs text-gray-700">CUSTOM</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {(weekly.length > 0 || weeklyCustom.length > 0) && (
        <div className="space-y-2">
          <h3 className="text-xs text-gray-600 tracking-widest">WEEKLY</h3>
          {weekly.map(q => <QuestCard key={q.id} quest={q} />)}
          {weeklyCustom.map(cq => (
            <div key={cq.id} className={`bg-black rounded-xl border border-gray-800 transition-all duration-300 ${cq.completed_at ? 'opacity-40' : ''}`}>
              <button className="w-full flex items-center justify-between p-3 text-left"
                onClick={() => toggleCustomDone(cq)}>
                <div className="flex items-center gap-2">
                  <span className={`text-lg ${cq.completed_at ? 'text-blue-400' : 'text-gray-700'}`}>{cq.completed_at ? '●' : '○'}</span>
                  <span className={`text-sm ${cq.completed_at ? 'line-through text-gray-600' : 'text-gray-200'}`}>{cq.title}</span>
                </div>
                <span className="text-xs text-gray-700">CUSTOM</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {boss && !hiddenIds.has(boss.id) && (
        <div className="space-y-2">
          <h3 className="text-xs text-gray-600 tracking-widest">BOSS FIGHT</h3>
          <div className={`transition-all duration-500 ${animatingOut === boss.id ? 'opacity-0 -translate-y-3 scale-95' : 'opacity-100'}`}>
            <button onClick={() => completeQuest(boss)}
              className="w-full flex items-center justify-between p-3 bg-black rounded-xl border border-blue-900 text-left hover:bg-gray-950 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-gray-700 text-lg">○</span>
                <span className="text-sm text-gray-200">{boss.title}</span>
              </div>
              <div className="flex gap-1.5">
                {boss.rewards.map(r => (
                  <span key={r.stat} className={`text-xs font-medium ${statColors[r.stat] ?? 'text-gray-400'}`}>
                    +{r.xp_amount} {r.stat.slice(0, 3).toUpperCase()}
                  </span>
                ))}
              </div>
            </button>
          </div>
        </div>
      )}

      {daily.length === 0 && dailyCustom.length === 0 && weekly.length === 0 && weeklyCustom.length === 0 && (!boss || hiddenIds.has(boss.id)) && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-2xl mb-2">✓</p>
          <p className="text-sm text-gray-500 tracking-wider">Alle quests fullført</p>
          <p className="text-xs text-gray-700 mt-1">Legg til flere under PLAN</p>
        </div>
      )}
    </div>
  )
}
