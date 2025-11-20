'use client'

import { useRef, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Download } from 'lucide-react'

interface ShareCardGeneratorProps {
  url?: string
}

/**
 * Share Card Generator - Creates Instagram-style link cards with QR code
 * Matches the design from the screenshot with logo, title, description, and QR code
 */
export function ShareCardGenerator({ url = 'https://synaptic.study' }: ShareCardGeneratorProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const downloadCard = async () => {
    if (!cardRef.current) return
    setIsGenerating(true)

    try {
      // Use html2canvas to convert the div to image
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#f9fafb',
        scale: 2, // Higher quality
        logging: false,
      })

      const link = document.createElement('a')
      link.download = 'synaptic-share-card.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Error generating card:', error)
      alert('Failed to generate card. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Card Preview */}
      <div
        ref={cardRef}
        className="w-[540px] bg-gradient-to-b from-gray-50 to-gray-100 rounded-3xl shadow-2xl p-12 flex flex-col items-center"
        style={{ minHeight: '960px' }}
      >
        {/* Logo */}
        <div className="w-20 h-20 mb-4">
          <img
            src="/logo-brain-transparent.png"
            alt="Synaptic Logo"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Brand Name */}
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          Synaptic
        </h1>

        {/* Tagline */}
        <p className="text-gray-600 text-lg mb-8">
          Study Smarter
        </p>

        {/* Decorative line */}
        <div className="w-48 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-8" />

        {/* Main Heading */}
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
          Learning That Adapts to You
        </h2>

        {/* Subtitle */}
        <p className="text-lg text-gray-700 font-semibold mb-3">
          8 Intelligent Study Tools
        </p>

        {/* Features */}
        <div className="text-center text-gray-600 space-y-1 mb-8">
          <p className="text-sm">Flashcards • Mock Exams • Podcasts</p>
          <p className="text-sm">Mind Maps • Chat • Video Learning</p>
          <p className="text-sm">Writing Assistant • Quick Summary</p>
        </div>

        {/* Decorative line */}
        <div className="w-48 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-6" />

        {/* Value Props */}
        <p className="text-gray-900 font-semibold text-center text-sm mb-12">
          83% Cheaper • 500MB+ Docs • Research-Backed
        </p>

        {/* QR Code */}
        <div className="bg-white p-6 rounded-2xl shadow-lg mb-8">
          <QRCodeSVG
            value={url}
            size={200}
            level="H"
            includeMargin={true}
            imageSettings={{
              src: '/logo-brain-transparent.png',
              height: 40,
              width: 40,
              excavate: true,
            }}
          />
        </div>

        {/* URL */}
        <p className="text-2xl font-bold text-purple-600 mb-2">
          synaptic.study
        </p>

        {/* CTA */}
        <p className="text-gray-600 text-sm">
          Scan QR code to get started
        </p>
      </div>

      {/* Download Button */}
      <button
        onClick={downloadCard}
        disabled={isGenerating}
        className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-5 h-5" />
        {isGenerating ? 'Generating...' : 'Download Share Card'}
      </button>

      <p className="text-sm text-gray-600 text-center max-w-md">
        Perfect for social media, flyers, presentations, and promotional materials
      </p>
    </div>
  )
}
