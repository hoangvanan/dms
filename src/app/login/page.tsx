'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { FileText, LogIn, UserPlus } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        })
        if (error) throw error
        setSuccess('Account created! Please check your email to confirm, then log in.')
        setIsSignUp(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
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
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
            DMS
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Document Management System
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div style={{ marginBottom: '16px' }}>
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Nguyen Van A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label>Email</label>
            <input
              type="email"
              placeholder="your.name@unominda.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.3)',
              color: 'var(--danger)',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.3)',
              color: 'var(--success)',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '10px', fontSize: '14px' }}
          >
            {loading ? 'Please wait...' : (
              <>
                {isSignUp ? <UserPlus size={16} /> : <LogIn size={16} />}
                {isSignUp ? 'Create Account' : 'Sign In'}
              </>
            )}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '13px',
          color: 'var(--text-secondary)',
        }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess('') }}
            style={{ color: 'var(--accent)', cursor: 'pointer' }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </span>
        </div>
      </div>
    </div>
  )
}
