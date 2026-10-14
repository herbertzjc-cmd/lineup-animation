import raw from './data/players.json';

export const match = raw.match;
export const team = raw.team;
export const defaults = {
  players: raw.players,
  formation: raw.lineup.formation,
  slots: raw.lineup.slots,
};

// Resolve a path from players.json against Vite's base URL (files live in /public).
// Photos uploaded in the editor are data: URLs and pass through untouched.
export const asset = (path) =>
  /^(data:|https?:|blob:)/.test(path) ? path : `${import.meta.env.BASE_URL}${path}`;

export const POSITIONS = ['GK', 'RB', 'CB', 'LB', 'DM', 'CM', 'AM', 'RW', 'LW', 'ST'];
export const THEMES = [
  { name: 'Crimson', color: '#c8102e' },
  { name: 'Royal Blue', color: '#0b4ea2' },
  { name: 'Sky Blue', color: '#6cabdd' },
  { name: 'Navy', color: '#13294b' },
  { name: 'Gold', color: '#f2b705' },
  { name: 'Orange', color: '#f26a1b' },
  { name: 'Emerald', color: '#0a8a4b' },
  { name: 'Violet', color: '#6a2c91' },
  { name: 'Claret', color: '#7b1e3b' },
  { name: 'Black', color: '#1c1c20' },
];
export const FORMATIONS = ['4-2-3-1', '4-3-3', '4-4-2', '3-5-2', '4-1-4-1', '3-4-3', '5-3-2'];
