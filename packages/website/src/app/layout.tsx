import type { Metadata } from 'next'
import localFont from 'next/font/local'
import '@/styles/globals.css'
const satoshi = localFont({
  src: '../fonts/Satoshi-Variable.ttf',
  weight: '300 900',
  variable: '--font-satoshi',
  display: 'swap',
})
const cabinet = localFont({
  src: '../fonts/CabinetGrotesk-Variable.ttf',
  weight: '100 900',
  variable: '--font-cabinet',
  display: 'swap',
})
export const metadata: Metadata = {
  title: 'Pinvelto documentation',
  description:
    'Internal installation, Feedback workflows, and maintenance guidance for Pinvelto.',
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon16.png', sizes: '16x16' },
      { url: '/icon32.png', sizes: '32x32' },
      { url: '/icon48.png', sizes: '48x48' },
      { url: '/icon128.png', sizes: '128x128' },
    ],
    apple: '/apple-touch-icon.png',
  },
}
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={satoshi.variable + ' ' + cabinet.variable}>
      <body className={satoshi.className + ' bg-ink text-white antialiased'}>
        {children}
      </body>
    </html>
  )
}
