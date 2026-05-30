import { TIER_POINT_MAP } from '@/types/tierlist';
import type { Mode, TierType } from '@/types/tierlist';
import Image from 'next/image';

interface TierCellProps {
  mode: Mode;
  tier: TierType;
  coeff?: number | null;
}

const TIER_COLORS: Record<string, string> = {
  HT1: '#ffffff', LT1: '#8b0000',
  HT2: '#ff0000', LT2: '#ff7575',
  HT3: '#ffcc55', LT3: '#ff00ff',
  HT4: '#5588ff', LT4: '#00ffff',
  HT5: '#00ff00', LT5: '#aaaaaa',
  HT6: '#777777', LT6: '#444444',
  U:   '#333333',
};

export default function TierCell({ mode, tier, coeff }: TierCellProps) {
  const isUnranked = tier === 'U';
  const color = TIER_COLORS[tier] ?? '#555555';

  const isGlowing  = !isUnranked && coeff != null && coeff >= 9;
  const isShaking  = !isUnranked && coeff != null && coeff < -6;
  const animClass  = isGlowing ? 'tier-glow' : isShaking ? 'tier-shake' : '';

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
            borderRadius: 0,
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
            +{TIER_POINT_MAP[tier]} Pts
          </div>
        </div>
      )}

      {/* Icon square */}
      <div
        className={animClass}
        style={{
          width: 54,
          height: 54,
          borderRadius: 0,
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
        /* ── Hover effects ── */
        .group:hover > div:first-child {
          opacity: 1 !important;
        }
        .group:hover > div:nth-child(2) {
          box-shadow: inset 0 0 14px ${color}40, 0 0 8px ${color}30 !important;
        }

        /* ── Glow: pulses in and out every 3s ── */
        @keyframes tier-glow-anim {
          0%   { box-shadow: inset 0 0 10px ${color}40, 0 0 10px ${color}80; }
          50%  { box-shadow: inset 0 0 30px ${color}99, 0 0 40px ${color}ff, 0 0 70px ${color}99, 0 0 100px ${color}55; }
          100% { box-shadow: inset 0 0 10px ${color}40, 0 0 10px ${color}80; }
        }
        .tier-glow {
          animation: tier-glow-anim 3s ease-in-out infinite;
        }

        /* ── Shake: wobbles like it's about to fall off every 3s ── */
        @keyframes tier-shake-anim {
          0%,  70%, 100% { transform: rotate(0deg)      translateX(0px); }
          72%            { transform: rotate(-4deg)     translateX(-2px); }
          74%            { transform: rotate( 4deg)     translateX( 2px); }
          76%            { transform: rotate(-3deg)     translateX(-2px); }
          78%            { transform: rotate( 3deg)     translateX( 2px); }
          80%            { transform: rotate(-2deg)     translateX(-1px); }
          82%            { transform: rotate( 1deg)     translateX( 1px); }
          84%            { transform: rotate(0deg)      translateX(0px); }
        }
        .tier-shake {
          animation: tier-shake-anim 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}