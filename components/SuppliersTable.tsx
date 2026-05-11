'use client'

import { useEffect, useState } from 'react'
import { Box, Table, TextInput, Button, Group, Title, ActionIcon, Modal, Stack, Text, Select, NumberInput, Checkbox, Textarea } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { useDisclosure } from '@mantine/hooks'
import { database } from '@/lib/insforge'
import { IconPlus } from '@tabler/icons-react'

interface Supplier {
  id: string
  name: string
  phone: string | null
  address: string | null
  balance: number
  created_at: string
}

interface Order {
  id: string
  supplier_id: string
  description: string
  amount: number
  payment_method: 'cash' | 'card' | 'transfer' | null
  status: 'pending' | 'paid' | 'cancelled'
  pay: boolean
  created_at: string
}

export function SuppliersTable() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [ordersModalOpened, { open: openOrdersModal, close: closeOrdersModal }] = useDisclosure(false)
  const isMobile = useMediaQuery('(max-width: 500px)')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    balance: 0
  })

  const [orderForm, setOrderForm] = useState({
    description: '',
    amount: 0,
    payment_method: 'cash' as 'cash' | 'card' | 'transfer',
    status: 'pending' as 'pending' | 'paid' | 'cancelled',
    pay: false
  })

  const fetchSuppliers = async () => {
    setLoading(true)
    console.log('[SuppliersTable] Fetching suppliers from DB...')
    try {
      const { data, error } = await database
        .from('suppliers')
        .select('*')
        .order('name')

      console.log('[SuppliersTable] Result:', { data, error })
      if (error) {
        console.error('[SuppliersTable] Error:', error)
      }
      if (!error && data) {
        setSuppliers(data)
      }
    } catch (err) {
      console.error('[SuppliersTable] Exception:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async (supplierId: string) => {
    try {
      const { data, error } = await database
        .from('orders')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setOrders(data)
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const handleOpenNew = () => {
    setEditingSupplier(null)
    setForm({ name: '', phone: '', address: '', balance: 0 })
    openModal()
  }

  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setForm({
      name: supplier.name,
      phone: supplier.phone || '',
      address: supplier.address || '',
      balance: supplier.balance
    })
    openModal()
  }

  const handleOpenOrders = async (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    await fetchOrders(supplier.id)
    openOrdersModal()
  }

  const handleSave = async () => {
    if (!form.name) return

    try {
      if (editingSupplier) {
        await database
          .from('suppliers')
          .update(form)
          .eq('id', editingSupplier.id)
      } else {
        await database
          .from('suppliers')
          .insert([form])
      }
      closeModal()
      fetchSuppliers()
    } catch (err) {
      console.error('Error saving supplier:', err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await database
        .from('suppliers')
        .delete()
        .eq('id', id)
      fetchSuppliers()
    } catch (err) {
      console.error('Error deleting supplier:', err)
    }
  }

  const handleSaveOrder = async () => {
    if (!orderForm.description || !selectedSupplier) return

    try {
      await database
        .from('orders')
        .insert([{
          supplier_id: selectedSupplier.id,
          description: orderForm.description,
          amount: orderForm.amount,
          payment_method: orderForm.payment_method,
          status: orderForm.status,
          pay: orderForm.pay
        }])

      // Update supplier balance
      const balanceChange = orderForm.status === 'paid' && orderForm.pay ? orderForm.amount : 0
      await database
        .from('suppliers')
        .update({ balance: selectedSupplier.balance + balanceChange })
        .eq('id', selectedSupplier.id)

      setOrderForm({ description: '', amount: 0, payment_method: 'cash', status: 'pending', pay: false })
      await fetchOrders(selectedSupplier.id)
      fetchSuppliers()
    } catch (err) {
      console.error('Error saving order:', err)
    }
  }

  const handleDeleteOrder = async (order: Order) => {
    try {
      await database
        .from('orders')
        .delete()
        .eq('id', order.id)

      // Update supplier balance if order was paid
      if (selectedSupplier && order.status === 'paid' && order.pay) {
        await database
          .from('suppliers')
          .update({ balance: selectedSupplier.balance - order.amount })
          .eq('id', selectedSupplier.id)
      }

      if (selectedSupplier) {
        await fetchOrders(selectedSupplier.id)
        fetchSuppliers()
      }
    } catch (err) {
      console.error('Error deleting order:', err)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
  }

  return (
    <Box p="md">
      <Group justify="space-between" mb="md" align="center">
        <Title order={2} style={isClient && isMobile ? { flex: 1, textAlign: 'center' } : {}}>Proveedores</Title>
        <ActionIcon
          variant="filled"
          color="cyan"
          size="lg"
          onClick={(e) => {
            e.stopPropagation()
            handleOpenNew()
          }}
          title="Agregar nuevo Proveedor"
          style={{ opacity: 0.5 }}
        >
          <IconPlus size={16} />
        </ActionIcon>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nombre</Table.Th>
            <Table.Th>Teléfono</Table.Th>
            {!isClient || !isMobile ? <Table.Th>Dirección</Table.Th> : null}
            <Table.Th>Saldo</Table.Th>
            <Table.Th>Acciones</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {suppliers.map(supplier => (
            <Table.Tr key={supplier.id}>
              <Table.Td>{supplier.name}</Table.Td>
              <Table.Td>{supplier.phone}</Table.Td>
              {!isClient || !isMobile ? <Table.Td>{supplier.address}</Table.Td> : null}
              <Table.Td>{formatCurrency(supplier.balance)}</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="subtle" onClick={() => handleOpenOrders(supplier)} title="Ver Pedidos">
                    📦
                  </ActionIcon>
                  <ActionIcon variant="subtle" onClick={() => handleOpenEdit(supplier)}>
                    ✏️
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(supplier.id)}>
                    🗑️
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={modalOpened} onClose={closeModal} title={editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'} zIndex={1100}>
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
          <NumberInput
            label="Saldo"
            value={form.balance}
            onChange={(val) => setForm(prev => ({ ...prev, balance: Number(val) || 0 }))}
            decimalScale={2}
            prefix="$"
            hideControls
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

      <Modal opened={ordersModalOpened} onClose={closeOrdersModal} title={`Pedidos - ${selectedSupplier?.name}`} zIndex={1100} size="lg">
        <Stack>
          <Group grow>
            <Textarea
              label="Descripción"
              required
              value={orderForm.description}
              onChange={(e) => setOrderForm(prev => ({ ...prev, description: e.target.value }))}
            />
            <NumberInput
              label="Monto"
              required
              value={orderForm.amount}
              onChange={(val) => setOrderForm(prev => ({ ...prev, amount: Number(val) || 0 }))}
              decimalScale={2}
              prefix="$"
              hideControls
            />
          </Group>
          <Group grow>
            <Select
              label="Método de Pago"
              value={orderForm.payment_method}
              onChange={(val) => setOrderForm(prev => ({ ...prev, payment_method: val as 'cash' | 'card' | 'transfer' }))}
              data={[
                { value: 'cash', label: 'Efectivo' },
                { value: 'card', label: 'Tarjeta' },
                { value: 'transfer', label: 'Transferencia' }
              ]}
              comboboxProps={{ withinPortal: false }}
            />
            <Select
              label="Estado"
              value={orderForm.status}
              onChange={(val) => setOrderForm(prev => ({ ...prev, status: val as 'pending' | 'paid' | 'cancelled' }))}
              data={[
                { value: 'pending', label: 'Pendiente' },
                { value: 'paid', label: 'Entregado' },
                { value: 'cancelled', label: 'Cancelado' }
              ]}
              comboboxProps={{ withinPortal: false }}
            />
          </Group>
          <Checkbox
            label="Pagado"
            checked={orderForm.pay}
            onChange={(e) => setOrderForm(prev => ({ ...prev, pay: e.target.checked }))}
          />
          <Button style={{ opacity: 0.5 }} onClick={handleSaveOrder}>
            Agregar Pedido
          </Button>

          <Text size="sm" fw={500} mt="md">Lista de Pedidos</Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Descripción</Table.Th>
                <Table.Th>Monto</Table.Th>
                <Table.Th>Pago</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {orders.map(order => (
                <Table.Tr key={order.id}>
                  <Table.Td>{order.description}</Table.Td>
                  <Table.Td>{formatCurrency(order.amount)}</Table.Td>
                  <Table.Td>{order.pay ? '✅' : '❌'}</Table.Td>
                  <Table.Td>
                    <Text size="xs" c={order.status === 'paid' ? 'green' : order.status === 'cancelled' ? 'red' : 'yellow'}>
                      {order.status === 'paid' ? 'Entregado' : order.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteOrder(order)}>
                      🗑️
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Modal>
    </Box>
  )
}
