'use client'

import { SignUp } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Gift } from 'lucide-react'

function SignUpContent() {
  const searchParams = useSearchParams()
  const [referralCode, setReferralCode] = useState<string | null>(null)

  useEffect(() => {
    // Check for referral code in URL params
    const ref = searchParams.get('ref')
    if (ref) {
      // Store in localStorage so we can apply it after signup
      localStorage.setItem('pending_referral_code', ref.toUpperCase())
      setReferralCode(ref.toUpperCase())
    } else {
      // Check if there's already a pending code
      const pending = localStorage.getItem('pending_referral_code')
      if (pending) {
        setReferralCode(pending)
      }
    }
  }, [searchParams])

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Start Learning Smarter
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create your account to unlock AI-powered study tools
        </p>
      </div>

      {/* Referral code banner */}
      {referralCode && (
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-500/10 dark:to-rose-500/10 border border-pink-200 dark:border-pink-500/20 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Referral code applied: <span className="font-mono font-bold">{referralCode}</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              You'll both receive bonus credits after signup!
            </p>
          </div>
        </div>
      )}

      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/dashboard"
        appearance={{
          elements: {
            formButtonPrimary:
              'bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black text-sm normal-case',
            card: 'shadow-2xl',
          },
        }}
      />
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Start Learning Smarter
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create your account to unlock AI-powered study tools
          </p>
        </div>
        <div className="animate-pulse w-[400px] h-[500px] bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    }>
      <SignUpContent />
    </Suspense>
  )
}
