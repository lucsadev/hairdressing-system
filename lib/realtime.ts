import { io, type Socket } from 'socket.io-client'

const BASE_URL = 'https://ym5zuqiu.us-east.insforge.app'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NjcwNTB9.0FLfMLjkOHiodDQB7gRhQBbiZXe7Yh_EybWelvMJ6nE'

class RealtimeClient {
  private socket: Socket | null = null
  private connectPromise: Promise<void> | null = null
  private subscribedChannels = new Set<string>()
  private eventListeners = new Map<string, Set<(...args: any[]) => void>>()
  private token: string | null = null

  async connect(): Promise<void> {
    if (this.socket?.connected) return
    if (this.connectPromise) return this.connectPromise

    this.connectPromise = new Promise((resolve, reject) => {
      this.socket = io(BASE_URL, {
        transports: ['websocket', 'polling'],
        auth: { token: this.token ?? ANON_KEY },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      })

      let initialConnection = true
      const timeout = setTimeout(() => {
        if (initialConnection) {
          initialConnection = false
          this.connectPromise = null
          this.socket?.disconnect()
          this.socket = null
          reject(new Error('Connection timeout after 10000ms'))
        }
      }, 10000)

      this.socket.on('connect', () => {
        clearTimeout(timeout)
        // Re-subscribe all channels on (re)connect
        for (const channel of this.subscribedChannels) {
          this.socket!.emit('realtime:subscribe', { channel })
        }
        this.notifyListeners('connect')
        if (initialConnection) {
          initialConnection = false
          this.connectPromise = null
          resolve()
        }
      })

      this.socket.on('connect_error', (error) => {
        clearTimeout(timeout)
        this.notifyListeners('connect_error', error)
        if (initialConnection) {
          initialConnection = false
          this.connectPromise = null
          reject(error)
        }
      })

      this.socket.on('disconnect', (reason) => {
        this.notifyListeners('disconnect', reason)
      })

      this.socket.on('realtime:error', (error) => {
        this.notifyListeners('error', error)
      })

      // Forward all other server events (INSERT_appointment, etc.)
      this.socket.onAny((event, message) => {
        if (event === 'realtime:error') return
        this.notifyListeners(event, message)
      })
    })

    return this.connectPromise
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.subscribedChannels.clear()
  }

  async subscribe(channel: string): Promise<{ ok: boolean; channel: string; error?: { code: string; message: string } }> {
    if (this.subscribedChannels.has(channel)) {
      return { ok: true, channel }
    }
    if (!this.socket?.connected) {
      try {
        await this.connect()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Connection failed'
        return { ok: false, channel, error: { code: 'CONNECTION_FAILED', message } }
      }
    }
    return new Promise((resolve) => {
      this.socket!.emit('realtime:subscribe', { channel }, (response: any) => {
        if (response?.ok) {
          this.subscribedChannels.add(channel)
        }
        resolve(response || { ok: true, channel })
      })
    })
  }

  unsubscribe(channel: string): void {
    this.subscribedChannels.delete(channel)
    if (this.socket?.connected) {
      this.socket.emit('realtime:unsubscribe', { channel })
    }
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  off(event: string, callback: (...args: any[]) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
      if (listeners.size === 0) {
        this.eventListeners.delete(event)
      }
    }
  }

  once(event: string, callback: (...args: any[]) => void): void {
    const wrapper = (payload: any) => {
      this.off(event, wrapper)
      callback(payload)
    }
    this.on(event, wrapper)
  }

  async publish(channel: string, event: string, payload: any): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Not connected to realtime server. Call connect() first.')
    }
    this.socket.emit('realtime:publish', { channel, event, payload })
  }

  updateAuth(token: string | null): void {
    this.token = token
    if (this.socket) {
      this.socket.auth = { token: token ?? ANON_KEY }
      if (this.socket.connected || this.connectPromise) {
        this.socket.disconnect()
        this.socket.connect()
      }
    }
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  get connectionState(): string {
    if (!this.socket) return 'disconnected'
    if (this.socket.connected) return 'connected'
    return 'connecting'
  }

  private notifyListeners(event: string, payload?: any): void {
    const listeners = this.eventListeners.get(event)
    if (!listeners) return
    for (const cb of listeners) {
      try {
        cb(payload)
      } catch (err) {
        console.error(`Error in ${event} callback:`, err)
      }
    }
  }
}

export const realtime = new RealtimeClient()
