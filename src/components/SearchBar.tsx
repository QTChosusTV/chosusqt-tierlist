'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { MODES, TIER_POINT_MAP } from '@/types/tierlist';
import type { PlayerWithPoints, TierType, ModeKey } from '@/types/tierlist';

const TIER_ORDER: Record<string, number> = {
  HT1: 1, LT1: 2,
  HT2: 3, LT2: 4,
  HT3: 5, LT3: 6,
  HT4: 7, LT4: 8,
  HT5: 9, LT5: 10,
  HT6: 11, LT6: 12,
  U: 13,
};

const TIER_COLORS: Record<string, string> = {
  HT1: '#ffffff', LT1: '#8b0000',
  HT2: '#ff0000', LT2: '#ff7575',
  HT3: '#ffcc55', LT3: '#ff00ff',
  HT4: '#5588ff', LT4: '#00ffff',
  HT5: '#00ff00', LT5: '#aaaaaa',
  HT6: '#777777', LT6: '#444444',
  U: '#333333',
};

interface SearchBarProps {
  players: PlayerWithPoints[];
  ranks: Map<string, number>;
}

export default function SearchBar({ players, ranks }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlayerWithPoints | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close card when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setResult(null);
        setNotFound(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSearch() {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return;

    setLoading(true);
    setResult(null);
    setNotFound(false);
    setModelLoaded(false);

    // Simulate slight delay so spinner is visible, then search locally
    setTimeout(() => {
      const found = players.find(p => p.username.toLowerCase() === trimmed);
      if (found) {
        setResult(found);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }, 300);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch();
  }

  // Sort tiers: highest to lowest, ties keep MODES order
  const sortedModes = result
    ? [...MODES].sort((a, b) => {
        const aTier = (result[a.key as ModeKey]?.toUpperCase() || 'U') as TierType;
        const bTier = (result[b.key as ModeKey]?.toUpperCase() || 'U') as TierType;
        return (TIER_ORDER[aTier] ?? 99) - (TIER_ORDER[bTier] ?? 99);
      })
    : [];

  const playerRank = result ? ranks.get(result.uuid || result.username) : undefined;

  return (
    <div style={{ position: 'relative' }}>
      {/* Search Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search player..."
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            outline: 'none',
            width: 200,
            backdropFilter: 'blur(6px)',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(74,163,255,0.6)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
        />
        <button
          onClick={handleSearch}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(74,163,255,0.15)',
            color: '#4aa3ff',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 14,
            backdropFilter: 'blur(6px)',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74,163,255,0.28)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(74,163,255,0.15)')}
        >
          Search
        </button>
      </div>

      {/* Spinner */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 12px)',
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 32px',
          background: '#14141a',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          zIndex: 200,
        }}>
          <div style={{
            width: 28,
            height: 28,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTop: '3px solid #4aa3ff',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Not Found Message */}
      {notFound && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 12px)',
          right: 0,
          padding: '14px 20px',
          background: '#1a1010',
          borderRadius: 14,
          border: '1px solid rgba(255,80,80,0.3)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          color: '#ff6b6b',
          fontWeight: 600,
          fontSize: 14,
          zIndex: 200,
          whiteSpace: 'nowrap',
        }}>
          Player &quot;{query}&quot; not found.
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div
          ref={cardRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            width: 320,
            background: 'linear-gradient(180deg, #1a1a24, #0f0f14)',
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Player Model */}
          <div style={{
            width: '100%',
            background: 'linear-gradient(180deg, #1e1e2e, #16161f)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingTop: 16,
            minHeight: 180,
            position: 'relative',
          }}>
            {/* Show spinner over model until it loads */}
            {!modelLoaded && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: 24,
                  height: 24,
                  border: '3px solid rgba(255,255,255,0.1)',
                  borderTop: '3px solid #4aa3ff',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              width={95}
              height={155}
              loading="eager"
              alt={result.username}
              src={result.uuid ? `https://render.crafty.gg/3d/full/${result.uuid}` : `https://render.crafty.gg/3d/full/dubaditai`}
              onLoad={() => setModelLoaded(true)}
              style={{
                display: 'block',
                opacity: modelLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            />
          </div>

          {/* Username + Rank */}
          <div style={{ padding: '12px 16px 8px', textAlign: 'center', width: '100%' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
              {result.username}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              Rank{' '}
              <span style={{ color: '#4aa3ff', fontWeight: 800 }}>
                {playerRank ?? '—'}
              </span>
              {' · '}
              <span style={{ color: '#ffcc55', fontWeight: 800 }}>
                {result._points} pts
              </span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: '85%', height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 10 }} />

          {/* Tiers list */}
          <div style={{ width: '100%', padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {sortedModes.map(mode => {
              const tier = (result[mode.key as ModeKey]?.toUpperCase() || 'U') as TierType;
              const color = TIER_COLORS[tier] ?? '#555';
              const isUnranked = tier === 'U';
              return (
                <div key={mode.key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 9,
                  background: isUnranked ? 'rgba(255,255,255,0.02)' : `${color}12`,
                  border: `1px solid ${isUnranked ? 'rgba(255,255,255,0.05)' : `${color}30`}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Image
                      src={mode.icon}
                      alt={mode.key}
                      width={18}
                      height={18}
                      style={{ opacity: isUnranked ? 0.25 : 1 }}
                    />
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: isUnranked ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                    }}>
                      {mode.key}
                    </span>
                  </div>
                  <span style={{
                    letterSpacing: '0.3px',
                  }}>
                    <span style={{
                        color: isUnranked ? 'rgba(255,255,255,0.15)' : color,
                        fontWeight: 700,
                        fontSize: 12,
                    }}>{isUnranked ? '-' : tier}</span>
                    <span style={{
                        color: isUnranked ? 'rgba(255,255,255,0.15)' : `color-mix(in srgb, ${color} 50%, white)`,
                        fontWeight: 900,
                        fontSize: 15,
                    }}>{isUnranked ? '  -' : '  +' + TIER_POINT_MAP[tier]}</span>
                  </span>        
                </div>
              );
            })}
          </div>
          {/* History link */}
          <div
            onClick={() => { window.location.href = `/history?player=${result.username}`; }}
            style={{
              width: '100%', padding: '12px 14px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: 'pointer', background: 'rgba(255,255,255,0.02)',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74,163,255,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>
              View test history
            </span>
            <span style={{ fontSize: 13, color: '#4aa3ff' }}>→</span>
          </div>

        </div>
      )}
    </div>
  );
}