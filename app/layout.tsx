import type { Metadata, Viewport } from 'next'
import { DM_Sans, Manrope } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500'],
  display: 'swap',
})

/* Replaces the old "Coolvetica Regular" stack sitewide (see the note in
   globals.css). That name resolved via local() against a desktop-installed
   font with no webfont license, so it rendered wide for whoever had it
   installed and narrow (a different, CDN-served condensed face) for everyone
   else. Manrope is self-hosted by Next from this same build, so every visitor
   gets the identical file regardless of what fonts their device has. Weight
   800 (ExtraBold) — Manrope's heaviest weight — was chosen on request; note it
   is a UI/text geometric sans, not a bold display face, so it reads notably
   lighter/narrower than the brand mark it replaces. */
const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ATWO STUDIOS',
  description: 'Ideas run the show. We create ads, films, and brand visuals that look like full productions — minus the rented studios, camera crews and production chaos.',
}

/* Next injects a bare width=device-width/initial-scale=1 when no viewport is
   exported, which is why the site worked at all on mobile. The addition that
   matters is interactiveWidget: with the default (resizes-visual) the on-screen
   keyboard shrinks only the visual viewport, so a dvh-sized overlay keeps its
   full height and its lower half sits behind the keyboard. resizes-content
   makes dvh track the keyboard, which is the behaviour the Group 0 vh -> dvh
   migration below assumes. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${manrope.variable}`}>
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
