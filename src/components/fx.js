import gsap from 'gsap';

// A few small gold sparks (`k` scales the spread with the card's enlargement). `ambient` drifts around the card while it prepares;
// `burst` flies outwards once when it flips to the front. Kept sparse so the portrait
// is never covered. Positions are in the 2000x1123 reference frame of the pitch.
export function goldParticles(layer, cx, cy, mode, k = 1) {
  const tl = gsap.timeline();
  const count = mode === 'burst' ? 10 : 12;
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('i');
    dot.className = 'gp';
    layer.append(dot);
    const size = 3 + Math.random() * 4;
    if (mode === 'burst') {
      const angle = Math.random() * Math.PI * 2;
      const dist = (70 + Math.random() * 80) * k;
      gsap.set(dot, { left: cx, top: cy, width: size, height: size });
      tl.fromTo(
        dot,
        { x: 0, y: 0, autoAlpha: 0.9, scale: 1 },
        // immediateRender off: the sparks must stay hidden until the burst plays, or they sit
        // stacked on the card's spot as a stray dot from the moment the timeline is built
        { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist * 1.2, autoAlpha: 0, scale: 0.3, duration: 0.7 + Math.random() * 0.4, ease: 'power2.out', immediateRender: false },
        Math.random() * 0.15
      );
    } else {
      gsap.set(dot, { left: cx + (Math.random() - 0.5) * 300 * k, top: cy + (Math.random() - 0.5) * 340 * k, width: size, height: size });
      tl.fromTo(
        dot,
        { y: 0, autoAlpha: 0, scale: 0.5 },
        { y: -40 - Math.random() * 50, autoAlpha: 0.8, scale: 1, duration: 0.8 + Math.random() * 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1 },
        Math.random() * 1.4
      );
    }
  }
  return tl;
}
