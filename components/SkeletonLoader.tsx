"use client"

import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  variant?: 'default' | 'brand'
}

/**
 * Skeleton - Loading placeholder with shimmer animation
 * @param variant - 'default' for neutral gray, 'brand' for purple-pink gradient
 */
export function Skeleton({ className, variant = 'default' }: SkeletonProps) {
  if (variant === 'brand') {
    return (
      <div
        className={cn(
          "rounded-md shimmer-brand",
          className
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 bg-[length:200%_100%]",
        className
      )}
      style={{
        animation: "shimmer 2s ease-in-out infinite"
      }}
    />
  )
}

/**
 * BrandedSkeleton - Skeleton with brand-colored shimmer effect
 * Uses purple-pink gradient for loading states
 */
export function BrandedSkeleton({ className }: { className?: string }) {
  return <Skeleton className={className} variant="brand" />
}

// Document Card Skeleton
export function DocumentCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      {/* Icon */}
      <Skeleton className="w-16 h-16 mb-3 rounded-lg" />

      {/* Title */}
      <Skeleton className="h-5 w-3/4 mb-2 rounded" />

      {/* Subtitle */}
      <Skeleton className="h-4 w-1/2 mb-3 rounded" />

      {/* Button */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-20 ml-auto rounded-lg" />
      </div>
    </div>
  )
}

// Flashcard Skeleton
export function FlashcardSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-32 rounded" />
            <Skeleton className="h-8 w-24 rounded" />
          </div>
        </div>

        {/* Progress */}
        <Skeleton className="h-2 w-full mb-6 rounded-full" />

        {/* Card */}
        <Skeleton className="h-96 w-full mb-6 rounded-lg" />

        {/* Navigation */}
        <div className="flex justify-center items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-12 w-32 rounded-lg" />
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      </div>
    </div>
  )
}

// Chat Message Skeleton
export function ChatMessageSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[85%] gap-2">
        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-64 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
        </div>
      </div>
    </div>
  )
}

// Document List Skeleton
export function DocumentListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <DocumentCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Learning Mode Card Skeleton
export function LearningModeCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-6">
      <Skeleton className="w-14 h-14 rounded-xl mb-4" />
      <Skeleton className="h-6 w-3/4 mb-2 rounded" />
      <Skeleton className="h-4 w-full mb-1 rounded" />
      <Skeleton className="h-4 w-2/3 rounded" />
    </div>
  )
}

// Dashboard Home Skeleton - With branded shimmer
export function DashboardHomeSkeleton() {
  return (
    <div className="h-screen overflow-y-auto bg-gray-50 dark:bg-gray-950 relative">
      {/* Subtle background decoration */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[20%] right-[20%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-violet-300/5 via-purple-200/3 to-transparent blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto p-6 space-y-6">
        {/* Welcome Section - Branded shimmer */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 rounded-2xl p-8 border border-purple-200/30 dark:border-purple-500/20">
          <BrandedSkeleton className="h-10 w-1/2 mb-2" />
          <BrandedSkeleton className="h-6 w-1/3 mb-4" />
          <BrandedSkeleton className="h-4 w-1/4" />
        </div>

        {/* Learning Modes */}
        <div>
          <BrandedSkeleton className="h-8 w-48 mb-4 rounded" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <LearningModeCardSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* Recent Documents */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <BrandedSkeleton className="h-8 w-48 rounded" />
            <Skeleton className="h-6 w-32 rounded" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
