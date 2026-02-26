// tierlist.ts
export type TierType = 'LT6' | 'HT6' | 'LT5' | 'HT5' | 'LT4' | 'HT4' | 'LT3' | 'HT3' | 'LT2' | 'HT2' | 'LT1' | 'HT1' | 'U';

export type ModeKey = 'axe' | 'smp' | 'sword' | 'mace' | 'uhc' | 'nethop' | 'vanilla' | 'diapot';

export interface Mode {
  key: ModeKey;
  icon: string;
}

export type FilterMode = ModeKey | 'overall';

export interface Player {
  uuid: string;
  username: string;
  axe?: string;
  smp?: string;
  sword?: string;
  mace?: string;
  uhc?: string;
  nethop?: string;
  vanilla?: string;
  diapot?: string;
  _points?: number;
}

export interface PlayerWithPoints extends Player {
  _points: number;
}

export const TIER_POINT_MAP: Record<string, number> = {
  LT6: 1,
  HT6: 2,
  LT5: 3,
  HT5: 5,
  LT4: 10,
  HT4: 20,
  LT3: 50,
  HT3: 100,
  LT2: 250,
  HT2: 1000,
  LT1: 2500,
  HT1: 10000
};

export const MODES: Mode[] = [
  { key: "axe", icon: "/axe.svg" },
  { key: "smp", icon: "/smp.svg" },
  { key: "sword", icon: "/sword.svg" },
  { key: "mace", icon: "/mace.svg" },
  { key: "uhc", icon: "/uhc.svg" },
  { key: "nethop", icon: "/nethop.svg" },
  { key: "vanilla", icon: "/vanilla.svg" },
  { key: "diapot", icon: "/pot.svg" }
];
