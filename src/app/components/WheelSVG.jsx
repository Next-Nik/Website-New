// ─────────────────────────────────────────────────────────────
// WheelSVG.jsx — personal wheel with labelled spokes
//
// Extracted from FirstLight.jsx so the marketing home can render
// the same wheel. Self-contained SVG with generous padding so
// domain labels never clip.
//
// Exports:
//   WheelSVG       — { scores, size }  the personal seven-domain wheel
//   SELF_DOMAINS   — canonical personal domain list (key, name, hex,
//                    desc, cards) shared with First Light
//
// Chrome 148 law: no style= props on <svg> — presentation
// attributes only.
// ─────────────────────────────────────────────────────────────

const LORA = "'Lora', Georgia, serif"

export const SELF_DOMAINS = [
  { key: 'path',       name: 'Path',       hex: '#6B1F2E', desc: 'Dharma, mission, purpose, meaning',                              cards: ['Direction', 'Purpose', 'Career', 'Meaning', "What I'm here for"] },
  { key: 'spark',      name: 'Spark',      hex: '#E8722E', desc: 'Passion, fire, aura, energy',                                   cards: ['Motivation', 'Joy', 'Feeling alive', 'Fire', 'Excitement'] },
  { key: 'body',       name: 'Body',       hex: '#2A8C4F', desc: 'Health, fitness, vitality',                                     cards: ['Energy', 'Sleep', 'Fitness', 'Health', 'How I feel'] },
  { key: 'finances',   name: 'Finances',   hex: '#E8B92E', desc: 'Money, personal power, wealth',                                 cards: ['Money stress', 'Financial security', 'Earning', 'Spending'] },
  { key: 'connection', name: 'Connection', hex: '#D63838', desc: 'You with other people: romantic, friends, family',              cards: ['Friendships', 'Romantic relationship', 'Family', 'Loneliness', 'Feeling understood'] },
  { key: 'inner_game', name: 'Inner Game', hex: '#2767B8', desc: 'Your relationship with yourself, values, standards',            cards: ['Self-confidence', 'Self-worth', 'Anxiety', 'Negative self-talk', 'Who I am'] },
  { key: 'signal',     name: 'Signal',     hex: '#6B3FA8', desc: "Your relationship with the world, how you're seen and show up", cards: ['My impact', 'How I come across', "How I'm seen", 'Feeling heard'] },
]

export function WheelSVG({ scores, size = 200 }) {
  const N      = 7
  const PAD    = 64
  const VB     = size + PAD * 2
  const cx     = VB / 2
  const cy     = VB / 2
  const maxR   = (size / 2) * 0.78
  const labelR = (size / 2) + 44

  function angleFor(i) { return (Math.PI * 2 * i) / N - Math.PI / 2 }

  const ringPts = SELF_DOMAINS.map((_, i) => {
    const a = angleFor(i)
    return `${(cx + maxR * Math.cos(a)).toFixed(2)},${(cy + maxR * Math.sin(a)).toFixed(2)}`
  }).join(' ')

  const polyPts = SELF_DOMAINS.map((d, i) => {
    const a     = angleFor(i)
    const ratio = (scores?.[d.key] ?? 5) / 10
    const r     = Math.max(ratio * maxR, maxR * 0.06)
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')

  return (
    <svg
      width={VB}
      height={VB}
      viewBox={`0 0 ${VB} ${VB}`}
      display="block"
      overflow="visible"
    >
      <polygon points={ringPts} fill="none" stroke="rgba(200,146,42,0.32)" strokeWidth="1.5" strokeDasharray="3 4" />
      {SELF_DOMAINS.map((_, i) => {
        const a = angleFor(i)
        return <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke="rgba(200,146,42,0.25)" strokeWidth="1.5" />
      })}
      <polygon points={polyPts} fill="rgba(200,146,42,0.15)" stroke="rgba(200,146,42,0.85)" strokeWidth="2.5" strokeLinejoin="round" />
      {SELF_DOMAINS.map((d, i) => {
        const a     = angleFor(i)
        const ratio = (scores?.[d.key] ?? 5) / 10
        const r     = Math.max(ratio * maxR, maxR * 0.06)
        return <circle key={d.key} cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r={5} fill={d.hex} />
      })}
      {SELF_DOMAINS.map((d, i) => {
        const a      = angleFor(i)
        const lx     = cx + labelR * Math.cos(a)
        const ly     = cy + labelR * Math.sin(a)
        const anchor = Math.cos(a) > 0.25 ? 'start' : Math.cos(a) < -0.25 ? 'end' : 'middle'
        return (
          <text
            key={d.key}
            x={lx} y={ly}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontFamily={LORA}
            fontSize={13}
            letterSpacing="0.06em"
            fill={d.hex}
          >
            {d.name.toUpperCase()}
          </text>
        )
      })}
      <circle cx={cx} cy={cy} r={size * 0.06} fill="#C8922A" />
    </svg>
  )
}
