'use client';

import { useState, useEffect, useCallback } from 'react';

interface Stats {
  totals: {
    users: number;
    conversations: number;
    memories: number;
    reminders: { pending: number; delivered: number; total: number };
  };
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    preferred_channel: string;
    created_at: string;
  }>;
  recentConversations: Array<{
    id: string;
    userName: string;
    channel: string;
    last_message_at: string;
  }>;
  memoryStats: Array<{
    name: string;
    memoryCount: string;
  }>;
}

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const fetchStats = useCallback(async (key: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-secret': key },
      });
      if (!res.ok) {
        setError(res.status === 401 ? 'Invalid admin secret' : 'Failed to fetch stats');
        setStats(null);
        setAuthenticated(false);
        return;
      }
      const data = await res.json();
      setStats(data);
      setAuthenticated(true);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 30s when authenticated
  useEffect(() => {
    if (!authenticated || !secret) return;
    const interval = setInterval(() => fetchStats(secret), 30_000);
    return () => clearInterval(interval);
  }, [authenticated, secret, fetchStats]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStats(secret);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (!authenticated) {
    return (
      <div style={{ maxWidth: 400, margin: '100px auto', fontFamily: 'system-ui' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>🔐 Lloyd Admin</h1>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            placeholder="Admin secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 16,
              border: '1px solid #ccc',
              borderRadius: 8,
              marginBottom: 12,
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            disabled={loading || !secret}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 16,
              background: '#111',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            {loading ? 'Loading...' : 'Sign In'}
          </button>
        </form>
        {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}
      </div>
    );
  }

  if (!stats) return null;

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  };

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>📊 Lloyd Dashboard</h1>
        <button
          onClick={() => fetchStats(secret)}
          disabled={loading}
          style={{
            padding: '6px 14px',
            fontSize: 14,
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {loading ? '⏳' : '🔄 Refresh'}
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.totals.users}</div>
          <div style={{ color: '#666', fontSize: 14 }}>Users</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.totals.conversations}</div>
          <div style={{ color: '#666', fontSize: 14 }}>Conversations</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.totals.memories}</div>
          <div style={{ color: '#666', fontSize: 14 }}>Memories Saved</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.totals.reminders.pending}</div>
          <div style={{ color: '#666', fontSize: 14 }}>
            Pending Reminders
            <span style={{ color: '#999', marginLeft: 4 }}>({stats.totals.reminders.delivered} delivered)</span>
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 12 }}>👤 Recent Users</h2>
        {stats.recentUsers.length === 0 ? (
          <p style={{ color: '#999' }}>No users yet</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '8px 4px' }}>Name</th>
                <th style={{ padding: '8px 4px' }}>Email</th>
                <th style={{ padding: '8px 4px' }}>Phone</th>
                <th style={{ padding: '8px 4px' }}>Channel</th>
                <th style={{ padding: '8px 4px' }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '8px 4px' }}>{u.name}</td>
                  <td style={{ padding: '8px 4px', color: '#666' }}>{u.email}</td>
                  <td style={{ padding: '8px 4px', color: '#666' }}>{u.phone || '—'}</td>
                  <td style={{ padding: '8px 4px' }}>
                    <span style={{
                      background: u.preferred_channel === 'sms' ? '#e8f5e9' : u.preferred_channel === 'email' ? '#e3f2fd' : '#fff3e0',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                    }}>
                      {u.preferred_channel}
                    </span>
                  </td>
                  <td style={{ padding: '8px 4px', color: '#999' }}>{timeAgo(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Conversations */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 12 }}>💬 Recent Conversations</h2>
        {stats.recentConversations.length === 0 ? (
          <p style={{ color: '#999' }}>No conversations yet</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '8px 4px' }}>User</th>
                <th style={{ padding: '8px 4px' }}>Channel</th>
                <th style={{ padding: '8px 4px' }}>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentConversations.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '8px 4px' }}>{c.userName}</td>
                  <td style={{ padding: '8px 4px' }}>
                    <span style={{
                      background: c.channel === 'sms' ? '#e8f5e9' : c.channel === 'email' ? '#e3f2fd' : '#fff3e0',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                    }}>
                      {c.channel}
                    </span>
                  </td>
                  <td style={{ padding: '8px 4px', color: '#999' }}>{timeAgo(c.last_message_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Memory Stats */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 12 }}>🧠 Memory Stats</h2>
        {stats.memoryStats.length === 0 ? (
          <p style={{ color: '#999' }}>No memories saved yet</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '8px 4px' }}>User</th>
                <th style={{ padding: '8px 4px' }}>Memories</th>
              </tr>
            </thead>
            <tbody>
              {stats.memoryStats.map((m) => (
                <tr key={m.name} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '8px 4px' }}>{m.name}</td>
                  <td style={{ padding: '8px 4px', fontWeight: 600 }}>{m.memoryCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ textAlign: 'center', color: '#ccc', fontSize: 12, marginTop: 32 }}>
        Auto-refreshes every 30s
      </p>
    </div>
  );
}
