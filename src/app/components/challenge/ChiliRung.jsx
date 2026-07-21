// src/app/components/challenge/ChiliRung.jsx
//
// The intensity rung — chili peppers, from Nik's own artwork (traced to two
// tintable paths: the line-art outline, and the body silhouette). The metaphor
// is a menu's spiciness, so the level reads as appetite, not a score.
//
// An active pepper is the outline in full spice red over the body filled at 70%.
// A ghost pepper is the outline alone, faint. The author sets the level (1–5);
// if unset, nothing renders at all. When set, all five show and the level is the
// count coloured in.

const SPICE = '#B5482E'
const GHOST = 'rgba(15,21,35,0.22)'
const VB = '0 0 500 876'
const TF = 'translate(0,876) scale(0.1,-0.1)'

const OUTLINE = 'M4571 8745 c-417 -117 -766 -534 -942 -1127 -106 -358 -136 -389 -409 -423 -191 -24 -300 -68 -501 -204 -208 -139 -507 -396 -486 -417 2 -2 44 -11 92 -19 109 -17 117 -24 88 -73 -55 -93 -173 -334 -197 -402 -93 -256 -101 -425 -56 -1135 30 -474 -3 -1118 -75 -1452 -198 -920 -585 -1678 -1177 -2305 -86 -92 -219 -213 -504 -458 -268 -233 -346 -311 -380 -385 -59 -125 -5 -254 131 -317 227 -105 1134 131 1820 473 1695 845 2865 2595 2865 4287 0 209 -23 597 -46 780 -20 161 -23 156 77 149 45 -4 87 -11 94 -17 6 -5 15 -7 18 -3 12 11 8 21 -12 26 -14 3 -32 46 -75 181 -161 501 -369 825 -684 1069 -181 139 -198 202 -126 466 83 303 180 492 316 616 77 70 148 106 290 149 188 57 230 82 269 159 63 123 -2 301 -135 369 -53 28 -179 34 -255 13z m-1810 -2185 c56 -16 83 -54 129 -185 48 -138 85 -211 117 -232 31 -21 84 5 231 110 184 133 223 146 309 108 73 -34 118 -90 187 -234 115 -242 148 -253 219 -76 56 141 116 209 184 209 65 0 311 -152 348 -214 39 -67 28 -118 -22 -99 -14 6 -15 0 -9 -48 151 -1195 19 -2192 -404 -3024 -361 -711 -973 -1382 -1710 -1872 -505 -336 -1181 -647 -1650 -759 -306 -73 -425 -50 -425 81 0 62 33 102 190 229 680 551 1106 1048 1422 1662 292 568 455 1141 530 1864 25 243 24 853 -1 1125 -22 244 -24 537 -3 650 8 44 37 139 65 211 78 202 82 227 56 406 -8 54 -3 58 111 83 75 17 82 17 126 5z'
const SILHOUETTE = 'M4572 8745 c-418 -117 -769 -536 -943 -1127 -105 -357 -136 -389 -409 -423 -186 -23 -294 -66 -485 -192 -186 -123 -522 -408 -504 -427 4 -4 45 -13 93 -19 111 -17 119 -24 84 -85 -114 -194 -203 -400 -239 -547 -46 -193 -47 -349 -8 -990 13 -203 6 -800 -11 -990 -67 -752 -355 -1552 -790 -2195 -264 -388 -450 -587 -980 -1042 -311 -267 -366 -332 -377 -443 -10 -98 48 -191 149 -236 254 -115 1219 152 1959 543 1377 726 2436 2139 2673 3568 69 414 72 945 9 1427 -21 160 -22 157 78 150 44 -3 86 -10 93 -16 7 -6 16 -8 19 -4 12 12 7 23 -11 23 -14 0 -29 37 -75 182 -160 498 -370 827 -682 1069 -117 90 -129 102 -151 154 -59 138 86 620 250 834 97 125 191 188 366 241 201 62 242 85 281 162 63 123 -2 302 -135 370 -53 28 -179 34 -254 13z'

export function Chili({ active = false, size = 18, colour = SPICE }) {
  const w = Math.round(size * 0.57)
  return (
    <span style={{ display: 'inline-flex', flexShrink: 0, lineHeight: 0 }}>
      <svg viewBox={VB} width={w} height={size} aria-hidden="true">
        <g transform={TF}>
          {active && <path d={SILHOUETTE} fill={colour} fillOpacity={0.7} stroke="none" />}
          <path d={OUTLINE} fill={active ? colour : GHOST} stroke="none" />
        </g>
      </svg>
    </span>
  )
}

export default function ChiliRung({ level, size = 18, colour = SPICE }) {
  if (!level) return null
  return (
    <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(k => <Chili key={k} active={k <= level} size={size} colour={colour} />)}
    </span>
  )
}
