import { h, esc } from '../../dom.js';
import * as store from '../../store.js';
import { readImage, readErrorMessage, IMAGE_ACCEPT, IMAGE_FORMATS_HINT } from '../../imageutil.js';
import { removeBackground } from '../../bgremove.js';
import { mgrTransform } from '../../branding.js';

// The "Team Settings" and "Manager Settings" sections of the editor. They edit a draft kept in
// this closure (pictures as Blobs); nothing is stored until the editor's Save is pressed, when
// the app calls read() and hands the result to store.saveBrand().

export function createBrandSections({ open = false } = {}) {
  const mgr0 = store.getManager();
  const d = {
    managerName: mgr0.isDefaultName ? '' : mgr0.name,
    logo: store.getImageBlob('logo'),
    original: store.getImageBlob('mgrOriginal'),
    cut: store.getImageBlob('mgrCut'),
    useCut: mgr0.useCut,
    hasAlpha: mgr0.hasAlpha,
    scale: mgr0.scale, x: mgr0.x, y: mgr0.y,
    changed: { logo: false, original: false, cut: false },
    busy: false,
  };
  d.teamName = store.getTeamName(); // an emptied box falls back to the default name

  const el = h('div', 'brand');
  el.innerHTML = `
    <details class="sect" data-anim${open ? ' open' : ''}>
      <summary>Team Settings</summary>
      <label class="field">Team Name<input name="teamName" value="${esc(d.teamName)}" maxlength="40" placeholder="Team name"></label>
      <div class="logo">
        <div class="logo__preview checker"><img alt="" hidden><span>Default<br>logo</span></div>
        <div>
          <label class="btn btn--ghost btn--sm">Upload Club Logo<input type="file" name="logoFile" accept="${IMAGE_ACCEPT}" hidden></label>
          <button class="btn btn--ghost btn--sm" type="button" data-logo-remove>Remove</button>
          <p class="view__sub">${IMAGE_FORMATS_HINT}. A transparent PNG looks best; the proportions are kept.</p>
          <p class="brand__error" data-logo-error></p>
        </div>
      </div>
    </details>
    <details class="sect" data-anim${open ? ' open' : ''}>
      <summary>Manager Settings</summary>
      <label class="field">Manager Name<input name="managerName" value="${esc(d.managerName)}" maxlength="40" placeholder="${esc(mgr0.isDefaultName ? mgr0.name : 'Manager name')}"></label>
      <div class="mgr">
        <div class="mgr__buttons">
          <label class="btn btn--ghost btn--sm">Upload Manager Photo<input type="file" name="mgrFile" accept="${IMAGE_ACCEPT}" hidden></label>
          <button class="btn btn--ghost btn--sm" type="button" data-mgr-remove>Remove</button>
          <button class="btn btn--sm" type="button" data-mgr-cut>Remove Background</button>
        </div>
        <p class="brand__status" aria-live="polite"></p>
        <div class="mgr__compare" hidden>
          <figure>
            <div class="checker"><img data-orig alt="Original"></div>
            <label class="radio"><input type="radio" name="mgrUse" value="orig"> Original</label>
          </figure>
          <figure>
            <div class="checker"><img data-cut alt="Cut-out"><span data-cut-empty>Not processed yet</span></div>
            <label class="radio"><input type="radio" name="mgrUse" value="cut"> Cut-out</label>
          </figure>
        </div>
        <div class="mgr__frame-wrap" hidden>
          <div class="mgr__frame checker"><img alt=""></div>
          <div class="mgr__sliders">
            <label class="slider"><span>Zoom</span><input type="range" name="mgrScale" min="50" max="250" step="1" value="${d.scale}"><output></output></label>
            <label class="slider"><span>Horizontal</span><input type="range" name="mgrX" min="-60" max="60" step="1" value="${d.x}"><output></output></label>
            <label class="slider"><span>Vertical</span><input type="range" name="mgrY" min="-60" max="60" step="1" value="${d.y}"><output></output></label>
            <button class="btn btn--ghost btn--sm" type="button" data-mgr-reset>Reset position</button>
          </div>
        </div>
      </div>
    </details>
  `;

  const $ = (sel) => el.querySelector(sel);
  const reading = { logo: 0, mgr: 0 }; // only the most recently chosen file counts
  const urls = {}; // object URLs of the draft pictures, revoked when replaced
  const urlOf = (key, blob) => {
    if (urls[key]?.blob === blob) return urls[key].url;
    if (urls[key]) URL.revokeObjectURL(urls[key].url);
    urls[key] = blob ? { blob, url: URL.createObjectURL(blob) } : null;
    return urls[key]?.url || '';
  };

  function paint() {
    // logo
    const logoUrl = urlOf('logo', d.logo);
    const logoImg = $('.logo__preview img');
    logoImg.hidden = !logoUrl;
    logoImg.src = logoUrl;
    $('.logo__preview span').hidden = !!logoUrl;
    $('[data-logo-remove]').disabled = !d.logo;

    // manager photo + comparison
    const hasPhoto = !!d.original;
    $('.mgr__compare').hidden = !hasPhoto;
    $('.mgr__frame-wrap').hidden = !hasPhoto;
    $('[data-mgr-remove]').disabled = !hasPhoto || d.busy;
    const cutBtn = $('[data-mgr-cut]');
    cutBtn.disabled = !hasPhoto || d.busy;
    cutBtn.textContent = d.cut ? 'Remove Background Again' : 'Remove Background';
    const origUrl = urlOf('orig', d.original);
    const cutUrl = urlOf('cut', d.cut);
    $('img[data-orig]').src = origUrl;
    const cutImg = $('img[data-cut]');
    cutImg.hidden = !cutUrl;
    cutImg.src = cutUrl;
    $('[data-cut-empty]').hidden = !!cutUrl;
    const useCut = d.useCut && !!d.cut;
    $('input[name=mgrUse][value=orig]').checked = !useCut;
    const cutRadio = $('input[name=mgrUse][value=cut]');
    cutRadio.checked = useCut;
    cutRadio.disabled = !d.cut;

    // placement preview, same transform as on the pitch screen
    const frameImg = $('.mgr__frame img');
    frameImg.src = useCut ? cutUrl : origUrl;
    frameImg.style.transform = mgrTransform(d);
    $('.mgr__frame').classList.toggle('mgr__frame--framed', !(useCut || d.hasAlpha));
    for (const [name, unit] of [['mgrScale', '%'], ['mgrX', '%'], ['mgrY', '%']]) {
      $(`[name=${name}]`).nextElementSibling.textContent = `${$(`[name=${name}]`).value}${unit}`;
    }
  }

  const status = (msg, isError = false) => {
    const s = $('.brand__status');
    s.textContent = msg;
    s.classList.toggle('is-error', isError);
  };

  $('[name=logoFile]').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const mine = ++reading.logo;
    $('[data-logo-error]').textContent = 'Reading the logo…';
    try {
      const { blob } = await readImage(file, 600);
      if (mine !== reading.logo) return;
      d.logo = blob;
      d.changed.logo = true;
      $('[data-logo-error]').textContent = '';
      paint();
    } catch (err) {
      if (mine !== reading.logo) return;
      console.warn('Could not read logo', err);
      $('[data-logo-error]').textContent = readErrorMessage(err);
    }
  });
  $('[data-logo-remove]').addEventListener('click', () => {
    d.logo = null;
    d.changed.logo = true;
    paint();
  });

  $('[name=mgrFile]').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const mine = ++reading.mgr;
    status('Reading the photo…');
    try {
      const { blob, hasAlpha } = await readImage(file, 1000);
      if (mine !== reading.mgr) return;
      d.original = blob;
      d.hasAlpha = hasAlpha;
      d.cut = null;
      d.useCut = false;
      d.scale = 100; d.x = 0; d.y = 0;
      $('[name=mgrScale]').value = 100; $('[name=mgrX]').value = 0; $('[name=mgrY]').value = 0;
      d.changed.original = true;
      d.changed.cut = true;
      status(hasAlpha ? 'Photo uploaded (transparent background detected).' : 'Photo uploaded. Use Remove Background for a cut-out portrait.');
      paint();
    } catch (err) {
      if (mine !== reading.mgr) return;
      console.warn('Could not read manager photo', err);
      status(readErrorMessage(err), true);
    }
  });
  $('[data-mgr-remove]').addEventListener('click', () => {
    d.original = null; d.cut = null; d.useCut = false; d.hasAlpha = false;
    d.changed.original = true; d.changed.cut = true;
    status('');
    paint();
  });
  $('[data-mgr-cut]').addEventListener('click', async () => {
    if (!d.original || d.busy) return;
    d.busy = true;
    paint();
    try {
      const out = await removeBackground(d.original, (m) => status(m));
      d.cut = out;
      d.useCut = true;
      d.changed.cut = true;
      status('Done. Compare the two and choose which one to use.');
    } catch (err) {
      console.warn('Background removal failed', err);
      status('Background removal failed (the model could not be loaded or run). You can keep using the original photo and try again.', true);
    } finally {
      d.busy = false;
      paint();
    }
  });
  el.querySelectorAll('input[name=mgrUse]').forEach((r) => r.addEventListener('change', () => {
    d.useCut = r.value === 'cut' && r.checked;
    paint();
  }));
  const syncSliders = () => {
    d.scale = Number($('[name=mgrScale]').value);
    d.x = Number($('[name=mgrX]').value);
    d.y = Number($('[name=mgrY]').value);
    paint();
  };
  el.querySelectorAll('.mgr__sliders input').forEach((i) => i.addEventListener('input', syncSliders));
  $('[data-mgr-reset]').addEventListener('click', () => {
    $('[name=mgrScale]').value = 100; $('[name=mgrX]').value = 0; $('[name=mgrY]').value = 0;
    syncSliders();
  });
  paint();

  // The edited values in the shape store.saveBrand() expects.
  function read() {
    return {
      teamName: $('[name=teamName]').value,
      managerName: $('[name=managerName]').value,
      logo: d.changed.logo ? d.logo : undefined,
      mgrOriginal: d.changed.original ? d.original : undefined,
      mgrCut: d.changed.cut ? d.cut : undefined,
      mgr: { useCut: d.useCut && !!d.cut, scale: d.scale, x: d.x, y: d.y, hasAlpha: d.hasAlpha },
    };
  }
  const cleanup = () => Object.values(urls).forEach((u) => u && URL.revokeObjectURL(u.url));
  return { el, read, cleanup, isBusy: () => d.busy };
}
