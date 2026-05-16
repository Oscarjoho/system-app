import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [age, setAge] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'register') {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.toUpperCase(),
            age: parseInt(age),
          }
        }
      })
      if (signUpError) { setError(signUpError.message); setLoading(false); return }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { setError(signInError.message); setLoading(false); return }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <h1 className="text-3xl font-bold text-blue-400 tracking-[0.4em] mb-2">SYSTEM</h1>
      <p className="text-xs text-gray-600 tracking-widest mb-10">LIFE DEVELOPMENT</p>

      <div className="w-full max-w-sm">
        {/* Mode toggle */}
        <div className="flex border border-gray-800 rounded-lg overflow-hidden mb-6">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2.5 text-xs tracking-widest transition-colors ${
              mode === 'login' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            LOGIN
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2.5 text-xs tracking-widest transition-colors ${
              mode === 'register' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            REGISTER
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <>
              <div>
                <label className="text-xs text-gray-600 tracking-widest">USERNAME</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 tracking-wider"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 tracking-widest">AGE</label>
                <input
                  type="number"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  required
                  min="10"
                  max="100"
                  className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs text-gray-600 tracking-widest">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 tracking-widest">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 tracking-wider">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-800 disabled:text-gray-600 text-white py-3 rounded-lg text-xs tracking-widest transition-colors"
          >
            {loading ? 'LOADING...' : mode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}
          </button>
        </form>
      </div>
    </div>
  )
}
