import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service - Synaptic",
  description: "Terms of Service for Synaptic - AI-powered personalized learning platform.",
}

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-black dark:text-white mb-8">
        Terms of Service
      </h1>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Last Updated: November 21, 2025
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            1. Acceptance of Terms
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            By accessing or using Synaptic ("the Service," "we," "our," or "us"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service. These Terms apply to all users, including free and paid subscribers.
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            We reserve the right to modify these Terms at any time. Changes will be posted on this page, and your continued use of the Service constitutes acceptance of the modified Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            2. Description of Service
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Synaptic is an AI-powered personalized learning platform that helps students study more effectively. Our Service includes:
          </p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li><strong>Document Upload & Processing:</strong> Upload PDFs, DOCX, and TXT files (up to 500MB)</li>
            <li><strong>AI-Generated Content:</strong> Flashcards, podcasts, mind maps, quick summaries, and study guides</li>
            <li><strong>Interactive Learning:</strong> Chat with AI tutors, spaced repetition, writing assistant</li>
            <li><strong>Progress Tracking:</strong> Study sessions, heatmaps, streaks, and analytics</li>
            <li><strong>Learning Style Assessment:</strong> Personalized recommendations based on VAK model</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            3. User Accounts
          </h2>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            3.1 Registration
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You must create an account to use certain features. You agree to:
          </p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain and update your information to keep it accurate</li>
            <li>Keep your password secure and confidential</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Be responsible for all activities under your account</li>
          </ul>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            3.2 Age Requirement
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You must be at least 13 years old to use the Service. Users under 18 should have parental consent. By using the Service, you represent that you meet these age requirements.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            4. Acceptable Use
          </h2>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            4.1 Permitted Uses
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You may use Synaptic for:
          </p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li>Personal educational and learning purposes</li>
            <li>Academic study and research (with proper citations)</li>
            <li>Creating study materials from documents you own or have rights to</li>
            <li>Collaborative learning within your educational institution</li>
          </ul>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            4.2 Prohibited Uses
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You may NOT use Synaptic to:
          </p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li><strong>Violate laws or rights:</strong> Infringe on copyrights, trademarks, or other intellectual property rights</li>
            <li><strong>Academic dishonesty:</strong> Complete assignments for submission as your own work without proper disclosure</li>
            <li><strong>Abuse the system:</strong> Use bots, scrapers, or automated tools to access the Service</li>
            <li><strong>Circumvent limits:</strong> Create multiple accounts to evade usage restrictions</li>
            <li><strong>Harm others:</strong> Upload malicious files, viruses, or harmful content</li>
            <li><strong>Resell or redistribute:</strong> Resell access to the Service or redistribute generated content commercially</li>
            <li><strong>Reverse engineer:</strong> Attempt to extract our AI models or proprietary algorithms</li>
            <li><strong>Spam or harass:</strong> Use the Service to send unsolicited communications</li>
          </ul>

          <p className="text-gray-600 dark:text-gray-400 mt-4">
            <strong>Academic Integrity:</strong> Synaptic is a study aid, not a replacement for learning. You are responsible for ensuring your use complies with your institution's academic integrity policies. Always cite AI-generated content when submitting academic work.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            5. Content and Intellectual Property
          </h2>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            5.1 Your Content
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You retain ownership of any documents, notes, or materials you upload ("Your Content"). By uploading Your Content, you grant us a limited license to:
          </p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li>Process and analyze Your Content to provide the Service</li>
            <li>Generate study materials (flashcards, podcasts, mind maps) based on Your Content</li>
            <li>Store Your Content securely in our databases</li>
          </ul>
          <p className="text-gray-600 dark:text-gray-400">
            <strong>Important:</strong> We do NOT claim ownership of Your Content. We do NOT use Your Content to train AI models or for any purpose other than providing you with the Service.
          </p>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            5.2 AI-Generated Content
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Content generated by our AI (flashcards, summaries, podcasts, etc.) is provided to you for your personal use. You may:
          </p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li>Use generated content for personal study and learning</li>
            <li>Share study materials with classmates or study groups</li>
            <li>Export and save your generated content</li>
          </ul>
          <p className="text-gray-600 dark:text-gray-400">
            You may NOT commercially exploit AI-generated content without a separate commercial license.
          </p>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            5.3 Our Intellectual Property
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            The Synaptic platform, including its design, code, features, algorithms, and branding, is owned by us and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or create derivative works based on our platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            6. Subscriptions and Payments
          </h2>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            6.1 Subscription Plans
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Synaptic offers both free and paid subscription plans:
          </p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li><strong>Free Plan:</strong> Limited features, usage caps, basic support</li>
            <li><strong>Pro Plan:</strong> Unlimited features, priority processing, advanced analytics</li>
            <li><strong>Educational Discounts:</strong> Available for verified students and educators</li>
          </ul>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            6.2 Billing and Renewals
          </h3>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li>Subscriptions automatically renew unless canceled</li>
            <li>You will be charged at the start of each billing cycle</li>
            <li>Prices are subject to change with 30 days' notice</li>
            <li>All payments are processed securely through Stripe</li>
          </ul>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            6.3 Cancellation and Refunds
          </h3>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li>You may cancel your subscription at any time from your account settings</li>
            <li>Cancellations take effect at the end of the current billing period</li>
            <li>No refunds for partial billing periods, except as required by law</li>
            <li>Refunds for technical issues evaluated on a case-by-case basis</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            7. Service Availability and Limitations
          </h2>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            7.1 Uptime and Maintenance
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            We strive for 99.9% uptime but cannot guarantee uninterrupted service. We may perform scheduled maintenance with advance notice. Emergency maintenance may occur without notice.
          </p>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            7.2 Usage Limits
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            To ensure fair use and system stability, we enforce the following limits:
          </p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li><strong>Free Plan:</strong> 5 documents, 50 flashcards, 3 podcasts per month</li>
            <li><strong>Pro Plan:</strong> Unlimited usage, subject to fair use policy</li>
            <li><strong>File Size:</strong> Maximum 500MB per document</li>
            <li><strong>Rate Limits:</strong> API calls throttled to prevent abuse</li>
          </ul>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            7.3 AI Limitations
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            AI-generated content is provided "as is" and may contain errors, inaccuracies, or biases. You should verify important information and not rely solely on AI outputs for critical decisions or submissions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            8. Disclaimers and Limitations of Liability
          </h2>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            8.1 No Warranties
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
          </p>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            8.2 Limitation of Liability
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR:
          </p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li>Indirect, incidental, special, consequential, or punitive damages</li>
            <li>Loss of data, profits, or business opportunities</li>
            <li>Academic consequences from use of AI-generated content</li>
            <li>Errors, inaccuracies, or omissions in AI outputs</li>
            <li>Third-party actions or content</li>
          </ul>
          <p className="text-gray-600 dark:text-gray-400">
            OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS, OR $100, WHICHEVER IS GREATER.
          </p>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            8.3 Educational Disclaimer
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Synaptic is a study tool, not a substitute for learning. We are not liable for academic performance, grades, or consequences of how you use the Service. Always verify information and comply with your institution's policies.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            9. Termination
          </h2>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            9.1 By You
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You may terminate your account at any time from your account settings. Upon termination:
          </p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li>Your subscription will be canceled (no refund for current period)</li>
            <li>Your data will be deleted within 30 days</li>
            <li>You will lose access to all generated content</li>
          </ul>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            9.2 By Us
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            We may suspend or terminate your account if:
          </p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li>You violate these Terms</li>
            <li>Your account is inactive for 12+ months</li>
            <li>Payment fails or chargebacks occur</li>
            <li>We detect fraudulent or abusive behavior</li>
            <li>Required by law or legal process</li>
          </ul>
          <p className="text-gray-600 dark:text-gray-400">
            We will provide notice when possible. Termination for cause (violations) is immediate with no refunds.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            10. Indemnification
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You agree to indemnify and hold harmless Synaptic, its affiliates, and their respective officers, directors, employees, and agents from any claims, damages, losses, or expenses (including legal fees) arising from:
          </p>
          <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any law or third-party rights</li>
            <li>Your Content or any content you upload</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            11. Dispute Resolution
          </h2>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            11.1 Governing Law
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            These Terms are governed by the laws of the United States and the State of California, without regard to conflict of law principles.
          </p>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            11.2 Informal Resolution
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Before filing a claim, you agree to contact us at <a href="mailto:legal@synaptic.study" className="text-blue-600 dark:text-blue-400 hover:underline">legal@synaptic.study</a> to attempt to resolve the dispute informally.
          </p>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            11.3 Arbitration
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            If informal resolution fails, disputes will be resolved through binding arbitration under the rules of the American Arbitration Association. You waive your right to a jury trial or class action lawsuit.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            12. Miscellaneous
          </h2>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            12.1 Entire Agreement
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            These Terms, along with our Privacy Policy, constitute the entire agreement between you and Synaptic.
          </p>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            12.2 Severability
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            If any provision of these Terms is found unenforceable, the remaining provisions remain in full force.
          </p>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            12.3 No Waiver
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Our failure to enforce any right or provision does not constitute a waiver of that right.
          </p>

          <h3 className="text-xl font-medium text-black dark:text-white mb-3">
            12.4 Assignment
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You may not assign these Terms without our consent. We may assign these Terms to any affiliate or successor.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
            13. Contact Information
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            For questions about these Terms, please contact:
          </p>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              <strong>Legal:</strong> <a href="mailto:legal@synaptic.study" className="text-blue-600 dark:text-blue-400 hover:underline">legal@synaptic.study</a>
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              <strong>Support:</strong> <a href="mailto:support@synaptic.study" className="text-blue-600 dark:text-blue-400 hover:underline">support@synaptic.study</a>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              <strong>General Inquiries:</strong> <a href="mailto:hello@synaptic.study" className="text-blue-600 dark:text-blue-400 hover:underline">hello@synaptic.study</a>
            </p>
          </div>
        </section>

        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            <strong>Summary:</strong> Use Synaptic responsibly for learning. Don't abuse the system, respect intellectual property, and comply with your school's academic integrity policies. We provide tools to help you learn—what you do with them is up to you.
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            By clicking "Sign Up" or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
        </div>
      </div>
    </div>
  )
}
