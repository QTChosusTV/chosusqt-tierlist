'use client';

import TestChat from '@/components/TestChat';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { MODES } from '@/types/tierlist';
import type { QueueEntry } from '@/app/queue/page';

function PlayerAvatar({ username, size = 32 }: { username: string; size?: number }) {
  return (
    <Image
      src={`https://mc-heads.net/avatar/${username}`}
      alt={username}
      width={size}
      height={size}
      style={{ borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.55)', display: 'block', objectFit: 'cover', flexShrink: 0 }}
    />
  );
}

function ModeIcon({ modeKey, size = 18 }: { modeKey: string; size?: number }) {
  const mode = MODES.find(m => m.key === modeKey?.toLowerCase());
  return (
    <Image
      src={mode ? mode.icon : '/sword.svg'}
      alt={modeKey}
      width={size}
      height={size}
      style={{ objectFit: 'contain', display: 'block', flexShrink: 0 }}
    />
  );
}

export default function TesterPage() {
  const [newPassword, setNewPassword] = useState('');
  const [isRecovery, setIsRecovery] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [testerUsername, setTesterUsername] = useState<string | null>(null);
  const [testerId, setTesterId] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [activeEntry, setActiveEntry] = useState<QueueEntry | null>(null);
  const [timeout, setTimeout_] = useState(5);

  // ── Recovery detection ────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setIsRecovery(true);
      });
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleResetPassword() {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) alert(error.message);
    else {
      alert('Password updated!');
      setIsRecovery(false);
    }
  }

  // ── Session check ─────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadTester(session.user.id);
    });
  }, []);

  async function loadTester(uid: string) {
    const { data } = await supabase
      .from('testers' as any)
      .select('username, is_open')
      .eq('id', uid)
      .maybeSingle() as { data: { username: string; is_open: boolean } | null };
    if (data) {
      setTesterUsername(data.username);
      setTesterId(uid);
      setIsOpen(data.is_open ?? false);
    }
  }

  // ── Sync is_open to DB ────────────────────────────────────────────────────
  async function toggleOpen() {
    const next = !isOpen;
    setIsOpen(next);
    if (testerId) {
      await (supabase as any)
        .from('testers')
        .update({ is_open: next })
        .eq('id', testerId);
    }
    // Auto-remove active player when closing
    if (!next && myActive) {
      await supabase.from('queue' as any).delete().eq('id', myActive.id);
      setActiveEntry(null);
    }
  }
  
  // ── Heartbeat: update last_seen every 30s ─────────────────────────────────
  useEffect(() => {
    if (!testerId) return;
    const ping = async () => {
      await (supabase as any)
        .from('testers')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', testerId);
    };
    ping();
    const interval = setInterval(ping, 30000);
    return () => clearInterval(interval);
  }, [testerId]);

  // ── Clear last_seen on logout ─────────────────────────────────────────────
  async function handleLogout() {
    if (testerId) {
      await (supabase as any)
        .from('testers')
        .update({ last_seen: null, is_open: false })
        .eq('id', testerId);
    }
    await supabase.auth.signOut();
    setTesterUsername(null);
    setTesterId(null);
    setIsOpen(false);
    setActiveEntry(null);
  }

  async function handleLogin() {
    setLoggingIn(true);
    setLoginError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError(error.message);
    } else if (data.user) {
      await loadTester(data.user.id);
    }
    setLoggingIn(false);
  }

  // ── Queue ─────────────────────────────────────────────────────────────────
  async function fetchQueue() {
    const { data } = await supabase
      .from('queue' as any)
      .select('*')
      .in('status', ['waiting', 'in_progress'])
      .order('joined_at', { ascending: true });
    if (data) {
      const entries = data as QueueEntry[];
      setQueue(entries);
      if (activeEntry) {
        const updated = entries.find(e => e.id === activeEntry.id);
        setActiveEntry(updated ?? null);
      }
    }
  }

  useEffect(() => {
    if (!testerUsername) return;
    fetchQueue();
    const channel = supabase
      .channel('tester_queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, fetchQueue)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [testerUsername]);

  async function handleClaim(entry: QueueEntry) {
    setClaiming(true);
    const { error } = await (supabase as any)
      .from('queue')
      .update({
        status: 'in_progress',
        claimed_by: testerUsername,
        claimed_at: new Date().toISOString(),
        timeout_minutes: timeout,
      })
      .eq('id', entry.id)
      .eq('status', 'waiting');
    if (error) {
      alert('Could not claim — someone else may have claimed this player first.');
    } else {
      setActiveEntry({ ...entry, status: 'in_progress', claimed_by: testerUsername, timeout_minutes: timeout });
    }
    setClaiming(false);
  }

  async function handleDone() {
    if (!activeEntry) return;
    await supabase.from('queue' as any).delete().eq('id', activeEntry.id);
    setActiveEntry(null);
  }

  async function handleSkip() {
    if (!activeEntry) return;
    await supabase.from('queue' as any).delete().eq('id', activeEntry.id);
    setActiveEntry(null);
  }

  const waitingQueue = queue.filter(e => e.status === 'waiting');
  const myActive = activeEntry ?? queue.find(e => e.status === 'in_progress' && e.claimed_by === testerUsername);

  // ── Recovery screen ───────────────────────────────────────────────────────
  if (isRecovery) {
    return (
      <div style={{ maxWidth: 380, margin: '100px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, textAlign: 'center', marginBottom: 24, color: 'white' }}>
          Set New Password
        </h1>
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, outline: 'none', marginBottom: 12 }}
        />
        <button
          onClick={handleResetPassword}
          style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #4aa3ff, #b56bff)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}
        >
          Update Password
        </button>
      </div>
    );
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!testerUsername) {
    return (
      <div style={{ maxWidth: 380, margin: '100px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, textAlign: 'center', marginBottom: 32, background: 'linear-gradient(135deg, #4aa3ff, #b56bff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Tester Login
        </h1>
        <div style={{ background: 'linear-gradient(180deg, #141418, #0e0e12)', borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', color: '#fff' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</div>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="tester@email.com"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</div>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, outline: 'none' }} />
          </div>
          {loginError && <div style={{ fontSize: 13, color: '#ff5555', marginBottom: 12 }}>{loginError}</div>}
          <button onClick={handleLogin} disabled={loggingIn}
            style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #4aa3ff, #b56bff)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            {loggingIn ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </div>
    );
  }

  // ── Tester Panel ──────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, background: 'linear-gradient(135deg, #4aa3ff, #b56bff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Tester Panel
          </h1>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            Logged in as <span style={{ color: 'white', fontWeight: 700 }}>{testerUsername}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={toggleOpen} style={{
            padding: '8px 18px', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer',
            background: isOpen ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.07)',
            color: isOpen ? '#4ade80' : 'rgba(255,255,255,0.4)',
            borderWidth: '1.5px', borderStyle: 'solid',
            borderColor: isOpen ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)',
          }}>
            {isOpen ? '● Open' : '○ Closed'}
          </button>
          <button onClick={handleLogout}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,85,85,0.3)', background: 'rgba(255,85,85,0.08)', color: '#ff5555', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            Logout
          </button>
        </div>
      </div>

      {myActive && (
        <div style={{ marginBottom: 28, borderRadius: 12, padding: '18px 20px', background: 'rgba(74,222,128,0.06)', border: '1.5px solid rgba(74,222,128,0.25)' }}>
          <div style={{ fontSize: 11, color: 'rgba(74,222,128,0.7)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 12 }}>Active Test</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <PlayerAvatar username={myActive.username} size={44} />
            <div>
              <div style={{ fontWeight: 800, color: 'white', fontSize: 16 }}>{myActive.username}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <ModeIcon modeKey={myActive.mode} size={14} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{myActive.mode}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>·</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Timeout: {myActive.timeout_minutes}min</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleDone} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #4ade80, #22c55e)', color: '#000', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>✓ Mark Done</button>
            <button onClick={handleSkip} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(255,85,85,0.3)', background: 'rgba(255,85,85,0.08)', color: '#ff5555', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>✕ Skip</button>
          </div>
        </div>


      )}

      {myActive && (
          <div style={{ marginBottom: 28 }}>
            <TestChat
              entryId={myActive.id}
              myName={testerUsername!}
              otherName={myActive.username}
            />
          </div>
        )}

      {!myActive && isOpen && (
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Timeout for next claim:</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 5, 10, 15].map(t => (
              <button key={t} onClick={() => setTimeout_(t)} style={{
                padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                background: timeout === t ? 'rgba(74,163,255,0.2)' : 'rgba(255,255,255,0.05)',
                color: timeout === t ? '#4aa3ff' : 'rgba(255,255,255,0.4)',
                outline: timeout === t ? '1.5px solid rgba(74,163,255,0.4)' : 'none',
              }}>{t}m</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 10 }}>
        Queue — {waitingQueue.length} waiting
      </div>

      {waitingQueue.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', padding: '40px 0', fontSize: 15 }}>Queue is empty</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {waitingQueue.map((entry, index) => {
            const isNext = index === 0;
            return (
              <div key={entry.id} style={{
                borderRadius: 10, padding: '12px 16px',
                background: isNext ? 'rgba(74,163,255,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isNext ? 'rgba(74,163,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: isNext ? '#4aa3ff' : 'rgba(255,255,255,0.25)', minWidth: 28, textAlign: 'center' }}>#{index + 1}</span>
                <PlayerAvatar username={entry.username} size={32} />
                <span style={{ fontWeight: 700, color: 'white', fontSize: 14, flex: 1 }}>{entry.username}</span>
                <ModeIcon modeKey={entry.mode} size={16} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{entry.mode}</span>
                {isNext && isOpen && !myActive && (
                  <button onClick={() => handleClaim(entry)} disabled={claiming}
                    style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #4aa3ff, #b56bff)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    Claim
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}