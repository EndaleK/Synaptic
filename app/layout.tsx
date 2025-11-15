import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import ClientWrapper from "@/components/ClientWrapper";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Synaptic - Learning That Adapts to You | 8 Intelligent Study Tools",
  description: "Study smarter with 8 intelligent tools: flashcards with spaced repetition, mock exams, podcasts, mind maps, and more. Support for 500MB+ documents, 83% cheaper than competitors, research-backed design.",
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
  authors: [{ name: "Synaptic" }],
  creator: "Synaptic",
  publisher: "Synaptic",
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
    title: "Synaptic - Learning That Adapts to You",
    description: "Transform textbooks into podcasts, mind maps, and practice exams. 8 intelligent study tools in one platform. 83% cheaper, supports 500MB+ documents.",
    url: 'https://synaptic.study',
    siteName: 'Synaptic',
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
    title: "Synaptic - Study Smarter, Not Harder",
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
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ServiceWorkerRegistration />
          <ClientWrapper>
            {children}
          </ClientWrapper>
        </body>
      </html>
    </ClerkProvider>
  );
}
