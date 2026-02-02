'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addPointsToPlayers, sortPlayersByPoints } from '@/lib/utils';
import PlayerRow from './PlayerRow';
import ModeFilter, { FilterMode } from './ModeFilter';
import type { Player, PlayerWithPoints, TierType } from '@/types/tierlist';

// Tier order for sorting (best to worst)
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
  { tier: 'LT6', label: 'Lowest Tier 6', color: '#444444' },
  { tier: 'HT6', label: 'High Tier 6', color: '#777777' },
  { tier: 'LT5', label: 'Low Tier 5', color: '#aaaaaa' },
  { tier: 'HT5', label: 'High Tier 5', color: '#00ff00' },
  { tier: 'LT4', label: 'Low Tier 4', color: '#00ffff' },
  { tier: 'HT4', label: 'High Tier 4', color: '#5588ff' },
  { tier: 'LT3', label: 'Low Tier 3', color: '#ff00ff' },
  { tier: 'HT3', label: 'High Tier 3', color: '#ffcc55' },
  { tier: 'LT2', label: 'Low Tier 2', color: '#ff7575' },
  { tier: 'HT2', label: 'High Tier 2', color: '#ff0000' },
  { tier: 'LT1', label: 'Low Tier 1', color: '#8b0000' },
  { tier: 'HT1', label: 'GOAT', color: '#ffffff' },
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

  // Fetch players
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

  // STEP 1: When mode change is requested, capture current positions
  const handleModeChange = (newMode: FilterMode) => {
    console.log('🔵 STEP 1: Capturing positions for mode change to:', newMode);
    
    // Capture positions BEFORE any state change
    const positions = new Map<string, DOMRect>();
    rowRefs.current.forEach((el, key) => {
      if (el) {
        const rect = el.getBoundingClientRect();
        positions.set(key, rect);
        console.log(`  📍 Captured OLD position for ${key}:`, { top: rect.top, left: rect.left });
      }
    });
    
    console.log(`  ✅ Captured ${positions.size} positions`);
    
    // Store positions in ref (not state!)
    capturedPositions.current = positions;
    
    // Update mode
    setSelectedMode(newMode);
  };

  // STEP 2: Update filtered players based on selected mode
  useEffect(() => {
    console.log('🟡 STEP 2: Updating filteredPlayers for mode:', selectedMode);
    
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

  // STEP 3: After filteredPlayers updates, animate if we have captured positions
  useEffect(() => {
    console.log('🟣 STEP 3: Animation effect triggered');
    console.log('  capturedPositions exists?', capturedPositions.current !== null);
    console.log('  capturedPositions size:', capturedPositions.current?.size || 0);
    
    if (!capturedPositions.current || capturedPositions.current.size === 0) {
      console.log('  ❌ No captured positions, skipping animation');
      return;
    }

    console.log('  🎬 Starting animation...');

    // Small delay to ensure DOM has updated
    setTimeout(() => {
      // Get new positions after DOM update
      const newPositions = new Map<string, DOMRect>();
      rowRefs.current.forEach((el, key) => {
        if (el) {
          const rect = el.getBoundingClientRect();
          newPositions.set(key, rect);
          console.log(`  📍 NEW position for ${key}:`, { top: rect.top, left: rect.left });
        }
      });

      console.log(`  ✅ Got ${newPositions.size} new positions`);

      let animationCount = 0;

      // Animate each element
      capturedPositions.current!.forEach((oldRect, key) => {
        const el = rowRefs.current.get(key);
        const newRect = newPositions.get(key);
        
        if (!el || !newRect) {
          console.log(`  ⚠️ Skipping ${key}: element or new position missing`);
          return;
        }

        const deltaX = oldRect.left - newRect.left;
        const deltaY = oldRect.top - newRect.top;

        console.log(`  🔄 ${key} - deltaX: ${deltaX}, deltaY: ${deltaY}`);

        if (deltaX === 0 && deltaY === 0) {
          console.log(`  ⏭️ Skipping ${key}: no movement`);
          return;
        }

        console.log(`  ✨ Animating ${key} from (${deltaX}, ${deltaY}) to (0, 0)`);
        animationCount++;

        el.animate(
          [
            { transform: `translate(${deltaX}px, ${deltaY}px)` },
            { transform: 'translate(0, 0)' }
          ],
          {
            duration: 500,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }
        );
      });

      console.log(`  🎉 Started ${animationCount} animations`);

      // Clear the captured positions
      capturedPositions.current = null;
      console.log('  🧹 Cleared captured positions');
    }, 0);
  }, [filteredPlayers]);

  // Calculate ranks
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

  function setRowRef(key: string, el: HTMLDivElement | null) {
    if (el) rowRefs.current.set(key, el);
    else rowRefs.current.delete(key);
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1400, margin: '40px auto', padding: '0 24px' }}>
        <h1 style={{
          fontSize: 48, fontWeight: 900, textAlign: 'center', marginBottom: 40,
          background: 'linear-gradient(135deg, #4aa3ff, #b56bff, #ff4444)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          ChosusQT&apos;s Tier List
        </h1>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>
          Loading...
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
        <div style={{ textAlign: 'center', color: '#ff4444', fontSize: 18 }}>
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{
        fontSize: 48, fontWeight: 900, textAlign: 'center', marginBottom: 40,
        background: 'linear-gradient(135deg, #4aa3ff, #b56bff, #ff4444)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        ChosusQT&apos;s Tier List
      </h1>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
        <ModeFilter selectedMode={selectedMode} onModeChange={handleModeChange} />
        <button
          onClick={() => setShowInfo(true)}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            backdropFilter: 'blur(6px)'
          }}
        >
          ℹ️ Info
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredPlayers.map((player, index) => {
          const key = player.uuid || `${player.username}`;

          return (
            <div
              key={key}
              ref={(el) => setRowRef(key, el)}
            >
              <PlayerRow player={player} rank={ranks[index]} selectedMode={selectedMode} />
            </div>
          );
        })}
      </div>

      {showInfo && (
        <div
          onClick={() => setShowInfo(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 420,
              maxWidth: '90%',
              background: 'linear-gradient(180deg, #121212, #0b0b0b)',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              color: '#fff'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>Tier Explanation</h2>
              <button onClick={() => setShowInfo(false)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 20, cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TIER_INFO.map(t => (
                <div key={t.tier} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ width: 46, textAlign: 'center', fontWeight: 800, color: t.color }}>{t.tier}</div>
                  <div style={{ flex: 1, height: 8, borderRadius: 999, background: `linear-gradient(90deg, ${t.color}, transparent)` }} />
                  <div style={{ fontSize: 14, opacity: 0.85 }}>{t.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, fontSize: 13, opacity: 0.6, textAlign: 'center' }}>
              Lower → Higher skill progression
            </div>
          </div>
        </div>
      )}
    </div>
  );
}