'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { MODES } from '@/types/tierlist';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestFight {
  player1: string;
  player2: string;
  score1: number;
  score2: number;
  tier1?: string;
  tier2?: string;
}

interface HistoryEntry {
  time: string;
  tester: string;
  tested: string;
  old_tier: string;
  new_tier: string;
  mode: string;
  test_array: TestFight[];
}

interface PlayerInfo {
  uuid: string;
  username: string;
  axe?: string; smp?: string; sword?: string; mace?: string;
  uhc?: string; nethop?: string; vanilla?: string; diapot?: string;
}

// ─── Tier helpers ─────────────────────────────────────────────────────────────

const TIER_SCALE = [
  'LT6','HT6','LT5','HT5','LT4','HT4',
  'LT3','HT3','LT2','HT2','LT1','HT1',
];

const TIER_COLORS: Record<string, string> = {
  LT6:'#444444', HT6:'#777777', LT5:'#aaaaaa', HT5:'#00ff00',
  LT4:'#00ffff', HT4:'#5588ff', LT3:'#ff00ff', HT3:'#ffcc55',
  LT2:'#ff7575', HT2:'#ff0000', LT1:'#8b0000', HT1:'#ffffff',
};

function tierIdx(tier: string): number {
  return tier ? TIER_SCALE.indexOf(tier.toUpperCase()) : -1;
}

function isHighTest(entry: HistoryEntry): boolean {
  return (entry.test_array?.length ?? 0) > 1;
}

function nextTier(tier: string): string {
  const idx = tierIdx(tier);
  if (idx === -1 || idx >= TIER_SCALE.length - 1) return tier;
  return TIER_SCALE[idx + 1];
}

function getTargetTier(entry: HistoryEntry): string {
  const oldIdx = tierIdx(entry.old_tier);
  const newIdx = tierIdx(entry.new_tier);
  if (newIdx > oldIdx) return entry.new_tier;
  if (newIdx === oldIdx) return nextTier(entry.old_tier);
  return entry.old_tier;
}

function getKeyword(oldTier: string, newTier: string): string {
  if (!oldTier || oldTier.trim() === '') return 'Initial';
  const o = tierIdx(oldTier);
  const n = tierIdx(newTier);
  if (n > o) return 'Promoted';
  if (n < o) return 'Demoted';
  return 'Retained';
}

function getTierColor(tier: string): string {
  return TIER_COLORS[tier?.toUpperCase()] ?? 'rgba(255,255,255,0.2)';
}

function formatDate(time: string): string {
  const d = new Date(time);
  return (
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function PlayerAvatar({ username, uuid, size = 36 }: { username: string; uuid?: string; size?: number }) {
  const src = uuid
    ? `https://mc-heads.net/avatar/${uuid}`
    : `https://mc-heads.net/avatar/${username}`;
  return (
    <Image
      src={src} alt={username} width={size} height={size}
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
  const mode = MODES.find(m => m.key === modeKey.toLowerCase());
  return (
    <Image
      src={mode ? mode.icon : '/sword.svg'} alt={modeKey}
      width={size} height={size}
      style={{ objectFit: 'contain', display: 'block', flexShrink: 0 }}
    />
  );
}

function TierBadge({ tier }: { tier: string }) {
  if (!tier || tier.trim() === '' || tier.toUpperCase() === 'U') return null;
  const color = getTierColor(tier);
  const isHigh = tierIdx(tier) >= tierIdx('HT3');
  return (
    <>
      {isHigh && (
        <style>{`
          @keyframes badge-glow {
            0%,100% { box-shadow: 0 0 4px 1px ${color}88; }
            50%      { box-shadow: 0 0 8px 2px ${color}cc; }
          }
        `}</style>
      )}
      <span style={{
        color,
        fontWeight: 800,
        fontSize: 11,
        border: `${isHigh ? 2 : 1}px solid ${color}`,
        borderRadius: 0,           // sharp
        padding: '2px 7px',
        background: isHigh ? `${color}28` : `${color}14`,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        display: 'inline-block',
        whiteSpace: 'nowrap',
        lineHeight: '1.5',
        animation: isHigh ? 'badge-glow 2s ease-in-out infinite' : undefined,
        textShadow: isHigh ? `0 0 8px ${color}` : undefined,
      }}>
        {tier.toUpperCase()}
      </span>
    </>
  );
}

function PlayerChip({
  username, uuid, tier, size = 36, role,
}: { username: string; uuid?: string; tier?: string; size?: number; role?: 'tester' | 'tested' }) {
  const roleColor = role === 'tester' ? '#c084fc' : 'rgba(255,255,255,0.4)';
  const roleLabel = role === 'tester' ? 'TESTER' : 'TESTED';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <PlayerAvatar username={username} uuid={uuid} size={size} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: 14, lineHeight: 1 }}>{username}</span>
          {role && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
              color: roleColor, border: `1px solid ${roleColor}`,
              padding: '1px 5px', borderRadius: 0,
            }}>
              {roleLabel}
            </span>
          )}
        </div>
        {tier && tier.trim() !== '' && tier.toUpperCase() !== 'U' && <TierBadge tier={tier} />}
      </div>
    </div>
  );
}

// ─── Expanded Cards ───────────────────────────────────────────────────────────

function NormalTestCard({
  entry, testerPlayer, testedPlayer,
}: { entry: HistoryEntry; testerPlayer?: PlayerInfo; testedPlayer?: PlayerInfo }) {
  const fight = entry.test_array?.[0];
  const testerTier = fight?.tier1 ?? '';
  const testedTier = fight?.tier2 ?? '';
  const tierColor = getTierColor(entry.new_tier);
  const hasOldTier = entry.old_tier && entry.old_tier.trim() !== '';

  return (
    <div style={{
      background: '#0f0f14',
      border: `1px solid rgba(255,255,255,0.07)`,
      borderTop: 'none',
      padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {formatDate(entry.time)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <PlayerChip username={entry.tester} uuid={testerPlayer?.uuid} tier={testerTier} size={44} role="tester" />
        <span style={{ color: 'rgba(255,255,255,0.15)', fontWeight: 700, fontSize: 13, letterSpacing: '0.1em' }}>VS</span>
        <PlayerChip username={entry.tested} uuid={testedPlayer?.uuid} tier={testedTier} size={44} role="tested" />
      </div>

      {/* Mode + tier change */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <ModeIcon modeKey={entry.mode} size={20} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>
          {entry.mode}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
        {hasOldTier ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TierBadge tier={entry.old_tier} />
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>→</span>
            <TierBadge tier={entry.new_tier} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Set to</span>
            <TierBadge tier={entry.new_tier} />
          </div>
        )}
      </div>

      {/* Score */}
      {fight && (
        <div style={{
          background: `${tierColor}0a`,
          border: `1px solid ${tierColor}30`,
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
        }}>
          <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{fight.player1}</span>
          <span style={{ fontWeight: 900, fontSize: 28, color: tierColor, letterSpacing: '4px', textShadow: `0 0 12px ${tierColor}80` }}>
            {fight.score1} — {fight.score2}
          </span>
          <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{fight.player2}</span>
        </div>
      )}
    </div>
  );
}

function HighTestCard({
  entry, testedPlayer, getPlayer,
}: { entry: HistoryEntry; testedPlayer?: PlayerInfo; getPlayer: (u: string) => PlayerInfo | undefined }) {
  const tierColor = getTierColor(entry.new_tier);
  const success = tierIdx(entry.new_tier) > tierIdx(entry.old_tier);
  const testedTier = entry.test_array?.[0]?.tier1 ?? '';
  const hasOldTier = entry.old_tier && entry.old_tier.trim() !== '';

  return (
    <div style={{
      background: '#0f0f14',
      border: `1px solid ${tierColor}44`,
      borderTop: 'none',
      padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      {/* Timestamp + status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {formatDate(entry.time)}
        </div>
        <div style={{
          fontWeight: 800, fontSize: 12, letterSpacing: '0.08em',
          color: success ? '#4ade80' : '#ff5555',
          background: success ? 'rgba(74,222,128,0.08)' : 'rgba(255,85,85,0.08)',
          border: `1px solid ${success ? '#4ade8060' : '#ff555560'}`,
          borderRadius: 0,
          padding: '4px 12px',
          textTransform: 'uppercase',
        }}>
          {success ? '✓ SUCCESS' : '✗ FAILED'}
        </div>
      </div>

      {/* Tested player */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', minWidth: 48 }}>
          Tested
        </span>
        <PlayerChip username={entry.tested} uuid={testedPlayer?.uuid} tier={testedTier} size={44} />
      </div>

      {/* Mode + tier result */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <ModeIcon modeKey={entry.mode} size={20} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>
          {entry.mode}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
        {hasOldTier && <TierBadge tier={entry.old_tier} />}
        {!hasOldTier && <TierBadge tier={'U'} />}
        {hasOldTier && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>→</span>}
        <TierBadge tier={entry.new_tier} />
      </div>

      {/* Fight results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 2 }}>
          Fight Results · {entry.test_array?.length ?? 0} fights
        </div>

        {(entry.test_array ?? []).map((fight, idx) => {
          const p1 = getPlayer(fight.player1);
          const p2 = getPlayer(fight.player2);
          const p1Tier = fight.tier1 ?? '';
          const p2Tier = fight.tier2 ?? '';
          const p1Won = fight.score1 > fight.score2;

          return (
            <div key={idx} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              {/* Fight number */}
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: '0.06em', minWidth: 24, flexShrink: 0 }}>
                #{idx + 1}
              </span>

              {/* P1 */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <PlayerAvatar username={fight.player1} uuid={p1?.uuid} size={30} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontWeight: 700, color: p1Won ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 13 }}>{fight.player1}</span>
                  {p1Tier && <TierBadge tier={p1Tier} />}
                </div>
              </div>

              {/* Score */}
              <div style={{
                fontWeight: 900, fontSize: 20, color: tierColor,
                letterSpacing: '3px', textAlign: 'center', minWidth: 72, flexShrink: 0,
                textShadow: `0 0 10px ${tierColor}60`,
              }}>
                {fight.score1} — {fight.score2}
              </div>

              {/* P2 */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                  <span style={{ fontWeight: 700, color: !p1Won ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 13 }}>{fight.player2}</span>
                  {p2Tier && <TierBadge tier={p2Tier} />}
                </div>
                <PlayerAvatar username={fight.player2} uuid={p2?.uuid} size={30} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HistoryList() {
  const searchParams = useSearchParams();
  const playerFilter = searchParams.get('player')?.toLowerCase() ?? null;
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [players, setPlayers] = useState<Map<string, PlayerInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [historyRes, tiersRes] = await Promise.all([
          supabase.from('history').select('*').order('time', { ascending: false }).limit(100),
          supabase.from('tiers').select('*'),
        ]);
        if (historyRes.error) throw historyRes.error;
        if (tiersRes.error) throw tiersRes.error;

        const map = new Map<string, PlayerInfo>();
        (tiersRes.data ?? []).forEach((p: PlayerInfo) => map.set(p.username.toLowerCase(), p));

        setHistory(
          playerFilter
            ? (historyRes.data as HistoryEntry[]).filter(e => e.tested.toLowerCase() === playerFilter)
            : (historyRes.data as HistoryEntry[])
        );
        setPlayers(map);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getPlayer = (username: string) => players.get(username?.toLowerCase());

  // ── Title (reusable) ──
  const pageTitle = playerFilter ? `${playerFilter}'s History` : 'Test History';

  const titleBlock = (
    <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative' }}>
      <div style={{ width: 80, height: 1, background: 'linear-gradient(90deg, transparent, #b56bff, transparent)', margin: '0 auto 14px' }} />
      <h1 style={{
        fontSize: 36, fontWeight: 900, letterSpacing: '0.06em',
        textTransform: 'uppercase', margin: 0,
        background: 'linear-gradient(135deg, #4aa3ff 0%, #b56bff 50%, #ff4444 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        {pageTitle}
      </h1>
      <div style={{ width: 80, height: 1, background: 'linear-gradient(90deg, transparent, #4aa3ff, transparent)', margin: '14px auto 0' }} />
    </div>
  );

  if (loading) return (
    <div style={{ maxWidth: 860, margin: '40px auto', padding: '0 24px' }}>
      {titleBlock}
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading...</div>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 860, margin: '40px auto', padding: '0 24px' }}>
      {titleBlock}
      <div style={{ textAlign: 'center', color: '#ff4444', fontSize: 14 }}>Error: {error}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 860, margin: '40px auto', padding: '0 24px' }}>
      {titleBlock}

      {/* Nav buttons — sharp, grouped */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginTop: -20, marginBottom: 28 }}>
        <button
          onClick={() => { window.location.href = '/'; }}
          style={{
            padding: '9px 18px', borderRadius: 0,
            border: '1px solid rgba(255,255,255,0.12)', borderRight: playerFilter ? 'none' : '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer', fontWeight: 700, fontSize: 12,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
        >
          ← Home
        </button>
        {playerFilter && (
          <button
            onClick={() => { window.location.href = '/history'; }}
            style={{
              padding: '9px 18px', borderRadius: 0,
              border: '1px solid rgba(255,85,85,0.35)',
              background: 'rgba(255,85,85,0.06)', color: '#ff5555',
              cursor: 'pointer', fontWeight: 700, fontSize: 12,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,85,85,0.14)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,85,85,0.06)'; }}
          >
            ✕ Clear filter
          </button>
        )}
      </div>

      {/* Column micro-header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '4px 18px', marginBottom: 6,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)' }}>Match</span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)' }}>Result · Date</span>
      </div>

      {/* Glow keyframe */}
      <style>{`
        @keyframes glow-pulse {
          0%,100% { box-shadow: 0 0 6px 2px var(--glow-color), 0 2px 12px rgba(0,0,0,0.4); }
          50%      { box-shadow: 0 0 18px 6px var(--glow-color), 0 2px 12px rgba(0,0,0,0.4); }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {history.map(entry => {
          const high = isHighTest(entry);
          const isOpen = expanded === entry.time;
          const tierColor = getTierColor(entry.new_tier);
          const testerPlayer = getPlayer(entry.tester);
          const testedPlayer = getPlayer(entry.tested);

          // ── HT3+ high-stakes row ──────────────────────────────────────
          if (high) {
            const success = tierIdx(entry.new_tier) > tierIdx(entry.old_tier);

            return (
              <div key={entry.time}>
                <div
                  onClick={() => setExpanded(isOpen ? null : entry.time)}
                  style={{
                    '--glow-color': `${tierColor}55`,
                    border: `1.5px solid ${tierColor}`,
                    borderBottom: isOpen ? 'none' : `1.5px solid ${tierColor}`,
                    padding: '11px 16px',
                    background: 'linear-gradient(135deg, #13121a, #1a1228)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12,
                    animation: 'glow-pulse 2.8s ease-in-out infinite',
                  } as React.CSSProperties}
                >
                  <span style={{ fontSize: 14, color: tierColor, flexShrink: 0, textShadow: `0 0 8px ${tierColor}` }}>★</span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <PlayerAvatar username={entry.tested} uuid={testedPlayer?.uuid} size={24} />
                      <span style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>{entry.tested}</span>
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, letterSpacing: '0.04em' }}>for</span>
                      <TierBadge tier={getTargetTier(entry)} />
                      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>—</span>
                      <span style={{ fontWeight: 800, fontSize: 13, color: success ? '#4ade80' : '#ff5555', letterSpacing: '0.04em' }}>
                        {success ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </div>
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>tested by {entry.tester}</span>
                      <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 11 }}>·</span>
                      <ModeIcon modeKey={entry.mode} size={14} />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{entry.mode}</span>
                      <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 11 }}>·</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{new Date(entry.time).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, flexShrink: 0, letterSpacing: '0.04em' }}>
                    {isOpen ? '▲' : '▼'}
                  </span>
                </div>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <HighTestCard entry={entry} testedPlayer={testedPlayer} getPlayer={getPlayer} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          // ── Normal row ────────────────────────────────────────────────
          const keyword = getKeyword(entry.old_tier, entry.new_tier);
          const kwColor =
            keyword === 'Promoted' ? '#4ade80' :
            keyword === 'Demoted'  ? '#ff5555' :
            keyword === 'Retained' ? '#ffcc55' :
                                     'rgba(255,255,255,0.4)';

          return (
            <div key={entry.time}>
              <div
                onClick={() => setExpanded(isOpen ? null : entry.time)}
                style={{
                  border: `1px solid ${tierColor}33`,
                  borderBottom: isOpen ? 'none' : `1px solid ${tierColor}33`,
                  borderLeft: `3px solid ${tierColor}`,
                  padding: '10px 16px 10px 13px',
                  background: '#13131a',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#18181f')}
                onMouseLeave={e => (e.currentTarget.style.background = '#13131a')}
              >
                <PlayerAvatar username={entry.tester} uuid={testerPlayer?.uuid} size={30} />

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', minWidth: 0 }}>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{entry.tester}</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, letterSpacing: '0.08em' }}>VS</span>
                  <PlayerAvatar username={entry.tested} uuid={testedPlayer?.uuid} size={24} />
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{entry.tested}</span>
                  <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 11 }}>·</span>
                  <ModeIcon modeKey={entry.mode} size={14} />
                  <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 11 }}>·</span>
                  <span style={{ fontWeight: 700, color: kwColor, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{keyword}</span>
                  <TierBadge tier={entry.new_tier} />
                </div>

                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '0.04em' }}>
                  {new Date(entry.time).toLocaleDateString()}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, flexShrink: 0 }}>
                  {isOpen ? '▴' : '▾'}
                </span>
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <NormalTestCard entry={entry} testerPlayer={testerPlayer} testedPlayer={testedPlayer} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}