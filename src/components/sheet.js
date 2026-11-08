import gsap from 'gsap';
import { h, esc } from '../dom.js';
import * as store from '../store.js';

// The substitutes strip along the bottom of the lineup screen (the "team sheet" part that the
// pitch does not show). It appears once the introductions are finished. Every name is a button:
// click it for the player's details (or to bring them on when a starter is waiting to be
// substituted), or drag it onto a player on the pitch to make the substitution.
export function createSheet() {
  const el = h('div', 'fsheet');
  gsap.set(el, { autoAlpha: 0 });
  let selected = null;

  function refresh() {
    const subs = store.bench();
    el.innerHTML = `
      <div class="fsheet__head">
        <span class="fsheet__label">SUBSTITUTES</span>
        <span class="fsheet__tip">Click for details · drag onto a player to bring on</span>
        <button class="fsheet__btn" type="button" data-action="new" title="Add a player">+ Add</button>
        <button class="fsheet__btn" type="button" data-action="toggle-bench" title="Show the whole bench">All</button>
      </div>
      <div class="fsheet__list">
        ${subs.map((p) => `<button class="fsheet__sub" type="button" data-action="pick" data-id="${esc(p.id)}" data-drag="bench"
            title="#${esc(p.number)} ${esc(p.fullName)}">${p.special ? '<i>★</i>' : ''}<b>${esc(p.number)}</b>${esc(p.name)}</button>`).join('')}
      </div>`;
    setSelected(selected);
  }

  // Highlight the substitute whose details are open (or who is about to come on).
  function setSelected(id) {
    selected = id;
    el.querySelectorAll('.fsheet__sub').forEach((b) => b.classList.toggle('is-selected', b.dataset.id === id));
  }
  refresh();

  const enter = () =>
    gsap.timeline()
      .fromTo(el, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out' })
      .fromTo(el.querySelectorAll('.fsheet__sub'), { x: -16, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.35, ease: 'power2.out', stagger: 0.04 }, 0.15);
  const exit = () => gsap.timeline().to(el, { y: 30, autoAlpha: 0, duration: 0.3, ease: 'power2.in' });
  const reset = () => { gsap.killTweensOf(el); gsap.set(el, { autoAlpha: 0 }); refresh(); };

  return { name: 'sheet', el, enter, exit, reset, refresh, setSelected };
}
