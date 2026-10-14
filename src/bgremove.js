// Browser-side background removal for portraits. Runs a small segmentation model (MODNet,
// Apache-2.0) locally through transformers.js / ONNX Runtime Web, so no photo ever leaves the
// device and there is no paid API. The library is loaded on demand: the model (a few MB) is
// downloaded the first time it is used and then cached by the browser.
//
// The result is a real PNG with an alpha channel - the person is cut out, not hidden by a filter.
let segmenter = null;

export async function removeBackground(blob, onStatus = () => {}) {
  if (!segmenter) {
    onStatus('Loading the background-removal model (first time only)…');
    const { pipeline, env } = await import('@huggingface/transformers');
    env.allowLocalModels = false; // fetch from the model hub, don't probe for a local /models folder
    segmenter = await pipeline('background-removal', 'Xenova/modnet', {
      dtype: 'q8',
      progress_callback: (p) => {
        if (p.status === 'progress' && Number.isFinite(p.progress)) onStatus(`Downloading the model… ${Math.round(p.progress)}%`);
      },
    });
  }
  onStatus('Removing the background…');
  await new Promise((r) => setTimeout(r, 30)); // let the status text paint before the heavy work
  const url = URL.createObjectURL(blob);
  try {
    const result = await segmenter(url);
    return await result.toBlob('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}
