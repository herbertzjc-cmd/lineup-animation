import gsap from 'gsap';
import { h } from '../dom.js';
import { FORMATIONS, THEMES } from '../data.js';
import * as store from '../store.js';

export const DEFAULT_HINT = ''; // the hint line only shows messages that need attention (picking a substitute, storage full)

export function createToolbar() {
  const el = h('div', 'ftool');
  el.innerHTML = `
    <div class="ftool__row" data-anim>
      ${FORMATIONS.map((f) => `<button class="chip" data-action="formation" data-f="${f}">${f}</button>`).join('')}
      <button class="chip chip--quiet" data-action="reset">Reset</button>
    </div>
    <div class="ftool__row" data-anim>
      <button class="chip chip--play" data-action="play" title="Replay the opening animation">▶ Play</button>
      <button class="chip" data-action="toggle-list" data-view="list">Lineup</button>
      <button class="chip" data-action="toggle-bench" data-view="bench">Bench</button>
      <button class="chip" data-action="new">+ Player</button>
      <button class="chip" data-action="team">Team</button>
      <button class="chip" data-action="toggle-theme"><i class="chip__dot"></i>Colors</button>
      <button class="chip" data-action="toggle-export" data-pop="export">Export</button>
    </div>
    <div class="ftool__hint" data-anim>${DEFAULT_HINT}</div>
    <div class="theme-pop">
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
    <div class="export-pop">
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

  const setFormation = (f) => el.querySelectorAll('[data-f]').forEach((b) => b.classList.toggle('is-active', b.dataset.f === f));
  const setActive = (view) => el.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
  const setHint = (text) => { hint.textContent = text || DEFAULT_HINT; };
  setFormation(store.getFormation());

  // Colour popover.
  const pop = el.querySelector('.theme-pop');
  const picker = pop.querySelector('input[type=color]');
  const hexLabel = pop.querySelector('.theme-pop__hex b');
  gsap.set(pop, { autoAlpha: 0 });
  let popOpen = false;
  const api = { onColor: () => {} };
  const showPop = (on) => {
    popOpen = on;
    gsap.to(pop, { autoAlpha: on ? 1 : 0, y: on ? 0 : -10, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
    el.querySelector('[data-action="toggle-theme"]').classList.toggle('is-active', on);
  };
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

  // Export popover (still PNG of the team sheet in three sizes).
  const xpop = el.querySelector('.export-pop');
  gsap.set(xpop, { autoAlpha: 0 });
  let xOpen = false;
  const showExport = (on) => {
    xOpen = on;
    gsap.to(xpop, { autoAlpha: on ? 1 : 0, y: on ? 0 : -10, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
    el.querySelector('[data-action="toggle-export"]').classList.toggle('is-active', on);
  };

  // Back to the pre-intro look (everything hidden, nothing open).
  function reset() {
    gsap.killTweensOf([pop, xpop]);
    gsap.set([pop, xpop], { autoAlpha: 0 });
    popOpen = false;
    xOpen = false;
    el.querySelector('[data-action="toggle-export"]').classList.remove('is-active');
    el.querySelector('[data-action="toggle-theme"]').classList.remove('is-active');
    setActive(null);
    setHint();
    gsap.set(el.querySelectorAll('[data-anim]'), { autoAlpha: 0 });
  }

  function enter() {
    return gsap.timeline().fromTo(el.querySelectorAll('[data-anim]'), { y: -24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out', stagger: 0.12 });
  }
  function exit() {
    return gsap.timeline().to(el.querySelectorAll('[data-anim]'), { y: -24, autoAlpha: 0, duration: 0.3, ease: 'power2.in', stagger: 0.05 });
  }

  return Object.assign(api, {
    name: 'toolbar', el, enter, exit, reset, setFormation, setActive, setHint, setColor, setPitchTheme,
    toggleTheme: () => { if (xOpen) showExport(false); showPop(!popOpen); },
    toggleExport: () => { if (popOpen) showPop(false); showExport(!xOpen); },
    closeTheme: () => { if (popOpen) showPop(false); if (xOpen) showExport(false); },
  });
}
