'use client'
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/types'

const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000 // 8 hours
const SESSION_KEY = 'dms_session_ts'
const RECOVERY_KEY = 'dms_password_recovery'

interface AuthContextType {
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  isPasswordRecovery: boolean
}

const AuthContext = createContext<AuthContextType>({
  profile: null,
  loading: true,
  signOut: async () => {},
  isPasswordRecovery: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const idleTimerRef = useRef<any>(null)

  const resetIdleTimer = () => {
    sessionStorage.setItem(SESSION_KEY, Date.now().toString())
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(async () => {
      await supabase.auth.signOut()
      router.replace('/login')
    }, SESSION_TIMEOUT_MS)
  }

  useEffect(() => {
    // Check URL hash for recovery token (Supabase appends #access_token=...&type=recovery)
    const hash = window.location.hash
    const isRecoveryFromUrl = hash.includes('type=recovery')

    if (isRecoveryFromUrl) {
      sessionStorage.setItem(RECOVERY_KEY, 'true')
    }

    const recoveryFlag = sessionStorage.getItem(RECOVERY_KEY) === 'true'

    const getProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      // If this is a password recovery flow, skip session timeout checks
      if (recoveryFlag || isRecoveryFromUrl) {
        setIsPasswordRecovery(true)
        setLoading(false)
        return
      }

      // Normal session checks
      const sessionTs = sessionStorage.getItem(SESSION_KEY)

      if (!sessionTs) {
        await supabase.auth.signOut()
        router.replace('/login')
        return
      }

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
        if (event === 'PASSWORD_RECOVERY') {
          sessionStorage.setItem(RECOVERY_KEY, 'true')
          setIsPasswordRecovery(true)
          setLoading(false)
          return
        }
        if (event === 'SIGNED_IN' && session) {
          sessionStorage.setItem(SESSION_KEY, Date.now().toString())
        }
        if (event === 'SIGNED_OUT' || !session) {
          setProfile(null)
          sessionStorage.removeItem(SESSION_KEY)
          sessionStorage.removeItem(RECOVERY_KEY)
          router.replace('/login')
        }
      }
    )

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']
    const handleActivity = () => {
      if (!isPasswordRecovery) resetIdleTimer()
    }
    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity))

    return () => {
      subscription.unsubscribe()
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [])

  const signOut = async () => {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(RECOVERY_KEY)
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <AuthContext.Provider value={{ profile, loading, signOut, isPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
