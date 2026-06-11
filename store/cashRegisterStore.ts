import { create } from 'zustand'
import dayjs from 'dayjs'
import { database } from '@/lib/insforge'
import { getDayRangeUTC } from './dateUtils'

export interface CashRegister {
  id: string
  date: string
  opening_balance: number
  closing_balance: number
  total_cash_income: number
  total_card_income: number
  total_expenses: number
  expected_balance: number
  difference: number
  status: 'open' | 'closed'
  notes: string | null
  opened_by: string | null
  closed_by: string | null
  opened_at: string
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: string
  payment_method: 'cash' | 'card' | 'transfer'
  date: string
  notes: string | null
  created_at: string
}

export interface MonthlySummary {
  month: string
  total_cash_income: number
  total_card_income: number
  total_expenses: number
  total_income: number
  net: number
}

export interface YearlySummary {
  year: string
  months: MonthlySummary[]
  total_cash_income: number
  total_card_income: number
  total_expenses: number
  total_income: number
  net: number
}

const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Alquiler' },
  { value: 'utilities', label: 'Servicios' },
  { value: 'salaries', label: 'Sueldos' },
  { value: 'supplies', label: 'Insumos' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Otros' },
]

export { EXPENSE_CATEGORIES }

interface CashRegisterState {
  currentRegister: CashRegister | null
  expenses: Expense[]
  history: CashRegister[]
  loading: boolean

  fetchOrCreateRegister: (date: string) => Promise<void>
  openRegister: (date: string, openingBalance: number) => Promise<{ error: string | null }>
  closeRegister: (id: string, closingBalance: number, notes?: string) => Promise<{ error: string | null }>
  refreshRegister: (date: string) => Promise<void>

  fetchExpenses: (date: string) => Promise<void>
  createExpense: (data: Omit<Expense, 'id' | 'created_at'>) => Promise<{ error: string | null }>
  updateExpense: (id: string, data: Partial<Expense>) => Promise<{ error: string | null }>
  deleteExpense: (id: string) => Promise<{ error: string | null }>

  fetchHistory: (year?: number, month?: number) => Promise<void>
}

export const useCashRegisterStore = create<CashRegisterState>((set, get) => ({
  currentRegister: null,
  expenses: [],
  history: [],
  loading: false,

  fetchOrCreateRegister: async (date: string) => {
    set({ loading: true })
    try {
      const { data, error } = await database
        .from('cash_register')
        .select('*')
        .eq('date', date)
        .maybeSingle()

      if (error) {
        console.error('Error fetching cash register:', error)
        return
      }

      if (data) {
        set({ currentRegister: data as CashRegister })
      } else {
        set({ currentRegister: null })
      }
    } catch (err) {
      console.error('Error in fetchOrCreateRegister:', err)
    } finally {
      set({ loading: false })
    }
  },

  openRegister: async (date: string, openingBalance: number) => {
    try {
      const { error } = await database
        .from('cash_register')
        .insert([{
          date,
          opening_balance: openingBalance,
          status: 'open'
        }])

      if (error) return { error: error.message }

      await get().fetchOrCreateRegister(date)
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Error al abrir caja' }
    }
  },

  closeRegister: async (id: string, closingBalance: number, notes?: string) => {
    try {
      const register = get().currentRegister
      if (!register) return { error: 'No hay caja abierta' }

      const expected = register.expected_balance
      const difference = closingBalance - expected

      const { error } = await database
        .from('cash_register')
        .update({
          closing_balance: closingBalance,
          difference,
          status: 'closed',
          notes: notes || null,
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) return { error: error.message }

      await get().refreshRegister(register.date)
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Error al cerrar caja' }
    }
  },

  refreshRegister: async (date: string) => {
    try {
      const dayStart = dayjs(date).startOf('day').toISOString()
      const dayEnd = dayjs(date).endOf('day').toISOString()

      const [ticketsRes, ordersRes, expensesRes] = await Promise.all([
        database.from('tickets').select('total_amount, payment_method').gte('created_at', dayStart).lte('created_at', dayEnd).eq('status', 'completed'),
        database.from('orders').select('amount, payment_method, pay').gte('created_at', dayStart).lte('created_at', dayEnd),
        database.from('expenses').select('amount, payment_method').gte('created_at', dayStart).lte('created_at', dayEnd),
      ])

      const tickets = ticketsRes.data || []
      const orders = ordersRes.data || []
      const expenses = expensesRes.data || []

      const totalCashIncome = tickets
        .filter((t: any) => t.payment_method === 'cash')
        .reduce((sum: number, t: any) => sum + Number(t.total_amount), 0)

      const totalCardIncome = tickets
        .filter((t: any) => t.payment_method === 'card')
        .reduce((sum: number, t: any) => sum + Number(t.total_amount), 0)

      const cashExpenses = [...orders.filter((o: any) => o.pay), ...expenses]
        .filter((e: any) => e.payment_method === 'cash')
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0)

      const totalExpenses = [...orders.filter((o: any) => o.pay), ...expenses]
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0)

      const register = get().currentRegister
      if (!register) return

      const openingBalance = register.opening_balance
      const expectedBalance = openingBalance + totalCashIncome - cashExpenses

      const { error } = await database
        .from('cash_register')
        .update({
          total_cash_income: totalCashIncome,
          total_card_income: totalCardIncome,
          total_expenses: totalExpenses,
          expected_balance: expectedBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', register.id)

      if (!error) {
        await get().fetchOrCreateRegister(date)
      }
    } catch (err) {
      console.error('Error refreshing register:', err)
    }
  },

  fetchExpenses: async (date: string) => {
    try {
      const dayStart = dayjs(date).startOf('day').toISOString()
      const dayEnd = dayjs(date).endOf('day').toISOString()

      const { data, error } = await database
        .from('expenses')
        .select('*')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .order('created_at', { ascending: false })

      if (!error && data) {
        set({ expenses: data as Expense[] })
      }
    } catch (err) {
      console.error('Error fetching expenses:', err)
    }
  },

  createExpense: async (data) => {
    try {
      const { error } = await database
        .from('expenses')
        .insert([data])

      if (error) return { error: error.message }

      const register = get().currentRegister
      if (register) {
        await get().refreshRegister(register.date)
      }
      await get().fetchExpenses(data.date)
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Error al crear gasto' }
    }
  },

  updateExpense: async (id, data) => {
    try {
      const { error } = await database
        .from('expenses')
        .update(data)
        .eq('id', id)

      if (error) return { error: error.message }

      const register = get().currentRegister
      if (register) {
        await get().refreshRegister(register.date)
      }
      const expense = get().expenses.find(e => e.id === id)
      if (expense) {
        await get().fetchExpenses(expense.date)
      }
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Error al actualizar gasto' }
    }
  },

  deleteExpense: async (id) => {
    try {
      const expense = get().expenses.find(e => e.id === id)
      const { error } = await database
        .from('expenses')
        .delete()
        .eq('id', id)

      if (error) return { error: error.message }

      const register = get().currentRegister
      if (register) {
        await get().refreshRegister(register.date)
      }
      set(state => ({
        expenses: state.expenses.filter(e => e.id !== id)
      }))
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Error al eliminar gasto' }
    }
  },

  fetchHistory: async (year?: number, month?: number) => {
    set({ loading: true })
    try {
      let query = database
        .from('cash_register')
        .select('*')
        .order('date', { ascending: false })

      if (year && month) {
        const monthStr = String(month).padStart(2, '0')
        const startDate = `${year}-${monthStr}-01`
        const lastDay = dayjs(`${year}-${monthStr}-01`).endOf('month').format('YYYY-MM-DD')
        query = query.gte('date', startDate).lte('date', lastDay)
      } else if (year) {
        query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
      }

      const { data, error } = await query

      if (!error && data) {
        set({ history: data as CashRegister[] })
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    } finally {
      set({ loading: false })
    }
  }
}))
