'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { showToast } from './Toast'
import { Shield, UserX, UserCheck } from 'lucide-react'
import { format } from 'date-fns'
import type { Profile } from '@/types'

export default function ManageUsers() {
  const supabase = createClient()
  const { profile: me } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('role')
      .order('full_name')
    if (data) setUsers(data)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const updateRole = async (userId: string, newRole: Profile['role']) => {
    if (userId === me?.id) {
      showToast('Cannot change your own role', 'error')
      return
    }
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    await supabase.from('audit_log').insert({
      user_id: me!.id,
      action: 'user_updated',
      details: { target_user: userId, new_role: newRole },
    })

    showToast('Role updated', 'success')
    fetchUsers()
  }

  const toggleActive = async (user: Profile) => {
    if (user.id === me?.id) {
      showToast('Cannot deactivate yourself', 'error')
      return
    }
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !user.is_active })
      .eq('id', user.id)

    if (error) {
      showToast(error.message, 'error')
      return
    }
    showToast(user.is_active ? 'User deactivated' : 'User activated', 'success')
    fetchUsers()
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} /> Manage Users
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {users.length} registered users
        </p>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th style={{ width: '140px' }}>Role</th>
              <th style={{ width: '100px' }}>Status</th>
              <th style={{ width: '120px' }}>Joined</th>
              <th style={{ width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading...</td></tr>
            ) : (
              users.map(user => (
                <tr key={user.id} style={{ cursor: 'default' }}>
                  <td style={{ fontWeight: 500 }}>
                    {user.full_name}
                    {user.id === me?.id && <span style={{ fontSize: '10px', color: 'var(--accent)', marginLeft: '6px' }}>(you)</span>}
                  </td>
                  <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={e => updateRole(user.id, e.target.value as any)}
                      disabled={user.id === me?.id}
                      style={{ fontSize: '12px', padding: '4px 8px', width: '110px' }}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: user.is_active ? 'var(--success)' : 'var(--danger)',
                    }}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {format(new Date(user.created_at), 'dd MMM yyyy')}
                  </td>
                  <td>
                    {user.id !== me?.id && (
                      <button
                        onClick={() => toggleActive(user)}
                        className={user.is_active ? 'btn btn-danger' : 'btn btn-success'}
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                      >
                        {user.is_active ? <><UserX size={12} /> Deactivate</> : <><UserCheck size={12} /> Activate</>}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
