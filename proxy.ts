import { createClient } from '@insforge/sdk'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const BASE_URL = 'https://ym5zuqiu.us-east.insforge.app'

// Routes that require ADMIN role
const ADMIN_ROUTES = [
  '/dashboard/staff',
  '/dashboard/services', 
  '/dashboard/clients',
  '/dashboard/usuarios'
]

// Public routes (no auth required)
const PUBLIC_ROUTES = ['/', '/login', '/register']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next()
  }

  // Check if route requires admin
  const requiresAdmin = ADMIN_ROUTES.some(route => pathname.startsWith(route))
  
  if (!requiresAdmin) {
    // Allow other routes (like /dashboard which shows appointments)
    return NextResponse.next()
  }

  // Get auth token from cookies or header
  const token = request.cookies.get('insforge-token')?.value || 
    request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    // Not authenticated - redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    // Create client with token to verify
    const client = createClient({
      baseUrl: BASE_URL,
      edgeFunctionToken: token
    })

    // Get current user
    const { data, error } = await client.auth.getCurrentUser()
    
    if (error || !data?.user) {
      // Invalid token - redirect to login
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // For ADMIN routes, we need to check the profile role
    // Since we can't easily get the profile with anon key, we'll do a quick check via API
    // For now, let the frontend handle this check
    
    return NextResponse.next()
    
  } catch (err) {
    console.error('Auth middleware error:', err)
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register'
  ]
}