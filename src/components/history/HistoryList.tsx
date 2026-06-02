'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
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
  if ((entry.test_array?.length ?? 0) > 1) return true;

  if (entry.tester === 'System') {
    const fights = entry.test_array ?? [];
    const lt3Index = TIER_SCALE.indexOf('LT3');

    return fights.length > 0 && fights.every(fight => {
      const testedIsPlayer1 = fight.player1 === entry.tested;
      const testedTier   = testedIsPlayer1 ? fight.tier1 : fight.tier2;
      const opponentTier = testedIsPlayer1 ? fight.tier2 : fight.tier1;

      if (!testedTier || !opponentTier) return false;

      const testedRank   = TIER_SCALE.indexOf(testedTier);
      const opponentRank = TIER_SCALE.indexOf(opponentTier);

      return testedRank >= lt3Index && opponentRank >= testedRank;
    });
  }

  return false;
}

function nextTier(tier: string): string {
  const idx = tierIdx(tier);
  if (idx === -1 || idx >= TIER_SCALE.length - 1) return tier;
  return TIER_SCALE[idx + 1];
}

function getTargetTier(entry: HistoryEntry): string {
  return nextTier(entry.old_tier);
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

const PAGE_SIZE = 20;
// How many DB rows to fetch per round-trip while hunting for PAGE_SIZE matches.
// High enough to find matches quickly, low enough to not over-fetch.
const DB_BATCH = 80;

// ─── Atoms ────────────────────────────────────────────────────────────────────

function PlayerAvatar({ username, uuid, size = 36 }: { username: string; uuid?: string; size?: number }) {
  const src = uuid
    ? `https://mc-heads.net/head/${uuid}`
    : `https://mc-heads.net/head/${username}`;
  return (
    <Image
      src={src} alt={username} width={size} height={size}
      style={{
        borderRadius: 0,
        display: 'block', objectFit: 'cover',
        flexShrink: 0, imageRendering: 'pixelated', 
        marginLeft: -2
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
        borderRadius: 0,
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {formatDate(entry.time)}
        </div>
        <div style={{
          fontWeight: 800, fontSize: 12, letterSpacing: '0.08em',
          color: success ? '#4ade80' : '#ff5555',
          background: success ? 'rgba(74,222,128,0.08)' : 'rgba(255,85,85,0.08)',
          border: `1px solid ${success ? '#4ade8060' : '#ff555560'}`,
          borderRadius: 0, padding: '4px 12px', textTransform: 'uppercase',
        }}>
          {success ? '✓ SUCCESS' : '✗ FAILED'}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', minWidth: 48 }}>
          Tested
        </span>
        <PlayerChip username={entry.tested} uuid={testedPlayer?.uuid} tier={testedTier} size={44} />
      </div>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 2 }}>
          Fight Results · {entry.test_array?.length ?? 0} fights
        </div>
        {(entry.test_array ?? []).map((fight, idx) => {
          const p1 = getPlayer(fight.player1);
          const p2 = getPlayer(fight.player2);
          const p1Won = fight.score1 > fight.score2;
          return (
            <div key={idx} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: '0.06em', minWidth: 24, flexShrink: 0 }}>
                #{idx + 1}
              </span>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <PlayerAvatar username={fight.player1} uuid={p1?.uuid} size={30} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontWeight: 700, color: p1Won ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 13 }}>{fight.player1}</span>
                  {fight.tier1 && <TierBadge tier={fight.tier1} />}
                </div>
              </div>
              <div style={{
                fontWeight: 900, fontSize: 20, color: tierColor,
                letterSpacing: '3px', textAlign: 'center', minWidth: 72, flexShrink: 0,
                textShadow: `0 0 10px ${tierColor}60`,
              }}>
                {fight.score1} — {fight.score2}
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                  <span style={{ fontWeight: 700, color: !p1Won ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 13 }}>{fight.player2}</span>
                  {fight.tier2 && <TierBadge tier={fight.tier2} />}
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

// ─── Column with server-side pagination ──────────────────────────────────────

function HistoryColumn({
  label,
  accent,
  isHighCol,
  playerFilter,
  expanded,
  onToggle,
  getPlayer,
}: {
  label: string;
  accent: string;
  isHighCol: boolean;
  playerFilter: string | null;
  expanded: string | null;
  onToggle: (time: string) => void;
  getPlayer: (u: string) => PlayerInfo | undefined;
}) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [dbOffset, setDbOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // Use a ref as the in-flight guard so useCallback doesn't need `loading` as a dep,
  // which was causing stale closures and double-firing the initial fetch.
  const loadingRef = useRef(false);
  const didInit = useRef(false);

  const loadMore = useCallback(async (startOffset: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    // Can't filter high/normal server-side (JSON array length), so we scan
    // DB_BATCH rows at a time and keep only the matching type.
    const collected: HistoryEntry[] = [];
    let cursor = startOffset;
    let dbDone = false;

    while (collected.length < PAGE_SIZE && !dbDone) {
      let query = supabase
        .from('history')
        .select('*')
        .order('time', { ascending: false })
        .range(cursor, cursor + DB_BATCH - 1);

      if (playerFilter) {
        query = query.ilike('tested', playerFilter);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        dbDone = true;
        break;
      }

      const matching = (data as HistoryEntry[]).filter(e =>
        isHighCol ? isHighTest(e) : !isHighTest(e)
      );
      collected.push(...matching);
      cursor += data.length;

      if (data.length < DB_BATCH) {
        dbDone = true;
      }
    }

    const page = collected.slice(0, PAGE_SIZE);

    setEntries(prev => [...prev, ...page]);
    setDbOffset(cursor);
    setHasMore(!dbDone || collected.length >= PAGE_SIZE);
    setLoading(false);
    loadingRef.current = false;
  }, [isHighCol, playerFilter]); // `loading` intentionally excluded — guarded by ref

  // StrictMode-safe: didInit ref prevents the double-invocation from firing twice
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    loadMore(0);
  }, []);

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Column header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', marginBottom: 8,
        borderBottom: `2px solid ${accent}`,
        background: `${accent}0d`,
      }}>
        {isHighCol && <span style={{ color: accent, fontSize: 13, textShadow: `0 0 8px ${accent}` }}>★</span>}
        <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent }}>
          {label}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em' }}>
          {entries.length} loaded
        </span>
      </div>

      {/* Micro-header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '3px 14px', marginBottom: 4,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.15)' }}>Match</span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.15)' }}>Result · Date</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {entries.map(entry => {
          const isOpen = expanded === entry.time;
          const tierColor = getTierColor(entry.new_tier);
          const testerPlayer = getPlayer(entry.tester);
          const testedPlayer = getPlayer(entry.tested);

          if (isHighCol) {
            const success = tierIdx(entry.new_tier) > tierIdx(entry.old_tier);
            return (
              <div key={entry.time}>
                <div
                  onClick={() => onToggle(entry.time)}
                  style={{
                    '--glow-color': `${tierColor}55`,
                    border: `1.5px solid ${tierColor}`,
                    borderBottom: isOpen ? 'none' : `1.5px solid ${tierColor}`,
                    padding: '11px 14px',
                    background: 'linear-gradient(135deg, #13121a, #1a1228)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    animation: 'glow-pulse 2.8s ease-in-out infinite',
                  } as React.CSSProperties}
                >
                  <span style={{ fontSize: 13, color: tierColor, flexShrink: 0, textShadow: `0 0 8px ${tierColor}` }}>★</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <PlayerAvatar username={entry.tested} uuid={testedPlayer?.uuid} size={22} />
                      <span style={{ fontWeight: 800, color: '#fff', fontSize: 13 }}>{entry.tested}</span>
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>for</span>
                      <TierBadge tier={getTargetTier(entry)} />
                      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>—</span>
                      <span style={{ fontWeight: 800, fontSize: 12, color: success ? '#4ade80' : '#ff5555', letterSpacing: '0.04em' }}>
                        {success ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </div>
                    <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>by {entry.tester}</span>
                      <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 10 }}>·</span>
                      <ModeIcon modeKey={entry.mode} size={12} />
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{entry.mode}</span>
                      <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 10 }}>·</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{new Date(entry.time).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, flexShrink: 0 }}>
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

          const keyword = getKeyword(entry.old_tier, entry.new_tier);
          const kwColor =
            keyword === 'Promoted' ? '#4ade80' :
            keyword === 'Demoted'  ? '#ff5555' :
            keyword === 'Retained' ? '#ffcc55' :
                                     'rgba(255,255,255,0.4)';

          return (
            <div key={entry.time}>
              <div
                onClick={() => onToggle(entry.time)}
                style={{
                  border: `1px solid ${tierColor}33`,
                  borderBottom: isOpen ? 'none' : `1px solid ${tierColor}33`,
                  borderLeft: `3px solid ${tierColor}`,
                  padding: '9px 14px 9px 11px',
                  background: '#13131a',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#18181f')}
                onMouseLeave={e => (e.currentTarget.style.background = '#13131a')}
              >
                <PlayerAvatar username={entry.tester} uuid={testerPlayer?.uuid} size={26} />
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: 12 }}>{entry.tester}</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: '0.08em' }}>VS</span>
                  <PlayerAvatar username={entry.tested} uuid={testedPlayer?.uuid} size={22} />
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: 12 }}>{entry.tested}</span>
                  <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 10 }}>·</span>
                  <ModeIcon modeKey={entry.mode} size={12} />
                  <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 10 }}>·</span>
                  <span style={{ fontWeight: 700, color: kwColor, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{keyword}</span>
                  <TierBadge tier={entry.new_tier} />
                </div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {new Date(entry.time).toLocaleDateString()}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, flexShrink: 0 }}>
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

      {loading && (
        <div style={{
          textAlign: 'center', padding: '12px 0',
          fontSize: 11, color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Loading…
        </div>
      )}

      {!loading && hasMore && (
        <button
          onClick={() => loadMore(dbOffset)}
          style={{
            width: '100%', padding: '10px 0', marginTop: 6,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 0, color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            transition: 'background 0.15s, color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          }}
        >
          Show 20 more
        </button>
      )}

      {!loading && !hasMore && entries.length > 0 && (
        <div style={{
          textAlign: 'center', padding: '10px 0', marginTop: 4,
          fontSize: 10, color: 'rgba(255,255,255,0.18)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          All {entries.length} loaded
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HistoryList() {
  const searchParams = useSearchParams();
  const playerFilter = searchParams.get('player')?.toLowerCase() ?? null;
  const [players, setPlayers] = useState<Map<string, PlayerInfo>>(new Map());
  const [playersLoading, setPlayersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlayers() {
      try {
        const { data, error } = await supabase.from('tiers').select('*');
        if (error) throw error;
        const map = new Map<string, PlayerInfo>();
        (data ?? []).forEach((p: PlayerInfo) => map.set(p.username.toLowerCase(), p));
        setPlayers(map);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load players');
      } finally {
        setPlayersLoading(false);
      }
    }
    fetchPlayers();
  }, []);

  const getPlayer = (username: string) => players.get(username?.toLowerCase());
  const handleToggle = (time: string) => setExpanded(prev => prev === time ? null : time);

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

  if (playersLoading) return (
    <div style={{ maxWidth: 1300, margin: '40px auto', padding: '0 24px' }}>
      {titleBlock}
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading...</div>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 1300, margin: '40px auto', padding: '0 24px' }}>
      {titleBlock}
      <div style={{ textAlign: 'center', color: '#ff4444', fontSize: 14 }}>Error: {error}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1300, margin: '40px auto', padding: '0 24px' }}>
      {titleBlock}

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

      <style>{`
        @keyframes glow-pulse {
          0%,100% { box-shadow: 0 0 6px 2px var(--glow-color), 0 2px 12px rgba(0,0,0,0.4); }
          50%      { box-shadow: 0 0 18px 6px var(--glow-color), 0 2px 12px rgba(0,0,0,0.4); }
        }
      `}</style>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <HistoryColumn
          label="High Tests (HT3+)" accent="#ffcc55" isHighCol={true}
          playerFilter={playerFilter} expanded={expanded}
          onToggle={handleToggle} getPlayer={getPlayer}
        />
        <HistoryColumn
          label="Normal Tests" accent="#4aa3ff" isHighCol={false}
          playerFilter={playerFilter} expanded={expanded}
          onToggle={handleToggle} getPlayer={getPlayer}
        />
      </div>
    </div>
  );
}