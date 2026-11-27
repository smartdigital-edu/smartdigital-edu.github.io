/**
 * Built-in flat illustrations for the shop scene (inline SVG, no image files).
 * Generic, unbranded products only. Replace them per activity with real
 * artwork via config.scene = { background: { img }, character: { img } }.
 */

const pack = (x, y, w, h, body, accent, shape) => `
<g transform="translate(${x} ${y})">
  <path d="M4 0 h${w - 8} q4 0 4 6 l-3 ${h - 12} q0 6 -6 6 h${-(w - 14)} q-6 0 -6 -6 l-3 ${-(h - 12)} q0 -6 4 -6z" fill="${body}"/>
  <path d="M4 0 h${w - 8} q4 0 4 6 v4 h${-w} v-4 q0 -6 4 -6z" fill="#000" fill-opacity=".12"/>
  ${shape === 'star'
    ? `<path transform="translate(${w / 2} ${h / 2 + 2}) scale(${w / 60})" d="M0 -16 L5 -5 L16 -5 L7 2 L10 14 L0 7 L-10 14 L-7 2 L-16 -5 L-5 -5Z" fill="${accent}"/>`
    : shape === 'smile'
      ? `<circle cx="${w / 2}" cy="${h / 2 + 2}" r="${w / 4}" fill="${accent}"/><path d="M${w / 2 - w / 8} ${h / 2 + 4} q${w / 8} ${w / 9} ${w / 4} 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`
      : `<ellipse cx="${w / 2}" cy="${h / 2 + 2}" rx="${w / 3.2}" ry="${h / 5}" fill="${accent}"/><ellipse cx="${w / 2}" cy="${h / 2 + 2}" rx="${w / 6}" ry="${h / 10}" fill="#fff" fill-opacity=".55"/>`}
  <rect x="${w * 0.18}" y="${h - 16}" width="${w * 0.64}" height="5" rx="2.5" fill="#fff" fill-opacity=".6"/>
</g>`;

const jar = (x, y, color, lid) => `
<g transform="translate(${x} ${y})"><rect x="0" y="8" width="26" height="34" rx="6" fill="${color}"/><rect x="2" y="0" width="22" height="10" rx="3" fill="${lid}"/><rect x="4" y="18" width="18" height="12" rx="3" fill="#fff" fill-opacity=".75"/></g>`;

const bottle = (x, y, color) => `
<g transform="translate(${x} ${y})"><rect x="7" y="0" width="8" height="10" rx="2" fill="#fff"/><path d="M5 10 h12 q5 6 5 14 v26 q0 4 -4 4 h-14 q-4 0 -4 -4 v-26 q0 -8 5 -14z" fill="${color}"/><rect x="3" y="28" width="16" height="10" fill="#fff" fill-opacity=".7"/></g>`;

export function shopBackgroundSVG() {
  const shelfL = [0, 1, 2, 3].map((r) => {
    const y = 120 + r * 78;
    const items = [0, 1, 2, 3, 4].map((c) => (r % 2
      ? jar(8 + c * 32, y - 44, ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#e76f51'][c], '#fff')
      : bottle(10 + c * 32, y - 54, ['#e63946', '#2a9d8f', '#f4a261', '#457b9d', '#e63946'][c]))).join('');
    return `${items}<rect x="0" y="${y}" width="175" height="9" rx="2" fill="#b8c2cc"/><rect x="0" y="${y + 9}" width="175" height="4" fill="#8d99a6"/>`;
  }).join('');
  const snacks = [
    pack(330, 228, 70, 92, '#3d6fd8', '#ffd166', 'smile'), pack(408, 228, 70, 92, '#ffcf3f', '#e76f51', 'chip'),
    pack(486, 228, 70, 92, '#ef5d43', '#ffe08a', 'star'), pack(564, 228, 70, 92, '#7b4bc4', '#ffd166', 'chip'),
    pack(330, 336, 70, 82, '#2a9d8f', '#ffe08a', 'star'), pack(408, 336, 70, 82, '#3d6fd8', '#fff', 'chip'),
    pack(486, 336, 70, 82, '#ffcf3f', '#2a9d8f', 'smile'), pack(564, 336, 70, 82, '#ef5d43', '#fff', 'chip'),
  ].join('');
  const fridgeBottles = [0, 1, 2].map((r) => [0, 1, 2].map((c) => bottle(682 + c * 30, 190 + r * 78, ['#e63946', '#f4a261', '#2a9d8f'][(r + c) % 3])).join('')).join('');
  return `<svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" class="scene-bg-svg" aria-hidden="true">
<rect width="800" height="450" fill="#f7f1e6"/>
<rect width="800" height="70" fill="#eceff3"/>
${[90, 300, 510, 720].map((x) => `<rect x="${x}" y="22" width="120" height="12" rx="6" fill="#fff"/><rect x="${x}" y="22" width="120" height="12" rx="6" fill="#fffbe6" opacity=".8"/>`).join('')}
<rect y="70" width="800" height="26" fill="#2a9d8f"/>
<rect y="96" width="800" height="10" fill="#f4a261"/>
<rect y="106" width="800" height="16" fill="#fff4dc"/>
<g>${shelfL}</g>
<rect x="175" y="96" width="8" height="354" fill="#9aa5b1"/>
<rect x="315" y="200" width="335" height="250" rx="6" fill="#d9dee4"/>
<rect x="322" y="208" width="321" height="242" fill="#eef1f4"/>
${snacks}
<rect x="315" y="322" width="335" height="10" fill="#b8c2cc"/>
<rect x="315" y="424" width="335" height="10" fill="#b8c2cc"/>
<rect x="668" y="150" width="132" height="300" rx="8" fill="#cfd8e3"/>
<rect x="676" y="160" width="118" height="290" rx="4" fill="#e8f4ff"/>
${fridgeBottles}
${[0, 1, 2].map((r) => `<rect x="676" y="${244 + r * 78}" width="118" height="5" fill="#b8c2cc"/>`).join('')}
<rect x="676" y="160" width="118" height="290" rx="4" fill="#fff" fill-opacity=".25"/>
<path d="M690 170 l40 0 l-60 120 l-0 -40z" fill="#fff" fill-opacity=".35"/>
<circle cx="740" cy="120" r="34" fill="#f4a261"/><circle cx="740" cy="120" r="27" fill="#dff1ff"/>
<path d="M722 112 q18 -14 36 0" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>
</svg>`;
}

export function shopkeeperSVG() {
  const flowers = [[70, 250], [128, 300], [190, 262], [96, 330], [214, 330], [160, 236], [238, 280], [58, 300]]
    .map(([x, y]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-6" rx="4.5" ry="7" fill="#f28fb0" transform="rotate(${a})"/>`).join('')}<circle r="3" fill="#ffd166"/></g>`).join('');
  return `<svg viewBox="0 0 300 360" class="character-svg" aria-hidden="true">
<path d="M30 360 q0 -120 120 -132 q120 12 120 132z" fill="#fbe9dc"/>
<g clip-path="url(#kc)">${flowers}</g>
<clipPath id="kc"><path d="M30 360 q0 -120 120 -132 q120 12 120 132z"/></clipPath>
<path d="M62 230 q-22 -40 -14 -96 q14 -92 102 -94 q88 2 102 94 q8 56 -14 96 q-30 30 -88 34 q-58 -4 -88 -34z" fill="#f06c9b"/>
<path d="M88 228 q-6 60 62 92 q68 -32 62 -92 q-30 22 -62 24 q-32 -2 -62 -24z" fill="#e85a8c"/>
<ellipse cx="150" cy="146" rx="62" ry="70" fill="#f3c9a4"/>
<path d="M88 120 q20 -58 62 -60 q42 2 62 60 q-26 -30 -62 -30 q-36 0 -62 30z" fill="#f06c9b"/>
<path d="M112 126 q12 -9 24 -2" stroke="#4a2f23" stroke-width="5" fill="none" stroke-linecap="round"/>
<path d="M164 124 q12 -7 24 2" stroke="#4a2f23" stroke-width="5" fill="none" stroke-linecap="round"/>
<g class="eyes"><ellipse cx="124" cy="146" rx="10" ry="12" fill="#3a2418"/><ellipse cx="176" cy="146" rx="10" ry="12" fill="#3a2418"/>
<circle cx="128" cy="141" r="3.5" fill="#fff"/><circle cx="180" cy="141" r="3.5" fill="#fff"/></g>
<ellipse cx="106" cy="170" rx="11" ry="7" fill="#f29a8f" fill-opacity=".55"/><ellipse cx="194" cy="170" rx="11" ry="7" fill="#f29a8f" fill-opacity=".55"/>
<path d="M147 158 q3 8 6 0" stroke="#d59c7a" stroke-width="3" fill="none" stroke-linecap="round"/>
<path class="mouth" d="M128 178 q22 22 44 0 q-22 8 -44 0z" fill="#c2414b"/>
<path d="M104 300 q46 -20 92 0 q-4 18 -46 20 q-42 -2 -46 -20z" fill="#f3c9a4"/>
</svg>`;
}
