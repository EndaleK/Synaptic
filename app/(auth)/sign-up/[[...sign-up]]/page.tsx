import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
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
