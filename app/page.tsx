'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingOverlay } from '@mantine/core'
import { useAuthStore } from '@/store/authStore'

export default function Home() {
  const router = useRouter()
  const { user, initialized } = useAuthStore()

  useEffect(() => {
    if (initialized) {
      if (user) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }
  }, [user, initialized, router])

  if (!initialized) {
    return <LoadingOverlay visible />
  }

  return null
}