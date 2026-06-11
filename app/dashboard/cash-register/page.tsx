'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Box, Title, Text, Group, Stack, Card, NumberInput, Button,
  Modal, TextInput, Select, Textarea, Table, Badge, ActionIcon,
  SimpleGrid, LoadingOverlay
} from '@mantine/core'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useDisclosure } from '@mantine/hooks'
import { useMediaQuery } from '@mantine/hooks'
import { IconPlus, IconCash, IconCreditCard, IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react'
import { useCashRegisterStore, EXPENSE_CATEGORIES } from '@/store/cashRegisterStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import dayjs from 'dayjs'

function CashRegisterContent() {
  const {
    currentRegister, expenses, loading,
    fetchOrCreateRegister, openRegister, closeRegister, refreshRegister,
    fetchExpenses, createExpense, updateExpense, deleteExpense
  } = useCashRegisterStore()
  const { tickets, fetchTickets } = useAppointmentStore()

  const [isClient, setIsClient] = useState(false)
  const isMobile = useMediaQuery('(max-width: 500px)')
  const [opModalOpened, { open: openOpModal, close: closeOpModal }] = useDisclosure(false)
  const [closeModalOpened, { open: openCloseModal, close: closeCloseModal }] = useDisclosure(false)
  const [expModalOpened, { open: openExpModal, close: closeExpModal }] = useDisclosure(false)
  const [openingBalance, setOpeningBalance] = useState(0)
  const [closingBalance, setClosingBalance] = useState(0)
  const [closeNotes, setCloseNotes] = useState('')
  const [editingExpense, setEditingExpense] = useState<any>(null)

  const [expForm, setExpForm] = useState({
    description: '',
    amount: 0,
    category: 'other',
    payment_method: 'cash' as 'cash' | 'card' | 'transfer',
    date: dayjs().format('YYYY-MM-DDTHH:mm'),
    notes: ''
  })

  const today = dayjs().format('YYYY-MM-DD')

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return
    fetchOrCreateRegister(today)
    fetchExpenses(today)
    fetchTickets()
  }, [isClient])

  const todayTickets = tickets.filter(t => {
    const ticketDate = dayjs(t.created_at).format('YYYY-MM-DD')
    return ticketDate === today && t.status === 'completed'
  })

  const cashIncome = todayTickets
    .filter(t => t.payment_method === 'cash')
    .reduce((sum, t) => sum + t.total_amount, 0)

  const cardIncome = todayTickets
    .filter(t => t.payment_method === 'card')
    .reduce((sum, t) => sum + t.total_amount, 0)

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const cashExpenses = expenses
    .filter(e => e.payment_method === 'cash')
    .reduce((sum, e) => sum + e.amount, 0)

  const handleOpenRegister = async () => {
    await openRegister(today, openingBalance)
    closeOpModal()
  }

  const handleCloseRegister = async () => {
    if (!currentRegister) return
    await closeRegister(currentRegister.id, closingBalance, closeNotes)
    closeCloseModal()
    await fetchExpenses(today)
  }

  const handleSaveExpense = async () => {
    const expenseData = {
      ...expForm,
      date: new Date(expForm.date).toISOString()
    }

    if (editingExpense) {
      await updateExpense(editingExpense.id, expenseData)
    } else {
      await createExpense(expenseData)
    }
    closeExpModal()
    setEditingExpense(null)
    setExpForm({
      description: '',
      amount: 0,
      category: 'other',
      payment_method: 'cash',
      date: dayjs().format('YYYY-MM-DDTHH:mm'),
      notes: ''
    })
  }

  const handleEditExpense = (expense: any) => {
    setEditingExpense(expense)
    setExpForm({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      payment_method: expense.payment_method,
      date: dayjs(expense.date).format('YYYY-MM-DDTHH:mm'),
      notes: expense.notes || ''
    })
    openExpModal()
  }

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense(id)
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

  if (!isClient) return null

  const expectedBalance = currentRegister
    ? Number(currentRegister.opening_balance) + cashIncome - cashExpenses
    : 0

  return (
    <Box p="md" pos="relative">
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" mb="lg">
        <Title order={2}>Caja Diaria</Title>
        <Text size="sm" c="dimmed">{dayjs().format('DD/MM/YYYY')}</Text>
      </Group>

      {!currentRegister ? (
        <Card shadow="sm" padding="lg" radius="md" withBorder mb="lg">
          <Stack align="center" gap="md" py="xl">
            <IconCash size={48} stroke={1} />
            <Text size="lg" fw={500}>Caja cerrada</Text>
            <Text size="sm" c="dimmed">Abrí la caja para registrar los movimientos del día</Text>
            <Button leftSection={<IconCash size={16} />} onClick={openOpModal}>
              Abrir Caja
            </Button>
          </Stack>
        </Card>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="lg">
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Group gap="xs" mb="xs">
                <IconCash size={20} color="var(--mantine-color-blue-6)" />
                <Text size="sm" c="dimmed">Saldo Inicial</Text>
              </Group>
              <Text size="xl" fw={700}>
                {formatCurrency(Number(currentRegister.opening_balance))}
              </Text>
            </Card>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Group gap="xs" mb="xs">
                <IconArrowUpRight size={20} color="var(--mantine-color-green-6)" />
                <Text size="sm" c="dimmed">Ingresos Efectivo</Text>
              </Group>
              <Text size="xl" fw={700} c="green">
                +{formatCurrency(cashIncome)}
              </Text>
            </Card>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Group gap="xs" mb="xs">
                <IconCreditCard size={20} color="var(--mantine-color-violet-6)" />
                <Text size="sm" c="dimmed">Ingresos Tarjeta</Text>
              </Group>
              <Text size="xl" fw={700} c="violet">
                +{formatCurrency(cardIncome)}
              </Text>
            </Card>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Group gap="xs" mb="xs">
                <IconArrowDownRight size={20} color="var(--mantine-color-red-6)" />
                <Text size="sm" c="dimmed">Gastos</Text>
              </Group>
              <Text size="xl" fw={700} c="red">
                -{formatCurrency(totalExpenses)}
              </Text>
            </Card>
          </SimpleGrid>

          <Card shadow="sm" padding="md" radius="md" withBorder mb="lg">
            <Group justify="space-between">
              <Box>
                <Text size="sm" c="dimmed">Saldo Esperado en Caja</Text>
                <Text size="xl" fw={700}>{formatCurrency(expectedBalance)}</Text>
                <Text size="xs" c="dimmed">
                  {Number(currentRegister.opening_balance)} + {cashIncome} (efectivo) - {cashExpenses} (gastos efectivo)
                </Text>
              </Box>
              {currentRegister?.status === 'open' && (
                <Button
                  variant="filled"
                  color="orange"
                  leftSection={<IconCash size={16} />}
                  onClick={openCloseModal}
                >
                  Cerrar Caja
                </Button>
              )}
              {currentRegister?.status === 'closed' && (
                <Box>
                  <Badge size="lg" color="green">Caja Cerrada</Badge>
                  <Text size="sm" mt="xs">
                    Cierre: {formatCurrency(Number(currentRegister.closing_balance))}
                  </Text>
                  <Text size="sm" c={Number(currentRegister.difference) === 0 ? 'green' : 'red'}>
                    Diferencia: {formatCurrency(Number(currentRegister.difference))}
                  </Text>
                </Box>
              )}
            </Group>
          </Card>

          <Group justify="space-between" mb="md">
            <Title order={3}>Gastos del Día</Title>
            <Button
              leftSection={<IconPlus size={14} />}
              size="sm"
              onClick={() => {
                setEditingExpense(null)
                setExpForm({
                  description: '',
                  amount: 0,
                  category: 'other',
                  payment_method: 'cash',
                  date: dayjs().format('YYYY-MM-DDTHH:mm'),
                  notes: ''
                })
                openExpModal()
              }}
            >
              Agregar Gasto
            </Button>
          </Group>

          {expenses.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">No hay gastos registrados hoy</Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Descripción</Table.Th>
                  {!isMobile && <Table.Th>Categoría</Table.Th>}
                  <Table.Th>Monto</Table.Th>
                  <Table.Th>Pago</Table.Th>
                  {!isMobile && <Table.Th>Acciones</Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {expenses.map(exp => (
                  <Table.Tr key={exp.id}>
                    <Table.Td>
                      <Text fw={500}>{exp.description}</Text>
                      {isMobile && <Text size="xs" c="dimmed">{EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.label}</Text>}
                    </Table.Td>
                    {!isMobile && (
                      <Table.Td>
                        <Badge variant="light">{EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.label}</Badge>
                      </Table.Td>
                    )}
                    <Table.Td fw={600}>{formatCurrency(exp.amount)}</Table.Td>
                    <Table.Td>
                      <Badge color={exp.payment_method === 'cash' ? 'green' : exp.payment_method === 'card' ? 'blue' : 'cyan'}>
                        {exp.payment_method === 'cash' ? 'Efectivo' : exp.payment_method === 'card' ? 'Tarjeta' : 'Transferencia'}
                      </Badge>
                    </Table.Td>
                    {!isMobile && (
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon variant="subtle" onClick={() => handleEditExpense(exp)}>
                            ✏️
                          </ActionIcon>
                          <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteExpense(exp.id)}>
                            🗑️
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </>
      )}

      <Modal opened={opModalOpened} onClose={closeOpModal} title="Abrir Caja" centered>
        <Stack>
          <TextInput
            label="Fecha"
            value={today}
            disabled
          />
          <NumberInput
            label="Saldo Inicial"
            description="Efectivo disponible en caja al inicio del día"
            value={openingBalance}
            onChange={(val) => setOpeningBalance(Number(val) || 0)}
            min={0}
            decimalScale={2}
            prefix="$"
            hideControls
            required
          />
          <Group grow>
            <Button variant="outline" onClick={closeOpModal}>Cancelar</Button>
            <Button onClick={handleOpenRegister} disabled={openingBalance < 0}>
              Abrir Caja
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={closeModalOpened} onClose={closeCloseModal} title="Cerrar Caja" centered>
        <Stack>
          <Text size="sm">Saldo esperado: <Text span fw={700}>{formatCurrency(expectedBalance)}</Text></Text>
          <NumberInput
            label="Saldo Final"
            description="Efectivo contado al cierre"
            value={closingBalance}
            onChange={(val) => setClosingBalance(Number(val) || 0)}
            min={0}
            decimalScale={2}
            prefix="$"
            hideControls
            required
          />
          <Textarea
            label="Notas"
            value={closeNotes}
            onChange={(e) => setCloseNotes(e.target.value)}
            placeholder="Observaciones del cierre..."
          />
          {closingBalance !== expectedBalance && (
            <Text size="sm" c="orange">
              Diferencia: {formatCurrency(closingBalance - expectedBalance)}
            </Text>
          )}
          <Group grow>
            <Button variant="outline" onClick={closeCloseModal}>Cancelar</Button>
            <Button color="orange" onClick={handleCloseRegister}>
              Cerrar Caja
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={expModalOpened}
        onClose={closeExpModal}
        title={editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
        centered
      >
        <Stack>
          <TextInput
            label="Descripción"
            required
            value={expForm.description}
            onChange={(e) => setExpForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Ej: Compra de insumos"
          />
          <Select
            label="Categoría"
            value={expForm.category}
            onChange={(val) => setExpForm(prev => ({ ...prev, category: val || 'other' }))}
            data={EXPENSE_CATEGORIES}
          />
          <NumberInput
            label="Monto"
            required
            value={expForm.amount}
            onChange={(val) => setExpForm(prev => ({ ...prev, amount: Number(val) || 0 }))}
            min={0}
            decimalScale={2}
            prefix="$"
            hideControls
          />
          <Select
            label="Método de Pago"
            value={expForm.payment_method}
            onChange={(val) => setExpForm(prev => ({ ...prev, payment_method: val as 'cash' | 'card' | 'transfer' }))}
            data={[
              { value: 'cash', label: 'Efectivo' },
              { value: 'card', label: 'Tarjeta' },
              { value: 'transfer', label: 'Transferencia' }
            ]}
          />
          <TextInput
            label="Fecha y Hora"
            type="datetime-local"
            value={expForm.date}
            onChange={(e) => setExpForm(prev => ({ ...prev, date: e.target.value }))}
          />
          <Textarea
            label="Notas"
            value={expForm.notes}
            onChange={(e) => setExpForm(prev => ({ ...prev, notes: e.target.value }))}
          />
          <Group grow>
            <Button variant="outline" onClick={closeExpModal}>Cancelar</Button>
            <Button onClick={handleSaveExpense} disabled={!expForm.description || expForm.amount <= 0}>
              {editingExpense ? 'Guardar' : 'Agregar'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}

export default function CashRegisterPage() {
  return (
    <ProtectedRoute redirectTo="/login">
      <CashRegisterContent />
    </ProtectedRoute>
  )
}
