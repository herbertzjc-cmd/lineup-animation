import { h, esc } from '../../dom.js';
import { team } from '../../data.js';
import * as store from '../../store.js';
import { enterView, exitView } from './common.js';

function render({ swapFor } = {}) {
  const out = swapFor && store.player(swapFor);
  const bench = store.bench();
  const el = h('div', 'view bench');
  el.innerHTML = `
    <button class="close" data-action="close" aria-label="Close">×</button>
    <h2 class="view__title" data-anim>SUBSTITUTES</h2>
    <p class="view__sub" data-anim>${out ? `Replacing #${esc(out.number)} ${esc(out.name)} — pick a player` : 'Drag a player onto the pitch, or click for details'}</p>
    <div class="bench__list">
      ${bench.length ? bench.map((p) => `
        <div class="brow" data-anim data-drag="bench" data-action="pick" data-id="${esc(p.id)}">
          <span class="brow__num">${esc(p.number)}</span>
          <span class="brow__name">${esc(p.fullName.toUpperCase())}</span>
          <span class="brow__pos">${esc(p.position)}</span>
        </div>`).join('') : '<p class="view__sub" data-anim>No substitutes yet. Use “+ New player” to add one.</p>'}
    </div>
    <div class="bench__coach" data-anim>
      <div class="bench__role">HEAD COACH</div>
      <div class="bench__coachname">${esc(team.coach.name.toUpperCase())}</div>
      <div class="bench__coachmeta">${esc(team.coach.nationality)} · ${esc(team.name)}</div>
    </div>
  `;
  return el;
}

export default { render, enter: enterView, exit: exitView };
