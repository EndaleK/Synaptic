"use client"

import { useState } from 'react'
import {
  BookOpen,
  Video,
  FileText,
  GraduationCap,
  ExternalLink,
  Plus,
  Check,
  Star,
  Users,
} from 'lucide-react'
import type { EducationalResource, ResourceSource, ResourceType } from '@/lib/supabase/types'

interface ResourceCardProps {
  resource: EducationalResource
  onSelect?: (resource: EducationalResource) => void
  onRemove?: (resource: EducationalResource) => void
  isSelected?: boolean
  compact?: boolean
}

const SOURCE_LABELS: Record<ResourceSource, { label: string; color: string }> = {
  openlibrary: { label: 'OpenLibrary', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  google_books: { label: 'Google Books', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  mit_ocw: { label: 'MIT OCW', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  khan_academy: { label: 'Khan Academy', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  coursera: { label: 'Coursera', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  openstax: { label: 'OpenStax', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
}

const TYPE_ICONS: Record<ResourceType, React.ComponentType<{ className?: string }>> = {
  textbook: BookOpen,
  ebook: BookOpen,
  video_course: Video,
  lecture: Video,
  article: FileText,
  practice: GraduationCap,
  open_course: GraduationCap,
}

export default function ResourceCard({
  resource,
  onSelect,
  onRemove,
  isSelected = false,
  compact = false,
}: ResourceCardProps) {
  const [imageError, setImageError] = useState(false)

  const sourceInfo = SOURCE_LABELS[resource.source] || {
    label: resource.source,
    color: 'bg-gray-100 text-gray-700',
  }

  const TypeIcon = TYPE_ICONS[resource.resource_type] || FileText

  const handleClick = () => {
    if (isSelected && onRemove) {
      onRemove(resource)
    } else if (onSelect) {
      onSelect(resource)
    }
  }

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer
          ${
            isSelected
              ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600'
          }`}
        onClick={handleClick}
      >
        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          {resource.thumbnail_url && !imageError ? (
            <img
              src={resource.thumbnail_url}
              alt=""
              className="w-full h-full object-cover rounded-lg"
              onError={() => setImageError(true)}
            />
          ) : (
            <TypeIcon className="w-5 h-5 text-gray-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
            {resource.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-1.5 py-0.5 rounded ${sourceInfo.color}`}>
              {sourceInfo.label}
            </span>
            {resource.authors && resource.authors.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {resource.authors[0]}
              </span>
            )}
          </div>
        </div>

        <button
          className={`p-1.5 rounded-lg transition-colors ${
            isSelected
              ? 'bg-violet-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-violet-100 hover:text-violet-600'
          }`}
        >
          {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
    )
  }

  return (
    <div
      className={`relative rounded-xl border overflow-hidden transition-all
        ${
          isSelected
            ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700 ring-2 ring-violet-500/20'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600'
        }`}
    >
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="w-16 h-20 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {resource.thumbnail_url && !imageError ? (
            <img
              src={resource.thumbnail_url}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <TypeIcon className="w-8 h-8 text-gray-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                {resource.title}
              </h4>
              {resource.authors && resource.authors.length > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {resource.authors.slice(0, 2).join(', ')}
                  {resource.authors.length > 2 && ` +${resource.authors.length - 2} more`}
                </p>
              )}
            </div>
          </div>

          {resource.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
              {resource.description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${sourceInfo.color}`}>
              {sourceInfo.label}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">
              {resource.resource_type.replace('_', ' ')}
            </span>
            {resource.level && (
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">
                {resource.level.replace('_', ' ')}
              </span>
            )}
            {resource.rating && resource.rating > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <Star className="w-3 h-3 fill-current" />
                {resource.rating.toFixed(1)}
              </span>
            )}
            {resource.reviews_count && resource.reviews_count > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Users className="w-3 h-3" />
                {resource.reviews_count.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-4 h-4" />
          View Resource
        </a>

        {(onSelect || onRemove) && (
          <button
            onClick={handleClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${
                isSelected
                  ? 'bg-violet-500 text-white hover:bg-violet-600'
                  : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50'
              }`}
          >
            {isSelected ? (
              <>
                <Check className="w-4 h-4" />
                Selected
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
