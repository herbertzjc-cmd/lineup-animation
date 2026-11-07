import gsap from 'gsap';
import * as store from './store.js';

// opening board: slide in + hold + slide out, in seconds (kept under 3; shorter in the short intro)
const BOARD_MAX = { short: 2.4, full: 2.9 };
const OVERLAP = 0.3;   // the scene starts this long before the board has finished leaving

// Plays on page load: the opening board, then the pitch and players build in.
// Labels: 'players' = the board is gone and the player entrance is about to run (skip target).
export function buildMaster({ intro, scene }) {
  const master = gsap.timeline({ paused: true });
  const boardIn = intro.enter();
  const boardOut = intro.exit();
  const max = BOARD_MAX[store.getSettings().introMode] || BOARD_MAX.short;
  const hold = Math.max(0.3, max - boardIn.duration() - boardOut.duration());
  const boardEnd = boardIn.duration() + hold + boardOut.duration();

  master.addLabel('intro', 0).add(boardIn, 0).add(boardOut, boardIn.duration() + hold);
  master.addLabel('players', boardEnd);
  const start = boardEnd - OVERLAP;
  master.addLabel('scene', start).add(scene.enter(), start);
  return master;
}
