import gsap from 'gsap';
import { h, esc } from '../dom.js';
import { asset, flagOf, popOf, canPop } from '../data.js';
import { goldParticles } from './fx.js';

// Stand-in portrait for players without a photo; the shirt follows the team colour.
const PLACEHOLDER = `
  <svg viewBox="0 0 128 200" aria-hidden="true">
    <path d="M2 200C2 140 20 120 50 112H78C108 120 126 140 126 200Z" style="fill:var(--on-primary)"/>
    <path d="M50 112L64 130L78 112" fill="none" style="stroke:var(--primary-ink)" stroke-width="5" stroke-linejoin="round"/>
    <g transform="translate(0,-20)">
      <rect x="52" y="84" width="24" height="32" fill="#cf9272"/>
      <ellipse cx="64" cy="74" rx="25" ry="31" fill="#e0a98a"/>
      <path d="M39 70C37 44 52 28 66 28C86 28 93 46 89 70C86 58 78 52 64 52C52 52 43 58 39 70Z" fill="#3a2a20"/>
      <ellipse cx="54" cy="72" rx="3" ry="2.2" fill="#2a1a12"/>
      <ellipse cx="74" cy="72" rx="3" ry="2.2" fill="#2a1a12"/>
      <path d="M56 90Q64 96 72 90" fill="none" stroke="#9a5a45" stroke-width="2.4" stroke-linecap="round"/>
    </g>
  </svg>`;

const TILE_W = 128;
const TILE_H = 191;

// The figure's resting pose (inside the card, from the player's settings) and its popped pose
// (enlarged, brought forward, tilted slightly towards the viewer, with a cast shadow).
function popStates(p) {
  const o = popOf(p);
  const d = o.depth / 100;
  const rest = { x: (o.x / 100) * TILE_W, y: (o.y / 100) * TILE_H, scale: o.scale / 100, z: 0, rotationX: 0 };
  const pop = { x: rest.x, y: rest.y - (3 + 9 * d), scale: rest.scale * (1.06 + 0.24 * d), z: 20 + 50 * d, rotationX: -(2 + 4 * d) };
  const shadow = (a, y, b) => `drop-shadow(0px ${y}px ${b}px rgba(0,0,0,${a}))`;
  return { rest, pop, shadowRest: shadow(0, 0, 0), shadowPop: shadow(0.28 + 0.3 * d, 8 + 8 * d, 10 + 8 * d) };
}

// How far (card px, per side) the popped figure reaches past the card's sides. Used to space
// out the cards of a group so a figure never covers its neighbour.
export function popOvershoot(p) {
  if (!canPop(p)) return 0;
  const { pop } = popStates(p);
  return Math.max(0, 0.5 * TILE_W * (pop.scale - 1) + Math.abs(pop.x)) * 1.05;
}

// A player card. The front is built in layers, bottom to top:
//   card background (+ gold holo / sheen / beam for special players)
//   the player figure (own layer so it can stand out of the card; only clipped at the bottom)
//   bottom fade, then number / position / name (always above the figure), flag, gold frame.
// The back carries the crest. During the intro a tile starts unrevealed (back up, front
// contents hidden); flipTimeline() or specialTimeline() turns it over, and popOutTimeline()
// then lets the figure step out of the card. Tiles created later start already revealed.
export function createTile(p, { revealed = true } = {}) {
  const flag = flagOf(p);
  const special = !!p.special;
  const pop = canPop(p);
  const cls = ['tile', revealed && 'tile--revealed', special && 'tile--special', pop ? 'tile--pop' : 'tile--nopop'];
  const el = h('div', cls.filter(Boolean).join(' '));
  el.dataset.id = p.id;
  el.dataset.drag = 'tile';
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', `${p.fullName}, number ${p.number}${special ? ', special player' : ''}`);
  const portrait = p.photo
    ? `<img src="${esc(asset(p.photo))}" alt="" draggable="false">`
    : PLACEHOLDER;
  el.innerHTML = `
    ${special ? '<div class="tile__halo"></div>' : ''}
    <div class="tile__inner">
      <div class="tile__flipper">
        <div class="tile__front">
          <div class="tile__bg"></div>
          ${special ? '<div class="tile__holo"></div>' : ''}
          ${special ? '<div class="tile__fx"><i class="tile__sheen"></i><i class="tile__beam"></i><i class="tile__flash"></i></div>' : ''}
          <div class="tile__stage"><div class="tile__person"><div class="tile__photo${p.photoAlpha === false ? ' tile__photo--cover' : ''}">${portrait}</div></div></div>
          <div class="tile__fade"></div>
          <div class="tile__num tile__txt">${esc(p.number)}</div>
          <div class="tile__pos tile__txt">${esc(p.position)}</div>
          <div class="tile__name tile__txt">${esc(p.name)}</div>
          ${flag ? `<img class="tile__flag" src="${esc(asset(flag))}" alt="" draggable="false">` : ''}
          ${special ? '<div class="tile__edge"></div>' : ''}
        </div>
        <div class="tile__back">
          ${special ? '<div class="tile__fx"><i class="tile__sheen"></i></div><div class="tile__edge"></div>' : ''}
        </div>
      </div>
    </div>
  `;
  const states = popStates(p);
  el._pop = pop ? states : null;
  gsap.set(el.querySelector('.tile__person'), { ...states.rest, transformOrigin: '50% 100%', transformPerspective: 700, filter: states.shadowRest });
  return el;
}

// The figure steps out of the card: forward, larger, head and shoulders past the edges.
// Does nothing for players with the effect off or a photo without transparency.
export function popOutTimeline(tile) {
  const tl = gsap.timeline();
  const st = tile._pop;
  if (!st) return tl;
  const person = tile.querySelector('.tile__person');
  tl.to(person, { ...st.pop, duration: 0.5, ease: 'back.out(1.35)' }, 0)
    .to(person, { filter: st.shadowPop, duration: 0.5, ease: 'power2.out' }, 0);
  return tl;
}

// ...and back into the card.
export function popBackTimeline(tile, duration = 0.6) {
  const tl = gsap.timeline();
  const st = tile._pop;
  if (!st) return tl;
  const person = tile.querySelector('.tile__person');
  tl.to(person, { ...st.rest, filter: st.shadowRest, duration, ease: 'power3.inOut' }, 0);
  return tl;
}

// Jump straight to the popped pose (editor preview).
export function showPopNow(tile) {
  if (tile._pop) gsap.set(tile.querySelector('.tile__person'), { ...tile._pop.pop, filter: tile._pop.shadowPop });
}

// Standard 3D flip: back -> front around the vertical axis, the portrait fades in while it
// turns, and the number, position and name appear once it has landed. Only the card's contents
// (and the figure's pop-out) are animated here; moving and scaling the card is up to the caller
// (see pitch.js).
export function flipTimeline(tile) {
  const q = gsap.utils.selector(tile);
  const tl = gsap.timeline();
  tl.to(q('.tile__flipper'), { rotationY: 0, duration: 0.8, ease: 'power2.inOut' }, 0)
    .fromTo(q('.tile__photo, .tile__fade'), { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.36)
    .fromTo(q('.tile__txt'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.06 }, 0.8)
    .add(popOutTimeline(tile), 0.8); // only once the card has finished turning
  if (q('.tile__flag').length) {
    tl.fromTo(q('.tile__flag'), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(2.2)' }, 0.85);
  }
  return tl;
}

// Time a special card spends preparing (glow, sparks) before its flip starts. A group begins
// every special card's timeline at its own start and the normal flips this long after it.
export const SPECIAL_PREP = 0.9;

// Gold flash-card entrance for special players, in phases:
//   1 prepare  - gold glow and edge fade in, a few sparks drift (runs while the card rises)
//   2 flip     - slower 3D flip with a gold sheen sweeping across the surface
//   3 reveal   - a diagonal gold beam crosses the card (top-left to bottom-right), the edge
//                flares, a soft halo pulses and sparks fly out; portrait and text appear
//   4 hologram - a slow holographic shimmer fades in on the card face
//   5 settle   - glow fades; a thin animated gold frame stays
// `center` ({ x, y, k }) is where the card is on the pitch while it plays and how much it is
// enlarged, so the sparks surround it.
export function specialTimeline(tile, fxLayer, center) {
  const q = gsap.utils.selector(tile);
  const edges = q('.tile__edge');
  const halo = q('.tile__halo');
  const holo = q('.tile__holo');
  const PREP = SPECIAL_PREP;
  const FLIP = 1.25;
  const REVEAL = PREP + FLIP;

  const tl = gsap.timeline();
  // 1 prepare
  tl.fromTo(halo, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 0.8, scale: 1, duration: PREP, ease: 'power2.out' }, 0)
    .fromTo(edges, { autoAlpha: 0 }, { autoAlpha: 1, duration: PREP, ease: 'sine.inOut' }, 0)
    .add(goldParticles(fxLayer, center.x, center.y, 'ambient', center.k), 0.05)
    // 2 flip
    .to(q('.tile__flipper'), { rotationY: 0, duration: FLIP, ease: 'power2.inOut' }, PREP)
    .fromTo(q('.tile__sheen'), { backgroundPosition: '100% 0%' }, { backgroundPosition: '0% 0%', duration: FLIP, ease: 'sine.inOut' }, PREP)
    .fromTo(q('.tile__photo, .tile__fade'), { autoAlpha: 0, y: 26, scale: 1.08 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: 'power2.out' }, PREP + 0.55)
    // 3 reveal
    .fromTo(q('.tile__beam'), { backgroundPosition: '100% 100%' }, { backgroundPosition: '0% 0%', duration: 0.85, ease: 'power2.inOut' }, REVEAL)
    .fromTo(q('.tile__flash'), { autoAlpha: 0 }, { autoAlpha: 0.5, duration: 0.15, ease: 'power2.out' }, REVEAL)
    .to(q('.tile__flash'), { autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, REVEAL + 0.15)
    .to(halo, { autoAlpha: 1, scale: 1.2, duration: 0.18, ease: 'power2.out' }, REVEAL)
    .to(halo, { autoAlpha: 0.55, scale: 1.05, duration: 0.5, ease: 'power2.in' }, REVEAL + 0.18)
    .to(edges, { filter: 'brightness(1.9)', duration: 0.15 }, REVEAL)
    .to(edges, { filter: 'brightness(1)', duration: 0.7 }, REVEAL + 0.15)
    .add(goldParticles(fxLayer, center.x, center.y, 'burst', center.k), REVEAL)
    .fromTo(q('.tile__txt'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.07 }, REVEAL + 0.1)
    .add(popOutTimeline(tile), REVEAL + 0.35); // the figure steps out as the beam passes
  if (q('.tile__flag').length) {
    tl.fromTo(q('.tile__flag'), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(2.2)' }, REVEAL + 0.2);
  }
  // 4 hologram, 5 settle
  tl.fromTo(holo, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9 }, REVEAL + 0.2)
    .to(holo, { autoAlpha: 0.5, duration: 0.8 }, REVEAL + 1.1)
    .to(halo, { autoAlpha: 0, duration: 1.0 }, REVEAL + 0.6)
    .to(edges, { autoAlpha: 0.6, duration: 0.8 }, REVEAL + 0.6);
  return tl;
}
