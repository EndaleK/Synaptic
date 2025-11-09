"use client"

import { useState } from 'react'
import { Sparkles, Mic, Map, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

// Dynamically import tabs to avoid SSR issues
const FlashcardsTab = dynamic(() => import('@/components/ContentLibrary/FlashcardsTab'), {
  ssr: false,
  loading: () => <TabLoadingState />
})

const PodcastsTab = dynamic(() => import('@/components/ContentLibrary/PodcastsTab'), {
  ssr: false,
  loading: () => <TabLoadingState />
})

const MindMapsTab = dynamic(() => import('@/components/ContentLibrary/MindMapsTab'), {
  ssr: false,
  loading: () => <TabLoadingState />
})

function TabLoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
      <span className="ml-3 text-gray-600 dark:text-gray-400">Loading...</span>
    </div>
  )
}

type TabType = 'flashcards' | 'podcasts' | 'mindmaps'

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('flashcards')

  const tabs = [
    {
      id: 'flashcards' as TabType,
      label: 'Flashcards',
      icon: Sparkles,
      color: 'from-accent-primary to-accent-secondary',
      description: 'Browse and review all your flashcards'
    },
    {
      id: 'podcasts' as TabType,
      label: 'Podcasts',
      icon: Mic,
      color: 'from-purple-500 to-pink-500',
      description: 'Listen to your generated podcasts'
    },
    {
      id: 'mindmaps' as TabType,
      label: 'Mind Maps',
      icon: Map,
      color: 'from-blue-500 to-cyan-500',
      description: 'Explore your concept maps'
    }
  ]

  const activeTabConfig = tabs.find(tab => tab.id === activeTab)!

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 py-6">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 bg-gradient-to-br ${activeTabConfig.color} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
              Content Library
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {activeTabConfig.description}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-6 border-b border-gray-200 dark:border-gray-700 -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 font-medium text-sm transition-all relative",
                  isActive
                    ? "text-accent-primary border-b-2 border-accent-primary"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {activeTab === 'flashcards' && <FlashcardsTab />}
          {activeTab === 'podcasts' && <PodcastsTab />}
          {activeTab === 'mindmaps' && <MindMapsTab />}
        </div>
      </div>
    </div>
  )
}
