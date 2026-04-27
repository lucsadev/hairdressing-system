'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, LoadingOverlay, Group, ActionIcon, Button, Text, Image, Drawer, Burger, Alert } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconPlus } from '@tabler/icons-react'
import { Sidebar } from '@/components/Sidebar'
import { useAuthStore } from '@/store/authStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { formatFullLocalDate, formatShortLocalDate, addDays } from '@/store/dateUtils'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, initialized, sessionExpired, clearSessionExpired } = useAuthStore()
  const { selectedDate, setSelectedDate } = useAppointmentStore()

  const [drawerOpened, setDrawerOpened] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const isMobile = useMediaQuery('(max-width: 500px)')

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (initialized && !user) {
      router.push('/login')
    }
  }, [user, initialized, router])

  const handlePrevDay = () => setSelectedDate(addDays(selectedDate, -1))
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1))
  const handleToday = () => {
    const nowArgentina = new Date()
    nowArgentina.setHours(0, 0, 0, 0)
    setSelectedDate(nowArgentina)
  }

  const handleReLogin = () => {
    clearSessionExpired()
    router.push('/login')
  }

  if (!initialized) {
    return <LoadingOverlay visible />
  }

  // Don't render children if no user (will redirect to login)
  if (!user) {
    return (
      <Box style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {sessionExpired && (
          <Alert color="yellow" variant="light" styles={{ root: { margin: '8px' } }}>
            Tu sesión expiró. Por favor, iniciá sesión nuevamente.
            <Button variant="link" color="blue" size="xs" ml="sm" onClick={handleReLogin}>
              Ir a Login
            </Button>
          </Alert>
        )}
        <LoadingOverlay visible />
      </Box>
    )
  }

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {sessionExpired && (
        <Alert color="yellow" variant="light" styles={{ root: { margin: '8px' } }}>
          Tu sesión expiró. Por favor, iniciá sesión nuevamente.
          <Button variant="link" color="blue" size="xs" ml="sm" onClick={handleReLogin}>
            Ir a Login
          </Button>
        </Alert>
      )}
      <Box
        style={{
          height: isClient && isMobile ? 40 : 50,
          backgroundColor: '#fff',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          padding: isClient && isMobile ? '0 8px' : '0 12px',
          flexShrink: 0,
        }}
      >
        <Group gap={isClient && isMobile ? "xs" : "sm"}>
          <Image src="/logo.png" w={isClient && isMobile ? 28 : 85} h={isClient && isMobile ? 24 : 68} radius="xl" alt="Logo" style={{overflow:'hidden'}} />
          <Text size={isClient && isMobile ? "xs" : "lg"} fw={700} style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
            <span style={{ color: '#000' }}>Peluquería </span>
            <span style={{ color: 'oklch(71.5% 0.143 215.221)' }}>Krear</span>
          </Text>
        </Group>
        <Box style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: isClient && isMobile ? 2 : 4 }}>
          <Group gap={isClient && isMobile ? 1 : "xs"}>
            <ActionIcon variant="default" size={isClient && isMobile ? "xs" : "sm"} onClick={handlePrevDay}>←</ActionIcon>
            <Text size={isClient && isMobile ? "xxs" : "sm"} fw={500} style={{ minWidth: isClient && isMobile ? 55 : 100, textAlign: 'center' }}>
              {isClient && isMobile 
                ? formatShortLocalDate(selectedDate)
                : formatFullLocalDate(selectedDate)
              }
            </Text>
            <ActionIcon variant="default" size={isClient && isMobile ? "xs" : "sm"} onClick={handleNextDay}>→</ActionIcon>
            <Button variant="subtle" size={isClient && isMobile ? "xxs" : "xs"} onClick={handleToday}>
              Hoy
            </Button>
          </Group>
        </Box>
      </Box>

      {/* Burger flotante a la izquierda, debajo del header */}
      {isClient && isMobile && (
        <Box style={{ position: 'absolute', left: 8, top: 50, zIndex: 110  }}>
          <Burger opened={drawerOpened} onClick={() => setDrawerOpened(true)} size="sm" />
        </Box>
      )}

      <Box style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Desktop sidebar - mostrar en >= 500px */}
        {isClient && !isMobile && <Sidebar />}
        
        {/* Mobile drawer - mostrar solo en < 500px */}
        {isClient && isMobile && (
          <Drawer
            opened={drawerOpened}
            onClose={() => setDrawerOpened(false)}
            size="xs"
            title="Menú"
            zIndex={1000}
          >
            <Sidebar onNavigate={() => setDrawerOpened(false)} isDrawer />
          </Drawer>
        )}
        
        <Box style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}