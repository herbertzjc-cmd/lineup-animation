// Dev-only playback bar, shown with ?dev=1. Press H to hide/show.
export function initControls(master, scenes, enabled) {
  const root = document.getElementById('controls');
  if (!enabled) {
    root.hidden = true;
    return;
  }

  root.innerHTML = `
    <button data-act="toggle">Play</button>
    <button data-act="restart">Restart</button>
    <span class="controls__scenes">
      ${scenes.map((s) => `<button data-seek="${s.label}">${s.text}</button>`).join('')}
    </span>
    <input type="range" min="0" max="1" step="0.0005" value="0" />
    <span class="controls__time">0.0 / ${master.duration().toFixed(1)}s</span>
  `;
  const toggle = root.querySelector('[data-act="toggle"]');
  const slider = root.querySelector('input');
  const time = root.querySelector('.controls__time');

  const sync = () => {
    toggle.textContent = master.paused() || master.progress() === 1 ? 'Play' : 'Pause';
  };
  const playPause = () => {
    if (master.progress() === 1) master.restart();
    else master.paused(!master.paused());
    sync();
  };

  root.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.act === 'toggle') playPause();
    else if (t.dataset.act === 'restart') { master.restart(); sync(); }
    else if (t.dataset.seek) { master.seek(t.dataset.seek).play(); sync(); }
  });
  slider.addEventListener('input', () => {
    master.pause();
    master.progress(Number(slider.value));
    sync();
  });
  master.eventCallback('onUpdate', () => {
    slider.value = master.progress();
    sync();
    time.textContent = `${master.time().toFixed(1)} / ${master.duration().toFixed(1)}s`;
  });
  sync();

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); playPause(); }
    else if (e.key === 'r') { master.restart(); sync(); }
    else if (e.key === 'h') root.hidden = !root.hidden;
  });
}
