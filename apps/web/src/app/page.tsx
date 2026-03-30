import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold mb-4">Lloyd</h1>
      <p className="text-lg text-gray-600 max-w-md text-center mb-8">
        Your AI assistant — available via text, WhatsApp, and email.
        Just message and Lloyd handles the rest.
      </p>
      <Link
        href="/signup"
        className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
      >
        Sign Up
      </Link>
    </main>
  );
}
