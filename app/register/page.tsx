'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Container, Paper, Title, TextInput, PasswordInput, Button, Text, Anchor, Stack, Alert } from '@mantine/core'
import { useAuthStore } from '@/store/authStore'

export default function RegisterPage() {
  const router = useRouter()
  const { signUp, loading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    
    const result = await signUp(email, password, fullName)
    
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    }
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center">Crear Cuenta</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        ¿Ya tienes cuenta?{' '}
        <Anchor size="sm" href="/login">
          Inicia Sesión
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert color="green" variant="light">
                ¡Cuenta creada! Por favor verifica tu email para continuar.
              </Alert>
            )}
            
            <TextInput
              label="Nombre Completo"
              placeholder="Juan Pérez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            
            <TextInput
              label="Email"
              placeholder="tu@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            
            <PasswordInput
              label="Contraseña"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            
            <Button type="submit" fullWidth loading={loading}>
              Crear Cuenta
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
