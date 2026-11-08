import * as store from './store.js';
import { asset, team } from './data.js';
import { esc } from './dom.js';
import { isHex, luminance } from './theme.js';

const isCjk = (ch) => /[\u2e80-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(ch);

// Rough text width in em: CJK characters are about a full em wide, Latin letters about half.
const textUnits = (text) => [...text].reduce((u, ch) => u + (isCjk(ch) ? 1 : 0.52), 0);

// Width of the longest piece that cannot be split across lines: a Latin word, or one CJK character.
function longestUnbreakable(text) {
  let longest = 0;
  for (const word of text.split(/\s+/)) {
    let run = 0;
    for (const ch of word) {
      if (isCjk(ch)) { longest = Math.max(longest, run, 1); run = 0; } else run += 0.52;
    }
    longest = Math.max(longest, run);
  }
  return longest;
}

// A font size that makes `text` fit `width` px on at most `lines` lines (words are never split),
// between `min` and `max`.
export function fitFont(text, width, { max, min, lines = 1 }) {
  const byTotal = (width * lines) / (Math.max(1, textUnits(text)) * 1.05);
  const byWord = width / (Math.max(0.5, longestUnbreakable(text)) * 1.05);
  return Math.round(Math.max(min, Math.min(max, byTotal, byWord)));
}

// Like fitFont, but measured with the real font (a canvas), for text that must never break inside
// a word: the largest size at which the longest word fits `width` and the whole text fits in
// `lines` lines. Call again once the web fonts have loaded for exact results.
let measureCtx;
export function fitText(text, width, { max, min, lines = 1, family = 'Barlow Semi Condensed', weight = 700 }) {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  measureCtx.font = `${weight} 100px "${family}", "Arial Narrow", sans-serif`;
  const w = (s) => measureCtx.measureText(s).width || 1;
  const longestWord = Math.max(...String(text).split(/\s+/).map(w));
  const size = Math.min(max, (width * 100) / longestWord, ((width * lines * 100) / w(text)) * 0.92);
  return Math.floor(Math.max(min, size));
}

// Match details as display text. Empty fields are simply left out.
export function matchText(m) {
  const side = m.homeAway === 'away' ? 'Away' : m.homeAway === 'home' ? 'Home' : '';
  return {
    kicker: [m.competition, m.round].filter(Boolean).join(' · '),
    vs: m.opponent ? `vs ${m.opponent}${side ? ` (${side})` : ''}` : '',
    when: [m.date, m.kickoff && `KO ${m.kickoff}`].filter(Boolean).join(' · '),
    venue: m.venue || '',
    side,
  };
}

// The opponent's badge, like the second crest on a matchday graphic: their uploaded logo, or a
// roundel in their colour with a short code ("ARS"). Empty when there is no opponent.
export const opponentCode = (m) =>
  (m.opponentShort || (m.opponent || '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 3)).toUpperCase().slice(0, 4);
export function opponentColors(m) {
  const bg = isHex(m.opponentColor || '') ? m.opponentColor : '#2a3042';
  return { bg, ink: luminance(bg) > 0.2 ? '#14161f' : '#ffffff' };
}
export function opponentBadge(m, size) {
  if (!m.opponent && !m.opponentLogo) return '';
  if (m.opponentLogo) return `<span class="obadge obadge--img" style="--s:${size}px"><img src="${esc(m.opponentLogo)}" alt=""></span>`;
  const c = opponentColors(m);
  return `<span class="obadge" style="--s:${size}px;--oc:${c.bg};--oc-ink:${c.ink}">${esc(opponentCode(m))}</span>`;
}

// How the manager photo is placed inside its frame (scale and offsets are percentages).
export const mgrTransform = (m) => `translate(${m.x}%, ${m.y}%) scale(${m.scale / 100})`;

// The club logo is used in two places: the crest on the side panel and the back of the cards.
// The built-in logo is a one-colour silhouette drawn with a CSS mask; an uploaded logo is shown
// as it is (full colour, original proportions).
export function applyLogo(stage) {
  const custom = store.getLogoUrl();
  const defaultUrl = new URL(asset(team.logo), document.baseURI).href;
  stage.style.setProperty('--logo', `url(${defaultUrl})`);
  if (custom) stage.style.setProperty('--logo-img', `url(${custom})`);
  else stage.style.removeProperty('--logo-img');
  stage.classList.toggle('has-logo-img', !!custom);
  const img = stage.querySelector('.crest__img');
  if (img) img.src = custom || '';
}
