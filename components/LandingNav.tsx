"use client"

import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { SynapticLogo } from "@/components/SynapticLogo"

export function LandingNav() {
  const { isSignedIn } = useAuth()

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/30 dark:border-gray-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Left */}
          <SynapticLogo size="sm" />

          {/* Nav Links - Center */}
          <div className="hidden sm:flex items-center gap-8">
            <a
              href="#features"
              className="text-gray-600 dark:text-gray-300 hover:text-[#7B3FF2] transition-colors font-medium"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-gray-600 dark:text-gray-300 hover:text-[#7B3FF2] transition-colors font-medium"
            >
              Pricing
            </a>
          </div>

          {/* Auth Buttons - Right */}
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-[#7B3FF2] hover:bg-[#6B2FE2] text-white rounded-xl font-semibold text-sm transition-all"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="hidden sm:block px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-[#7B3FF2] font-medium text-sm transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-[#7B3FF2] font-medium text-sm transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default LandingNav
