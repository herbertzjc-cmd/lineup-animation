import * as store from './store.js';
import { asset, team } from './data.js';

// Rough text width in em: CJK characters are about a full em wide, Latin letters about half.
function textUnits(text) {
  let u = 0;
  for (const ch of text) u += /[⺀-鿿가-힯＀-￯]/.test(ch) ? 1 : 0.52;
  return u;
}

// A font size that makes `text` fit `width` px on `lines` lines, between `min` and `max`.
export function fitFont(text, width, { max, min, lines = 1 }) {
  const units = Math.max(1, textUnits(text));
  return Math.round(Math.max(min, Math.min(max, (width * lines) / (units * 1.05))));
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
