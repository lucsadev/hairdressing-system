'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Modal,
  Stack,
  Text,
  Table, NumberInput, Button, Group,
  Radio, ActionIcon, Box, Badge, Select, TextInput, Autocomplete, SimpleGrid
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconTrash, IconPlus } from '@tabler/icons-react'
import { useAppointmentStore, Service, Appointment, Ticket, TicketItem } from '@/store/appointmentStore'
import { useCashRegisterStore } from '@/store/cashRegisterStore'
import dayjs from 'dayjs'

interface TicketItemInput {
  id: string
  service_id: string | null
  unit_price: number
  subtotal: number
  is_extra: boolean
  custom_name?: string
  staff_id?: string | null
  // For existing items from DB
  _dbId?: string
}

interface TicketModalProps {
  opened: boolean
  onClose: () => void
  // Create mode props
  clientId?: string
  clientName?: string
  service?: Service | null
  appointmentId?: string
  appointments?: Appointment[]
  selectedDate?: Date
  onTicketCreated?: (appointmentId: string) => void
  // Edit mode props
  mode?: 'create' | 'edit'
  ticket?: Ticket | null
  onTicketUpdated?: () => void
}

export function TicketModal({
  opened,
  onClose,
  clientId,
  clientName,
  service,
  appointmentId,
  appointments,
  selectedDate,
  onTicketCreated,
  mode = 'create',
  ticket,
  onTicketUpdated,
}: TicketModalProps) {
  const { createTicket, updateTicket, services, staff } = useAppointmentStore()
  const { fetchOrCreateRegister, refreshRegister } = useCashRegisterStore()
  const [saving, setSaving] = useState(false)
  const isMobile = useMediaQuery('(max-width: 500px)')

  // Payment method: cash or card
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>(ticket?.payment_method || 'cash')

  // Ticket items
  const [items, setItems] = useState<TicketItemInput[]>([])

  // Initialize items when modal opens
  useEffect(() => {
    if (!opened) return

    if (mode === 'edit' && ticket?.ticket_items) {
      // Edit mode: load items from existing ticket
      setItems(ticket.ticket_items.map(item => ({
        id: item.id,
        service_id: item.service_id,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        is_extra: item.is_extra,
        custom_name: (item as any).custom_name || undefined,
        staff_id: (item as any).staff_id || null,
        _dbId: item.id
      })))
      setPaymentMethod(ticket.payment_method)
    } else {
      // Create mode: build items from appointments
      if (!clientId || !selectedDate) return

      const dayStart = new Date(selectedDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(selectedDate)
      dayEnd.setHours(23, 59, 59, 999)

      const clientAppointments = (appointments || []).filter(apt => {
        const aptDate = new Date(apt.start_time)
        return apt.client_id === clientId &&
               aptDate >= dayStart &&
               aptDate <= dayEnd
      })

      const appointmentItems: TicketItemInput[] = clientAppointments.map(apt => {
        const aptService = services.find(s => s.id === apt.service_id) || apt.services
        const price = paymentMethod === 'cash'
          ? (aptService?.cash || 0)
          : (aptService?.card || 0)
        return {
          id: `apt-${apt.id}`,
          service_id: apt.service_id,
          unit_price: price,
          subtotal: price,
          is_extra: false,
          staff_id: apt.staff_id
        }
      })

      // Add current service if not already in the list
      if (service && !appointmentItems.some(item => item.service_id === service.id)) {
        const price = paymentMethod === 'cash' ? service.cash : service.card
        appointmentItems.push({
          id: `temp-${Date.now()}`,
          service_id: service.id,
          unit_price: price,
          subtotal: price,
          is_extra: false,
          staff_id: null
        })
      }

      setItems(appointmentItems)
    }
  }, [opened, mode, ticket, clientId, selectedDate, appointments, services, service])

  // Add extra item
  const addExtraItem = () => {
    setItems(prev => [...prev, {
      id: `temp-${Date.now()}`,
      service_id: null,
      unit_price: 0,
      subtotal: 0,
      is_extra: true
    }])
  }

  // Remove item
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  // Update item field
  const updateItem = (id: string, field: keyof TicketItemInput, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      // Recalculate subtotal if unit_price changed
      if (field === 'unit_price') {
        updated.subtotal = updated.unit_price
      }
      return updated
    }))
  }

  // Calculate total
  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.subtotal, 0)
  }, [items])

  // Handle payment method change - update all service items prices
  const handlePaymentMethodChange = (method: 'cash' | 'card') => {
    setPaymentMethod(method)
    // Update prices for all non-extra items based on the selected payment method
    setItems(prev => prev.map(item => {
      if (item.is_extra || !item.service_id) return item
      const serviceData = services.find(s => s.id === item.service_id)
      if (!serviceData) return item
      const newPrice = method === 'cash' ? serviceData.cash : serviceData.card
      return { ...item, unit_price: newPrice, subtotal: newPrice }
    }))
  }

  // Handle save ticket
  const handleSave = async () => {
    if (items.length === 0) return
    setSaving(true)

    try {
      if (mode === 'edit' && ticket) {
        // Update existing ticket + items
        const itemPayload = items.map(({ id, service_id, unit_price, subtotal, is_extra, custom_name, staff_id }) => ({
          service_id,
          unit_price,
          subtotal,
          is_extra,
          custom_name,
          staff_id: staff_id || null
        }))

        const result = await updateTicket(ticket.id, {
          payment_method: paymentMethod,
          total_amount: total,
          items: itemPayload
        })

        if (result.error) {
          console.error('Error updating ticket:', result.error)
        } else {
          onTicketUpdated?.()
          onClose()
        }
      } else {
        // Create new ticket
        const result = await createTicket({
          client_id: clientId!,
          appointment_id: appointmentId,
          payment_method: paymentMethod,
          notes: '',
          items: items.map(({ id, service_id, unit_price, subtotal, is_extra, custom_name, staff_id }) => ({
            service_id,
            unit_price,
            subtotal,
            is_extra,
            custom_name,
            staff_id: staff_id || null
          }))
        })

        if (result.error) {
          console.error('Error creating ticket:', result.error)
        } else {
          if (onTicketCreated && appointmentId) {
            onTicketCreated(appointmentId)
          }
          setItems([])
          setPaymentMethod('cash')
          onClose()
        }
      }
    } finally {
      setSaving(false)
    }
  }

  // Handle close - reset form
  const handleClose = () => {
    setItems([])
    setPaymentMethod('cash')
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={mode === 'edit' ? 'Editar Ticket' : 'Generar Ticket'}
      size="lg"
      fullScreen={isMobile}
      zIndex={1100}
    >
      <Stack px={isMobile ? 0 : undefined}>
        {/* Client info */}
        {clientName && (
          <Badge color="cyan" size="lg">
            Cliente: {clientName}
          </Badge>
        )}

        {/* Status badge for edit mode */}
        {mode === 'edit' && ticket && (
          <Badge color={ticket.status === 'completed' ? 'green' : ticket.status === 'cancelled' ? 'red' : 'yellow'} size="lg">
            Status: {ticket.status}
          </Badge>
        )}

        {/* Items */}
        {isMobile ? (
          <Stack gap="xs">
            {items.map(item => (
              <Box
                key={item.id}
                p="xs"
                style={{
                  border: '1px solid #dee2e6',
                  borderRadius: 8,
                  background: '#fff'
                }}
              >
                <Stack gap={6}>
                  <Autocomplete
                    value={item.service_id ? (services.find(s => s.id === item.service_id)?.name || '') : (item.custom_name || '')}
                    onChange={(val) => {
                      const matched = services.find(s => s.name.toLowerCase() === val.toLowerCase())
                      if (matched) {
                        updateItem(item.id, 'service_id', matched.id)
                        const price = paymentMethod === 'cash' ? matched.cash : matched.card
                        updateItem(item.id, 'unit_price', price)
                        updateItem(item.id, 'subtotal', price)
                        updateItem(item.id, 'custom_name', undefined)
                      } else {
                        updateItem(item.id, 'service_id', null)
                        updateItem(item.id, 'custom_name', val || undefined)
                        if (!val) {
                          updateItem(item.id, 'unit_price', 0)
                          updateItem(item.id, 'subtotal', 0)
                        }
                      }
                    }}
                    data={services.filter(s => s.is_active !== false).map(s => s.name)}
                    size="xs"
                    placeholder="Servicio o descripción..."
                    comboboxProps={{ withinPortal: false }}
                  />
                  <Group grow gap="xs">
                    <Select
                      value={item.staff_id || ''}
                      onChange={(val) => updateItem(item.id, 'staff_id', val || null)}
                      data={staff.map(s => ({ value: s.id, label: s.name }))}
                      size="xs"
                      placeholder="Staff..."
                      clearable
                      comboboxProps={{ withinPortal: false }}
                    />
                    <NumberInput
                      value={item.unit_price}
                      onChange={(val) => updateItem(item.id, 'unit_price', Number(val))}
                      min={0}
                      decimalScale={2}
                      prefix="$"
                      size="xs"
                      hideControls
                    />
                  </Group>
                  <Group gap="xs" justify="space-between">
                    <Text size="sm" fw={600}>
                      Subtotal: ${item.subtotal.toLocaleString('es-AR')}
                    </Text>
                    <ActionIcon color="red" variant="subtle" onClick={() => removeItem(item.id)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          <Box style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Servicio</Table.Th>
                  <Table.Th style={{ width: 140 }}>Staff</Table.Th>
                  <Table.Th style={{ width: 120 }}>Precio Unit.</Table.Th>
                  <Table.Th style={{ width: 120 }}>Subtotal</Table.Th>
                  <Table.Th style={{ width: 50 }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map(item => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Autocomplete
                        value={item.service_id ? (services.find(s => s.id === item.service_id)?.name || '') : (item.custom_name || '')}
                        onChange={(val) => {
                          const matched = services.find(s => s.name.toLowerCase() === val.toLowerCase())
                          if (matched) {
                            updateItem(item.id, 'service_id', matched.id)
                            const price = paymentMethod === 'cash' ? matched.cash : matched.card
                            updateItem(item.id, 'unit_price', price)
                            updateItem(item.id, 'subtotal', price)
                            updateItem(item.id, 'custom_name', undefined)
                          } else {
                            updateItem(item.id, 'service_id', null)
                            updateItem(item.id, 'custom_name', val || undefined)
                            if (!val) {
                              updateItem(item.id, 'unit_price', 0)
                              updateItem(item.id, 'subtotal', 0)
                            }
                          }
                        }}
                        data={services.filter(s => s.is_active !== false).map(s => s.name)}
                        size="xs"
                        placeholder="Servicio o descripción..."
                        comboboxProps={{ withinPortal: false }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Select
                        value={item.staff_id || ''}
                        onChange={(val) => updateItem(item.id, 'staff_id', val || null)}
                        data={staff.map(s => ({ value: s.id, label: s.name }))}
                        size="xs"
                        placeholder="Staff..."
                        clearable
                        comboboxProps={{ withinPortal: false }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        value={item.unit_price}
                        onChange={(val) => updateItem(item.id, 'unit_price', Number(val))}
                        min={0}
                        decimalScale={2}
                        prefix="$"
                        size="xs"
                        hideControls
                        styles={{ input: { width: 90 } }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>${item.subtotal.toLocaleString('es-AR')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon color="red" variant="subtle" onClick={() => removeItem(item.id)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        )}

        {/* Add extra button */}
        <Button
          variant="outline"
          leftSection={<IconPlus size={16} />}
          onClick={addExtraItem}
          size="xs"
        >
          Agregar extra / gasto
        </Button>

        {/* Payment method */}
        <Box>
          <Text fw={600} mb="xs">Método de pago</Text>
          <Radio.Group
            value={paymentMethod}
            onChange={(val) => handlePaymentMethodChange(val as 'cash' | 'card')}
          >
            <Group>
              <Radio value="cash" label="Efectivo" />
              <Radio value="card" label="Tarjeta / Transferencia" />
            </Group>
          </Radio.Group>
        </Box>

        {/* Total */}
        <Box bg="gray.1" p="md" style={{ borderRadius: 8 }}>
          <Group justify="space-between">
            <Text fw={600}>Total</Text>
            <Text fw={700} size="xl">${total.toLocaleString('es-AR')}</Text>
          </Group>
        </Box>

        {/* Actions */}
        {isMobile ? (
          <Stack gap="xs">
            <Group grow>
              <Button variant="outline" onClick={handleClose} size="sm">
                Cancelar
              </Button>
              <Button
                color="green"
                onClick={handleSave}
                loading={saving}
                disabled={items.length === 0}
                size="sm"
              >
                {mode === 'edit' ? 'Actualizar Ticket' : 'Guardar Ticket'}
              </Button>
            </Group>
            {mode === 'edit' && ticket && ticket.status !== 'completed' && (
              <Button
                color="blue"
                variant="filled"
                fullWidth
                size="sm"
                onClick={async () => {
                  if (!ticket) return
                  // Save any changes (items, payment method, total) + mark as completed
                  const itemPayload = items.map(({ id, service_id, unit_price, subtotal, is_extra, custom_name, staff_id }) => ({
                    service_id,
                    unit_price,
                    subtotal,
                    is_extra,
                    custom_name,
                    staff_id: staff_id || null
                  }))
                  const result = await updateTicket(ticket.id, {
                    payment_method: paymentMethod,
                    total_amount: total,
                    status: 'completed',
                    items: itemPayload
                  })
                  if (!result.error) {
                    // Refresh cash register for today
                    const today = dayjs().format('YYYY-MM-DD')
                    await fetchOrCreateRegister(today)
                    await refreshRegister(today)
                    onTicketUpdated?.()
                    onClose()
                  }
                }}
              >
                Cobrar
              </Button>
            )}
          </Stack>
        ) : (
          <Group justify="space-between">
            <Box>
              {mode === 'edit' && ticket && ticket.status !== 'completed' && (
                <Button
                  color="blue"
                  variant="filled"
                  onClick={async () => {
                    if (!ticket) return
                    // Save any changes (items, payment method, total) + mark as completed
                    const itemPayload = items.map(({ id, service_id, unit_price, subtotal, is_extra, custom_name, staff_id }) => ({
                      service_id,
                      unit_price,
                      subtotal,
                      is_extra,
                      custom_name,
                      staff_id: staff_id || null
                    }))
                    const result = await updateTicket(ticket.id, {
                      payment_method: paymentMethod,
                      total_amount: total,
                      status: 'completed',
                      items: itemPayload
                    })
                    if (!result.error) {
                      // Refresh cash register for today
                      const today = dayjs().format('YYYY-MM-DD')
                      await fetchOrCreateRegister(today)
                      await refreshRegister(today)
                      onTicketUpdated?.()
                      onClose()
                    }
                  }}
                  size="sm"
                >
                  Cobrar
                </Button>
              )}
            </Box>
            <Group>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                color="green"
                onClick={handleSave}
                loading={saving}
                disabled={items.length === 0}
              >
                {mode === 'edit' ? 'Actualizar Ticket' : 'Guardar Ticket'}
              </Button>
            </Group>
          </Group>
        )}
      </Stack>
    </Modal>
  )
}