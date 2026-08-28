import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500'],
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
    <html lang="en" className={dmSans.variable}>
      <head>
        {/* Every video, the hero LCP image and all three Coolvetica faces come
            from these origins. Without the hints the connection handshake for
            the LCP image only starts after the CSS that references it parses. */}
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://framerusercontent.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://framerusercontent.com" />
        {/* A @font-face in a stylesheet is not fetched until layout finds text
            that needs it, so preconnect alone still leaves a swap window — long
            enough on mobile data that the page paints in the system sans and
            then visibly re-renders. globals.css backs both "Coolvetica" and
            "Coolvetica Condensed" with this one file (it is the CONDENSED face
            under two names, not the regular one), so a single preload covers
            nearly all visible copy. Heavy Compressed is deliberately NOT
            preloaded: it is below the fold, and an unused preload only competes
            for the critical path. */}
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="https://framerusercontent.com/assets/gWeZipkGhmVsJNrR7HmYiR0GLY.woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
