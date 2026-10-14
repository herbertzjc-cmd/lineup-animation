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

// Flag images by nationality (files live in /public/flags). A player's own `flag` field wins.
const NATION_FLAGS = {
  Brazil: 'flags/br.svg', Hungary: 'flags/hu.svg', France: 'flags/fr.svg', Netherlands: 'flags/nl.svg',
  Argentina: 'flags/ar.svg', Egypt: 'flags/eg.svg', Germany: 'flags/de.svg',
};
export const flagOf = (p) => p.flag || NATION_FLAGS[p.nationality] || '';

// 3D pop-out settings of a player (all optional in players.json): `on`, `scale` (% of the
// normal size), `x` / `y` (% of the card, offset of the figure) and `depth` (0-100, how far
// the figure stands out). A photo with no transparent background (`photoAlpha === false`)
// cannot pop out.
export const DEFAULT_POP = { on: true, scale: 100, x: 0, y: 0, depth: 60 };
export const popOf = (p) => ({ ...DEFAULT_POP, ...(p.pop || {}) });

// Which picture a player's card shows. `avatar` is "cartoon" (the default) or "photo". A player
// set to "photo" without a photo file shows the cartoon. `cartoon` is an optional image used
// as the cartoon figure (the goalkeeper's); without it the built-in drawing is used.
export const avatarOf = (p) => (p.avatar === 'photo' && p.photo ? 'photo' : 'cartoon');
export const portraitSrc = (p) => (avatarOf(p) === 'photo' ? p.photo : p.cartoon || '');

// A cartoon always has a transparent background; a photo only if it was detected as a cut-out.
export const canPop = (p) => popOf(p).on && (avatarOf(p) === 'photo' ? p.photoAlpha !== false : true);

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
