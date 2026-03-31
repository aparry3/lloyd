import Link from 'next/link';

function MessageBubble({
  text,
  from,
  delay,
}: {
  text: string;
  from: 'user' | 'lloyd';
  delay?: string;
}) {
  const isUser = from === 'user';
  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      style={delay ? { animationDelay: delay } : undefined}
    >
      <div
        className={`max-w-[280px] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center p-6">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function ChannelBadge({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm">
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
            L
          </div>
          <span className="text-xl font-bold tracking-tight">Lloyd</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-center max-w-2xl leading-tight mb-5">
          Your AI assistant,{' '}
          <span className="text-blue-600">wherever you message</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-500 text-center max-w-lg mb-8 leading-relaxed">
          Text, email, or WhatsApp — Lloyd is there. One assistant that remembers you across every channel.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <Link
            href="/signup"
            className="rounded-xl bg-blue-600 px-7 py-3.5 text-white font-semibold hover:bg-blue-700 transition-colors text-center shadow-lg shadow-blue-600/20"
          >
            Get Started — Free
          </Link>
          <a
            href="#how-it-works"
            className="rounded-xl border border-gray-200 px-7 py-3.5 font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-center"
          >
            How It Works
          </a>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <ChannelBadge icon="💬" label="SMS" />
          <ChannelBadge icon="📧" label="Email" />
          <ChannelBadge icon="🟢" label="WhatsApp" />
        </div>
      </section>

      {/* Demo conversation */}
      <section className="flex justify-center px-6 pb-16 md:pb-24">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              L
            </div>
            <div>
              <div className="text-sm font-semibold">Lloyd</div>
              <div className="text-xs text-green-600">Online</div>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <MessageBubble from="user" text="Hey Lloyd, what's the weather in NYC this weekend?" />
            <MessageBubble
              from="lloyd"
              text="Saturday looks great — 72°F and sunny. Sunday has a 40% chance of afternoon rain. Want me to remind you to bring an umbrella?"
            />
            <MessageBubble from="user" text="Yeah, remind me Saturday night" />
            <MessageBubble
              from="lloyd"
              text="Done! I'll text you Saturday at 8pm. 🌂"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Why Lloyd?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon="🧠"
              title="Remembers You"
              description="Lloyd learns your preferences, knows your context, and gets better the more you use it. Like having an assistant who never forgets."
            />
            <FeatureCard
              icon="📱"
              title="Any Channel"
              description="Text, email, or WhatsApp — use whatever's convenient. Lloyd keeps the conversation going seamlessly across all of them."
            />
            <FeatureCard
              icon="⚡"
              title="Instant Help"
              description="Research, reminders, brainstorming, quick math — just ask. No apps to download, no logins to remember."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 pb-16 md:pb-24 scroll-mt-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Get started in 30 seconds
          </h2>
          <div className="space-y-8">
            {[
              {
                step: '1',
                title: 'Sign up',
                desc: 'Enter your name, phone, and email. That\'s it.',
              },
              {
                step: '2',
                title: 'Text Lloyd',
                desc: 'Send a text to your Lloyd number, email lloyd@heylloyd.co, or message on WhatsApp.',
              },
              {
                step: '3',
                title: 'Just ask',
                desc: 'Need help with anything? Ask naturally. Lloyd figures out the rest.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-5 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-lg">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                  <p className="text-gray-500 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/signup"
              className="inline-block rounded-xl bg-blue-600 px-7 py-3.5 text-white font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              Sign Up Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              L
            </div>
            <span>Lloyd</span>
          </div>
          <p>© {new Date().getFullYear()} Lloyd. Built with care.</p>
        </div>
      </footer>
    </main>
  );
}
