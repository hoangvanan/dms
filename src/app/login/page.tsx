'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { FileText, LogIn, UserPlus, KeyRound, ArrowLeft } from 'lucide-react'

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter'
  if (!/[0-9]/.test(pw)) return 'Password must contain at least one number'
  return null
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const switchMode = (m: 'login' | 'signup' | 'forgot') => {
    setMode(m)
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!email.endsWith('@unominda.com')) {
      setError('Only @unominda.com email addresses are allowed.')
      setLoading(false)
      return
    }

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/dashboard`,
        })
        if (error) throw error
        setSuccess('Password reset email sent! Check your inbox (and spam folder).')
        setLoading(false)
        return
      }

      if (mode === 'signup') {
        const pwError = validatePassword(password)
        if (pwError) {
          setError(pwError)
          setLoading(false)
          return
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        })
        if (error) throw error
        setSuccess('Account created! Please wait for admin approval before you can access the system.')
        setMode('login')
      } else {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        // Check if user is approved (is_active)
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', data.user.id)
          .single()

        if (profile && !profile.is_active) {
          await supabase.auth.signOut()
          setError('Your account is pending approval. Please contact your administrator.')
          setLoading(false)
          return
        }

        router.replace('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '40px 32px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'rgba(79,143,247,0.15)',
            marginBottom: '16px',
          }}>
            <FileText size={28} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>DMS</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {mode === 'forgot' ? 'Reset your password' : 'Document Management System'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div style={{ marginBottom: '16px' }}>
              <label>Full Name</label>
              <input type="text" placeholder="Nguyen Van A" value={fullName}
                onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label>Email</label>
            <input type="email" placeholder="your.name@unominda.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>

          {mode !== 'forgot' && (
            <div style={{ marginBottom: mode === 'signup' ? '8px' : '16px' }}>
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={password}
                onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
          )}

          {mode === 'signup' && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Min 8 characters, at least 1 uppercase letter and 1 number
            </div>
          )}

          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginBottom: '16px', marginTop: '-8px' }}>
              <span onClick={() => switchMode('forgot')}
                style={{ fontSize: '12px', color: 'var(--accent)', cursor: 'pointer' }}>
                Forgot password?
              </span>
            </div>
          )}

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px',
              background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
              color: 'var(--danger)', fontSize: '13px', marginBottom: '16px',
            }}>{error}</div>
          )}

          {success && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px',
              background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
              color: 'var(--success)', fontSize: '13px', marginBottom: '16px',
            }}>{success}</div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', padding: '10px', fontSize: '14px' }}>
            {loading ? 'Please wait...' : (
              <>
                {mode === 'signup' && <><UserPlus size={16} /> Create Account</>}
                {mode === 'login' && <><LogIn size={16} /> Sign In</>}
                {mode === 'forgot' && <><KeyRound size={16} /> Send Reset Link</>}
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {mode === 'login' && (
            <>Don&apos;t have an account?{' '}
              <span onClick={() => switchMode('signup')} style={{ color: 'var(--accent)', cursor: 'pointer' }}>Sign Up</span>
            </>
          )}
          {mode === 'signup' && (
            <>Already have an account?{' '}
              <span onClick={() => switchMode('login')} style={{ color: 'var(--accent)', cursor: 'pointer' }}>Sign In</span>
            </>
          )}
          {mode === 'forgot' && (
            <span onClick={() => switchMode('login')}
              style={{ color: 'var(--accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ArrowLeft size={14} /> Back to Sign In
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
