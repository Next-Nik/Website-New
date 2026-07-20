# Clarity Sweep · Verdict Sheet v1 executed · 20 July 2026
Routes 1–10, 13–16 fixed. Routes 11–12 (OrgPublic, Claim) HELD until the showcase layer lands · their verdicts carry.

Decisions applied (Nik): what-is line A on landing, E on /welcome · "Economy" user-facing everywhere (slug finance-economy frozen; Claim.jsx untouched — held territory) · Gap Signal interim copy fix only, mechanic untouched.

Highlights: what-is lines added (siteCopy registry + WelcomeStart) · "the system" removed as agent (FirstLight) · one close standardised on "Closes 28 September" · spark gloss ("1 spark = one real action, checked in") at first count on EarthLive, EarthJourney, PublicBeacon · constellation gloss on EarthJourney · Co-signed count hidden on ChallengePage until co-signing exists · "Post a challenge" standardised · Search placeholders made literal + toggle glosses visible for touch · Add flow unified on "Added to the Atlas." · InvitePage dead-link state explains itself · friendly auth errors on Login · en-GB dates throughout · register instruction added to horizon-align + org-extract prompts.

Known DB caveat: site_copy table overrides can shadow the fixed defaults for home.hiw.world.s3.body and home.align.cta — check founder overrides after deploy.

Verified: esbuild on all 28 JSX/JS files · node --check on both api files · scripts/audit-design.js clean.

Addendum: /challenges routing fix — signed-out visitors were hitting MyChallenges' sign-in wall. New ChallengesRoute in App.jsx: signed-out → redirect to /challenges/browse; signed-in → MyChallenges unchanged. The sign-in line also gained a "Browse open challenges →" link. Verified: esbuild, full build, live smoke test of the redirect.
