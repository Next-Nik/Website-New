// src/lib/care/instruments/ipip50.js
//
// IPIP Big-Five Factor Markers, 50 items (Goldberg). The engine's backbone and
// the only genuinely "measured" tier instrument in the roster.
//
// RIGHTS — cleared, verified at source. https://ipip.ori.org/newPermission.htm:
//   "Because the IPIP has been placed in the public domain, permission has
//    already been automatically granted for any person to use IPIP items,
//    scales, and inventories for any purpose, commercial or non-commercial."
//
// Items and keying transcribed from https://ipip.ori.org/new_ipip-50-item-scale.htm
// Scoring procedure from https://ipip.ori.org/IPIPImplementationsAroundTheWeb.htm:
//   "code +keyed item responses from 1 to 5 and -keyed item responses from 5
//    to 1, and then sum all of the item responses."
// Sums, not means, so each of the five scales runs 10 to 50.
//
// Item text is verbatim except for British spelling ("Sympathise", "centre"),
// per the repo's spelling law. IPIP items are routinely localised and the
// construct is unaffected.

const E = 'extraversion'
const A = 'agreeableness'
const C = 'conscientiousness'
const ES = 'emotional_stability'
const I = 'intellect'

// [text, dimension, keying]
const RAW = [
  ['Am the life of the party.', E, '+'],
  ['Feel little concern for others.', A, '-'],
  ['Am always prepared.', C, '+'],
  ['Get stressed out easily.', ES, '-'],
  ['Have a rich vocabulary.', I, '+'],
  ["Don't talk a lot.", E, '-'],
  ['Am interested in people.', A, '+'],
  ['Leave my belongings around.', C, '-'],
  ['Am relaxed most of the time.', ES, '+'],
  ['Have difficulty understanding abstract ideas.', I, '-'],
  ['Feel comfortable around people.', E, '+'],
  ['Insult people.', A, '-'],
  ['Pay attention to details.', C, '+'],
  ['Worry about things.', ES, '-'],
  ['Have a vivid imagination.', I, '+'],
  ['Keep in the background.', E, '-'],
  ["Sympathise with others' feelings.", A, '+'],
  ['Make a mess of things.', C, '-'],
  ['Seldom feel blue.', ES, '+'],
  ['Am not interested in abstract ideas.', I, '-'],
  ['Start conversations.', E, '+'],
  ["Am not interested in other people's problems.", A, '-'],
  ['Get chores done right away.', C, '+'],
  ['Am easily disturbed.', ES, '-'],
  ['Have excellent ideas.', I, '+'],
  ['Have little to say.', E, '-'],
  ['Have a soft heart.', A, '+'],
  ['Often forget to put things back in their proper place.', C, '-'],
  ['Get upset easily.', ES, '-'],
  ['Do not have a good imagination.', I, '-'],
  ['Talk to a lot of different people at parties.', E, '+'],
  ['Am not really interested in others.', A, '-'],
  ['Like order.', C, '+'],
  ['Change my mood a lot.', ES, '-'],
  ['Am quick to understand things.', I, '+'],
  ["Don't like to draw attention to myself.", E, '-'],
  ['Take time out for others.', A, '+'],
  ['Shirk my duties.', C, '-'],
  ['Have frequent mood swings.', ES, '-'],
  ['Use difficult words.', I, '+'],
  ["Don't mind being the centre of attention.", E, '+'],
  ["Feel others' emotions.", A, '+'],
  ['Follow a schedule.', C, '+'],
  ['Get irritated easily.', ES, '-'],
  ['Spend time reflecting on things.', I, '+'],
  ['Am quiet around strangers.', E, '-'],
  ['Make people feel at ease.', A, '+'],
  ['Am exacting in my work.', C, '+'],
  ['Often feel blue.', ES, '-'],
  ['Am full of ideas.', I, '+'],
]

export const DIMENSION_LABELS = {
  [E]: 'Extraversion',
  [A]: 'Agreeableness',
  [C]: 'Conscientiousness',
  [ES]: 'Emotional stability',
  [I]: 'Openness',
}

const ipip50 = {
  id: 'ipip50',
  name: 'IPIP Big-Five Factor Markers',
  shortName: 'Personality',
  kind: 'quiz',
  tier: 'deepen',
  evidence: 'measured',
  estimatedMinutes: 8,
  rights: {
    status: 'cleared',
    basis: 'Public domain, commercial use explicitly permitted',
    url: 'https://ipip.ori.org/newPermission.htm',
  },
  instructions:
    'Describe yourself as you generally are now, not as you wish to be. There are no right answers, and the ones you answer quickly are usually the honest ones.',
  scale: {
    points: 5,
    anchors: {
      1: 'Very inaccurate',
      2: 'Moderately inaccurate',
      3: 'Neither',
      4: 'Moderately accurate',
      5: 'Very accurate',
    },
  },
  items: RAW.map(([text, dimension, keyed], index) => ({
    id: `ipip50_${index + 1}`,
    text,
    dimension,
    keyed,
  })),

  score(responses) {
    const sums = { [E]: 0, [A]: 0, [C]: 0, [ES]: 0, [I]: 0 }
    const counts = { [E]: 0, [A]: 0, [C]: 0, [ES]: 0, [I]: 0 }
    this.items.forEach((item) => {
      const raw = Number(responses[item.id])
      if (!raw) return
      sums[item.dimension] += item.keyed === '+' ? raw : 6 - raw
      counts[item.dimension] += 1
    })
    const out = {}
    for (const dimension of Object.keys(sums)) {
      if (!counts[dimension]) continue
      // Each scale is a 10-item sum running 10 to 50. Normalise to 0-100 using
      // however many items were actually answered, so a partial run still
      // yields a usable value rather than a silently deflated one.
      const min = counts[dimension]
      const max = counts[dimension] * 5
      out[dimension] = {
        raw: sums[dimension],
        value: Math.round(((sums[dimension] - min) / (max - min)) * 100),
        confidence: counts[dimension] / 10,
      }
    }
    return out
  },
}

export default ipip50
