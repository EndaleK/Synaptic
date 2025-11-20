'use client'

import { useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Image from 'next/image'

interface ShareCardProps {
  url?: string
  onGenerated?: (dataUrl: string) => void
}

/**
 * Share Card Generator - Creates a branded share card with QR code
 * Similar to Instagram/social media link cards
 */
export function ShareCard({ url = 'https://synaptic.study', onGenerated }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    generateCard()
  }, [url])

  const generateCard = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size (Instagram story size: 1080x1920, but we'll use smaller for web)
    canvas.width = 540
    canvas.height = 960

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#f9fafb')
    gradient.addColorStop(1, '#f3f4f6')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Load logo
    const logo = new window.Image()
    logo.crossOrigin = 'anonymous'
    logo.onload = () => {
      // Draw logo at top (centered)
      const logoSize = 80
      ctx.drawImage(logo, (canvas.width - logoSize) / 2, 60, logoSize, logoSize)

      // Draw "Synaptic" text
      ctx.font = 'bold 48px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#7B3FF2'
      ctx.textAlign = 'center'
      ctx.fillText('Synaptic', canvas.width / 2, 180)

      // Draw "Study Smarter" subtitle
      ctx.font = '20px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#6b7280'
      ctx.fillText('Study Smarter', canvas.width / 2, 210)

      // Draw decorative line
      ctx.strokeStyle = '#d1d5db'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(150, 240)
      ctx.lineTo(390, 240)
      ctx.stroke()

      // Draw main heading
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#111827'
      ctx.fillText('Learning That Adapts to You', canvas.width / 2, 300)

      // Draw features (wrap text)
      ctx.font = '18px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#4b5563'
      const features = '8 Intelligent Study Tools'
      ctx.fillText(features, canvas.width / 2, 340)

      // Draw feature list
      ctx.font = '16px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#6b7280'
      const featureList = [
        'Flashcards • Mock Exams • Podcasts',
        'Mind Maps • Chat • Video Learning',
        'Writing Assistant • Quick Summary'
      ]
      featureList.forEach((feature, idx) => {
        ctx.fillText(feature, canvas.width / 2, 380 + idx * 30)
      })

      // Draw decorative line
      ctx.beginPath()
      ctx.moveTo(150, 480)
      ctx.lineTo(390, 480)
      ctx.stroke()

      // Draw pricing
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#111827'
      ctx.fillText('83% Cheaper • 500MB+ Docs • Research-Backed', canvas.width / 2, 520)

      // QR Code placeholder area
      const qrSize = 200
      const qrX = (canvas.width - qrSize) / 2
      const qrY = 580

      // Draw white background for QR
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40)
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 2
      ctx.strokeRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40)

      // We'll insert the QR code SVG separately

      // Draw URL at bottom
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#7B3FF2'
      ctx.fillText('synaptic.study', canvas.width / 2, 840)

      // Draw call to action
      ctx.font = '18px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#6b7280'
      ctx.fillText('Scan QR code to get started', canvas.width / 2, 870)

      // Notify parent component
      if (onGenerated) {
        onGenerated(canvas.toDataURL('image/png'))
      }
    }
    logo.src = '/logo-brain-transparent.png'
  }

  const downloadCard = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = 'synaptic-share-card.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative bg-gray-100 rounded-2xl overflow-hidden shadow-2xl">
        {/* Canvas for the card */}
        <canvas ref={canvasRef} className="max-w-full h-auto" />

        {/* QR Code overlay */}
        <div className="absolute" style={{ left: '50%', top: '600px', transform: 'translateX(-50%)' }}>
          <div className="bg-white p-2 rounded-lg">
            <QRCodeSVG
              value={url}
              size={200}
              level="H"
              includeMargin={false}
              imageSettings={{
                src: '/logo-brain-transparent.png',
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>
        </div>
      </div>

      <button
        onClick={downloadCard}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
      >
        Download Share Card
      </button>
    </div>
  )
}
