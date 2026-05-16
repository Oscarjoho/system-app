import { useRef, useState } from 'react'
import { useAuth } from './lib/auth'
import AuthPage from './pages/AuthPage'
import StatusPage from './pages/StatusPage'
import QuestPage from './pages/QuestPage'
import WeeklyPlanPage from './pages/WeeklyPlanPage'
import AdminPage from './pages/AdminPage'
import SkillPage from './pages/SkillPage'
import TrophiesPage from './pages/TrophiesPage'
import GuildPage from './pages/GuildPage'

type Section = 'quest' | 'plan' | 'skill' | 'trophies' | 'guild'

const navItems: { id: Section; label: string }[] = [
  { id: 'quest',    label: 'QUEST'    },
  { id: 'plan',     label: 'PLAN'     },
  { id: 'skill',    label: 'SKILL'    },
  { id: 'trophies', label: 'TROPHIES' },
  { id: 'guild',    label: 'GUILD'    },
]

export default function App() {
  const { session, loading, signOut, profile } = useAuth()
  const [openSection, setOpenSection] = useState<Section | null>(null)
  const [showAdmin, setShowAdmin] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-xs text-gray-600 tracking-widest">LOADING...</p>
    </div>
  )

  if (!session) return <AuthPage />

  if (showAdmin) return (
    <div className="min-h-screen bg-black text-white max-w-md mx-auto">
      <AdminPage onClose={() => setShowAdmin(false)} />
    </div>
  )

  const toggle = (id: Section) => {
    setOpenSection(prev => prev === id ? null : id)
    setTimeout(() => navRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 10)
  }

  const renderSection = () => {
    switch (openSection) {
      case 'quest':    return <QuestPage />
      case 'plan':     return <WeeklyPlanPage />
      case 'skill':    return <SkillPage />
      case 'trophies': return <TrophiesPage />
      case 'guild':    return <GuildPage />
      default:         return null
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col max-w-md mx-auto">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-800 flex items-center justify-between">
        <h1 className="text-xl font-bold text-blue-400 tracking-[0.3em]">SYSTEM</h1>
        <div className="flex items-center gap-3">
          {profile?.is_admin && (
            <button onClick={() => setShowAdmin(true)}
              className="text-xs text-blue-500 hover:text-blue-400 tracking-widest transition-colors border border-blue-900 px-2 py-1 rounded-lg">
              ADMIN
            </button>
          )}
          <button onClick={signOut} className="text-xs text-gray-700 hover:text-gray-500 tracking-widest">
            SIGN OUT
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <StatusPage />

        <div ref={navRef} className="flex border-t border-b border-gray-800">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => toggle(item.id)}
              className={`flex-1 py-2.5 text-xs tracking-wider transition-colors border-b-2 ${
                openSection === item.id
                  ? 'text-blue-400 border-blue-400 bg-gray-950'
                  : 'text-gray-600 border-transparent hover:text-gray-400'
              }`}>
              {item.label}
            </button>
          ))}
        </div>

        {openSection && (
          <div className="border-b border-gray-800">
            {renderSection()}
          </div>
        )}
      </div>
    </div>
  )
}
