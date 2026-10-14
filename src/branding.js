import * as store from './store.js';
import { asset, team } from './data.js';

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
