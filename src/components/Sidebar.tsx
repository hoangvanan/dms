'use client'
import { useAuth } from './AuthProvider'
import {
  FileText, FolderOpen, Settings, Users, ClipboardList,
  LogOut, LayoutGrid, ChevronRight, Shield,
  BookOpen, Package, Building2, Globe
} from 'lucide-react'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { profile, signOut } = useAuth()

  const isEditorOrAdmin = profile?.role === 'admin' || profile?.role === 'editor'
  const isAdmin = profile?.role === 'admin'

  const navItems = [
    { id: 'documents', label: 'All Documents', icon: FileText },
    { id: 'by-category', label: 'By Category', icon: FolderOpen },
    { id: 'by-project', label: 'By Project', icon: LayoutGrid },
  ]

  const specItems = [
    { id: 'specifications', label: 'Specifications', icon: BookOpen, show: true },
    { id: 'spec-products', label: 'Products', icon: Package, show: isAdmin },
    { id: 'spec-customers', label: 'Customers', icon: Building2, show: isAdmin },
    { id: 'spec-market-configs', label: 'Market Configs', icon: Globe, show: isAdmin },
  ].filter(item => item.show)

  const adminItems = [
    { id: 'users', label: 'Manage Users', icon: Users },
    { id: 'categories', label: 'Categories & Groups', icon: Settings },
    { id: 'audit', label: 'Audit Log', icon: ClipboardList },
  ]

  const renderNavButton = (item: { id: string; label: string; icon: any }) => (
    <button
      key={item.id}
      onClick={() => onTabChange(item.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '8px 12px',
        borderRadius: '8px',
        border: 'none',
        background: activeTab === item.id ? 'rgba(79,143,247,0.12)' : 'transparent',
        color: activeTab === item.id ? 'var(--accent)' : 'var(--text-primary)',
        fontSize: '13px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
        marginBottom: '2px',
      }}
    >
      <item.icon size={16} />
      {item.label}
      {activeTab === item.id && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
    </button>
  )

  const renderSectionLabel = (label: string, paddingTop = '20px') => (
    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', padding: `${paddingTop} 12px 4px` }}>
      {label}
    </div>
  )

  return (
    <div style={{
      width: '240px',
      minWidth: '240px',
      height: '100vh',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'rgba(79,143,247,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <FileText size={20} color="var(--accent)" />
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>DMS</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Document Management</div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
        {renderSectionLabel('Documents', '8px')}
        {navItems.map(renderNavButton)}

        {isEditorOrAdmin && (
          <>
            {renderSectionLabel('Specifications')}
            {specItems.map(renderNavButton)}
          </>
        )}

        {isAdmin && (
          <>
            {renderSectionLabel('Administration')}
            {adminItems.map(renderNavButton)}
          </>
        )}
      </div>

      {/* User info + logout */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'var(--bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 600,
          }}>
            {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.full_name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={10} color="var(--text-secondary)" />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                {profile?.role}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={signOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            width: '100%',
            padding: '7px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
