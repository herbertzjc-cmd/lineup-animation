import gsap from 'gsap';
import { h } from '../dom.js';
import { FORMATIONS, THEMES } from '../data.js';
import * as store from '../store.js';

export const DEFAULT_HINT = ''; // the hint line only shows messages that need attention (picking a substitute, storage full)

// Small line icons (24x24, drawn with currentColor).
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICONS = {
  list: svg('M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01'),
  bench: svg('M7 7h13l-3-3M17 17H4l3 3'),
  add: svg('M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21c0-3.9 3.1-7 7-7 1.3 0 2.6.4 3.6 1M19 14v6M16 17h6'),
  team: svg('M12 3l8 3v6c0 4.4-3.4 8-8 9-4.6-1-8-4.6-8-9V6z'),
  export: svg('M12 4v11M7 10l5 5 5-5M5 20h14'),
  more: svg('M5 12h.01M12 12h.01M19 12h.01'),
};

// The controls: one compact dark bar in the top-left corner. Play and the formation menu come
// first; the other tools are icons with a tooltip. The bar fades out while the mouse rests (like a
// video player) and comes back as soon as the mouse moves.
export function createToolbar() {
  const el = h('div', 'ftool');
  el.innerHTML = `
    <div class="dock" data-anim>
      <button class="dock__btn dock__play" data-action="play" data-tip="Replay the opening animation">▶ Play</button>
      <button class="dock__btn dock__formation" data-ui="formations" data-tip="Formation"><span></span><i>▾</i></button>
      <span class="dock__sep"></span>
      <button class="dock__btn dock__icon" data-action="toggle-list" data-view="list" data-tip="Lineup" aria-label="Lineup">${ICONS.list}</button>
      <button class="dock__btn dock__icon" data-action="toggle-bench" data-view="bench" data-tip="Bench" aria-label="Bench">${ICONS.bench}</button>
      <button class="dock__btn dock__icon" data-action="new" data-tip="Add a player" aria-label="Add a player">${ICONS.add}</button>
      <button class="dock__btn dock__icon" data-action="team" data-tip="Team &amp; match" aria-label="Team and match">${ICONS.team}</button>
      <button class="dock__btn dock__icon" data-action="toggle-theme" data-tip="Colors &amp; pitch" aria-label="Colors and pitch"><i class="chip__dot"></i></button>
      <button class="dock__btn dock__icon" data-action="toggle-export" data-tip="Export PNG" aria-label="Export PNG">${ICONS.export}</button>
      <button class="dock__btn dock__icon" data-ui="more" data-tip="More" aria-label="More">${ICONS.more}</button>
    </div>
    <div class="ftool__hint" data-anim>${DEFAULT_HINT}</div>
    <div class="tpop formation-pop">
      <div class="theme-pop__title">FORMATION</div>
      <div class="formation-pop__grid">
        ${FORMATIONS.map((f) => `<button class="seg" data-action="formation" data-f="${f}">${f}</button>`).join('')}
      </div>
    </div>
    <div class="tpop more-pop">
      <button class="menu-item" data-ui="clean">Hide controls <kbd>H</kbd></button>
      <button class="menu-item menu-item--warn" data-action="reset">Reset lineup &amp; players…</button>
    </div>
    <div class="tpop theme-pop">
      <div class="theme-pop__title">TEAM COLORS</div>
      <div class="theme-pop__swatches">
        ${THEMES.map((t) => `<button class="swatch" data-action="color" data-c="${t.color}" title="${t.name}" style="--c:${t.color}"></button>`).join('')}
        <label class="swatch swatch--custom" title="Custom color"><input type="color" aria-label="Custom color"></label>
      </div>
      <div class="theme-pop__hex"><span>Custom</span><b></b></div>
      <div class="theme-pop__title theme-pop__title--sub">PITCH</div>
      <div class="theme-pop__seg">
        <button class="seg" data-action="pitch-theme" data-v="grass">Grass</button><button class="seg" data-action="pitch-theme" data-v="light">Light</button><button class="seg" data-action="pitch-theme" data-v="dark">Dark</button>
      </div>
    </div>
    <div class="tpop export-pop">
      <div class="theme-pop__title">EXPORT LINEUP AS PNG</div>
      <div class="export-pop__list">
        <button class="seg" data-action="export" data-r="16x9">16:9 · 1920×1080</button>
        <button class="seg" data-action="export" data-r="1x1">1:1 · 1080×1080</button>
        <button class="seg" data-action="export" data-r="9x16">9:16 · 1080×1920</button>
      </div>
      <p class="export-pop__note">A still team sheet for sharing. The animation itself is 16:9.</p>
    </div>
  `;
  const hint = el.querySelector('.ftool__hint');
  gsap.set(el.querySelectorAll('[data-anim]'), { autoAlpha: 0 });

  const setFormation = (f) => {
    el.querySelector('.dock__formation span').textContent = f;
    el.querySelectorAll('[data-f]').forEach((b) => b.classList.toggle('is-active', b.dataset.f === f));
  };
  const setActive = (view) => el.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
  const setHint = (text) => { hint.textContent = text || DEFAULT_HINT; wake(); };
  setFormation(store.getFormation());

  // Popovers: only one is open at a time; each is tied to the button that opens it.
  const pops = {
    theme: { el: el.querySelector('.theme-pop'), btn: el.querySelector('[data-action="toggle-theme"]') },
    export: { el: el.querySelector('.export-pop'), btn: el.querySelector('[data-action="toggle-export"]') },
    formations: { el: el.querySelector('.formation-pop'), btn: el.querySelector('[data-ui="formations"]') },
    more: { el: el.querySelector('.more-pop'), btn: el.querySelector('[data-ui="more"]') },
  };
  let openPop = null;
  Object.values(pops).forEach((p) => gsap.set(p.el, { autoAlpha: 0 }));
  function showPop(name) {
    for (const [key, p] of Object.entries(pops)) {
      const on = key === name;
      if (on) p.el.style.left = `${p.btn.offsetLeft}px`; // open under its own button
      gsap.to(p.el, { autoAlpha: on ? 1 : 0, y: on ? 0 : -10, duration: 0.22, ease: 'power2.out', overwrite: 'auto' });
      p.btn.classList.toggle('is-open', on);
    }
    openPop = name;
    wake();
  }
  const togglePop = (name) => showPop(openPop === name ? null : name);

  // Buttons that only concern the toolbar itself (the rest carry data-action for the app).
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ui]');
    if (!b) return;
    if (b.dataset.ui === 'clean') {
      showPop(null);
      el.closest('#stage')?.classList.add('is-clean');
    } else togglePop(b.dataset.ui);
  });

  // Colour popover.
  const pop = pops.theme.el;
  const picker = pop.querySelector('input[type=color]');
  const hexLabel = pop.querySelector('.theme-pop__hex b');
  const api = { onColor: () => {} };
  const setColor = (hex) => {
    const preset = [...pop.querySelectorAll('[data-c]')].find((b) => b.dataset.c.toLowerCase() === hex.toLowerCase());
    pop.querySelectorAll('.swatch').forEach((b) => b.classList.toggle('is-active', b === preset));
    pop.querySelector('.swatch--custom').classList.toggle('is-active', !preset);
    pop.querySelector('.swatch--custom').style.setProperty('--c', hex);
    picker.value = hex;
    hexLabel.textContent = hex.toUpperCase();
  };
  picker.addEventListener('input', () => api.onColor(picker.value));
  const setPitchTheme = (v) => pop.querySelectorAll('[data-action="pitch-theme"]').forEach((b) => b.classList.toggle('is-active', b.dataset.v === v));

  // Fade out while the mouse rests; never while something in the bar is in use.
  let idleTimer = 0;
  const busy = () => openPop || hint.textContent || el.matches(':hover') || el.contains(document.activeElement);
  function wake() {
    el.classList.remove('is-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function rest() {
      if (busy()) idleTimer = setTimeout(rest, 1000);
      else el.classList.add('is-idle');
    }, 3000);
  }
  window.addEventListener('pointermove', wake, { passive: true });
  window.addEventListener('keydown', wake);

  // Back to the pre-intro look (everything hidden, nothing open).
  function reset() {
    Object.values(pops).forEach((p) => { gsap.killTweensOf(p.el); gsap.set(p.el, { autoAlpha: 0 }); p.btn.classList.remove('is-open'); });
    openPop = null;
    setActive(null);
    setHint();
    gsap.set(el.querySelectorAll('[data-anim]'), { autoAlpha: 0 });
  }

  function enter() {
    wake();
    return gsap.timeline().fromTo(el.querySelectorAll('[data-anim]'), { y: -24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out', stagger: 0.12 });
  }
  function exit() {
    return gsap.timeline().to(el.querySelectorAll('[data-anim]'), { y: -24, autoAlpha: 0, duration: 0.3, ease: 'power2.in', stagger: 0.05 });
  }

  return Object.assign(api, {
    name: 'toolbar', el, enter, exit, reset, setFormation, setActive, setHint, setColor, setPitchTheme,
    toggleTheme: () => togglePop('theme'),
    toggleExport: () => togglePop('export'),
    closeTheme: () => showPop(null),
  });
}
