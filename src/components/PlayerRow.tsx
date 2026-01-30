import Image from 'next/image';
import TierCell from './TierCell';
import { MODES } from '@/types/tierlist';
import type { PlayerWithPoints, TierType } from '@/types/tierlist';

interface PlayerRowProps {
  player: PlayerWithPoints;
  rank: number;
}

export default function PlayerRow({ player, rank }: PlayerRowProps) {
  return (
    <div 
      className="p-4 rounded-[14px]"
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 54px 220px 100px repeat(8, 1fr)',
        alignItems: 'center',
        gap: '14px',
        background: 'linear-gradient(180deg, #14141a, #101014)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
        marginBottom: '10px'
      }}
    >
      {/* Rank */}
      <div style={{
        fontSize: '20px',
        fontWeight: 700,
        letterSpacing: '0.3px',
        marginLeft: '20px',
        color: 'white'
      }}>
        #{rank}
      </div>

      {/* Avatar */}
      <Image
        src={`https://mc-heads.net/avatar/${player.uuid}`}
        alt={player.username}
        width={54}
        height={54}
        style={{
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
        }}
      />

      {/* Username */}
      <div style={{
        fontSize: '20px',
        fontWeight: 700,
        letterSpacing: '0.3px',
        color: 'white'
      }}>
        {player.username}
      </div>

      {/* Points */}
      <div style={{
        fontSize: '20px',
        fontWeight: 700,
        letterSpacing: '0.3px',
        textAlign: 'center',
        color: 'white'
      }}>
        {player._points}
      </div>

      {/* Tier Cells */}
      {MODES.map(mode => {
        const tier = (player[mode.key]?.toUpperCase() || 'U') as TierType;
        return (
          <TierCell
            key={mode.key}
            mode={mode}
            tier={tier}
          />
        );
      })}
    </div>
  );
}