// PlayerRow.tsx
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

export default function PlayerRow({ player, rank, selectedMode }: PlayerRowProps) {
  return (
    <div
      // outer row container — keep layout stable and predictable for FLIP
      className="p-4 rounded-[14px]"
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 54px 220px 100px repeat(8, 1fr)',
        alignItems: 'center',
        gap: '14px',
        background: 'linear-gradient(180deg, #14141a, #101014)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
        minHeight: 72,
        boxSizing: 'border-box',
      }}
    >
      {/* Rank (locked width) */}
      <div
        style={{
          width: 60,
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: '0.3px',
          marginLeft: 20,
          color: 'white',
          textAlign: 'left',
          boxSizing: 'border-box',
        }}
      >
        #{rank}
      </div>

      {/* Avatar (fixed box) */}
      <div style={{ width: 54, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image
          src={`https://mc-heads.net/avatar/${player.uuid}`}
          alt={player.username}
          width={54}
          height={54}
          style={{
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            display: 'block',
            objectFit: 'cover',
          }}
        />
      </div>

      {/* Username */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: '0.3px',
          color: 'white',
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
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: '0.3px',
          textAlign: 'center',
          color: 'white',
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
