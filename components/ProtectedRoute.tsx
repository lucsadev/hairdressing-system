'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { LoadingOverlay } from '@mantine/core'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

// Routes that require ADMIN role
const ADMIN_ROUTES = [
  '/dashboard/users',
  '/dashboard/staff',
  '/dashboard/services',
  '/dashboard/cash-register',
  '/dashboard/cash-history',
  '/dashboard/suppliers',
  '/dashboard/orders'
]

export function ProtectedRoute({ 
  children, 
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, initAuth } = useAuthStore()

  // Initialize auth on mount
  useEffect(() => {
    initAuth()
  }, [])

  // Check access
  useEffect(() => {
    if (!user) return

    const routeRequiresAdmin = ADMIN_ROUTES.includes(pathname)

    if (routeRequiresAdmin && user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [user, pathname])

  if (!user) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <LoadingOverlay visible={true} />
      </div>
    )
  }

  return <>{children}</>
}