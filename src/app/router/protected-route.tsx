import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getAuthToken } from '../../lib/api-client'
import { getCurrentUser } from '../../features/auth/services/auth-service'

type ProtectedRouteProps = {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [state, setState] = useState<'checking' | 'authed' | 'guest'>(() =>
    getAuthToken() ? 'checking' : 'guest',
  )

  useEffect(() => {
    if (!getAuthToken()) return

    let isActive = true
    getCurrentUser()
      .then(() => {
        if (isActive) setState('authed')
      })
      .catch(() => {
        window.localStorage.removeItem('seenspace-auth-token')
        if (isActive) setState('guest')
      })

    return () => {
      isActive = false
    }
  }, [])

  if (state === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-sm text-[var(--text-secondary)]">
        正在进入工作区...
      </div>
    )
  }

  if (state === 'guest') {
    return <Navigate to="/login" replace />
  }

  return children
}
