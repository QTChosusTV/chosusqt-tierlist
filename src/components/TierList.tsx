'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addPointsToPlayers, sortPlayersByPoints } from '@/lib/utils';
import PlayerRow from './PlayerRow';
import ModeFilter, { FilterMode } from './ModeFilter';
import type { Player, PlayerWithPoints, TierType } from '@/types/tierlist';

// Tier order for sorting (best to worst)
const TIER_ORDER: Record<string, number> = {
  'HT1': 1, 'LT1': 2,
  'HT2': 3, 'LT2': 4,
  'HT3': 5, 'LT3': 6,
  'HT4': 7, 'LT4': 8,
  'HT5': 9, 'LT5': 10,
  'HT6': 11, 'LT6': 12,
  'U': 13
};

export default function TierList() {
  const [players, setPlayers] = useState<PlayerWithPoints[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerWithPoints[]>([]);
  const [selectedMode, setSelectedMode] = useState<FilterMode>('overall');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlayers() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('tiers')
          .select('*');

        if (error) {
          throw error;
        }

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

  // Filter and sort when mode changes
  useEffect(() => {
    if (selectedMode === 'overall') {
      setFilteredPlayers(players);
    } else {
      // Sort by specific mode tier first, then by total points
      const sorted = [...players].sort((a, b) => {
        const aTier = (a[selectedMode]?.toUpperCase() || 'U') as TierType;
        const bTier = (b[selectedMode]?.toUpperCase() || 'U') as TierType;
        
        const aTierOrder = TIER_ORDER[aTier] || 999;
        const bTierOrder = TIER_ORDER[bTier] || 999;
        
        // First compare by tier in selected mode
        if (aTierOrder !== bTierOrder) {
          return aTierOrder - bTierOrder;
        }
        
        // If same tier, compare by total points
        return b._points - a._points;
      });
      
      setFilteredPlayers(sorted);
    }
  }, [selectedMode, players]);

  // Calculate ranks (handling ties based on current sort)
  const getDisplayRank = (index: number): number => {
    if (index === 0) return 1;
    
    if (selectedMode === 'overall') {
      // For overall, rank by points
      let rank = 1;
      for (let i = 0; i < index; i++) {
        if (filteredPlayers[i]._points !== filteredPlayers[i + 1]?._points) {
          rank = i + 2;
        }
      }
      return rank;
    } else {
      // For mode-specific, rank by tier then points
      let rank = 1;
      for (let i = 0; i < index; i++) {
        const currentTier = filteredPlayers[i][selectedMode]?.toUpperCase() || 'U';
        const nextTier = filteredPlayers[i + 1]?.[selectedMode]?.toUpperCase() || 'U';
        const currentPoints = filteredPlayers[i]._points;
        const nextPoints = filteredPlayers[i + 1]?._points;
        
        if (currentTier !== nextTier || currentPoints !== nextPoints) {
          rank = i + 2;
        }
      }
      return rank;
    }
  };

  if (loading) {
    return (
      <div style={{
        maxWidth: '1400px',
        margin: '40px auto',
        padding: '0 24px'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 900,
          textAlign: 'center',
          marginBottom: '40px',
          background: 'linear-gradient(135deg, #4aa3ff, #b56bff, #ff4444)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '1px'
        }}>
          ChosusQT&apos;s Tier List
        </h1>
        <div style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.6)',
          fontSize: '18px'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        maxWidth: '1400px',
        margin: '40px auto',
        padding: '0 24px'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 900,
          textAlign: 'center',
          marginBottom: '40px',
          background: 'linear-gradient(135deg, #4aa3ff, #b56bff, #ff4444)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '1px'
        }}>
          ChosusQT&apos;s Tier List
        </h1>
        <div style={{
          textAlign: 'center',
          color: '#ff4444',
          fontSize: '18px'
        }}>
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '40px auto',
      padding: '0 24px'
    }}>
      <h1 style={{
        fontSize: '48px',
        fontWeight: 900,
        textAlign: 'center',
        marginBottom: '40px',
        background: 'linear-gradient(135deg, #4aa3ff, #b56bff, #ff4444)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        letterSpacing: '1px'
      }}>
        ChosusQT&apos;s Tier List
      </h1>

      {/* Mode Filter Dropdown */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '32px'
      }}>
        <ModeFilter
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
        />
      </div>

      <div>
        {filteredPlayers.map((player, index) => (
          <PlayerRow
            key={player.uuid}
            player={player}
            rank={getDisplayRank(index)}
          />
        ))}
      </div>
    </div>
  );
}