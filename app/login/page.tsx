'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Container, Paper, Title, TextInput, PasswordInput, Button, Text, Stack, Alert, Image, Box } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, loading, sessionExpired, clearSessionExpired } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const isMobile = useMediaQuery('(max-width: 500px)')
  const [isClient, setIsClient] = useState(false)

  // Clear sessionExpired flag when on login page
  useEffect(() => {
    if (sessionExpired) {
      clearSessionExpired()
    }
  }, [sessionExpired, clearSessionExpired])

  if (typeof window !== 'undefined' && !isClient) {
    setIsClient(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = await signIn(email, password)

    if (result.error) {
      setError(result.error)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <Container size={420} my={40}>
      <Box ta="center" mb="xl">
        <Image 
          src="/logo.png" 
          w={isClient && isMobile ? 80 : 120} 
          h={isClient && isMobile ? 64 : 96} 
          radius="xl" 
          alt="Logo" 
          mx="auto"
        />
        <Title order={isClient && isMobile ? 3 : 2} mt="sm" style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
          <span style={{ color: '#000' }}>Peluquería </span>
            <span style={{ color: 'oklch(71.5% 0.143 215.221)' }}>Krear</span>
        </Title>
      </Box>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}
            
            <TextInput
              label="Email"
              placeholder="tu@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            
            <PasswordInput
              label="Contraseña"
              placeholder="Tu contraseña"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            
            <Button type="submit" fullWidth loading={loading}>
              Iniciar Sesión
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}