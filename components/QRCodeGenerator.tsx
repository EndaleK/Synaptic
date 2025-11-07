'use client'

import { useRef, useEffect, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Download } from 'lucide-react'

interface QRCodeGeneratorProps {
  url: string
  size?: number
  logoSize?: number
  filename?: string
  showDownload?: boolean
  className?: string
}

/**
 * QR Code Generator with embedded Synaptic logo
 *
 * Features:
 * - Generates QR code for specified URL
 * - Embeds logo-icon.svg in center
 * - Downloadable as PNG
 * - Customizable size and styling
 */
export function QRCodeGenerator({
  url,
  size = 256,
  logoSize = 56,
  filename = 'synaptic-qr-code.png',
  showDownload = true,
  className = '',
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [logoDataUrl, setLogoDataUrl] = useState<string>('')

  // Load and convert logo SVG to data URL
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch('/logo-icon.svg')
        const svgText = await response.text()
        const blob = new Blob([svgText], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)

        // Convert SVG to data URL for embedding
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = logoSize
          canvas.height = logoSize
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, logoSize, logoSize)
            setLogoDataUrl(canvas.toDataURL('image/png'))
          }
          URL.revokeObjectURL(url)
        }
        img.src = url
      } catch (error) {
        console.error('Failed to load logo:', error)
      }
    }

    loadLogo()
  }, [logoSize])

  // Download QR code as PNG
  const handleDownload = () => {
    const canvas = canvasRef.current?.querySelector('canvas')
    if (!canvas) return

    // Create a new canvas with white background
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = canvas.width
    exportCanvas.height = canvas.height
    const ctx = exportCanvas.getContext('2d')

    if (ctx) {
      // Fill white background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)

      // Draw QR code
      ctx.drawImage(canvas, 0, 0)

      // Convert to blob and download
      exportCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.download = filename
          link.href = url
          link.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    }
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* QR Code Canvas */}
      <div
        ref={canvasRef}
        className="p-4 bg-white rounded-lg shadow-md"
        style={{ width: 'fit-content' }}
      >
        <QRCodeCanvas
          value={url}
          size={size}
          level="H" // High error correction for logo embedding
          includeMargin={true}
          imageSettings={
            logoDataUrl
              ? {
                  src: logoDataUrl,
                  x: undefined,
                  y: undefined,
                  height: logoSize,
                  width: logoSize,
                  excavate: true, // Remove QR dots behind logo
                }
              : undefined
          }
        />
      </div>

      {/* Download Button */}
      {showDownload && (
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <Download className="h-4 w-4" />
          Download QR Code
        </button>
      )}
    </div>
  )
}
