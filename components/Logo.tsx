"use client"

import React from 'react'

interface LogoProps {
  variant?: 'full' | 'icon'
  size?: number
  className?: string
}

export default function Logo({ variant = 'full', size = 40, className = '' }: LogoProps) {
  const logoSrc = {
    full: '/logo.svg',      // Full logo with text and tagline
    icon: '/logo-icon.svg', // Icon only (brain)
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
export function AnimatedLogo({ variant = 'full', size = 40, className = '' }: LogoProps) {
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

// Logo with text - just returns the full logo (text is already included)
export function LogoWithText({
  size = 80,
  className = ''
}: { size?: number; className?: string }) {
  return <Logo variant="full" size={size} className={className} />
}
