export type WheelMode = 'classic' | 'csgo' | 'pokemon' | 'claw';

export interface WheelEntry {
  id: string;
  label: string;
  excluded: boolean;
}

export interface WheelConfig {
  entries: WheelEntry[];
  mode: WheelMode;
  autoExclude: boolean;
  strength: number;
}

export interface ReelCard {
  id: string;
  label: string;
  rarity: 'mil-spec' | 'restricted' | 'classified' | 'covert' | 'gold';
  isWinner: boolean;
}
