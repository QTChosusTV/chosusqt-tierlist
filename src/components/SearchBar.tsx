'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { MODES, TIER_POINT_MAP } from '@/types/tierlist';
import type { PlayerWithPoints, TierType, ModeKey } from '@/types/tierlist';

const TIER_ORDER: Record<string, number> = {
  HT1: 1, LT1: 2, HT2: 3, LT2: 4, HT3: 5, LT3: 6,
  HT4: 7, LT4: 8, HT5: 9, LT5: 10, HT6: 11, LT6: 12, U: 13,
};

const TIER_COLORS: Record<string, string> = {
  HT1: '#ffffff', LT1: '#8b0000', HT2: '#ff0000', LT2: '#ff7575',
  HT3: '#ffcc55', LT3: '#ff00ff', HT4: '#5588ff', LT4: '#00ffff',
  HT5: '#00ff00', LT5: '#aaaaaa', HT6: '#777777', LT6: '#444444',
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        cardRef.current && !cardRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
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
    setTimeout(() => {
      const found = players.find(p => p.username.toLowerCase() === trimmed);
      if (found) setResult(found);
      else setNotFound(true);
      setLoading(false);
    }, 300);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch();
  }

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
      {/* Search row — input + button, no gap, shared border */}
      <div style={{ display: 'flex' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search player..."
          style={{
            padding: '9px 14px',
            borderRadius: 0,
            border: '1px solid rgba(255,255,255,0.12)',
            borderRight: 'none',
            background: 'rgba(255,255,255,0.04)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 500,
            outline: 'none',
            width: 190,
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(74,163,255,0.5)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
        />
        <button
          onClick={handleSearch}
          style={{
            padding: '9px 16px',
            borderRadius: 0,
            border: '1px solid rgba(74,163,255,0.4)',
            background: 'rgba(74,163,255,0.12)',
            color: '#4aa3ff',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            transition: 'background 0.15s, color 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,163,255,0.25)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,163,255,0.12)'; e.currentTarget.style.color = '#4aa3ff'; }}
        >
          Search
        </button>
      </div>

      {/* Spinner */}
      {loading && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '18px 28px',
          background: '#0f0f14',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          zIndex: 200,
        }}>
          <div style={{
            width: 22, height: 22,
            border: '2px solid rgba(255,255,255,0.08)',
            borderTop: '2px solid #4aa3ff',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Not found */}
      {notFound && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          padding: '12px 18px',
          background: '#0f0f14',
          border: '1px solid rgba(255,85,85,0.3)',
          borderLeft: '3px solid #ff5555',
          color: '#ff6b6b', fontWeight: 600, fontSize: 13,
          zIndex: 200, whiteSpace: 'nowrap',
        }}>
          Player &quot;{query}&quot; not found.
        </div>
      )}

      {/* Result card */}
      {result && (
        <div
          ref={cardRef}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 300,
            background: '#0f0f14',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
            overflow: 'hidden',
            zIndex: 200,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}
        >
          {/* 3D model area */}
          <div style={{
            width: '100%',
            background: 'linear-gradient(180deg, #161620, #0f0f18)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingTop: 16, minHeight: 170, position: 'relative',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {!modelLoaded && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: 20, height: 20,
                  border: '2px solid rgba(255,255,255,0.08)',
                  borderTop: '2px solid #4aa3ff',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              width={88} height={145} loading="eager" alt={result.username}
              src={result.uuid ? `https://render.crafty.gg/3d/full/${result.uuid}` : `https://render.crafty.gg/3d/full/dubaditai`}
              onLoad={() => setModelLoaded(true)}
              style={{ display: 'block', opacity: modelLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
            />
          </div>

          {/* Username + rank */}
          <div style={{ padding: '12px 16px 8px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '0.03em', marginBottom: 4 }}>
              {result.username}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.04em' }}>
              RANK{' '}
              <span style={{ color: '#4aa3ff', fontWeight: 800 }}>{playerRank ?? '—'}</span>
              {'  ·  '}
              <span style={{ color: '#ffcc55', fontWeight: 800 }}>{result._points} pts</span>
            </div>
          </div>

          {/* Thin divider */}
          <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)' }} />

          {/* Tier rows */}
          <div style={{ width: '100%', padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 3, boxSizing: 'border-box' }}>
            {sortedModes.map(mode => {
              const tier = (result[mode.key as ModeKey]?.toUpperCase() || 'U') as TierType;
              const color = TIER_COLORS[tier] ?? '#555';
              const isUnranked = tier === 'U';
              return (
                <div key={mode.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '5px 8px',
                  background: isUnranked ? 'rgba(255,255,255,0.02)' : `${color}0d`,
                  border: `1px solid ${isUnranked ? 'rgba(255,255,255,0.04)' : `${color}28`}`,
                  borderLeft: isUnranked ? '1px solid rgba(255,255,255,0.04)' : `2px solid ${color}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Image src={mode.icon} alt={mode.key} width={16} height={16}
                      style={{ opacity: isUnranked ? 0.2 : 1, objectFit: 'contain' }} />
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                      color: isUnranked ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.65)',
                    }}>
                      {mode.key}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{ color: isUnranked ? 'rgba(255,255,255,0.12)' : color, fontWeight: 700, fontSize: 11 }}>
                      {isUnranked ? '—' : tier}
                    </span>
                    <span style={{
                      color: isUnranked ? 'rgba(255,255,255,0.12)' : `color-mix(in srgb, ${color} 60%, white)`,
                      fontWeight: 900, fontSize: 14,
                    }}>
                      {isUnranked ? '' : `+${TIER_POINT_MAP[tier]}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* History link */}
          <div
            onClick={() => { window.location.href = `/history?player=${result.username}`; }}
            style={{
              width: '100%', padding: '10px 14px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: 'pointer', background: 'rgba(255,255,255,0.02)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74,163,255,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              View test history
            </span>
            <span style={{ fontSize: 12, color: '#4aa3ff' }}>→</span>
          </div>
        </div>
      )}
    </div>
  );
}