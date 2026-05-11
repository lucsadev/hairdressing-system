import { create } from 'zustand'
import dayjs from 'dayjs'
import { database } from '@/lib/insforge'
import { useAuthStore } from '@/store/authStore'
import { getDayRangeUTC, parseLocalTime } from './dateUtils'

export interface Client {
  id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  created_at: string
}

export interface Service {
  id: string
  name: string
  color: string
  duration_minutes: number
  cash: number
  card: number
}

export interface Staff {
  id: string
  name: string
  address: string | null
  phone: string | null
  color: string
  is_active: boolean
}

export interface BlockedSlot {
  id: string
  staff_id: string
  start_time: string
  end_time: string
  reason: string | null
  created_at: string
}

export interface Ticket {
  id: string
  client_id: string
  appointment_id: string | null
  payment_method: 'cash' | 'card'
  total_amount: number
  status: 'pending' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
  ticket_items?: TicketItem[]
}

export interface TicketItem {
  id: string
  ticket_id: string
  service_id: string | null
  unit_price: number
  subtotal: number
  is_extra: boolean
  created_at: string
}

export interface Appointment {
  id: string
  user_id: string
  service_id: string
  staff_id: string | null
  client_id: string
  start_time: string
  end_time: string
  notes: string | null
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  created_at: string
  services?: Service
  staff?: Staff
  clients?: Client
}

interface AppointmentState {
  appointments: Appointment[]
  services: Service[]
  staff: Staff[]
  clients: Client[]
  blockedSlots: BlockedSlot[]
  tickets: Ticket[]
  ticketItems: TicketItem[]
  loading: boolean
  selectedDate: Date
  selectedStaffId: string | null // Para filtrar por staff en móvil
  fetchAppointments: (date: Date) => Promise<void>
  fetchServices: () => Promise<void>
  fetchStaff: () => Promise<void>
  fetchClients: () => Promise<void>
  fetchBlockedSlots: (date: Date) => Promise<void>
  fetchTickets: () => Promise<void>
  createTicket: (data: { client_id: string; appointment_id?: string; payment_method: 'cash' | 'card'; notes?: string; items: Omit<TicketItem, 'id' | 'ticket_id' | 'created_at'>[] }) => Promise<{ error: string | null; ticketId: string | null }>
  updateTicket: (id: string, data: Partial<Ticket>) => Promise<{ error: string | null }>
  deleteTicket: (id: string) => Promise<{ error: string | null }>
  createAppointment: (data: Partial<Appointment>) => Promise<{ error: string | null }>
  updateAppointment: (id: string, data: Partial<Appointment>) => Promise<{ error: string | null }>
  deleteAppointment: (id: string) => Promise<{ error: string | null }>
  moveAppointment: (id: string, newStartTime: string, newStaffId?: string) => Promise<{ error: string | null }>
  createBlockedSlot: (staffId: string, startTime: string, endTime: string, reason?: string) => Promise<{ error: string | null }>
  deleteBlockedSlot: (id: string) => Promise<{ error: string | null }>
  isSlotBlocked: (staffId: string, time: string) => boolean
  isTimeRangeBlocked: (staffId: string, startTime: string, endTime: string) => boolean
  setSelectedDate: (date: Date) => void
  setSelectedStaffId: (id: string | null) => void
  createStaff: (data: Partial<Staff>) => Promise<{ error: string | null }>
  updateStaff: (id: string, data: Partial<Staff>) => Promise<{ error: string | null }>
  deleteStaff: (id: string) => Promise<{ error: string | null }>
  createClient: (data: Partial<Client>) => Promise<{ error: string | null; clientId: string | null }>
}

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  appointments: [],
  services: [],
  staff: [],
  clients: [],
  blockedSlots: [],
  tickets: [],
  ticketItems: [],
  loading: false,
  // Always use midnight local time to avoid timezone issues
  selectedDate: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0, 0, 0, 0),
  selectedStaffId: null,

  setSelectedStaffId: (id) => set({ selectedStaffId: id }),

  fetchBlockedSlots: async (date: Date) => {
    try {
      const { start, end } = getDayRangeUTC(date)
      
      const { data, error } = await database
        .from('blocked_slots')
        .select('*')
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
      
      if (error) {
        console.error('Error fetching blocked slots:', error)
        return
      }
      
      set({ blockedSlots: data || [] })
    } catch (err) {
      console.error('Error fetching blocked slots:', err)
    }
  },

  createBlockedSlot: async (staffId: string, startTime: string, endTime: string, reason?: string) => {
    try {
      const { error } = await database
        .from('blocked_slots')
        .insert([{
          staff_id: staffId,
          start_time: startTime,
          end_time: endTime,
          reason: reason || null
        }])
      
      if (error) {
        return { error: error.message }
      }
      
      const { selectedDate } = get()
      await get().fetchBlockedSlots(selectedDate)
      
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Failed to block slot' }
    }
  },

  deleteBlockedSlot: async (id: string) => {
    try {
      const { error } = await database
        .from('blocked_slots')
        .delete()
        .eq('id', id)
      
      if (error) {
        return { error: error.message }
      }
      
      set(state => ({
        blockedSlots: state.blockedSlots.filter(s => s.id !== id)
      }))
      
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Failed to unblock slot' }
    }
  },

  isSlotBlocked: (staffId: string, time: string) => {
    const { blockedSlots } = get()
    const checkTime = dayjs(time)
    
    return blockedSlots.some(slot => 
      slot.staff_id === staffId &&
      checkTime.isAfter(dayjs(slot.start_time)) &&
      checkTime.isBefore(dayjs(slot.end_time))
    )
  },

  isTimeRangeBlocked: (staffId: string, startTime: string, endTime: string) => {
    const { blockedSlots } = get()
    const start = dayjs(startTime)
    const end = dayjs(endTime)
    
    return blockedSlots.some(slot => {
      const slotStart = dayjs(slot.start_time)
      const slotEnd = dayjs(slot.end_time)
      
      // Check if ranges overlap
      return slot.staff_id === staffId &&
        start.isBefore(slotEnd) && 
        end.isAfter(slotStart)
    })
  },

  fetchStaff: async () => {
    try {
      const { data, error } = await database
        .from('staff')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (error) {
        console.error('Error fetching staff:', error)
        return
      }
      
      set({ staff: data || [] })
    } catch (err) {
      console.error('Error fetching staff:', err)
    }
  },

  fetchServices: async () => {
    try {
      const { data, error } = await database
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (error) {
        console.error('Error fetching services:', error)
        return
      }
      
      set({ services: data || [] })
    } catch (err) {
      console.error('Error fetching services:', err)
    }
  },

fetchAppointments: async (date: Date) => {
    set({ loading: true })
    try {
      const { start, end } = getDayRangeUTC(date)
      
      const { data, error } = await database
        .from('appointments')
        .select('*, services(*), staff(*), clients(*)')
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .neq('status', 'cancelled')
        .order('start_time')
      
      if (error) {
        console.error('Error fetching appointments:', error)
        return
      }
      
      set({ appointments: data || [] })
    } catch (err) {
      console.error('Error fetching appointments:', err)
    } finally {
      set({ loading: false })
    }
  },

  createAppointment: async (data: Partial<Appointment>) => {
    try {
      const user = useAuthStore.getState().user
      if (!user) {
        return { error: 'User not authenticated' }
      }
      
      const appointmentData = {
        ...data,
        user_id: user.id
      }
      
      const { error } = await database
        .from('appointments')
        .insert([appointmentData])
      
      if (error) {
        return { error: error.message }
      }
      
      const { selectedDate } = get()
      await get().fetchAppointments(selectedDate)
      
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Failed to create appointment' }
    }
  },

  updateAppointment: async (id: string, data: Partial<Appointment>) => {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      }
      
      const { data: result, error } = await database
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .select()
      
      if (error) {
        return { error: error.message }
      }
      
      const { selectedDate } = get()
      await get().fetchAppointments(selectedDate)
      
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Failed to update appointment' }
    }
  },

  deleteAppointment: async (id: string) => {
    try {
      const { error } = await database
        .from('appointments')
        .delete()
        .eq('id', id)
      
      if (error) {
        return { error: error.message }
      }
      
      set(state => ({
        appointments: state.appointments.filter(a => a.id !== id)
      }))
      
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Failed to delete appointment' }
    }
  },

  moveAppointment: async (id: string, newStartTime: string, newStaffId?: string) => {
    const { appointments } = get()
    const appointment = appointments.find(a => a.id === id)
    
    if (!appointment) {
      return { error: 'Appointment not found' }
    }
    
    // Preserve the original duration from the appointment itself
    const originalStart = dayjs(appointment.start_time)
    const originalEnd = dayjs(appointment.end_time)
    const durationMinutes = originalEnd.diff(originalStart, 'minute')
    
    const newStart = dayjs(newStartTime)
    const newEnd = newStart.add(durationMinutes, 'minute')
    
    const updateData: Partial<Appointment> = {
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString()
    }
    
    if (newStaffId) {
      updateData.staff_id = newStaffId
    }
    
    return get().updateAppointment(id, updateData)
  },

  setSelectedDate: (date: Date) => {
    // Ensure date is always at midnight to avoid timezone issues
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    set({ selectedDate: d })
  },

  createStaff: async (data: Partial<Staff>) => {
    try {
      const { error } = await database
        .from('staff')
        .insert([data])
      
      if (error) {
        return { error: error.message }
      }
      
      await get().fetchStaff()
      
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Failed to create staff' }
    }
  },

  updateStaff: async (id: string, data: Partial<Staff>) => {
    try {
      const { error } = await database
        .from('staff')
        .update(data)
        .eq('id', id)
      
      if (error) {
        return { error: error.message }
      }
      
      await get().fetchStaff()
      
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Failed to update staff' }
    }
  },

  deleteStaff: async (id: string) => {
    try {
      const { error } = await database
        .from('staff')
        .update({ is_active: false })
        .eq('id', id)
      
      if (error) {
        return { error: error.message }
      }
      
      await get().fetchStaff()
      
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Failed to delete staff' }
    }
  },

  fetchClients: async () => {
    try {
      const { data, error } = await database
        .from('clients')
        .select('*')
        .order('name')
      
      if (error) {
        console.error('Error fetching clients:', error)
        return
      }
      
      set({ clients: data || [] })
    } catch (err) {
      console.error('Error fetching clients:', err)
    }
  },

  createClient: async (data: Partial<Client>) => {
    try {
      const { data: insertedData, error } = await database
        .from('clients')
        .insert([data])
        .select()
      
      if (error) {
        return { error: error.message, clientId: null }
      }
      
      await get().fetchClients()
      
      return { error: null, clientId: insertedData?.[0]?.id || null }
    } catch (err: any) {
      return { error: err.message || 'Failed to create client', clientId: null }
    }
  },

  fetchTickets: async () => {
    try {
      const { data, error } = await database
        .from('tickets')
        .select('*, ticket_items(*)')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching tickets:', error)
        return
      }

      set({ tickets: data || [] })
    } catch (err) {
      console.error('Error fetching tickets:', err)
    }
  },

  createTicket: async (data: { client_id: string; appointment_id?: string; payment_method: 'cash' | 'card'; notes?: string; items: Omit<TicketItem, 'id' | 'ticket_id' | 'created_at'>[] }) => {
    try {
      // Calculate total
      const total = data.items.reduce((sum, item) => sum + item.subtotal, 0)

      // Insert ticket
      const { data: ticketData, error: ticketError } = await database
        .from('tickets')
        .insert([{
          client_id: data.client_id,
          appointment_id: data.appointment_id || null,
          payment_method: data.payment_method,
          total_amount: total,
          status: 'pending',
          notes: data.notes || null
        }])
        .select()
        .single()

      if (ticketError) {
        return { error: ticketError.message, ticketId: null }
      }

      // Insert ticket items with the ticket_id
      const ticketId = ticketData.id
      const itemsWithTicketId = data.items.map(item => ({
        ...item,
        ticket_id: ticketId
      }))

      const { error: itemsError } = await database
        .from('ticket_items')
        .insert(itemsWithTicketId)

      if (itemsError) {
        // Rollback: delete the ticket
        await database.from('tickets').delete().eq('id', ticketId)
        return { error: itemsError.message, ticketId: null }
      }

      await get().fetchTickets()
      return { error: null, ticketId }
    } catch (err: any) {
      return { error: err.message || 'Failed to create ticket', ticketId: null }
    }
  },

  updateTicket: async (id: string, data: Partial<Ticket>) => {
    try {
      const updateData = { ...data, updated_at: new Date().toISOString() }
      const { error } = await database
        .from('tickets')
        .update(updateData)
        .eq('id', id)

      if (error) {
        return { error: error.message }
      }

      await get().fetchTickets()
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Failed to update ticket' }
    }
  },

  deleteTicket: async (id: string) => {
    try {
      const { error } = await database
        .from('tickets')
        .delete()
        .eq('id', id)

      if (error) {
        return { error: error.message }
      }

      await get().fetchTickets()
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Failed to delete ticket' }
    }
  }
}))
