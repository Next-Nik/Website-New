// ─────────────────────────────────────────────────────────────
// CardLab.jsx — /admin/card-lab
//
// Founder-only diagnostic page for the Mission Control blank-card bug.
// TEMPORARY. Delete this file and its route once the rebuilt card is
// confirmed on WebKit.
//
// WHY IT EXISTS
// The blank-card bug has cost several deploy cycles because each cycle
// tested exactly one hypothesis: change one thing, push, look at Safari,
// learn one bit. This page renders every candidate structure at once, in
// both photo and no-photo state, so a single deploy answers the whole
// question on every device.
//
// Deliberately self-contained: its own scoped CSS (.cl-*), no import from
// MissionControl, no Supabase, no site_copy. It tests the STRUCTURE, not
// the data. If variant C renders and the real card does not, the problem
// is data or deployment, not structure — which is itself the answer to
// the "is the new code even live on this device" question.
//
// HOW TO READ IT
//   A · Legacy         — the original pre-fix build: <button> shell,
//                        overflow:hidden + border-radius + transform
//                        transition, media as a CSS background-image on a
//                        child carrying translateZ(0) and
//                        backface-visibility:hidden.
//   B · Current        — the same shell, but media as an absolutely
//                        positioned <img>, and the no-photo state as an
//                        inline <svg> with percentage sizing and no
//                        viewBox. This is what is deployed today.
//   C · Rebuilt        — the new pattern: <div> shell, no overflow clip,
//                        no layer hints, in-flow self-clipping <img>, and
//                        the no-photo state as a data-URI SVG on that
//                        SAME <img>.
//   D · Rebuilt, bare  — C with the scrim overlay removed, to isolate
//                        whether the overlay contributes anything.
//
// Expected on Chrome / Android: all four render.
// Expected on WebKit if the diagnosis is right: A and B blank (A in both
// states, B possibly differing between states, which would confirm the
// two-independent-faults reading), C and D render.
// If C or D also blanks, the diagnosis is wrong and the next place to
// look is the parent stacking context in MissionControl, not the card.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'

function isFounder(user) {
  return user?.app_metadata?.role === 'founder' || user?.user_metadata?.role === 'founder'
}

// A real same-origin JPEG that ships in /public, so the photo state needs
// no Supabase round trip and no auth. The URL box below lets you paste a
// real storage URL when you want to test the live asset instead.
const DEFAULT_PHOTO = '/hero-personal.jpg'

const FROM = '#a7b98f'
const TO   = '#5f7a48'

// The rebuilt no-photo source: same <img>, data-URI SVG, explicit
// width/height AND viewBox, everything URI-encoded so the '#' in the hex
// colours cannot truncate the URI at a fragment.
const GRADIENT_SRC = (() => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" ' +
    'viewBox="0 0 400 300" preserveAspectRatio="none">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    `<stop offset="0" stop-color="${FROM}"/>` +
    `<stop offset="1" stop-color="${TO}"/>` +
    '</linearGradient></defs>' +
    '<rect x="0" y="0" width="400" height="300" fill="url(#g)"/></svg>'
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
})()

const LAB_CSS = `
.cl-wrap { max-width: 1100px; margin: 0 auto; padding: 40px 20px 120px; }
.cl-h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 34px;
         font-weight: 500; color: #0F1523; margin: 0 0 6px; }
.cl-eyebrow { font-family: 'Cormorant SC', Georgia, serif; font-size: 13px;
              letter-spacing: .12em; text-transform: uppercase; color: rgba(15,21,35,0.72);
              margin-bottom: 10px; }
.cl-lede { font-family: Lora, Georgia, serif; font-size: 15px; line-height: 1.6;
           color: rgba(15,21,35,0.78); max-width: 680px; margin: 0 0 28px; }
.cl-urlrow { display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
             margin-bottom: 34px; }
.cl-urlrow input { flex: 1 1 340px; min-width: 240px; padding: 9px 12px;
                   font-family: Lora, Georgia, serif; font-size: 14px;
                   border: 1px solid rgba(15,21,35,0.20); border-radius: 8px;
                   background: #fff; color: #0F1523; }
.cl-urlrow button { -webkit-appearance: none; appearance: none; cursor: pointer;
                    padding: 9px 16px; border-radius: 8px; border: 0;
                    background: #0F1523; color: #fff; font-family: 'Cormorant SC', Georgia, serif;
                    font-size: 14px; letter-spacing: .06em; }

.cl-block { margin-bottom: 46px; }
.cl-vh { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 24px;
         font-weight: 500; color: #0F1523; margin: 0 0 4px; }
.cl-vp { font-family: Lora, Georgia, serif; font-size: 13.5px; line-height: 1.55;
         color: rgba(15,21,35,0.74); max-width: 700px; margin: 0 0 16px; }
.cl-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
           gap: 18px; }
.cl-state { font-family: 'Cormorant SC', Georgia, serif; font-size: 12px;
            letter-spacing: .1em; text-transform: uppercase; color: rgba(15,21,35,0.72);
            margin-bottom: 8px; }

/* ── Shared card body chrome (identical across all variants so only the
      media structure differs) ────────────────────────────────────────── */
.cl-body { padding: 16px 18px 20px; flex: 1; display: flex; flex-direction: column; }
.cl-kicker { font-family: 'Cormorant SC', Georgia, serif; font-size: 13px;
             font-weight: 600; letter-spacing: .12em; text-transform: uppercase;
             color: rgba(15,21,35,0.72); margin-bottom: 6px; }
.cl-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 23px;
            font-weight: 500; margin-bottom: 4px; color: #0F1523; }
.cl-blurb { font-family: Lora, Georgia, serif; font-size: 13px; line-height: 1.45;
            color: rgba(15,21,35,0.74); }

/* ── A + B: the legacy shell. <button>, overflow clip, transform
      transition. Reproduced exactly, including the layer hints. ─────── */
.cl-legacy {
  position: relative; border-radius: 18px; overflow: hidden;
  background: #FFFFFF; border: 1px solid rgba(15,21,35,0.12);
  box-shadow: 0 8px 28px rgba(38,36,32,.10);
  cursor: pointer; transition: transform .3s ease, box-shadow .3s ease;
  text-align: left; color: inherit; font-family: inherit; padding: 0;
  display: flex; flex-direction: column; min-height: 230px; width: 100%;
}
.cl-legacy:hover { transform: translateY(-4px); }
.cl-legacy-media {
  height: 150px; background-size: cover; background-position: center;
  position: relative; display: block;
  -webkit-transform: translateZ(0); transform: translateZ(0);
  -webkit-backface-visibility: hidden; backface-visibility: hidden;
}
.cl-legacy-media::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,.28));
}
.cl-legacy-grad { background-image: linear-gradient(135deg, ${FROM}, ${TO}); }

/* ── C + D: the rebuilt shell. <div>, no overflow clip, no layer hints,
      in-flow self-clipping <img>. ───────────────────────────────────── */
.cl-new {
  position: relative; border-radius: 18px;
  background: #FFFFFF; border: 1px solid rgba(15,21,35,0.12);
  box-shadow: 0 8px 28px rgba(38,36,32,.10);
  cursor: pointer; transition: transform .3s ease, box-shadow .3s ease;
  text-align: left; display: flex; flex-direction: column; min-height: 230px;
}
.cl-new:hover { transform: translateY(-4px); }
.cl-new-media { position: relative; height: 150px; flex: 0 0 150px; }
.cl-new-photo {
  display: block; width: 100%; height: 150px; object-fit: cover;
  border-radius: 17px 17px 0 0; pointer-events: none;
}
.cl-new-scrim {
  position: absolute; left: 0; right: 0; top: 0; bottom: 0;
  border-radius: 17px 17px 0 0; pointer-events: none;
  background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,.28));
}
.cl-new-hit {
  position: absolute; left: 0; right: 0; top: 0; bottom: 0; z-index: 2;
  -webkit-appearance: none; appearance: none; background: transparent;
  border: 0; border-radius: 18px; padding: 0; margin: 0; cursor: pointer;
}

.cl-verdict { font-family: Lora, Georgia, serif; font-size: 13px;
              color: rgba(15,21,35,0.72); background: #FFFFFF;
              border: 1px solid rgba(15,21,35,0.12); border-radius: 12px;
              padding: 16px 18px; margin-top: 8px; line-height: 1.6; }
.cl-verdict b { font-weight: 600; color: #0F1523; }
`

// ── A + B share the legacy shell; only the media differs. ──────────────
function LegacyCard({ mode, photo }) {
  // mode: 'bg' (variant A) | 'img' (variant B)
  const media =
    mode === 'bg'
      ? (
        <span
          className={`cl-legacy-media${photo ? '' : ' cl-legacy-grad'}`}
          style={photo ? { backgroundImage: `url("${photo}")` } : undefined}
        />
      )
      : (
        <span className="cl-legacy-media">
          {photo ? (
            <img
              src={photo}
              alt=""
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', display: 'block', pointerEvents: 'none',
              }}
            />
          ) : (
            <span style={{ position: 'absolute', inset: 0, display: 'block', pointerEvents: 'none' }}>
              {/* No viewBox, percentage sizing — reproduced as deployed. */}
              <svg width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id={`cl-lg-${mode}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={FROM} />
                    <stop offset="100%" stopColor={TO} />
                  </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill={`url(#cl-lg-${mode})`} />
              </svg>
            </span>
          )}
        </span>
      )

  return (
    <button type="button" className="cl-legacy">
      {media}
      <span className="cl-body">
        <span className="cl-kicker">Circles</span>
        <span className="cl-title">Move with people</span>
        <span className="cl-blurb">The people walking the same way as you.</span>
      </span>
    </button>
  )
}

// ── C + D: the rebuilt card. One <img> for both states. ───────────────
function NewCard({ photo, scrim }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [photo])
  const showPhoto = !!photo && !failed
  return (
    <div className="cl-new">
      <div className="cl-new-media">
        <img
          className="cl-new-photo"
          src={showPhoto ? photo : GRADIENT_SRC}
          alt=""
          draggable={false}
          onError={() => { if (showPhoto) setFailed(true) }}
        />
        {scrim && <span className="cl-new-scrim" aria-hidden="true" />}
      </div>
      <div className="cl-body">
        <span className="cl-kicker">Circles</span>
        <span className="cl-title">Move with people</span>
        <span className="cl-blurb">The people walking the same way as you.</span>
      </div>
      <button type="button" className="cl-new-hit" aria-label="Move with people" />
    </div>
  )
}

function Variant({ id, title, note, render, photo }) {
  return (
    <div className="cl-block">
      <h2 className="cl-vh">{id} · {title}</h2>
      <p className="cl-vp">{note}</p>
      <div className="cl-state">With a photo</div>
      <div className="cl-grid" style={{ marginBottom: 22 }}>
        {render(photo)}
        {render(photo)}
      </div>
      <div className="cl-state">No photo · fallback colour</div>
      <div className="cl-grid">
        {render(null)}
        {render(null)}
      </div>
    </div>
  )
}

export function CardLabPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [photo, setPhoto] = useState(DEFAULT_PHOTO)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!loading && !isFounder(user)) navigate('/', { replace: true })
  }, [loading, user, navigate])

  if (loading || !isFounder(user)) return null

  return (
    <div style={{ minHeight: '100dvh', background: '#FAFAF7' }}>
      <style>{LAB_CSS}</style>
      <Nav />
      <div className="cl-wrap">
        <div className="cl-eyebrow">Founder Lab · Not Public · Delete after use</div>
        <h1 className="cl-h1">Card Lab</h1>
        <p className="cl-lede">
          Four candidate structures for the Mission Control home card, each in both
          photo and no-photo state. Open this page on every affected device once and
          note which blocks render. That replaces one deploy per hypothesis with one
          deploy for all of them.
        </p>

        <div className="cl-urlrow">
          <input
            type="text"
            value={draft}
            placeholder="Optional: paste a real site-images URL to test the live asset"
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="button" onClick={() => setPhoto(draft.trim() || DEFAULT_PHOTO)}>
            Use this photo
          </button>
          <button type="button" onClick={() => { setDraft(''); setPhoto(DEFAULT_PHOTO) }}>
            Reset
          </button>
        </div>

        <Variant
          id="A"
          title="Legacy — CSS background-image"
          note="The original build. <button> shell with overflow:hidden, border-radius and a transform transition; media as a CSS background-image on a child carrying translateZ(0) and backface-visibility:hidden. If this blanks and C renders, the shell was the problem."
          photo={photo}
          render={(p) => <LegacyCard mode="bg" photo={p} />}
        />

        <Variant
          id="B"
          title="Current — absolute <img> and inline <svg>"
          note="What is deployed today. Same legacy shell and same layer hints, but the photo is an absolutely positioned <img> and the no-photo state is an inline <svg> with percentage sizing and no viewBox. Watch the two states separately here: if the photo row and the colour row behave differently, that confirms two independent faults rather than one."
          photo={photo}
          render={(p) => <LegacyCard mode="img" photo={p} />}
        />

        <Variant
          id="C"
          title="Rebuilt"
          note="<div> shell, no overflow clip, no layer hints, in-flow <img> carrying its own border-radius, and the no-photo state as a data-URI SVG on that same <img>. One element, one paint path, both states."
          photo={photo}
          render={(p) => <NewCard photo={p} scrim />}
        />

        <Variant
          id="D"
          title="Rebuilt — no scrim"
          note="Variant C with the gradient overlay removed, to confirm the overlay contributes nothing to the failure. If C blanks and D renders, the scrim is implicated and it can simply go."
          photo={photo}
          render={(p) => <NewCard photo={p} scrim={false} />}
        />

        <div className="cl-verdict">
          <b>Reading the result.</b> C and D render, A and B blank → the diagnosis
          holds and the rebuilt card is correct; delete this page.<br />
          A and B render here but the real Mission Control card still blanks → the
          structure was never the problem and the deployed bundle is not what you
          think it is; clear the service worker and check again.<br />
          C or D also blanks → the diagnosis is wrong. Next place to look is the
          parent stacking context in MissionControl, not this card.
        </div>
      </div>
    </div>
  )
}

export default CardLabPage
