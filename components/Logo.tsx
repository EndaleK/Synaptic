"use client"

import React from 'react'

interface LogoProps {
  variant?:
    // Current brand logo
    | 'brain' | 'brain-full'
    // Legacy variants
    | 'neural' | 'minimal' | 'icon'
    // 2024 designs (deprecated)
    | 'synapse-wave' | 'neural-bloom' | 'constellation'
    // Icon variants (deprecated)
    | 'synapse-wave-icon' | 'neural-bloom-icon' | 'constellation-icon'
  size?: number
  className?: string
}

export default function Logo({ variant = 'brain-full', size = 40, className = '' }: LogoProps) {
  const logoSrc = {
    // Current brand logo (2024 Gemini design)
    'brain': '/logo-brain.png',        // Full logo with text
    'brain-full': '/logo-brain.png',   // Full logo with text
    // Legacy variants
    neural: '/logo-concept.svg',
    minimal: '/logo-minimal.svg',
    icon: '/logo-app-icon.svg',
    // 2024 logo designs (deprecated)
    'synapse-wave': '/logo-synapse-wave.svg',
    'neural-bloom': '/logo-neural-bloom.svg',
    'constellation': '/logo-constellation.svg',
    // Icon variants (deprecated)
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
export function AnimatedLogo({ variant = 'brain-full', size = 40, className = '' }: LogoProps) {
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
          background: 'radial-gradient(circle, rgba(233, 30, 140, 0.3) 0%, rgba(123, 63, 242, 0.3) 50%, rgba(45, 62, 159, 0.3) 100%)',
          filter: 'blur(15px)',
        }}
      />
      <Logo variant={variant} size={size} className={className} />
    </div>
  )
}

// Logo with text
// Note: 'brain-full' variant already includes text, so this just displays the logo
export function LogoWithText({
  variant = 'brain-full',
  size = 40,
  showTagline = false,
  className = ''
}: LogoProps & { showTagline?: boolean }) {
  // For the brain logo which already has text, just show it
  if (variant === 'brain' || variant === 'brain-full') {
    return <Logo variant={variant} size={size * 2} className={className} />
  }

  // For legacy variants without text, add text
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
