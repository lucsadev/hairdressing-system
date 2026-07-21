import { create } from 'zustand'
import { auth, setSessionToken, setAuthCookie, database, storeCredentials, clearCredentials, reauthenticate, hasStoredCredentials } from '@/lib/insforge'

const SESSION_KEY = 'krear_session'

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
        let userRole: 'ADMIN' | 'USER' | undefined = undefined
        
        // After signup, fetch role from profiles table
        try {
          const { data: profiles } = await database
            .from('profiles')
            .select('role')
            .ilike('email', email)
            .single()
          
          if (profiles?.role) {
            userRole = profiles.role as 'ADMIN' | 'USER'
            console.log('[authStore] Found user role during signup:', userRole)
          }
        } catch (profileErr) {
          console.log('Profile fetch error during signup:', profileErr)
        }
        
        // Set user with role if found
        const userObject: any = { id: data.user.id, email: data.user.email!, email_confirmed_at: null }
        if (userRole) {
          userObject.role = userRole
        }
        
        set({ user: userObject })
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

        // Mark this tab session as active (survives refresh, cleared on tab close)
        try { sessionStorage.setItem(SESSION_KEY, 'active') } catch {} 

        // Set token FIRST so database requests work
        if (data.accessToken) {
          console.log('signIn - accessToken:', data.accessToken)
          setSessionToken(data.accessToken)
        }

        // Now fetch role from profiles table (token is set)
        try {
          const { data: profiles, error: profileError } = await database.from('profiles').select('role').ilike('email', email).single()
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
      try { sessionStorage.removeItem(SESSION_KEY) } catch {}
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
        // Check if it's a "no refresh token" error - normal for new visitors
        const errorMsg = error?.message || String(error).replace(/^Error:\s*/, '')
        const noRefreshToken = errorMsg.includes('No refresh token') || 
                              errorMsg.includes('no refresh token')
        
        // If it's a "no refresh token" error with no stored credentials, this is a new visitor
        if (noRefreshToken && !hasStoredCredentials()) {
          set({ user: null, initialized: true, sessionExpired: false })
          return
        }
        
        // If sessionStorage flag is missing, this is a new tab/window → don't auto-login
        const hasSession = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === 'active'
        if (!hasSession) {
          clearCredentials()
          setSessionToken(null)
          set({ user: null, initialized: true, sessionExpired: false })
          return
        }

        // Otherwise try to re-authenticate with stored credentials
        const reauthed = await reauthenticate()
        if (reauthed) {
          // Re-fetch user after successful re-auth
          const retry = await auth.getCurrentUser()
          if (retry.data?.user) {
            try {
              const { data: profiles } = await database.from('profiles').select('role').ilike('email', retry.data.user.email!).single()
              const role = profiles?.role as 'ADMIN' | 'USER'
              set({ user: { id: retry.data.user.id, email: retry.data.user.email!, email_confirmed_at: null, role }, initialized: true })
            } catch {
              set({ user: { id: retry.data.user.id, email: retry.data.user.email!, email_confirmed_at: null }, initialized: true })
            }
            return
          }
        }
        
        // Session expired
        clearCredentials()
        setSessionToken(null)
        set({ user: null, initialized: true, sessionExpired: true })
        return
      }

      if (user) {
        // Mark this tab session so refresh vs. new-tab works
        try { sessionStorage.setItem(SESSION_KEY, 'active') } catch {}

        // Fetch role from profiles
        try {
          const { data: profiles } = await database.from('profiles').select('role').ilike('email', user.email!).single()
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
