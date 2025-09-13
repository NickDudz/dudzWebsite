import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'dudz.pro - Projects, Experiments, & Creations',
  description: 'Portfolio site for Nicholas Dudczyk featuring projects, experiments, and creations.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}