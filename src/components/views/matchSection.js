import { h, esc } from '../../dom.js';
import * as store from '../../store.js';

// "Match Settings" in the Team editor: opponent, competition, date… shown on the opening board and
// the lineup screen, plus the length of the opening animation. Saved with the editor's Save.
export function createMatchSection({ open = true } = {}) {
  const m = store.getMatch();
  const s = store.getSettings();
  const el = h('details', 'sect');
  el.open = open;
  el.dataset.anim = '';
  const field = (name, label, ph = '') =>
    `<label class="field">${label}<input name="${name}" value="${esc(m[name] || '')}" maxlength="40" placeholder="${ph}"></label>`;
  el.innerHTML = `
    <summary>Match Settings</summary>
    ${field('opponent', 'Opponent', 'Opponent team')}
    <div class="field-row field-row--2">
      <label class="field">Home / Away<select name="homeAway">
        <option value="home">Home</option><option value="away">Away</option><option value="">Neutral</option></select></label>
      ${field('kickoff', 'Kick-off', '17:30')}
    </div>
    ${field('competition', 'Competition', 'Premier League')}
    <div class="field-row field-row--2">${field('round', 'Round', 'Matchday 12')}${field('date', 'Date', '15 Nov 2026')}</div>
    ${field('venue', 'Venue', 'Stadium')}
    <label class="field">Opening animation<select name="introMode">
      <option value="short">Short (about 15 seconds)</option><option value="full">Full (about 24 seconds)</option></select></label>
  `;
  el.querySelector('[name=homeAway]').value = m.homeAway ?? 'home';
  el.querySelector('[name=introMode]').value = s.introMode === 'full' ? 'full' : 'short';

  function read() {
    const v = (n) => el.querySelector(`[name=${n}]`).value.trim();
    return {
      match: {
        opponent: v('opponent'), homeAway: v('homeAway'), kickoff: v('kickoff'), competition: v('competition'),
        round: v('round'), date: v('date'), venue: v('venue'),
      },
      introMode: v('introMode'),
    };
  }
  return { el, read };
}
