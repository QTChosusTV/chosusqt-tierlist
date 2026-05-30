// utils.ts
import { TIER_POINT_MAP, MODES } from '@/types/tierlist';
import type { Player, PlayerWithPoints } from '@/types/tierlist';

export function calculatePoints(player: Player): number {
  let sum = 0;
  let n = 0;

  MODES.forEach(mode => {
    const tier = player[mode.key]?.toUpperCase();
    if (tier && TIER_POINT_MAP[tier]) {
      sum += TIER_POINT_MAP[tier];
      n++;
    }
  });

  if (n === 0) return 0;

  return sum * ((16 - n) / 8) * 8;
}

export function addPointsToPlayers(players: Player[]): PlayerWithPoints[] {
  return players.map(player => ({
    ...player,
    _points: calculatePoints(player),
  }));
}

export function sortPlayersByPoints(players: PlayerWithPoints[]): PlayerWithPoints[] {
  return [...players].sort((a, b) => b._points - a._points);
}