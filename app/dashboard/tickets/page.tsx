'use client'

import { useEffect, useState } from 'react'
import {
  Table, Badge, Group, Text, Box,
  Title, TextInput
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconSearch } from '@tabler/icons-react'
import { useAppointmentStore, Ticket } from '@/store/appointmentStore'
import { TicketModal } from '@/components/TicketModal'
import dayjs from 'dayjs'

export default function TicketsPage() {
  const { tickets, clients, services, fetchTickets, fetchClients, fetchServices } = useAppointmentStore()
  const [isClient, setIsClient] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const isMobile = useMediaQuery('(max-width: 500px)')

  useEffect(() => {
    setIsClient(true)
    fetchTickets()
    fetchClients()
    fetchServices()
  }, [])

  // Get client name by id
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    return client?.name || 'Cliente desconocido'
  }

  // Filter tickets by search and current date
  const filteredTickets = tickets.filter(ticket => {
    // Filter by current date
    const ticketDate = dayjs(ticket.created_at).format('YYYY-MM-DD')
    const today = dayjs().format('YYYY-MM-DD')
    if (ticketDate !== today) return false

    if (!searchQuery) return true
    const clientName = getClientName(ticket.client_id).toLowerCase()
    return clientName.includes(searchQuery.toLowerCase())
  })

  // Sort tickets by date (newest first)
  const sortedTickets = [...filteredTickets].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  if (!isClient) {
    return null
  }

  return (
    <Box p="md">
      <Title order={2} mb="md">Tickets</Title>

      <TextInput
        placeholder="Buscar por cliente..."
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        mb="md"
      />

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Cliente</Table.Th>
            {!isMobile && <Table.Th>Fecha</Table.Th>}
            {!isMobile && <Table.Th>Método</Table.Th>}
            <Table.Th>Total</Table.Th>
            <Table.Th>Status</Table.Th>
            {!isMobile && <Table.Th>Items</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedTickets.map(ticket => (
            <Table.Tr
              key={ticket.id}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedTicket(ticket)}
            >
              <Table.Td>
                <Text fw={500}>{getClientName(ticket.client_id)}</Text>
              </Table.Td>
              {!isMobile && (
                <Table.Td>
                  <Text size="sm">
                    {dayjs(ticket.created_at).format('DD/MM/YYYY HH:mm')}
                  </Text>
                </Table.Td>
              )}
              {!isMobile && (
                <Table.Td>
                  <Badge color={ticket.payment_method === 'cash' ? 'green' : 'blue'}>
                    {ticket.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}
                  </Badge>
                </Table.Td>
              )}
              <Table.Td>
                <Text fw={600}>${ticket.total_amount.toLocaleString('es-AR')}</Text>
              </Table.Td>
              <Table.Td>
                <Badge
                  color={
                    ticket.status === 'completed' ? 'green' :
                    ticket.status === 'cancelled' ? 'red' : 'yellow'
                  }
                >
                  {ticket.status}
                </Badge>
              </Table.Td>
              {!isMobile && (
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {ticket.ticket_items?.length || 0} items
                  </Text>
                </Table.Td>
              )}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {sortedTickets.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          No hay tickets registrados
        </Text>
      )}

      {/* Edit Ticket Modal */}
      <TicketModal
        opened={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        mode="edit"
        ticket={selectedTicket}
        clientName={selectedTicket ? getClientName(selectedTicket.client_id) : undefined}
        onTicketUpdated={() => {
          fetchTickets()
          setSelectedTicket(null)
        }}
      />
    </Box>
  )
}