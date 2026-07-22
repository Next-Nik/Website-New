// ─────────────────────────────────────────────────────────────
// SelfDomainResources.jsx
//
// Mounts inside SelfDomainPanel below the per-domain readout. Surfaces
// "next steps" suggestions for the currently-featured domain, sourced
// from two layers:
//
//   • CURATED: hand-vetted entries from src/beta/constants/selfResources.js.
//     Authored summaries we wrote and stand behind.
//
//   • FROM THE OPEN WEB: results returned by the server-side search proxy
//     at /api/self-resources-search. Snippets are the source's own words,
//     never paraphrased. (Wired in step 4 of the brief; for step 2 the
//     zone renders a calm placeholder.)
//
// The CTA framing is locked: "If you're aiming there and starting here,
// here are some possible next steps." That copy only makes sense if the
// suggestions actually reflect where 'here' is — so band-aware filtering
// is part of the contract, applied in getCuratedFor() for Layer A and
// passed as a query parameter to the search proxy for Layer B.
//
// Honest empty states: when neither layer has anything, we say so.
// No fake suggestions, no "AI-recommended for you" theatre.
//
// Props:
//   domain:     domain object        the SELF_DOMAINS entry currently featured
//   currentScore: number | null      the user's current Map score for this domain
//   horizonScore: number | null      their horizon score
//   curated:    Resource[]           Layer A entries pre-filtered by parent
//   webResults: Resource[] | null    Layer B entries (null = not yet loaded /
//                                     not yet wired). When null, the zone
//                                     renders a "coming soon" placeholder
//                                     rather than an empty state.
//   webStatus:  'idle' | 'loading' | 'ready' | 'error' | 'unwired'
//                                     'unwired' is the step-2 default.
//   webReason:  string | null         when webStatus === 'ready' and webResults
//                                     is empty, this distinguishes between
//                                     'no-quality-matches' (real empty) and
//                                     'unconfigured' (key not set in env).
//   onShowMore: () => void           optional. Triggers a Layer B fetch.
// ─────────────────────────────────────────────────────────────

import {
  GOLD, GOLD_DK, GOLD_RULE, GOLD_FAINT, GOLD_HOVER,
  TEXT_INK, TEXT_META, TEXT_FAINT,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'

const RESOURCES_CSS = makeCss()

export default function SelfDomainResources({
  domain,
  currentScore = null,
  horizonScore = null,
  curated = [],
  webResults = null,
  webStatus = 'unwired',
  webReason = null,
  onShowMore,
}) {
  if (!domain) return null

  const hasCurrent = currentScore != null
  const hasHorizon = horizonScore != null
  const hasCurated = Array.isArray(curated) && curated.length > 0
  const hasWeb     = Array.isArray(webResults) && webResults.length > 0

  // The "aiming there, starting here" framing only fully resolves when the
  // user has placed the domain. When they haven't, the section still has
  // a place — it just leads with a different invitation.
  const heading = hasCurrent
    ? 'If you\'re aiming there and starting here'
    : 'Some possible next steps'

  const subheading = hasCurrent && hasHorizon
    ? `Resources tuned to where you are in ${domain.name}.`
    : hasCurrent
    ? `Resources tuned to where you are in ${domain.name}.`
    : `Place yourself on The Map first to see resources tuned to where you are. In the meantime, these apply broadly.`

  return (
    <section className="mc-self-resources">
      <style>{RESOURCES_CSS}</style>

      <header className="mc-self-resources-header">
        <p className="mc-self-resources-eyebrow">NEXT STEPS</p>
        <h3 className="mc-self-resources-heading">{heading}</h3>
        <p className="mc-self-resources-sub">{subheading}</p>
      </header>

      {/* ZONE 1 — CURATED */}
      <div className="mc-self-resources-zone">
        <div className="mc-self-resources-zone-head">
          <span className="mc-self-resources-zone-title">Read and recommended</span>
          <span className="mc-self-resources-zone-meta">
            Hand-vetted by NextUs editorial.
          </span>
        </div>

        {hasCurated ? (
          <ul className="mc-self-resources-list">
            {curated.map(r => (
              <li key={r.id}>
                <ResourceCard resource={r} provenance="curated" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mc-self-resources-empty">
            <p>
              The curated library for {domain.name} is still being authored. As we add resources we have read and stand behind, they will surface here first.
            </p>
          </div>
        )}
      </div>

      {/* ZONE 2 — FROM THE OPEN WEB */}
      <div className="mc-self-resources-zone">
        <div className="mc-self-resources-zone-head">
          <span className="mc-self-resources-zone-title">From the open web</span>
          <span className="mc-self-resources-zone-meta">
            Search results, not endorsements. NextUs has not vetted these.
          </span>
        </div>

        {webStatus === 'unwired' && (
          <div className="mc-self-resources-empty mc-self-resources-empty-soft">
            <p>Web sourcing for this domain comes online soon.</p>
          </div>
        )}

        {webStatus === 'idle' && (
          <div className="mc-self-resources-empty mc-self-resources-empty-soft">
            <p>Click "show more" below to search the open web for additional starting points.</p>
            {onShowMore && (
              <button
                type="button"
                className="mc-self-resources-show-more"
                onClick={onShowMore}
              >
                Show more from the web
              </button>
            )}
          </div>
        )}

        {webStatus === 'loading' && (
          <div className="mc-self-resources-empty mc-self-resources-empty-soft">
            <p>Searching…</p>
          </div>
        )}

        {webStatus === 'error' && (
          <div className="mc-self-resources-empty mc-self-resources-empty-soft">
            <p>The search did not come back this time. Try again in a moment.</p>
            {onShowMore && (
              <button
                type="button"
                className="mc-self-resources-show-more"
                onClick={onShowMore}
              >
                Try again
              </button>
            )}
          </div>
        )}

        {webStatus === 'ready' && hasWeb && (
          <ul className="mc-self-resources-list">
            {webResults.map(r => (
              <li key={r.id || r.url}>
                <ResourceCard resource={r} provenance="web" />
              </li>
            ))}
          </ul>
        )}

        {webStatus === 'ready' && !hasWeb && webReason === 'unconfigured' && (
          <div className="mc-self-resources-empty mc-self-resources-empty-soft">
            <p>Web sourcing has not been configured for this environment yet.</p>
          </div>
        )}

        {webStatus === 'ready' && !hasWeb && webReason !== 'unconfigured' && (
          <div className="mc-self-resources-empty mc-self-resources-empty-soft">
            <p>The search did not turn up anything that cleared the source filters this time.</p>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Resource card ───────────────────────────────────────────

function ResourceCard({ resource, provenance }) {
  const { type, title, author, source, url, year, summary } = resource
  const typeLabel = TYPE_LABELS[type] || type

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mc-self-resource-card"
    >
      <div className="mc-self-resource-row">
        <span className="mc-self-resource-type">{typeLabel}</span>
        <span className={
          provenance === 'curated'
            ? 'mc-self-resource-prov mc-self-resource-prov-curated'
            : 'mc-self-resource-prov mc-self-resource-prov-web'
        }>
          {provenance === 'curated' ? 'Curated' : 'From the open web'}
        </span>
      </div>

      <h4 className="mc-self-resource-title">{title}</h4>

      <p className="mc-self-resource-meta">
        {author && <span>{author}</span>}
        {author && source && <span className="mc-self-resource-dot">·</span>}
        {source && <span>{source}</span>}
        {year != null && <span className="mc-self-resource-dot">·</span>}
        {year != null && <span>{year}</span>}
      </p>

      {summary && (
        <p className="mc-self-resource-summary">{summary}</p>
      )}

      <span className="mc-self-resource-link">Open ›</span>
    </a>
  )
}

// ─── Constants & helpers ─────────────────────────────────────

const TYPE_LABELS = {
  book:     'BOOK',
  talk:     'TALK',
  article:  'ARTICLE',
  practice: 'PRACTICE',
  tool:     'TOOL',
}

function makeCss() {
  return `
.mc-self-resources {
  margin: 28px 0 0;
  padding-top: 24px;
  border-top: 1px solid ${GOLD_RULE};
}

.mc-self-resources-header {
  margin-bottom: 18px;
}
.mc-self-resources-eyebrow {
  font-family: ${FONT_SC};
  font-size: 10.5px;
  letter-spacing: 0.22em;
  color: ${GOLD_DK};
  margin: 0 0 6px;
}
.mc-self-resources-heading {
  font-family: ${FONT_DISPLAY};
  font-size: 22px;
  font-weight: 500;
  color: ${TEXT_INK};
  margin: 0 0 6px;
  letter-spacing: -0.005em;
}
.mc-self-resources-sub {
  font-family: ${FONT_BODY};
  font-size: 14px;
  color: ${TEXT_META};
  margin: 0;
  line-height: 1.5;
}

.mc-self-resources-zone {
  margin-top: 22px;
}
.mc-self-resources-zone-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 10px;
}
.mc-self-resources-zone-title {
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.20em;
  color: ${GOLD_DK};
  text-transform: uppercase;
}
.mc-self-resources-zone-meta {
  font-family: ${FONT_BODY};
  font-size: 12px;
  font-style: italic;
  color: ${TEXT_FAINT};
}

.mc-self-resources-empty {
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px dashed ${GOLD_RULE};
  background: transparent;
  color: ${TEXT_META};
  font-family: ${FONT_BODY};
  font-size: 14px;
  line-height: 1.5;
}
.mc-self-resources-empty p {
  margin: 0 0 8px;
}
.mc-self-resources-empty p:last-child {
  margin: 0;
}
.mc-self-resources-empty-soft {
  border-color: rgba(38,36,32, 0.18);
}

.mc-self-resources-show-more {
  margin-top: 10px;
  background: transparent;
  border: 1px solid ${GOLD};
  color: ${GOLD_DK};
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  padding: 8px 14px;
  border-radius: 40px;
  cursor: pointer;
  transition: all 0.18s ease;
}
.mc-self-resources-show-more:hover {
  background: ${GOLD_HOVER};
}

.mc-self-resources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mc-self-resource-card {
  display: block;
  padding: 16px 18px;
  background: #FFFFFF;
  border: 1px solid ${GOLD_RULE};
  border-radius: 14px;
  text-decoration: none;
  color: ${TEXT_INK};
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}
.mc-self-resource-card:hover {
  border-color: ${GOLD};
  background: ${GOLD_FAINT};
}

.mc-self-resource-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.mc-self-resource-type {
  font-family: ${FONT_SC};
  font-size: 9.5px;
  letter-spacing: 0.20em;
  color: ${GOLD_DK};
  background: ${GOLD_FAINT};
  padding: 3px 8px;
  border-radius: 40px;
}
.mc-self-resource-prov {
  font-family: ${FONT_SC};
  font-size: 9px;
  letter-spacing: 0.18em;
  padding: 3px 8px;
  border-radius: 40px;
  text-transform: uppercase;
}
.mc-self-resource-prov-curated {
  background: ${GOLD};
  color: #FFFFFF;
}
.mc-self-resource-prov-web {
  background: transparent;
  border: 1px solid ${TEXT_FAINT};
  color: ${TEXT_META};
}

.mc-self-resource-title {
  font-family: ${FONT_DISPLAY};
  font-size: 18px;
  font-weight: 500;
  color: ${TEXT_INK};
  margin: 0 0 4px;
  line-height: 1.3;
}
.mc-self-resource-meta {
  font-family: ${FONT_BODY};
  font-size: 13px;
  color: ${TEXT_META};
  margin: 0 0 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0;
}
.mc-self-resource-meta > span {
  display: inline-block;
}
.mc-self-resource-dot {
  margin: 0 6px;
  color: ${TEXT_FAINT};
}
.mc-self-resource-summary {
  font-family: ${FONT_BODY};
  font-size: 14px;
  color: ${TEXT_INK};
  margin: 0 0 8px;
  line-height: 1.55;
}
.mc-self-resource-link {
  font-family: ${FONT_SC};
  font-size: 10.5px;
  letter-spacing: 0.18em;
  color: ${GOLD_DK};
}

@media (max-width: 640px) {
  .mc-self-resources-heading { font-size: 19px; }
  .mc-self-resource-title { font-size: 16px; }
  .mc-self-resource-card { padding: 14px 14px; }
  .mc-self-resources-zone-head {
    gap: 6px;
    flex-direction: column;
    align-items: flex-start;
  }
}
`
}
