'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, LoadingOverlay, Group, ActionIcon, Button, Text, Image, Drawer, Burger, Alert, Popover } from '@mantine/core'
import { DatePicker, DatesProvider } from '@mantine/dates'
import 'dayjs/locale/es'
import { useMediaQuery } from '@mantine/hooks'
import { Sidebar } from '@/components/Sidebar'
import { useAuthStore } from '@/store/authStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { formatFullLocalDate, addDays } from '@/store/dateUtils'
import dayjs from 'dayjs'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, initialized, sessionExpired, clearSessionExpired } = useAuthStore()
  const { selectedDate, setSelectedDate } = useAppointmentStore()

  const [drawerOpened, setDrawerOpened] = useState(false)
  const [datePickerOpened, setDatePickerOpened] = useState(false)
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
    <DatesProvider settings={{ locale: 'es', firstDayOfWeek: 1 }}>
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
          height: isClient && isMobile ? 40 : 70,
          backgroundColor: '#fff',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          padding: isClient && isMobile ? '0 8px' : '0 12px',
          flexShrink: 0,
          overflow: 'hidden'
        }}
      >
        <Group gap={isClient && isMobile ? "xs" : "sm"}>
          <Image src="/logo.png" w={isClient && isMobile ? 28 : 85} h={isClient && isMobile ? 24 : 68} radius="xl" alt="Logo" style={{overflow:'hidden'}} />
          <Text
            size={isClient && isMobile ? "xl" : "60px"}
            fw={400}
            style={{
              fontFamily: '"Imperial Script", cursive',
              letterSpacing: '1px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.15)'
            }}
          >
            <span style={{ color: '#000', fontSize: '0.7em' }}>Peluquería </span>
            <span style={{ color: 'oklch(71.5% 0.143 215.221)' }}>Krear</span>
          </Text>
        </Group>
        <Box style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Solo mostrar selector de fecha en desktop, en mobile está en AppointmentGrid */}
          {(!isClient || !isMobile) && (
            <Group gap="xs">
              <ActionIcon variant="default" size="sm" onClick={handlePrevDay}>←</ActionIcon>
              <Popover
                opened={datePickerOpened}
                onClose={() => setDatePickerOpened(false)}
                position="bottom"
                shadow="md"
                width={320}
              >
                <Popover.Target>
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    style={{ fontWeight: 500, minWidth: 100 }}
                    onClick={() => setDatePickerOpened((o) => !o)}
                  >
                    {formatFullLocalDate(selectedDate)}
                  </Button>
                </Popover.Target>
                <Popover.Dropdown>
                  <DatePicker
                    value={dayjs(selectedDate).format('YYYY-MM-DD')}
                    onChange={(dateStr) => {
                      if (dateStr) {
                        const [y, m, d] = dateStr.split('-').map(Number)
                        setSelectedDate(new Date(y, m - 1, d))
                        setDatePickerOpened(false)
                      }
                    }}
                  />
                </Popover.Dropdown>
              </Popover>
              <ActionIcon variant="default" size="sm" onClick={handleNextDay}>→</ActionIcon>
              <Button variant="subtle" size="compact-sm" onClick={handleToday}>
                Hoy
              </Button>
            </Group>
          )}
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
    </DatesProvider>
  )
}