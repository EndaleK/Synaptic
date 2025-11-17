"use client"

import { Shield, Lock, FileCheck } from "lucide-react"
import { useState } from "react"

export default function UploadDisclaimer() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
            Privacy & Copyright Notice
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
            By uploading documents, you confirm you have the right to use them and agree to our terms.
          </p>

          {!isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Read full disclaimer
            </button>
          )}

          {isExpanded && (
            <div className="mt-3 space-y-3 text-sm text-blue-800 dark:text-blue-200">
              <div className="flex items-start gap-2">
                <FileCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Copyright Compliance:</strong> You must own or have permission to upload and process these documents. Do not upload copyrighted materials without authorization.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Privacy Protection:</strong> Your documents are private and only accessible to you. We use industry-standard encryption and do not share your content with third parties.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Data Usage:</strong> Uploaded documents are processed by AI to generate study materials. We do not use your documents to train AI models. You can delete your documents at any time.
                </div>
              </div>

              <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  By clicking "Upload" or "Continue," you acknowledge that you have read and agree to these terms.
                  For more information, see our <a href="/privacy" className="underline hover:text-blue-900 dark:hover:text-blue-100">Privacy Policy</a> and <a href="/terms" className="underline hover:text-blue-900 dark:hover:text-blue-100">Terms of Service</a>.
                </p>
              </div>

              <button
                onClick={() => setIsExpanded(false)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
