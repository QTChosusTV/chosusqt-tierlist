'use client';

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

function isOnline(last_seen: string | null): boolean {
  if (!last_seen) return false;
  return (Date.now() - new Date(last_seen).getTime()) < 2 * 60 * 1000; // 2 minutes
}

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
    const { data, error } = await supabase
      .from('queue' as any)
      .select('*')
      .order('joined_at', { ascending: true });
    if (data) setQueue(data as QueueEntry[]);
    setLoading(false);
  }

  async function fetchTesters() {
    const { data } = await supabase
      .from('testers' as any)
      .select('username, is_open, last_seen') as { data: TesterStatus[] | null };
    if (!data) return;

    // Attach active player from queue
    const { data: queueData } = await supabase
      .from('queue' as any)
      .select('claimed_by, username, mode')
      .eq('status', 'in_progress') as { data: { claimed_by: string; username: string; mode: string }[] | null };

    const enriched = data.map(t => {
      const active = queueData?.find(q => q.claimed_by === t.username);
      return {
        ...t,
        active_player: active?.username ?? null,
        active_mode: active?.mode ?? null,
      };
    });

    setTesters(enriched);
  }

  useEffect(() => {
    fetchQueue();
    fetchTesters();

    const queueChannel = supabase
      .channel('queue_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, () => {
        fetchQueue();
        fetchTesters();
      })
      .subscribe() 

    const testerChannel = supabase
      .channel('tester_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'testers' }, fetchTesters)
      .subscribe();

    // Re-evaluate online/offline status every 30s without hitting the DB
    const ticker = setInterval(() => {
      setTesters(prev => [...prev]);
    }, 30000);

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
      .from('queue' as any)
      .select('id')
      .eq('username', username.trim())
      .in('status', ['waiting', 'in_progress'])
      .maybeSingle();

    if (existing) {
      setJoinError('You are already in the queue.');
      setJoining(false);
      return;
    }

    const { error } = await supabase.from('queue' as any).insert({
      username: username.trim(),
      mode: selectedMode,
    } as any);

    if (error) {
      setJoinError(error.message);
    } else {
      setShowJoin(false);
      fetchQueue();
    }
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

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{
        fontSize: 42, fontWeight: 900, textAlign: 'center', marginBottom: 8,
        background: 'linear-gradient(135deg, #4aa3ff, #b56bff, #ff4444)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        Test Queue
      </h1>
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 14, marginBottom: 40 }}>
        {waitingQueue.length} waiting · {inProgressQueue.length} in progress
      </div>

      {/* ── Testers Section ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 10 }}>
          Testers — {onlineTesters.length} online
        </div>
        {sortedTesters.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14, padding: '12px 0' }}>No testers found</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sortedTesters.map(tester => {
              const online = isOnline(tester.last_seen);
              return (
                <div key={tester.username} style={{
                  borderRadius: 10, padding: '12px 16px',
                  background: online ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${online ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
                  display: 'flex', alignItems: 'center', gap: 12,
                  opacity: online ? 1 : 0.45,
                }}>
                  {/* Online dot */}
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: online ? (tester.is_open ? '#4ade80' : '#facc15') : 'rgba(255,255,255,0.2)',
                    boxShadow: online && tester.is_open ? '0 0 6px rgba(74,222,128,0.8)' : online ? '0 0 6px rgba(250,204,21,0.6)' : 'none',
                  }} />

                  {/* Avatar */}
                  <PlayerAvatar username={tester.username} size={30} />

                  {/* Name */}
                  <span style={{ fontWeight: 700, color: 'white', fontSize: 14, flex: 1 }}>{tester.username}</span>

                  {/* Status badge */}
                  {online ? (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      background: tester.is_open ? 'rgba(74,222,128,0.12)' : 'rgba(250,204,21,0.1)',
                      color: tester.is_open ? '#4ade80' : '#facc15',
                      border: `1px solid ${tester.is_open ? 'rgba(74,222,128,0.3)' : 'rgba(250,204,21,0.25)'}`,
                      textTransform: 'uppercase', letterSpacing: '0.4px',
                    }}>
                      {tester.is_open ? 'Open' : 'Busy'}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Offline
                    </span>
                  )}

                  {/* Active player */}
                  {tester.active_player && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>testing</span>
                      <PlayerAvatar username={tester.active_player} size={22} />
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{tester.active_player}</span>
                      {tester.active_mode && <ModeIcon modeKey={tester.active_mode} size={13} />}
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
          marginBottom: 24, borderRadius: 12, padding: '14px 18px',
          background: 'rgba(74,163,255,0.08)', border: '1.5px solid rgba(74,163,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Your position</span>
            <span style={{ fontWeight: 900, fontSize: 22, color: '#4aa3ff' }}>
              #{waitingQueue.findIndex(e => e.id === myEntry.id) + 1}
            </span>
            <ModeIcon modeKey={myEntry.mode} size={16} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{myEntry.mode}</span>
            {myEntry.status === 'in_progress' && (
              <span style={{ fontWeight: 700, fontSize: 13, color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 6, padding: '2px 8px' }}>
                Being tested
              </span>
            )}
          </div>
          <button onClick={handleLeave}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,85,85,0.3)', background: 'rgba(255,85,85,0.08)', color: '#ff5555', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            Leave
          </button>
        </div>
      )}

      {/* ── In Progress ── */}
      {inProgressQueue.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 10 }}>
            In Progress
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inProgressQueue.map(entry => (
              <div key={entry.id} style={{
                borderRadius: 10, padding: '12px 16px',
                background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 12, color: 'rgba(74,222,128,0.6)', fontWeight: 700, minWidth: 20 }}>●</span>
                <PlayerAvatar username={entry.username} size={32} />
                <span style={{ fontWeight: 700, color: 'white', fontSize: 14, flex: 1 }}>{entry.username}</span>
                <ModeIcon modeKey={entry.mode} size={16} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{entry.mode}</span>
                {entry.claimed_by && (
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>with {entry.claimed_by}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Waiting Queue ── */}
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 10 }}>
        Waiting
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '40px 0' }}>Loading...</div>
      ) : waitingQueue.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '40px 0', fontSize: 15 }}>Queue is empty</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {waitingQueue.map((entry, index) => {
            const isMe = myEntry?.id === entry.id;
            return (
              <div key={entry.id} style={{
                borderRadius: 10, padding: '12px 16px',
                background: isMe ? 'rgba(74,163,255,0.07)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isMe ? 'rgba(74,163,255,0.25)' : 'rgba(255,255,255,0.07)'}`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: isMe ? '#4aa3ff' : 'rgba(255,255,255,0.25)', minWidth: 28, textAlign: 'center' }}>
                  #{index + 1}
                </span>
                <PlayerAvatar username={entry.username} size={32} />
                <span style={{ fontWeight: 700, color: 'white', fontSize: 14, flex: 1 }}>
                  {entry.username}
                  {isMe && <span style={{ fontSize: 12, color: '#4aa3ff', fontWeight: 600, marginLeft: 8 }}>(you)</span>}
                </span>
                <ModeIcon modeKey={entry.mode} size={16} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{entry.mode}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Floating Join Button ── */}
      {!myEntry && (
        <button onClick={() => setShowJoin(true)} disabled={onlineTesters.filter(t => t.is_open).length === 0} style={{
          opacity: onlineTesters.filter(t => t.is_open).length === 0 ? 0.4 : 1,
          cursor: onlineTesters.filter(t => t.is_open).length === 0 ? 'not-allowed' : 'pointer',
          position: 'fixed', bottom: 32, right: 32,
          padding: '14px 28px', borderRadius: 14,
          background: 'linear-gradient(135deg, #4aa3ff, #b56bff)',
          border: 'none', color: '#fff', fontWeight: 800, fontSize: 16,
          boxShadow: '0 8px 32px rgba(74,163,255,0.35)', zIndex: 100,
        }}>
          + Join Queue
        </button>
      )}

      {/* ── Join Modal ── */}
      {showJoin && (
        <div onClick={() => setShowJoin(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 360, maxWidth: '90%', background: 'linear-gradient(180deg, #141418, #0e0e12)', borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Join Queue</h2>
              <button onClick={() => setShowJoin(false)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username</div>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Your Minecraft username"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mode</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {MODES.map(m => (
                  <button key={m.key} onClick={() => setSelectedMode(m.key)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    background: selectedMode === m.key ? 'rgba(74,163,255,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${selectedMode === m.key ? 'rgba(74,163,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: selectedMode === m.key ? '#4aa3ff' : 'rgba(255,255,255,0.6)',
                  }}>
                    <Image src={m.icon} alt={m.key} width={14} height={14} style={{ objectFit: 'contain' }} />
                    {m.key}
                  </button>
                ))}
              </div>
            </div>
            {joinError && <div style={{ fontSize: 13, color: '#ff5555', marginBottom: 12 }}>{joinError}</div>}
            <button onClick={handleJoin} disabled={!username.trim() || !selectedMode || joining} style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: username.trim() && selectedMode ? 'linear-gradient(135deg, #4aa3ff, #b56bff)' : 'rgba(255,255,255,0.08)',
              color: username.trim() && selectedMode ? '#fff' : 'rgba(255,255,255,0.3)',
              fontWeight: 800, fontSize: 15, cursor: username.trim() && selectedMode ? 'pointer' : 'not-allowed',
            }}>
              {joining ? 'Joining...' : 'Join'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}