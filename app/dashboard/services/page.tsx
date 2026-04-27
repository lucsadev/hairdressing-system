'use client'

import { Box } from '@mantine/core'
import { ServicesTable } from '@/components/ServicesTable'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function ServicesPage() {
  return (
    <ProtectedRoute redirectTo="/login">
      <Box>
        <ServicesTable />
      </Box>
    </ProtectedRoute>
  )
}