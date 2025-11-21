import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy - Synaptic",
  description: "Privacy Policy for Synaptic - Your data, your control.",
}

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-black dark:text-white mb-8">
        Privacy Policy
      </h1>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Last Updated: November 21, 2025
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            1. Introduction
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Welcome to Synaptic ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered learning platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            2. Information We Collect
          </h2>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            2.1 Account Information
          </h3>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li>Email address</li>
            <li>Name (if provided)</li>
            <li>Authentication credentials (managed by Clerk)</li>
            <li>Profile preferences and learning style data</li>
          </ul>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            2.2 Content You Upload
          </h3>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li>Documents (PDFs, DOCX, TXT files)</li>
            <li>Study notes and flashcards</li>
            <li>Essays and writing assignments</li>
            <li>Chat conversations with our AI tutors</li>
            <li>Study session data and progress tracking</li>
          </ul>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            2.3 Usage Information
          </h3>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li>Feature usage patterns</li>
            <li>Study session duration and frequency</li>
            <li>Login streaks and activity metrics</li>
            <li>Device information and browser type</li>
            <li>IP address and approximate location</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            3. How We Use Your Information
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            We use your information to:
          </p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li><strong>Provide personalized learning:</strong> Generate flashcards, podcasts, mind maps, and study materials tailored to your learning style</li>
            <li><strong>Process your documents:</strong> Extract text and generate AI-powered learning content</li>
            <li><strong>Track your progress:</strong> Monitor study sessions, spaced repetition schedules, and learning achievements</li>
            <li><strong>Improve our services:</strong> Analyze usage patterns to enhance features and user experience</li>
            <li><strong>Communicate with you:</strong> Send service updates, study reminders, and support responses</li>
            <li><strong>Ensure security:</strong> Prevent fraud, abuse, and unauthorized access</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            4. Third-Party Services
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            We use the following third-party services that may collect information:
          </p>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-4">
            <h3 className="text-lg font-medium text-black dark:text-white mb-3">
              Authentication & Database
            </h3>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li><strong>Clerk:</strong> Authentication and user management (<a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>)</li>
              <li><strong>Supabase:</strong> Database and file storage (<a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>)</li>
            </ul>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-4">
            <h3 className="text-lg font-medium text-black dark:text-white mb-3">
              AI Providers
            </h3>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li><strong>OpenAI:</strong> GPT models, embeddings, and text-to-speech (<a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>)</li>
              <li><strong>DeepSeek:</strong> Cost-effective AI generation (<a href="https://www.deepseek.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>)</li>
              <li><strong>Anthropic:</strong> Claude models for complex reasoning (<a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>)</li>
            </ul>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-4">
            <h3 className="text-lg font-medium text-black dark:text-white mb-3">
              Payment Processing
            </h3>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li><strong>Stripe:</strong> Payment processing and subscription management (<a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>)</li>
            </ul>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mt-4">
            <strong>Important:</strong> When you use our AI features, your content is sent to these AI providers for processing. We use the latest models with data retention policies that prioritize privacy. OpenAI, Anthropic, and DeepSeek do not train on user data submitted through their APIs.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            5. Data Storage and Security
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            We implement industry-standard security measures to protect your data:
          </p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li><strong>Encryption:</strong> All data transmitted is encrypted using TLS/SSL</li>
            <li><strong>Access controls:</strong> Row-level security (RLS) ensures you can only access your own data</li>
            <li><strong>Authentication:</strong> Secure authentication via Clerk with OAuth support</li>
            <li><strong>Storage:</strong> Your documents are stored securely in Supabase Storage with access controls</li>
            <li><strong>Backups:</strong> Regular automated backups to prevent data loss</li>
          </ul>
          <p className="text-gray-600 dark:text-gray-400">
            While we take reasonable precautions, no system is 100% secure. You are responsible for maintaining the confidentiality of your account credentials.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            6. Data Retention
          </h2>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li><strong>Active accounts:</strong> We retain your data as long as your account is active</li>
            <li><strong>Deleted accounts:</strong> Data is permanently deleted within 30 days of account deletion</li>
            <li><strong>AI processing:</strong> Content sent to AI providers is not retained by them (per their API terms)</li>
            <li><strong>Backups:</strong> Backup copies may persist for up to 90 days</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            7. Your Rights
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            You have the following rights regarding your data:
          </p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li><strong>Access:</strong> View and export all your personal data from your dashboard</li>
            <li><strong>Correction:</strong> Update your profile information at any time</li>
            <li><strong>Deletion:</strong> Delete your account and all associated data</li>
            <li><strong>Portability:</strong> Export your study materials in standard formats</li>
            <li><strong>Opt-out:</strong> Unsubscribe from marketing emails (service emails still apply)</li>
          </ul>
          <p className="text-gray-600 dark:text-gray-400">
            To exercise these rights, visit your account settings or contact us at <a href="mailto:privacy@synaptic.study" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@synaptic.study</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            8. Children's Privacy
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Synaptic is intended for users aged 13 and older. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe we have collected information from a child under 13, please contact us immediately at <a href="mailto:privacy@synaptic.study" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@synaptic.study</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            9. International Users
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Synaptic operates globally. Your data may be transferred to and processed in the United States or other countries where our service providers operate. By using Synaptic, you consent to the transfer of your data to these jurisdictions. We ensure adequate safeguards are in place for international data transfers.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            10. Cookies and Tracking
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            We use essential cookies and similar technologies to:
          </p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li>Maintain your session and authentication status</li>
            <li>Remember your preferences (dark mode, learning style)</li>
            <li>Analyze usage patterns (via anonymous analytics)</li>
            <li>Improve performance and user experience</li>
          </ul>
          <p className="text-gray-600 dark:text-gray-400">
            You can control cookie settings through your browser, but disabling certain cookies may affect functionality.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            11. Changes to This Policy
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last Updated" date. For material changes, we will notify you via email or prominent notice on our platform. Continued use of Synaptic after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            12. Contact Us
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
          </p>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              <strong>Email:</strong> <a href="mailto:privacy@synaptic.study" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@synaptic.study</a>
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              <strong>Support:</strong> <a href="mailto:support@synaptic.study" className="text-blue-600 dark:text-blue-400 hover:underline">support@synaptic.study</a>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              <strong>Response Time:</strong> We aim to respond to all privacy requests within 30 days
            </p>
          </div>
        </section>

        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Your data, your control.</strong> At Synaptic, we believe education should be private and personal. We never sell your data, and we only use it to provide you with the best learning experience possible.
          </p>
        </div>
      </div>
    </div>
  )
}
