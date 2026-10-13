import { h, esc } from '../../dom.js';
import * as store from '../../store.js';
import { enterView, exitView } from './common.js';

function render() {
  const el = h('div', 'view list');
  el.innerHTML = `
    <button class="close" data-action="close" aria-label="Close">×</button>
    <h2 class="view__title" data-anim>STARTING XI</h2>
    <p class="view__sub" data-anim>${esc(store.getFormation())} · click a player for details</p>
    <div class="list__rows">
      ${store.slots().map((id) => {
        const p = store.player(id);
        return `<div class="brow" data-anim data-action="select" data-id="${esc(id)}">
          <span class="brow__num">${esc(p.number)}</span>
          <span class="brow__name">${esc(p.fullName.toUpperCase())}</span>
          <span class="brow__pos">${esc(p.position)}</span>
        </div>`;
      }).join('')}
    </div>
  `;
  return el;
}

export default { render, enter: enterView, exit: exitView };
