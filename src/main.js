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
  enter: () => gsap.timeline().set(sceneEl, { autoAlpha: 1 }).add(pitch.enter(), 0).add(panel.enter(), 0.2).add(toolbar.enter(), 1.1),
};
stage.append(sceneEl, intro.el);

const app = initApp({ stage, ref, pitch, panel, toolbar });

// The whole opening sequence. The page is locked (no clicks, no hover) until it has finished;
// the Play button runs it again from a clean state, using whatever lineup is currently set.
let master = null;
function play({ skip = false } = {}) {
  app.lock();
  if (master) master.kill();
  pitch.build();
  panel.reset();
  toolbar.reset();
  gsap.set([sceneEl, intro.el], { autoAlpha: 0 });
  master = buildMaster({ intro, scene });
  window.master = master; // handy for console debugging
  master.eventCallback('onComplete', app.goLive);
  if (skip) master.progress(1, false);
  else master.play(0);
}
app.onPlay = () => play();

window.gsap = gsap;
play({ skip: new URLSearchParams(location.search).get('intro') === '0' }); // ?intro=0 for development
