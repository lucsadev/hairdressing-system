'use client'

import { Box } from '@mantine/core'
import { StaffTable } from '@/components/StaffTable'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function StaffPage() {
  return (
    <ProtectedRoute redirectTo="/login">
      <Box>
        <StaffTable />
      </Box>
    </ProtectedRoute>
  )
}