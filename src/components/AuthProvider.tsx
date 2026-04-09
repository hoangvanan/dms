'use client'
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/types'

const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000 // 8 hours
const SESSION_KEY = 'dms_session_ts'

interface AuthContextType {
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  profile: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const idleTimerRef = useRef<any>(null)

  // Reset idle timer on user activity
  const resetIdleTimer = () => {
    // Update session timestamp
    sessionStorage.setItem(SESSION_KEY, Date.now().toString())

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(async () => {
      // 8 hours idle — force logout
      await supabase.auth.signOut()
      router.replace('/login')
    }, SESSION_TIMEOUT_MS)
  }

  useEffect(() => {
    const getProfile = async () => {
      // Check if session timestamp exists (browser close detection)
      // sessionStorage is cleared when browser/tab closes
      const sessionTs = sessionStorage.getItem(SESSION_KEY)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      // If no sessionStorage timestamp, this is a new browser session — force re-login
      if (!sessionTs) {
        await supabase.auth.signOut()
        router.replace('/login')
        return
      }

      // Check if session has been idle for too long
      const elapsed = Date.now() - parseInt(sessionTs, 10)
      if (elapsed > SESSION_TIMEOUT_MS) {
        await supabase.auth.signOut()
        router.replace('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (data) {
        if (!data.is_active) {
          await supabase.auth.signOut()
          router.replace('/login')
          return
        }
        setProfile(data)
        resetIdleTimer()
      }
      setLoading(false)
    }

    getProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Mark session start in sessionStorage
          sessionStorage.setItem(SESSION_KEY, Date.now().toString())
        }
        if (event === 'SIGNED_OUT' || !session) {
          setProfile(null)
          sessionStorage.removeItem(SESSION_KEY)
          router.replace('/login')
        }
      }
    )

    // Listen for user activity to reset idle timer
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']
    const handleActivity = () => resetIdleTimer()
    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity))

    return () => {
      subscription.unsubscribe()
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [])

  const signOut = async () => {
    sessionStorage.removeItem(SESSION_KEY)
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <AuthContext.Provider value={{ profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
