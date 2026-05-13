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


// Score color based on points value — mirrors the tier point scale feel
function getScoreColor(points: number): string {
  if (points >= 4000) return '#ffffff';
  if (points >= 2000)  return '#8b0000';
  if (points >= 800)  return '#ff0000';
  if (points >= 400)   return '#ff7575';
  if (points >= 200)   return '#ffcc55';
  if (points >= 80)   return '#ff00ff';
  if (points >= 56)    return '#5588ff';
  if (points >= 40)    return '#00ffff';
  if (points >= 32)    return '#00ff00';
  if (points >= 24)    return '#aaaaaa';
  if (points >= 16)    return '#777777';
  if (points >= 8)    return '#444444';
  return 'rgba(255,255,255,0.3)';
}

function adjustColor(
  hex: string,
  brightnessMul: number,
  saturationMul: number
) {
  hex = hex.replace('#', '');

  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;

    s = l > 0.5
      ? d / (2 - max - min)
      : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  // adjust saturation + brightness
  s = Math.max(0, Math.min(1, s * saturationMul));
  l = Math.max(0, Math.min(1, l * brightnessMul));

  function hue2rgb(p: number, q: number, t: number) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  let rr, gg, bb;

  if (s === 0) {
    rr = gg = bb = l;
  } else {
    const q = l < 0.5
      ? l * (1 + s)
      : l + s - l * s;

    const p = 2 * l - q;

    rr = hue2rgb(p, q, h + 1 / 3);
    gg = hue2rgb(p, q, h);
    bb = hue2rgb(p, q, h - 1 / 3);
  }

  return `rgb(${Math.round(rr * 255)}, ${Math.round(gg * 255)}, ${Math.round(bb * 255)})`;
}

function mixColors(color1: string, color2: string, amount: number) {
  const c1 = color1.match(/\d+/g)?.map(Number) || [0, 0, 0];
  const c2 = color2.match(/\d+/g)?.map(Number) || [0, 0, 0];

  const r = Math.round(c1[0] * (1 - amount) + c2[0] * amount);
  const g = Math.round(c1[1] * (1 - amount) + c2[1] * amount);
  const b = Math.round(c1[2] * (1 - amount) + c2[2] * amount);

  return `rgb(${r}, ${g}, ${b})`;
}

function getRankBackground(rank: number, points: number): string {
  const bgTop = 'rgb(20, 20, 26)';
  const bgBottom = 'rgb(16, 16, 20)';

  if (points === 0 || rank > 300) {
    return `linear-gradient(180deg, ${bgTop}, ${bgBottom})`;
  }

  let baseColor = '';

  if (rank <= 1) baseColor = '#ffffff';
  else if (rank <= 3) baseColor = '#8b0000';
  else if (rank <= 5) baseColor = '#ff0000';
  else if (rank <= 10) baseColor = '#ff7575';
  else if (rank <= 20) baseColor = '#ffcc55';
  else if (rank <= 40) baseColor = '#ff00ff';
  else if (rank <= 80) baseColor = '#5588ff';
  else if (rank <= 150) baseColor = '#00ffff';
  else baseColor = '#00ff00';

  // make subdued prestige tint
  const tintedTop = mixColors(
    bgTop,
    adjustColor(baseColor, 1, 0.7),
    0.1
  );

  const tintedBottom = mixColors(
    bgBottom,
    adjustColor(baseColor, 0.8, 0.45),
    0.05
  );

  return `linear-gradient(180deg, ${tintedTop}, ${tintedBottom})`;
}

function getRankAccentColor(rank: number, points: number): string {
  if (points === 0 || rank > 300) {
    return 'rgba(255,255,255,0.35)';
  }

  if (rank <= 1) return '#ffffff';
  if (rank <= 3) return '#bd0000';
  if (rank <= 5) return '#ff0000';
  if (rank <= 10) return '#ff7575';
  if (rank <= 20) return '#ffcc55';
  if (rank <= 40) return '#ff00ff';
  if (rank <= 80) return '#5588ff';
  if (rank <= 150) return '#00ffff';

  return '#00ff00';
}


// Left border accent for top 3
const rankBorderStyle = (
  rank: number,
  points: number
): React.CSSProperties => ({
  borderLeft: `3px solid ${getRankAccentColor(rank, points)}`,
});

export default function PlayerRow({ player, rank, selectedMode }: PlayerRowProps) {
  const scoreColor = getScoreColor(player._points);
  const rColor = getRankAccentColor(rank, player._points);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 54px 220px 100px repeat(8, 1fr)',
        alignItems: 'center',
        gap: '14px',
        background: getRankBackground(rank, player._points),
        minHeight: 72,
        boxSizing: 'border-box',
        padding: '0 16px 0 13px', // 13px to account for 3px border
        borderRadius: 0,
        ...rankBorderStyle(rank, player._points),
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
          textShadow: rank <= 3 ? `0 0 2px ${rColor}80` : 'none',
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
              marginTop: '10px',
              marginBottom: '5px'
            }}
          >
            <TierCell mode={mode} tier={tier} />
          </div>
        );
      })}
    </div>
  );
}