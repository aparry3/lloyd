import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lloyd — Your AI Assistant, Wherever You Message',
  description:
    'Text, email, or WhatsApp — Lloyd is your personal AI assistant that remembers you across every channel. Sign up for free.',
  openGraph: {
    title: 'Lloyd — Your AI Assistant',
    description: 'One assistant, every channel. Text, email, or WhatsApp.',
    siteName: 'Lloyd',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
