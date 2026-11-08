import gsap from 'gsap';
import { h, esc } from '../dom.js';
import * as store from '../store.js';

// The substitutes strip along the bottom of the lineup screen (the "team sheet" part that the
// pitch does not show). It appears once the introductions are finished. Every name is a button:
// click it for the player's details (or to bring them on when a starter is waiting to be
// substituted), or drag it onto a player on the pitch to make the substitution.
export function createSheet({ obstacles = () => [] } = {}) {
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
    fit();
  }

  // Highlight the substitute whose details are open (or who is about to come on).
  function setSelected(id) {
    selected = id;
    el.querySelectorAll('.fsheet__sub').forEach((b) => b.classList.toggle('is-selected', b.dataset.id === id));
  }
  // Size the strip so it never covers a card: try the widest strip first and, for each width,
  // up to three rows of names; take the first that stays clear of every card. Names that do not
  // fit are counted on the "All" button.
  const LEFT = 40, BOTTOM = 1123 - 26, ROW = 34;
  function fit() {
    if (!el.isConnected) return;
    const list = el.querySelector('.fsheet__list');
    const boxes = obstacles();
    const clear = (w, h) => !boxes.some((b) => b.l < LEFT + w && b.r > LEFT && b.t < BOTTOM && b.b > BOTTOM - h);
    let chosen = null;
    for (let w = 660; w >= 300 && !chosen; w -= 20) {
      el.style.width = `${w}px`;
      for (let rows = 3; rows >= 1; rows--) {
        list.style.maxHeight = `${rows * ROW - 4}px`;
        if (clear(el.offsetWidth, el.offsetHeight)) { chosen = { w, rows }; break; }
      }
    }
    el.classList.toggle('is-narrow', !chosen || chosen.w < 560); // too narrow for the hint text
    if (!chosen) { el.style.width = '300px'; list.style.maxHeight = `${ROW - 4}px`; }
    // how many names are cut off
    const subs = [...list.querySelectorAll('.fsheet__sub')];
    const edge = list.getBoundingClientRect().bottom;
    const hidden = subs.filter((b) => b.getBoundingClientRect().bottom > edge + 1).length;
    const all = el.querySelector('[data-action="toggle-bench"]');
    all.textContent = hidden ? `All +${hidden}` : 'All';
    all.title = hidden ? `${hidden} more on the bench` : 'Show the whole bench';
  }

  refresh();

  const enter = () =>
    gsap.timeline()
      .fromTo(el, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out' })
      .fromTo(el.querySelectorAll('.fsheet__sub'), { x: -16, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.35, ease: 'power2.out', stagger: 0.04 }, 0.15);
  const exit = () => gsap.timeline().to(el, { y: 30, autoAlpha: 0, duration: 0.3, ease: 'power2.in' });
  const reset = () => { gsap.killTweensOf(el); gsap.set(el, { autoAlpha: 0 }); refresh(); };

  return { name: 'sheet', el, enter, exit, reset, refresh, setSelected, fit };
}
