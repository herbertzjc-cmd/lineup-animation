import gsap from 'gsap';
import { h } from '../dom.js';
import { match } from '../data.js';
import * as store from '../store.js';
import { fitFont } from '../branding.js';

export function createIntro() {
  const el = h('section', 'scene intro');
  el.innerHTML = `
    <div class="intro__panel"></div>
    <div class="intro__content">
      <div class="intro__kicker">${match.competition} · ${match.round}</div>
      <h1 class="intro__title">STARTING XI</h1>
      <div class="intro__team"></div>
      <div class="intro__meta">${match.venue} · ${match.date} · KO ${match.kickoff}</div>
    </div>
  `;
  gsap.set(el, { autoAlpha: 0 });
  const q = gsap.utils.selector(el);

  // The team name can be edited, so it is filled in (and fitted to the board) here.
  const teamEl = el.querySelector('.intro__team');
  function refresh() {
    const name = store.getTeamName();
    teamEl.textContent = name;
    teamEl.style.fontSize = `${fitFont(name, 1000, { max: 76, min: 36, lines: 1 })}px`;
  }
  refresh();

  function enter() {
    return gsap
      .timeline()
      .set(el, { autoAlpha: 1 })
      .fromTo(q('.intro__panel'), { xPercent: -100 }, { xPercent: 0, duration: 0.55, ease: 'power3.out' })
      .fromTo(
        q('.intro__content > *'),
        { x: -80, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.4, ease: 'power3.out', stagger: 0.08 },
        0.2
      );
  }

  function exit() {
    return gsap
      .timeline()
      .to(q('.intro__content > *'), { x: 80, autoAlpha: 0, duration: 0.25, ease: 'power2.in', stagger: 0.04 })
      .to(q('.intro__panel'), { xPercent: 100, duration: 0.45, ease: 'power3.in' }, '-=0.22')
      .set(el, { autoAlpha: 0 });
  }

  return { name: 'intro', el, enter, exit, refresh };
}
