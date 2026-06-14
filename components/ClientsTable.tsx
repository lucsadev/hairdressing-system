'use client'

import { useState, useEffect, useMemo } from 'react'
import { Box, Table, TextInput, Button, Group, Title, ActionIcon, Modal, Stack } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMediaQuery } from '@mantine/hooks'
import { useDisclosure } from '@mantine/hooks'
import { database } from '@/lib/insforge'
import { IconPlus, IconSearch } from '@tabler/icons-react'
import { useAppointmentStore, Client } from '@/store/appointmentStore'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

export function ClientsTable() {
  const clients = useAppointmentStore((s) => s.clients)
  const fetchClients = useAppointmentStore((s) => s.fetchClients)
  const [loading, setLoading] = useState(true)
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const isMobile = useMediaQuery('(max-width: 500px)')
  const [isClient, setIsClient] = useState(false)
  const [search, setSearch] = useState('')
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    birth_date: ''
  })

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter(c => c.name.toLowerCase().includes(q))
  }, [clients, search])

  useEffect(() => {
    fetchClients().then(() => setLoading(false))
  }, [fetchClients])

  const handleOpenNew = () => {
    setEditingClient(null)
    setForm({ name: '', phone: '', email: '', birth_date: '' })
    openModal()
  }

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client)
    setForm({
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
      birth_date: client.birth_date || ''
    })
    openModal()
  }

  const handleSave = async () => {
    const name = form.name.trim().toUpperCase()
    if (!name) return

    const duplicate = clients.find(c => c.name === name && (!editingClient || c.id !== editingClient.id))
    if (duplicate) {
      notifications.show({ color: 'red', title: 'Error', message: `Ya existe un cliente con el nombre "${name}"` })
      return
    }

    try {
      if (editingClient) {
        await database
          .from('clients')
          .update({ ...form, name })
          .eq('id', editingClient.id)
      } else {
        await database
          .from('clients')
          .insert([{ ...form, name }])
      }
      closeModal()
      fetchClients()
    } catch (err) {
      console.error('Error saving client:', err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await database
        .from('clients')
        .delete()
        .eq('id', id)
      fetchClients()
    } catch (err) {
      console.error('Error deleting client:', err)
    }
  }

  return (
    <Box p="md">
      <Group justify="space-between" mb="md" align="center">
        <Title order={2} style={isClient && isMobile ? { flex: 1, textAlign: 'center' } : {}}>Clientes</Title>
        <ActionIcon
                variant="filled"
                color="cyan"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenNew();
                }}
                title="Agregar nuevo Staff"
                style={{ opacity: 0.5}}
              >
                <IconPlus size={16} />
              </ActionIcon>
      </Group>

      <TextInput
        placeholder="Buscar cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftSection={<IconSearch size={16} />}
        mb="sm"
      />

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nombre</Table.Th>
            <Table.Th>Teléfono</Table.Th>
            {!isClient || !isMobile ? <Table.Th>Email</Table.Th> : null}
            {!isClient || !isMobile ? <Table.Th>Cumpleaños</Table.Th> : null}
            <Table.Th>Acciones</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {filteredClients.map(client => (
            <Table.Tr key={client.id}>
              <Table.Td>{client.name}</Table.Td>
              <Table.Td>{client.phone}</Table.Td>
              {!isClient || !isMobile ? <Table.Td>{client.email}</Table.Td> : null}
              {!isClient || !isMobile ? <Table.Td>{client.birth_date ? dayjs(client.birth_date).locale('es').format('D [de] MMMM').replace(/de ([a-z])/, (_, l) => 'de ' + l.toUpperCase()) : '-'}</Table.Td> : null}
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="subtle" onClick={() => handleOpenEdit(client)}>
                    ✏️
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(client.id)}>
                    🗑️
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={modalOpened} onClose={closeModal} title={editingClient ? 'Editar Cliente' : 'Nuevo Cliente'} zIndex={1100}>
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
            label="Email"
            value={form.email}
            onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
          />
          <TextInput
            label="Cumpleaños"
            type="date"
            value={form.birth_date}
            onChange={(e) => setForm(prev => ({ ...prev, birth_date: e.target.value }))}
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