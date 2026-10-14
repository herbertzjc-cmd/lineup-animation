import gsap from 'gsap';
import { h, esc } from '../dom.js';
import { asset, flagOf } from '../data.js';
import { goldParticles } from './fx.js';

// Stand-in portrait for players without a photo; the shirt follows the team colour.
const PLACEHOLDER = `
  <svg class="tile__photo tile__photo--ph" viewBox="0 0 128 200" aria-hidden="true">
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

// A player card. The front shows the portrait, number, position and name; the back carries
// the crest. Players flagged `special` also get a gold frame, a holographic sheen and the
// extra layers used by the gold flash-card entrance.
// During the intro a tile starts unrevealed (back up, front contents hidden); flipTimeline()
// or specialTimeline() turns it over and reveals the contents. Tiles created later start
// already revealed.
export function createTile(p, { revealed = true } = {}) {
  const flag = flagOf(p);
  const special = !!p.special;
  const el = h('div', `tile${revealed ? ' tile--revealed' : ''}${special ? ' tile--special' : ''}`);
  el.dataset.id = p.id;
  el.dataset.drag = 'tile';
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', `${p.fullName}, number ${p.number}${special ? ', special player' : ''}`);
  el.innerHTML = `
    ${special ? '<div class="tile__halo"></div>' : ''}
    <div class="tile__inner">
      <div class="tile__flipper">
        <div class="tile__front">
          <div class="tile__bg"></div>
          ${p.photo ? `<img class="tile__photo" src="${esc(asset(p.photo))}" alt="" draggable="false">` : PLACEHOLDER}
          ${special ? '<div class="tile__holo"></div>' : ''}
          <div class="tile__fade"></div>
          ${special ? '<div class="tile__fx"><i class="tile__sheen"></i><i class="tile__beam"></i><i class="tile__flash"></i></div>' : ''}
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
  return el;
}

// Standard 3D flip: back -> front around the vertical axis, the portrait fades in while it
// turns, and the number, position and name appear once it has landed.
// Returns { tl, next }: the animation and how long to wait before the next card starts.
export function flipTimeline(tile) {
  const q = gsap.utils.selector(tile);
  const tl = gsap.timeline();
  tl.to(q('.tile__flipper'), { rotationY: 0, duration: 0.8, ease: 'power2.inOut' }, 0)
    .to(tile, { y: -20, duration: 0.4, ease: 'power2.out', yoyo: true, repeat: 1 }, 0)
    .fromTo(q('.tile__photo, .tile__fade'), { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.36)
    .fromTo(q('.tile__txt'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.06 }, 0.8);
  if (q('.tile__flag').length) {
    tl.fromTo(q('.tile__flag'), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(2.2)' }, 0.85);
  }
  return { tl, next: 0.18 };
}

// Gold flash-card entrance for special players, in five phases:
//   1 prepare  - gold glow and edge fade in, a few sparks drift, the card lifts and grows
//   2 flip     - slower 3D flip with a gold sheen sweeping across the surface
//   3 reveal   - a diagonal gold beam crosses the card (top-left to bottom-right), the edge
//                flares, a soft halo pulses and sparks fly out; portrait and text appear
//   4 hologram - a slow holographic shimmer fades in on the card face
//   5 settle   - glow fades, the card returns to size, a thin animated gold frame stays
export function specialTimeline(tile, fxLayer) {
  const q = gsap.utils.selector(tile);
  const edges = q('.tile__edge');
  const halo = q('.tile__halo');
  const holo = q('.tile__holo');
  const cx = parseFloat(tile.style.left) + 64;
  const cy = parseFloat(tile.style.top) + 95;
  const PREP = 1.0;
  const FLIP = 1.25;
  const REVEAL = PREP + FLIP;

  const tl = gsap.timeline();
  tl.set(tile, { zIndex: 30 }, 0)
    // 1 prepare
    .fromTo(halo, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 0.8, scale: 1, duration: PREP, ease: 'power2.out' }, 0)
    .fromTo(edges, { autoAlpha: 0 }, { autoAlpha: 1, duration: PREP, ease: 'sine.inOut' }, 0)
    .to(tile, { y: -28, scale: 1.18, duration: PREP, ease: 'power2.out' }, 0)
    .add(goldParticles(fxLayer, cx, cy, 'ambient'), 0.05)
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
    .add(goldParticles(fxLayer, cx, cy, 'burst'), REVEAL)
    .fromTo(q('.tile__txt'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.07 }, REVEAL + 0.1);
  if (q('.tile__flag').length) {
    tl.fromTo(q('.tile__flag'), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(2.2)' }, REVEAL + 0.2);
  }
  // 4 hologram, 5 settle
  tl.fromTo(holo, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9 }, REVEAL + 0.2)
    .to(holo, { autoAlpha: 0.5, duration: 0.8 }, REVEAL + 1.1)
    .to(tile, { y: 0, scale: 1, duration: 0.8, ease: 'power2.inOut' }, REVEAL + 0.55)
    .to(halo, { autoAlpha: 0, duration: 1.0 }, REVEAL + 0.6)
    .to(edges, { autoAlpha: 0.6, duration: 0.8 }, REVEAL + 0.6)
    .set(tile, { clearProps: 'zIndex' }, REVEAL + 1.4);
  // The next card starts while this one is settling.
  return { tl, next: REVEAL + 0.55 };
}
