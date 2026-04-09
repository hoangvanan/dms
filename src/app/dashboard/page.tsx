'use client'
import { useState } from 'react'
import { AuthProvider, useAuth } from '@/components/AuthProvider'
import { ToastContainer, showToast } from '@/components/Toast'
import Sidebar from '@/components/Sidebar'
import DocumentList from '@/components/DocumentList'
import BrowseByCategory from '@/components/BrowseByCategory'
import BrowseByProject from '@/components/BrowseByProject'
import ManageUsers from '@/components/ManageUsers'
import ManageCategories from '@/components/ManageCategories'
import AuditLogView from '@/components/AuditLog'
import { createClient } from '@/lib/supabase'
import { KeyRound, FileText } from 'lucide-react'

function PasswordResetForm() {
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const validate = (pw: string): string | null => {
    if (pw.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter'
    if (!/[0-9]/.test(pw)) return 'Password must contain at least one number'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    const pwError = validate(password)
    if (pwError) {
      setError(pwError)
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      // Clear recovery flag and redirect
      sessionStorage.removeItem('dms_password_recovery')
      showToast('Password updated successfully!', 'success')

      // Wait briefly so toast is visible, then reload to normal dashboard
      setTimeout(() => {
        sessionStorage.setItem('dms_session_ts', Date.now().toString())
        window.location.href = '/dashboard'
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
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
            <KeyRound size={28} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Set New Password</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label>New Password</label>
            <input type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label>Confirm Password</label>
            <input type="password" placeholder="••••••••" value={confirm}
              onChange={e => setConfirm(e.target.value)} required minLength={8} />
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Min 8 characters, at least 1 uppercase letter and 1 number
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px',
              background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
              color: 'var(--danger)', fontSize: '13px', marginBottom: '16px',
            }}>{error}</div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', padding: '10px', fontSize: '14px' }}>
            <KeyRound size={16} />
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

function DashboardContent() {
  const { isPasswordRecovery } = useAuth()
  const [activeTab, setActiveTab] = useState('documents')

  if (isPasswordRecovery) {
    return <PasswordResetForm />
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'documents':
        return <DocumentList />
      case 'by-category':
        return <BrowseByCategory />
      case 'by-project':
        return <BrowseByProject />
      case 'users':
        return <ManageUsers />
      case 'categories':
        return <ManageCategories />
      case 'audit':
        return <AuditLogView />
      default:
        return <DocumentList />
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      {renderContent()}
      <ToastContainer />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardContent />
      <ToastContainer />
    </AuthProvider>
  )
}
