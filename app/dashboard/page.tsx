'use client'

import { Box } from '@mantine/core'
import { AppointmentGrid } from '@/components/AppointmentGrid'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function DashboardPage() {
  return (
    <ProtectedRoute redirectTo="/login">
      <Box>
        <AppointmentGrid />
      </Box>
    </ProtectedRoute>
  )
}