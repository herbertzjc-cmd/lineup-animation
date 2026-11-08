import { h, esc } from '../../dom.js';
import * as store from '../../store.js';
import { opponentBadge } from '../../branding.js';
import { readImage, blobToDataUrl, readErrorMessage, IMAGE_ACCEPT } from '../../imageutil.js';

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
    <div class="opp">
      <div class="opp__preview"></div>
      <div class="opp__fields">
        <div class="field-row field-row--2">
          <label class="field">Short name<input name="opponentShort" value="${esc(m.opponentShort || '')}" maxlength="4" placeholder="ARS"></label>
          <label class="field">Badge colour<input name="opponentColor" type="color" value="${esc(m.opponentColor || '#2a3042')}"></label>
        </div>
        <label class="btn btn--ghost btn--sm">Upload opponent logo<input type="file" name="oppFile" accept="${IMAGE_ACCEPT}" hidden></label>
        <button class="btn btn--ghost btn--sm" type="button" data-opp-remove>Remove logo</button>
        <p class="brand__error" data-opp-error></p>
      </div>
    </div>
    <div class="field-row field-row--2">
      <label class="field">Home / Away<select name="homeAway">
        <option value="home">Home</option><option value="away">Away</option><option value="">Neutral</option></select></label>
      ${field('kickoff', 'Kick-off', '17:30')}
    </div>
    ${field('competition', 'Competition', 'Premier League')}
    <div class="field-row field-row--2">${field('round', 'Round', 'Matchday 12')}${field('date', 'Date', '15 Nov 2026')}</div>
    ${field('venue', 'Venue', 'Stadium')}
    <label class="field">Opening animation<select name="introMode">
      <option value="short">Short (about 18 seconds)</option><option value="full">Full (about 24 seconds)</option></select></label>
  `;
  el.querySelector('[name=homeAway]').value = m.homeAway ?? 'home';
  el.querySelector('[name=introMode]').value = s.introMode === 'full' ? 'full' : 'short';

  // Opponent badge: their logo if uploaded, otherwise a roundel in their colour with the short name.
  let logo = m.opponentLogo || '';
  let reading = 0;
  const $ = (n) => el.querySelector(`[name=${n}]`);
  const paintBadge = () => {
    const draft = { opponent: $('opponent').value.trim() || 'Opponent', opponentShort: $('opponentShort').value.trim(), opponentColor: $('opponentColor').value, opponentLogo: logo };
    el.querySelector('.opp__preview').innerHTML = opponentBadge(draft, 76);
    el.querySelector('[data-opp-remove]').disabled = !logo;
    $('opponentColor').disabled = !!logo;
  };
  el.addEventListener('input', paintBadge);
  $('oppFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const mine = ++reading;
    const msg = el.querySelector('[data-opp-error]');
    msg.textContent = 'Reading the logo…';
    try {
      const { blob } = await readImage(file, 320); // small: it is kept with the match details
      if (mine !== reading) return;
      logo = await blobToDataUrl(blob);
      msg.textContent = '';
      paintBadge();
    } catch (err) {
      if (mine !== reading) return;
      msg.textContent = readErrorMessage(err);
    }
  });
  el.querySelector('[data-opp-remove]').addEventListener('click', () => { logo = ''; paintBadge(); });
  paintBadge();

  function read() {
    const v = (n) => el.querySelector(`[name=${n}]`).value.trim();
    return {
      match: {
        opponent: v('opponent'), homeAway: v('homeAway'), kickoff: v('kickoff'), competition: v('competition'),
        round: v('round'), date: v('date'), venue: v('venue'),
        opponentShort: v('opponentShort').toUpperCase(), opponentColor: v('opponentColor'), opponentLogo: logo,
      },
      introMode: v('introMode'),
    };
  }
  return { el, read };
}
