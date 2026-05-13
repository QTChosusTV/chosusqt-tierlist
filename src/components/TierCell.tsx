import { TIER_POINT_MAP } from '@/types/tierlist';
import type { Mode, TierType } from '@/types/tierlist';
import Image from 'next/image';

interface TierCellProps {
  mode: Mode;
  tier: TierType;
}

// Original tier color palette preserved exactly
const TIER_COLORS: Record<string, string> = {
  HT1: '#ffffff', LT1: '#8b0000',
  HT2: '#ff0000', LT2: '#ff7575',
  HT3: '#ffcc55', LT3: '#ff00ff',
  HT4: '#5588ff', LT4: '#00ffff',
  HT5: '#00ff00', LT5: '#aaaaaa',
  HT6: '#777777', LT6: '#444444',
  U:   '#333333',
};

export default function TierCell({ mode, tier }: TierCellProps) {
  const isUnranked = tier === 'U';
  const color = TIER_COLORS[tier] ?? '#555555';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '5px',
        position: 'relative',
        margin: '8px',
      }}
      className="group"
    >
      {/* Tooltip */}
      {!isUnranked && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0f0f14',
            border: `1.5px solid ${color}`,
            borderRadius: 0, // sharp
            padding: '10px 14px',
            opacity: 0,
            pointerEvents: 'none',
            transition: 'opacity 0.15s ease',
            whiteSpace: 'nowrap',
            zIndex: 100,
            boxShadow: `0 4px 20px rgba(0,0,0,0.7), 0 0 12px ${color}30`,
            color,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3, opacity: 0.6, color: 'rgba(255,255,255,0.5)' }}>
            {mode.key.toUpperCase()}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>
            Tier {tier}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, color: 'rgba(255,255,255,0.6)' }}>
            +{TIER_POINT_MAP[tier]} pts
          </div>
        </div>
      )}

      {/* Icon circle — sharp border, original tier color */}
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 0, // SHARP — key change
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: '2px',
          borderStyle: 'solid',
          borderColor: isUnranked ? 'rgba(255,255,255,0.08)' : color,
          background: isUnranked ? 'transparent' : `${color}12`,
          boxShadow: isUnranked ? 'none' : `inset 0 0 10px ${color}20`,
          overflow: 'hidden',
          opacity: isUnranked ? 0.12 : 1,
          transition: 'box-shadow 0.15s ease',
        }}
      >
        <Image
          src={mode.icon}
          alt={mode.key}
          width={38}
          height={38}
          style={{
            width: '70%',
            height: '70%',
            objectFit: 'contain',
            filter: isUnranked ? 'grayscale(1)' : `drop-shadow(0 0 4px ${color}80)`,
          }}
        />
      </div>

      {/* Tier label */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: isUnranked ? 'transparent' : color,
          textShadow: isUnranked ? 'none' : `0 0 8px ${color}60`,
        }}
      >
        {isUnranked ? '\u00a0' : tier}
      </div>

      <style jsx>{`
        .group:hover > div:first-child {
          opacity: 1 !important;
        }
        .group:hover > div:nth-child(2) {
          box-shadow: inset 0 0 14px ${color}40, 0 0 8px ${color}30 !important;
        }
      `}</style>
    </div>
  );
}