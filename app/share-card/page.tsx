'use client'

import { useState } from 'react'
import { ShareCardGenerator } from '@/components/ShareCardGenerator'
import { Download, Link as LinkIcon } from 'lucide-react'

export default function ShareCardPage() {
  const [url, setUrl] = useState('https://synaptic.study')

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Share Card Generator
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create beautiful share cards with QR codes for Synaptic
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left: Card Preview */}
          <div className="flex justify-center">
            <ShareCardGenerator url={url} />
          </div>

          {/* Right: Controls */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Customize URL
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    URL to Encode in QR Code
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="https://synaptic.study"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                How to Use
              </h2>
              <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded-full flex items-center justify-center font-semibold">
                    1
                  </span>
                  <span>Customize the URL if needed (default is synaptic.study)</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded-full flex items-center justify-center font-semibold">
                    2
                  </span>
                  <span>Click "Download Share Card" to save the image</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded-full flex items-center justify-center font-semibold">
                    3
                  </span>
                  <span>Share on social media, print as flyers, or use in presentations</span>
                </li>
              </ol>
            </div>

            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Perfect For:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Social media posts (Instagram, Twitter, LinkedIn)
                </li>
                <li className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Printed flyers and promotional materials
                </li>
                <li className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Conference presentations and demos
                </li>
                <li className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Email signatures and newsletters
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">540×960</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Dimensions (px)</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow">
            <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">PNG</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Format</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">High</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">QR Quality</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow">
            <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">Free</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Always</div>
          </div>
        </div>
      </div>
    </div>
  )
}
