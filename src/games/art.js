/** Small inline SVG illustrations coloured on the fly (paint tubes, socks, crayons, balloons…). */
const svg = (body, vb = '0 0 100 100') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

export const ART = {
  blob: (c) => svg(`<path d="M50 12c16 0 34 10 34 30 0 14-8 20-6 30 2 10-10 18-26 16-14-2-18-8-30-10C10 76 8 62 14 50 20 36 30 12 50 12z" fill="${c}" stroke="#333" stroke-width="3"/>`),
  tube: (c) => svg(`<rect x="34" y="6" width="32" height="12" rx="3" fill="#555"/><path d="M30 18h40l6 64H24z" fill="${c}" stroke="#333" stroke-width="3"/><rect x="22" y="80" width="56" height="12" rx="3" fill="#ddd" stroke="#333" stroke-width="3"/><rect x="38" y="36" width="24" height="26" rx="4" fill="#fff" opacity=".7"/>`),
  sock: (c) => svg(`<path d="M36 6h30v52c0 8 4 12 10 18 8 9 2 20-10 18-10-1-18-6-26-12-8-6-6-14-4-22z" fill="${c}" stroke="#333" stroke-width="3"/><rect x="36" y="6" width="30" height="12" fill="#fff" opacity=".6" stroke="#333" stroke-width="3"/>`),
  crayon: (c) => svg(`<path d="M40 22 50 4l10 18z" fill="${c}" stroke="#333" stroke-width="3"/><rect x="38" y="22" width="24" height="70" rx="3" fill="${c}" stroke="#333" stroke-width="3"/><rect x="38" y="40" width="24" height="10" fill="#000" opacity=".25"/><rect x="38" y="70" width="24" height="10" fill="#000" opacity=".25"/>`),
  bucket: (c) => svg(`<path d="M20 30h60l-8 60H28z" fill="${c}" stroke="#333" stroke-width="3"/><path d="M22 30c0-20 56-20 56 0" fill="none" stroke="#333" stroke-width="4"/>`),
  balloon: (c) => svg(`<ellipse cx="50" cy="40" rx="34" ry="40" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="2"/><path d="M44 80h12l-6 8z" fill="${c}"/><path d="M50 88c-6 10 6 18 0 30" stroke="#666" stroke-width="2" fill="none"/><ellipse cx="38" cy="26" rx="8" ry="12" fill="#fff" opacity=".45"/>`, '0 0 100 120'),
};
