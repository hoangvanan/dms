'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/types'

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

  useEffect(() => {
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

      // Password recovery flow — show reset form instead of dashboard
      if (recoveryFlag || isRecoveryFromUrl) {
        setIsPasswordRecovery(true)
        setLoading(false)
        return
      }

      // Normal flow — load profile and check is_active
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
        if (event === 'SIGNED_OUT' || !session) {
          setProfile(null)
          sessionStorage.removeItem(RECOVERY_KEY)
          router.replace('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
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
