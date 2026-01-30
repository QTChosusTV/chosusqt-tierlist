import { TIER_POINT_MAP } from '@/types/tierlist';
import type { Mode, TierType } from '@/types/tierlist';
import Image from 'next/image';

interface TierCellProps {
  mode: Mode;
  tier: TierType;
}

export default function TierCell({ mode, tier }: TierCellProps) {
  const isUnranked = tier === 'U';
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
      position: 'relative',
      margin: '10px'
    }}
    className="group">
      {/* Tooltip */}
      {!isUnranked && (
        <div 
          className={`border-${tier} color-${tier}`}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1a1a24',
            borderWidth: '2px',
            borderStyle: 'solid',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
            opacity: 0,
            pointerEvents: 'none',
            transition: 'opacity 0.2s ease',
            whiteSpace: 'nowrap',
            zIndex: 100,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
          }}
        >
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            textTransform: 'uppercase',
            marginBottom: '4px'
          }}>
            {mode.key.toUpperCase()}
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: 800,
            marginBottom: '4px'
          }}>
            Tier {tier}
          </div>
          <div style={{
            fontSize: '13px',
            opacity: 0.8
          }}>
            {TIER_POINT_MAP[tier]} points
          </div>
        </div>
      )}

      {/* Icon */}
      <div 
        className={`color-${mode.key} ${isUnranked ? '' : `color-${tier}`}`}
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '26px',
          fontWeight: 800,
          borderWidth: '2px',
          borderStyle: 'solid',
          borderColor: 'currentColor',
          boxShadow: 'inset 0 0 12px rgba(255,255,255,0.25)',
          overflow: 'hidden',
          opacity: isUnranked ? 0.1 : 1
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
            objectFit: 'contain'
          }}
        />
      </div>

      {/* Tier Text */}
      <div 
        className={`${isUnranked ? '' : `color-${tier}`}`}
        style={{
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '0.4px',
          opacity: isUnranked ? 0.1 : 1
        }}
      >
        {isUnranked ? '' : tier}
      </div>

      <style jsx>{`
        .group:hover > div:first-child {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
