import { defaults } from './data.js';

// Lineup state: every player in the squad, which 11 are on the pitch (slots, GK first,
// then each line left to right) and the formation. Persisted to localStorage.
const KEY = 'lineup-animation:v1';
const clone = (o) => JSON.parse(JSON.stringify(o));

const fresh = () => ({
  players: clone(defaults.players),
  formation: defaults.formation,
  slots: [...defaults.slots],
});

function valid(s) {
  return (
    s && Array.isArray(s.players) && Array.isArray(s.slots) && typeof s.formation === 'string' &&
    s.slots.length === 11 &&
    s.slots.every((id) => s.players.some((p) => p.id === id)) &&
    s.formation.split('-').map(Number).reduce((a, b) => a + b, 0) === 10
  );
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (valid(s)) return s;
  } catch { /* fall through to defaults */ }
  return fresh();
}

let state = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save lineup (storage full?)', e);
  }
}

export const getFormation = () => state.formation;
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
}
