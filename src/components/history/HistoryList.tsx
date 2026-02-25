'use client';

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
  axe?: string;
  smp?: string;
  sword?: string;
  mace?: string;
  uhc?: string;
  nethop?: string;
  vanilla?: string;
  diapot?: string;
}

// ─── Tier helpers ─────────────────────────────────────────────────────────────

const TIER_SCALE = [
  'LT6', 'HT6', 'LT5', 'HT5', 'LT4', 'HT4',
  'LT3', 'HT3', 'LT2', 'HT2', 'LT1', 'HT1',
];

const TIER_COLORS: Record<string, string> = {
  LT6: '#444444', HT6: '#777777', LT5: '#aaaaaa', HT5: '#00ff00',
  LT4: '#00ffff', HT4: '#5588ff', LT3: '#ff00ff', HT3: '#ffcc55',
  LT2: '#ff7575', HT2: '#ff0000', LT1: '#8b0000', HT1: '#ffffff',
};

function tierIdx(tier: string): number {
  return tier ? TIER_SCALE.indexOf(tier.toUpperCase()) : -1;
}

function isHighTest(tier: string): boolean {
  return tierIdx(tier) >= tierIdx('HT3');
}

function getKeyword(oldTier: string, newTier: string): string {
  if (!oldTier || oldTier.trim() === '') return 'Initial tier set';
  const o = tierIdx(oldTier);
  const n = tierIdx(newTier);
  if (n > o) return 'Promoted';
  if (n < o) return 'Demoted';
  return 'Retained';
}

function getTierColor(tier: string): string {
  return TIER_COLORS[tier?.toUpperCase()] ?? 'rgba(255,255,255,0.35)';
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

function PlayerAvatar({
  username, uuid, size = 36,
}: { username: string; uuid?: string; size?: number }) {
  const src = uuid
    ? `https://mc-heads.net/avatar/${uuid}`
    : `https://mc-heads.net/avatar/${username}`;
  return (
    <Image
      src={src}
      alt={username}
      width={size}
      height={size}
      style={{
        borderRadius: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,0.55)',
        display: 'block',
        objectFit: 'cover',
        flexShrink: 0,
      }}
    />
  );
}

function ModeIcon({ modeKey, size = 18 }: { modeKey: string; size?: number }) {
  const mode = MODES.find(m => m.key === modeKey.toLowerCase());
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

function TierBadge({ tier }: { tier: string }) {
  if (!tier || tier.trim() === '' || tier.toUpperCase() === 'U') return null;
  const color = getTierColor(tier);
  return (
    <span
      style={{
        color,
        fontWeight: 800,
        fontSize: 12,
        border: `1.5px solid ${color}`,
        borderRadius: 6,
        padding: '2px 7px',
        background: `${color}18`,
        letterSpacing: '0.5px',
        display: 'inline-block',
        whiteSpace: 'nowrap',
        lineHeight: '1.4',
      }}
    >
      {tier.toUpperCase()}
    </span>
  );
}

function PlayerChip({
  username, uuid, tier, size = 36,
}: { username: string; uuid?: string; tier?: string; size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <PlayerAvatar username={username} uuid={uuid} size={size} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontWeight: 700, color: 'white', fontSize: 14, lineHeight: 1 }}>
          {username}
        </span>
        {tier && tier.trim() !== '' && tier.toUpperCase() !== 'U' && (
          <TierBadge tier={tier} />
        )}
      </div>
    </div>
  );
}

// ─── Expanded Cards ───────────────────────────────────────────────────────────

function NormalTestCard({
  entry, testerPlayer, testedPlayer,
}: {
  entry: HistoryEntry;
  testerPlayer?: PlayerInfo;
  testedPlayer?: PlayerInfo;
}) {
  const fight = entry.test_array?.[0];
  // Use the tier stored in the fight record (reflects tier at time of test)
  const testerTier = fight?.tier1 ?? '';
  const testedTier = fight?.tier2 ?? '';
  const tierColor = getTierColor(entry.new_tier);
  const hasOldTier = entry.old_tier && entry.old_tier.trim() !== '';

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #181820, #111118)',
        border: `1px solid rgba(255,255,255,0.07)`,
        borderTop: 'none',
        borderRadius: '0 0 12px 12px',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Timestamp */}
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
        {formatDate(entry.time)}
      </div>

      {/* Players */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <PlayerChip username={entry.tester} uuid={testerPlayer?.uuid} tier={testerTier} size={44} />
        <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 700, fontSize: 18 }}>vs</span>
        <PlayerChip username={entry.tested} uuid={testedPlayer?.uuid} tier={testedTier} size={44} />
      </div>

      {/* Mode + tier change */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <ModeIcon modeKey={entry.mode} size={16} />
        <span
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.45)',
            textTransform: 'uppercase',
            fontWeight: 700,
            letterSpacing: '0.5px',
          }}
        >
          {entry.mode}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
        {hasOldTier ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <TierBadge tier={entry.old_tier} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>→</span>
            <TierBadge tier={entry.new_tier} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>set to</span>
            <TierBadge tier={entry.new_tier} />
          </div>
        )}
      </div>

      {/* Score */}
      {fight && (
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10,
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          <span style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{fight.player1}</span>
          <span style={{ fontWeight: 900, fontSize: 26, color: tierColor, letterSpacing: '3px' }}>
            {fight.score1} — {fight.score2}
          </span>
          <span style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{fight.player2}</span>
        </div>
      )}
    </div>
  );
}

function HighTestCard({
  entry, testedPlayer, getPlayer,
}: {
  entry: HistoryEntry;
  testedPlayer?: PlayerInfo;
  getPlayer: (username: string) => PlayerInfo | undefined;
}) {
  const tierColor = getTierColor(entry.new_tier);
  const success = tierIdx(entry.new_tier) > tierIdx(entry.old_tier);
  // Player1 is the tested player — use their tier from the first fight record
  const testedTier = entry.test_array?.[0]?.tier1 ?? '';
  const hasOldTier = entry.old_tier && entry.old_tier.trim() !== '';

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #181820, #111118)',
        border: `1px solid ${tierColor}33`,
        borderTop: 'none',
        borderRadius: '0 0 12px 12px',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {/* Timestamp + status badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
          {formatDate(entry.time)}
        </div>
        <div
          style={{
            fontWeight: 800,
            fontSize: 13,
            color: success ? '#4ade80' : '#ff5555',
            background: success ? 'rgba(74,222,128,0.1)' : 'rgba(255,85,85,0.1)',
            border: `1.5px solid ${success ? '#4ade8055' : '#ff555555'}`,
            borderRadius: 8,
            padding: '4px 14px',
          }}
        >
          {success ? '✓ SUCCESS' : '✗ FAILED'}
        </div>
      </div>

      {/* Tested player */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            fontWeight: 700,
            letterSpacing: '0.5px',
            minWidth: 50,
          }}
        >
          Tested
        </span>
        <PlayerChip username={entry.tested} uuid={testedPlayer?.uuid} tier={testedTier} size={44} />
      </div>

      {/* Mode + tier result */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <ModeIcon modeKey={entry.mode} size={16} />
        <span
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.45)',
            textTransform: 'uppercase',
            fontWeight: 700,
            letterSpacing: '0.5px',
          }}
        >
          {entry.mode}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
        {hasOldTier && <TierBadge tier={entry.old_tier} />}
        {hasOldTier && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>→</span>}
        <TierBadge tier={entry.new_tier} />
      </div>

      {/* Fight results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            fontWeight: 700,
            letterSpacing: '0.5px',
          }}
        >
          Fight Results · {entry.test_array?.length ?? 0} fights
        </div>

        {(entry.test_array ?? []).map((fight, idx) => {
          const p1 = getPlayer(fight.player1);
          const p2 = getPlayer(fight.player2);
          // Use tiers stored in the fight record (snapshot at test time)
          const p1Tier = fight.tier1 ?? '';
          const p2Tier = fight.tier2 ?? '';

          return (
            <div
              key={idx}
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.25)',
                  fontWeight: 700,
                  minWidth: 26,
                  flexShrink: 0,
                }}
              >
                #{idx + 1}
              </span>

              {/* Player 1 — the tested player */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <PlayerAvatar username={fight.player1} uuid={p1?.uuid} size={32} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontWeight: 700, color: 'white', fontSize: 13 }}>
                    {fight.player1}
                  </span>
                  {p1Tier && <TierBadge tier={p1Tier} />}
                </div>
              </div>

              {/* Score */}
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 20,
                  color: tierColor,
                  letterSpacing: '2px',
                  textAlign: 'center',
                  minWidth: 68,
                  flexShrink: 0,
                }}
              >
                {fight.score1} — {fight.score2}
              </div>

              {/* Player 2 — opponent */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  justifyContent: 'flex-end',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    alignItems: 'flex-end',
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'white', fontSize: 13 }}>
                    {fight.player2}
                  </span>
                  {p2Tier && <TierBadge tier={p2Tier} />}
                </div>
                <PlayerAvatar username={fight.player2} uuid={p2?.uuid} size={32} />
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
          supabase.from('history').select('*').order('time', { ascending: false }),
          supabase.from('tiers').select('*'),
        ]);
        if (historyRes.error) throw historyRes.error;
        if (tiersRes.error) throw tiersRes.error;

        const map = new Map<string, PlayerInfo>();
        (tiersRes.data ?? []).forEach((p: PlayerInfo) => {
          map.set(p.username.toLowerCase(), p);
        });

        setHistory(historyRes.data as HistoryEntry[]);
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

  const title = (
    <h1
      style={{
        fontSize: 42,
        fontWeight: 900,
        textAlign: 'center',
        marginBottom: 40,
        background: 'linear-gradient(135deg, #4aa3ff, #b56bff, #ff4444)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      Test History
    </h1>
  );

  if (loading) {
    return (
      <div style={{ maxWidth: 860, margin: '40px auto', padding: '0 24px' }}>
        {title}
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 860, margin: '40px auto', padding: '0 24px' }}>
        {title}
        <div style={{ textAlign: 'center', color: '#ff4444', fontSize: 16 }}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: '40px auto', padding: '0 24px' }}>
      {title}

      {/* Glow keyframe — shared by all HT3+ rows via CSS custom property */}
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 7px 2px var(--glow-color), 0 4px 18px rgba(0,0,0,0.4); }
          50%       { box-shadow: 0 0 22px 7px var(--glow-color), 0 4px 18px rgba(0,0,0,0.4); }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {history.map(entry => {
          const high = isHighTest(entry.new_tier);
          const isOpen = expanded === entry.time;
          const tierColor = getTierColor(entry.new_tier);
          const testerPlayer = getPlayer(entry.tester);
          const testedPlayer = getPlayer(entry.tested);
          // Square bottom corners when card is open so it merges with the card below
          const rowRadius = isOpen ? '12px 12px 0 0' : '12px';

          // ── HT3+ row ──────────────────────────────────────────────────────
          if (high) {
            const success = tierIdx(entry.new_tier) > tierIdx(entry.old_tier);

            return (
              <div key={entry.time}>
                <div
                  onClick={() => setExpanded(isOpen ? null : entry.time)}
                  style={
                    {
                      '--glow-color': `${tierColor}70`,
                      border: `1.5px solid ${tierColor}`,
                      borderRadius: rowRadius,
                      padding: '13px 18px',
                      background: 'linear-gradient(135deg, #14141a, #1c1228)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      animation: 'glow-pulse 2.4s ease-in-out infinite',
                    } as React.CSSProperties
                  }
                >
                  {/* Star icon */}
                  <span style={{ fontSize: 16, color: tierColor, flexShrink: 0 }}>★</span>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Main line */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <PlayerAvatar
                        username={entry.tested}
                        uuid={testedPlayer?.uuid}
                        size={26}
                      />
                      <span style={{ fontWeight: 800, color: 'white', fontSize: 15 }}>
                        {entry.tested}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>for</span>
                      <TierBadge tier={entry.new_tier} />
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>—</span>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: 14,
                          color: success ? '#4ade80' : '#ff5555',
                        }}
                      >
                        {success ? 'Success' : 'Failed'}
                      </span>
                    </div>

                    {/* Sub-line */}
                    <div
                      style={{
                        marginTop: 5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                        tested by {entry.tester}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>·</span>
                      <ModeIcon modeKey={entry.mode} size={13} />
                      <span
                        style={{
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.3)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {entry.mode}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>·</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                        {new Date(entry.time).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, flexShrink: 0 }}>
                    {isOpen ? '▲' : '▼'}
                  </span>
                </div>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <HighTestCard
                        entry={entry}
                        testedPlayer={testedPlayer}
                        getPlayer={getPlayer}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          // ── Normal row (LT3 and below) ────────────────────────────────────
          const keyword = getKeyword(entry.old_tier, entry.new_tier);
          const kwColor =
            keyword === 'Promoted'
              ? '#4ade80'
              : keyword === 'Demoted'
              ? '#ff5555'
              : keyword === 'Retained'
              ? '#ffcc55'
              : 'rgba(255,255,255,0.55)';

          return (
            <div key={entry.time}>
              <div
                onClick={() => setExpanded(isOpen ? null : entry.time)}
                style={{
                  border: `1.5px solid ${tierColor}44`,
                  borderRadius: rowRadius,
                  padding: '12px 18px',
                  background: 'linear-gradient(180deg, #14141a, #101014)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                }}
              >
                {/* Tester */}
                <PlayerAvatar username={entry.tester} uuid={testerPlayer?.uuid} size={32} />

                {/* Row content */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    minWidth: 0,
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>
                    {entry.tester}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>vs</span>
                  <PlayerAvatar username={entry.tested} uuid={testedPlayer?.uuid} size={26} />
                  <span style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>
                    {entry.tested}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                  <ModeIcon modeKey={entry.mode} size={16} />
                  <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                  <span style={{ fontWeight: 700, color: kwColor, fontSize: 13 }}>{keyword}</span>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>to</span>
                  <TierBadge tier={entry.new_tier} />
                </div>

                <span
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.28)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {new Date(entry.time).toLocaleDateString()}
                </span>
                <span
                  style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, flexShrink: 0 }}
                >
                  {isOpen ? '▲' : '▼'}
                </span>
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <NormalTestCard
                      entry={entry}
                      testerPlayer={testerPlayer}
                      testedPlayer={testedPlayer}
                    />
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
