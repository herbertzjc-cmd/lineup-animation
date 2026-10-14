import gsap from 'gsap';
import { h, esc } from '../../dom.js';
import { POSITIONS, DEFAULT_POP, popOf } from '../../data.js';
import * as store from '../../store.js';
import { createTile, showPopNow } from '../playerTile.js';
import { enterView, exitView } from './common.js';
import { createBrandSections } from './brandSections.js';
import { readImage, blobToDataUrl, readErrorMessage, IMAGE_ACCEPT, IMAGE_FORMATS_HINT } from '../../imageutil.js';

// Read an uploaded photo (any common format), shrink it so it fits comfortably in localStorage
// and note whether it has a transparent background (a cut-out) - only those can step out of the card.
async function readPhoto(file) {
  const { blob, hasAlpha } = await readImage(file, 450, 0.85);
  return { url: await blobToDataUrl(blob), alpha: hasAlpha };
}

const slider = (name, label, min, max, value, unit) => `
  <label class="slider"><span>${label}</span>
    <input type="range" name="${name}" min="${min}" max="${max}" step="1" value="${value}">
    <output>${value}${unit}</output></label>`;

// "Team & Manager" on its own (opened from the toolbar): just the two settings sections.
function renderTeam() {
  const el = h('div', 'view editor editor--team');
  el.dataset.mode = 'team';
  el.innerHTML = `
    <button class="close" data-action="cancel" aria-label="Close">×</button>
    <h2 class="view__title" data-anim>TEAM</h2>
    <div class="editor__scroll"></div>
    <div class="detail__actions" data-anim>
      <button class="btn" data-action="save">Save</button>
      <button class="btn btn--ghost" data-action="cancel">Cancel</button>
    </div>
  `;
  el._brand = createBrandSections({ open: true });
  el.querySelector('.editor__scroll').append(el._brand.el);
  return el;
}

function render({ id, mode } = {}) {
  if (mode === 'team') return renderTeam();
  const p = (id && store.player(id)) || { number: '', fullName: '', name: '', position: 'CM', nationality: '', age: '' };
  const pop = popOf(p);
  const el = h('div', 'view editor');
  el._photo = p.photo || '';
  el._alpha = p.photoAlpha;
  el._cartoon = p.cartoon || ''; // the player's own cartoon image, if any (not editable here)
  el.innerHTML = `
    <button class="close" data-action="cancel" aria-label="Close">×</button>
    <h2 class="view__title" data-anim>${id ? 'EDIT PLAYER' : 'NEW PLAYER'}</h2>
    <div class="editor__scroll">
      <div class="editor__photo" data-anim>
        <div class="editor__cardprev"></div>
        <div>
          <label class="btn btn--ghost btn--sm">Upload photo<input type="file" name="photoFile" accept="${IMAGE_ACCEPT}" hidden></label>
          <button class="btn btn--ghost btn--sm" type="button" data-clear-photo>Remove</button>
          <label class="field editor__avatar">Show on the card
            <select name="avatar"><option value="cartoon">Cartoon figure</option><option value="photo">Photo</option></select>
          </label>
          <p class="view__sub">${IMAGE_FORMATS_HINT}. Transparent PNG / WebP cut-outs work best.</p>
          <p class="editor__note"></p>
        </div>
      </div>
      <label class="field" data-anim>Full name<input name="fullName" value="${esc(p.fullName)}" maxlength="40"></label>
      <label class="field" data-anim>Name on card<input name="name" value="${esc(p.name)}" maxlength="14" placeholder="Defaults to last name"></label>
      <div class="field-row" data-anim>
        <label class="field">Number<input name="number" type="number" min="1" max="99" value="${esc(p.number)}"></label>
        <label class="field">Position<select name="position">${POSITIONS.map((o) => `<option${o === p.position ? ' selected' : ''}>${o}</option>`).join('')}</select></label>
        <label class="field">Age<input name="age" type="number" min="14" max="60" value="${esc(p.age)}"></label>
      </div>
      <label class="field" data-anim>Nationality<input name="nationality" value="${esc(p.nationality)}" maxlength="30"></label>
      <label class="switch" data-anim>
        <input type="checkbox" name="special"${p.special ? ' checked' : ''}><span class="switch__track"></span>
        <span>Special Player<small>Gold flash-card entrance, animated gold frame and a holographic sheen</small></span>
      </label>
      <div class="pop" data-anim>
        <label class="switch">
          <input type="checkbox" name="popOn"${pop.on ? ' checked' : ''}><span class="switch__track"></span>
          <span>3D Player Pop-Out<small>After the flip the player steps out of the card</small></span>
        </label>
        ${slider('popScale', 'Size', 60, 160, pop.scale, '%')}
        ${slider('popX', 'Horizontal', -40, 40, pop.x, '%')}
        ${slider('popY', 'Vertical', -40, 40, pop.y, '%')}
        ${slider('popDepth', 'Pop depth', 0, 100, pop.depth, '')}
        <button class="btn btn--ghost btn--sm" type="button" data-reset-pop>Reset position</button>
      </div>
      <p class="editor__error" role="alert"></p>
    </div>
    <div class="detail__actions" data-anim>
      <button class="btn" data-action="save">Save</button>
      <button class="btn btn--ghost" data-action="cancel">Cancel</button>
    </div>
  `;

  // Team Settings and Manager Settings come first, above the player's own fields.
  el._brand = createBrandSections({ open: false });
  el.querySelector('.editor__scroll').prepend(el._brand.el);

  const $ = (n) => el.querySelector(`[name=${n}]`);
  $('avatar').value = p.avatar === 'photo' && p.photo ? 'photo' : 'cartoon';
  const note = el.querySelector('.editor__note');
  const prevBox = el.querySelector('.editor__cardprev');

  // The player as currently entered in the form (before saving).
  const draft = () => {
    const fullName = $('fullName').value.trim();
    return {
      id: 'preview',
      fullName: fullName || 'Player Name',
      name: $('name').value.trim() || fullName.split(/\s+/).slice(-1)[0] || 'Name',
      number: Number($('number').value) || '',
      position: $('position').value,
      nationality: $('nationality').value.trim(),
      avatar: $('avatar').value,
      cartoon: el._cartoon,
      photo: el._photo || '',
      photoAlpha: el._photo ? el._alpha : undefined,
      special: $('special').checked,
      pop: popValues(),
    };
  };
  const popValues = () => ({
    on: $('popOn').checked,
    scale: Number($('popScale').value),
    x: Number($('popX').value),
    y: Number($('popY').value),
    depth: Number($('popDepth').value),
  });

  // Live preview: the card as it will look once the figure has stepped out.
  const paint = () => {
    const d = draft();
    prevBox.replaceChildren();
    const tile = createTile(d, { revealed: true });
    tile.removeAttribute('data-drag');
    tile.style.left = '11px';
    tile.style.top = '84px';
    tile.style.pointerEvents = 'none';
    gsap.set(tile, { autoAlpha: 1 });
    prevBox.append(tile);
    showPopNow(tile);
    $('avatar').querySelector('[value=photo]').disabled = !el._photo; // nothing to show without a photo
    if (!el._photo) $('avatar').value = 'cartoon';
    note.textContent = d.avatar === 'photo' && d.photo && d.photoAlpha === false
      ? 'No transparent background found, so the pop-out is switched off for this photo. Use a cut-out PNG or WebP.'
      : '';
    $('popDepth').disabled = !d.pop.on;
    for (const [name, unit] of [['popScale', '%'], ['popX', '%'], ['popY', '%'], ['popDepth', '']]) {
      $(name).nextElementSibling.textContent = `${$(name).value}${unit}`;
    }
  };
  paint();
  el.addEventListener('input', paint);
  el.addEventListener('change', paint);

  let reading = 0; // only the most recently chosen file counts (a big HEIC may finish late)
  $('photoFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // so choosing the same file again still fires a change
    if (!file) return;
    const mine = ++reading;
    note.textContent = 'Reading the photo…';
    try {
      const { url, alpha } = await readPhoto(file);
      if (mine !== reading) return;
      el._photo = url;
      el._alpha = alpha;
      $('avatar').querySelector('[value=photo]').disabled = false;
      $('avatar').value = 'photo'; // you just uploaded it: show it
      el.querySelector('.editor__error').textContent = '';
      paint();
    } catch (err) {
      if (mine !== reading) return;
      console.warn('Could not read photo', err);
      note.textContent = '';
      el.querySelector('.editor__error').textContent = readErrorMessage(err);
    }
  });
  el.querySelector('[data-clear-photo]').addEventListener('click', () => {
    el._photo = '';
    el._alpha = undefined;
    $('avatar').value = 'cartoon';
    paint();
  });
  el.querySelector('[data-reset-pop]').addEventListener('click', () => {
    $('popScale').value = DEFAULT_POP.scale;
    $('popX').value = DEFAULT_POP.x;
    $('popY').value = DEFAULT_POP.y;
    $('popDepth').value = DEFAULT_POP.depth;
    paint();
  });
  return el;
}

// Returns the cleaned values, or null (after showing a message) if the form is invalid.
export function readEditor(el) {
  const f = (n) => el.querySelector(`[name=${n}]`).value.trim();
  const err = (msg) => { el.querySelector('.editor__error').textContent = msg; return null; };
  const fullName = f('fullName');
  if (!fullName) return err('Please enter a name.');
  const number = Number(f('number'));
  if (!Number.isInteger(number) || number < 1 || number > 99) return err('Shirt number must be 1–99.');
  const age = f('age');
  const num = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(f(n)) || 0));
  return {
    fullName,
    name: f('name') || fullName.split(/\s+/).slice(-1)[0],
    number,
    position: f('position'),
    nationality: f('nationality'),
    age: age ? Number(age) : '',
    avatar: el._photo && el.querySelector('[name=avatar]').value === 'photo' ? 'photo' : 'cartoon',
    photo: el._photo || '',
    photoAlpha: el._photo ? el._alpha : undefined,
    special: el.querySelector('[name=special]').checked,
    pop: {
      on: el.querySelector('[name=popOn]').checked,
      scale: num('popScale', 60, 160),
      x: num('popX', -40, 40),
      y: num('popY', -40, 40),
      depth: num('popDepth', 0, 100),
    },
  };
}

export default { render, enter: enterView, exit: exitView };
