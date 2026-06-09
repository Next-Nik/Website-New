// src/tools/planet/PlanetMap.jsx
// NextUs Map: Planet
// Route: /tools/planet
// Auth: AuthGate fires at assessment start — tool-first flow
// Assessment modes: self, nextus, both (side-by-side with gap signal)

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { Nav } from '../../components/Nav'
import { AuthGate } from '../../components/AuthGate'
import { PLANET_DOMAINS, PLANET_SCALE, PLANET_SCALE_BY_SCORE, getPlanetScoreColor } from '../../constants/horizonScalePlanet'
import { PlanetWheel } from './PlanetWheel'
import { PlanetDomainCard } from './PlanetDomainCard'
import { PlanetGapSignal } from './PlanetGapSignal'
import { ActorClaimGate } from './ActorClaimGate'
import { EffortSignalPanel } from '../../app/components/EffortSignalPanel'
import { serif, body, sc } from '../../lib/designTokens'

function isFounder(user) {
  return user?.user_metadata?.role === 'founder'
}

// TODO: confirm this key exists in src/constants/routes.js — add ROUTES.planetMap = '/tools/planet' if missing
const TOOL_PATH = '/tools/planet'
// TODO: confirm north_star_notes CHECK constraint includes 'planet-map' — add if missing
const NORTH_STAR_KEY = 'planet-map'
// TODO: confirm table name against Supabase schema — create if not yet existing
const TABLE = 'planet_map_results'

// Assessment steps
const STEPS = {
  LANDING:    'landing',
  ACTOR:      'actor',       // claim or create actor record
  ASSESS:     'assess',      // domain-by-domain scoring
  RESULTS:    'results',
}

export default function PlanetMap() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]             = useState(STEPS.LANDING)
  const [actorRecord, setActorRecord] = useState(null)
  const [scores, setScores]         = useState({})           // { domain_key: { score, notes } }
  const [nextusScores, setNextusScores] = useState(null)     // populated if NextUs-assessed record exists
  const [synthesis, setSynthesis]   = useState(null)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)
  const [authOpen, setAuthOpen]     = useState(false)
  const [activeDomain, setActiveDomain] = useState(null)

  // On mount with auth: check for existing actor + any NextUs assessment
  useEffect(() => {
    if (!user) return
    loadActorAndScores()
  }, [user])

  async function loadActorAndScores() {
    try {
      // Load claimed actor for this user
      const { data: actor } = await supabase
        .from('nextus_actors')
        .select('*')
        .eq('claimed_by', user.id)
        .maybeSingle()

      if (actor) {
        setActorRecord(actor)
        // Load existing planet map results for this actor
        const { data: results } = await supabase
          .from(TABLE)
          .select('*')
          .eq('actor_id', actor.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (results?.length) {
          // Split self vs nextus assessments
          const selfResult = results.find(r => r.assessment_type === 'self')
          const nextusResult = results.find(r => r.assessment_type === 'nextus')

          if (selfResult?.scores) setScores(selfResult.scores)
          if (nextusResult?.scores) setNextusScores(nextusResult.scores)
          if (selfResult?.synthesis) setSynthesis(selfResult.synthesis)
        }
      }
    } catch (err) {
      console.error('PlanetMap: failed to load actor/scores', err)
    }
  }

  function handleBeginAssessment() {
    if (loading) return
    if (!user) {
      setAuthOpen(true)
      return
    }
    // If user has no actor record, go to actor claim step first
    if (!actorRecord) {
      setStep(STEPS.ACTOR)
    } else {
      setStep(STEPS.ASSESS)
    }
  }

  function handleActorClaimed(actor) {
    setActorRecord(actor)
    setStep(STEPS.ASSESS)
  }

  function handleDomainScore(domainKey, score, notes = '') {
    setScores(prev => ({ ...prev, [domainKey]: { score, notes } }))
  }

  async function handleSubmitAssessment() {
    if (!user || !actorRecord) return
    const allScored = PLANET_DOMAINS.every(d => scores[d.key]?.score)
    if (!allScored) {
      setError('Please score all seven domains before submitting.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Generate synthesis via API
      const synthRes = await fetch('/tools/planet/api/synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scores,
          actorName: actorRecord.name,
          actorType: actorRecord.actor_type,
        }),
      })
      const synthData = await synthRes.json()
      const generatedSynthesis = synthData.synthesis ?? null

      // Write to Supabase
      const { error: writeErr } = await supabase
        .from(TABLE)
        .upsert({
          actor_id:        actorRecord.id,
          user_id:         user.id,
          assessment_type: 'self',
          scores,
          synthesis:       generatedSynthesis,
          is_published:    false,
          created_at:      new Date().toISOString(),
        }, {
          onConflict: 'actor_id,assessment_type',
        })

      if (writeErr) throw writeErr

      setSynthesis(generatedSynthesis)
      setStep(STEPS.RESULTS)
    } catch (err) {
      console.error('PlanetMap: failed to save assessment', err)
      setError('Something went wrong saving your assessment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) return <LoadingShell />
  if (!isFounder(user)) return null  // founder-only beta

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7' }}>
      <Nav activePath="nextus-self" />

      {/* Auth gate — fires when unauthenticated user tries to begin */}
      <AuthGate
        toolName="NextUs Map: Planet"
        open={authOpen}
        onClose={() => setAuthOpen(false)}
      />

      {step === STEPS.LANDING && (
        <LandingView
          user={user}
          actorRecord={actorRecord}
          hasExistingScores={Object.keys(scores).length > 0}
          onBegin={handleBeginAssessment}
        />
      )}

      {step === STEPS.ACTOR && (
        <ActorClaimGate
          user={user}
          onClaimed={handleActorClaimed}
          onBack={() => setStep(STEPS.LANDING)}
        />
      )}

      {step === STEPS.ASSESS && (
        <AssessmentView
          actorRecord={actorRecord}
          scores={scores}
          activeDomain={activeDomain}
          onSetActiveDomain={setActiveDomain}
          onScore={handleDomainScore}
          onSubmit={handleSubmitAssessment}
          saving={saving}
          error={error}
        />
      )}

      {step === STEPS.RESULTS && (
        <ResultsView
          actorRecord={actorRecord}
          scores={scores}
          nextusScores={nextusScores}
          synthesis={synthesis}
          onReassess={() => setStep(STEPS.ASSESS)}
        />
      )}
    </div>
  )
}

// ─── Landing ───────────────────────────────────────────────────────────────

function LandingView({ user, actorRecord, hasExistingScores, onBegin }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '80px 24px 120px' }}>
      {/* Eyebrow */}
      <p style={{
        ...sc,
        fontSize: 11,
        letterSpacing: '0.12em',
        color: '#A8721A',
        textTransform: 'uppercase',
        marginBottom: 16,
      }}>
        NextUs · Planet Scale
      </p>

      {/* Headline */}
      <h1 style={{
        ...serif,
        fontSize: 'clamp(36px, 6vw, 56px)',
        fontWeight: 300,
        color: '#0F1523',
        lineHeight: 1.1,
        marginBottom: 24,
      }}>
        NextUs Map: Planet
      </h1>

      {/* Subhead */}
      <p style={{
        ...body,
        fontSize: 18,
        color: '#0F1523',
        lineHeight: 1.65,
        marginBottom: 16,
        maxWidth: 600,
      }}>
        A seven-domain civilisational assessment. Where does this actor — this organisation, this country, this institution — actually stand? And where is it going?
      </p>

      <p style={{
        ...body,
        fontSize: 16,
        color: 'rgba(15,21,35,0.72)',
        lineHeight: 1.65,
        marginBottom: 48,
        maxWidth: 600,
      }}>
        Not a ranking. Not a judgment. A map. The gap between where things are and where they could be is the most honest thing on the page.
      </p>

      {/* Domain pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 48 }}>
        {PLANET_DOMAINS.map(d => (
          <span key={d.key} style={{
            ...sc,
            fontSize: 11,
            letterSpacing: '0.08em',
            color: d.color,
            border: `1px solid ${d.color}`,
            borderRadius: 3,
            padding: '4px 10px',
          }}>
            {d.label}
          </span>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onBegin}
        style={{
          ...sc,
          fontSize: 13,
          letterSpacing: '0.1em',
          background: '#C8922A',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 4,
          padding: '14px 32px',
          cursor: 'pointer',
        }}
      >
        {hasExistingScores ? 'View or update assessment →' : 'Begin assessment →'}
      </button>

      {actorRecord && (
        <p style={{
          ...body,
          fontSize: 13,
          color: 'rgba(15,21,35,0.55)',
          marginTop: 16,
        }}>
          Assessing as: {actorRecord.name}
        </p>
      )}

      {/* Effort signal — the bottom-up companion. Shown on the landing
          view so visitors see the work-in-motion before they begin their
          own assessment. */}
      <div style={{ marginTop: 80,
        paddingTop: 48,
        borderTop: '1px solid rgba(200,146,42,0.18)' }}>
        <EffortSignalPanel />
      </div>
    </div>
  )
}

// ─── Assessment ────────────────────────────────────────────────────────────

function AssessmentView({ actorRecord, scores, activeDomain, onSetActiveDomain, onScore, onSubmit, saving, error }) {
  const completedCount = Object.keys(scores).length
  const allComplete = completedCount === PLANET_DOMAINS.length

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px 120px' }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <p style={{
          ...sc,
          fontSize: 11,
          letterSpacing: '0.12em',
          color: '#A8721A',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          {actorRecord?.name} · Self-assessment
        </p>
        <h2 style={{
          ...serif,
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 300,
          color: '#0F1523',
          marginBottom: 0,
        }}>
          Score each domain honestly
        </h2>
        <p style={{
          ...body,
          fontSize: 15,
          color: 'rgba(15,21,35,0.72)',
          marginTop: 12,
          lineHeight: 1.6,
        }}>
          1 is critical. 10 is the Horizon. 5 is genuine mixed progress. Be honest — the gap is the signal.
        </p>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ ...body, fontSize: 13, color: 'rgba(15,21,35,0.72)' }}>
            {completedCount} of 7 domains scored
          </span>
        </div>
        <div style={{ height: 2, background: 'rgba(200,146,42,0.15)', borderRadius: 1 }}>
          <div style={{
            height: '100%',
            width: `${(completedCount / 7) * 100}%`,
            background: '#C8922A',
            borderRadius: 1,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Domain cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 48 }}>
        {PLANET_DOMAINS.map(domain => (
          <PlanetDomainCard
            key={domain.key}
            domain={domain}
            currentScore={scores[domain.key]?.score ?? null}
            notes={scores[domain.key]?.notes ?? ''}
            isActive={activeDomain === domain.key}
            onOpen={() => onSetActiveDomain(domain.key)}
            onClose={() => onSetActiveDomain(null)}
            onScore={(score, notes) => onScore(domain.key, score, notes)}
          />
        ))}
      </div>

      {error && (
        <p style={{ ...body, fontSize: 14, color: '#C0392B', marginBottom: 24 }}>
          {error}
        </p>
      )}

      <button
        onClick={onSubmit}
        disabled={!allComplete || saving}
        style={{
          ...sc,
          fontSize: 13,
          letterSpacing: '0.1em',
          background: allComplete ? '#C8922A' : 'rgba(200,146,42,0.3)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 4,
          padding: '14px 32px',
          cursor: allComplete ? 'pointer' : 'not-allowed',
        }}
      >
        {saving ? 'Saving…' : 'Complete assessment →'}
      </button>
    </div>
  )
}

// ─── Results ───────────────────────────────────────────────────────────────

function ResultsView({ actorRecord, scores, nextusScores, synthesis, onReassess }) {
  const hasGap = !!nextusScores
  const assessmentMode = nextusScores ? 'both' : 'self'

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px 120px' }}>
      {/* Eyebrow */}
      <p style={{
        ...sc,
        fontSize: 11,
        letterSpacing: '0.12em',
        color: '#A8721A',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        {actorRecord?.name} · Planet Assessment
      </p>

      <h2 style={{
        ...serif,
        fontSize: 'clamp(28px, 4vw, 40px)',
        fontWeight: 300,
        color: '#0F1523',
        marginBottom: 48,
      }}>
        The map
      </h2>

      {/* Wheel */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 56 }}>
        <PlanetWheel
          scores={scores}
          nextusScores={nextusScores}
          size={420}
        />
      </div>

      {/* Effort signal — the bottom-up companion to the top-down scores.
          Always visible to anyone who has reached results. */}
      <div style={{ marginBottom: 56 }}>
        <EffortSignalPanel />
      </div>

      {/* Gap signal — only shown when both assessments exist */}
      {hasGap && (
        <PlanetGapSignal
          scores={scores}
          nextusScores={nextusScores}
        />
      )}

      {/* Domain signatures */}
      <div style={{ marginBottom: 48 }}>
        <h3 style={{
          ...serif,
          fontSize: 22,
          fontWeight: 300,
          color: '#0F1523',
          marginBottom: 24,
        }}>
          Domain by domain
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PLANET_DOMAINS.map(domain => {
            const selfScore = scores[domain.key]?.score
            const nextusScore = nextusScores?.[domain.key]?.score
            const gap = nextusScore != null ? (selfScore - nextusScore) : null
            return (
              <div key={domain.key} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                background: '#FFFFFF',
                border: '1px solid rgba(200,146,42,0.20)',
                borderRadius: 6,
              }}>
                <div style={{
                  width: 4,
                  height: 40,
                  background: domain.color,
                  borderRadius: 2,
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <p style={{ ...sc, fontSize: 11, letterSpacing: '0.08em', color: domain.color, marginBottom: 2 }}>
                    {domain.label}
                  </p>
                  <p style={{ ...body, fontSize: 13, color: 'rgba(15,21,35,0.72)' }}>
                    {domain.tip}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ ...sc, fontSize: 10, color: 'rgba(15,21,35,0.55)', marginBottom: 2 }}>Self</p>
                    <p style={{
                      ...serif,
                      fontSize: 28,
                      fontWeight: 400,
                      color: getPlanetScoreColor(selfScore),
                      lineHeight: 1,
                    }}>
                      {selfScore ?? '—'}
                    </p>
                  </div>
                  {nextusScore != null && (
                    <>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ ...sc, fontSize: 10, color: 'rgba(15,21,35,0.55)', marginBottom: 2 }}>NextUs</p>
                        <p style={{
                          ...serif,
                          fontSize: 28,
                          fontWeight: 400,
                          color: getPlanetScoreColor(nextusScore),
                          lineHeight: 1,
                        }}>
                          {nextusScore}
                        </p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ ...sc, fontSize: 10, color: 'rgba(15,21,35,0.55)', marginBottom: 2 }}>Gap</p>
                        <p style={{
                          ...serif,
                          fontSize: 22,
                          fontWeight: 400,
                          color: Math.abs(gap) >= 2 ? '#C0392B' : 'rgba(15,21,35,0.72)',
                          lineHeight: 1,
                        }}>
                          {gap > 0 ? `+${gap}` : gap}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Synthesis */}
      {synthesis && (
        <div style={{
          padding: '32px 36px',
          background: '#FFFFFF',
          border: '1px solid rgba(200,146,42,0.20)',
          borderLeft: '3px solid #C8922A',
          borderRadius: 6,
          marginBottom: 48,
        }}>
          <p style={{
            ...sc,
            fontSize: 11,
            letterSpacing: '0.12em',
            color: '#A8721A',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Synthesis
          </p>
          <p style={{
            ...body,
            fontSize: 16,
            color: '#0F1523',
            lineHeight: 1.7,
          }}>
            {synthesis}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <button
          onClick={onReassess}
          style={{
            ...sc,
            fontSize: 13,
            letterSpacing: '0.1em',
            background: 'transparent',
            color: '#A8721A',
            border: '1px solid #C8922A',
            borderRadius: 4,
            padding: '12px 28px',
            cursor: 'pointer',
          }}
        >
          Update assessment
        </button>
      </div>
    </div>
  )
}

// ─── Loading shell ─────────────────────────────────────────────────────────

function LoadingShell() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7' }}>
      <Nav activePath="nextus-self" />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 64px)',
      }}>
        <p style={{
          fontFamily: "'Cormorant SC', Georgia, serif",
          fontSize: 13,
          letterSpacing: '0.1em',
          color: 'rgba(15,21,35,0.55)',
        }}>
          Loading…
        </p>
      </div>
    </div>
  )
}
