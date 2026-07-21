// src/constants/companionVoice.js
//
// The companion voice: every line the app says to a participant about their
// own effort. Register: simple, clean, almost basic. The kind of thing a
// supportive person says without thinking. Rewards showing up, never talent,
// never ease. The word "nothing" is banned. One list, one place, so language
// passes cost minutes.

export const VOICE = {
  // stage lines on the console (by local hour, when today is open)
  morning:   (kept) => `Day ${kept + 1}. Ready when you are.`,
  afternoon: () => 'Still time today.',
  evening:   () => "Still time to do your challenge today. You've got this!",
  lastlight: () => "There's still time today. Go get it!",

  // period cadences
  weekOpen:  () => 'This week is open. Ready when you are.',
  monthOpen: () => 'This month is open. Ready when you are.',
  onceOpen:  () => 'No clock on this one. Done once, done fully.',

  // completion moments
  complete:      (kept) => `Complete for today. Good job! ${kept} ${kept === 1 ? 'day' : 'days'} in a row!`,
  completeOnce:  () => 'Done, fully. Well done!',
  firstOfMany:   (left) => `Nice, one down. ${left} to go.`,
  swept:         () => 'All done for today. Well done!',
  weekComplete:  (kept) => `Week complete. Good job! ${kept} ${kept === 1 ? 'week' : 'weeks'} in a row!`,
  monthComplete: (kept) => `Month complete. Good job! ${kept} ${kept === 1 ? 'month' : 'months'} in a row!`,

  // milestones (fires on exact chain values)
  milestone: (kept, unit) => `${kept} ${unit} in a row! Keep it up!`,
  MILESTONES: [3, 7, 14, 21, 30, 50, 75],

  // grace and returns
  graceHeld: () => "A grace day covered yesterday. You're still going.",
  returned:  () => 'Welcome back! Day one starts now.',

  // push nudges
  nudgeEvening:   () => "Still time to do your challenge today. You've got this!",
  nudgeLastLight: () => "There's still time today. Go get it!",
  nudgeAfterDone: () => 'Done for today. See you tomorrow!',

  // the doors after a kept day
  doorInvite:  () => 'Invite a friend',
  doorAnother: () => 'Take on another',
}

// Which stage of the day are we in? Local time; the ramp never runs after
// today is complete.
export function dayStage(now = new Date()) {
  const h = now.getHours()
  if (h < 12) return 'morning'
  if (h < 19) return 'afternoon'
  if (h < 21) return 'evening'
  return 'lastlight'
}
