'use client'

import { useEffect, useState } from 'react'
import {
  Box, Title, Text, Group, Card, Table, Badge, SegmentedControl,
  SimpleGrid, LoadingOverlay, Select
} from '@mantine/core'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useMediaQuery } from '@mantine/hooks'
import { IconCash, IconArrowUpRight, IconArrowDownRight, IconCreditCard } from '@tabler/icons-react'
import { useCashRegisterStore } from '@/store/cashRegisterStore'
import dayjs from 'dayjs'

function CashHistoryContent() {
  const { history, loading, fetchHistory } = useCashRegisterStore()
  const [isClient, setIsClient] = useState(false)
  const isMobile = useMediaQuery('(max-width: 500px)')
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly')
  const currentYear = dayjs().year()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(dayjs().month() + 1)

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
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="lg">
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Group gap="xs" mb="xs">
              <IconArrowUpRight size={20} color="green" />
              <Text size="sm" c="dimmed">Ingresos Efectivo</Text>
            </Group>
            <Text size="xl" fw={700} c="green">
              +{formatCurrency(totals.cashIncome)}
            </Text>
          </Card>
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Group gap="xs" mb="xs">
              <IconCreditCard size={20} color="violet" />
              <Text size="sm" c="dimmed">Ingresos Tarjeta</Text>
            </Group>
            <Text size="xl" fw={700} c="violet">
              +{formatCurrency(totals.cardIncome)}
            </Text>
          </Card>
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Group gap="xs" mb="xs">
              <IconArrowDownRight size={20} color="red" />
              <Text size="sm" c="dimmed">Gastos</Text>
            </Group>
            <Text size="xl" fw={700} c="red">
              -{formatCurrency(totals.expenses)}
            </Text>
          </Card>
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Group gap="xs" mb="xs">
              <IconCash size={20} color="blue" />
              <Text size="sm" c="dimmed">Neto</Text>
            </Group>
            <Text
              size="xl"
              fw={700}
              c={totals.totalIncome - totals.expenses >= 0 ? 'green' : 'red'}
            >
              {formatCurrency(totals.totalIncome - totals.expenses)}
            </Text>
          </Card>
        </SimpleGrid>
      )}

      {sortedHistory.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No hay registros de caja en este período
        </Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Fecha</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Efectivo</Table.Th>
              {!isMobile && <Table.Th>Tarjeta</Table.Th>}
              <Table.Th>Gastos</Table.Th>
              {!isMobile && <Table.Th>Esperado</Table.Th>}
              <Table.Th>Cierre</Table.Th>
              <Table.Th>Dif.</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedHistory.map(reg => {
              const income = Number(reg.total_cash_income) + Number(reg.total_card_income)
              const net = income - Number(reg.total_expenses)

              return (
                <Table.Tr key={reg.id}>
                  <Table.Td style={{ whiteSpace: 'nowrap' }}>
                    {dayjs(reg.date).format('DD/MM/YYYY')}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={reg.status === 'open' ? 'yellow' : 'green'}>
                      {reg.status === 'open' ? 'Abierta' : 'Cerrada'}
                    </Badge>
                  </Table.Td>
                  <Table.Td fw={500}>{formatCurrency(Number(reg.total_cash_income))}</Table.Td>
                  {!isMobile && <Table.Td>{formatCurrency(Number(reg.total_card_income))}</Table.Td>}
                  <Table.Td c="red">{formatCurrency(Number(reg.total_expenses))}</Table.Td>
                  {!isMobile && <Table.Td>{formatCurrency(Number(reg.expected_balance))}</Table.Td>}
                  <Table.Td fw={600}>
                    {reg.status === 'closed' ? formatCurrency(Number(reg.closing_balance)) : '-'}
                  </Table.Td>
                  <Table.Td>
                    {reg.status === 'closed' ? (
                      <Text c={Number(reg.difference) === 0 ? 'green' : 'orange'}>
                        {formatCurrency(Number(reg.difference))}
                      </Text>
                    ) : '-'}
                  </Table.Td>
                </Table.Tr>
              )
            })}
          </Table.Tbody>
        </Table>
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
