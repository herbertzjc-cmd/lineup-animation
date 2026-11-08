import gsap from 'gsap';
import { h, esc } from '../dom.js';
import * as store from '../store.js';
import { fitText, mgrTransform, matchText, opponentBadge } from '../branding.js';
import detail from './views/playerDetail.js';
import bench from './views/bench.js';
import list from './views/lineupList.js';
import editor from './views/editor.js';

const views = { detail, bench, list, editor };
const CLOSED_X = 222; // how far the panel is pushed right while only its brand strip shows
const OFFSCREEN_X = 562;

const wait = (tl) =>
  new Promise((resolve) => {
    if (!tl || tl.duration() === 0) resolve();
    else tl.eventCallback('onComplete', resolve);
  });

// The red side panel: brand strip (crest) when idle, expands to host the views.
export function createPanel() {
  const el = h('div', 'fpanel');
  el.innerHTML = `
    <div class="fref__panel"><div class="panel__idle"></div><div class="panel__content"></div>
      <nav class="pnav" aria-label="Panel">
        <button class="pnav__btn pnav__back" type="button" data-action="back" hidden><i>‹</i><span></span></button>
        <button class="pnav__btn pnav__close" type="button" data-action="close" title="Close (Esc)">Close<i>✕</i></button>
      </nav>
    </div>
    <div class="fref__crest">
      <div class="crest__layer crest__layer--red"></div>
      <div class="crest__layer crest__layer--white"></div>
      <img class="crest__img" alt="">
    </div>
  `;
  const bg = el.querySelector('.fref__panel');
  const content = el.querySelector('.panel__content');
  const idle = el.querySelector('.panel__idle');
  const crest = el.querySelector('.fref__crest');
  gsap.set([bg, crest], { x: OFFSCREEN_X });
  gsap.set(crest, { autoAlpha: 0 });

  // What the closed panel shows on the lineup screen: team name, then the manager.
  // It is part of the panel, so it slides in with it and is hidden while a view is open.
  // The closed panel's strip: a matchday card. Competition, our team, the opponent, a small
  // table of match facts and the formation, with the manager at the bottom. Laid out as one column
  // (see .panel__idle), so it reads top to bottom with no large gaps whatever is filled in.
  function refreshBrand() {
    const teamName = store.getTeamName();
    const m = store.getManager();
    const match = store.getMatch();
    const t = matchText(match);
    const opp = match.opponent || '';
    const teamSize = fitText(teamName.toUpperCase(), 258, { max: 64, min: 26, lines: 2 });
    const oppSize = fitText(opp.toUpperCase(), 172, { max: 40, min: 16, lines: 2 });
    const nameSize = fitText(m.name, 250, { max: 40, min: 20, lines: 1 });
    const facts = [['Date', match.date], ['Kick-off', match.kickoff], ['Venue', match.venue]].filter(([, v]) => v);
    idle.innerHTML = `
      <div class="idle__head">
        ${t.kicker ? `<div class="idle__kicker">${esc(t.kicker.toUpperCase())}</div>` : ''}
        <div class="idle__team" style="font-size:${teamSize}px">${esc(teamName.toUpperCase())}</div>
      </div>
      <div class="idle__match">
      ${opp ? `<div class="idle__vs"><i></i><span>VS${t.side ? ` · ${esc(t.side.toUpperCase())}` : ''}</span><i></i></div>
      <div class="idle__opprow">${opponentBadge(match, 64)}<div class="idle__opp" style="font-size:${oppSize}px">${esc(opp.toUpperCase())}</div></div>` : ''}
      <dl class="idle__facts">
        ${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}
        <div class="idle__formation"><dt>Formation</dt><dd>${esc(store.getFormation())}</dd></div>
      </dl>
      </div>
      <div class="idle__mgr${m.hasPhoto ? ' has-photo' : ''}">
        ${m.hasPhoto ? `<div class="idle__photo${m.cutout ? '' : ' idle__photo--framed'}"><img src="${esc(m.photoUrl)}" alt="" style="transform:${mgrTransform(m)}"></div>` : ''}
        <div class="idle__plate">
          <div class="idle__role">MANAGER</div>
          <div class="idle__name" style="font-size:${nameSize}px">${esc(m.name)}</div>
        </div>
      </div>`;
  }
  refreshBrand();

  let open = false;
  let current = null; // { view, el }
  let token = 0;
  const api = { onToggle: () => {}, onAction: () => {} };

  // Back / Close bar at the top of the open panel. `back` is the label of the previous screen
  // (null when there is nothing to go back to).
  const nav = el.querySelector('.pnav');
  function setNav({ back = null } = {}) {
    const b = nav.querySelector('.pnav__back');
    b.hidden = !back;
    b.querySelector('span').textContent = back || '';
    b.title = back ? `Back to ${back} (Esc)` : '';
  }

  function slide(isOpen) {
    open = isOpen;
    nav.classList.toggle('is-open', isOpen);
    gsap.to(idle, { autoAlpha: isOpen ? 0 : 1, duration: 0.3, overwrite: 'auto' });
    gsap.to([bg, crest], { x: isOpen ? 0 : CLOSED_X, duration: 0.7, ease: 'power3.inOut', overwrite: 'auto' });
    api.onToggle(isOpen);
  }

  // Drop everything back to the hidden, pre-intro state (used before a replay).
  function reset() {
    token += 1;
    current = null;
    open = false;
    nav.classList.remove('is-open');
    setNav();
    content.replaceChildren();
    gsap.killTweensOf([bg, crest, idle]);
    gsap.set(idle, { autoAlpha: 1 });
    gsap.set([bg, crest], { x: OFFSCREEN_X });
    gsap.set(crest, { autoAlpha: 0 });
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
      .fromTo(crest, { x: OFFSCREEN_X, scale: 0.8, autoAlpha: 0 }, { x: CLOSED_X, scale: 1, autoAlpha: 1, duration: 0.9, ease: 'power3.out' }, 0);
  }

  function exit() {
    return gsap
      .timeline()
      .to([bg, crest], { x: OFFSCREEN_X, duration: 0.6, ease: 'power3.in' });
  }

  return Object.assign(api, {
    name: 'panel', el, content, enter, exit, show, hide, reset, refreshBrand, setNav,
    get isOpen() { return open; },
  });
}
