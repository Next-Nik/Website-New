// src/app/lib/guideCollage.js
//
// The Field Guide's entry-card art: a sheet of specimen cards, drawn from the
// viewer's own collection. Per the v3 mockup §01 — each mini-card carries its
// domain colour band, champion tiles are foil with a star, and the remaining
// slots are dark "not yet encountered" silhouettes, with a hand-stamped count
// in the corner. The collage is what sells the collecting on the door.
//
// WHY THIS IS AN SVG DATA URI AND NOT MARKUP.
//
// The Mission Control cards render through CardPhoto.jsx, which came out of a
// long WebKit blank-card hunt with one rule above all others: ONE rendering
// path for both the photo and the no-photo state, the same <img>, the same
// paint path, so there is no second failure mode left to find. Building this
// collage out of divs would add exactly the second path that rule exists to
// forbid — on the one card on the site with a history of rendering blank, and
// while the current fix is still unconfirmed on real devices.
//
// So the collage is generated as an SVG data URI and handed to CardPhoto as
// its fallback `src`. Same element, same paint path, zero new failure modes.
// The three details that make SVG-inside-<img> safe on WebKit are the same
// ones documented in CardPhoto: xmlns is mandatory, explicit width/height AND
// viewBox give it an intrinsic size so it can never compute to zero, and
// encodeURIComponent must escape every '#' or the data URI is truncated at
// the fragment.
//
// WHY IT SURVIVES A FLUID CARD WIDTH.
//
// The media frame is a fixed 150px tall and a fluid width — the cards grid is
// `repeat(auto-fit, minmax(240px, 1fr))`, so the frame's aspect ratio ranges
// from about 1.6 to 4.0 depending on viewport and card count. Under the CSS's
// `object-fit: cover`, a fixed-aspect image gets cropped on whichever axis
// overflows, which ate the count stamp and the top row's colour bands
// outright. A gradient doesn't care; a composition does.
//
// The fix is two halves that only work together:
//
//   • `preserveAspectRatio="xMidYMid meet"` — the artwork scales to FIT the
//     viewport and centres, so no tile and no stamp is ever cropped.
//   • The ground rect is drawn far outside the viewBox. With `meet`, the SVG
//     viewport is larger than the scaled viewBox on one axis; that margin
//     still paints (SVG clips at the viewport, not at the viewBox), so the
//     green ground runs full-bleed instead of letterboxing to transparent.
//     Its gradient is `userSpaceOnUse` so the colour ramp stays keyed to the
//     artwork rather than being stretched across the oversized rect.
//
// CardPhoto pairs this with `object-fit: fill` for fallback art, so the SVG
// viewport matches the frame exactly and the SVG's own aspect handling does
// the work. Nothing is cropped, nothing is distorted, at any card width.
//
// A founder-set photo still wins — this only replaces the flat gradient. The
// founder-swap system postdates the mockup and is not regressed here.

const W = 440
const H = 200

// The tile-art ground, from the mockup: a deep planted green.
const GROUND_FROM = '#6b8f7a'
const GROUND_MID = '#4a6b57'
const GROUND_TO = '#3c5a49'

const COLS = 4
const ROWS = 2
const PAD_X = 20
const PAD_TOP = 18
const PAD_BOTTOM = 30      // the stamp's band
const GAP = 9

// How far the ground runs past the viewBox, to cover the `meet` margin at the
// widest and narrowest frames the grid can produce.
const BLEED = 1200

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

// Drop unpaired surrogates, keep valid pairs whole.
//
// A lone surrogate — half of a code point, which a caller produces with
// String.charAt(0) on an emoji-initial name — makes encodeURIComponent throw
// URIError. This module runs during Mission Control's render and the only
// error boundary in the app wraps the router, so that throw blanks every
// route. Callers should pass whole code points (useGuideGlance.firstLetter);
// this is the belt to those braces, because a crash here costs far more than
// a missing glyph.
//
// Written as an explicit scan rather than a regex pair on purpose. The obvious
// regex — strip anything in D800–DFFF not followed by a low surrogate — also
// eats the low half of a VALID pair, because that low surrogate is itself in
// D800–DFFF and has nothing after it. That bug turned 🌱 into a lone high
// surrogate and threw in exactly the case this guard exists to prevent.
function stripLoneSurrogates(input) {
  const s = String(input == null ? '' : input)
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c >= 0xD800 && c <= 0xDBFF) {
      const next = s.charCodeAt(i + 1)
      if (next >= 0xDC00 && next <= 0xDFFF) {
        out += s[i] + s[i + 1]     // a whole astral code point
        i++
      }
      // else: unpaired high surrogate — drop it
    } else if (c >= 0xDC00 && c <= 0xDFFF) {
      // unpaired low surrogate — drop it
    } else {
      out += s[i]
    }
  }
  return out
}

const glyph = (s, fallback = '?') => esc(stripLoneSurrogates(s)) || fallback

const r1 = (n) => Math.round(n * 10) / 10

/**
 * guideCollageSrc({ tiles, count })
 *
 *   tiles — up to 8, in display order:
 *             { letter: 'R', color: '#4A8C6F', champion: bool }
 *           Fewer than 8 is fine; the remaining slots render as dark
 *           not-yet-met silhouettes, which is the honest picture of a
 *           collection that has room to grow.
 *   count — total collected, for the corner stamp. Omitted when 0.
 *
 * Returns a data: URI suitable as an <img src>, or null when there is
 * nothing collected yet — callers should fall back to the plain gradient
 * rather than show an all-empty sheet to someone who hasn't started.
 */
export function guideCollageSrc({ tiles = [], count = 0 } = {}) {
  if (!Array.isArray(tiles) || tiles.length === 0) return null

  const cellW = (W - PAD_X * 2 - GAP * (COLS - 1)) / COLS
  const cellH = (H - PAD_TOP - PAD_BOTTOM - GAP * (ROWS - 1)) / ROWS

  const parts = []

  parts.push(
    '<defs>',
    // userSpaceOnUse keeps the ramp keyed to the artwork, not to the
    // oversized bleed rect it paints onto.
    `<linearGradient id="ground" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${r1(W * 0.7)}" y2="${H}">`,
    `<stop offset="0" stop-color="${GROUND_FROM}"/>`,
    `<stop offset="0.55" stop-color="${GROUND_MID}"/>`,
    `<stop offset="1" stop-color="${GROUND_TO}"/>`,
    '</linearGradient>',
    // The foil wash on champion tiles.
    '<linearGradient id="foil" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0" stop-color="#f2d9a4" stop-opacity="0.66"/>',
    '<stop offset="0.5" stop-color="#d9ab4e" stop-opacity="0.5"/>',
    '<stop offset="1" stop-color="#f6e6c4" stop-opacity="0.64"/>',
    '</linearGradient>',
    // Not-yet-met: the pokédex silhouette slot.
    '<radialGradient id="unmet" cx="0.38" cy="0.3" r="0.9">',
    '<stop offset="0" stop-color="#4a463e"/>',
    '<stop offset="1" stop-color="#181d16"/>',
    '</radialGradient>',
    `<linearGradient id="sheen" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="${H}">`,
    '<stop offset="0" stop-color="#ffffff" stop-opacity="0.26"/>',
    '<stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/>',
    '</linearGradient>',
    '</defs>',
    // Full-bleed ground: paints the `meet` margin as well as the viewBox.
    `<rect x="${-BLEED}" y="${-BLEED}" width="${W + BLEED * 2}" height="${H + BLEED * 2}" fill="url(#ground)"/>`,
    `<rect x="${-BLEED}" y="${-BLEED}" width="${W + BLEED * 2}" height="${H + BLEED * 2}" fill="url(#sheen)"/>`,
  )

  for (let i = 0; i < COLS * ROWS; i++) {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const x = r1(PAD_X + col * (cellW + GAP))
    const y = r1(PAD_TOP + row * (cellH + GAP))
    const cw = r1(cellW)
    const ch = r1(cellH)
    const t = tiles[i]

    if (!t) {
      // Dark silhouette slot — the gap you can fill.
      parts.push(
        `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="7" fill="url(#unmet)" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1.5"/>`,
        `<rect x="${x}" y="${y}" width="${cw}" height="4" rx="2" fill="#ffffff" fill-opacity="0.09"/>`,
        `<text x="${r1(x + cw / 2)}" y="${r1(y + ch / 2 + 7)}" text-anchor="middle" font-family="Georgia, serif" font-size="19" font-weight="600" fill="#ffffff" fill-opacity="0.32">?</text>`,
      )
      continue
    }

    const champ = !!t.champion
    const band = t.color || '#ffffff'

    parts.push(
      `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="7" fill="${champ ? 'url(#foil)' : '#ffffff'}" fill-opacity="${champ ? '1' : '0.15'}" stroke="#ffffff" stroke-opacity="${champ ? '0.72' : '0.3'}" stroke-width="1.5"/>`,
      `<rect x="${x}" y="${y}" width="${cw}" height="4" rx="2" fill="${band}"/>`,
      `<text x="${r1(x + cw / 2)}" y="${r1(y + ch / 2 + 8)}" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="600" fill="#ffffff">${glyph(t.letter)}</text>`,
    )

    if (champ) {
      parts.push(
        `<text x="${r1(x + cw - 6)}" y="${r1(y + 16)}" text-anchor="end" font-family="Georgia, serif" font-size="11" fill="#fff4d6" fill-opacity="0.95">&#9733;</text>`,
      )
    }
  }

  // The hand-stamped count, tilted like a rubber stamp, sitting in the band
  // below the sheet so it never sits on top of a specimen.
  if (count > 0) {
    const label = `${count} collected`
    const boxW = r1(24 + label.length * 6.4)
    const boxH = 19
    const bx = r1(W - PAD_X - boxW)
    const by = r1(H - PAD_BOTTOM + 4)
    parts.push(
      `<g transform="rotate(-3 ${r1(bx + boxW / 2)} ${r1(by + boxH / 2)})">`,
      `<rect x="${bx}" y="${by}" width="${boxW}" height="${boxH}" rx="3" fill="#181d16" fill-opacity="0.26" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1"/>`,
      `<text x="${r1(bx + boxW / 2)}" y="${r1(by + 13.5)}" text-anchor="middle" font-family="Georgia, serif" font-size="12" letter-spacing="1.3" fill="#ffffff" fill-opacity="0.95">${glyph(label, '')}</text>`,
      '</g>',
    )
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" ` +
    `viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${parts.join('')}</svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
