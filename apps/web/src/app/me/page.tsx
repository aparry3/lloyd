'use client';

import { useState, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';

const LLOYD_PHONE = '+1 (855) 699-5176';

interface Account {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emails: string[];
  preferredChannel: string;
  timezone: string;
  createdAt: string;
}

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

interface Todo {
  id: string;
  content: string;
  category: string;
  priority: number;
  completed: boolean;
  due_date: string | null;
  created_at: string;
}

interface Reminder {
  id: string;
  content: string;
  scheduled_at: string;
  timezone: string;
  status: string;
}

interface Schedule {
  id: string;
  description: string;
  frequency: string;
  time_of_day: string;
  timezone: string;
  days_of_week: number[] | null;
  dynamic: boolean;
  enabled: boolean;
  next_scheduled: string | null;
}

interface Dashboard {
  todos: Todo[];
  reminders: Reminder[];
  schedules: Schedule[];
}

const PRIORITY_LABELS = ['', '⚡ High', '🔴 Urgent'];
const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function EmailTag({
  email,
  onRemove,
  canRemove,
}: {
  email: string;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 rounded-lg px-2.5 py-1 text-sm">
      {email}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-blue-400 hover:text-red-500 ml-0.5 transition-colors"
          aria-label={`Remove ${email}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

export default function AccountPage() {
  const [lookupEmail, setLookupEmail] = useState('');
  const [account, setAccount] = useState<Account | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'not-found' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Editable fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [tz, setTz] = useState('America/New_York');

  // Track changes
  const [emailsToAdd, setEmailsToAdd] = useState<string[]>([]);
  const [emailsToRemove, setEmailsToRemove] = useState<string[]>([]);

  // Dashboard
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    if (!lookupEmail.trim()) return;

    setStatus('loading');
    try {
      const res = await fetch(`/api/account?email=${encodeURIComponent(lookupEmail.trim())}`);
      if (res.ok) {
        const data: Account = await res.json();
        setAccount(data);
        setName(data.name);
        setPhone(data.phone || '');
        setEmails(data.emails);
        setTz(data.timezone || 'America/New_York');
        setEmailsToAdd([]);
        setEmailsToRemove([]);
        setStatus('found');
        // Fetch dashboard data
        fetchDashboard(data.email);
      } else if (res.status === 404) {
        setStatus('not-found');
        setMessage('No account found with that email.');
      } else {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error — please try again.');
    }
  }

  async function fetchDashboard(email: string) {
    try {
      const res = await fetch(`/api/account/dashboard?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        setDashboard(await res.json());
      }
    } catch {
      // Dashboard is non-critical
    }
  }

  function addEmail(raw: string) {
    const email = raw.trim().toLowerCase();
    if (email && email.includes('@') && !emails.includes(email)) {
      setEmails((prev) => [...prev, email]);
      // Track as addition if it wasn't in the original account
      if (!account?.emails.includes(email)) {
        setEmailsToAdd((prev) => [...prev, email]);
      }
      // Remove from removals if re-added
      setEmailsToRemove((prev) => prev.filter((e) => e !== email));
    }
    setEmailInput('');
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((e) => e !== email));
    // Track as removal if it was in the original account
    if (account?.emails.includes(email)) {
      setEmailsToRemove((prev) => [...prev, email]);
    }
    // Remove from additions if it was newly added
    setEmailsToAdd((prev) => prev.filter((e) => e !== email));
  }

  function handleEmailKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault();
      addEmail(emailInput);
    }
    if (e.key === 'Backspace' && !emailInput && emails.length > 1) {
      removeEmail(emails[emails.length - 1]);
    }
  }

  function handleEmailBlur() {
    if (emailInput.trim()) addEmail(emailInput);
  }

  const hasChanges =
    account &&
    (name !== account.name ||
      phone !== (account.phone || '') ||
      tz !== (account.timezone || 'America/New_York') ||
      emailsToAdd.length > 0 ||
      emailsToRemove.length > 0);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!account || !hasChanges) return;

    setStatus('saving');
    try {
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: account.id,
          name: name !== account.name ? name : undefined,
          phone: phone !== (account.phone || '') ? (phone || null) : undefined,
          timezone: tz !== (account.timezone || 'America/New_York') ? tz : undefined,
          addEmails: emailsToAdd.length > 0 ? emailsToAdd : undefined,
          removeEmails: emailsToRemove.length > 0 ? emailsToRemove : undefined,
        }),
      });

      if (res.ok) {
        // Refresh account data
        const refreshRes = await fetch(`/api/account?email=${encodeURIComponent(emails[0])}`);
        if (refreshRes.ok) {
          const data: Account = await refreshRes.json();
          setAccount(data);
          setEmails(data.emails);
          setPhone(data.phone || '');
          setName(data.name);
          setTz(data.timezone || 'America/New_York');
          setEmailsToAdd([]);
          setEmailsToRemove([]);
        }
        setStatus('saved');
        setMessage('Changes saved!');
        setTimeout(() => setStatus('found'), 2000);
      } else {
        const data = await res.json();
        setStatus('error');
        setMessage(data.error || 'Failed to save changes');
      }
    } catch {
      setStatus('error');
      setMessage('Network error — please try again');
    }
  }

  // Lookup screen
  if (!account) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-50/50 to-white">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            L
          </div>
          <span className="text-lg font-bold tracking-tight">Lloyd</span>
        </Link>

        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <h1 className="text-2xl font-bold mb-1 text-center">Your Account</h1>
            <p className="text-gray-400 text-center mb-8 text-sm">
              Enter your email to manage your Lloyd account.
            </p>

            <form onSubmit={handleLookup} className="space-y-5">
              <div>
                <label htmlFor="lookupEmail" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  id="lookupEmail"
                  type="email"
                  required
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-600/20"
              >
                {status === 'loading' ? 'Looking up...' : 'Find My Account'}
              </button>

              {(status === 'not-found' || status === 'error') && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 text-center">
                  {message}
                </div>
              )}
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    );
  }

  // Account management screen
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-50/50 to-white">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
          L
        </div>
        <span className="text-lg font-bold tracking-tight">Lloyd</span>
      </Link>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h1 className="text-2xl font-bold mb-1 text-center">Your Account</h1>
          <p className="text-gray-400 text-center mb-8 text-sm">
            Manage your Lloyd settings
          </p>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone <span className="text-gray-300 font-normal">— for SMS</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Timezone <span className="text-gray-300 font-normal">— for reminders &amp; schedules</span>
              </label>
              <select
                id="timezone"
                value={tz}
                onChange={(e) => setTz(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
              >
                {COMMON_TIMEZONES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ').replace('America/', '').replace('Europe/', 'Europe: ').replace('Asia/', 'Asia: ').replace('Pacific/', 'Pacific: ').replace('Australia/', 'Australia: ')}
                  </option>
                ))}
                {!COMMON_TIMEZONES.includes(tz) && (
                  <option value={tz}>{tz}</option>
                )}
              </select>
            </div>

            <div>
              <label htmlFor="editEmailInput" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email addresses
              </label>
              <div className="rounded-xl border border-gray-200 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-shadow min-h-[48px]">
                <div className="flex flex-wrap gap-1.5 items-center">
                  {emails.map((email) => (
                    <EmailTag
                      key={email}
                      email={email}
                      canRemove={emails.length > 1}
                      onRemove={() => removeEmail(email)}
                    />
                  ))}
                  <input
                    id="editEmailInput"
                    type="text"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={handleEmailKeyDown}
                    onBlur={handleEmailBlur}
                    className="flex-1 min-w-[150px] py-1.5 text-sm focus:outline-none bg-transparent"
                    placeholder="Add another email..."
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                All emails you use with Lloyd. Press Enter or comma to add.
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={!hasChanges || status === 'saving'}
                className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-600/20"
              >
                {status === 'saving'
                  ? 'Saving...'
                  : status === 'saved'
                    ? '✓ Saved!'
                    : 'Save Changes'}
              </button>

              {status === 'error' && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 text-center">
                  {message}
                </div>
              )}
            </div>
          </form>

          {/* Quick reference */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Reach Lloyd</h3>
            <div className="space-y-2 text-sm text-gray-500">
              <p>
                💬 Text:{' '}
                <a
                  href={`sms:${LLOYD_PHONE.replace(/[^\d+]/g, '')}`}
                  className="text-blue-600 font-medium hover:underline"
                >
                  {LLOYD_PHONE}
                </a>
              </p>
              <p>
                📧 Email:{' '}
                <a
                  href="mailto:lloyd@heylloyd.co"
                  className="text-blue-600 font-medium hover:underline"
                >
                  lloyd@heylloyd.co
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard */}
        {dashboard && (
          <div className="space-y-4 mt-4">
            {/* To-Do List */}
            {dashboard.todos.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  ✅ To-Do List
                  <span className="text-sm font-normal text-gray-400">
                    {dashboard.todos.length} item{dashboard.todos.length !== 1 ? 's' : ''}
                  </span>
                </h2>
                {(() => {
                  const grouped: Record<string, Todo[]> = {};
                  for (const t of dashboard.todos) {
                    const cat = t.category || 'general';
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(t);
                  }
                  return Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat} className="mb-3 last:mb-0">
                      {Object.keys(grouped).length > 1 && (
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                          {cat}
                        </h3>
                      )}
                      <ul className="space-y-1.5">
                        {items.map((todo) => (
                          <li key={todo.id} className="flex items-start gap-2 text-sm">
                            <span className="text-gray-300 mt-0.5">○</span>
                            <span className="flex-1">
                              {todo.priority > 0 && (
                                <span className="text-xs mr-1">{PRIORITY_LABELS[todo.priority]}</span>
                              )}
                              {todo.content}
                              {todo.due_date && (
                                <span className="text-xs text-gray-400 ml-1.5">
                                  due {new Date(todo.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* Upcoming Reminders */}
            {dashboard.reminders.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  ⏰ Upcoming Reminders
                  <span className="text-sm font-normal text-gray-400">
                    {dashboard.reminders.length}
                  </span>
                </h2>
                <ul className="space-y-2">
                  {dashboard.reminders.map((r) => (
                    <li key={r.id} className="flex items-start gap-2 text-sm">
                      <span className="text-gray-300 mt-0.5">⏱</span>
                      <span className="flex-1">
                        {r.content}
                        <span className="text-xs text-gray-400 ml-1.5">
                          {new Date(r.scheduled_at).toLocaleString('en-US', {
                            timeZone: r.timezone,
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recurring Schedules */}
            {dashboard.schedules.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  🔄 Recurring Schedules
                  <span className="text-sm font-normal text-gray-400">
                    {dashboard.schedules.length}
                  </span>
                </h2>
                <ul className="space-y-2">
                  {dashboard.schedules.map((s) => (
                    <li key={s.id} className="text-sm">
                      <div className="font-medium">
                        {s.description}
                        {s.dynamic && (
                          <span className="text-xs bg-purple-50 text-purple-600 rounded-full px-1.5 py-0.5 ml-1.5">
                            AI
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {s.frequency === 'daily' && `Every day at ${s.time_of_day.substring(0, 5)}`}
                        {s.frequency === 'weekly' && (
                          <>
                            {s.days_of_week
                              ? s.days_of_week.map((d) => DAY_NAMES[d]).join(', ')
                              : 'Weekly'}{' '}
                            at {s.time_of_day.substring(0, 5)}
                          </>
                        )}
                        {s.frequency === 'monthly' && `Monthly at ${s.time_of_day.substring(0, 5)}`}
                        {s.next_scheduled && (
                          <> · Next: {new Date(s.next_scheduled).toLocaleString('en-US', {
                            timeZone: s.timezone,
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}</>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dashboard.todos.length === 0 && dashboard.reminders.length === 0 && dashboard.schedules.length === 0 && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 text-center text-sm text-gray-400">
                No active todos, reminders, or schedules yet. Text Lloyd to get started!
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center mt-6 text-xs text-gray-400">
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to home
          </Link>
          <span>
            Member since {new Date(account.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </main>
  );
}
