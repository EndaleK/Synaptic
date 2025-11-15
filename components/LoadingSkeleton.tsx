"use client"

import { cn } from "@/lib/utils"

interface LoadingSkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
}

export default function LoadingSkeleton({ className, variant = 'rectangular' }: LoadingSkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gray-200 dark:bg-gray-700",
        variant === 'circular' && "rounded-full",
        variant === 'text' && "rounded h-4",
        variant === 'rectangular' && "rounded-lg",
        className
      )}
    />
  )
}

// Pre-built skeleton components for common use cases
export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
      <LoadingSkeleton className="h-6 w-3/4" variant="text" />
      <LoadingSkeleton className="h-4 w-full" variant="text" />
      <LoadingSkeleton className="h-4 w-5/6" variant="text" />
      <LoadingSkeleton className="h-4 w-4/6" variant="text" />
    </div>
  )
}

export function FlashcardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <LoadingSkeleton className="h-8 w-32" variant="text" />
        <LoadingSkeleton className="h-10 w-24" />
      </div>
      <LoadingSkeleton className="h-80 w-full" />
      <div className="flex gap-2 justify-center">
        <LoadingSkeleton className="h-12 w-32" />
        <LoadingSkeleton className="h-12 w-32" />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="container-padding space-y-6">
      <LoadingSkeleton className="h-10 w-64" variant="text" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  )
}
