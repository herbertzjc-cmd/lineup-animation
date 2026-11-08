// Export a still "team sheet" PNG of the current lineup in three sizes: 16:9 (1920x1080), 1:1
// (1080x1080) and 9:16 (1080x1920, for stories). It is drawn on a canvas from the same data as the
// page: team name and logo, match details, the XI in formation (goalkeeper at the bottom), the
// substitutes and the manager. The animation itself stays 16:9; this is the shareable still.
import * as store from './store.js';
import { asset, portraitSrc } from './data.js';
import { cartoonSvg } from './cartoon.js';
import { matchText, opponentCode, opponentColors } from './branding.js';

const SIZES = { '16x9': [1920, 1080], '1x1': [1080, 1080], '9x16': [1080, 1920] };
const HEAD = '"Barlow Semi Condensed", "Arial Narrow", "PingFang SC", sans-serif';
const BODY = 'Montserrat, Arial, "PingFang SC", sans-serif';

// --- small helpers ---------------------------------------------------------------------------
const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (hex, other, t) => {
  const a = hexToRgb(hex);
  const b = hexToRgb(other);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
};
const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Largest font size (<= size) at which `text` fits `maxW`.
function fit(ctx, text, family, size, maxW, weight = 700) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (s > 8 && ctx.measureText(text).width > maxW) {
    s -= 1;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

// The player's figure as an image: their photo, or the cartoon with the team colours filled in
// (an SVG drawn into a canvas cannot see the page's CSS variables).
async function figureOf(p, col) {
  const src = portraitSrc(p);
  if (src) {
    try { return await loadImage(asset(src)); } catch { /* fall back to the cartoon */ }
  }
  const svg = cartoonSvg(p)
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replaceAll('var(--primary-ink)', col.ink)
    .replaceAll('var(--on-primary)', col.on)
    .replaceAll('var(--primary)', col.primary);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try { return await loadImage(url); } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

function drawCard(ctx, p, fig, x, y, w, col) {
  const h = Math.round(w * 1.49);
  const r = w * 0.08;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.35)';
  ctx.shadowBlur = w * 0.12;
  ctx.shadowOffsetY = w * 0.05;
  roundRect(ctx, x, y, w, h, r);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, col.hi);
  g.addColorStop(0.5, col.primary);
  g.addColorStop(1, col.dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  // figure, bottom-aligned
  const fh = h * 1.02;
  const fw = (fig.naturalWidth / fig.naturalHeight) * fh;
  ctx.drawImage(fig, x + (w - fw) / 2, y + h - fh, fw, fh);
  // fade behind the name
  const fade = ctx.createLinearGradient(0, y + h * 0.62, 0, y + h);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, col.darkFade);
  ctx.fillStyle = fade;
  ctx.fillRect(x, y + h * 0.62, w, h * 0.38);
  ctx.restore();

  ctx.fillStyle = col.on;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,.45)';
  ctx.shadowBlur = 6;
  ctx.font = `700 ${Math.round(w * 0.32)}px ${HEAD}`;
  ctx.fillText(String(p.number), x + w * 0.07, y + w * 0.04);
  ctx.font = `700 ${Math.round(w * 0.085)}px ${BODY}`;
  ctx.fillText(p.position || '', x + w * 0.09, y + w * 0.38);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const ns = fit(ctx, p.name, BODY, Math.round(w * 0.13), w * 0.9);
  ctx.font = `700 ${ns}px ${BODY}`;
  ctx.fillText(p.name, x + w / 2, y + h - w * 0.08);
  ctx.shadowBlur = 0;
  if (p.captain) {
    const cr = w * 0.09;
    ctx.beginPath();
    ctx.arc(x + w - cr * 1.6, y + cr * 1.6, cr, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `700 ${Math.round(cr * 1.2)}px ${BODY}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('C', x + w - cr * 1.6, y + cr * 1.65);
    ctx.textBaseline = 'alphabetic';
  }
  return h;
}

// The XI in formation inside a box: goalkeeper at the bottom, forwards at the top.
async function drawFormation(ctx, box, col) {
  const counts = store.formationCounts();
  const ids = store.slots();
  const rows = [];
  let i = 0;
  for (const n of counts) { rows.push(ids.slice(i, i + n)); i += n; }
  const widest = Math.max(...counts);
  const gap = box.w * 0.025;
  const cardW = Math.min((box.w - gap * (widest - 1)) / widest, ((box.h - gap * (rows.length - 1)) / rows.length) / 1.49);
  const cardH = cardW * 1.49;
  const rowStep = rows.length > 1 ? (box.h - cardH) / (rows.length - 1) : 0;
  const figs = await Promise.all(ids.map((id) => figureOf(store.player(id), col)));
  const figOf = new Map(ids.map((id, k) => [id, figs[k]]));
  rows.forEach((row, r) => {
    const y = box.y + box.h - cardH - r * rowStep;
    const rowW = row.length * cardW + (row.length - 1) * gap;
    row.forEach((id, k) => drawCard(ctx, store.player(id), figOf.get(id), box.x + (box.w - rowW) / 2 + k * (cardW + gap), y, cardW, col));
  });
}

// Words wrapped to `maxW`; returns the y after the last line.
function wrap(ctx, text, x, y, maxW, lineH) {
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineH;
    } else line = test;
  }
  if (line) { ctx.fillText(line, x, y); y += lineH; }
  return y;
}

// The opponent's badge: their logo, or a roundel in their colour with the short name.
function drawBadge(ctx, cx, cy, r, img) {
  const m = store.getMatch();
  ctx.save();
  if (img) {
    const s = (2 * r) / Math.max(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, cx - (img.naturalWidth * s) / 2, cy - (img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
  } else {
    const c = opponentColors(m);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = c.bg;
    ctx.fill();
    ctx.fillStyle = c.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(r * 0.72)}px ${HEAD}`;
    ctx.fillText(opponentCode(m), cx, cy + r * 0.04);
  }
  ctx.restore();
}

// Team name, "Starting XI", opponent and match details, starting at (x, y); returns the next y.
function drawHeader(ctx, x, y, maxW, scale, col, align = 'left') {
  const m = store.getMatch();
  const t = matchText(m);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = col.accent;
  ctx.font = `700 ${Math.round(22 * scale)}px ${BODY}`;
  ctx.fillText('STARTING XI', x, (y += 24 * scale));
  ctx.fillStyle = '#fff';
  const team = store.getTeamName().toUpperCase();
  const ts = fit(ctx, team, HEAD, Math.round(96 * scale), maxW);
  ctx.font = `700 ${ts}px ${HEAD}`;
  ctx.fillText(team, x, (y += ts * 0.98));
  if (t.vs) {
    const r = 25 * scale;
    y += 52 * scale;
    drawBadge(ctx, x + r, y - 13 * scale, r, col.oppImg);
    const vs = t.vs.toUpperCase();
    ctx.font = `700 ${fit(ctx, vs, HEAD, Math.round(38 * scale), maxW - 2 * r - 14 * scale)}px ${HEAD}`;
    ctx.fillText(vs, x + 2 * r + 14 * scale, y);
  }
  ctx.globalAlpha = 0.8;
  ctx.font = `700 ${Math.round(20 * scale)}px ${BODY}`;
  for (const line of [t.kicker, [t.when, t.venue].filter(Boolean).join(' · ')]) {
    if (line) ctx.fillText(line, x, (y += 30 * scale));
  }
  ctx.globalAlpha = 1;
  return y + 14 * scale;
}

// Substitutes and manager; returns the next y.
function drawFooter(ctx, x, y, maxW, scale, col) {
  const subs = store.bench();
  ctx.textAlign = 'left';
  ctx.fillStyle = col.accent;
  ctx.font = `700 ${Math.round(16 * scale)}px ${BODY}`;
  if (subs.length) {
    ctx.fillText('SUBSTITUTES', x, (y += 22 * scale));
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.round(24 * scale)}px ${HEAD}`;
    y = wrap(ctx, subs.map((p) => `${p.number}\u00a0${p.name}`).join("\u00a0· "), x, y + 30 * scale, maxW, 30 * scale);
    ctx.fillStyle = col.accent;
    ctx.font = `700 ${Math.round(16 * scale)}px ${BODY}`;
  }
  ctx.fillText('MANAGER', x, (y += 18 * scale));
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${Math.round(30 * scale)}px ${HEAD}`;
  ctx.fillText(store.getManager().name, x, (y += 34 * scale));
  return y;
}

export async function exportLineup(ratio, stage) {
  const [W, H] = SIZES[ratio] || SIZES['16x9'];
  const css = getComputedStyle(stage);
  const primary = store.getColor();
  const col = {
    primary,
    on: css.getPropertyValue('--on-primary').trim() || '#ffffff',
    ink: css.getPropertyValue('--primary-ink').trim() || primary,
    hi: mix(primary, '#ffffff', 0.12),
    dark: mix(primary, '#000000', 0.4),
    darkFade: mix(primary, '#000000', 0.55).replace('rgb', 'rgba').replace(')', ',.92)'),
    accent: mix(primary, '#ffffff', 0.45),
  };
  try { await document.fonts.ready; } catch { /* draw with fallback fonts */ }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // background: dark, with the team colour glowing from one corner and two slanted bars
  ctx.fillStyle = '#0d1020';
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.15, H * 0.1, 0, W * 0.15, H * 0.1, Math.max(W, H) * 0.9);
  glow.addColorStop(0, mix(primary, '#000000', 0.2));
  glow.addColorStop(1, 'rgba(13,16,32,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = primary;
  ctx.transform(1, 0, -0.25, 1, 0, 0);
  ctx.fillRect(W * 0.72, 0, W * 0.06, H);
  ctx.fillRect(W * 0.81, 0, W * 0.015, H);
  ctx.restore();

  const oppLogo = store.getMatch().opponentLogo;
  col.oppImg = oppLogo ? await loadImage(oppLogo).catch(() => null) : null;
  const logoUrl = store.getLogoUrl();
  const logo = logoUrl ? await loadImage(logoUrl).catch(() => null) : null;

  if (ratio === '16x9') {
    const pad = 80;
    let y = drawHeader(ctx, pad, pad, 560, 1, col);
    if (logo) {
      const s = 150 / Math.max(logo.naturalWidth, logo.naturalHeight);
      ctx.drawImage(logo, pad, y + 10, logo.naturalWidth * s, logo.naturalHeight * s);
    }
    drawFooter(ctx, pad, H - pad - 190, 560, 1, col);
    await drawFormation(ctx, { x: 700, y: 50, w: 1160, h: H - 100 }, col);
  } else if (ratio === '1x1') {
    // two columns, so the cards can use the full height: text on the left, formation on the right
    const pad = 56;
    const colW = 330;
    const y = drawHeader(ctx, pad, pad, colW, 0.8, col);
    const end = drawFooter(ctx, pad, y + 40, colW, 0.8, col);
    if (logo) {
      const s = Math.min(130, H - pad - end - 30) / Math.max(logo.naturalWidth, logo.naturalHeight);
      if (s > 0) ctx.drawImage(logo, pad, H - pad - logo.naturalHeight * s, logo.naturalWidth * s, logo.naturalHeight * s);
    }
    await drawFormation(ctx, { x: pad + colW + 40, y: pad - 16, w: W - colW - 2 * pad - 40, h: H - 2 * pad + 32 }, col);
  } else {
    const pad = 70;
    let y = drawHeader(ctx, pad, pad, W - 2 * pad - (logo ? 170 : 0), 1, col);
    if (logo) {
      const s = 140 / Math.max(logo.naturalWidth, logo.naturalHeight);
      ctx.drawImage(logo, W - pad - logo.naturalWidth * s, pad + 20, logo.naturalWidth * s, logo.naturalHeight * s);
    }
    const footerH = 250;
    await drawFormation(ctx, { x: pad - 20, y: y + 30, w: W - 2 * pad + 40, h: H - y - footerH - 60 }, col);
    drawFooter(ctx, pad, H - footerH, W - 2 * pad, 1, col);
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const safe = store.getTeamName().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'lineup';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${safe}-starting-xi-${ratio}.png`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return blob;
}
