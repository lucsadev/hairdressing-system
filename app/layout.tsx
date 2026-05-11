import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import type { Metadata } from 'next'
import { AuthProvider } from './providers'

export const metadata: Metadata = {
  title: 'Peluquería Krear - Gestión de Turnos',
  description: 'Sistema de gestión de turnos para Peluquería Krear',
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
          <Notifications />
          <AuthProvider>
            {children}
          </AuthProvider>
        </MantineProvider>
      </body>
    </html>
  )
}
