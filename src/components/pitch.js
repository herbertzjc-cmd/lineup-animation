import gsap from 'gsap';
import { h } from '../dom.js';
import * as store from '../store.js';
import { createTile, revealPhoto } from './playerTile.js';

// Every number below is in pixels of the 2000x1123 reference frame; the whole
// scene is scaled to the 1920x1080 stage by CSS (see .fref in styles.css).
const CENTER_X = 819;
const TILE_W = 128;
const GAP = 289;
const ROW_TOPS_5 = [47, 260, 480, 698, 903];

function rowTops(n) {
  if (n === 5) return ROW_TOPS_5;
  const first = 260, last = 903;
  return [47, ...Array.from({ length: n - 1 }, (_, i) => first + ((last - first) * i) / (n - 2 || 1))];
}

// Slot index -> { left, top } for a formation. Slots run GK first, then each line left to right.
function positions(formation) {
  const counts = store.formationCounts(formation);
  const tops = rowTops(counts.length);
  const out = [];
  counts.forEach((n, r) => {
    const gap = Math.min(GAP, 1160 / Math.max(n - 1, 1));
    for (let i = 0; i < n; i++) out.push({ left: CENTER_X + (i - (n - 1) / 2) * gap - TILE_W / 2, top: tops[r] });
  });
  return out;
}

const PITCH_SVG = `
  <svg class="fref__pitch" viewBox="0 0 2000 1123" width="2000" height="1123">
    <defs>
      <linearGradient id="pitchFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff"/>
        <stop offset="0.6" stop-color="#fff"/>
        <stop offset="1" stop-color="#f1f1f3"/>
      </linearGradient>
    </defs>
    <path class="pitch__fill" fill="url(#pitchFill)"
      d="M-66 1123L237 192Q245 163 270 163L1373 163Q1398 163 1406 192L1709 1123Z"/>
    <g class="pitch__lines" fill="none" stroke="#8d8e93" stroke-width="2">
      <path pathLength="1" d="M509 163L491 258Q490 268 502 268L1140 268Q1151 268 1150 258L1135 163"/>
      <path pathLength="1" d="M630 268A190 54 0 0 0 1010 268"/>
      <path pathLength="1" stroke="#66676c" d="M78 688L1568 688"/>
      <ellipse pathLength="1" cx="818" cy="688" rx="195" ry="112"/>
    </g>
    <path class="pitch__goal" pathLength="1" stroke="#1d1d21" stroke-width="5" d="M745 163L893 163"/>
  </svg>`;

export function createPitch() {
  const el = h('div', 'fref__world');
  el.innerHTML = PITCH_SVG;
  const svg = el.querySelector('.fref__pitch');
  const q = gsap.utils.selector(el);

  // id -> tile element, for everyone currently on the pitch.
  const tiles = new Map();
  const place = (tile, pos) => {
    tile.style.left = `${pos.left}px`;
    tile.style.top = `${pos.top}px`;
  };

  const pos0 = positions(store.getFormation());
  store.slots().forEach((id, i) => {
    const tile = createTile(store.player(id), { revealed: false });
    place(tile, pos0[i]);
    el.append(tile);
    tiles.set(id, tile);
  });
  const introTiles = store.slots().map((id) => tiles.get(id));
  const photoTiles = store.slots().filter((id) => store.player(id).photo).map((id) => tiles.get(id));

  function enter() {
    const tl = gsap.timeline();
    tl.fromTo(svg, { y: 140, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'power3.out' }, 0)
      .fromTo(q('.pitch__lines > *, .pitch__goal'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut', stagger: 0.1 }, 0.5)
      .fromTo(introTiles, { y: -70, scale: 0.85, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.55, ease: 'power3.out', stagger: 0.11 }, 0.9);
    const settled = tl.duration();
    photoTiles.forEach((t, i) => tl.add(revealPhoto(t), settled + 0.1 + i * 0.45));
    return tl;
  }

  function exit() {
    return gsap
      .timeline()
      .to([...tiles.values()].reverse(), { y: 70, scale: 0.85, autoAlpha: 0, duration: 0.35, ease: 'power2.in', stagger: 0.05 })
      .to(svg, { y: 140, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, '-=0.4');
  }

  // Slide every tile to where the current formation / slot order puts it.
  function layout() {
    const pos = positions(store.getFormation());
    store.slots().forEach((id, i) => {
      gsap.to(tiles.get(id), { left: pos[i].left, top: pos[i].top, duration: 0.8, ease: 'power3.inOut', delay: i * 0.025, overwrite: 'auto' });
    });
  }

  // Flip the player in `outId` out and `inId` in at the same slot (store already updated).
  function replace(slot, outId, inId) {
    const old = tiles.get(outId);
    const tile = createTile(store.player(inId));
    place(tile, positions(store.getFormation())[slot]);
    gsap.set(tile, { autoAlpha: 0 });
    el.append(tile);
    tiles.delete(outId);
    tiles.set(inId, tile);
    return gsap
      .timeline()
      .to(old, { rotationY: 90, scale: 0.9, autoAlpha: 0, transformPerspective: 900, duration: 0.28, ease: 'power2.in' })
      .fromTo(tile, { rotationY: -90, scale: 0.9, autoAlpha: 0, transformPerspective: 900 }, { rotationY: 0, scale: 1, autoAlpha: 1, duration: 0.4, ease: 'power3.out' })
      .call(() => old.remove());
  }

  // Rebuild a tile after its player was edited.
  function refresh(id) {
    const old = tiles.get(id);
    if (!old) return;
    const tile = createTile(store.player(id));
    tile.style.left = old.style.left;
    tile.style.top = old.style.top;
    gsap.set(tile, { autoAlpha: 1 });
    old.replaceWith(tile);
    tiles.set(id, tile);
    gsap.fromTo(tile, { scale: 0.9 }, { scale: 1, duration: 0.4, ease: 'back.out(2)' });
  }

  function setSelected(id) {
    const sel = id && tiles.has(id) ? id : null;
    tiles.forEach((t, tid) => {
      t.classList.toggle('is-selected', tid === sel);
      gsap.to(t, { scale: tid === sel ? 1.08 : 1, opacity: sel && tid !== sel ? 0.4 : 1, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
    });
  }

  // Make room for the open side panel.
  function setShifted(on) {
    gsap.to(el, { x: on ? -110 : 0, scale: on ? 0.9 : 1, duration: 0.7, ease: 'power3.inOut', overwrite: 'auto' });
  }

  const setPicking = (on) => el.classList.toggle('is-picking', on);
  const setDrop = (id) => tiles.forEach((t, tid) => t.classList.toggle('is-drop', tid === id));

  return { name: 'pitch', el, enter, exit, layout, replace, refresh, setSelected, setShifted, setPicking, setDrop };
}
