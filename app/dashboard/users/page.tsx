'use client'

import { Box } from '@mantine/core'
import { UsuariosTable } from '@/components/UsuariosTable'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function UsuariosPage() {
  return (
    <ProtectedRoute redirectTo="/login">
      <Box>
        <UsuariosTable />
      </Box>
    </ProtectedRoute>
  )
}