"use client"

import React from 'react'

interface LogoProps {
  variant?: 'neural' | 'minimal' | 'icon'
  size?: number
  className?: string
}

export default function Logo({ variant = 'minimal', size = 40, className = '' }: LogoProps) {
  const logoSrc = {
    neural: '/logo-concept.svg',
    minimal: '/logo-minimal.svg',
    icon: '/logo-app-icon.svg'
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
export function AnimatedLogo({ variant = 'minimal', size = 40, className = '' }: LogoProps) {
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
  variant = 'minimal',
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
