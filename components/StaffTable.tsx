'use client'

import { useEffect, useState } from 'react'
import { Box, Table, TextInput, Button, Group, Title, ActionIcon, Modal, Stack, Switch } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { useDisclosure } from '@mantine/hooks'
import { database } from '@/lib/insforge'
import { useAppointmentStore } from '@/store/appointmentStore'
import { IconPlus } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

export function StaffTable() {
  const staff = useAppointmentStore((s) => s.staff)
  const storeFetchStaff = useAppointmentStore((s) => s.fetchStaff)
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [editingStaff, setEditingStaff] = useState<typeof staff[number] | null>(null)
  const isMobile = useMediaQuery('(max-width: 500px)')
  const [isClient, setIsClient] = useState(false)
  const [toggling, setToggling] = useState<Set<string>>(new Set())

  useEffect(() => {
    setIsClient(true)
  }, [])

  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    color: '#1971c2'
  })

  useEffect(() => {
    storeFetchStaff()
  }, [storeFetchStaff])

  const handleOpenNew = () => {
    setEditingStaff(null)
    setForm({ name: '', address: '', phone: '', color: '#1971c2' })
    openModal()
  }

  const handleOpenEdit = (member: typeof staff[number]) => {
    setEditingStaff(member)
    setForm({
      name: member.name,
      address: member.address || '',
      phone: member.phone || '',
      color: member.color
    })
    openModal()
  }

  const handleSave = async () => {
    if (!form.name) return

    try {
      if (editingStaff) {
        await database
          .from('staff')
          .update(form)
          .eq('id', editingStaff.id)
      } else {
        await database
          .from('staff')
          .insert([{ ...form, is_active: true }])
      }
      closeModal()
      storeFetchStaff()
    } catch (err) {
      console.error('Error saving staff:', err)
      notifications.show({ title: 'Error', message: 'No se pudo guardar', color: 'red' })
    }
  }

  const handleToggleActive = async (member: typeof staff[number]) => {
    const newActive = !(member.is_active !== false)
    setToggling(prev => new Set(prev).add(member.id))

    try {
      await database
        .from('staff')
        .update({ is_active: newActive })
        .eq('id', member.id)
      storeFetchStaff()
      notifications.show({
        title: newActive ? 'Activado' : 'Desactivado',
        message: `"${member.name}" ${newActive ? 'activado' : 'desactivado'} correctamente`,
        color: newActive ? 'green' : 'gray'
      })
    } catch (err) {
      console.error('Error toggling staff:', err)
      notifications.show({ title: 'Error', message: 'No se pudo cambiar el estado', color: 'red' })
    } finally {
      setToggling(prev => {
        const next = new Set(prev)
        next.delete(member.id)
        return next
      })
    }
  }

  return (
    <Box p="md">
      <Group justify="space-between" mb="md" align="center">
        <Title order={2} style={isClient && isMobile ? { flex: 1, textAlign: 'center' } : {}}>Staff</Title>
        <ActionIcon
          variant="filled"
          color="cyan"
          size="lg"
          onClick={(e) => {
            e.stopPropagation()
            handleOpenNew()
          }}
          title="Agregar nuevo Staff"
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
            {!isClient || !isMobile ? <Table.Th>Teléfono</Table.Th> : null}
            {!isClient || !isMobile ? <Table.Th>Dirección</Table.Th> : null}
            <Table.Th>Activo</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {staff.map(member => {
            const isActive = member.is_active !== false
            return (
              <Table.Tr
                key={member.id}
                style={!isActive ? { opacity: 0.4 } : undefined}
              >
                <Table.Td>
                  <Box style={{ width: 20, height: 20, backgroundColor: member.color, borderRadius: 4 }} />
                </Table.Td>
                <Table.Td>{member.name}</Table.Td>
                {!isClient || !isMobile ? <Table.Td>{member.phone}</Table.Td> : null}
                {!isClient || !isMobile ? <Table.Td>{member.address}</Table.Td> : null}
                <Table.Td>
                  <Switch
                    checked={isActive}
                    onChange={() => handleToggleActive(member)}
                    disabled={toggling.has(member.id)}
                    size="sm"
                  />
                </Table.Td>
                <Table.Td>
                  <ActionIcon variant="subtle" onClick={() => handleOpenEdit(member)}>
                    ✏️
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>

      <Modal opened={modalOpened} onClose={closeModal} title={editingStaff ? 'Editar Staff' : 'Nuevo Staff'} zIndex={1100}>
        <Stack>
          <TextInput
            label="Nombre"
            required
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          />
          <TextInput
            label="Teléfono"
            value={form.phone}
            onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
          />
          <TextInput
            label="Dirección"
            value={form.address}
            onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
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