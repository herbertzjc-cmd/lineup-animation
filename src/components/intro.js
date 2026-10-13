import gsap from 'gsap';
import { h } from '../dom.js';
import { match, team } from '../data.js';

export function createIntro() {
  const el = h('section', 'scene intro');
  el.innerHTML = `
    <div class="intro__panel"></div>
    <div class="intro__content">
      <div class="intro__kicker">${match.competition} · ${match.round}</div>
      <h1 class="intro__title">STARTING XI</h1>
      <div class="intro__team">${team.name}</div>
      <div class="intro__meta">${match.venue} · ${match.date} · KO ${match.kickoff}</div>
    </div>
  `;
  gsap.set(el, { autoAlpha: 0 });
  const q = gsap.utils.selector(el);

  function enter() {
    return gsap
      .timeline()
      .set(el, { autoAlpha: 1 })
      .fromTo(q('.intro__panel'), { xPercent: -100 }, { xPercent: 0, duration: 0.8, ease: 'power3.out' })
      .fromTo(
        q('.intro__content > *'),
        { x: -80, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', stagger: 0.12 },
        '-=0.4'
      );
  }

  function exit() {
    return gsap
      .timeline()
      .to(q('.intro__content > *'), { x: 80, autoAlpha: 0, duration: 0.4, ease: 'power2.in', stagger: 0.06 })
      .to(q('.intro__panel'), { xPercent: 100, duration: 0.6, ease: 'power3.in' }, '-=0.2')
      .set(el, { autoAlpha: 0 });
  }

  return { name: 'intro', el, enter, exit };
}
