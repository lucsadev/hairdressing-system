import { create } from 'zustand'
import { auth, setSessionToken, setAuthCookie, database, storeCredentials, clearCredentials, reauthenticate } from '@/lib/insforge'

interface User {
  id: string
  email: string
  email_confirmed_at: string | null
  role?: 'ADMIN' | 'USER'
}

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  sessionExpired: boolean // True when token expired and re-auth failed
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  initAuth: () => Promise<void>
  clearSessionExpired: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,
  sessionExpired: false,

  clearSessionExpired: () => set({ sessionExpired: false }),

  signUp: async (email: string, password: string, fullName?: string) => {
    set({ loading: true })
    try {
      const { data, error } = await auth.signUp({
        email,
        password
      })
      
      if (error) {
        return { error: error.message }
      }
      
      if (data?.user) {
        set({ user: { id: data.user.id, email: data.user.email!, email_confirmed_at: null } })
        if (data.accessToken) {
          setSessionToken(data.accessToken)
        }
      }
      
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Signup failed' }
    } finally {
      set({ loading: false })
    }
  },

signIn: async (email: string, password: string) => {
    set({ loading: true })
    try {
      const { data, error } = await auth.signInWithPassword({
        email,
        password
      })

      console.log('signIn data:', data)

      if (error) {
        return { error: error.message }
      }

      if (data?.user) {
        // Store credentials for silent re-auth when token expires
        console.log('[authStore] About to store credentials:', email)
        storeCredentials(email, password)
        console.log('[authStore] Credentials stored')

        // Set token FIRST so database requests work
        if (data.accessToken) {
          console.log('signIn - accessToken:', data.accessToken)
          setSessionToken(data.accessToken)
        }

        // Now fetch role from profiles table (token is set)
        try {
          const { data: profiles, error: profileError } = await database.from('profiles').select('role').eq('email', email).single()
          console.log('profile data:', profiles, 'error:', profileError)
          const role = profiles?.role as 'ADMIN' | 'USER'

          set({ user: { id: data.user.id, email: data.user.email!, email_confirmed_at: null, role }, initialized: true, sessionExpired: false })
        } catch (profileErr) {
          console.error('Profile fetch error:', profileErr)
          // Set user without role if profile fetch fails
          set({ user: { id: data.user.id, email: data.user.email!, email_confirmed_at: null }, initialized: true, sessionExpired: false })
        }
      }

      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Signin failed' }
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    set({ loading: true })
    try {
      await auth.signOut()
      clearCredentials() // Clear stored credentials on sign out
      set({ user: null })
      setSessionToken(null)
    } catch (err) {
      console.error('SignOut error:', err)
    } finally {
      set({ loading: false })
    }
  },

  initAuth: async () => {
    // Skip if already initialized with a user
    if (get().initialized && get().user) return

    // Always try to get the current user, even if already initialized
    try {
      const { data: { user }, error } = await auth.getCurrentUser()

      if (error) {
        console.error('getCurrentUser error:', error)
        // Token might be expired - try to re-authenticate with stored credentials
        const reauthed = await reauthenticate()
        if (reauthed) {
          // Re-fetch user after successful re-auth
          const retry = await auth.getCurrentUser()
          if (retry.data?.user) {
            try {
              const { data: profiles } = await database.from('profiles').select('role').eq('email', retry.data.user.email!).single()
              const role = profiles?.role as 'ADMIN' | 'USER'
              set({ user: { id: retry.data.user.id, email: retry.data.user.email!, email_confirmed_at: null, role }, initialized: true })
            } catch {
              set({ user: { id: retry.data.user.id, email: retry.data.user.email!, email_confirmed_at: null }, initialized: true })
            }
            return
          }
        }
        // If re-auth failed, clear everything and signal session expired
        console.log('[authStore] Session expired, user needs to re-login')
        clearCredentials()
        setSessionToken(null)
        set({ user: null, initialized: true, sessionExpired: true })
        return
      }

      if (user) {
        // Fetch role from profiles
        try {
          const { data: profiles } = await database.from('profiles').select('role').eq('email', user.email!).single()
          const role = profiles?.role as 'ADMIN' | 'USER'
          console.log('initAuth - got user with role:', role)
          set({ user: { id: user.id, email: user.email!, email_confirmed_at: null, role }, initialized: true })
        } catch (profileErr) {
          console.error('Profile fetch error in initAuth:', profileErr)
          set({ user: { id: user.id, email: user.email!, email_confirmed_at: null }, initialized: true })
        }
      } else {
        set({ initialized: true })
      }
    } catch (err) {
      console.error('Init auth error:', err)
      set({ initialized: true })
    }
  }
}))
