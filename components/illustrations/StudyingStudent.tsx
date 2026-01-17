"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface StudyingStudentProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'sitting-reading' | 'reading-side' | 'studying'
}

/**
 * StudyingStudent - Open Doodles style illustration of a student studying
 * Uses actual Open Doodles composition SVG files
 *
 * Variants:
 * - sitting-reading: Person sitting and reading a book (composition-24)
 * - reading-side: Person reading from the side view (composition-23)
 * - studying: Person studying with materials (composition-14)
 */
export function StudyingStudent({
  className,
  size = 'lg',
  variant = 'sitting-reading'
}: StudyingStudentProps) {
  const sizeClasses = {
    sm: 'w-48 h-48',
    md: 'w-72 h-72',
    lg: 'w-96 h-96',
  }

  const sizePixels = {
    sm: 192,
    md: 288,
    lg: 384,
  }

  const variantToFile = {
    'sitting-reading': '/illustrations/open-doodles/composition-24.svg',
    'reading-side': '/illustrations/open-doodles/composition-23.svg',
    'studying': '/illustrations/open-doodles/composition-14.svg',
  }

  return (
    <div className={cn(sizeClasses[size], "relative", className)}>
      <Image
        src={variantToFile[variant]}
        alt="Student studying illustration"
        width={sizePixels[size]}
        height={sizePixels[size]}
        className="w-full h-full object-contain"
        priority
      />
    </div>
  )
}

export default StudyingStudent
