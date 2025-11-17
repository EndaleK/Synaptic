"use client"

import { useState } from "react"
import { X, FileText, FileType, Globe, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FilterOptions {
  fileTypes: string[]
  statuses: string[]
  sizeRange: 'all' | 'small' | 'medium' | 'large'
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year'
  hasContent: {
    flashcards: boolean
    podcasts: boolean
    mindmaps: boolean
  }
}

interface AdvancedFiltersProps {
  filters: FilterOptions
  onChange: (filters: FilterOptions) => void
  onReset: () => void
}

export default function AdvancedFilters({ filters, onChange, onReset }: AdvancedFiltersProps) {
  const fileTypeOptions = [
    { value: 'pdf', label: 'PDF', icon: FileText, color: 'text-red-500' },
    { value: 'docx', label: 'DOCX', icon: FileType, color: 'text-blue-500' },
    { value: 'txt', label: 'TXT', icon: FileText, color: 'text-gray-500' },
    { value: 'url', label: 'Web Page', icon: Globe, color: 'text-green-500' },
  ]

  const statusOptions = [
    { value: 'completed', label: 'Ready', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
    { value: 'processing', label: 'Processing', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
    { value: 'failed', label: 'Failed', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
  ]

  const toggleFileType = (type: string) => {
    const newTypes = filters.fileTypes.includes(type)
      ? filters.fileTypes.filter(t => t !== type)
      : [...filters.fileTypes, type]
    onChange({ ...filters, fileTypes: newTypes })
  }

  const toggleStatus = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status]
    onChange({ ...filters, statuses: newStatuses })
  }

  const hasActiveFilters =
    filters.fileTypes.length > 0 ||
    filters.statuses.length > 0 ||
    filters.sizeRange !== 'all' ||
    filters.dateRange !== 'all' ||
    filters.hasContent.flashcards ||
    filters.hasContent.podcasts ||
    filters.hasContent.mindmaps

  return (
    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* File Type */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            File Type
          </label>
          <div className="flex flex-wrap gap-2">
            {fileTypeOptions.map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => toggleFileType(value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  filters.fileTypes.includes(value)
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-500"
                )}
              >
                <Icon className={cn("w-3 h-3", filters.fileTypes.includes(value) ? "text-white" : color)} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map(({ value, label, color }) => (
              <button
                key={value}
                onClick={() => toggleStatus(value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  filters.statuses.includes(value)
                    ? "bg-blue-500 text-white border-blue-500"
                    : cn("border-gray-200 dark:border-gray-700 hover:border-blue-500", color)
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Size Range */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            File Size
          </label>
          <select
            value={filters.sizeRange}
            onChange={(e) => onChange({ ...filters, sizeRange: e.target.value as FilterOptions['sizeRange'] })}
            className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All sizes</option>
            <option value="small">&lt; 1 MB</option>
            <option value="medium">1-10 MB</option>
            <option value="large">&gt; 10 MB</option>
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date Modified
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => onChange({ ...filters, dateRange: e.target.value as FilterOptions['dateRange'] })}
            className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
          </select>
        </div>
      </div>

      {/* Content Generated */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Has Generated Content
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onChange({ ...filters, hasContent: { ...filters.hasContent, flashcards: !filters.hasContent.flashcards } })}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
              filters.hasContent.flashcards
                ? "bg-purple-500 text-white border-purple-500"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-purple-500"
            )}
          >
            ⚡ Flashcards
          </button>
          <button
            onClick={() => onChange({ ...filters, hasContent: { ...filters.hasContent, podcasts: !filters.hasContent.podcasts } })}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
              filters.hasContent.podcasts
                ? "bg-green-500 text-white border-green-500"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-green-500"
            )}
          >
            🎧 Podcasts
          </button>
          <button
            onClick={() => onChange({ ...filters, hasContent: { ...filters.hasContent, mindmaps: !filters.hasContent.mindmaps } })}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
              filters.hasContent.mindmaps
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-500"
            )}
          >
            📊 Mind Maps
          </button>
        </div>
      </div>
    </div>
  )
}
