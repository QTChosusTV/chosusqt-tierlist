'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { addPointsToPlayers, sortPlayersByPoints } from '@/lib/utils';
import PlayerRow from './PlayerRow';
import ModeFilter, { FilterMode } from './ModeFilter';
import SearchBar from './SearchBar';
import type { Player, PlayerWithPoints, TierType } from '@/types/tierlist';
import { MODES } from '@/types/tierlist';
import type { Mode } from '@/types/tierlist';

const TIER_ORDER: Record<string, number> = {
  HT1: 1, LT1: 2,
  HT2: 3, LT2: 4,
  HT3: 5, LT3: 6,
  HT4: 7, LT4: 8,
  HT5: 9, LT5: 10,
  HT6: 11, LT6: 12,
  U: 13,
};

// LT3 and above (index >= 6 in TIER_SCALE) show coeff
const TIER_SCALE = [
  'LT6','HT6','LT5','HT5','LT4','HT4',
  'LT3','HT3','LT2','HT2','LT1','HT1',
];
const LT3_RANK = TIER_SCALE.indexOf('LT3'); // 6

const TIER_INFO = [
  { tier: 'LT6', label: '+1', color: '#444444' },
  { tier: 'HT6', label: '+2', color: '#777777' },
  { tier: 'LT5', label: '+3', color: '#aaaaaa' },
  { tier: 'HT5', label: '+4', color: '#00ff00' },
  { tier: 'LT4', label: '+5', color: '#00ffff' },
  { tier: 'HT4', label: '+7', color: '#5588ff' },
  { tier: 'LT3', label: '+10', color: '#ff00ff' },
  { tier: 'HT3', label: '+25', color: '#ffcc55' },
  { tier: 'LT2', label: '+50', color: '#ff7575' },
  { tier: 'HT2', label: '+100', color: '#ff0000' },
  { tier: 'LT1', label: '+250', color: '#8b0000' },
  { tier: 'HT1', label: '+1000', color: '#ffffff' },
];

// Map mode key → coeff column name
const MODE_TO_COEFF: Record<string, string> = {
  axe: 'axe_coeff', sword: 'sword_coeff', nethop: 'nethop_coeff', smp: 'smp_coeff',
  mace: 'mace_coeff', vanilla: 'vanilla_coeff', diapot: 'diapot_coeff', uhc: 'uhc_coeff',
};

// ── Coeff badge shown top-right of a mode's tier chip ───────────────────────
interface CoeffBadgeProps {
  coeff: number | null | undefined;
  tier: string | null | undefined;
}

export function CoeffBadge({ coeff, tier }: CoeffBadgeProps) {
  if (coeff === null || coeff === undefined || coeff === 0) return null;
  if (!tier) return null;
  const rank = TIER_SCALE.indexOf(tier.toUpperCase());
  if (rank < LT3_RANK) return null; // only LT3+

  const isPositive = coeff > 0;
  const color = isPositive ? '#4ade80' : '#ff5555';
  const bgColor = isPositive ? 'rgba(74,222,128,0.12)' : 'rgba(255,85,85,0.12)';
  const borderColor = isPositive ? 'rgba(74,222,128,0.3)' : 'rgba(255,85,85,0.3)';

  return (
    <div style={{
      position: 'absolute',
      top: -10,
      right: -10,
      fontSize: 10,
      fontWeight: 900,
      color,
      background: bgColor,
      border: `1px solid ${borderColor}`,
      padding: '1px 4px',
      letterSpacing: '0.04em',
      lineHeight: 1.4,
      pointerEvents: 'none',
      zIndex: 2,
      whiteSpace: 'nowrap',
    }}>
      {isPositive ? '+' : ''}{Math.round(coeff * 100) / 100}
    </div>
  );
}

export default function TierList() {
  const [players, setPlayers] = useState<PlayerWithPoints[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerWithPoints[]>([]);
  const [selectedMode, setSelectedMode] = useState<FilterMode>('overall');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const capturedPositions = useRef<Map<string, DOMRect> | null>(null);

  useEffect(() => {
    async function fetchPlayers() {
      try {
        setLoading(true);
        // Fetch tiers + all coeff columns
        const { data, error } = await supabase.from('tiers').select(
          '*, axe_coeff, sword_coeff, nethop_coeff, smp_coeff, mace_coeff, vanilla_coeff, diapot_coeff, uhc_coeff'
        );
        if (error) throw error;
        if (data) {
          const playersWithPoints = addPointsToPlayers(data as Player[]);
          const sortedPlayers = sortPlayersByPoints(playersWithPoints);
          setPlayers(sortedPlayers);
          setFilteredPlayers(sortedPlayers);
        }
      } catch (err) {
        console.error('Error fetching players:', err);
        setError(err instanceof Error ? err.message : 'Failed to load players');
      } finally {
        setLoading(false);
      }
    }
    fetchPlayers();
  }, []);

  const handleModeChange = (newMode: FilterMode) => {
    const positions = new Map<string, DOMRect>();
    rowRefs.current.forEach((el, key) => {
      if (el) positions.set(key, el.getBoundingClientRect());
    });
    capturedPositions.current = positions;
    setSelectedMode(newMode);
  };

  useEffect(() => {
    if (selectedMode === 'overall') {
      setFilteredPlayers(players);
    } else {
      const coeffCol = MODE_TO_COEFF[selectedMode];

      const sorted = [...players].sort((a, b) => {
        const aTier = (a[selectedMode]?.toUpperCase() || 'U') as TierType;
        const bTier = (b[selectedMode]?.toUpperCase() || 'U') as TierType;
        const aTierOrder = TIER_ORDER[aTier] ?? 999;
        const bTierOrder = TIER_ORDER[bTier] ?? 999;

        if (aTierOrder !== bTierOrder) return aTierOrder - bTierOrder;

        // Same tier → sort by coeff descending
        const aCoeff = coeffCol ? ((a as any)[coeffCol] ?? 0) : 0;
        const bCoeff = coeffCol ? ((b as any)[coeffCol] ?? 0) : 0;
        if (aCoeff !== bCoeff) return bCoeff - aCoeff;

        return b._points - a._points;
      });
      setFilteredPlayers(sorted);
    }
  }, [selectedMode, players]);

  useEffect(() => {
    if (!capturedPositions.current || capturedPositions.current.size === 0) return;

    setTimeout(() => {
      const newPositions = new Map<string, DOMRect>();
      rowRefs.current.forEach((el, key) => {
        if (el) newPositions.set(key, el.getBoundingClientRect());
      });

      capturedPositions.current!.forEach((oldRect, key) => {
        const el = rowRefs.current.get(key);
        const newRect = newPositions.get(key);
        if (!el || !newRect) return;

        const deltaX = oldRect.left - newRect.left;
        const deltaY = oldRect.top - newRect.top;
        if (deltaX === 0 && deltaY === 0) return;

        el.animate(
          [
            { transform: `translate(${deltaX}px, ${deltaY}px)` },
            { transform: 'translate(0, 0)' },
          ],
          { duration: 500, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        );
      });

      capturedPositions.current = null;
    }, 0);
  }, [filteredPlayers]);

  const ranks: number[] = [];
  let rank = 1;
  for (let i = 0; i < filteredPlayers.length; i++) {
    if (i > 0) {
      const prev = filteredPlayers[i - 1];
      const curr = filteredPlayers[i];
      if (selectedMode === 'overall') {
        if (curr._points !== prev._points) rank = i + 1;
      } else {
        const prevTier = prev[selectedMode]?.toUpperCase() || 'U';
        const currTier = curr[selectedMode]?.toUpperCase() || 'U';
        if (prevTier !== currTier || prev._points !== curr._points) rank = i + 1;
      }
    }
    ranks.push(rank);
  }

  const ranksMap = new Map<string, number>();
  filteredPlayers.forEach((player, index) => {
    ranksMap.set(player.uuid || player.username, ranks[index]);
  });

  function setRowRef(key: string, el: HTMLDivElement | null) {
    if (el) rowRefs.current.set(key, el);
    else rowRefs.current.delete(key);
  }

  const titleBlock = (
    <div style={{ textAlign: 'center', marginBottom: 40, position: 'relative' }}>
      <div style={{
        width: 120, height: 1,
        background: 'linear-gradient(90deg, transparent, #b56bff, transparent)',
        margin: '0 auto 16px',
      }} />
      <h1 style={{
        fontSize: 42, fontWeight: 900, letterSpacing: '0.06em',
        textTransform: 'uppercase', margin: 0,
        background: 'linear-gradient(135deg, #4aa3ff 0%, #b56bff 50%, #ff4444 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        ChosusQT&apos;s Tier List
      </h1>
      <div style={{
        width: 120, height: 1,
        background: 'linear-gradient(90deg, transparent, #4aa3ff, transparent)',
        margin: '16px auto 0',
      }} />
    </div>
  );

  if (loading) return <div style={{ maxWidth: 1400, margin: '40px auto', padding: '0 24px' }}>{titleBlock}</div>;
  if (error) return (
    <div style={{ maxWidth: 1400, margin: '40px auto', padding: '0 24px' }}>
      {titleBlock}
      <div style={{ textAlign: 'center', color: '#ff4444', fontSize: 18 }}>Error: {error}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1400, margin: '40px auto', padding: '0 24px' }}>
      {titleBlock}

      {/* ── Nav bar ── */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: 0, marginBottom: 32, position: 'relative',
      }}>
        <div style={{ marginRight: 16 }}>
          <ModeFilter selectedMode={selectedMode} onModeChange={handleModeChange} />
        </div>

        {[
          { label: 'Info',              onClick: () => setShowInfo(true) },
          { label: 'History',           onClick: () => { window.location.href = '/history'; } },
          { label: 'Test queue (BETA)', onClick: () => { window.location.href = '/queue'; }, beta: true },
        ].map((btn, i, arr) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            style={{
              padding: '10px 18px', borderRadius: 0,
              border: '1px solid rgba(255,255,255,0.12)',
              borderRight: i < arr.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: btn.beta ? '#ffcc55' : 'rgba(255,255,255,0.75)',
              cursor: 'pointer', fontWeight: 700, fontSize: 13,
              letterSpacing: '0.05em', textTransform: 'uppercase' as const,
              transition: 'background 0.15s, color 0.15s',
              whiteSpace: 'nowrap' as const,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = btn.beta ? '#ffcc55' : 'rgba(255,255,255,0.75)'; }}
          >
            {btn.label}
          </button>
        ))}

        <div style={{ position: 'absolute', right: 0 }}>
          <SearchBar players={players} ranks={ranksMap} />
        </div>
      </div>

      {/* Column header row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '80px 54px 220px 100px repeat(8, 1fr)',
        alignItems: 'center', gap: '14px',
        padding: '6px 16px 6px 16px', marginBottom: 4,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ width: 60, marginLeft: 20 }} />
        <div style={{ width: 54 }} />
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
          Player
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
          Score
        </div>
        {MODES.map((mode: Mode) => (
          <div key={mode.key} style={{ display: 'flex', gap: '10px', marginLeft: '27.5px' }}>
            <Image src={mode.icon} alt={mode.key} width={18} height={18} style={{ opacity: 0.25, objectFit: 'contain' }} />
          </div>
        ))}
      </div>

      {/* Player rows — pass coeff data through */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredPlayers.map((player, index) => {
          const key = player.uuid || `${player.username}  `;

          // Build coeff map for this player: { axe: number, sword: number, ... }
          const coeffMap: Record<string, number | null> = {};
          MODES.forEach((m: Mode) => {
            const col = MODE_TO_COEFF[m.key];
            coeffMap[m.key] = col ? ((player as any)[col] ?? null) : null;
          });

          return (
            <div key={key} ref={(el) => setRowRef(key, el)}>
              <PlayerRow
                player={player}
                rank={ranks[index]}
                selectedMode={selectedMode}
                coeffMap={coeffMap}
              />
            </div>
          );
        })}
      </div>

      {/* ── Info modal ── */}
      {showInfo && (
        <div
          onClick={() => setShowInfo(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 860, maxWidth: '95%', maxHeight: '90vh',
              overflowY: 'auto', background: '#0d0d12',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
              color: '#fff', scrollbarWidth: 'none', overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '11px 20px', background: '#111118',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                Tiers Info
              </span>
              <button
                onClick={() => setShowInfo(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: 0, transition: 'color 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
              >✕</button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(90vh - 44px)', scrollbarWidth: 'none' }}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

                {/* LEFT — tier score list */}
                <div style={{ flex: '0 0 190px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>
                    Base Score Values per tier
                  </div>
                  {TIER_INFO.slice().reverse().map(t => (
                    <div key={t.tier} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 8px',
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid rgba(255,255,255,0.05)`,
                      borderLeft: `2px solid ${t.color}`,
                    }}>
                      <div style={{ width: 36, textAlign: 'center', fontWeight: 800, color: t.color, fontSize: 12 }}>{t.tier}</div>
                      <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg, ${t.color}80, transparent)` }} />
                      <div style={{ color: t.color, fontSize: 14, fontWeight: 900, minWidth: 44, textAlign: 'right' }}>{t.label}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, fontSize: 10, opacity: 0.3, textAlign: 'left', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Resulting score are calculated based on the original score, not just being set to the score itself.
                  </div>
                </div>

                {/* RIGHT — rules */}
                <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>

                  <div style={{
                    background: 'rgba(255,0,255,0.04)',
                    border: '1px solid rgba(255,0,255,0.15)',
                    borderLeft: '3px solid #ff00ff',
                    padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: '#ff00ff', letterSpacing: '0.04em' }}>LT3 and below</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Evaluation Placement</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6 }}>
                      Evaluated by a tester of known tier <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>T</span>.
                      All matches are FT7. The result is determined by the tester's judgment; no scoring formula applies here.
                    </p>
                  </div>

                  <div style={{
                    background: 'rgba(255,204,85,0.04)',
                    border: '1px solid rgba(255,204,85,0.18)',
                    borderLeft: '3px solid #ffcc55',
                    padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: '#ffcc55', letterSpacing: '0.04em' }}>HT3 and above</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Promotion System</span>
                    </div>

                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px 0', lineHeight: 1.6 }}>
                      To promote from your current tier <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>X</span>, reach a session score of <span style={{ color: '#ffcc55', fontWeight: 800 }}>≥ 9</span> in a single high test.
                      If a higher-tier opponent is available, fight a same-tier validation first, then the X+1.
                    </p>

                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
                      Score weights per fight
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
                      {[
                        { opp: 'Same tier (X)', win: '+1', loss: '−1', winColor: '#4ade80', lossColor: '#ff5555' },
                        { opp: 'Higher tier (X+1)', win: '+3', loss: '−0.5', winColor: '#4ade80', lossColor: '#ffaa55' },
                      ].map(row => (
                        <div key={row.opp} style={{
                          display: 'grid', gridTemplateColumns: '1fr auto auto',
                          gap: 8, alignItems: 'center',
                          padding: '7px 10px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{row.opp}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: row.winColor, background: `${row.winColor}14`, border: `1px solid ${row.winColor}40`, padding: '2px 10px', textAlign: 'center', minWidth: 44 }}>W {row.win}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: row.lossColor, background: `${row.lossColor}14`, border: `1px solid ${row.lossColor}40`, padding: '2px 10px', textAlign: 'center', minWidth: 44 }}>L {row.loss}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
                      Demotion conditions
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {[
                        { cond: 'Cumulative coefficient drops below −9', val: '→ Demote to X−1', color: '#ff3333' },
                        { cond: 'Coefficient resets after any tier change', val: 'Reset to 0', color: '#ffaa55' },
                        { cond: 'Losing any high-test fight as a HT1', val: '→ Demote to LT1', color: '#960000' },
                      ].map((p, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                          padding: '6px 10px',
                          background: 'rgba(255,50,50,0.04)',
                          border: '1px solid rgba(255,50,50,0.1)',
                        }}>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{p.cond}</span>
                          <span style={{ fontWeight: 800, fontSize: 12, color: p.color, whiteSpace: 'nowrap' }}>{p.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}