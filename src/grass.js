// The "Grass" pitch: a realistic turf painted once onto a canvas (2000x1123 reference px, the same
// frame as the pitch SVG). Painting it once and showing it as a bitmap keeps the camera moves of
// the intro cheap, where a live SVG texture would be re-rendered on every frame.
//
// Layers: soft shadow under the pitch, a base green that is deeper in the distance and brighter
// close to the camera, mowing stripes that widen towards the viewer (perspective), fine grain and
// blade streaks, a floodlight pool in the middle and darker edges. White markings are drawn on top
// by the pitch SVG.

// The grass area is a little larger than the marked pitch (run-off around the lines).
const TOP = 112, BOTTOM = 1123;
const TL = 214, TR = 1429, BL = -150, BR = 1793;
const xAt = (y, a, b) => a + ((b - a) * (y - TOP)) / (BOTTOM - TOP);

function trapezoid(ctx) {
  ctx.beginPath();
  ctx.moveTo(TL, TOP);
  ctx.lineTo(TR, TOP);
  ctx.lineTo(BR, BOTTOM);
  ctx.lineTo(BL, BOTTOM);
  ctx.closePath();
}

// A small tile of random grain, repeated over the whole pitch.
function grainTile(size, alpha, seed) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rnd() < 0.5 ? 0 : 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = Math.round(rnd() * alpha);
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Short, mostly upright strokes like blades of grass (shorter in the distance).
function blades(ctx) {
  let s = 7;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  ctx.lineWidth = 1;
  for (let i = 0; i < 26000; i++) {
    const y = TOP + rnd() * (BOTTOM - TOP);
    const x = xAt(y, TL, BL) + rnd() * (xAt(y, TR, BR) - xAt(y, TL, BL));
    const depth = (y - TOP) / (BOTTOM - TOP); // 0 far, 1 near
    const len = 1.5 + depth * 4 * rnd();
    ctx.strokeStyle = rnd() < 0.55 ? 'rgba(10, 40, 10, 0.16)' : 'rgba(190, 235, 150, 0.10)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 1.6, y - len);
    ctx.stroke();
  }
}

export function paintGrass(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // shadow of the pitch on the stadium floor
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 10;
  trapezoid(ctx);
  ctx.fillStyle = '#2f6e2b';
  ctx.fill();
  ctx.restore();

  ctx.save();
  trapezoid(ctx);
  ctx.clip();

  // base colour: deeper and slightly bluer far away, warmer and brighter close up
  const base = ctx.createLinearGradient(0, TOP, 0, BOTTOM);
  base.addColorStop(0, '#2c6a2e');
  base.addColorStop(0.45, '#3a8536');
  base.addColorStop(1, '#4b9a3e');
  ctx.fillStyle = base;
  ctx.fillRect(-200, TOP, 2400, BOTTOM - TOP);

  // mowing stripes parallel to the goal line, wider towards the camera
  const bands = 16;
  const yAt = (t) => TOP + (BOTTOM - TOP) * (0.42 * t + 0.58 * t * t);
  for (let i = 0; i < bands; i++) {
    const y0 = yAt(i / bands);
    const y1 = yAt((i + 1) / bands);
    ctx.fillStyle = i % 2 ? 'rgba(255, 255, 240, 0.075)' : 'rgba(0, 30, 0, 0.06)';
    ctx.fillRect(-200, y0, 2400, y1 - y0 + 0.5);
  }

  // grain and blades
  ctx.fillStyle = ctx.createPattern(grainTile(256, 34, 12345), 'repeat');
  ctx.fillRect(-200, TOP, 2400, BOTTOM - TOP);
  blades(ctx);

  // floodlight pool in the middle, darker towards the edges and the far end
  const pool = ctx.createRadialGradient(820, 640, 40, 820, 640, 1100);
  pool.addColorStop(0, 'rgba(255, 255, 225, 0.16)');
  pool.addColorStop(0.45, 'rgba(255, 255, 225, 0.05)');
  pool.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = pool;
  ctx.fillRect(-200, TOP, 2400, BOTTOM - TOP);
  const far = ctx.createLinearGradient(0, TOP, 0, TOP + 260);
  far.addColorStop(0, 'rgba(0, 10, 0, 0.32)');
  far.addColorStop(1, 'rgba(0, 10, 0, 0)');
  ctx.fillStyle = far;
  ctx.fillRect(-200, TOP, 2400, 260);
  ctx.restore();
}
