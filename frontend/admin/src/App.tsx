import { useState, useEffect } from 'react'
import { verifyToken } from './api'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    verifyToken().then(setAuthed)
  }, [])

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/20 text-sm">
        Checking access...
      </div>
    )
  }

  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />
  }

  return <DashboardPage />
}
