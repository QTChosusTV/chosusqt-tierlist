'use client';

import TestChat from '@/components/TestChat';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { MODES } from '@/types/tierlist';

export interface QueueEntry {
  id: string;
  username: string;
  mode: string;
  joined_at: string;
  status: string;
  claimed_by?: string | null;
  claimed_at?: string | null;
  timeout_minutes?: number | null;
}

interface TesterStatus {
  username: string;
  is_open: boolean;
  last_seen: string | null;
  active_player?: string | null;
  active_mode?: string | null;
}

function PlayerAvatar({ username, size = 32 }: { username: string; size?: number }) {
  return (
    <Image
      src={`https://mc-heads.net/avatar/${username}`}
      alt={username} width={size} height={size}
      style={{
        borderRadius: 0,
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'block', objectFit: 'cover',
        flexShrink: 0, imageRendering: 'pixelated',
      }}
    />
  );
}

function ModeIcon({ modeKey, size = 18 }: { modeKey: string; size?: number }) {
  const mode = MODES.find(m => m.key === modeKey?.toLowerCase());
  return (
    <Image
      src={mode ? mode.icon : '/sword.svg'} alt={modeKey}
      width={size} height={size}
      style={{ objectFit: 'contain', display: 'block', flexShrink: 0 }}
    />
  );
}

function isOnline(last_seen: string | null): boolean {
  if (!last_seen) return false;
  return (Date.now() - new Date(last_seen).getTime()) < 2 * 60 * 1000;
}

// ── Shared style tokens ───────────────────────────────────────────────────────

const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)',
  marginBottom: 8,
};

// ─────────────────────────────────────────────────────────────────────────────

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [testers, setTesters] = useState<TesterStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedMode, setSelectedMode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [myEntry, setMyEntry] = useState<QueueEntry | null>(null);

  async function fetchQueue() {
    const { data } = await supabase
      .from('queue' as any).select('*').order('joined_at', { ascending: true });
    if (data) setQueue(data as QueueEntry[]);
    setLoading(false);
  }

  async function fetchTesters() {
    const { data } = await supabase
      .from('testers' as any).select('username, is_open, last_seen') as { data: TesterStatus[] | null };
    if (!data) return;

    const { data: queueData } = await supabase
      .from('queue' as any).select('claimed_by, username, mode').eq('status', 'in_progress') as {
        data: { claimed_by: string; username: string; mode: string }[] | null
      };

    setTesters(data.map(t => {
      const active = queueData?.find(q => q.claimed_by === t.username);
      return { ...t, active_player: active?.username ?? null, active_mode: active?.mode ?? null };
    }));
  }

  useEffect(() => {
    fetchQueue();
    fetchTesters();

    const queueChannel = supabase.channel('queue_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, () => {
        fetchQueue(); fetchTesters();
      }).subscribe();

    const testerChannel = supabase.channel('tester_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'testers' }, fetchTesters)
      .subscribe();

    const ticker = setInterval(() => setTesters(prev => [...prev]), 30000);

    return () => {
      supabase.removeChannel(queueChannel);
      supabase.removeChannel(testerChannel);
      clearInterval(ticker);
    };
  }, []);

  useEffect(() => {
    if (!username.trim()) return;
    const found = queue.find(e => e.username.toLowerCase() === username.toLowerCase());
    setMyEntry(found ?? null);
  }, [queue, username]);

  async function handleJoin() {
    if (!username.trim() || !selectedMode) return;
    if (onlineTesters.filter(t => t.is_open).length === 0) {
      setJoinError('No testers are currently open. Please wait.');
      return;
    }
    setJoining(true);
    setJoinError(null);

    const { data: existing } = await supabase
      .from('queue' as any).select('id')
      .eq('username', username.trim()).in('status', ['waiting', 'in_progress']).maybeSingle();

    if (existing) {
      setJoinError('You are already in the queue.');
      setJoining(false);
      return;
    }

    const { error } = await supabase.from('queue' as any).insert({ username: username.trim(), mode: selectedMode } as any);
    if (error) setJoinError(error.message);
    else { setShowJoin(false); fetchQueue(); }
    setJoining(false);
  }

  async function handleLeave() {
    if (!myEntry) return;
    await supabase.from('queue' as any).delete().eq('id', myEntry.id);
    setMyEntry(null);
  }

  const waitingQueue = queue.filter(e => e.status === 'waiting');
  const inProgressQueue = queue.filter(e => e.status === 'in_progress');
  const onlineTesters = testers.filter(t => isOnline(t.last_seen));
  const offlineTesters = testers.filter(t => !isOnline(t.last_seen));
  const sortedTesters = [...onlineTesters, ...offlineTesters];
  const hasOpenTester = onlineTesters.filter(t => t.is_open).length > 0;

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 24px' }}>

      {/* ── Title ── */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ width: 80, height: 1, background: 'linear-gradient(90deg, transparent, #b56bff, transparent)', margin: '0 auto 14px' }} />
        <h1 style={{
          fontSize: 36, fontWeight: 900, letterSpacing: '0.06em',
          textTransform: 'uppercase', margin: 0,
          background: 'linear-gradient(135deg, #4aa3ff 0%, #b56bff 50%, #ff4444 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Test Queue
        </h1>
        <div style={{ width: 80, height: 1, background: 'linear-gradient(90deg, transparent, #4aa3ff, transparent)', margin: '14px auto 0' }} />
        {/* Live stats */}
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 0 }}>
          {[
            { label: 'Waiting', val: waitingQueue.length },
            { label: 'In Progress', val: inProgressQueue.length },
            { label: 'Online Testers', val: onlineTesters.length },
          ].map((s, i, arr) => (
            <div key={s.label} style={{
              padding: '6px 18px',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRight: i < arr.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{s.val}</span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Nav ── */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <button
          onClick={() => { window.location.href = '/'; }}
          style={{
            padding: '8px 18px', borderRadius: 0,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer', fontWeight: 700, fontSize: 11,
            letterSpacing: '0.07em', textTransform: 'uppercase',
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
        >
          ← Home
        </button>
      </div>

      {/* ── Testers ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={sectionLabel}>
          Testers — {onlineTesters.length} online
        </div>
        {sortedTesters.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: 13, padding: '12px 0', letterSpacing: '0.04em' }}>No testers found</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sortedTesters.map(tester => {
              const online = isOnline(tester.last_seen);
              const dotColor = online ? (tester.is_open ? '#4ade80' : '#facc15') : 'rgba(255,255,255,0.15)';
              return (
                <div key={tester.username} style={{
                  padding: '10px 14px',
                  background: online ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)',
                  border: `1px solid ${online ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)'}`,
                  borderLeft: `3px solid ${dotColor}`,
                  display: 'flex', alignItems: 'center', gap: 10,
                  opacity: online ? 1 : 0.4,
                }}>
                  <PlayerAvatar username={tester.username} size={28} />
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: 13, flex: 1 }}>{tester.username}</span>

                  {/* Status badge */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px',
                    borderRadius: 0, letterSpacing: '0.08em', textTransform: 'uppercase',
                    background: online
                      ? (tester.is_open ? 'rgba(74,222,128,0.1)' : 'rgba(250,204,21,0.08)')
                      : 'rgba(255,255,255,0.04)',
                    color: online ? (tester.is_open ? '#4ade80' : '#facc15') : 'rgba(255,255,255,0.2)',
                    border: `1px solid ${online ? (tester.is_open ? 'rgba(74,222,128,0.3)' : 'rgba(250,204,21,0.25)') : 'rgba(255,255,255,0.06)'}`,
                  }}>
                    {online ? (tester.is_open ? 'Open' : 'Busy') : 'Offline'}
                  </span>

                  {/* Active player */}
                  {tester.active_player && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>testing</span>
                      <PlayerAvatar username={tester.active_player} size={20} />
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{tester.active_player}</span>
                      {tester.active_mode && <ModeIcon modeKey={tester.active_mode} size={12} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── My position banner ── */}
      {myEntry && (
        <div style={{
          marginBottom: 20,
          padding: '12px 16px',
          background: 'rgba(74,163,255,0.06)',
          border: '1px solid rgba(74,163,255,0.2)',
          borderLeft: '3px solid #4aa3ff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Your position</span>
            <span style={{ fontWeight: 900, fontSize: 20, color: '#4aa3ff' }}>
              #{waitingQueue.findIndex(e => e.id === myEntry.id) + 1}
            </span>
            <ModeIcon modeKey={myEntry.mode} size={14} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{myEntry.mode}</span>
            {myEntry.status === 'in_progress' && (
              <span style={{
                fontWeight: 700, fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase',
                color: '#4ade80', background: 'rgba(74,222,128,0.08)',
                border: '1px solid rgba(74,222,128,0.25)', borderRadius: 0, padding: '2px 8px',
              }}>
                Being tested
              </span>
            )}
          </div>
          <button onClick={handleLeave} style={{
            padding: '5px 14px', borderRadius: 0,
            border: '1px solid rgba(255,85,85,0.3)',
            background: 'rgba(255,85,85,0.06)', color: '#ff5555',
            cursor: 'pointer', fontWeight: 700, fontSize: 11,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,85,85,0.14)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,85,85,0.06)')}
          >
            Leave
          </button>
        </div>
      )}

      {myEntry?.status === 'in_progress' && myEntry.claimed_by && (
        <div style={{ marginBottom: 24 }}>
          <TestChat entryId={myEntry.id} myName={username} otherName={myEntry.claimed_by} />
        </div>
      )}

      {/* ── In Progress ── */}
      {inProgressQueue.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={sectionLabel}>In Progress</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {inProgressQueue.map(entry => (
              <div key={entry.id} style={{
                padding: '10px 14px',
                background: 'rgba(74,222,128,0.04)',
                border: '1px solid rgba(74,222,128,0.12)',
                borderLeft: '3px solid #4ade80',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.8)',
                }} />
                <PlayerAvatar username={entry.username} size={28} />
                <span style={{ fontWeight: 700, color: '#fff', fontSize: 13, flex: 1 }}>{entry.username}</span>
                <ModeIcon modeKey={entry.mode} size={14} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{entry.mode}</span>
                {entry.claimed_by && (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>with {entry.claimed_by}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Waiting Queue ── */}
      <div style={sectionLabel}>Waiting</div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 0', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Loading...
        </div>
      ) : waitingQueue.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', padding: '40px 0', fontSize: 13, letterSpacing: '0.06em' }}>
          Queue is empty
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {waitingQueue.map((entry, index) => {
            const isMe = myEntry?.id === entry.id;
            return (
              <div key={entry.id} style={{
                padding: '10px 14px',
                background: isMe ? 'rgba(74,163,255,0.06)' : index % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.015)',
                border: `1px solid ${isMe ? 'rgba(74,163,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                borderLeft: `3px solid ${isMe ? '#4aa3ff' : 'rgba(255,255,255,0.08)'}`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{
                  fontWeight: 800, fontSize: 14,
                  color: isMe ? '#4aa3ff' : index === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                  minWidth: 28, textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                }}>
                  #{index + 1}
                </span>
                <PlayerAvatar username={entry.username} size={28} />
                <span style={{ fontWeight: 700, color: isMe ? '#fff' : 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                  {entry.username}
                  {isMe && (
                    <span style={{
                      fontSize: 9, color: '#4aa3ff', fontWeight: 700, marginLeft: 8,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      border: '1px solid rgba(74,163,255,0.3)', padding: '1px 5px', borderRadius: 0,
                    }}>you</span>
                  )}
                </span>
                <ModeIcon modeKey={entry.mode} size={14} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{entry.mode}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Floating Join button ── */}
      {!myEntry && (
        <button
          onClick={() => setShowJoin(true)}
          disabled={!hasOpenTester}
          style={{
            position: 'fixed', bottom: 32, right: 32,
            padding: '13px 28px', borderRadius: 0,
            background: hasOpenTester ? 'linear-gradient(135deg, #4aa3ff, #b56bff)' : 'rgba(255,255,255,0.08)',
            border: 'none', color: hasOpenTester ? '#fff' : 'rgba(255,255,255,0.25)',
            fontWeight: 800, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: hasOpenTester ? 'pointer' : 'not-allowed',
            boxShadow: hasOpenTester ? '0 6px 24px rgba(74,163,255,0.35)' : 'none',
            opacity: hasOpenTester ? 1 : 0.45,
            zIndex: 100,
            transition: 'opacity 0.15s',
          }}
        >
          + Join Queue
        </button>
      )}

      {/* ── Join Modal ── */}
      {showJoin && (
        <div
          onClick={() => setShowJoin(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 360, maxWidth: '90%',
              background: '#0d0d12',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
              overflow: 'hidden',
              color: '#fff',
            }}
          >
            {/* Modal header */}
            <div style={{
              padding: '11px 16px',
              background: '#111118',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
                Join Queue
              </span>
              <button onClick={() => setShowJoin(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: 0 }}>✕</button>
            </div>

            <div style={{ padding: '16px' }}>
              {/* Username */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Username
                </div>
                <input
                  value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="Your Minecraft username"
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 0, boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                    color: '#fff', fontSize: 13, outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(74,163,255,0.45)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
                />
              </div>

              {/* Mode picker */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Mode
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {MODES.map(m => {
                    const active = selectedMode === m.key;
                    return (
                      <button key={m.key} onClick={() => setSelectedMode(m.key)} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 11px', borderRadius: 0, cursor: 'pointer',
                        fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase',
                        background: active ? 'rgba(74,163,255,0.14)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${active ? 'rgba(74,163,255,0.45)' : 'rgba(255,255,255,0.07)'}`,
                        borderLeft: active ? '2px solid #4aa3ff' : '1px solid rgba(255,255,255,0.07)',
                        color: active ? '#4aa3ff' : 'rgba(255,255,255,0.5)',
                        transition: 'all 0.12s',
                      }}>
                        <Image src={m.icon} alt={m.key} width={13} height={13} style={{ objectFit: 'contain' }} />
                        {m.key}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error */}
              {joinError && (
                <div style={{
                  fontSize: 12, color: '#ff6b6b',
                  background: 'rgba(255,85,85,0.06)',
                  border: '1px solid rgba(255,85,85,0.2)',
                  borderLeft: '3px solid #ff5555',
                  padding: '7px 10px', marginBottom: 12,
                }}>
                  {joinError}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleJoin}
                disabled={!username.trim() || !selectedMode || joining}
                style={{
                  width: '100%', padding: '11px', borderRadius: 0, border: 'none',
                  background: username.trim() && selectedMode
                    ? 'linear-gradient(135deg, #4aa3ff, #b56bff)'
                    : 'rgba(255,255,255,0.06)',
                  color: username.trim() && selectedMode ? '#fff' : 'rgba(255,255,255,0.25)',
                  fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: username.trim() && selectedMode ? 'pointer' : 'not-allowed',
                  transition: 'opacity 0.12s',
                  opacity: joining ? 0.6 : 1,
                }}
              >
                {joining ? 'Joining...' : 'Join Queue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}