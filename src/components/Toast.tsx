'use client'
import { useEffect, useState } from 'react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

let toastId = 0
let addToastFn: ((message: string, type: Toast['type']) => void) | null = null

export function showToast(message: string, type: Toast['type'] = 'info') {
  if (addToastFn) addToastFn(message, type)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    addToastFn = (message, type) => {
      const id = ++toastId
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 4000)
    }
    return () => { addToastFn = null }
  }, [])

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
      ))}
    </div>
  )
}
