import gsap from 'gsap';
import { h, esc } from '../../dom.js';
import { asset, team } from '../../data.js';
import * as store from '../../store.js';
import { exitView } from './common.js';

function render({ id }) {
  const p = store.player(id);
  const onPitch = store.slotOf(id) >= 0;
  const [first, ...rest] = p.fullName.trim().split(/\s+/);
  const facts = [
    ['Nationality', p.nationality],
    ['Position', p.position],
    ['Age', p.age],
    ['Status', onPitch ? 'Starting XI' : 'Substitute'],
  ].filter(([, v]) => v);

  const el = h('div', 'view detail');
  el.innerHTML = `
    <button class="close" data-action="close" aria-label="Close">×</button>
    <div class="detail__portrait" data-anim>
      ${p.photo ? `<img src="${esc(asset(p.photo))}" alt="">` : '<div class="detail__sil"></div>'}
      <div class="detail__num">${esc(p.number)}</div>
    </div>
    <div class="detail__first" data-anim>${esc(first.toUpperCase())}</div>
    <div class="detail__last" data-anim>${esc(rest.join(' ').toUpperCase())}</div>
    <div class="detail__pos" data-anim>${esc(p.position)} · ${esc(team.name)}</div>
    <dl class="detail__facts" data-anim>
      ${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}
    </dl>
    <div class="detail__actions" data-anim>
      ${onPitch
        ? `<button class="btn" data-action="substitute" data-id="${esc(id)}">Substitute</button>`
        : `<button class="btn" data-action="swap-in" data-id="${esc(id)}">Swap in</button>`}
      <button class="btn btn--ghost" data-action="edit" data-id="${esc(id)}">Edit</button>
      ${onPitch ? '' : `<button class="btn btn--ghost" data-action="delete" data-id="${esc(id)}">Delete</button>`}
    </div>
  `;
  return el;
}

function enter(el) {
  const q = gsap.utils.selector(el);
  return gsap
    .timeline()
    .fromTo(q('.detail__portrait'), { x: 120, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' })
    .fromTo(q('.detail__num'), { scale: 1.5, autoAlpha: 0, transformOrigin: '0 100%' }, { scale: 1, autoAlpha: 1, duration: 0.5, ease: 'back.out(1.6)' }, '-=0.35')
    .fromTo(q('.detail__first, .detail__last, .detail__pos, .detail__facts, .detail__actions'), { x: 60, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out', stagger: 0.06 }, '-=0.45');
}

export default { render, enter, exit: exitView };
