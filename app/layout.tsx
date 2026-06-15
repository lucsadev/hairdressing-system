import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { AuthProvider } from './providers'

export const metadata: Metadata = {
  title: 'Peluquería Krear - Gestión de Turnos',
  description: 'Sistema de gestión de turnos y caja para Peluquería Krear',
  manifest: '/manifest.json',
  icons: {
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Krear',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#14b8a6',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Imperial+Script&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Krear" />
      </head>
      <body>
        <MantineProvider
          theme={{
            primaryColor: 'cyan',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            colors: {
              cyan: [
                'oklch(85% 0.143 215.221)',
                'oklch(80% 0.143 215.221)',
                'oklch(75% 0.143 215.221)',
                'oklch(71.5% 0.143 215.221)',
                'oklch(68% 0.14 215.221)',
                'oklch(65% 0.14 215.221)',
                'oklch(60% 0.135 215.221)',
                'oklch(55% 0.13 215.221)',
                'oklch(50% 0.125 215.221)',
                'oklch(45% 0.12 215.221)',
              ],
              orange: [
                'oklch(75% 0.245 27.325)',
                'oklch(70% 0.245 27.325)',
                'oklch(65% 0.245 27.325)',
                'oklch(60% 0.245 27.325)',
                'oklch(57.7% 0.245 27.325)',
                'oklch(55% 0.24 27.325)',
                'oklch(50% 0.235 27.325)',
                'oklch(45% 0.23 27.325)',
                'oklch(40% 0.225 27.325)',
                'oklch(35% 0.22 27.325)',
              ],
            },
          }}
          defaultColorScheme="light"
        >
          <Notifications position="top-right" zIndex={9999} />
          <AuthProvider>
            {children}
          </AuthProvider>
        </MantineProvider>
        <Script
          id="register-sw"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(() => console.log('[PWA] Service Worker registrado'))
                    .catch(err => console.error('[PWA] Error al registrar SW:', err))
                })
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
