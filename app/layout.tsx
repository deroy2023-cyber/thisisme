import type { Metadata } from 'next'
import { DM_Sans, Inter, Barlow_Semi_Condensed } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['500'],
  display: 'swap',
})

const barlowSemiCondensed = Barlow_Semi_Condensed({
  subsets: ['latin'],
  variable: '--font-barlow-semi-condensed',
  weight: ['500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ATWO STUDIOS',
  description: 'Ideas run the show. We create ads, films, and brand visuals that look like full productions — minus the rented studios, camera crews and production chaos.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable} ${barlowSemiCondensed.variable}`}>
      <head>
        {/* Every video, the hero LCP image and all three Coolvetica faces come
            from these origins. Without the hints the connection handshake for
            the LCP image only starts after the CSS that references it parses. */}
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://framerusercontent.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://framerusercontent.com" />
      </head>
      <body>{children}</body>
    </html>
  )
}
