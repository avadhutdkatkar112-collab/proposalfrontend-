import { useState } from 'react'
import { motion } from 'framer-motion'
import { login } from '../api'

interface LoginPageProps {
  onLogin: () => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await login(username, password)
      if (res.token) {
        onLogin()
      } else {
        setError(res.error || 'Login failed')
      }
    } catch {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(26,16,48,0.8), rgba(13,8,24,0.9))',
          border: '1px solid rgba(232,160,191,0.12)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <div className="text-center mb-8">
          <h1
            className="text-xl text-white/80 mb-1"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Proposal Dashboard
          </h1>
          <p className="text-white/30 text-xs tracking-wider">Private access only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm text-white/80 placeholder-white/25 outline-none focus:ring-1 transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              autoFocus
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm text-white/80 placeholder-white/25 outline-none focus:ring-1 transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />
          </div>

          {error && (
            <p className="text-red-400/80 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, rgba(232,160,191,0.2), rgba(212,175,55,0.15))',
              border: '1px solid rgba(232,160,191,0.25)',
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
