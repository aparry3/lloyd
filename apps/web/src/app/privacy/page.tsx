import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Lloyd',
  description: 'Lloyd Privacy Policy — how we collect, use, and protect your personal information.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <Link href="/" className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            L
          </div>
          <span className="text-lg font-bold tracking-tight">Lloyd</span>
        </Link>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: March 31, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed text-gray-600">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              Lloyd (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains
              how we collect, use, store, and share your personal information when you use our AI assistant service
              (&quot;the Service&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Information We Collect</h2>

            <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Information you provide:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Name</strong> — to personalize your experience</li>
              <li><strong>Phone number</strong> — to communicate via SMS and WhatsApp</li>
              <li><strong>Email address(es)</strong> — to communicate via email and identify your account</li>
              <li><strong>Message content</strong> — the text of messages you send to and receive from Lloyd</li>
            </ul>

            <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Information collected automatically:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>IP address</strong> — for rate limiting and security during signup</li>
              <li><strong>Timestamps</strong> — when messages are sent and received</li>
              <li><strong>Channel metadata</strong> — which communication channel you used (SMS, email, WhatsApp)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Provide the Service</strong> — process your messages and generate AI-powered responses</li>
              <li><strong>Maintain conversation context</strong> — remember prior interactions for personalized assistance</li>
              <li><strong>Send reminders and notifications</strong> — deliver scheduled messages you&apos;ve requested</li>
              <li><strong>Identify you across channels</strong> — link your SMS, email, and WhatsApp conversations</li>
              <li><strong>Improve the Service</strong> — analyze usage patterns (in aggregate) to make Lloyd better</li>
              <li><strong>Ensure security</strong> — prevent abuse and unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Third-Party Services</h2>
            <p>
              We use the following third-party services to operate Lloyd. Each processes some of your data on our behalf:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>
                <strong>Twilio</strong> — SMS and WhatsApp message delivery. Twilio processes your phone number and
                message content.{' '}
                <a href="https://www.twilio.com/legal/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  Twilio Privacy Policy
                </a>
              </li>
              <li>
                <strong>SendGrid</strong> — Email delivery. SendGrid processes your email address and message content.{' '}
                <a href="https://www.twilio.com/en-us/legal/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  SendGrid Privacy Policy
                </a>
              </li>
              <li>
                <strong>OpenAI</strong> — AI response generation. OpenAI processes your message content to generate
                responses. We do not send your name, phone number, or email to OpenAI.{' '}
                <a href="https://openai.com/policies/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  OpenAI Privacy Policy
                </a>
              </li>
              <li>
                <strong>Vercel</strong> — Application hosting and infrastructure.{' '}
                <a href="https://vercel.com/legal/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  Vercel Privacy Policy
                </a>
              </li>
            </ul>
            <p className="mt-2">
              We do not sell, rent, or share your personal information with third parties for their marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Data Storage &amp; Security</h2>
            <p>
              Your data is stored in secure, encrypted databases hosted in the United States. We implement
              industry-standard security measures including:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Encryption in transit (TLS/HTTPS) for all communications</li>
              <li>Encrypted database storage</li>
              <li>Access controls limiting who can view user data</li>
              <li>Regular security reviews</li>
            </ul>
            <p className="mt-2">
              While we take reasonable precautions, no method of electronic transmission or storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. If you cancel your account, we will delete
              your personal information and conversation history within 30 days. Some data may be retained longer
              if required by law or for legitimate business purposes (e.g., fraud prevention).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
              <li><strong>Correction</strong> — request correction of inaccurate data</li>
              <li><strong>Deletion</strong> — request deletion of your account and personal data</li>
              <li><strong>Opt-out of SMS</strong> — text STOP to our number at any time</li>
              <li><strong>Data portability</strong> — request your data in a machine-readable format</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:support@heylloyd.co" className="text-blue-600 hover:underline">support@heylloyd.co</a>.
              We will respond to requests within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for children under 13 years of age. We do not knowingly collect personal
              information from children under 13. If you believe we have collected data from a child under 13,
              please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes via your
              registered communication channels. The &quot;Last updated&quot; date at the top of this page indicates when
              the policy was last revised.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or your personal data, contact us at:
            </p>
            <p className="mt-2">
              <strong>Email:</strong>{' '}
              <a href="mailto:support@heylloyd.co" className="text-blue-600 hover:underline">support@heylloyd.co</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex gap-6 text-sm text-gray-400">
          <Link href="/terms" className="hover:text-gray-600">Terms of Service</Link>
          <Link href="/signup" className="hover:text-gray-600">Sign Up</Link>
          <Link href="/" className="hover:text-gray-600">Home</Link>
        </div>
      </div>
    </main>
  );
}
