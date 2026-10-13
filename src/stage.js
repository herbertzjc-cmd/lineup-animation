export const STAGE_W = 1920;
export const STAGE_H = 1080;

// Scale the fixed 1920x1080 stage to fit the window, letterboxed and centred.
export function initStage() {
  const stage = document.getElementById('stage');

  function fit() {
    const s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  }

  window.addEventListener('resize', fit);
  fit();
  return stage;
}
