// src/lib/homecoming/session.js
//
// The Daily Return: six short moves. Each maps to a reset mechanism from
// Resetting_the_Allostatic_Setpoint_Homecoming.md (A predictability,
// B repeated felt-safety, C the disconfirming experience) and carries a guard.
// This module holds the SHAPE and the static copy; the page renders it and owns
// the interactive parts (breath timer, the resting hold, the mode check).
//
// PORTABLE: pure data. Voice is invitational — say what the move moves toward.

export const MOVES = [
  {
    id: 'land', num: 1, label: 'Land', tag: 'state literacy', mechanism: 'B',
    title: 'Which state are you in — right now?',
    body: "Name it. Naming a state settles it — that's affect labelling, the nervous system quieting as soon as a word lands on it. Your body reads its own weather fast — native equipment.",
    guard: { name: 'Stay with it', text: "Naming is the whole move, and it's done. Rest here a breath and let it be true." },
  },
  {
    id: 'breathe', num: 2, label: 'Breathe', tag: 'cyclic sighing', mechanism: 'B',
    title: 'Double inhale, long exhale.',
    body: "A small breath in through the nose, a second little sip to fill the top, then a long slow release through the mouth. The exhale is the medicine — it's what tips you toward the brake. Follow the circle.",
    guard: { name: 'Gentle · for your chest', text: 'Lead with the exhale. Let each inhale stay as easy as it wants — soft, only as full as feels good. You’re teaching the chest, in tiny safe doses, that it can open and hold what enters. This is the rehearsal for receiving.' },
  },
  {
    id: 'titrate', num: 3, label: 'Titrate', tag: 'resting', mechanism: 'B',
    title: 'Two minutes of okay.',
    body: 'Rest attention on one steady thing — feet on the floor, weight in the chair, the dog, the ravine in Bali. Then let it drift gently between a little tension and a little ease, like waves. The whole task is to stay.',
    guard: { name: 'Stay with it', text: 'This is the move that asks the most of you: stay. That pull to get to the next thing is the old pattern speaking. Let okay be okay — merely-okay, resting, is the rep. Lean in; you’ve got this.' },
  },
  {
    id: 'reassign', num: 4, label: 'Reassign', tag: 'one post', mechanism: 'A',
    title: 'Re-tell a protector its new job.',
    body: 'Read it, out loud if you can. Then — honestly — which does it feel like?',
    guard: { name: 'The gardener’s hand', text: 'When it grips, the vigilance is just looking for its new post. Hand it the real one: tend the conditions, keep them safe, and let them grow on their own time. Say it again as steadiness — soften the hand, and let it garden.' },
  },
  {
    id: 'receive', num: 5, label: 'Receive', tag: 'a receipt', mechanism: 'C',
    title: 'Catch one proof it’s working.',
    body: 'One small proof the new number is real: money that stayed, a reach-out you made, a moment you stayed in the room, a good thing you let land. Tiny counts.',
    guard: { name: 'Let it land', text: 'You let the feeling through in a body that’s safe now. Ten seconds; let it be felt. That’s how the old number updates.' },
  },
  {
    id: 'close', num: 6, label: 'Home', tag: 'for today', mechanism: 'A',
    title: 'That’s the rep.',
    body: 'Small, done, real. You handed the body one more proof. One rep is the whole dose. Lean in, come back tomorrow. You’ve got this.',
    guard: { name: 'Come back tomorrow', text: 'Read the month, not the morning — the set-point moves on the long average, slowly, under the noise. A plain Tuesday’s quiet rep is the cathedral going up, one stone at a time. Lean in, small, again tomorrow.' },
  },
]

export const MOVES_BY_ID = Object.fromEntries(MOVES.map(m => [m.id, m]))

// The between-session guard (reached from anywhere the pull shows up).
export const SCENE_ONE = {
  name: 'Scene one',
  title: 'This is scene one.',
  body: 'A pull has arrived — toward a spark, a fight, a fog, a way to shake the good loose. Here’s the frame: as the set-point eases down, the body reads the new calm as unfamiliar and reaches for the number it knows. This is the defence doing its old job. You’re watching it — which means you’re already a step free of it.',
  guard: 'Name it, and let it pass — it always does. Keep today steady and small while it moves through. Play the whole film forward, all the way to the aftermath you’ve already written. You know how this one ends.',
  // Urge-surfing: the shape of a craving, said plainly.
  surf: 'An urge crests like a wave and falls. It peaks in minutes, not hours. You don’t have to do anything but let it move through — watch it rise, watch it break, watch it go.',
}

// The three questions (his Practice vocabulary), asked of himself at the door.
export const THREE_QUESTIONS = 'Are you ready? Are you allowed? Are you choosing?'

// The safety line (guard G6). A person outranks the rep, said plainly.
export const REACH_FOR_A_PERSON =
  'This is a daily rep, and a person outranks it any day. When today is heavy, reach for a nervous system — a program call, a safe friend, a professional. That’s the strongest move there is.'

// The heavy-day door (guard G6, made a real surface). Calm hand-off to a
// person. The rep is deliberately NOT positioned as the answer in this moment.
export const SAFETY = {
  title: 'Right now, a person beats this tool.',
  body: 'If today is heavy — really heavy — the daily rep is not the thing. A nervous system is. Reaching for one is not a detour from the work; it is the work.',
  steps: [
    { label: 'Call your program person', note: 'the bookend call. Borrowed regulation is real medicine.' },
    { label: 'Text or ring a safe friend', note: 'you don’t need the right words. “Rough day, can we talk” is enough.' },
    { label: 'Reach a professional', note: 'your therapist, your doctor, or a helpline. This is what they are for.' },
  ],
  // Accurate as of build; the US line. Elsewhere, a local crisis line.
  crisis: 'If you might not be safe: in the US call or text 988 (Suicide & Crisis Lifeline), any time. Elsewhere, your local crisis line. You deserve a real voice, now.',
  close: 'The rep will keep. It is small and it is patient. Come back to it when you have a hand to hold first.',
}

