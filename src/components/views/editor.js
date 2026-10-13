import { h, esc } from '../../dom.js';
import { asset, POSITIONS } from '../../data.js';
import * as store from '../../store.js';
import { enterView, exitView } from './common.js';

// Shrink an uploaded image so it fits comfortably in localStorage.
async function fileToDataUrl(file, maxW = 360, maxH = 450) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, maxW / bmp.width, maxH / bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * s);
  canvas.height = Math.round(bmp.height * s);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.85); // keeps transparency; falls back to PNG
}

function render({ id } = {}) {
  const p = (id && store.player(id)) || { number: '', fullName: '', name: '', position: 'CM', nationality: '', age: '' };
  const el = h('div', 'view editor');
  el._photo = p.photo || '';
  el.innerHTML = `
    <button class="close" data-action="cancel" aria-label="Close">×</button>
    <h2 class="view__title" data-anim>${id ? 'EDIT PLAYER' : 'NEW PLAYER'}</h2>
    <div class="editor__photo" data-anim>
      <div class="editor__preview"></div>
      <div>
        <label class="btn btn--ghost btn--sm">Upload photo<input type="file" accept="image/*" hidden></label>
        <button class="btn btn--ghost btn--sm" type="button" data-clear-photo>Remove</button>
        <p class="view__sub">Transparent PNG cut-outs look best.</p>
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
    <p class="editor__error" role="alert"></p>
    <div class="detail__actions" data-anim>
      <button class="btn" data-action="save">Save</button>
      <button class="btn btn--ghost" data-action="cancel">Cancel</button>
    </div>
  `;

  const preview = el.querySelector('.editor__preview');
  const paint = () => {
    preview.style.backgroundImage = el._photo ? `url("${asset(el._photo)}")` : '';
    preview.classList.toggle('has-photo', !!el._photo);
  };
  paint();
  el.querySelector('input[type=file]').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      el._photo = await fileToDataUrl(file);
      paint();
    } catch {
      el.querySelector('.editor__error').textContent = 'Could not read that image.';
    }
  });
  el.querySelector('[data-clear-photo]').addEventListener('click', () => { el._photo = ''; paint(); });
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
  return {
    fullName,
    name: f('name') || fullName.split(/\s+/).slice(-1)[0],
    number,
    position: f('position'),
    nationality: f('nationality'),
    age: age ? Number(age) : '',
    photo: el._photo || '',
  };
}

export default { render, enter: enterView, exit: exitView };
