// src/lib/care/instruments/openNeeds.js
//
// The open question. Original, ours, and the most important input in the
// engine despite scoring nothing.
//
// Two jobs: it feeds the synthesis, and it supplies the card's single italic
// line. Design law reserves italic for user-authored words, and this is the
// only place on the card where the person speaks in their own voice rather
// than being described by a system. A partner should receive "silence reads
// louder than you mean it to" in the person's own words.

const openNeeds = {
  id: 'open_needs',
  name: 'The open question',
  shortName: 'In your words',
  kind: 'freetext',
  tier: 'core',
  evidence: 'measured',      // it is a direct self-report, not an inference
  estimatedMinutes: 2,
  rights: { status: 'cleared', basis: 'Original', url: null },
  items: [
    {
      id: 'open_wish',
      text: 'What do you wish people knew about caring for you?',
      hint: 'One or two sentences. The thing you have explained before and would rather not have to explain again.',
      type: 'longtext',
      maxLength: 600,
    },
    {
      id: 'open_line',
      text: 'If the card could only carry one sentence in your own voice, what would it say?',
      hint: 'This is the line a partner reads in your words rather than the system\'s. Leave it blank and we will offer one drawn from your answer above.',
      type: 'text',
      maxLength: 160,
      optional: true,
    },
  ],
  score() {
    return {}
  },
}

export default openNeeds
