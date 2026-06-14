'use client'

import { useEffect, useState } from 'react'
import { Box, Table, Button, Group, Title, Text, ActionIcon, Modal, Stack, TextInput, SegmentedControl } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMediaQuery } from '@mantine/hooks'
import { useDisclosure } from '@mantine/hooks'
import { database, auth } from '@/lib/insforge'
import { IconPlus } from '@tabler/icons-react'

interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: 'ADMIN' | 'USER'
}

export function UsuariosTable() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const isMobile = useMediaQuery('(max-width: 500px)')
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    password: '',
    role: 'USER' as 'ADMIN' | 'USER'
  })

  const fetchProfiles = async () => {
    setLoading(true)
    try {
      const { data, error } = await database
        .from('profiles')
        .select('id, email, full_name, phone, role')
        .order('email')
      
      if (!error && data) {
        setProfiles(data)
      }
    } catch (err) {
      console.error('Error fetching profiles:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [])

  const handleOpenNew = () => {
    setForm({ nombre: '', telefono: '', email: '', password: '', role: 'USER' })
    openModal()
  }

  const handleSave = async () => {
    if (!form.email || !form.password) return

    try {
      // Step 1: Create user in Auth
      const { data: authData, error: authError } = await auth.signUp({
        email: form.email,
        password: form.password
      })

      if (authError) {
        console.error('Error creating auth user:', authError)
        notifications.show({ color: 'red', title: 'Error', message: authError.message })
        return
      }

      if (!authData?.user) {
        console.error('Error creating auth user: no user returned')
        notifications.show({ color: 'red', title: 'Error', message: 'No se pudo crear el usuario' })
        return
      }

      // Step 2: Insert profile with auth user id
      const { error: profileError } = await database
        .from('profiles')
        .insert([{
          id: authData.user.id,
          email: form.email,
          full_name: form.nombre || null,
          phone: form.telefono || null,
          role: form.role
        }])

      if (profileError) {
        console.error('Error creating profile:', profileError)
        notifications.show({ color: 'red', title: 'Error', message: profileError.message })
        return
      }

      closeModal()
      notifications.show({ color: 'green', title: 'Éxito', message: 'Usuario creado correctamente' })
      fetchProfiles()
    } catch (err: any) {
      console.error('Error saving:', err)
      notifications.show({ color: 'red', title: 'Error', message: err.message })
    }
  }

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return
    const id = deleteConfirmId
    setDeleteConfirmId(null)
    
    try {
      await database
        .from('profiles')
        .delete()
        .eq('id', id)
      notifications.show({ color: 'green', title: 'Éxito', message: 'Usuario eliminado' })
      fetchProfiles()
    } catch (err) {
      console.error('Error deleting profile:', err)
      notifications.show({ color: 'red', title: 'Error', message: 'No se pudo eliminar el usuario' })
    }
  }

  return (
    <Box p="md">
      <Group justify="space-between" mb="md" align="center">
        <Title order={2} style={isClient && isMobile ? { flex: 1, textAlign: 'center' } : {}}>Usuarios</Title>
        <ActionIcon
                variant="filled"
                color="cyan"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenNew();
                }}
                title="Agregar cliente nuevo"
                style={{ opacity: 0.5}}
              >
                <IconPlus size={16} />
              </ActionIcon>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Email</Table.Th>
            <Table.Th>Nombre</Table.Th>
            {!isClient || !isMobile ? <Table.Th>Teléfono</Table.Th> : null}
            <Table.Th>Rol</Table.Th>
            <Table.Th>Acciones</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {profiles.map(profile => (
            <Table.Tr key={profile.id}>
              <Table.Td>{profile.email}</Table.Td>
              <Table.Td>{profile.full_name || '-'}</Table.Td>
              {!isClient || !isMobile ? <Table.Td>{profile.phone || '-'}</Table.Td> : null}
              <Table.Td>
                <Text size="sm" c={profile.role === 'ADMIN' ? 'red' : 'blue'} fw={500}>
                  {profile.role}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteClick(profile.id)}>
                    🗑️
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={modalOpened} onClose={closeModal} title="Nuevo Usuario" zIndex={1100}>
        <Stack>
          <TextInput
            label="Nombre"
            value={form.nombre}
            onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
          />
          <TextInput
            label="Teléfono"
            value={form.telefono}
            onChange={(e) => setForm(prev => ({ ...prev, telefono: e.target.value }))}
          />
          <TextInput
            label="Email"
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
          />
          <TextInput
            label="Contraseña"
            required
            type="password"
            value={form.password}
            onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
          />
          <Box>
            <Text size="sm" fw={500} mb={4}>Rol</Text>
            <SegmentedControl
              data={[
                { label: 'Usuario', value: 'USER' },
                { label: 'Administrador', value: 'ADMIN' }
              ]}
              value={form.role}
              onChange={(value) => setForm(prev => ({ ...prev, role: (value as 'ADMIN' | 'USER') }))}
              fullWidth
            />
          </Box>
          <Group grow>
            <Button variant="outline" style={{ opacity: 0.5 }} onClick={closeModal}>
              Cancelar
            </Button>
            <Button style={{ opacity: 0.5 }} onClick={handleSave}>
              Crear
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Confirmar eliminación" zIndex={1100}>
        <Text size="sm" mb="md">¿Estás seguro de que querés eliminar este usuario?</Text>
        <Group justify="flex-end">
          <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
          <Button color="red" onClick={handleDeleteConfirm}>Eliminar</Button>
        </Group>
      </Modal>
    </Box>
  )
}