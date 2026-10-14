// Team colour theming. One primary colour drives everything; the rest is derived so text
// stays readable on any colour (white text on dark colours, dark text on light ones).
const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const parse = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
export const isHex = (s) => /^#[0-9a-f]{6}$/i.test(s);

export function luminance(hex) {
  const [r, g, b] = parse(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// The primary colour, darkened just enough to be visible on the light pitch background.
function inkOnLight(hex) {
  const rgb = parse(hex);
  let f = 1;
  while (luminance(toHex(rgb.map((v) => v * f))) > 0.22 && f > 0.2) f -= 0.05;
  return toHex(rgb.map((v) => v * f));
}

export function applyTheme(el, hex) {
  const L = luminance(hex);
  const whiteContrast = 1.05 / (L + 0.05);
  const darkContrast = (L + 0.05) / (0.008 + 0.05); // against #15161a
  const onPrimary = whiteContrast >= darkContrast ? '#ffffff' : '#15161a';
  el.style.setProperty('--primary', hex);
  el.style.setProperty('--on-primary', onPrimary);
  el.style.setProperty('--primary-ink', inkOnLight(hex));
  el.style.setProperty('--warn', onPrimary === '#ffffff' ? '#ffe27a' : '#7a1200');
}
