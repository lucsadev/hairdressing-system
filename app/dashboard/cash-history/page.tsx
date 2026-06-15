'use client'

import { useEffect, useState } from 'react'
import {
  Box, Title, Text, Group, Card, Table, Badge, SegmentedControl,
  SimpleGrid, LoadingOverlay, Select, Button, Modal, NumberInput,
  Stack, Textarea
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useMediaQuery } from '@mantine/hooks'
import { IconCash, IconArrowUpRight, IconArrowDownRight, IconCreditCard, IconDoorExit } from '@tabler/icons-react'
import { useCashRegisterStore, type CashRegister } from '@/store/cashRegisterStore'
import dayjs from 'dayjs'
import { notifications } from '@mantine/notifications'

function CashHistoryContent() {
  const { history, loading, fetchHistory, closeRegister } = useCashRegisterStore()
  const [isClient, setIsClient] = useState(false)
  const isMobile = useMediaQuery('(max-width: 500px)')
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly')
  const currentYear = dayjs().year()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(dayjs().month() + 1)
  const [closeModalOpened, { open: openCloseModal, close: closeCloseModal }] = useDisclosure(false)
  const [closingRegister, setClosingRegister] = useState<CashRegister | null>(null)
  const [closingBalance, setClosingBalance] = useState<number>(0)
  const [closeNotes, setCloseNotes] = useState('')
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return
    fetchHistory(selectedYear, viewMode === 'monthly' ? selectedMonth || undefined : undefined)
  }, [isClient, selectedYear, selectedMonth, viewMode])

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: dayjs().month(i).format('MMMM')
  }))

  const years = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - 2 + i
    return { value: String(y), label: String(y) }
  })

  const totals = history.reduce((acc, reg) => ({
    cashIncome: acc.cashIncome + Number(reg.total_cash_income),
    cardIncome: acc.cardIncome + Number(reg.total_card_income),
    expenses: acc.expenses + Number(reg.total_expenses),
    totalIncome: acc.totalIncome + Number(reg.total_cash_income) + Number(reg.total_card_income),
  }), { cashIncome: 0, cardIncome: 0, expenses: 0, totalIncome: 0 })

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

  if (!isClient) return null

  const sortedHistory = [...history].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <Box p="md" pos="relative">
      <LoadingOverlay visible={loading} />

      <Title order={2} mb="lg">Historial de Caja</Title>

      <Group mb="md" wrap="wrap">
        <SegmentedControl
          value={viewMode}
          onChange={(val) => setViewMode(val as 'monthly' | 'yearly')}
          data={[
            { value: 'monthly', label: 'Mensual' },
            { value: 'yearly', label: 'Anual' },
          ]}
        />
        <Select
          value={String(selectedYear)}
          onChange={(val) => setSelectedYear(Number(val))}
          data={years}
          style={{ width: 100 }}
        />
        {viewMode === 'monthly' && (
          <Select
            value={selectedMonth ? String(selectedMonth) : null}
            onChange={(val) => setSelectedMonth(val ? Number(val) : null)}
            data={months}
            placeholder="Mes"
            clearable
            style={{ width: 130 }}
          />
        )}
      </Group>

      {history.length > 0 && (
        <SimpleGrid cols={{ base: 2, sm: 2, md: 4 }} mb="lg" spacing={isMobile ? 'xs' : 'md'}>
          <Card shadow="sm" padding={isMobile ? 'sm' : 'md'} radius="md" withBorder>
            <Group gap="xs" mb="xs">
              <IconArrowUpRight size={isMobile ? 16 : 20} color="green" />
              <Text size={isMobile ? 'xs' : 'sm'} c="dimmed">Efectivo</Text>
            </Group>
            <Text size={isMobile ? 'md' : 'xl'} fw={700} c="green">
              +{formatCurrency(totals.cashIncome)}
            </Text>
          </Card>
          <Card shadow="sm" padding={isMobile ? 'sm' : 'md'} radius="md" withBorder>
            <Group gap="xs" mb="xs">
              <IconCreditCard size={isMobile ? 16 : 20} color="violet" />
              <Text size={isMobile ? 'xs' : 'sm'} c="dimmed">Tarjeta</Text>
            </Group>
            <Text size={isMobile ? 'md' : 'xl'} fw={700} c="violet">
              +{formatCurrency(totals.cardIncome)}
            </Text>
          </Card>
          <Card shadow="sm" padding={isMobile ? 'sm' : 'md'} radius="md" withBorder>
            <Group gap="xs" mb="xs">
              <IconArrowDownRight size={isMobile ? 16 : 20} color="red" />
              <Text size={isMobile ? 'xs' : 'sm'} c="dimmed">Gastos</Text>
            </Group>
            <Text size={isMobile ? 'md' : 'xl'} fw={700} c="red">
              -{formatCurrency(totals.expenses)}
            </Text>
          </Card>
          <Card shadow="sm" padding={isMobile ? 'sm' : 'md'} radius="md" withBorder>
            <Group gap="xs" mb="xs">
              <IconCash size={isMobile ? 16 : 20} color="blue" />
              <Text size={isMobile ? 'xs' : 'sm'} c="dimmed">Neto</Text>
            </Group>
            <Text
              size={isMobile ? 'md' : 'xl'}
              fw={700}
              c={totals.totalIncome - totals.expenses >= 0 ? 'green' : 'red'}
            >
              {formatCurrency(totals.totalIncome - totals.expenses)}
            </Text>
          </Card>
        </SimpleGrid>
      )}

      <Modal
        opened={closeModalOpened}
        onClose={closeCloseModal}
        title={`Cerrar Caja - ${closingRegister ? dayjs(closingRegister.date).format('DD/MM/YYYY') : ''}`}
        centered
        zIndex={1100}
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Balance esperado: {formatCurrency(Number(closingRegister?.expected_balance || 0))}
          </Text>
          <NumberInput
            label="Balance de cierre"
            value={closingBalance}
            onChange={(val) => setClosingBalance(Number(val))}
            min={0}
            required
          />
          {closingRegister && closingBalance !== Number(closingRegister.expected_balance) && (
            <Text size="sm" c="orange">
              Diferencia: {formatCurrency(closingBalance - Number(closingRegister.expected_balance))}
            </Text>
          )}
          <Textarea
            label="Notas"
            value={closeNotes}
            onChange={(e) => setCloseNotes(e.currentTarget.value)}
            placeholder="Opcional"
            rows={3}
          />
          <Group grow>
            <Button variant="outline" onClick={closeCloseModal}>
              Cancelar
            </Button>
            <Button
              color="yellow"
              loading={closing}
              onClick={async () => {
                if (!closingRegister) return
                setClosing(true)
                const { error } = await closeRegister(closingRegister.id, closingBalance, closeNotes || undefined)
                setClosing(false)
                closeCloseModal()
                if (error) {
                  notifications.show({ title: 'Error', message: error, color: 'red' })
                } else {
                  notifications.show({ title: 'Caja cerrada', message: 'Caja cerrada correctamente', color: 'green' })
                  fetchHistory(selectedYear, viewMode === 'monthly' ? selectedMonth || undefined : undefined)
                }
              }}
            >
              Cerrar Caja
            </Button>
          </Group>
        </Stack>
      </Modal>

      {sortedHistory.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No hay registros de caja en este período
        </Text>
      ) : (
        <Box style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <Table
            striped
            highlightOnHover
            horizontalSpacing={isMobile ? 'xs' : 'md'}
            verticalSpacing={isMobile ? 'xs' : 'sm'}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fecha</Table.Th>
                {!isMobile && <Table.Th>Estado</Table.Th>}
                <Table.Th>Efectivo</Table.Th>
                {!isMobile && <Table.Th>Tarjeta</Table.Th>}
                <Table.Th>Gastos</Table.Th>
                {!isMobile && <Table.Th>Esperado</Table.Th>}
                <Table.Th>{isMobile ? 'Neto' : 'Cierre'}</Table.Th>
                {!isMobile && <Table.Th>Dif.</Table.Th>}
                {isMobile && <Table.Th />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sortedHistory.map(reg => {
                const income = Number(reg.total_cash_income) + Number(reg.total_card_income)
                const net = income - Number(reg.total_expenses)

                return (
                  <Table.Tr key={reg.id}>
                    <Table.Td style={{ whiteSpace: 'nowrap', fontSize: isMobile ? 13 : undefined }}>
                      {dayjs(reg.date).format('DD/MM/YYYY')}
                    </Table.Td>
                    {!isMobile && (
                      <Table.Td>
                        <Badge color={reg.status === 'open' ? 'yellow' : 'green'}>
                          {reg.status === 'open' ? 'Abierta' : 'Cerrada'}
                        </Badge>
                      </Table.Td>
                    )}
                    <Table.Td fw={500} style={{ fontSize: isMobile ? 13 : undefined }}>
                      {formatCurrency(Number(reg.total_cash_income))}
                    </Table.Td>
                    {!isMobile && <Table.Td>{formatCurrency(Number(reg.total_card_income))}</Table.Td>}
                    <Table.Td c="red" style={{ fontSize: isMobile ? 13 : undefined }}>
                      {formatCurrency(Number(reg.total_expenses))}
                    </Table.Td>
                    {!isMobile && <Table.Td>{formatCurrency(Number(reg.expected_balance))}</Table.Td>}
                    <Table.Td fw={600} style={{ fontSize: isMobile ? 13 : undefined }}>
                      {reg.status === 'closed'
                        ? formatCurrency(Number(reg.closing_balance))
                        : formatCurrency(net)
                      }
                    </Table.Td>
                    {!isMobile && (
                      <Table.Td>
                        {reg.status === 'closed' ? (
                          <Text c={Number(reg.difference) === 0 ? 'green' : 'orange'}>
                            {formatCurrency(Number(reg.difference))}
                          </Text>
                        ) : (
                          <Text c="orange">—</Text>
                        )}
                      </Table.Td>
                    )}
                    {isMobile && (
                      <Table.Td>
                        {reg.status === 'open' ? (
                          <Button
                            size="compact-xs"
                            color="yellow"
                            variant="outline"
                            onClick={() => {
                              setClosingRegister(reg)
                              setClosingBalance(Number(reg.expected_balance))
                              setCloseNotes('')
                              openCloseModal()
                            }}
                          >
                            Cerrar
                          </Button>
                        ) : (
                          <Text
                            size="sm"
                            c={Number(reg.difference) === 0 ? 'green' : 'orange'}
                          >
                            {formatCurrency(Number(reg.difference))}
                          </Text>
                        )}
                      </Table.Td>
                    )}
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        </Box>
      )}
    </Box>
  )
}

export default function CashHistoryPage() {
  return (
    <ProtectedRoute redirectTo="/login">
      <CashHistoryContent />
    </ProtectedRoute>
  )
}
