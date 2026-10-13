import gsap from 'gsap';
import { h } from '../dom.js';
import { team, asset } from '../data.js';
import detail from './views/playerDetail.js';
import bench from './views/bench.js';
import list from './views/lineupList.js';
import editor from './views/editor.js';

const views = { detail, bench, list, editor };
const CLOSED_X = 222; // how far the panel is pushed right while only its brand strip shows
const OFFSCREEN_X = 562;

// Resolved against the page: a relative url() inside a CSS variable would otherwise
// be resolved against the stylesheet in /assets/ after a production build.
const logoUrl = new URL(asset(team.logo), document.baseURI).href;

const wait = (tl) =>
  new Promise((resolve) => {
    if (!tl || tl.duration() === 0) resolve();
    else tl.eventCallback('onComplete', resolve);
  });

// The red side panel: brand strip (crest) when idle, expands to host the views.
export function createPanel() {
  const el = h('div', 'fpanel');
  el.innerHTML = `
    <div class="fref__panel"><div class="panel__content"></div></div>
    <div class="fref__crest" style="--logo:url(${logoUrl})">
      <div class="crest__layer crest__layer--red"></div>
      <div class="crest__layer crest__layer--white"></div>
    </div>
    <div class="fref__bug"><i></i></div>
  `;
  const bg = el.querySelector('.fref__panel');
  const content = el.querySelector('.panel__content');
  const crest = el.querySelector('.fref__crest');
  const bug = el.querySelector('.fref__bug');
  gsap.set([bg, crest], { x: OFFSCREEN_X });
  gsap.set(crest, { autoAlpha: 0 });
  gsap.set(bug, { autoAlpha: 0 });

  let open = false;
  let current = null; // { view, el }
  let token = 0;
  const api = { onToggle: () => {}, onAction: () => {} };

  function slide(isOpen) {
    open = isOpen;
    gsap.to([bg, crest], { x: isOpen ? 0 : CLOSED_X, duration: 0.7, ease: 'power3.inOut', overwrite: 'auto' });
    api.onToggle(isOpen);
  }

  async function show(name, ctx = {}) {
    const mine = ++token;
    if (current) {
      const old = current;
      current = null;
      await wait(old.view.exit(old.el));
      old.el.remove();
    }
    if (mine !== token) return;
    if (!open) slide(true);
    const view = views[name];
    const node = view.render(ctx);
    content.append(node);
    current = { view, el: node };
    view.enter(node);
  }

  async function hide() {
    const mine = ++token;
    if (current) {
      const old = current;
      current = null;
      await wait(old.view.exit(old.el));
      old.el.remove();
    }
    if (mine === token && open) slide(false);
  }

  bg.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (target) api.onAction(target.dataset.action, target.dataset, target);
  });

  function enter() {
    return gsap
      .timeline()
      .fromTo(bg, { x: OFFSCREEN_X }, { x: CLOSED_X, duration: 0.9, ease: 'power3.out' }, 0)
      .fromTo(crest, { x: OFFSCREEN_X, scale: 0.8, autoAlpha: 0 }, { x: CLOSED_X, scale: 1, autoAlpha: 1, duration: 0.9, ease: 'power3.out' }, 0)
      .fromTo(bug, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, 0.8);
  }

  function exit() {
    return gsap
      .timeline()
      .to(bug, { autoAlpha: 0, duration: 0.25 })
      .to([bg, crest], { x: OFFSCREEN_X, duration: 0.6, ease: 'power3.in' }, '-=0.1');
  }

  return Object.assign(api, {
    name: 'panel', el, content, enter, exit, show, hide,
    get isOpen() { return open; },
  });
}
