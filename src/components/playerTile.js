import gsap from 'gsap';
import { h, esc } from '../dom.js';
import { asset } from '../data.js';

// The red number card. If the player has a photo, revealPhoto() swaps the number
// for the photo, name and flag. Tiles created later start already revealed.
export function createTile(p, { revealed = true } = {}) {
  const el = h('div', `tile${revealed && p.photo ? ' tile--revealed' : ''}`);
  el.dataset.id = p.id;
  el.dataset.drag = 'tile';
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', `${p.fullName}, number ${p.number}`);
  el.innerHTML = `
    <div class="tile__inner">
      <div class="tile__bg"></div>
      <div class="tile__num">${esc(p.number)}</div>
      ${p.photo ? `<img class="tile__photo" src="${esc(asset(p.photo))}" alt="" draggable="false">` : ''}
      ${p.photo ? '<div class="tile__fade"></div>' : ''}
      <div class="tile__name">${esc(p.name)}</div>
      ${p.flag ? `<img class="tile__flag" src="${esc(asset(p.flag))}" alt="" draggable="false">` : ''}
    </div>
  `;
  return el;
}

export function revealPhoto(tile) {
  const q = gsap.utils.selector(tile);
  return gsap
    .timeline()
    .to(q('.tile__num'), { y: 28, autoAlpha: 0, duration: 0.3, ease: 'power2.in' })
    .fromTo(q('.tile__photo, .tile__fade'), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.1')
    .fromTo(q('.tile__flag'), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(2.2)' }, '-=0.3');
}
