import type { TierType, ModeKey } from '@/types/tierlist';

export const MODE_COLORS: Record<ModeKey, string> = {
  axe: '#4aa3ff',
  sword: '#4aa3ff',
  smp: '#8b5a2b',
  mace: '#ffffff',
  uhc: '#ff9933',
  nethop: '#c49a6c',
  vanilla: '#b56bff',
  diapot: '#ff4444',
};

export const TIER_COLORS: Record<string, string> = {
  LT6: '#444444',
  HT6: '#777777',
  LT5: '#aaaaaa',
  HT5: '#00ff00',
  LT4: '#00ffff',
  HT4: '#5588ff',
  LT3: '#ff00ff',
  HT3: '#ffcc55',
  LT2: '#ff7575',
  HT2: '#ff0000',
  LT1: '#8b0000',
  HT1: '#ffffff',
  U: '#333333',
};

export function getTierColor(tier: TierType | string): string {
  return TIER_COLORS[tier] || '#333333';
}

export function getModeColor(mode: ModeKey): string {
  return MODE_COLORS[mode] || '#ffffff';
}
