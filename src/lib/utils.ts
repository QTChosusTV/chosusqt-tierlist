import { TIER_POINT_MAP, MODES } from '@/types/tierlist';
import type { Player, PlayerWithPoints } from '@/types/tierlist';

export function calculatePoints(player: Player): number {
  let sum = 0;
  MODES.forEach(mode => {
    const tier = player[mode.key]?.toUpperCase();
    if (tier && TIER_POINT_MAP[tier]) {
      sum += TIER_POINT_MAP[tier];
    }
  });
  return sum;
}

export function addPointsToPlayers(players: Player[]): PlayerWithPoints[] {
  return players.map(player => ({
    ...player,
    _points: calculatePoints(player)
  }));
}

export function sortPlayersByPoints(players: PlayerWithPoints[]): PlayerWithPoints[] {
  return [...players].sort((a, b) => b._points - a._points);
}
