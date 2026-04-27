'use client'

import { useEffect, useState } from 'react'
import { Box, Table, TextInput, Button, Group, Title, ActionIcon, Modal, Stack } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { useDisclosure } from '@mantine/hooks'
import { database } from '@/lib/insforge'
import { IconPlus } from '@tabler/icons-react'

interface Client {
  id: string
  name: string
  phone: string | null
  email: string | null
  created_at: string
}

export function ClientsTable() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const isMobile = useMediaQuery('(max-width: 500px)')
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: ''
  })

  const fetchClients = async () => {
    setLoading(true)
    try {
      const { data, error } = await database
        .from('clients')
        .select('*')
        .order('name')
      
      if (!error && data) {
        setClients(data)
      }
    } catch (err) {
      console.error('Error fetching clients:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleOpenNew = () => {
    setEditingClient(null)
    setForm({ name: '', phone: '', email: '' })
    openModal()
  }

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client)
    setForm({
      name: client.name,
      phone: client.phone || '',
      email: client.email || ''
    })
    openModal()
  }

  const handleSave = async () => {
    if (!form.name) return

    try {
      if (editingClient) {
        await database
          .from('clients')
          .update(form)
          .eq('id', editingClient.id)
      } else {
        await database
          .from('clients')
          .insert([form])
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

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nombre</Table.Th>
            <Table.Th>Teléfono</Table.Th>
            {!isClient || !isMobile ? <Table.Th>Email</Table.Th> : null}
            <Table.Th>Acciones</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {clients.map(client => (
            <Table.Tr key={client.id}>
              <Table.Td>{client.name}</Table.Td>
              <Table.Td>{client.phone}</Table.Td>
              {!isClient || !isMobile ? <Table.Td>{client.email}</Table.Td> : null}
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