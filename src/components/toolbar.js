import gsap from 'gsap';
import { h } from '../dom.js';
import { FORMATIONS } from '../data.js';
import * as store from '../store.js';

export const DEFAULT_HINT = 'Click a player for details · Drag substitutes onto the pitch';

export function createToolbar() {
  const el = h('div', 'ftool');
  el.innerHTML = `
    <div class="ftool__row" data-anim>
      ${FORMATIONS.map((f) => `<button class="chip" data-action="formation" data-f="${f}">${f}</button>`).join('')}
    </div>
    <div class="ftool__row" data-anim>
      <button class="chip" data-action="toggle-list" data-view="list">Lineup</button>
      <button class="chip" data-action="toggle-bench" data-view="bench">Bench</button>
      <button class="chip" data-action="new">+ New player</button>
      <button class="chip chip--quiet" data-action="reset">Reset</button>
    </div>
    <div class="ftool__hint" data-anim>${DEFAULT_HINT}</div>
  `;
  const hint = el.querySelector('.ftool__hint');
  gsap.set(el.querySelectorAll('[data-anim]'), { autoAlpha: 0 });

  const setFormation = (f) => el.querySelectorAll('[data-f]').forEach((b) => b.classList.toggle('is-active', b.dataset.f === f));
  const setActive = (view) => el.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
  const setHint = (text) => { hint.textContent = text || DEFAULT_HINT; };
  setFormation(store.getFormation());

  function enter() {
    return gsap.timeline().fromTo(el.querySelectorAll('[data-anim]'), { y: -24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out', stagger: 0.12 });
  }
  function exit() {
    return gsap.timeline().to(el.querySelectorAll('[data-anim]'), { y: -24, autoAlpha: 0, duration: 0.3, ease: 'power2.in', stagger: 0.05 });
  }

  return { name: 'toolbar', el, enter, exit, setFormation, setActive, setHint };
}
