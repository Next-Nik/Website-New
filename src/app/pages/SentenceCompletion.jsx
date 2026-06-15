// ─────────────────────────────────────────────────────────────
// SentenceCompletion.jsx — /tools/sentence-completion
//
// A nine-week writing practice on Branden's skeleton. Three ways in:
//   • Practice — the linear nine-week loop. Advances by completion,
//     not calendar. A week stays current until you choose to move on.
//   • Free     — drop into any week, or write your own stem.
//   • Map      — the practice points you at the domain your latest
//     Map (or current Target Stretch) says is most worth working.
//
// Every saved session writes to sentence_completion_entries
// (126_sentence_completion.sql) and surfaces in the Journal's Read
// stream. Developmental-rail work: private by default, never public.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import WorldMapSubstrate from '../components/mission-control/WorldMapSubstrate'
import { serif, body, sc } from '../../lib/designTokens'
import {
  WEEKS, TOTAL_WEEKS, DOMAIN_ORDER, DOMAIN_LABEL,
  weekByNumber, weekByDomain, PRACTICE_RULES,
} from '../constants/sentenceCompletion'

const tokens = {
  bg:        '#FAFAF7',
  ink:       '#0F1523',
  inkSoft:   'rgba(15, 21, 35, 0.78)',
  inkMid:    'rgba(15, 21, 35, 0.60)',
  inkFaint:  'rgba(15, 21, 35, 0.55)',
  gold:      '#A8721A',  // text only
  goldChrome:'#C8922A',  // chrome/borders only
  goldRule:  'rgba(200, 146, 42, 0.30)',
  goldFaint: 'rgba(200, 146, 42, 0.12)',
  card:      '#FFFFFF',
}

const MODES = [
  { key: 'linear', label: 'Practice' },
  { key: 'free',   label: 'Free' },
  { key: 'map',    label: 'Follow my Map' },
]

export default function SentenceCompletion() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode]               = useState('linear')
  const [currentWeek, setCurrentWeek] = useState(1)
  const [freeWeek, setFreeWeek]       = useState(1)
  const [mapDomain, setMapDomain]     = useState(null)
  const [mapReason, setMapReason]     = useState('')

  const [endings, setEndings]         = useState({})   // stemIndex -> text
  const [reflectionText, setReflectionText] = useState('')
  const [rulesOpen, setRulesOpen]     = useState(false)

  const [stats, setStats]             = useState({})   // week -> { sessions, reflected }
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [savedFlash, setSavedFlash]   = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login'); return }
    let cancelled = false

    async function load() {
      setLoading(true)

      // Progress pointer — create on first visit.
      const progRes = await supabase
        .from('sentence_completion_progress')
        .select('current_week')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      let week = progRes?.data?.current_week
      if (!week) {
        await supabase
          .from('sentence_completion_progress')
          .insert({ user_id: user.id, current_week: 1 })
        week = 1
      }
      setCurrentWeek(Math.min(Math.max(week, 1), TOTAL_WEEKS))

      // Gating: how many sessions / reflections per week.
      const entRes = await supabase
        .from('sentence_completion_entries')
        .select('week, is_reflection, session_id')
        .eq('user_id', user.id)
        .limit(2000)
      if (cancelled) return
      const byWeek = {}
      for (const r of (entRes?.data || [])) {
        const w = byWeek[r.week] || { sessionIds: new Set(), reflected: false }
        if (r.is_reflection) w.reflected = true
        else w.sessionIds.add(r.session_id)
        byWeek[r.week] = w
      }
      const flattened = {}
      for (const [w, v] of Object.entries(byWeek)) {
        flattened[w] = { sessions: v.sessionIds.size, reflected: v.reflected }
      }
      setStats(flattened)

      // Map suggestion: prefer an active Target Stretch domain, else
      // the lowest current Map score. Falls back to Path.
      const [profRes, sprintRes] = await Promise.all([
        supabase
          .from('horizon_profile')
          .select('domain, current_score')
          .eq('user_id', user.id),
        supabase
          .from('target_sprint_sessions')
          .select('domains, updated_at, status')
          .eq('user_id', user.id)
          .in('status', ['started', 'active'])
          .order('updated_at', { ascending: false }),
      ])
      if (cancelled) return

      let chosen = null
      let reason = ''
      const sprint = (sprintRes?.data || []).find(
        s => Array.isArray(s.domains) && s.domains.length > 0,
      )
      if (sprint) {
        chosen = sprint.domains[0]
        reason = `Your current Target Stretch is in ${DOMAIN_LABEL[chosen] || chosen}.`
      } else {
        const scored = (profRes?.data || []).filter(
          r => DOMAIN_ORDER.includes(r.domain) && typeof r.current_score === 'number',
        )
        if (scored.length) {
          scored.sort((a, b) => a.current_score - b.current_score)
          chosen = scored[0].domain
          reason = `Your Map shows ${DOMAIN_LABEL[chosen] || chosen} as your lowest current score — the place worth the work.`
        }
      }
      if (!chosen) {
        chosen = 'path'
        reason = 'Your Map isn’t in yet, so we’re starting with Path. Pick any domain below.'
      }
      setMapDomain(chosen)
      setMapReason(reason)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [user, authLoading, navigate])

  // The block currently on screen, per mode.
  const activeWeek = useMemo(() => {
    if (mode === 'map')  return weekByDomain(mapDomain) || weekByNumber(2)
    if (mode === 'free') return weekByNumber(freeWeek)
    return weekByNumber(currentWeek)
  }, [mode, mapDomain, freeWeek, currentWeek])

  const weekStat = stats[activeWeek?.week] || { sessions: 0, reflected: false }
  const hasSessionThisWeek = weekStat.sessions > 0
  const reflectedThisWeek  = weekStat.reflected

  function resetInputs() {
    setEndings({})
    setReflectionText('')
  }

  function switchMode(next) {
    setMode(next)
    resetInputs()
  }

  // ── Save a session: one row per stem with non-empty endings ───
  async function handleSaveSession() {
    if (!user || saving) return
    const sessionId = (crypto?.randomUUID && crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const rows = activeWeek.stems
      .map((stem, i) => ({ stem, text: (endings[i] || '').trim() }))
      .filter(s => s.text.length > 0)
      .map(s => ({
        user_id: user.id, session_id: sessionId,
        week: activeWeek.week, domain: activeWeek.domain, mode,
        stem: s.stem, endings: s.text, is_reflection: false,
      }))
    if (!rows.length) return

    setSaving(true)
    const { error } = await supabase.from('sentence_completion_entries').insert(rows)
    setSaving(false)
    if (error) return

    setStats(prev => {
      const w = prev[activeWeek.week] || { sessions: 0, reflected: false }
      return { ...prev, [activeWeek.week]: { ...w, sessions: w.sessions + 1 } }
    })
    resetInputs()
    flashSaved()
  }

  // ── Save the weekend reflection ───────────────────────────────
  async function handleSaveReflection() {
    if (!user || saving) return
    const text = reflectionText.trim()
    if (!text) return
    const sessionId = (crypto?.randomUUID && crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setSaving(true)
    const { error } = await supabase.from('sentence_completion_entries').insert({
      user_id: user.id, session_id: sessionId,
      week: activeWeek.week, domain: activeWeek.domain, mode,
      stem: activeWeek.reflection, endings: text, is_reflection: true,
    })
    setSaving(false)
    if (error) return
    setStats(prev => {
      const w = prev[activeWeek.week] || { sessions: 0, reflected: false }
      return { ...prev, [activeWeek.week]: { ...w, reflected: true } }
    })
    setReflectionText('')
    flashSaved()
  }

  // ── Advance the linear pointer (user choice only) ─────────────
  async function advanceTo(nextWeek) {
    if (!user) return
    const target = Math.min(Math.max(nextWeek, 1), TOTAL_WEEKS)
    await supabase
      .from('sentence_completion_progress')
      .upsert({ user_id: user.id, current_week: target }, { onConflict: 'user_id' })
    setCurrentWeek(target)
    resetInputs()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function flashSaved() {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2200)
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ ...body, background: tokens.bg, minHeight: '100dvh', color: tokens.ink, position: 'relative' }}>
      <WorldMapSubstrate />
      <Nav />

      <main style={{ position: 'relative', maxWidth: 720, margin: '0 auto', padding: '40px 22px 120px' }}>

        {/* Title */}
        <header style={{ marginBottom: 26 }}>
          <h1 style={{ ...serif, fontWeight: 300, fontSize: 34, margin: '0 0 6px', color: tokens.ink }}>
            Sentence Completion
          </h1>
          <p style={{ ...body, fontSize: 15, lineHeight: 1.6, color: tokens.inkMid, margin: 0 }}>
            A stem, finished fast, six to ten times over. The endings come faster than
            the censor can catch them — and what surfaces is usually truer than what
            you’d have written if you’d stopped to think.
          </p>
        </header>

        {/* Mode switch */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {MODES.map(m => (
            <button
              key={m.key}
              onClick={() => switchMode(m.key)}
              style={{
                ...sc, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '8px 14px', cursor: 'pointer', borderRadius: 4,
                border: `1px solid ${mode === m.key ? tokens.goldChrome : tokens.goldRule}`,
                background: mode === m.key ? tokens.goldFaint : 'transparent',
                color: mode === m.key ? tokens.gold : tokens.inkMid,
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ ...body, fontSize: 14, color: tokens.inkFaint }}>Loading your practice…</p>
        ) : (
          <>
            {/* Mode-specific chrome above the block */}
            {mode === 'linear' && (
              <ProgressRow currentWeek={currentWeek} />
            )}

            {mode === 'free' && (
              <FreePicker
                freeWeek={freeWeek} setFreeWeek={(w) => { setFreeWeek(w); resetInputs() }}
              />
            )}

            {mode === 'map' && (
              <MapPicker
                mapDomain={mapDomain} mapReason={mapReason}
                setMapDomain={(d) => { setMapDomain(d); resetInputs() }}
              />
            )}

            {/* The block */}
            <BlockHeader weekObj={activeWeek} mode={mode} />

            <RulesReminder open={rulesOpen} setOpen={setRulesOpen} />

            {activeWeek.stems.map((stem, i) => (
              <StemField
                key={i} stem={stem}
                value={endings[i] || ''}
                onChange={(v) => setEndings(prev => ({ ...prev, [i]: v }))}
              />
            ))}

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
              <button
                onClick={handleSaveSession}
                disabled={saving}
                style={primaryBtn(saving)}
              >
                {saving ? 'Saving…' : 'Save this session'}
              </button>
              {savedFlash && (
                <span style={{ ...sc, fontSize: 13, letterSpacing: '0.1em', color: tokens.gold }}>
                  Saved to your journal
                </span>
              )}
            </div>

            {/* Weekend reflection — appears once the week has been worked */}
            {hasSessionThisWeek && (
              <ReflectionCard
                stem={activeWeek.reflection}
                value={reflectionText} setValue={setReflectionText}
                onSave={handleSaveReflection} saving={saving}
                done={reflectedThisWeek}
              />
            )}

            {/* Advancement — linear mode, user choice only */}
            {mode === 'linear' && reflectedThisWeek && (
              <AdvanceRow
                currentWeek={currentWeek}
                onAdvance={advanceTo}
                onFree={() => switchMode('free')}
                onMap={() => switchMode('map')}
              />
            )}
          </>
        )}

        {/* Quiet door back to the journal */}
        <div style={{ marginTop: 48, paddingTop: 18, borderTop: `1px solid ${tokens.goldRule}` }}>
          <button
            onClick={() => navigate('/journal')}
            style={{
              ...sc, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'transparent', border: 'none', cursor: 'pointer', color: tokens.inkMid, padding: 0,
            }}
          >
            ← Your journal
          </button>
        </div>
      </main>
    </div>
  )
}

// ─── Pieces ───────────────────────────────────────────────────

function ProgressRow({ currentWeek }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {WEEKS.map(w => {
          const state = w.week < currentWeek ? 'done' : w.week === currentWeek ? 'now' : 'ahead'
          return (
            <span
              key={w.week}
              title={`Week ${w.week} · ${w.title}`}
              style={{
                width: 22, height: 6, borderRadius: 3,
                background:
                  state === 'done' ? tokens.goldChrome :
                  state === 'now'  ? tokens.gold : tokens.goldRule,
                opacity: state === 'ahead' ? 0.55 : 1,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function BlockHeader({ weekObj, mode }) {
  const eyebrow =
    mode === 'free' ? `Week ${weekObj.week}` :
    mode === 'map'  ? 'Your Map points here' :
    `Week ${weekObj.week}`
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ ...sc, fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', color: tokens.gold }}>
        {eyebrow}
      </span>
      <h2 style={{ ...serif, fontWeight: 300, fontSize: 26, margin: '4px 0 6px', color: tokens.ink }}>
        {weekObj.title}
      </h2>
      <p style={{ ...body, fontSize: 14.5, lineHeight: 1.6, color: tokens.inkMid, margin: 0 }}>
        {weekObj.gloss}
      </p>
    </div>
  )
}

function RulesReminder({ open, setOpen }) {
  return (
    <div style={{ margin: '16px 0 20px' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          ...sc, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase',
          background: 'transparent', border: 'none', cursor: 'pointer', color: tokens.inkMid, padding: 0,
        }}
      >
        {open ? 'Hide how it works' : 'How it works'}
      </button>
      {open && (
        <ul style={{ ...body, fontSize: 14, lineHeight: 1.6, color: tokens.inkMid, margin: '10px 0 0', paddingLeft: 18 }}>
          {PRACTICE_RULES.map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
        </ul>
      )}
    </div>
  )
}

function StemField({ stem, value, onChange }) {
  return (
    <div style={{
      background: tokens.card, border: `1px solid ${tokens.goldRule}`, borderRadius: 4,
      padding: '16px 18px', marginBottom: 14,
    }}>
      <p style={{ ...serif, fontWeight: 300, fontSize: 19, lineHeight: 1.35, color: tokens.ink, margin: '0 0 10px' }}>
        {stem}
      </p>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="…"
        rows={4}
        style={textareaStyle}
      />
    </div>
  )
}

function ReflectionCard({ stem, value, setValue, onSave, saving, done }) {
  return (
    <div style={{
      background: tokens.goldFaint, border: `1px solid ${tokens.goldRule}`, borderRadius: 4,
      padding: '18px 18px', marginTop: 26,
    }}>
      <span style={{ ...sc, fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: tokens.gold }}>
        Close the week
      </span>
      <p style={{ ...serif, fontWeight: 300, fontSize: 19, lineHeight: 1.35, color: tokens.ink, margin: '6px 0 10px' }}>
        {stem}
      </p>
      <p style={{ ...body, fontSize: 13.5, lineHeight: 1.55, color: tokens.inkMid, margin: '0 0 12px' }}>
        Read back over what you wrote this week, then finish this one — at least six times.
      </p>
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="…"
        rows={5}
        style={textareaStyle}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
        <button onClick={onSave} disabled={saving} style={primaryBtn(saving)}>
          {saving ? 'Saving…' : done ? 'Save another reflection' : 'Save reflection'}
        </button>
        {done && (
          <span style={{ ...sc, fontSize: 13, letterSpacing: '0.1em', color: tokens.gold }}>
            Week closed
          </span>
        )}
      </div>
    </div>
  )
}

function AdvanceRow({ currentWeek, onAdvance, onFree, onMap }) {
  const atEnd = currentWeek >= TOTAL_WEEKS
  return (
    <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${tokens.goldRule}` }}>
      {atEnd ? (
        <>
          <p style={{ ...body, fontSize: 14.5, lineHeight: 1.6, color: tokens.inkMid, margin: '0 0 14px' }}>
            That’s the full nine. The stems don’t change; you do. You can begin again as
            the person these weeks have made, follow your Map to wherever the work is now,
            or roam freely.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => onAdvance(1)} style={primaryBtn(false)}>Begin again</button>
            <button onClick={onMap} style={secondaryBtn}>Follow my Map</button>
            <button onClick={onFree} style={secondaryBtn}>Roam freely</button>
          </div>
        </>
      ) : (
        <>
          <p style={{ ...body, fontSize: 14.5, lineHeight: 1.6, color: tokens.inkMid, margin: '0 0 14px' }}>
            Stay with this week as long as it’s working. When you’re ready, the next one’s here.
          </p>
          <button onClick={() => onAdvance(currentWeek + 1)} style={primaryBtn(false)}>
            Continue to Week {currentWeek + 1} →
          </button>
        </>
      )}
    </div>
  )
}

function FreePicker({ freeWeek, setFreeWeek }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {WEEKS.map(w => (
          <button
            key={w.week}
            onClick={() => setFreeWeek(w.week)}
            style={chip(freeWeek === w.week)}
          >
            {w.title}
          </button>
        ))}
      </div>
    </div>
  )
}

function MapPicker({ mapDomain, mapReason, setMapDomain }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <p style={{ ...body, fontSize: 14.5, lineHeight: 1.6, color: tokens.inkSoft, margin: '0 0 12px' }}>
        {mapReason}
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {DOMAIN_ORDER.map(d => (
          <button key={d} onClick={() => setMapDomain(d)} style={chip(mapDomain === d)}>
            {DOMAIN_LABEL[d]}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Style helpers ────────────────────────────────────────────

const textareaStyle = {
  ...body, fontSize: 16, lineHeight: 1.6, color: tokens.ink,
  width: '100%', boxSizing: 'border-box', resize: 'vertical',
  border: `1px solid ${tokens.goldRule}`, borderRadius: 4,
  background: '#FFFFFF', padding: '10px 12px', outline: 'none', minHeight: 84,
}

function primaryBtn(disabled) {
  return {
    ...sc, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
    padding: '11px 20px', borderRadius: 4, cursor: disabled ? 'default' : 'pointer',
    border: `1px solid ${tokens.goldChrome}`, background: tokens.goldChrome, color: '#FFFFFF',
    opacity: disabled ? 0.6 : 1,
  }
}

const secondaryBtn = {
  ...sc, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
  padding: '11px 20px', borderRadius: 4, cursor: 'pointer',
  border: `1px solid ${tokens.goldRule}`, background: 'transparent', color: tokens.inkMid,
}

function chip(active) {
  return {
    ...sc, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '7px 12px', borderRadius: 4, cursor: 'pointer',
    border: `1px solid ${active ? tokens.goldChrome : tokens.goldRule}`,
    background: active ? tokens.goldFaint : 'transparent',
    color: active ? tokens.gold : tokens.inkMid,
  }
}
