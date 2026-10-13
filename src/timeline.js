import gsap from 'gsap';

const INTRO_HOLD = 1.8; // seconds the opening board stays up
const OVERLAP = 0.3;    // the scene starts this long before the board finishes leaving

// Plays once on page load: opening board in and out, then the interactive scene builds in.
export function buildMaster({ intro, scene }) {
  const master = gsap.timeline({ paused: true });
  const boardIn = intro.enter();
  master.addLabel('intro', 0).add(boardIn, 0);
  master.add(intro.exit(), boardIn.duration() + INTRO_HOLD);
  const start = master.duration() - OVERLAP;
  master.addLabel('scene', start).add(scene.enter(), start);
  return master;
}
