// Downscale an image file to at most `maxSide` pixels on its longer side and re-encode it
// (WebP, which keeps transparency). Also reports whether it has a transparent background.
export async function readImage(file, maxSide = 1000) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bmp.width * s));
  canvas.height = Math.max(1, Math.round(bmp.height * s));
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();

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
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/webp', 0.9)
  );
  return { blob, hasAlpha };
}
