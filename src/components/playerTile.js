import gsap from 'gsap';
import { h, esc } from '../dom.js';
import { asset, flagOf } from '../data.js';

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

// The red number card (front) with a crest on its back, used for the opening flip.
// During the intro a tile starts unrevealed (number showing); revealPhoto() then swaps the
// number for the portrait, name and flag. Tiles created later start already revealed.
export function createTile(p, { revealed = true } = {}) {
  const flag = flagOf(p);
  const el = h('div', `tile${revealed ? ' tile--revealed' : ''}`);
  el.dataset.id = p.id;
  el.dataset.drag = 'tile';
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', `${p.fullName}, number ${p.number}`);
  el.innerHTML = `
    <div class="tile__inner">
      <div class="tile__flipper">
        <div class="tile__front">
          <div class="tile__bg"></div>
          <div class="tile__num">${esc(p.number)}</div>
          ${p.photo ? `<img class="tile__photo" src="${esc(asset(p.photo))}" alt="" draggable="false">` : PLACEHOLDER}
          <div class="tile__fade"></div>
          <div class="tile__name">${esc(p.name)}</div>
          ${flag ? `<img class="tile__flag" src="${esc(asset(flag))}" alt="" draggable="false">` : ''}
        </div>
        <div class="tile__back"></div>
      </div>
    </div>
  `;
  return el;
}

export function revealPhoto(tile) {
  const q = gsap.utils.selector(tile);
  const tl = gsap
    .timeline()
    .to(q('.tile__num'), { y: 28, autoAlpha: 0, duration: 0.3, ease: 'power2.in' })
    .fromTo(q('.tile__photo, .tile__fade'), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.1');
  if (q('.tile__flag').length) {
    tl.fromTo(q('.tile__flag'), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(2.2)' }, '-=0.3');
  }
  return tl;
}
