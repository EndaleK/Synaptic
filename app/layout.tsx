import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from "@/components/ThemeProvider";
import ClientWrapper from "@/components/ClientWrapper";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap', // Use font-display: swap for better performance
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: "Synaptic™ - Learning That Adapts to You | 8 Intelligent Study Tools",
  description: "Study smarter with Synaptic™: 8 intelligent tools including flashcards with spaced repetition, mock exams, podcasts, mind maps, and more. Support for 500MB+ documents, 83% cheaper than competitors, research-backed design.",
  keywords: [
    "AI study tools",
    "flashcards",
    "spaced repetition",
    "mock exams",
    "SAT prep",
    "exam simulator",
    "study podcasts",
    "mind maps",
    "learning platform",
    "Socratic teaching",
    "YouTube to flashcards",
    "PDF to podcast",
    "personalized learning",
    "adaptive learning",
    "test preparation",
    "college study tools",
    "certification prep",
    "AWS exam",
    "CPA prep",
    "Bar exam study"
  ],
  authors: [{ name: "Synaptic™" }],
  creator: "Synaptic™",
  publisher: "Synaptic™",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://synaptic.study'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Synaptic™ - Learning That Adapts to You",
    description: "Transform textbooks into podcasts, mind maps, and practice exams. 8 intelligent study tools in one platform. 83% cheaper, supports 500MB+ documents.",
    url: 'https://synaptic.study',
    siteName: 'Synaptic™',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Synaptic - 8 Intelligent Learning Tools',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Synaptic™ - Study Smarter, Not Harder",
    description: "8 intelligent study tools: flashcards, mock exams, podcasts, mind maps. 83% cheaper, 500MB+ document support.",
    images: ['/og-image.png'],
    creator: '@synaptic_study',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest?v=2',
};

export const viewport: Viewport = {
  themeColor: '#7B3FF2',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Polyfill for Clerk's Turnstile bot detection on mobile Safari */}
          {/* This is a static, hardcoded script - no user input, safe from XSS */}
          <script
            dangerouslySetInnerHTML={{
              __html: `if(typeof window!=='undefined'&&typeof window.Bot==='undefined'){window.Bot={detect:function(){return Promise.resolve({isBot:false})}}}`,
            }}
          />
          {/* Google Site Verification */}
          <meta name="google-site-verification" content="3ExrBId0okoOWgiiWtlHSitp7sdQ0K5TQd-R3J0MhVQ" />

          {/* Performance hints */}
          <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

          {/* PWA Meta Tags */}
          <meta name="application-name" content="Synaptic™" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Synaptic™" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="mobile-web-app-capable" content="yes" />

          {/* iOS Splash Screens */}
          <link rel="apple-touch-startup-image" href="/apple-touch-icon.png" />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider>
            <ServiceWorkerRegistration />
            <PWAInstallPrompt />
            <ClientWrapper>
              {children}
            </ClientWrapper>
            <Analytics />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
