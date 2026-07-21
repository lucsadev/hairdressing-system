'use client'

import { useEffect, useState } from 'react'
import { Box, Table, TextInput, NumberInput, Button, Group, Title, ActionIcon, Modal, Stack, Switch } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { useDisclosure } from '@mantine/hooks'
import { database } from '@/lib/insforge'
import { useAppointmentStore } from '@/store/appointmentStore'
import { IconPlus } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

type Service = import('@/store/appointmentStore').Service

export function ServicesTable() {
  const services = useAppointmentStore((s) => s.services)
  const storeFetchServices = useAppointmentStore((s) => s.fetchServices)
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const isMobile = useMediaQuery('(max-width: 500px)')
  const [isClient, setIsClient] = useState(false)
  const [toggling, setToggling] = useState<Set<string>>(new Set())

  useEffect(() => {
    setIsClient(true)
  }, [])

  const [form, setForm] = useState({
    name: '',
    color: 'oklch(71.5% 0.143 215.221)',
    duration_minutes: 30,
    cash: 0,
    card: 0
  })

  useEffect(() => {
    storeFetchServices()
  }, [storeFetchServices])

  const handleOpenNew = () => {
    setEditingService(null)
    setForm({ name: '', color: '#1971c2', duration_minutes: 30, cash: 0, card: 0 })
    openModal()
  }

  const handleOpenEdit = (service: Service) => {
    setEditingService(service)
    setForm({
      name: service.name,
      color: service.color,
      duration_minutes: service.duration_minutes,
      cash: service.cash,
      card: service.card
    })
    openModal()
  }

  const handleSave = async () => {
    if (!form.name) return

    try {
      if (editingService) {
        await database
          .from('services')
          .update(form)
          .eq('id', editingService.id)
      } else {
        await database
          .from('services')
          .insert([{ ...form, is_active: true }])
      }
      closeModal()
      storeFetchServices()
    } catch (err) {
      console.error('Error saving service:', err)
      notifications.show({ title: 'Error', message: 'No se pudo guardar el servicio', color: 'red' })
    }
  }

  const handleToggleActive = async (service: Service) => {
    const newActive = !(service.is_active !== false)
    setToggling(prev => new Set(prev).add(service.id))

    try {
      await database
        .from('services')
        .update({ is_active: newActive })
        .eq('id', service.id)
      storeFetchServices()
      notifications.show({
        title: newActive ? 'Activado' : 'Desactivado',
        message: `"${service.name}" ${newActive ? 'activado' : 'desactivado'} correctamente`,
        color: newActive ? 'green' : 'gray'
      })
    } catch (err) {
      console.error('Error toggling service:', err)
      notifications.show({ title: 'Error', message: 'No se pudo cambiar el estado', color: 'red' })
    } finally {
      setToggling(prev => {
        const next = new Set(prev)
        next.delete(service.id)
        return next
      })
    }
  }

  return (
    <Box p="md">
      <Group justify="space-between" mb="md" align="center">
        <Title order={2} style={isClient && isMobile ? { flex: 1, textAlign: 'center' } : {}}>Servicios</Title>
        <ActionIcon
          variant="filled"
          color="cyan"
          size="lg"
          onClick={(e) => {
            e.stopPropagation()
            handleOpenNew()
          }}
          title="Nuevo servicio"
          style={{ opacity: 0.5 }}
        >
          <IconPlus size={16} />
        </ActionIcon>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Color</Table.Th>
            <Table.Th>Nombre</Table.Th>
            <Table.Th>Efectivo</Table.Th>
            {!isClient || !isMobile ? <Table.Th>Duración</Table.Th> : null}
            {!isClient || !isMobile ? <Table.Th>Tarjeta</Table.Th> : null}
            <Table.Th>Activo</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {services.map(service => {
            const isActive = service.is_active !== false
            return (
              <Table.Tr
                key={service.id}
                style={!isActive ? { opacity: 0.4 } : undefined}
              >
                <Table.Td>
                  <Box style={{ width: 20, height: 20, backgroundColor: service.color, borderRadius: 4 }} />
                </Table.Td>
                <Table.Td>{service.name}</Table.Td>
                <Table.Td>${service.cash?.toLocaleString() || 0}</Table.Td>
                {!isClient || !isMobile ? <Table.Td>{service.duration_minutes} min</Table.Td> : null}
                {!isClient || !isMobile ? <Table.Td>${service.card?.toLocaleString() || 0}</Table.Td> : null}
                <Table.Td>
                  <Switch
                    checked={isActive}
                    onChange={() => handleToggleActive(service)}
                    disabled={toggling.has(service.id)}
                    size="sm"
                  />
                </Table.Td>
                <Table.Td>
                  <ActionIcon variant="subtle" onClick={() => handleOpenEdit(service)}>
                    ✏️
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>

      <Modal opened={modalOpened} onClose={closeModal} title={editingService ? 'Editar Servicio' : 'Nuevo Servicio'} zIndex={1100}>
        <Stack>
          <TextInput
            label="Nombre"
            required
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          />
          <TextInput
            label="Color"
            value={form.color}
            onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
            placeholder="#1971c2"
            rightSection={
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                style={{ width: 28, height: 28, padding: 0, border: 'none', cursor: 'pointer', background: 'none' }}
              />
            }
          />
          <NumberInput
            label="Duración (minutos)"
            value={form.duration_minutes}
            onChange={(value) => setForm(prev => ({ ...prev, duration_minutes: Number(value) }))}
          />
          <NumberInput
            label="Efectivo"
            value={form.cash}
            onChange={(value) => setForm(prev => ({ ...prev, cash: Number(value) }))}
          />
          <NumberInput
            label="Tarjeta/transferencia"
            value={form.card}
            onChange={(value) => setForm(prev => ({ ...prev, card: Number(value) }))}
          />
          <Group grow>
            <Button variant="outline" style={{ opacity: 0.5 }} onClick={closeModal}>
              Cancelar
            </Button>
            <Button style={{ opacity: 0.5 }} onClick={handleSave}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}