'use client'
import { useState } from 'react'
import { AuthProvider } from '@/components/AuthProvider'
import { ToastContainer } from '@/components/Toast'
import Sidebar from '@/components/Sidebar'
import DocumentList from '@/components/DocumentList'
import BrowseByCategory from '@/components/BrowseByCategory'
import BrowseByProject from '@/components/BrowseByProject'
import ManageUsers from '@/components/ManageUsers'
import ManageCategories from '@/components/ManageCategories'
import AuditLogView from '@/components/AuditLog'

function DashboardContent() {
  const [activeTab, setActiveTab] = useState('documents')

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
    </AuthProvider>
  )
}
