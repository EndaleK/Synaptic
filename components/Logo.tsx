"use client"

import React from 'react'

interface LogoProps {
  variant?:
    // Legacy variants
    | 'neural' | 'minimal' | 'icon'
    // New 2024 designs
    | 'synapse-wave' | 'neural-bloom' | 'constellation'
    // New icon variants (512×512 app icons)
    | 'synapse-wave-icon' | 'neural-bloom-icon' | 'constellation-icon'
  size?: number
  className?: string
}

export default function Logo({ variant = 'synapse-wave', size = 40, className = '' }: LogoProps) {
  const logoSrc = {
    // Legacy variants
    neural: '/logo-concept.svg',
    minimal: '/logo-minimal.svg',
    icon: '/logo-app-icon.svg',
    // New 2024 logo designs (200×200)
    'synapse-wave': '/logo-synapse-wave.svg',
    'neural-bloom': '/logo-neural-bloom.svg',
    'constellation': '/logo-constellation.svg',
    // New icon variants (512×512 for app icons/favicons)
    'synapse-wave-icon': '/icon-synapse-wave.svg',
    'neural-bloom-icon': '/icon-neural-bloom.svg',
    'constellation-icon': '/icon-constellation.svg',
  }

  return (
    <img
      src={logoSrc[variant]}
      alt="Synaptic"
      width={size}
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle'
      }}
    />
  )
}

// Animated version with pulse effect
export function AnimatedLogo({ variant = 'synapse-wave', size = 40, className = '' }: LogoProps) {
  return (
    <div className="relative inline-block">
      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }
        .logo-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
      <div
        className="logo-glow absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(102, 126, 234, 0.4) 0%, transparent 70%)',
          filter: 'blur(10px)',
        }}
      />
      <Logo variant={variant} size={size} className={className} />
    </div>
  )
}

// Logo with text
export function LogoWithText({
  variant = 'synapse-wave',
  size = 40,
  showTagline = false,
  className = ''
}: LogoProps & { showTagline?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo variant={variant} size={size} />
      <div className="flex flex-col">
        <span
          className="font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent"
          style={{ fontSize: size * 0.6 }}
        >
          Synaptic
        </span>
        {showTagline && (
          <span
            className="text-gray-600 dark:text-gray-400"
            style={{ fontSize: size * 0.25 }}
          >
            AI-Powered Learning
          </span>
        )}
      </div>
    </div>
  )
}
