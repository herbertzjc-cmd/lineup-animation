import * as store from './store.js';
import { initDrag } from './drag.js';
import { createTile } from './components/playerTile.js';
import { readEditor } from './components/views/editor.js';
import { applyTheme } from './theme.js';
import { applyLogo } from './branding.js';
import { exportLineup } from './export.js';

// Wires the pitch, panel and toolbar together once the intro has played.
export function initApp({ stage, ref, pitch, panel, toolbar, intro, sheet }) {
  const ui = { view: 'idle', selectedId: null, swapFor: null, picking: null, editing: null };
  let live = false;
  const api = { onPlay: null };

  // The selected player is highlighted on the pitch or, for a substitute, in the strip.
  function select(id) {
    pitch.setSelected(id);
    sheet.setSelected(id);
  }

  function cancelPicking() {
    if (!ui.picking) return;
    ui.picking = null;
    pitch.setPicking(false);
    sheet.setSelected(ui.selectedId);
    toolbar.setHint();
  }

  function closePanel() {
    cancelPicking();
    Object.assign(ui, { view: 'idle', selectedId: null, swapFor: null, editing: null });
    select(null);
    toolbar.setActive(null);
    panel.hide();
  }

  function openDetail(id) {
    cancelPicking();
    Object.assign(ui, { view: 'detail', selectedId: id, swapFor: null, editing: null });
    select(id);
    toolbar.setActive(null);
    panel.show('detail', { id });
  }

  function openBench(swapFor = null) {
    cancelPicking();
    Object.assign(ui, { view: 'bench', selectedId: swapFor, swapFor, editing: null });
    select(swapFor);
    toolbar.setActive('bench');
    panel.show('bench', { swapFor });
  }

  function openList() {
    cancelPicking();
    Object.assign(ui, { view: 'list', selectedId: null, swapFor: null, editing: null });
    select(null);
    toolbar.setActive('list');
    panel.show('list');
  }

  function openEditor(id) {
    cancelPicking();
    Object.assign(ui, { view: 'editor', selectedId: id, swapFor: null, editing: id });
    select(id);
    toolbar.setActive(null);
    panel.show('editor', { id });
  }

  function openTeamEditor() {
    cancelPicking();
    Object.assign(ui, { view: 'editor', selectedId: null, swapFor: null, editing: null });
    select(null);
    toolbar.setActive(null);
    panel.show('editor', { mode: 'team' });
  }

  function startPicking(id) {
    const p = store.player(id);
    ui.picking = id;
    pitch.setPicking(true);
    sheet.setSelected(id);
    toolbar.setHint(`Click a player on the pitch to replace with #${p.number} ${p.name} · Esc to cancel`);
  }

  // Put bench player `benchId` into the slot held by starter `starterId`.
  function doSwap(starterId, benchId) {
    const slot = store.slotOf(starterId);
    if (slot < 0 || store.slotOf(benchId) >= 0) return;
    store.replaceSlot(slot, benchId);
    pitch.replace(slot, starterId, benchId).eventCallback('onComplete', () => pitch.setSelected(benchId));
    sheet.refresh();
    openDetail(benchId);
  }

  function handleDrop(type, id, targetId) {
    if (type === 'bench') doSwap(targetId, id);
    else {
      store.swapSlots(store.slotOf(id), store.slotOf(targetId));
      pitch.layout();
    }
  }

  // Team name, club logo and manager details changed in the editor: refresh everything that shows them.
  async function applyBrand(form) {
    if (!form._brand) return;
    try {
      await store.saveBrand(form._brand.read());
    } catch (e) {
      console.warn('Could not save team settings', e);
    }
    intro.refresh();
    panel.refreshBrand();
    applyLogo(stage);
  }

  async function save() {
    const form = panel.content.querySelector('.editor');
    if (!form) return;
    if (form._brand?.isBusy()) return; // background removal is still running
    if (form.dataset.mode === 'team') {
      await applyBrand(form);
      if (form._match) {
        const r = form._match.read();
        store.saveMatch(r.match);
        store.setSetting('introMode', r.introMode);
        intro.refresh();
        panel.refreshBrand();
      }
      closePanel();
      return;
    }
    const values = readEditor(form);
    if (!values) return;
    await applyBrand(form);
    const prevCaptain = store.captainId();
    const p = store.upsertPlayer(ui.editing ? { id: ui.editing, ...values } : values);
    if (store.slotOf(p.id) >= 0) pitch.refresh(p.id);
    // the captaincy moved: redraw the card that lost it
    const nowCaptain = store.captainId();
    if (prevCaptain && prevCaptain !== nowCaptain && store.slotOf(prevCaptain) >= 0) pitch.refresh(prevCaptain);
    sheet.refresh();
    openDetail(p.id);
    if (store.storageIsFull()) {
      toolbar.setHint('The browser storage is full, so this change may be lost on refresh. Remove unused photos or players to free space.');
    }
  }

  function setPitchTheme(v) {
    store.setSetting('pitchTheme', v);
    stage.classList.toggle('pitch-dark', v === 'dark');
    toolbar.setPitchTheme(v);
  }
  setPitchTheme(store.getSettings().pitchTheme);

  function setColor(hex) {
    store.setColor(hex);
    applyTheme(stage, hex);
    toolbar.setColor(hex);
  }
  applyTheme(stage, store.getColor());
  toolbar.setColor(store.getColor());
  toolbar.onColor = (hex) => live && setColor(hex);

  const actions = {
    play: () => api.onPlay?.(),
    'toggle-theme': () => toolbar.toggleTheme(),
    color: ({ c }) => setColor(c),
    close: closePanel,
    select: ({ id }) => openDetail(id),
    pick: ({ id }) => (ui.swapFor ? doSwap(ui.swapFor, id) : openDetail(id)),
    substitute: ({ id }) => openBench(id),
    'swap-in': ({ id }) => startPicking(id),
    edit: ({ id }) => openEditor(id),
    new: () => openEditor(null),
    team: () => openTeamEditor(),
    cancel: () => (ui.editing ? openDetail(ui.editing) : closePanel()),
    save,
    delete: ({ id }) => { store.removePlayer(id); sheet.refresh(); openBench(); },
    formation: ({ f }) => { store.setFormation(f); toolbar.setFormation(f); pitch.layout(); panel.refreshBrand(); },
    'toggle-export': () => toolbar.toggleExport(),
    export: ({ r }) => { toolbar.closeTheme(); exportLineup(r, stage); },
    'pitch-theme': ({ v }) => setPitchTheme(v),
    'toggle-list': () => (ui.view === 'list' ? closePanel() : openList()),
    'toggle-bench': () => (ui.view === 'bench' && !ui.swapFor ? closePanel() : openBench()),
    reset: () => {
      if (window.confirm('Reset the lineup and remove custom players?')) {
        store.reset();
        location.reload();
      }
    },
  };
  const dispatch = (name, data) => live && actions[name]?.(data);
  panel.onAction = dispatch;
  panel.onToggle = (open) => pitch.setShifted(open);
  // the toolbar and the substitutes strip both use data-action buttons
  for (const bar of [toolbar.el, sheet.el]) {
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (b) dispatch(b.dataset.action, b.dataset);
    });
  }

  // Players on the pitch, and click-away to close.
  stage.addEventListener('click', (e) => {
    if (!live) return;
    const tile = e.target.closest('.tile[data-id]');
    if (tile) {
      if (ui.picking) doSwap(tile.dataset.id, ui.picking);
      else openDetail(tile.dataset.id);
    } else if (!e.target.closest('.fref__panel, .ftool, .fsheet')) {
      toolbar.closeTheme();
      if (ui.picking) cancelPicking();
      else if (ui.view !== 'idle') closePanel();
    }
  });
  stage.addEventListener('keydown', (e) => {
    if (live && (e.key === 'Enter' || e.key === ' ') && e.target.matches('.tile')) {
      e.preventDefault();
      openDetail(e.target.dataset.id);
    }
  });
  // H hides every control (toolbar, hints) so the lineup can be screen-captured or streamed clean.
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'h' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    stage.classList.toggle('is-clean');
  });
  window.addEventListener('keydown', (e) => {
    if (live && e.key === 'Escape') {
      toolbar.closeTheme();
      (ui.picking ? cancelPicking : closePanel)();
    }
  });

  initDrag({
    root: stage,
    ref,
    createGhost: (id) => {
      const g = createTile(store.player(id));
      g.classList.add('tile--ghost');
      g.removeAttribute('data-drag');
      g.style.visibility = 'visible';
      return g;
    },
    onTarget: (id) => pitch.setDrop(id),
    onDrop: handleDrop,
  });

  return Object.assign(api, {
    // Interaction is only allowed once the whole intro has played.
    goLive() {
      live = true;
      stage.classList.add('is-live');
    },
    lock() {
      live = false;
      stage.classList.remove('is-live');
      Object.assign(ui, { view: 'idle', selectedId: null, swapFor: null, picking: null, editing: null });
    },
  });
}
