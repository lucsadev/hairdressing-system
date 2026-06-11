'use client'

import { useEffect, useState } from 'react'
import { Box, Table, TextInput, Button, Group, Title, ActionIcon, Modal, Stack, Text, Select, NumberInput, Checkbox, Flex, Textarea, NativeSelect } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { useDisclosure } from '@mantine/hooks'
import { useAppointmentStore } from '@/store/appointmentStore'
import { database } from '@/lib/insforge'
import { IconPlus, IconFilter } from '@tabler/icons-react'
import dayjs from 'dayjs'

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
  suppliers?: Supplier
}

export function OrdersTable() {
  const { selectedDate, selectedStaffId } = useAppointmentStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const isMobile = useMediaQuery('(max-width: 500px)')
  const [isClient, setIsClient] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const [form, setForm] = useState({
    supplier_id: '',
    description: '',
    amount: 0,
    payment_method: 'cash' as 'cash' | 'card' | 'transfer',
    status: 'pending' as 'pending' | 'paid' | 'cancelled',
    pay: false
  })

  const fetchSuppliers = async () => {
    console.log('[OrdersTable] Fetching suppliers...')
    try {
      const { data, error } = await database
        .from('suppliers')
        .select('*')
        .order('name')

      console.log('[OrdersTable] suppliers result:', { data, error })
      if (!error && data) {
        setSuppliers(data)
      } else if (error) {
        console.error('[OrdersTable] Error fetching suppliers:', error)
      }
    } catch (err) {
      console.error('[OrdersTable] Exception fetching suppliers:', err)
    }
  }

  const fetchOrders = async () => {
    setLoading(true)
    try {
      let query = database
        .from('orders')
        .select('*, suppliers(*)')
        .order('created_at', { ascending: false })

      // If status or supplier filter is active, ignore date filter
      const hasAdvancedFilter = statusFilter || supplierFilter

      if (!hasAdvancedFilter) {
        // Filter by selected date
        const dayStart = dayjs(selectedDate).startOf('day').toISOString()
        const dayEnd = dayjs(selectedDate).endOf('day').toISOString()
        query = query.gte('created_at', dayStart).lte('created_at', dayEnd)
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      if (supplierFilter) {
        query = query.eq('supplier_id', supplierFilter)
      }

      const { data, error } = await query

      if (!error && data) {
        setOrders(data)
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [selectedDate, statusFilter, supplierFilter])

  const supplierOptions = suppliers.map(s => ({ value: s.id, label: s.name }))
  const [modalSupplierOptions, setModalSupplierOptions] = useState<{ value: string; label: string }[]>([])

  // Sync modal options when suppliers change
  useEffect(() => {
    setModalSupplierOptions(supplierOptions)
  }, [suppliers])

  const [modalKey, setModalKey] = useState(0)
  const [selectKey, setSelectKey] = useState(0)

  useEffect(() => {
    // When modal opens, force Select to re-render with fresh data
    if (modalOpened) {
      setSelectKey(prev => prev + 1)
    }
  }, [modalOpened])

  const handleOpenNew = () => {
    setEditingOrder(null)
    setForm({
      supplier_id: '',
      description: '',
      amount: 0,
      payment_method: 'cash',
      status: 'pending',
      pay: false
    })
    openModal()
  }

  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order)
    setForm({
      supplier_id: order.supplier_id,
      description: order.description,
      amount: order.amount,
      payment_method: order.payment_method || 'cash',
      status: order.status,
      pay: order.pay
    })
    openModal()
  }

  const handleSave = async () => {
    if (!form.supplier_id || !form.description) return

    try {
      if (editingOrder) {
        await database
          .from('orders')
          .update({
            description: form.description,
            amount: form.amount,
            payment_method: form.payment_method,
            status: form.status,
            pay: form.pay
          })
          .eq('id', editingOrder.id)
      } else {
        await database
          .from('orders')
          .insert([form])
      }
      closeModal()
      fetchOrders()
    } catch (err) {
      console.error('Error saving order:', err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await database
        .from('orders')
        .delete()
        .eq('id', id)
      fetchOrders()
    } catch (err) {
      console.error('Error deleting order:', err)
    }
  }

  const handleToggleStatus = async (order: Order) => {
    const newStatus = order.status === 'paid' ? 'pending' : 'paid'
    try {
      await database
        .from('orders')
        .update({ status: newStatus, pay: newStatus === 'paid' })
        .eq('id', order.id)
      fetchOrders()
    } catch (err) {
      console.error('Error updating order status:', err)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
  }

  const clearFilters = () => {
    setStatusFilter(null)
    setSupplierFilter(null)
  }

  const hasFilters = statusFilter || supplierFilter

  return (
    <Box p="md">
      <Flex gap="md" wrap="wrap" align="center" mb="md">
        <Title order={2} style={isClient && isMobile ? { flex: 1, textAlign: 'center' } : {}}>
          Pedidos
        </Title>
        <Group gap="xs">
          <Select
            placeholder="Estado"
            clearable
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { value: 'pending', label: 'Pendiente' },
              { value: 'paid', label: 'Entregado' },
              { value: 'cancelled', label: 'Cancelado' }
            ]}
            leftSection={<IconFilter size={14} />}
            style={{ width: 140 }}
          />
          <Select
            placeholder="Proveedor"
            clearable
            value={supplierFilter}
            onChange={setSupplierFilter}
            data={suppliers.map(s => ({ value: s.id, label: s.name }))}
            leftSection={<IconFilter size={14} />}
            style={{ width: 160 }}
          />
          {hasFilters && (
            <ActionIcon variant="subtle" color="red" onClick={clearFilters} title="Limpiar filtros">
              ✕
            </ActionIcon>
          )}
        </Group>
      </Flex>

      <Group justify="space-between" mb="md" align="center">
        <Text size="sm" c="dimmed">
          {hasFilters ? 'Mostrando todos los pedidos' : `Fecha: ${dayjs(selectedDate).format('DD/MM/YYYY')}`}
        </Text>
        <ActionIcon
          variant="filled"
          color="cyan"
          size="lg"
          onClick={(e) => {
            e.stopPropagation()
            handleOpenNew()
          }}
          title="Agregar nuevo Pedido"
          style={{ opacity: 0.5 }}
        >
          <IconPlus size={16} />
        </ActionIcon>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Fecha</Table.Th>
            <Table.Th>Proveedor</Table.Th>
            {!isClient || !isMobile ? <Table.Th>Descripción</Table.Th> : null}
            <Table.Th>Monto</Table.Th>
            <Table.Th>Pago</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th>Acciones</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {orders.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={7} style={{ textAlign: 'center' }}>
                <Text c="dimmed" py="md">No hay pedidos</Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            orders.map(order => (
              <Table.Tr key={order.id}>
                <Table.Td style={{ whiteSpace: 'nowrap' }}>
                  {dayjs(order.created_at).format('DD/MM/YYYY HH:mm')}
                </Table.Td>
                <Table.Td>{order.suppliers?.name || '-'}</Table.Td>
                {!isClient || !isMobile ? <Table.Td>{order.description}</Table.Td> : null}
                <Table.Td fw={500}>{formatCurrency(order.amount)}</Table.Td>
                <Table.Td>{order.pay ? '✅' : '❌'}</Table.Td>
                <Table.Td>
                  <Text
                    size="xs"
                    c={order.status === 'paid' ? 'green' : order.status === 'cancelled' ? 'red' : 'yellow'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleToggleStatus(order)}
                  >
                    {order.status === 'paid' ? 'Entregado' : order.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" onClick={() => handleOpenEdit(order)}>
                      ✏️
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(order.id)}>
                      🗑️
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>

      <Modal opened={modalOpened} onClose={closeModal} title={editingOrder ? 'Editar Pedido' : 'Nuevo Pedido'} zIndex={1100}>
        <Stack>
          <Select
            key={`supplier-select-${selectKey}`}
            label="Proveedor"
            required
            value={form.supplier_id}
            onChange={(val) => setForm(prev => ({ ...prev, supplier_id: val || '' }))}
            data={suppliers.map(s => ({ value: s.id, label: s.name }))}
            disabled={!!editingOrder}
            placeholder="Seleccionar proveedor..."
            comboboxProps={{ withinPortal: false }}
          />
          <Textarea
            label="Descripción"
            required
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
          />
          <NumberInput
            label="Monto"
            required
            value={form.amount}
            onChange={(val) => setForm(prev => ({ ...prev, amount: Number(val) || 0 }))}
            decimalScale={2}
            prefix="$"
            hideControls
          />
          <Group grow>
            <Select
              label="Método de Pago"
              value={form.payment_method}
              onChange={(val) => setForm(prev => ({ ...prev, payment_method: val as 'cash' | 'card' | 'transfer' }))}
              data={[
                { value: 'cash', label: 'Efectivo' },
                { value: 'card', label: 'Tarjeta' },
                { value: 'transfer', label: 'Transferencia' }
              ]}
              comboboxProps={{ withinPortal: false }}
            />
            <Select
              label="Estado"
              value={form.status}
              onChange={(val) => setForm(prev => ({ ...prev, status: val as 'pending' | 'paid' | 'cancelled' }))}
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
            checked={form.pay}
            onChange={(e) => setForm(prev => ({ ...prev, pay: e.target.checked }))}
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
