'use client'

import { useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { realtime, hasStoredCredentials, reauthenticate } from '@/lib/insforge'

const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initAuth, initialized } = useAuthStore()
  const { fetchAppointments, fetchServices, fetchStaff, fetchClients, fetchBlockedSlots, selectedDate, setSelectedDate } = useAppointmentStore()

  // Helper to get current selectedDate - avoids stale closure issue
  const getCurrentDate = () => useAppointmentStore.getState().selectedDate

  // Auto-refresh token every 5 minutes to keep session alive
  useEffect(() => {
    const refreshToken = async () => {
      if (hasStoredCredentials()) {
        try {
          await reauthenticate()
        } catch (err) {
          console.error('[AuthProvider] Token refresh failed:', err)
        }
      }
    }

    // Refresh token every 5 minutes
    const interval = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [initialized])

  useEffect(() => {
    initAuth()
  }, [initAuth])

  // Setup realtime subscriptions
  useEffect(() => {
    if (!initialized) return

    const setupRealtime = async () => {
      try {
        await realtime.connect()
        console.log('Realtime connected')
      } catch (err) {
        console.error('Realtime connection failed:', err)
        return
      }

      // Subscribe to appointments channel
      await realtime.subscribe('appointments')

      // Listen for appointment changes - use getCurrentDate() to avoid stale closure
      realtime.on('INSERT_appointment', () => fetchAppointments(getCurrentDate()))
      realtime.on('UPDATE_appointment', () => fetchAppointments(getCurrentDate()))
      realtime.on('DELETE_appointment', () => fetchAppointments(getCurrentDate()))

      // Subscribe to clients channel
      await realtime.subscribe('clients')

      realtime.on('INSERT_client', () => fetchClients())
      realtime.on('UPDATE_client', () => fetchClients())
      realtime.on('DELETE_client', () => fetchClients())

      // Subscribe to services channel
      await realtime.subscribe('services')

      realtime.on('INSERT_service', () => fetchServices())
      realtime.on('UPDATE_service', () => fetchServices())

      // Subscribe to staff channel
      await realtime.subscribe('staff')

      realtime.on('INSERT_staff', () => fetchStaff())
      realtime.on('UPDATE_staff', () => fetchStaff())
      realtime.on('DELETE_staff', () => fetchStaff())

      // Subscribe to blocked_slots channel
      await realtime.subscribe('blocked_slots')

      // Try different event formats
      realtime.on('INSERT', () => fetchBlockedSlots(getCurrentDate()))
      realtime.on('UPDATE', () => fetchBlockedSlots(getCurrentDate()))
      realtime.on('DELETE', () => fetchBlockedSlots(getCurrentDate()))
    }

    setupRealtime()

    return () => {
      realtime.disconnect()
    }
  }, [initialized, fetchAppointments, fetchServices, fetchStaff, fetchClients, fetchBlockedSlots])

  return <>{children}</>
}