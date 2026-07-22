// ─────────────────────────────────────────────────────────────
// IAmSpoken.jsx — /tools/i-am-spoken
//
// The installation loop. You recorded each I Am statement once, in the
// voice of the self who already lives it. Here you HEAR that voice, find
// the feeling of it being true, and say it back — three to ten times,
// reaching for more of the feeling each pass. Not pronunciation, not a
// score: repetition with rising feeling, in your own authority. You are
// stepping into the self who already declares this.
//
// Statements read live from horizon_profile.ia_statement (the I Am chapter
// is the only writer). Clips live in the private ia-voice bucket, indexed
// by ia_voice_clips (157); playback is a short-lived signed URL. A walk
// logs a light session to practice_writing_entries so showing up counts.
// Developmental-rail: private by default, never public.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import WorldMapSubstrate from '../components/mission-control/WorldMapSubstrate'
import BreathPacer from '../components/daily/BreathPacer'
import VoiceRecorder from '../components/daily/VoiceRecorder'
import { serif, body, sc, text } from '../../lib/designTokens'
import { DOMAIN_COPY, DOMAIN_KEYS } from '../../constants/domainCopy'

const tokens = {
  bg:        '#FAFAF7',
  ink:       '#0F1523',
  inkSoft:   'rgba(15, 21, 35, 0.78)',
  inkMid:    'rgba(15, 21, 35, 0.60)',
  inkFaint:  'rgba(15, 21, 35, 0.55)',
  gold:      '#262420',  // text only
  goldChrome:'#6E7F5C',  // chrome/borders only
  goldRule:  'rgba(76,107,69, 0.30)',
  goldFaint: 'rgba(76,107,69, 0.12)',
  card:      '#FFFFFF',
}

// The cue deepens with each pass — a felt scaffold, never a score.
const CUES = [
  'Hear it. Then say it back, simply, as if reading it off your own face.',
  'Again. This time, let the body agree before the words land.',
  'Once more. Say it like you mean it.',
  'Now say it like it is already so.',
  'Say it like you are telling someone who needs to hear it.',
  'From the chest now. Let it fall all the way down.',
  'Say it as the one who has always been this.',
]

function anchorLine(s) {
  if (!s) return ''
  const t = String(s).trim()
  const m = t.match(/^[\s\S]*?[.!?](?=\s|$)/)
  return (m ? m[0] : t).replace(/[.!?]+\s*$/, '').trim()
}

function IAmSpoken({ embedded = false } = {}, ref) {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const wantDomain = params.get('domain')

  const [byDomain, setByDomain] = useState({})
  const [clips, setClips]       = useState({})     // domain -> { path, duration }
  const [idx, setIdx]           = useState(0)
  const [loading, setLoading]   = useState(true)

  const [clipUrl, setClipUrl]   = useState('')
  const [playing, setPlaying]   = useState(false)
  const [reps, setReps]         = useState(0)
  const [showRecorder, setShowRecorder] = useState(false)

  const audioRef = useRef(null)
  const repsTotalRef = useRef(0)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login'); return }
    let cancelled = false
    async function load() {
      setLoading(true)
      const [{ data: prof }, { data: clipRows }] = await Promise.all([
        supabase.from('horizon_profile').select('domain, ia_statement, ia_statement_full').eq('user_id', user.id),
        supabase.from('ia_voice_clips').select('domain, storage_path, duration_ms').eq('user_id', user.id),
      ])
      if (cancelled) return
      const m = {}
      ;(prof || []).forEach(r => { m[r.domain] = { distill: r.ia_statement || '', full: r.ia_statement_full || '' } })
      const c = {}
      ;(clipRows || []).forEach(r => { c[r.domain] = { path: r.storage_path, duration: r.duration_ms } })
      setByDomain(m); setClips(c); setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user, authLoading, navigate])

  const deck = useMemo(
    () => DOMAIN_KEYS.filter(k => ((byDomain[k]?.distill || byDomain[k]?.full || '').trim().length > 0)),
    [byDomain],
  )

  useEffect(() => {
    if (!deck.length) return
    if (wantDomain) { const i = deck.indexOf(wantDomain); if (i >= 0) { setIdx(i); return } }
    if (idx > deck.length - 1) setIdx(0)
  }, [deck, wantDomain]) // eslint-disable-line react-hooks/exhaustive-deps

  const domainKey = deck[idx]
  const entry = domainKey ? byDomain[domainKey] : null
  const line  = entry ? (anchorLine(entry.distill) || anchorLine(entry.full)) : ''
  const title = domainKey ? (DOMAIN_COPY[domainKey]?.title || domainKey) : ''
  const clip  = domainKey ? clips[domainKey] : null
  const hasClip = !!clip?.path

  // Sign a fresh playback URL whenever the statement (or its clip) changes.
  useEffect(() => {
    let alive = true
    setClipUrl(''); stopAudio()
    if (!hasClip) return
    ;(async () => {
      const { data } = await supabase.storage.from('ia-voice').createSignedUrl(clip.path, 3600)
      if (alive && data?.signedUrl) setClipUrl(data.signedUrl)
    })()
    return () => { alive = false }
  }, [domainKey, clip?.path]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stopAudio(), [])

  function stopAudio() {
    const a = audioRef.current
    if (a) { try { a.pause() } catch { /* */ } }
    setPlaying(false)
  }

  function hearIt() {
    if (!clipUrl) return
    let a = audioRef.current
    if (!a || a.src !== clipUrl) {
      a = new Audio(clipUrl); audioRef.current = a
      a.addEventListener('ended', () => setPlaying(false))
    }
    a.currentTime = 0
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }

  function saidIt() {
    setReps(r => r + 1)
    repsTotalRef.current += 1
  }

  function move(delta) {
    const n = Math.min(Math.max(idx + delta, 0), deck.length - 1)
    if (n === idx) return
    stopAudio()
    setIdx(n); setReps(0); setShowRecorder(false)
    if (!embedded) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function onClipSaved({ storage_path, duration_ms }) {
    setClips(prev => ({ ...prev, [domainKey]: { path: storage_path, duration: duration_ms } }))
    setShowRecorder(false); setReps(0)
  }

  // The runner's Continue logs the session before leaving. No-op if nothing said.
  useImperativeHandle(ref, () => ({
    flush: async () => {
      const total = repsTotalRef.current
      if (!user || total <= 0) return
      const sessionId = (crypto?.randomUUID && crypto.randomUUID()) ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`
      try {
        await supabase.from('practice_writing_entries').insert({
          user_id: user.id, session_id: sessionId,
          practice: 'i_am_spoken', domain: null,
          body: `Spoke my I Am aloud · ${total} ${total === 1 ? 'pass' : 'passes'}.`,
        })
      } catch { /* keep moving */ }
      repsTotalRef.current = 0
    },
  }), [user])

  const cue = CUES[Math.min(reps, CUES.length - 1)]

  return (
    <div style={ embedded
        ? { ...body, color: tokens.ink }
        : { ...body, background: tokens.bg, minHeight: '100dvh', color: tokens.ink, position: 'relative' } }>
      {!embedded && <WorldMapSubstrate />}
      {!embedded && <Nav />}

      <main style={{ position: 'relative', maxWidth: 680, margin: '0 auto', padding: embedded ? '0 0 8px' : '40px 22px 120px' }}>
        {!embedded && (
          <header style={{ marginBottom: 24 }}>
            <h1 style={{ ...serif, fontWeight: 300, fontSize: 34, margin: '0 0 6px', color: tokens.ink }}>
              I Am · spoken
            </h1>
            <p style={{ ...body, fontSize: 15, lineHeight: 1.6, color: tokens.inkMid, margin: 0 }}>
              Hear your own voice say it. Find the feeling of it being true. Then say it back, three
              to ten times, reaching for more of the feeling each pass. You are stepping into the self
              who already lives this.
            </p>
          </header>
        )}

        {loading ? (
          <p style={{ ...body, fontSize: 14, color: tokens.inkFaint }}>Loading your statements…</p>
        ) : deck.length === 0 ? (
          <EmptyState onWrite={() => navigate('/nextu/i-am')} />
        ) : (
          <>
            {/* Settle */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 26px' }}>
              <BreathPacer caption="Settle first. Let the breath lengthen." />
            </div>

            {/* Which statement */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ ...sc, fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', color: tokens.gold }}>{title}</span>
              <span style={{ ...sc, fontSize: 13, letterSpacing: '0.12em', color: tokens.inkFaint }}>{idx + 1} of {deck.length}</span>
            </div>

            {/* The statement — their words, so italic is allowed */}
            <div style={{ background: tokens.card, border: `1px solid ${tokens.goldRule}`, borderRadius: 4, padding: '22px 24px', marginBottom: 18 }}>
              <p style={{ ...text.userVoice, ...serif, fontWeight: 300, fontSize: 24, lineHeight: 1.4, color: tokens.ink, margin: 0 }}>
                {line}
              </p>
            </div>

            {!hasClip || showRecorder ? (
              // ── Record the voice first ────────────────────────────
              <div style={{ background: tokens.card, border: `1px solid ${tokens.goldRule}`, borderRadius: 4, padding: '22px', marginBottom: 14 }}>
                <p style={{ ...body, fontSize: 14.5, lineHeight: 1.6, color: tokens.inkSoft, margin: '0 0 18px', textAlign: 'center' }}>
                  {hasClip
                    ? 'Record it again whenever the voice should carry more. The new take replaces the old.'
                    : 'First, record it once, in the voice of the self who already lives it. Calm, certain, true. You’ll hear this back, and say it with them.'}
                </p>
                <VoiceRecorder
                  userId={user?.id}
                  domain={domainKey}
                  existingPath={clip?.path || null}
                  onSaved={onClipSaved}
                />
                {hasClip && (
                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <button onClick={() => setShowRecorder(false)} style={linkBtn}>Keep the one I have →</button>
                  </div>
                )}
              </div>
            ) : (
              // ── The loop: hear → feel → say ───────────────────────
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                  <button onClick={hearIt} disabled={!clipUrl} style={hearBtn(!clipUrl, playing)}>
                    {playing ? '♪ Your voice…' : '▶ Hear your voice'}
                  </button>
                </div>

                <p style={{ ...body, fontSize: 16, lineHeight: 1.6, color: tokens.inkSoft, textAlign: 'center', margin: '0 0 20px', minHeight: 46 }}>
                  {cue}
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <button onClick={saidIt} style={saidBtn}>I said it</button>
                </div>

                {/* Gentle count — three to ten, never a score */}
                <div style={{ display: 'flex', gap: 7, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                  {Array.from({ length: 10 }).map((_, n) => (
                    <span key={n} style={{
                      width: 9, height: 9, borderRadius: '50%',
                      background: n < reps ? tokens.goldChrome : 'transparent',
                      border: `1px solid ${n < reps ? tokens.goldChrome : tokens.goldRule}`,
                      transition: 'background 0.3s ease',
                    }} />
                  ))}
                </div>
                <p style={{ ...sc, fontSize: 13, letterSpacing: '0.1em', color: tokens.inkFaint, textAlign: 'center', margin: '0 0 18px' }}>
                  {reps < 3 ? 'Three to ten times, as it deepens.' : reps >= 10 ? 'Landed. Carry it with you.' : `${reps} so far. Keep going, or move on.`}
                </p>

                <div style={{ textAlign: 'center', marginBottom: 6 }}>
                  <button onClick={() => setShowRecorder(true)} style={linkBtn}>Re-record this one</button>
                </div>
              </>
            )}

            {/* Move through the seven */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 18, borderTop: `1px solid ${tokens.goldRule}` }}>
              <button onClick={() => move(-1)} disabled={idx === 0} style={navBtn(idx === 0)}>← Previous</button>
              <button onClick={() => move(1)} disabled={idx >= deck.length - 1} style={navBtn(idx >= deck.length - 1)}>Next statement →</button>
            </div>
          </>
        )}

        {!embedded && (
          <div style={{ marginTop: 40, paddingTop: 18, borderTop: `1px solid ${tokens.goldRule}` }}>
            <button onClick={() => navigate('/journal')} style={linkBtn}>← Your journal</button>
          </div>
        )}
      </main>
    </div>
  )
}

export default forwardRef(IAmSpoken)

function EmptyState({ onWrite }) {
  return (
    <div style={{ background: tokens.card, border: `1px solid ${tokens.goldRule}`, borderRadius: 4, padding: '22px' }}>
      <p style={{ ...body, fontSize: 15, lineHeight: 1.6, color: tokens.inkSoft, margin: '0 0 14px' }}>
        You haven’t declared your I Am statements yet. They grow out of The Map, one for each of the
        seven domains. Write them first, then come back to record and speak them.
      </p>
      <button onClick={onWrite} style={primaryBtn}>Write my statements</button>
    </div>
  )
}

// ─── Style helpers ────────────────────────────────────────────
function hearBtn(disabled, playing) {
  return {
    ...sc, fontSize: 15, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
    color: '#FFFFFF', background: tokens.goldChrome, border: 'none', borderRadius: 40,
    padding: '14px 30px', cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1, boxShadow: playing ? `0 0 0 6px ${tokens.goldFaint}` : 'none',
    transition: 'box-shadow 0.3s ease',
  }
}

const saidBtn = {
  ...sc, fontSize: 14, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
  color: tokens.gold, background: 'transparent', border: `1px solid ${tokens.goldChrome}`,
  borderRadius: 40, padding: '12px 30px', cursor: 'pointer',
}

const primaryBtn = {
  ...sc, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
  padding: '11px 20px', borderRadius: 4, cursor: 'pointer',
  border: `1px solid ${tokens.goldChrome}`, background: tokens.goldChrome, color: '#FFFFFF',
}

const linkBtn = {
  ...sc, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase',
  background: 'transparent', border: 'none', cursor: 'pointer', color: tokens.gold, padding: 0,
}

function navBtn(disabled) {
  return {
    ...sc, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase',
    background: 'transparent', border: 'none', padding: 0,
    cursor: disabled ? 'default' : 'pointer',
    color: disabled ? tokens.inkFaint : tokens.inkMid, opacity: disabled ? 0.5 : 1,
  }
}
