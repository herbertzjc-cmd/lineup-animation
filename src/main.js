import '@fontsource/montserrat/700.css';
import '@fontsource/barlow-semi-condensed/700.css';
import gsap from 'gsap';
import './styles.css';
import { h } from './dom.js';
import { initStage } from './stage.js';
import { asset, team } from './data.js';
import * as store from './store.js';
import { applyTheme } from './theme.js';
import { createIntro } from './components/intro.js';
import { createPitch } from './components/pitch.js';
import { createPanel } from './components/panel.js';
import { createToolbar } from './components/toolbar.js';
import { buildMaster } from './timeline.js';
import { initApp } from './app.js';

const stage = initStage();
applyTheme(stage, store.getColor());
// Resolved against the page: a relative url() inside a CSS variable would otherwise be
// resolved against the stylesheet in /assets/ after a production build.
stage.style.setProperty('--logo', `url(${new URL(asset(team.logo), document.baseURI).href})`);

const intro = createIntro();
const pitch = createPitch();
const panel = createPanel();
const toolbar = createToolbar();

// Pitch, panel and toolbar share one 2000x1123 reference frame (see .fref).
const sceneEl = h('section', 'scene formation');
const ref = h('div', 'fref');
ref.append(pitch.el, panel.el, toolbar.el);
sceneEl.append(ref);

const scene = {
  el: sceneEl,
  enter: () => {
    const tl = gsap.timeline().set(sceneEl, { autoAlpha: 1 });
    const pitchTl = pitch.enter();
    tl.add(pitchTl, 0).add(panel.enter(), 0.2);
    // the controls appear once all the players have been introduced
    tl.add(toolbar.enter(), Math.max(0, pitchTl.duration() - 0.6));
    return tl;
  },
};
stage.append(sceneEl, intro.el);

const app = initApp({ stage, ref, pitch, panel, toolbar });

// The whole opening sequence: board, then players. The page does not respond to anything
// except "skip" until it has finished: the first click jumps from the board to the players,
// a click during the players jumps to the finished page (a quick double click skips both).
// The Play button runs it again from a clean state, using whatever lineup is currently set.
const skipHint = h('div', 'skip-hint', 'Click to skip');
stage.append(skipHint);

let master = null;
let skipTween = null;
let skipPhase = null; // 'players' or 'end' while a skip fast-forward is running

function finish() {
  skipPhase = null;
  stage.removeEventListener('pointerdown', onSkip);
  app.goLive();
}

function onSkip() {
  const total = master.duration();
  const boardEnd = master.labels.players;
  const toEnd = master.time() >= boardEnd - 0.01 || skipPhase === 'players';
  skipPhase = toEnd ? 'end' : 'players';
  master.pause();
  if (skipTween) skipTween.kill();
  // Fast-forward rather than cut, so the cards visibly zip into place.
  skipTween = gsap.to(master, {
    progress: (toEnd ? total : boardEnd) / total,
    duration: 0.35,
    ease: 'power2.in',
    onComplete: () => {
      skipPhase = null;
      if (toEnd) finish();
      else master.play();
    },
  });
}

function play({ skip = false } = {}) {
  app.lock();
  if (skipTween) skipTween.kill();
  skipPhase = null;
  if (master) master.kill();
  pitch.build();
  panel.reset();
  toolbar.reset();
  gsap.set([sceneEl, intro.el], { autoAlpha: 0 });
  master = buildMaster({ intro, scene });
  window.master = master; // handy for console debugging
  master.eventCallback('onComplete', finish);
  stage.removeEventListener('pointerdown', onSkip);
  if (skip) {
    master.progress(1, false);
    finish();
  } else {
    stage.addEventListener('pointerdown', onSkip);
    master.play(0);
  }
}
app.onPlay = () => play();

window.gsap = gsap;
play({ skip: new URLSearchParams(location.search).get('intro') === '0' }); // ?intro=0 for development
