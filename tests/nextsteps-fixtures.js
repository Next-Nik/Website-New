// tests/nextsteps-fixtures.js
//
// NextSteps — canonical acceptance fixtures for the Phase 1+2 endpoint.
// See: docs/NextSteps_Conceptual_Foundation_v1_1.md (Section 3.1, 3.3)
//
// Four canonical entry states. The endpoint is not signed off until it
// produces output that satisfies every emotional endpoint listed below
// for every fixture. These are versioned next to the code they test.
//
// Each fixture is:
//   id              - stable identifier
//   label           - human-readable
//   entry_state     - one of: activated | hot_grievance | subtle | diffuse
//   inputs          - sequence of user turns to drive the conversation
//   expects         - assertions about the final structured output and
//                     the conversational text leading to it
//
// The endpoint produces, on the final turn (the Reflection landing):
//   {
//     "type": "reflection",
//     "reframe_text":    "the spoken reframe — the three beats, performed",
//     "toward_sentence": "the completed want, in toward grammar",
//     "domains":         ["domain-key", ...],
//     "scale":           "civ" | "self",
//     "branch":          "reframe" | "mirror",
//     "closing":         "one line — what gets said as the person enters Phase 3"
//   }
//
// For diffuse, branch is "mirror" — no reframe is attempted; the toward_sentence
// may be null and domains may be empty until the person picks from the board.
//
// Assertions are intentionally about feel and structure, not exact strings.
// The reframe is judged by emotional endpoint, not by string match.

'use strict';

const FIXTURES = [
  // ── 1. ACTIVATED ──────────────────────────────────────────────────────────
  {
    id: 'activated_rainforest',
    label: 'Activated — Harrison Ford speech moment',
    entry_state: 'activated',
    inputs: [
      "I just saw what's happening to the rainforests and I can't sit here doing nothing. The mass extinction stuff is real and I feel like every other person is just scrolling past it. I want to help but I don't even know where to start.",
    ],
    expects: {
      branch: 'reframe',
      scale: 'civ',
      domains_includes_any: ['nature'],
      // Emotional endpoint: seen
      // The reframe must perform the three beats:
      //   1. name the grievance as real (not flinch at the urgency)
      //   2. complete it into the toward-want (regeneration, living systems)
      //   3. land in Nature with a "not first, not alone" signal
      reframe_must_contain_concepts: [
        'living systems', // or regeneration, or biodiversity restored
      ],
      reframe_must_not_contain_patterns: [
        /let me reframe/i,
        /what you really mean/i,
        /have you considered.*about you/i,
        /this is actually about/i,
      ],
      // Toward-sentence is a positive, standable destination — not a negation
      toward_sentence_must_not_start_with_negation: true,
      toward_sentence_min_length: 30,
    },
  },

  // ── 2. HOT GRIEVANCE ──────────────────────────────────────────────────────
  {
    id: 'hot_grievance_patriarchy',
    label: 'Hot grievance — named enemy, away-from with heat',
    entry_state: 'hot_grievance',
    inputs: [
      "Honestly? Tear down the patriarchy. Burn the whole thing. I'm tired of being polite about it.",
    ],
    expects: {
      branch: 'reframe',
      scale: 'civ',
      domains_includes_any: ['society'],
      // Emotional endpoint: seen — and specifically, MORE seen than before
      // they spoke. The response must:
      //   - not flinch at "burn the whole thing"
      //   - not get prissy about the framing
      //   - not lecture about civility
      //   - perform the bridge sentence ("if [X] were replaced, this is the
      //     direction of what we'd want to replace it with")
      //   - land the toward-want (communities where power isn't gendered,
      //     care is valued, women are safe)
      reframe_must_contain_concepts: [
        'replaced',  // the bridge sentence's hinge — "if it were replaced"
      ],
      reframe_must_not_contain_patterns: [
        /let me reframe/i,
        /civil/i,                              // no lectures about civility
        /more constructive/i,
        /perhaps a more.*way/i,
        /you might want to consider how you/i, // no tone-policing
        /your anger/i,                         // don't diagnose the emotion
        /it's understandable to feel/i,        // therapy-voice, soft condescension
      ],
      toward_sentence_must_not_start_with_negation: true,
      toward_sentence_min_length: 30,
    },
  },

  // ── 3. SUBTLE ─────────────────────────────────────────────────────────────
  {
    id: 'subtle_earning_a_living',
    label: 'Subtle — civ-flavoured language, self-scale wound',
    entry_state: 'subtle',
    inputs: [
      "Earning a living is a scam. The whole system is drudgery. I get up, I do work I don't care about, I come home tired, I do it again. Something has to change but I don't know what.",
    ],
    expects: {
      // The subtle case is read inside Phase 2 as a tone variant of the
      // reframe. It still completes the sentence. The crucial move is in
      // the domain landing in Phase 3: scale leans 'self', the both-ways
      // system is DESCRIBED, no verdict is applied to the person.
      branch: 'reframe',
      scale: 'self',
      domains_includes_any: ['path', 'spark'], // self-side domains
      // The reframe completes the toward-want (work that feels alive,
      // a life shape worth showing up for) without diagnosing the person.
      reframe_must_not_contain_patterns: [
        // No verdicts (Tone Law 1)
        /you are (a |an )?(person who|someone who)/i,
        /this is (actually )?about you/i,
        /your (real )?problem is/i,
        /what.s (really )?going on (with you|for you) is/i,
        // No failed-draft framing (Tone Law 2)
        /the system is.*fine/i,
        /everyone has to work/i,
        // No therapy-voice
        /it sounds like you/i,
      ],
      // The both-ways description must appear — that's what licenses the
      // self-leaning recommendation without verdict.
      reframe_must_contain_concepts: [
        'both', // both ways / both directions / from the self outward and from structure inward
      ],
      toward_sentence_must_not_start_with_negation: true,
      toward_sentence_min_length: 30,
    },
  },

  // ── 4. DIFFUSE ────────────────────────────────────────────────────────────
  {
    id: 'diffuse_everything_broken',
    label: 'Diffuse — no enemy, no problem, no clue',
    entry_state: 'diffuse',
    inputs: [
      "Everything is broken and I can't sit still. I don't even know what I'm trying to say. I just know I'm not okay with how things are.",
    ],
    expects: {
      // Diffuse branch: no reframe attempted; hand them the board.
      // Per Foundation 3.1, NextSteps may ask ONE warm orienting question
      // first — but only to decide which board (Civ or Self) to show.
      // Never to fish for the spark in dialogue.
      branch: 'mirror',
      // toward_sentence may be null at this stage — recognition happens
      // by the person picking from the board, not by the AI naming it.
      toward_sentence_allowed_null: true,
      domains_allowed_empty: true,
      // The mirror behaviour: invite recognition, not thinking.
      // Must NOT interrogate, must NOT diagnose, must NOT propose a domain.
      response_must_not_contain_patterns: [
        /which (domain|area) do you think/i,    // don't fish
        /what specifically/i,                    // don't interrogate
        /tell me more about why/i,
        /it sounds like (you|that)/i,            // don't reflect-and-name
      ],
      // Must offer the board as a structured mirror.
      response_must_contain_concepts: [
        'notice', // "notice which one your chest tightens around"
        // or: where your attention goes, what pulls you
      ],
    },
  },
];

// ── Tone Law guardrails — applied to ALL fixtures ────────────────────────────
// These are forbidden patterns regardless of entry state. If any fixture's
// final response contains any of these, the endpoint fails for that fixture.

const UNIVERSAL_FORBIDDEN_PATTERNS = [
  /let me reframe (that|this) for you/i,
  /what you really mean is/i,
  /have you considered that this is (actually|really) about you/i,
  /your (political )?(feeling|anger) is (actually|really) (just )?(a )?personal/i,
  // "Don't worry, [the build is] easy" — violates scarcity-honesty
  /don.t worry,? it.s easy/i,
  /the solution is simple/i,
  // Engagement bait / urgency manufacture
  /act now/i,
  /don.t wait/i,
  /limited time/i,
];

// ── Emotional endpoints per phase (Foundation 3.3) ───────────────────────────
// Tested by human review of the conversational output, not by string match.
// Listed here so reviewers know what they're checking against.

const EMOTIONAL_ENDPOINTS = {
  reflection: 'seen — more seen than before they spoke',
  domain_landing: 'not first, not alone — others are already building here',
  path: 'relief, and motion — the ocean is gone; there is a foot to put forward',
  loop: 'continued — not finished-and-abandoned, but advanced',
};

module.exports = {
  FIXTURES,
  UNIVERSAL_FORBIDDEN_PATTERNS,
  EMOTIONAL_ENDPOINTS,
};
