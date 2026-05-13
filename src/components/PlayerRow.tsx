'use client';

import Image from 'next/image';
import TierCell from './TierCell';
import { MODES } from '@/types/tierlist';
import type { PlayerWithPoints, TierType, ModeKey, FilterMode } from '@/types/tierlist';

interface PlayerRowProps {
  player: PlayerWithPoints;
  rank: number;
  selectedMode: FilterMode;
}

// Top 3 rank accent colors
const RANK_COLORS: Record<number, string> = {
  1: '#b56bff',
  2: '#4aa3ff',
  3: '#00ffcc',
};

// Score color based on points value — mirrors the tier point scale feel
function getScoreColor(points: number): string {
  if (points >= 5000) return '#ffffff';
  if (points >= 1500)  return '#8b0000';
  if (points >= 500)  return '#ff0000';
  if (points >= 250)   return '#ff7575';
  if (points >= 125)   return '#ffcc55';
  if (points >= 50)   return '#ff00ff';
  if (points >= 35)    return '#00ffff';
  if (points >= 25)    return '#5588ff';
  if (points >= 20)    return '#00ff00';
  if (points >= 15)    return '#aaaaaa';
  if (points >= 10)    return '#777777';
  if (points >= 5)    return '#444444';
  return 'rgba(255,255,255,0.3)';
}

const rankColor = (rank: number) => RANK_COLORS[rank] ?? 'rgba(255,255,255,0.35)';

// Left border accent for top 3
const rankBorderStyle = (rank: number): React.CSSProperties =>
  rank <= 3
    ? { borderLeft: `3px solid ${rankColor(rank)}` }
    : { borderLeft: '3px solid transparent' };

export default function PlayerRow({ player, rank, selectedMode }: PlayerRowProps) {
  const scoreColor = getScoreColor(player._points);
  const rColor = rankColor(rank);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 54px 220px 100px repeat(8, 1fr)',
        alignItems: 'center',
        gap: '14px',
        background: rank === 1
          ? 'linear-gradient(180deg, #1a1228, #100e18)'
          : rank === 2
          ? 'linear-gradient(180deg, #0e1624, #0a0e18)'
          : rank === 3
          ? 'linear-gradient(180deg, #0e1a18, #0a1210)'
          : 'linear-gradient(180deg, #14141a, #101014)',
        boxShadow: rank <= 3
          ? `0 6px 20px rgba(0,0,0,0.35), inset 0 0 40px ${rankColor(rank)}08`
          : '0 6px 20px rgba(0,0,0,0.35)',
        minHeight: 72,
        boxSizing: 'border-box',
        padding: '0 16px 0 13px', // 13px to account for 3px border
        borderRadius: 0,
        ...rankBorderStyle(rank),
      }}
    >
      {/* Rank */}
      <div
        style={{
          width: 60,
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: '0.3px',
          marginLeft: 20,
          color: rColor,
          textAlign: 'left',
          boxSizing: 'border-box',
          textShadow: rank <= 3 ? `0 0 12px ${rColor}80` : 'none',
        }}
      >
        #{rank}
      </div>

      {/* Avatar */}
      <div style={{ width: 54, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image
          src={`https://mc-heads.net/avatar/${player.uuid}`}
          alt={player.username}
          width={54}
          height={54}
          style={{
            borderRadius: 0,
            border: rank <= 3 ? `1px solid ${rColor}60` : '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            display: 'block',
            objectFit: 'cover',
            imageRendering: 'pixelated',
          }}
        />
      </div>

      {/* Username */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: '0.3px',
          color: rank <= 3 ? '#ffffff' : 'rgba(255,255,255,0.85)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={player.username}
      >
        {player.username}
      </div>

      {/* Points */}
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: '0.3px',
          textAlign: 'center',
          color: scoreColor,
          textShadow: `0 0 2px ${scoreColor}`,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {player._points}
      </div>

      {/* Tier Cells */}
      {MODES.map(mode => {
        const tier = (player[mode.key as ModeKey]?.toUpperCase() || 'U') as TierType;
        const faded = selectedMode !== 'overall' && selectedMode !== mode.key;

        return (
          <div
            key={mode.key}
            style={{
              opacity: faded ? 0.1 : 1,
              transition: 'opacity 0.18s ease',
              willChange: 'opacity',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <TierCell mode={mode} tier={tier} />
          </div>
        );
      })}
    </div>
  );
}