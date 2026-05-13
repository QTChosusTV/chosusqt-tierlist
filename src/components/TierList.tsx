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
        const { data, error } = await supabase.from('tiers').select('*');
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
      const sorted = [...players].sort((a, b) => {
        const aTier = (a[selectedMode]?.toUpperCase() || 'U') as TierType;
        const bTier = (b[selectedMode]?.toUpperCase() || 'U') as TierType;
        const aTierOrder = TIER_ORDER[aTier] ?? 999;
        const bTierOrder = TIER_ORDER[bTier] ?? 999;
        if (aTierOrder !== bTierOrder) return aTierOrder - bTierOrder;
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

  if (loading) {
    return (
      <div style={{ maxWidth: 1400, margin: '40px auto', padding: '0 24px' }}>
        {/* ── Title ── */}
        <div style={{ textAlign: 'center', marginBottom: 40, position: 'relative' }}>
          {/* decorative top line */}
          <div style={{
            width: 120, height: 1,
            background: 'linear-gradient(90deg, transparent, #b56bff, transparent)',
            margin: '0 auto 16px',
          }} />

          <h1 style={{
            fontSize: 42,
            fontWeight: 900,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            margin: 0,
            background: 'linear-gradient(135deg, #4aa3ff 0%, #b56bff 50%, #ff4444 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            ChosusQT&apos;s Tier List
          </h1>

          {/* decorative bottom line */}
          <div style={{
            width: 120, height: 1,
            background: 'linear-gradient(90deg, transparent, #4aa3ff, transparent)',
            margin: '16px auto 0',
          }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 1400, margin: '40px auto', padding: '0 24px' }}>
        <h1 style={{
          fontSize: 48, fontWeight: 900, textAlign: 'center', marginBottom: 40,
          background: 'linear-gradient(135deg, #4aa3ff, #b56bff, #ff4444)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          ChosusQT&apos;s Tier List
        </h1>
        <div style={{ textAlign: 'center', color: '#ff4444', fontSize: 18 }}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '40px auto', padding: '0 24px' }}>
      {/* ── Title ── */}
      <div style={{ textAlign: 'center', marginBottom: 40, position: 'relative' }}>
        {/* decorative top line */}
        <div style={{
          width: 120, height: 1,
          background: 'linear-gradient(90deg, transparent, #b56bff, transparent)',
          margin: '0 auto 16px',
        }} />

        <h1 style={{
          fontSize: 42,
          fontWeight: 900,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          margin: 0,
          background: 'linear-gradient(135deg, #4aa3ff 0%, #b56bff 50%, #ff4444 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          ChosusQT&apos;s Tier List
        </h1>

        {/* decorative bottom line */}
        <div style={{
          width: 120, height: 1,
          background: 'linear-gradient(90deg, transparent, #4aa3ff, transparent)',
          margin: '16px auto 0',
        }} />
      </div>

      {/* ── Nav bar ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 0,              // no gap — buttons share borders
        marginBottom: 32,
        position: 'relative',
      }}>

        {/* ModeFilter sits slightly apart as a distinct control */}
        <div style={{ marginRight: 16 }}>
          <ModeFilter selectedMode={selectedMode} onModeChange={handleModeChange} />
        </div>

        {/* Grouped action buttons — shared border, sharp corners */}
        {[
          { label: 'Info',              onClick: () => setShowInfo(true) },
          { label: 'History',           onClick: () => { window.location.href = '/history'; } },
          { label: 'Test queue (BETA)', onClick: () => { window.location.href = '/queue'; }, beta: true },
        ].map((btn, i, arr) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            style={{
              padding: '10px 18px',
              borderRadius: 0,
              border: '1px solid rgba(255,255,255,0.12)',
              borderRight: i < arr.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: btn.beta ? '#ffcc55' : 'rgba(255,255,255,0.75)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.05em',
              textTransform: 'uppercase' as const,
              transition: 'background 0.15s, color 0.15s',
              whiteSpace: 'nowrap' as const,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.09)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.color = btn.beta ? '#ffcc55' : 'rgba(255,255,255,0.75)';
            }}
          >
            {btn.label}
          </button>
        ))}

        {/* Search bar pinned right */}
        <div style={{ position: 'absolute', right: 0 }}>
          <SearchBar players={players} ranks={ranksMap} />
        </div>
      </div>

      {/* Column header row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '80px 54px 220px 100px repeat(8, 1fr)',
        alignItems: 'center',
        gap: '14px',
        padding: '6px 16px 6px 16px',
        marginBottom: 4,
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
          <div key={mode.key} style={{ display: 'flex', gap: '10px', marginLeft: '27.5px'}}>
            <Image
              src={mode.icon}
              alt={mode.key}
              width={18}
              height={18}
              style={{ opacity: 0.25, objectFit: 'contain' }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredPlayers.map((player, index) => {
          const key = player.uuid || `${player.username}  `;
          return (
            <div key={key} ref={(el) => setRowRef(key, el)}>
              <PlayerRow player={player} rank={ranks[index]} selectedMode={selectedMode} />
            </div>
          );
        })}
      </div>

      {showInfo && (
        <div
          onClick={() => setShowInfo(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 860, maxWidth: '95%', maxHeight: '90vh',
              overflowY: 'auto',
              background: 'linear-gradient(180deg, #121212, #0b0b0b)',
              borderRadius: 16, padding: 24,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              color: '#fff', scrollbarWidth: 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>Tiers Info</h2>
              <button onClick={() => setShowInfo(false)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* LEFT — tier score list */}
              <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 4 }}>Score per tier</div>
                {TIER_INFO.slice().reverse().map(t => (
                  <div key={t.tier} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
                    <div style={{ width: 40, textAlign: 'center', fontWeight: 800, color: t.color, fontSize: 13 }}>{t.tier}</div>
                    <div style={{ flex: 1, height: 6, borderRadius: 999, background: `linear-gradient(90deg, ${t.color}, transparent)` }} />
                    <div style={{ color: t.color, fontSize: 15, fontWeight: 900, filter: 'brightness(1.5) saturate(2)', minWidth: 52, textAlign: 'right' }}>{t.label}</div>
                  </div>
                ))}
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.4, textAlign: 'center' }}>Lower → Higher skill</div>
              </div>

              {/* RIGHT — rules */}
              <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* LT3- */}
                <div style={{ borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: '#ff00ff' }}>LT3 and below</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Evaluation Placement</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
                    Evaluated by a tester of known tier <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>T</span>. All matches are FT7. All stats here are just for reference, the result is still determined by the tester;
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 6 }}>Combat</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                    {[
                      { score: '7 – 0', result: 'T − 4' },
                      { score: '7 – 1', result: 'T − 3' },
                      { score: '7 – 2 / 7 – 3', result: 'T − 2' },
                      { score: '7 – 4 / 7 – 5', result: 'T − 1' },
                      { score: '7 – 6+', result: 'T' },
                    ].map(row => (
                      <div key={row.score} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.65)', fontSize: 13, minWidth: 110 }}>{row.score}</span>
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>→</span>
                        <span style={{ fontWeight: 800, color: '#ff00ff', fontSize: 13 }}>{row.result}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 6 }}>Stat-based modes (% difference)</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Damage', rows: ['85%', '60%', '40%', '25%', '−10%'] },
                      { label: 'Durability', rows: ['90%', '75%', '55%', '25%', '−20%'] },
                      { label: 'Potion', rows: ['90%', '80%', '65%', '35%', '−20%'] },
                    ].map(col => (
                      <div key={col.label} style={{ flex: 1, minWidth: 80, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 7 }}>{col.label}</div>
                        {col.rows.map((threshold, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{'>'}{threshold}</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#ff00ff' }}>T−{4 - i || 0}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* HT3+ */}
                <div style={{ borderRadius: 12, background: 'rgba(255,204,85,0.04)', border: '1px solid rgba(255,204,85,0.15)', padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: '#ffcc55' }}>HT3 and above</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Promotion System</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
                    Current tier = <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>X</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 6 }}>Opponent Weights</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Same tier', weight: '×1' },
                      { label: 'X + 1', weight: '×2.5' },
                      { label: 'X + 2', weight: '×7.5' },
                    ].map(w => (
                      <div key={w.label} style={{ flex: 1, minWidth: 70, background: 'rgba(255,204,85,0.06)', border: '1px solid rgba(255,204,85,0.12)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{w.label}</div>
                        <div style={{ fontWeight: 900, fontSize: 16, color: '#ffcc55' }}>{w.weight}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 6 }}>Promotion Requirements</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                    {['Defeat all assigned opponents', 'Total accumulated weight ≥ 3', 'Skill score ≥ 3'].map((req, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#4ade80', fontSize: 12 }}>✓</span>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{req}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 6 }}>Penalties</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[
                      { cond: 'Loss vs same tier', val: '−1', color: '#ff5555' },
                      { cond: 'Loss vs higher tier', val: 'reduced', color: '#ffaa55' },
                      { cond: 'Loss vs lower tier', val: 'increased', color: '#ff3333' },
                      { cond: 'Skill score < −3', val: 'Demotion', color: '#ff3333' },
                      { cond: 'HT1 loses validation', val: '→ LT1', color: '#ff3333' },
                    ].map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
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
      )}
    </div>
  );
}