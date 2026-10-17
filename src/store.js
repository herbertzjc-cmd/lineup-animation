import { defaults, team } from './data.js';
import { isHex } from './theme.js';
import { idbGet, idbSet, idbDelete, idbClear } from './idb.js';

// Lineup state: every player in the squad, which 11 are on the pitch (slots, GK first,
// then each line left to right) and the formation. Persisted to localStorage.
const KEY = 'lineup-animation:v1';
const clone = (o) => JSON.parse(JSON.stringify(o));

// Team and manager editing. Names and settings live in `state.brand` (localStorage); the
// pictures are Blobs in IndexedDB, loaded into `images` at startup (see loadImages()).
const defaultBrand = () => ({
  teamName: '',
  managerName: '',
  mgr: { useCut: false, scale: 100, x: 0, y: 0, hasAlpha: false },
});

const fresh = () => ({
  players: clone(defaults.players),
  formation: defaults.formation,
  slots: [...defaults.slots],
  color: team.colors.primary,
  brand: defaultBrand(),
});

function valid(s) {
  return (
    s && Array.isArray(s.players) && Array.isArray(s.slots) && typeof s.formation === 'string' &&
    s.slots.length === 11 && (s.color === undefined || isHex(s.color)) &&
    s.slots.every((id) => s.players.some((p) => p.id === id)) &&
    s.formation.split('-').map(Number).reduce((a, b) => a + b, 0) === 10
  );
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (valid(s)) {
      // Saved lineups from older versions: give the known players their cartoon image back.
      for (const p of s.players) {
        const d = defaults.players.find((x) => x.id === p.id);
        if (d?.cartoon && !p.cartoon) p.cartoon = d.cartoon;
        if (p.cartoon === 'players/becker.svg' && !d?.cartoon) delete p.cartoon; // the old goalkeeper image
      }
      const b = defaultBrand();
      s.brand = { ...b, ...(s.brand || {}), mgr: { ...b.mgr, ...(s.brand?.mgr || {}) } };
      return s;
    }
  } catch { /* fall through to defaults */ }
  return fresh();
}

let state = load();

let storageFailed = false;
// True if the last attempt to save to the browser's storage failed (usually: it is full).
export const storageIsFull = () => storageFailed;

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageFailed = false;
  } catch (e) {
    storageFailed = true;
    console.warn('Could not save lineup (storage full?)', e);
  }
}

const images = { logo: null, mgrOriginal: null, mgrCut: null }; // { blob, url } or null
const IMAGE_KEYS = Object.keys(images);

function setImage(key, blob) {
  if (images[key]) URL.revokeObjectURL(images[key].url);
  images[key] = blob ? { blob, url: URL.createObjectURL(blob) } : null;
}

// Load the saved pictures from IndexedDB. Call (and await) once before building the UI.
export async function loadImages() {
  for (const key of IMAGE_KEYS) {
    try {
      const blob = await idbGet(key);
      if (blob instanceof Blob) setImage(key, blob);
    } catch (e) {
      console.warn('Could not read saved images', e);
      return;
    }
  }
}

export const getTeamName = () => state.brand.teamName.trim() || team.name;
export const getImageBlob = (key) => images[key]?.blob || null;
export const getLogoUrl = () => images.logo?.url || '';

// The manager as shown on the pitch screen: the cut-out if chosen, otherwise the original.
export function getManager() {
  const m = state.brand.mgr;
  const cut = images.mgrCut;
  const original = images.mgrOriginal;
  const showCut = !!(m.useCut && cut);
  const photo = showCut ? cut : original;
  const name = state.brand.managerName.trim();
  return {
    name: name || team.coach.name,
    isDefaultName: !name,
    photoUrl: photo?.url || '',
    hasPhoto: !!photo,
    cutout: !!photo && (showCut || m.hasAlpha), // a figure on a transparent background
    useCut: showCut,
    hasAlpha: m.hasAlpha,
    scale: m.scale, x: m.x, y: m.y,
  };
}

// Apply edited team / manager details. For each picture, `undefined` means unchanged,
// `null` means delete and a Blob means replace.
export async function saveBrand(b) {
  state.brand.teamName = b.teamName.trim();
  state.brand.managerName = b.managerName.trim();
  state.brand.mgr = { ...state.brand.mgr, ...b.mgr };
  for (const key of IMAGE_KEYS) {
    if (b[key] === undefined) continue;
    setImage(key, b[key]);
    try {
      if (b[key]) await idbSet(key, b[key]);
      else await idbDelete(key);
    } catch (e) {
      console.warn('Could not save image', key, e);
    }
  }
  if (!images.mgrOriginal) state.brand.mgr = { ...defaultBrand().mgr };
  save();
}

export const getFormation = () => state.formation;
export const getColor = () => state.color || team.colors.primary;
export function setColor(hex) { state.color = hex; save(); }
export const player = (id) => state.players.find((p) => p.id === id);
export const slots = () => state.slots;
export const slotOf = (id) => state.slots.indexOf(id);
export const bench = () => state.players.filter((p) => !state.slots.includes(p.id));
// [1, 4, 2, 3, 1] for "4-2-3-1": the GK row, then each line.
export const formationCounts = (f = state.formation) => [1, ...f.split('-').map(Number)];

export function setFormation(f) { state.formation = f; save(); }

export function swapSlots(i, j) {
  [state.slots[i], state.slots[j]] = [state.slots[j], state.slots[i]];
  save();
}

// Put a bench player into slot i; returns the id that was taken off the pitch.
export function replaceSlot(i, inId) {
  const out = state.slots[i];
  state.slots[i] = inId;
  save();
  return out;
}

export function upsertPlayer(data) {
  let p = data.id && player(data.id);
  if (p) Object.assign(p, data);
  else {
    p = { ...data, id: `custom-${Date.now().toString(36)}` };
    state.players.push(p);
  }
  save();
  return p;
}

export function removePlayer(id) {
  if (slotOf(id) >= 0) return false;
  state.players = state.players.filter((p) => p.id !== id);
  save();
  return true;
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  state = fresh();
  IMAGE_KEYS.forEach((k) => setImage(k, null));
  idbClear().catch(() => {});
}
