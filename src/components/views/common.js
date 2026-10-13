import gsap from 'gsap';

// Default view transitions: children marked data-anim slide in; the whole view slides out.
export function enterView(el) {
  return gsap.timeline().fromTo(el.querySelectorAll('[data-anim]'), { x: 70, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out', stagger: 0.05 });
}

export function exitView(el) {
  return gsap.timeline().to(el, { x: -40, autoAlpha: 0, duration: 0.22, ease: 'power2.in' });
}
