'use client'

import { Box } from '@mantine/core'
import { ClientsTable } from '@/components/ClientsTable'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function ClientsPage() {
  return (
    <ProtectedRoute redirectTo="/login">
      <Box>
        <ClientsTable />
      </Box>
    </ProtectedRoute>
  )
}