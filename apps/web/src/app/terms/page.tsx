import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Lloyd',
  description: 'Lloyd Terms of Service — rules and guidelines for using Lloyd, your AI messaging assistant.',
};

export default function TermsPage() {
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

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: March 31, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed text-gray-600">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Service Description</h2>
            <p>
              Lloyd (&quot;the Service&quot;) is an AI-powered personal assistant operated by Lloyd (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
              Lloyd communicates with you via SMS text messages, email, and WhatsApp. The Service provides AI-generated
              responses, reminders, and information based on your messages and preferences.
            </p>
            <p className="mt-2">
              Lloyd is designed for informational and productivity purposes. It is not a substitute for professional
              advice (medical, legal, financial, or otherwise).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. SMS Messaging Terms</h2>
            <p>
              By providing your phone number and opting in during signup, you consent to receive recurring automated
              SMS/MMS messages from Lloyd at the phone number you provided. Message frequency varies based on your
              usage and interaction with the Service.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Message &amp; data rates may apply.</strong> Your carrier&apos;s standard messaging rates will apply
                to messages you send and receive.
              </li>
              <li>
                <strong>Opt-out:</strong> You may opt out of SMS messages at any time by texting <strong>STOP</strong> to
                our number. You will receive a confirmation message and no further SMS messages will be sent.
              </li>
              <li>
                <strong>Help:</strong> Text <strong>HELP</strong> to our number for assistance or contact us at{' '}
                <a href="mailto:support@heylloyd.co" className="text-blue-600 hover:underline">support@heylloyd.co</a>.
              </li>
              <li>
                Consent to receive SMS messages is not a condition of purchasing any goods or services.
              </li>
              <li>
                Compatible carriers include but are not limited to AT&amp;T, T-Mobile, Verizon, and Sprint. T-Mobile is
                not liable for delayed or undelivered messages.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Eligibility &amp; Account Registration</h2>
            <p>
              You must be at least 13 years old to use the Service. By creating an account, you represent that the
              information you provide is accurate and that you are authorized to use the phone number and email
              addresses you register.
            </p>
            <p className="mt-2">
              You are responsible for maintaining the security of your account and for all activities that occur
              through your registered channels (phone, email).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Account Responsibilities</h2>
            <p>You agree to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Use the Service only for lawful purposes</li>
              <li>Not attempt to abuse, overload, or interfere with the Service</li>
              <li>Not use the Service to send spam, harassment, or harmful content</li>
              <li>Keep your contact information up to date</li>
              <li>Not share your account access with others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Data Usage</h2>
            <p>
              We collect and use your data to provide and improve the Service. This includes your name, phone number,
              email addresses, and message history. For full details, please see our{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
            </p>
            <p className="mt-2">
              Your messages are processed by AI systems to generate responses. We may retain conversation history to
              provide contextual, personalized assistance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. AI-Generated Content</h2>
            <p>
              Lloyd&apos;s responses are generated by artificial intelligence and may not always be accurate, complete, or
              up to date. You should independently verify important information. We are not liable for decisions made
              based on AI-generated content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Service Availability</h2>
            <p>
              We strive to keep Lloyd available at all times, but we do not guarantee uninterrupted service. The
              Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Termination &amp; Cancellation</h2>
            <p>
              You may cancel your account at any time by contacting us at{' '}
              <a href="mailto:support@heylloyd.co" className="text-blue-600 hover:underline">support@heylloyd.co</a>.
              Upon cancellation:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>We will stop sending messages to your registered channels</li>
              <li>Your conversation history will be deleted within 30 days</li>
              <li>Your account data will be removed from our systems</li>
            </ul>
            <p className="mt-2">
              We reserve the right to suspend or terminate accounts that violate these Terms, engage in abuse, or
              pose a risk to the Service or other users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Limitation of Liability</h2>
            <p>
              The Service is provided &quot;as is&quot; without warranties of any kind. To the fullest extent permitted by law,
              we shall not be liable for any indirect, incidental, special, or consequential damages arising from
              your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of material changes via your registered
              communication channels. Continued use of the Service after changes constitutes acceptance of the
              updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Contact</h2>
            <p>
              If you have questions about these Terms, contact us at{' '}
              <a href="mailto:support@heylloyd.co" className="text-blue-600 hover:underline">support@heylloyd.co</a>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex gap-6 text-sm text-gray-400">
          <Link href="/privacy" className="hover:text-gray-600">Privacy Policy</Link>
          <Link href="/signup" className="hover:text-gray-600">Sign Up</Link>
          <Link href="/" className="hover:text-gray-600">Home</Link>
        </div>
      </div>
    </main>
  );
}
