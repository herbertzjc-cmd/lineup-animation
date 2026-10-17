// The cartoon figures shown on the cards. Every player gets their own look (skin tone, hair
// colour and style, beard), picked from the player's id so it stays the same on every screen,
// and drawn with shading, outlines and a kit that follows the team colour.
//
// A player can set the look by hand in players.json:
//   "look": { "skin": 0-4, "hair": "#3a2a20", "style": "crop|fade|curly|long|bun|waves|buzz",
//             "beard": "none|stubble|full", "kit": "keeper" }
// The viewBox is 128 x 200 with the head near the top and the shoulders at the bottom edge, so
// the figure fits the card and can step out of it exactly like a photo cut-out.

const SKIN = [
  ['#f7d6ba', '#ecb994', '#d29671'],
  ['#ebbc9a', '#d89f79', '#bb7f5b'],
  ['#d19670', '#bb7a54', '#9b5f3d'],
  ['#b27650', '#98603b', '#7a4a2b'],
  ['#85523a', '#6e4129', '#56321e'],
];
const HAIR = ['#1f140e', '#33241a', '#4a3220', '#6a4a2a', '#a67b45', '#c9a35a', '#7a2e1a', '#161616'];
const STYLES = ['crop', 'fade', 'curly', 'long', 'bun', 'waves', 'buzz'];
const BEARDS = ['none', 'stubble', 'full', 'none', 'stubble'];

const hash = (s) => {
  let h = 2166136261;
  for (const c of String(s)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const pick = (list, seed, salt) => list[hash(`${seed}:${salt}`) % list.length];

let counter = 0; // unique gradient ids, so several figures on one page never share definitions

// Hair on top of the head (drawn after the face).
function hairTop(style, c) {
  switch (style) {
    case 'fade':
      return `<path d="M41 66C40 46 52 32 66 31C82 31 89 46 87 66C84 54 76 48 64 48C52 48 45 54 41 66Z" fill="${c}"/>
              <ellipse cx="41" cy="70" rx="3.2" ry="7" fill="${c}" opacity=".35"/><ellipse cx="87" cy="70" rx="3.2" ry="7" fill="${c}" opacity=".35"/>`;
    case 'buzz':
      return `<path d="M41 62C41 46 52 34 66 33C82 33 89 46 87 62C85 52 76 46 64 46C52 46 44 52 41 62Z" fill="${c}" opacity=".85"/>`;
    case 'curly':
      return `<g fill="${c}"><circle cx="44" cy="54" r="9"/><circle cx="50" cy="42" r="10"/><circle cx="62" cy="36" r="10.5"/><circle cx="75" cy="38" r="10"/>
              <circle cx="84" cy="47" r="9.5"/><circle cx="87" cy="59" r="7.5"/><circle cx="41" cy="65" r="6.5"/></g>`;
    case 'long':
      return `<path d="M37 74C34 50 48 30 66 29C86 29 96 50 91 74C88 60 84 52 64 50C46 50 41 60 37 74Z" fill="${c}"/>`;
    case 'bun':
      return `<circle cx="64" cy="22" r="9.5" fill="${c}"/><rect x="58" y="29" width="12" height="4" rx="2" fill="${c}"/>
              <path d="M39 70C37 44 52 28 66 28C86 28 93 46 89 70C86 58 78 52 64 52C52 52 43 58 39 70Z" fill="${c}"/>`;
    case 'waves':
      return `<path d="M38 72C34 46 50 28 68 28C88 28 95 46 90 70C88 58 82 52 70 51C58 50 48 54 38 72Z" fill="${c}"/>
              <path d="M50 38C58 32 70 31 80 36" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="2.2" stroke-linecap="round"/>`;
    default: // crop
      return `<path d="M39 70C37 44 52 28 66 28C86 28 93 46 89 70C86 58 78 52 64 52C52 52 43 58 39 70Z" fill="${c}"/>`;
  }
}

export function cartoonSvg(p) {
  const seed = p.lookSeed || p.id || 'player';
  const look = p.look || {};
  const id = ++counter;
  const skin = SKIN[Number.isInteger(look.skin) ? look.skin % SKIN.length : hash(seed + ':skin') % SKIN.length];
  const hair = look.hair || pick(HAIR, seed, 'hair');
  const style = STYLES.includes(look.style) ? look.style : pick(STYLES, seed, 'style');
  const beard = ['none', 'stubble', 'full'].includes(look.beard) ? look.beard : pick(BEARDS, seed, 'beard');
  const keeper = look.kit === 'keeper' || p.position === 'GK';
  const shirt = keeper ? '#72e6a4' : 'var(--on-primary)';
  const trim = keeper ? '#2fb872' : 'var(--primary-ink)';
  const brow = '#2a1a12';
  const longHair = style === 'long';

  return `
  <svg viewBox="0 0 128 200" aria-hidden="true">
    <defs>
      <radialGradient id="cs${id}" cx="40%" cy="34%" r="75%"><stop offset="0" stop-color="${skin[0]}"/><stop offset=".7" stop-color="${skin[1]}"/><stop offset="1" stop-color="${skin[2]}"/></radialGradient>
      <linearGradient id="ck${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
    </defs>
    <!-- torso and kit -->
    <path d="M2 200C2 140 20 120 50 112H78C108 120 126 140 126 200Z" style="fill:${shirt}"/>
    <path d="M2 200C2 140 20 120 50 112H78C108 120 126 140 126 200Z" fill="url(#ck${id})"/>
    <path d="M20 128C26 119 38 114 50 112M108 128C102 119 90 114 78 112" fill="none" style="stroke:${trim}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M24 144C24 160 24 180 22 200M104 144C104 160 104 180 106 200" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="2"/>
    ${longHair ? `<path d="M37 62C32 88 34 108 42 122C48 126 54 122 58 116L70 116C74 122 80 126 86 122C94 108 96 88 91 62Z" fill="${hair}"/>
    <path d="M44 80C42 96 44 108 48 116M84 80C86 96 84 108 80 116" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="2" stroke-linecap="round"/>` : ''}
    <g transform="translate(0,-20)">
      <!-- neck -->
      <path d="M52 84H76V114C70 120 58 120 52 114Z" fill="${skin[1]}"/>
      <path d="M52 100C58 108 70 108 76 100V112C70 118 58 118 52 112Z" fill="${skin[2]}" opacity=".55"/>
      <!-- ears -->
      <ellipse cx="39.5" cy="76" rx="4.2" ry="6" fill="${skin[1]}"/><ellipse cx="88.5" cy="76" rx="4.2" ry="6" fill="${skin[1]}"/>
      <!-- head -->
      <ellipse cx="64" cy="74" rx="25" ry="31" fill="url(#cs${id})" stroke="rgba(0,0,0,.16)" stroke-width="1.4"/>
      ${beard === 'none' ? '' : `<path d="M39.5 76C40 98 50 106 64 106C78 106 88 98 88.5 76C85 91 77 96 64 96C51 96 43 91 39.5 76Z" fill="${hair}" opacity="${beard === 'full' ? 0.95 : 0.3}"/>
        ${beard === 'full' ? `<path d="M52 92Q64 88 76 92" fill="none" stroke="${hair}" stroke-width="3" stroke-linecap="round"/>` : ''}`}
      <!-- face -->
      <ellipse cx="47" cy="84" rx="5.5" ry="3.2" fill="#ff7a7a" opacity=".2"/><ellipse cx="81" cy="84" rx="5.5" ry="3.2" fill="#ff7a7a" opacity=".2"/>
      <path d="M46 63Q53 59 60 62M68 62Q75 59 82 63" fill="none" stroke="${brow}" stroke-width="2.8" stroke-linecap="round"/>
      <ellipse cx="54" cy="72" rx="4.6" ry="3.4" fill="#fff"/><ellipse cx="74" cy="72" rx="4.6" ry="3.4" fill="#fff"/>
      <circle cx="54.6" cy="72.2" r="2.5" fill="#3a2a20"/><circle cx="74.6" cy="72.2" r="2.5" fill="#3a2a20"/>
      <circle cx="54.9" cy="72.3" r="1.1" fill="#0f0a07"/><circle cx="74.9" cy="72.3" r="1.1" fill="#0f0a07"/>
      <circle cx="55.6" cy="71.2" r=".8" fill="#fff"/><circle cx="75.6" cy="71.2" r=".8" fill="#fff"/>
      <path d="M64 75Q60.5 84 65.5 85.5" fill="none" stroke="${skin[2]}" stroke-width="1.7" stroke-linecap="round"/>
      <path d="M55 90.5Q64 98 73 90.5" fill="none" stroke="${beard === 'full' ? '#f4d9c8' : '#9a5a45'}" stroke-width="2.4" stroke-linecap="round"/>
      ${hairTop(style, hair)}
    </g>
  </svg>`;
}
