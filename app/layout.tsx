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

const SITE_URL = 'https://atwostudios.com'
const SITE_NAME = 'ATWO Studios'
const TITLE = 'ATWO Studios — Ad, Film & Brand Visual Production'
const DESCRIPTION =
  'Ideas run the show. We create ads, films, and brand visuals that look like full productions — minus the rented studios, camera crews and production chaos.'
/* Share card: public/og-image.jpg, the hero still at 1200x630. Relative URL is
   resolved against metadataBase. */
const OG_IMAGE = {
  url: '/og-image.jpg',
  width: 1200,
  height: 630,
  alt: 'ATWO Studios campaign visual',
}
const INSTAGRAM_URL = 'https://www.instagram.com/atwo.io'
const LINKEDIN_URL = 'https://www.linkedin.com/company/atwo-studios/'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s | ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'ATWO Studios',
    'creative studio',
    'ad production',
    'AI ads',
    'commercial films',
    'brand visuals',
    'creative direction',
    'fashion campaigns',
    'beauty campaigns',
    'luxury brand content',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'Creative Agency',
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-video-preview': -1,
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: SITE_NAME,
    locale: 'en_US',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
}

const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/images/a2-logo.png`,
  email: 'contact@atwostudios.com',
  description: DESCRIPTION,
  sameAs: [INSTAGRAM_URL, LINKEDIN_URL],
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
  themeColor: '#1A1A1A',
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
        {/* Cloudinary WITHOUT crossOrigin: images and videos are no-cors
            requests, which use a separate connection pool from CORS ones, so an
            anonymous preconnect was a socket nothing ever reused. The fonts on
            framerusercontent ARE CORS fetches and keep it. */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
