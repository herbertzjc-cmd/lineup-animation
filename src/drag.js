import gsap from 'gsap';

// Pointer-based drag and drop. Anything with data-drag="tile|bench" and data-id can be
// picked up; a ghost tile follows the pointer and the .tile under it is the drop target.
export function initDrag({ root, ref, createGhost, onTarget, onDrop }) {
  const THRESHOLD = 6;
  let drag = null;
  let suppressClick = false;

  const targetAt = (x, y, selfId) =>
    document.elementsFromPoint(x, y).find((n) => n.matches?.('.tile[data-id]') && !n.classList.contains('tile--ghost') && n.dataset.id !== selfId)?.dataset.id ?? null;

  function moveGhost(e) {
    const r = ref.getBoundingClientRect();
    const k = 2000 / r.width; // client px -> reference px
    drag.ghost.style.left = `${(e.clientX - r.left) * k - 64}px`;
    drag.ghost.style.top = `${(e.clientY - r.top) * k - 95}px`;
  }

  function finish(e, cancelled) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    if (!d.active) return;
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    document.body.classList.remove('is-dragging');
    d.source.classList.remove('is-dragged');
    onTarget(null);
    const target = cancelled ? null : d.target;
    const ghost = d.ghost;
    gsap.to(ghost, { scale: 0.7, autoAlpha: 0, duration: 0.18, onComplete: () => ghost.remove() });
    if (target) onDrop(d.type, d.id, target);
  }

  root.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !root.classList.contains('is-live')) return;
    const source = e.target.closest('[data-drag]');
    if (!source) return;
    drag = { source, type: source.dataset.drag, id: source.dataset.id, x: e.clientX, y: e.clientY, pointerId: e.pointerId, active: false, ghost: null, target: null };
  });

  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.active) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < THRESHOLD) return;
      drag.active = true;
      drag.ghost = createGhost(drag.id);
      ref.append(drag.ghost);
      drag.source.classList.add('is-dragged');
      document.body.classList.add('is-dragging');
    }
    moveGhost(e);
    const target = targetAt(e.clientX, e.clientY, drag.id);
    if (target !== drag.target) {
      drag.target = target;
      onTarget(target);
    }
  });

  window.addEventListener('pointerup', (e) => finish(e, false));
  window.addEventListener('pointercancel', (e) => finish(e, true));
  // A drag ends with a click on the source; swallow it so it doesn't open details.
  root.addEventListener('click', (e) => {
    if (suppressClick) { e.stopPropagation(); e.preventDefault(); }
  }, true);
}
