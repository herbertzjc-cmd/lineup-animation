// Reading uploaded pictures. Browsers can decode JPEG, PNG, WebP, GIF, BMP and (mostly) AVIF
// and ICO themselves; SVG goes through an <img>; HEIC/HEIF (iPhone photos) and TIFF are decoded
// by small libraries that are loaded only when such a file is actually chosen.
//
// Whatever goes in, readImage() hands back a downscaled WebP/PNG blob (transparency kept) and
// says whether it has a transparent background.

export const IMAGE_ACCEPT =
  'image/*,.jpg,.jpeg,.jfif,.png,.webp,.gif,.bmp,.avif,.heic,.heif,.tif,.tiff,.svg,.ico';
export const IMAGE_FORMATS_HINT = 'JPG, PNG, WebP, GIF, BMP, AVIF, HEIC/HEIF, TIFF, SVG';
const MAX_FILE_BYTES = 60 * 1024 * 1024;

class ImageReadError extends Error {}

// Work out the real format from the first bytes: the file name or MIME type is often missing
// or wrong (HEIC files from some systems have no type at all).
async function sniff(file) {
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const ascii = (a, b) => String.fromCharCode(...head.slice(a, b));
  const brand = ascii(8, 12);
  if (ascii(4, 8) === 'ftyp') {
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)/.test(brand)) return 'heic';
    if (brand === 'avif' || brand === 'avis') return 'avif';
  }
  if ((head[0] === 0x49 && head[1] === 0x49 && head[2] === 0x2a && head[3] === 0) ||
      (head[0] === 0x4d && head[1] === 0x4d && head[2] === 0 && head[3] === 0x2a)) return 'tiff';
  const text = await file.slice(0, 512).text();
  if (/<svg[\s>]/i.test(text)) return 'svg';
  const name = (file.name || '').toLowerCase();
  if (/\.(heic|heif)$/.test(name)) return 'heic';
  if (/\.tiff?$/.test(name)) return 'tiff';
  if (/\.svg$/.test(name)) return 'svg';
  return 'other';
}

const fromCanvasBlob = (canvas) =>
  new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/png'));

// Decode through an <img>: handles SVG, and formats the browser can show but not hand to
// createImageBitmap (this also applies the photo's rotation).
async function decodeWithImg(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function decodeTiff(file) {
  const mod = await import('utif2');
  const UTIF = mod.default ?? mod;
  const buf = await file.arrayBuffer();
  const pages = UTIF.decode(buf);
  if (!pages.length) throw new ImageReadError('empty tiff');
  UTIF.decodeImage(buf, pages[0]);
  const rgba = UTIF.toRGBA8(pages[0]);
  const canvas = document.createElement('canvas');
  canvas.width = pages[0].width;
  canvas.height = pages[0].height;
  canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), canvas.width, canvas.height), 0, 0);
  return canvas;
}

async function decodeHeic(file) {
  const { default: heic2any } = await import('heic2any');
  const out = await heic2any({ blob: file, toType: 'image/png' });
  return createImageBitmap(Array.isArray(out) ? out[0] : out);
}

// Any supported picture -> something drawImage() accepts (plus its natural size).
async function decode(file) {
  if (file.size > MAX_FILE_BYTES) throw new ImageReadError('This file is too large (limit 60 MB).');
  const kind = await sniff(file);
  const attempts = {
    heic: [() => createImageBitmap(file), () => decodeHeic(file)], // Safari reads HEIC itself
    tiff: [() => decodeTiff(file), () => decodeWithImg(file)],
    svg: [() => decodeWithImg(file)],
    avif: [() => createImageBitmap(file), () => decodeWithImg(file)],
    other: [() => createImageBitmap(file), () => decodeWithImg(file)],
  }[kind];
  let lastError;
  for (const attempt of attempts) {
    try {
      const source = await attempt();
      let width = source.naturalWidth || source.width;
      let height = source.naturalHeight || source.height;
      if (kind === 'svg' && !(width > 0 && height > 0)) width = height = 512; // SVG without a size
      if (width > 0 && height > 0) return { source, width, height, svg: kind === 'svg' };
    } catch (e) {
      lastError = e;
    }
  }
  throw new ImageReadError(
    `This file could not be read as a picture (${(file.name || 'unknown').split('.').pop()}). Supported: ${IMAGE_FORMATS_HINT}.`,
    { cause: lastError }
  );
}

// Downscale to at most `maxSide` px on the longer side and re-encode (WebP keeps transparency;
// browsers that cannot encode WebP fall back to PNG). Also reports whether the picture has a
// transparent background (a cut-out).
export async function readImage(file, maxSide = 1000, quality = 0.9) {
  const { source, width, height, svg } = await decode(file);
  // Vector images are drawn at the target size so they stay sharp; bitmaps are never enlarged.
  const s = svg ? maxSide / Math.max(width, height) : Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * s));
  canvas.height = Math.max(1, Math.round(height * s));
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close?.();

  const probe = document.createElement('canvas');
  probe.width = 48;
  probe.height = 48;
  const ctx = probe.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, probe.width, probe.height);
  const px = ctx.getImageData(0, 0, probe.width, probe.height).data;
  let clear = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 250) clear += 1;
  const hasAlpha = clear / (px.length / 4) > 0.005;

  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/webp', quality)
  );
  return { blob, hasAlpha };
}

export const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

// A message fit to show the user.
export const readErrorMessage = (e) =>
  e instanceof ImageReadError ? e.message : `This file could not be read as a picture. Supported: ${IMAGE_FORMATS_HINT}.`;
