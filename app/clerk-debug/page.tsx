export default function ClerkDebugPage() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const hasSecretKey = !!process.env.CLERK_SECRET_KEY

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          Clerk Configuration Debug
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Environment Variables
            </h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${publishableKey ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: {publishableKey ? 'Set' : 'Missing'}
                </span>
              </div>
              {publishableKey && (
                <div className="ml-5 text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  {publishableKey}
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${hasSecretKey ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  CLERK_SECRET_KEY: {hasSecretKey ? 'Set' : 'Missing'}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Clerk URLs
            </h2>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div>Sign In URL: {process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || 'Not set'}</div>
              <div>Sign Up URL: {process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || 'Not set'}</div>
              <div>After Sign In: {process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || 'Not set'}</div>
              <div>After Sign Up: {process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || 'Not set'}</div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Next Steps
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li>Go to <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Clerk Dashboard</a></li>
              <li>Select your application: <strong>internal-cheetah-42</strong></li>
              <li>Go to <strong>API Keys</strong> section</li>
              <li>Copy the <strong>Publishable key</strong> (starts with pk_test_)</li>
              <li>Copy the <strong>Secret key</strong> (starts with sk_test_)</li>
              <li>Update your .env.local file</li>
              <li>Restart the dev server</li>
            </ol>
          </div>
        </div>

        <div className="mt-6">
          <a
            href="/sign-in"
            className="inline-block px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Test Sign-In Page →
          </a>
        </div>
      </div>
    </div>
  )
}
