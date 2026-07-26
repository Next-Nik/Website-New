// src/lib/care/instruments/dosha.js
//
// Ayurvedic dosha — a short original item set over a traditional system.
//
// RIGHTS — the constructs are traditional and not ownable; the items are ours.
// No published dosha questionnaire is copied here.
//
// Evidence tier: mythic. Stated openly on the card. It earns its place because
// the practical output ("runs cold and needs warmth and routine") is exactly
// the kind of concrete instruction the card exists to carry, not because there
// is anything measured about it.

const forced = (key, prompt, options) => ({
  id: key,
  text: prompt,
  type: 'choice',
  options,
})

const dosha = {
  id: 'dosha',
  name: 'Ayurvedic constitution',
  shortName: 'Constitution',
  kind: 'quiz',
  tier: 'deepen',
  evidence: 'mythic',
  estimatedMinutes: 2,
  rights: {
    status: 'cleared',
    basis: 'Traditional system, original items',
    url: null,
  },
  instructions: 'Pick whichever is closest to true most of the time, not at your best or your worst.',
  scale: { points: 3, anchors: {} },
  items: [
    forced('dosha_1', 'My energy through a day', [
      { value: 'vata', label: 'Comes in bursts, then drops off a cliff' },
      { value: 'pitta', label: 'Steady and strong, until I overheat' },
      { value: 'kapha', label: 'Slow to start, then lasts all day' },
    ]),
    forced('dosha_2', 'Under stress I tend to', [
      { value: 'vata', label: 'Get scattered and anxious' },
      { value: 'pitta', label: 'Get sharp and irritable' },
      { value: 'kapha', label: 'Get heavy and withdraw' },
    ]),
    forced('dosha_3', 'Temperature-wise I am', [
      { value: 'vata', label: 'Nearly always cold' },
      { value: 'pitta', label: 'Nearly always too warm' },
      { value: 'kapha', label: 'Comfortable, but dislike damp' },
    ]),
    forced('dosha_4', 'My sleep', [
      { value: 'vata', label: 'Light, and easily broken' },
      { value: 'pitta', label: 'Short but solid' },
      { value: 'kapha', label: 'Deep, and hard to leave' },
    ]),
    forced('dosha_5', 'When I am hungry and it is not dealt with', [
      { value: 'vata', label: 'I forget to eat, then crash' },
      { value: 'pitta', label: 'I become genuinely unpleasant' },
      { value: 'kapha', label: 'I can wait a long time' },
    ]),
    forced('dosha_6', 'The way I talk', [
      { value: 'vata', label: 'Fast, and off in several directions' },
      { value: 'pitta', label: 'Direct, and to the point' },
      { value: 'kapha', label: 'Slow, and considered' },
    ]),
    forced('dosha_7', 'New situations', [
      { value: 'vata', label: 'Exciting, and a bit destabilising' },
      { value: 'pitta', label: 'Something to take charge of' },
      { value: 'kapha', label: 'I would rather they came more slowly' },
    ]),
    forced('dosha_8', 'My default state', [
      { value: 'vata', label: 'In motion, mentally or physically' },
      { value: 'pitta', label: 'Focused on the thing in front of me' },
      { value: 'kapha', label: 'Settled, and hard to shift' },
    ]),
    forced('dosha_9', 'What depletes me fastest', [
      { value: 'vata', label: 'Noise, cold and no routine' },
      { value: 'pitta', label: 'Heat, hunger and incompetence' },
      { value: 'kapha', label: 'Damp, stagnation and too much sitting still' },
    ]),
  ],

  score(responses) {
    const tally = { vata: 0, pitta: 0, kapha: 0 }
    let answered = 0
    this.items.forEach((item) => {
      const choice = responses[item.id]
      if (!choice || !(choice in tally)) return
      tally[choice] += 1
      answered += 1
    })
    if (!answered) return {}
    const out = {}
    for (const key of Object.keys(tally)) {
      out[`dosha_${key}`] = {
        raw: tally[key],
        value: Math.round((tally[key] / answered) * 100),
        confidence: answered / 9,
      }
    }
    return out
  },
}

export const DOSHA_GUIDANCE = {
  vata: 'Runs cold, fast and dry. Warmth, routine and regular food do more than any conversation.',
  pitta: 'Runs hot and sharp. Feed them before anything difficult, and keep the room cool.',
  kapha: 'Runs slow and steady. Needs movement and a nudge, not more rest.',
}

/** The dominant dosha, plus a second if it is close enough to matter. */
export function doshaReading(scores) {
  const entries = ['vata', 'pitta', 'kapha']
    .map((key) => ({ key, value: scores[`dosha_${key}`]?.value ?? 0 }))
    .sort((a, b) => b.value - a.value)
  if (!entries[0].value) return null
  const dual = entries[1].value >= entries[0].value - 12 && entries[1].value > 0
  return {
    primary: entries[0].key,
    secondary: dual ? entries[1].key : null,
    label: dual
      ? `${cap(entries[0].key)}-${cap(entries[1].key)}`
      : cap(entries[0].key),
    guidance: DOSHA_GUIDANCE[entries[0].key],
    split: entries,
  }
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export default dosha
