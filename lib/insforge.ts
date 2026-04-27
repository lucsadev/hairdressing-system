import { createClient, type InsForgeClient } from '@insforge/sdk'

const BASE_URL = 'https://ym5zuqiu.us-east.insforge.app'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NjcwNTB9.0FLfMLjkOHiodDQB7gRhQBbiZXe7Yh_EybWelvMJ6nE'

let sessionToken: string | null = null

// Create the client - this will be recreated when token changes
let client: InsForgeClient = createClient({
  baseUrl: BASE_URL,
  anonKey: ANON_KEY
})

export const getSessionToken = () => sessionToken

// Set cookie for middleware access (HTTP-only for security)
export const setAuthCookie = (token: string | null) => {
  if (typeof document === 'undefined') return
  if (token) {
    document.cookie = `insforge-token=${token}; path=/; max-age=86400; SameSite=Strict`
  } else {
    document.cookie = 'insforge-token=; path=/; max-age=0'
  }
}

// Store for email/password to re-authenticate silently when token expires
// Persist to localStorage so credentials survive page refreshes
const CREDENTIALS_KEY = 'krear_auth_credentials'

let storedCredentials: { email: string; password: string } | null = null

// Load credentials from localStorage on module init
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(CREDENTIALS_KEY)
    console.log('[insforge] Loaded credentials from localStorage:', saved ? 'yes' : 'no')
    if (saved) {
      const parsed = JSON.parse(saved) as { email: string; password: string }
      storedCredentials = parsed
      console.log('[insforge] Stored credentials email:', storedCredentials.email)
    }
  } catch (e) {
    console.error('[insforge] Failed to load stored credentials:', e)
  }
}

export const storeCredentials = (email: string, password: string) => {
  console.log('[insforge] Storing credentials for:', email)
  storedCredentials = { email, password }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CREDENTIALS_KEY, JSON.stringify({ email, password }))
      console.log('[insforge] Credentials saved to localStorage')
    } catch (e) {
      console.error('[insforge] Failed to save credentials:', e)
    }
  }
}

export const clearCredentials = () => {
  console.log('[insforge] Clearing credentials')
  storedCredentials = null
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(CREDENTIALS_KEY)
    } catch (e) {
      console.error('[insforge] Failed to clear credentials:', e)
    }
  }
}

// Check if we have stored credentials for re-auth
export const hasStoredCredentials = () => {
  const has = storedCredentials !== null
  console.log('[insforge] hasStoredCredentials:', has)
  return has
}

// Re-authenticate with stored credentials to refresh expired token
export const reauthenticate = async (): Promise<boolean> => {
  console.log('[insforge] reauthenticate called, storedCredentials:', storedCredentials ? storedCredentials.email : 'null')

  if (!storedCredentials) {
    console.log('[insforge] No stored credentials to re-authenticate')
    // Last resort: try to get from localStorage directly
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CREDENTIALS_KEY)
        if (saved) {
          console.log('[insforge] Found credentials in localStorage during re-auth!')
          storedCredentials = JSON.parse(saved)
        }
      } catch (e) {
        console.error('[insforge] Failed to load credentials during re-auth:', e)
      }
    }

    if (!storedCredentials) {
      return false
    }
  }

  try {
    console.log('[insforge] Attempting silent re-authentication with:', storedCredentials.email)
    const { data, error } = await auth.signInWithPassword({
      email: storedCredentials.email,
      password: storedCredentials.password
    })

    if (error) {
      console.log('[insforge] Re-auth failed:', error.message)
      clearCredentials()
      return false
    }

    if (data?.accessToken) {
      console.log('[insforge] Re-auth successful!')
      setSessionToken(data.accessToken)
      return true
    }

    return false
  } catch (err) {
    console.error('[insforge] Re-auth error:', err)
    clearCredentials()
    return false
  }
}

export const setSessionToken = (token: string | null) => {
  sessionToken = token
  setAuthCookie(token)
  // Recreate client with the new session token so authenticated requests work
  client = createClient({
    baseUrl: BASE_URL,
    anonKey: ANON_KEY,
    edgeFunctionToken: token || undefined
  })
}

export const getClient = () => client

export const auth = {
  signUp: async (options: { email: string; password: string }) => client.auth.signUp(options),
  signInWithPassword: async (options: { email: string; password: string }) => client.auth.signInWithPassword(options),
  signOut: async () => client.auth.signOut(),
  getCurrentUser: async () => client.auth.getCurrentUser()
}

// Export database - supports both database('table') and database.from('table') patterns
// This works with Turbopack
// NOTE: Must use a function to always get current client, not captured at module load
export const database = {
  from: (table: string) => getClient().database.from(table)
}

// Also export realtime
export const realtime = {
  connect: () => client.realtime.connect(),
  subscribe: (channel: string) => client.realtime.subscribe(channel),
  on: (event: string, callback: (payload: any) => void) => client.realtime.on(event, callback),
  once: (event: string, callback: (payload: any) => void) => client.realtime.once(event, callback),
  publish: (channel: string, event: string, payload: any) => client.realtime.publish(channel, event, payload),
  unsubscribe: (channel: string) => client.realtime.unsubscribe(channel),
  disconnect: () => client.realtime.disconnect(),
  get isConnected() { return client.realtime.isConnected },
  get connectionState() { return client.realtime.connectionState }
}