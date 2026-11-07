import gsap from 'gsap';
import { h, esc } from '../dom.js';
import * as store from '../store.js';

// The substitutes strip along the bottom of the lineup screen (the "team sheet" part that the
// pitch does not show). It appears once the introductions are finished.
export function createSheet() {
  const el = h('div', 'fsheet');
  gsap.set(el, { autoAlpha: 0 });

  function refresh() {
    const subs = store.bench();
    el.innerHTML = `
      <div class="fsheet__label">SUBSTITUTES</div>
      <div class="fsheet__list">${subs.map((p) => `<span class="fsheet__sub"><b>${esc(p.number)}</b>${esc(p.name)}</span>`).join('')}</div>`;
    el.hidden = !subs.length;
  }
  refresh();

  const enter = () =>
    gsap.timeline()
      .fromTo(el, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out' })
      .fromTo(el.querySelectorAll('.fsheet__sub'), { x: -16, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.35, ease: 'power2.out', stagger: 0.04 }, 0.15);
  const exit = () => gsap.timeline().to(el, { y: 30, autoAlpha: 0, duration: 0.3, ease: 'power2.in' });
  const reset = () => { gsap.killTweensOf(el); gsap.set(el, { autoAlpha: 0 }); refresh(); };

  return { name: 'sheet', el, enter, exit, reset, refresh };
}
