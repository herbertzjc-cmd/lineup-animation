import * as store from './store.js';
import { initDrag } from './drag.js';
import { createTile } from './components/playerTile.js';
import { readEditor } from './components/views/editor.js';

// Wires the pitch, panel and toolbar together once the intro has played.
export function initApp({ stage, ref, pitch, panel, toolbar }) {
  const ui = { view: 'idle', selectedId: null, swapFor: null, picking: null, editing: null };
  let live = false;

  function cancelPicking() {
    if (!ui.picking) return;
    ui.picking = null;
    pitch.setPicking(false);
    toolbar.setHint();
  }

  function closePanel() {
    cancelPicking();
    Object.assign(ui, { view: 'idle', selectedId: null, swapFor: null, editing: null });
    pitch.setSelected(null);
    toolbar.setActive(null);
    panel.hide();
  }

  function openDetail(id) {
    cancelPicking();
    Object.assign(ui, { view: 'detail', selectedId: id, swapFor: null, editing: null });
    pitch.setSelected(id);
    toolbar.setActive(null);
    panel.show('detail', { id });
  }

  function openBench(swapFor = null) {
    cancelPicking();
    Object.assign(ui, { view: 'bench', selectedId: swapFor, swapFor, editing: null });
    pitch.setSelected(swapFor);
    toolbar.setActive('bench');
    panel.show('bench', { swapFor });
  }

  function openList() {
    cancelPicking();
    Object.assign(ui, { view: 'list', selectedId: null, swapFor: null, editing: null });
    pitch.setSelected(null);
    toolbar.setActive('list');
    panel.show('list');
  }

  function openEditor(id) {
    cancelPicking();
    Object.assign(ui, { view: 'editor', selectedId: id, swapFor: null, editing: id });
    pitch.setSelected(id);
    toolbar.setActive(null);
    panel.show('editor', { id });
  }

  function startPicking(id) {
    const p = store.player(id);
    ui.picking = id;
    pitch.setPicking(true);
    toolbar.setHint(`Click a player on the pitch to replace with #${p.number} ${p.name} · Esc to cancel`);
  }

  // Put bench player `benchId` into the slot held by starter `starterId`.
  function doSwap(starterId, benchId) {
    const slot = store.slotOf(starterId);
    if (slot < 0 || store.slotOf(benchId) >= 0) return;
    store.replaceSlot(slot, benchId);
    pitch.replace(slot, starterId, benchId).eventCallback('onComplete', () => pitch.setSelected(benchId));
    openDetail(benchId);
  }

  function handleDrop(type, id, targetId) {
    if (type === 'bench') doSwap(targetId, id);
    else {
      store.swapSlots(store.slotOf(id), store.slotOf(targetId));
      pitch.layout();
    }
  }

  function save() {
    const form = panel.content.querySelector('.editor');
    const values = readEditor(form);
    if (!values) return;
    const p = store.upsertPlayer(ui.editing ? { id: ui.editing, ...values } : values);
    if (store.slotOf(p.id) >= 0) pitch.refresh(p.id);
    openDetail(p.id);
  }

  const actions = {
    close: closePanel,
    select: ({ id }) => openDetail(id),
    pick: ({ id }) => (ui.swapFor ? doSwap(ui.swapFor, id) : openDetail(id)),
    substitute: ({ id }) => openBench(id),
    'swap-in': ({ id }) => startPicking(id),
    edit: ({ id }) => openEditor(id),
    new: () => openEditor(null),
    cancel: () => (ui.editing ? openDetail(ui.editing) : closePanel()),
    save,
    delete: ({ id }) => { store.removePlayer(id); openBench(); },
    formation: ({ f }) => { store.setFormation(f); toolbar.setFormation(f); pitch.layout(); },
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
  toolbar.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (b) dispatch(b.dataset.action, b.dataset);
  });

  // Players on the pitch, and click-away to close.
  stage.addEventListener('click', (e) => {
    if (!live) return;
    const tile = e.target.closest('.tile[data-id]');
    if (tile) {
      if (ui.picking) doSwap(tile.dataset.id, ui.picking);
      else openDetail(tile.dataset.id);
    } else if (!e.target.closest('.fref__panel, .ftool')) {
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
  window.addEventListener('keydown', (e) => {
    if (live && e.key === 'Escape') (ui.picking ? cancelPicking : closePanel)();
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

  return {
    goLive() {
      live = true;
      stage.classList.add('is-live');
    },
  };
}
