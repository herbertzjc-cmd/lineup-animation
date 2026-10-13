import '@fontsource/montserrat/700.css';
import '@fontsource/barlow-semi-condensed/700.css';
import gsap from 'gsap';
import './styles.css';
import { h } from './dom.js';
import { initStage } from './stage.js';
import { team } from './data.js';
import { createIntro } from './components/intro.js';
import { createPitch } from './components/pitch.js';
import { createPanel } from './components/panel.js';
import { createToolbar } from './components/toolbar.js';
import { buildMaster } from './timeline.js';
import { initControls } from './controls.js';
import { initApp } from './app.js';

const stage = initStage();
stage.style.setProperty('--primary', team.colors.primary);

const intro = createIntro();
const pitch = createPitch();
const panel = createPanel();
const toolbar = createToolbar();

// Pitch, panel and toolbar share one 2000x1123 reference frame (see .fref).
const sceneEl = h('section', 'scene formation');
const ref = h('div', 'fref');
ref.append(pitch.el, panel.el, toolbar.el);
sceneEl.append(ref);
gsap.set(sceneEl, { autoAlpha: 0 });

const scene = {
  el: sceneEl,
  enter: () => gsap.timeline().set(sceneEl, { autoAlpha: 1 }).add(pitch.enter(), 0).add(panel.enter(), 0.2).add(toolbar.enter(), 1.1),
  exit: () => gsap.timeline().add(toolbar.exit(), 0).add(pitch.exit(), 0.1).add(panel.exit(), 0.3).set(sceneEl, { autoAlpha: 0 }),
};
stage.append(sceneEl, intro.el);

const app = initApp({ stage, ref, pitch, panel, toolbar });
const master = buildMaster({ intro, scene });

// The page is only interactive once the opening animation has finished (or been skipped).
let started = false;
const goLive = () => {
  if (started) return;
  started = true;
  stage.removeEventListener('pointerdown', skip);
  app.goLive();
};
function skip() { master.progress(1, false); goLive(); }
master.eventCallback('onComplete', goLive);
stage.addEventListener('pointerdown', skip);

const params = new URLSearchParams(location.search);
window.master = master; // handy for console debugging
window.gsap = gsap;
initControls(master, [{ label: 'intro', text: 'Intro' }, { label: 'scene', text: 'Scene' }], params.get('dev') === '1');
if (params.get('intro') === '0') skip();
else master.play();
