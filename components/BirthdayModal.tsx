'use client'

import { useEffect, useState, useMemo } from 'react'
import { Modal, Text, Stack, Badge, Group } from '@mantine/core'
import { useAppointmentStore } from '@/store/appointmentStore'
import { IconCake } from '@tabler/icons-react'

export function BirthdayModal() {
  const clients = useAppointmentStore((s) => s.clients)
  const [opened, setOpened] = useState(false)

  const todayBirthdays = useMemo(() => {
    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()

    return clients.filter(c => {
      if (!c.birth_date) return false
      const [y, m, d] = c.birth_date.split('-').map(Number)
      return m === month && d === day
    })
  }, [clients])

  useEffect(() => {
    if (todayBirthdays.length > 0) {
      setOpened(true)
    }
  }, [todayBirthdays.length])

  if (todayBirthdays.length === 0) return null

  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title={
        <Group gap="xs">
          <IconCake size={20} />
          <Text fw={600}>🎂 Cumpleaños de hoy</Text>
        </Group>
      }
      zIndex={9999}
    >
      <Stack gap="sm">
        {todayBirthdays.map(client => (
          <Group key={client.id} justify="space-between">
            <Text fw={500}>{client.name}</Text>
            {client.phone && <Badge variant="light">{client.phone}</Badge>}
          </Group>
        ))}
      </Stack>
    </Modal>
  )
}
