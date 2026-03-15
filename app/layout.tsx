import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Coach Dashboard | Forged by Freedom',
  description: 'Manage coaching clients with real-time metrics, check-ins, progress tracking, and AI-powered insights.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FBF',
  },
  openGraph: {
    title: 'Coach Dashboard | Forged by Freedom',
    description: 'Manage coaching clients with real-time metrics and progress tracking.',
    url: 'https://fbf-dashboard.vercel.app',
    siteName: 'Forged by Freedom',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Coach Dashboard | Forged by Freedom',
    description: 'Manage coaching clients with real-time metrics and progress tracking.',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
      </head>
      <body className="antialiased">
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        `}} />
      </body>
    </html>
  )
}
