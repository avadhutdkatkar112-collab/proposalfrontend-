import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useSessionTracker } from './hooks/useSessionTracker'
import { useSessionReplay } from './hooks/useSessionReplay'
import LoadingScreen from './components/ui/LoadingScreen'
import CursorGlow from './components/ui/CursorGlow'
import ParticleField from './components/ui/ParticleField'
import ScrollNav from './components/ui/ScrollNav'
import Dashboard from './components/ui/Dashboard'
import LandingSection from './components/sections/LandingSection'
import TimelineSection from './components/sections/TimelineSection'
import RevealSection from './components/sections/RevealSection'
import GallerySection from './components/sections/GallerySection'
import TruthSection from './components/sections/TruthSection'
import CuteSection from './components/sections/CuteSection'
import ReasonsSection from './components/sections/ReasonsSection'
import LetterSection from './components/sections/LetterSection'
import ProposalSection from './components/sections/ProposalSection'
import EndingSection from './components/sections/EndingSection'

const sectionIds = [
  'sec-landing',
  'sec-timeline',
  'sec-reveal',
  'sec-gallery',
  'sec-truth',
  'sec-cute',
  'sec-reasons',
  'sec-letter',
  'sec-proposal',
  'sec-ending',
]

function App() {
  const isReplayMode = new URLSearchParams(window.location.search).get('replay') === '1'

  const [loaded, setLoaded] = useState(isReplayMode)
  const [started, setStarted] = useState(isReplayMode)
  const [choice, setChoice] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState(0)
  const [showDashboard, setShowDashboard] = useState(false)

  const { session, trackSection, trackResponse, resetSession } = useSessionTracker()
  if (!isReplayMode) useSessionReplay()

  const handleLoad = useCallback(() => setLoaded(true), [])

  const handleStart = useCallback(() => {
    setStarted(true)
    setTimeout(() => {
      document.getElementById('sec-timeline')?.scrollIntoView({ behavior: 'smooth' })
    }, 400)
  }, [])

  const handleChoice = useCallback(
    (c: string) => {
      setChoice(c)
      trackResponse(c)
      setTimeout(() => {
        document.getElementById('sec-ending')?.scrollIntoView({ behavior: 'smooth' })
      }, 400)
    },
    [trackResponse]
  )

  // Section observer + tracking
  useEffect(() => {
    if (!started) return

    const visibleIds = choice ? sectionIds : sectionIds.slice(0, -1)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = visibleIds.indexOf(entry.target.id)
            if (idx !== -1) {
              setActiveSection(idx)
              trackSection(entry.target.id)
            }
          }
        })
      },
      { threshold: 0.3 }
    )

    const timer = setTimeout(() => {
      visibleIds.forEach((id) => {
        const el = document.getElementById(id)
        if (el) observer.observe(el)
      })
    }, 300)

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [started, choice, trackSection])

  // Keyboard shortcut: Ctrl+Shift+D to open dashboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setShowDashboard((prev) => !prev)
      }
      if (e.key === 'Escape' && showDashboard) {
        setShowDashboard(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showDashboard])

  // Replay mode: listen for scroll commands from admin iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'replay-scroll' && typeof e.data.scrollPct === 'number') {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight
        if (maxScroll > 0) {
          document.documentElement.style.scrollBehavior = 'auto'
          window.scrollTo(0, e.data.scrollPct * maxScroll)
          document.documentElement.style.scrollBehavior = ''
        }
      }
      if (e.data?.type === 'replay-hash' && typeof e.data.hash === 'string') {
        const el = document.getElementById(e.data.hash)
        if (el) el.scrollIntoView({ behavior: 'instant' })
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const scrollTo = useCallback(
    (index: number) => {
      const ids = choice ? sectionIds : sectionIds.slice(0, -1)
      const id = ids[index]
      if (id) {
        const el = document.getElementById(id)
        if (el) {
          const section = el.querySelector('section') || el
          section.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
    },
    [choice]
  )

  return (
    <div className="relative" style={{ background: '#0d0818' }}>
      {!isReplayMode && <LoadingScreen onComplete={handleLoad} />}

      {loaded && (
        <>
          <CursorGlow />
          <ParticleField count={40} />

          {started && (
            <ScrollNav
              total={choice ? sectionIds.length : sectionIds.length - 1}
              active={activeSection}
              onNavigate={scrollTo}
            />
          )}

          <div id="sec-landing">
            <LandingSection onEnter={handleStart} />
          </div>

          <AnimatePresence>
            {started && (
              <>
                <div id="sec-timeline">
                  <TimelineSection />
                </div>
                <div id="sec-reveal">
                  <RevealSection />
                </div>
                <div id="sec-gallery">
                  <GallerySection />
                </div>
                <div id="sec-truth">
                  <TruthSection />
                </div>
                <div id="sec-cute">
                  <CuteSection />
                </div>
                <div id="sec-reasons">
                  <ReasonsSection />
                </div>
                <div id="sec-letter">
                  <LetterSection />
                </div>
                <div id="sec-proposal">
                  <ProposalSection onSelect={handleChoice} />
                </div>
                {choice && (
                  <div id="sec-ending">
                    <EndingSection choice={choice} responses={session.responses} />
                  </div>
                )}
              </>
            )}
          </AnimatePresence>

          {/* Dashboard */}
          <AnimatePresence>
            {showDashboard && (
              <Dashboard
                session={session}
                onReset={resetSession}
                onClose={() => setShowDashboard(false)}
              />
            )}
          </AnimatePresence>

          {/* Secret access hint */}
          {started && !showDashboard && (
            <div className="fixed bottom-3 left-3 z-40 opacity-0 hover:opacity-100 transition-opacity duration-500">
              <span className="text-white/10 text-[9px] tracking-wider">
                Ctrl+Shift+D
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default App
