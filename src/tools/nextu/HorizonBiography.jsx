// ─────────────────────────────────────────────────────────────
// HorizonBiography.jsx — NextU Chapter Four (/nextu/biography)
//
// The writing room. Step 8 of the Onboarding data model, given
// its own chapter on the thread — narrative work at a different
// altitude deserves its own room. The widest measure on the
// platform, Lora at 18px, the prompts in the margin, nothing else.
//
// Two surfaces: the Biography itself, and From Here Forward —
// present tense, its own screen. Completion sets status='complete'
// on horizon_self_onboarding and runs the thread to the horizon.
//
// Per: NextU_Integrated_Experience_Design_v1.md §5 (Chapter Four).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { tokens, serif, body, sc } from '../../lib/designTokens'
import NextUShell from './NextUShell'
import { useAutoSave, SavedWhisper } from './shared'

const PROMPTS = [
  'The same facts. Told by the man who knows where they were leading.',
  'Write the chapters as he remembers them — what each one was building.',
  'No wound is wasted in his telling. Everything trained something.',
]

export function HorizonBiographyPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [ob, setOb]           = useState(null)
  const [exists, setExists]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [surface, setSurface] = useState('biography') // 'biography' | 'forward' | 'done'

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    let cancelled = false
    supabase.from('horizon_self_onboarding')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        const row = error ? null : data
        setOb(row || { status: 'in_progress', current_step: 8, biography: '', from_here_forward: '' })
        setExists(!!row)
        if (row?.status === 'complete') setSurface('done')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, authLoading])

  const obRef = useRef(ob)
  obRef.current = ob

  const { queue, flush, whisper } = useAutoSave(async () => {
    if (!user || !obRef.current) return
    const o = obRef.current
    const { error } = await supabase
      .from('horizon_self_onboarding')
      .upsert({
        user_id: user.id,
        status: o.status,
        current_step: 8,
        biography: o.biography || null,
        from_here_forward: o.from_here_forward || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    if (!error) setExists(true)
  })

  function patch(fields) {
    setOb(prev => ({ ...prev, ...fields }))
    queue()
  }

  async function completeChapter() {
    setOb(prev => ({ ...prev, status: 'complete' }))
    await flush()
    setSurface('done')
    window.scrollTo({ top: 0 })
  }

  if (authLoading || loading) {
    return (
      <NextUShell chapter={4}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: tokens.ghost }}>NEXTU</span>
        </div>
      </NextUShell>
    )
  }
  if (!user) { navigate('/login'); return null }

  const constructionReady = exists && ob.status !== 'in_progress'
    ? true
    : exists && (ob.current_step || 1) >= 7

  // gentle forward note if Chapter Three isn't done — never a lock
  if (!constructionReady && surface !== 'done') {
    return (
      <NextUShell chapter={4}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '48px 22px 80px' }}>
          <h1 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(30px,5vw,42px)', color: tokens.dark }}>
            The Horizon Biography
          </h1>
          <p style={{ ...body, fontSize: '16px', lineHeight: 1.65, color: 'rgba(15,21,35,0.72)', marginTop: '14px' }}>
            The Biography is written from the being Chapter Three constructs — it begins
            when Horizon Self is complete. The man writes the story; the story doesn't
            write the man.
          </p>
          <button
            onClick={() => navigate('/nextu/horizon-self')}
            style={{
              ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
              color: '#FFFFFF', background: tokens.goldChrome, border: 'none',
              borderRadius: '4px', padding: '12px 24px', cursor: 'pointer', marginTop: '22px',
            }}
          >
            CONTINUE CHAPTER THREE →
          </button>
        </div>
      </NextUShell>
    )
  }

  const writingArea = (value, onChange, placeholder, minHeight) => (
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', boxSizing: 'border-box', marginTop: '26px',
        padding: '22px 24px', border: `1px solid ${tokens.goldFaint}`,
        borderRadius: '8px', background: '#FFFFFF',
        fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic',
        fontSize: '18px', lineHeight: 1.75, color: tokens.dark,
        minHeight, resize: 'vertical', outline: 'none',
      }}
      onFocus={e => { e.target.style.borderColor = tokens.goldChrome }}
      onBlur={e => { e.target.style.borderColor = tokens.goldFaint }}
    />
  )

  // ════════ THE WRITING ROOM ════════
  if (surface === 'biography') {
    return (
      <NextUShell chapter={4}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 22px 90px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
            <div style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.22em', color: tokens.gold }}>
              CHAPTER FOUR · THE WRITING ROOM
            </div>
            <SavedWhisper state={whisper} />
          </div>
          <h1 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(32px,5vw,44px)', marginTop: '10px', color: tokens.dark }}>
            The Horizon Biography
          </h1>
          <p style={{ ...body, fontSize: '16px', lineHeight: 1.7, color: 'rgba(15,21,35,0.72)', marginTop: '14px' }}>
            Your life story, written through your Horizon Self's eyes. {PROMPTS[0]}{' '}
            {PROMPTS[2]} Take real time — write in sittings, come back. It saves as you go.
          </p>

          {writingArea(
            ob.biography,
            v => patch({ biography: v }),
            'He was born…',
            '380px'
          )}

          <div style={{ display: 'flex', gap: '14px', marginTop: '26px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={async () => { await flush(); setSurface('forward'); window.scrollTo({ top: 0 }) }}
              disabled={!ob.biography?.trim()}
              style={{
                ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
                color: '#FFFFFF', background: tokens.goldChrome, border: 'none',
                borderRadius: '4px', padding: '12px 24px',
                cursor: ob.biography?.trim() ? 'pointer' : 'default',
                opacity: ob.biography?.trim() ? 1 : 0.35,
              }}
            >
              WRITE THE CLOSING CHAPTER →
            </button>
            <button
              onClick={async () => { await flush(); navigate('/nextu') }}
              style={{
                ...sc, fontSize: '13px', letterSpacing: '0.14em',
                color: tokens.ghost, background: 'none', border: 'none',
                cursor: 'pointer', padding: 0,
              }}
            >
              SAVE AND STEP AWAY
            </button>
          </div>
        </div>
      </NextUShell>
    )
  }

  // ════════ FROM HERE FORWARD ════════
  if (surface === 'forward') {
    return (
      <NextUShell chapter={4}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 22px 90px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
            <div style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.22em', color: tokens.gold }}>
              CHAPTER FOUR · THE CLOSING CHAPTER
            </div>
            <SavedWhisper state={whisper} />
          </div>
          <h1 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(32px,5vw,44px)', marginTop: '10px', color: tokens.dark }}>
            From Here Forward
          </h1>
          <p style={{ ...body, fontSize: '16px', lineHeight: 1.7, color: 'rgba(15,21,35,0.72)', marginTop: '14px' }}>
            Present tense. Not what he will do — what he does. The chapter the rest of
            the Biography was leading to, written from inside it.
          </p>

          {writingArea(
            ob.from_here_forward,
            v => patch({ from_here_forward: v }),
            'From here forward, I…',
            '240px'
          )}

          <div style={{ display: 'flex', gap: '14px', marginTop: '26px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={completeChapter}
              disabled={!ob.from_here_forward?.trim()}
              style={{
                ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
                color: '#FFFFFF', background: tokens.goldChrome, border: 'none',
                borderRadius: '4px', padding: '12px 24px',
                cursor: ob.from_here_forward?.trim() ? 'pointer' : 'default',
                opacity: ob.from_here_forward?.trim() ? 1 : 0.35,
              }}
            >
              COMPLETE THE JOURNEY
            </button>
            <button
              onClick={() => setSurface('biography')}
              style={{
                ...sc, fontSize: '13px', letterSpacing: '0.14em',
                color: tokens.ghost, background: 'none', border: 'none',
                cursor: 'pointer', padding: 0,
              }}
            >
              ← BACK TO THE BIOGRAPHY
            </button>
          </div>
        </div>
      </NextUShell>
    )
  }

  // ════════ THE HORIZON ════════
  return (
    <NextUShell chapter={4}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '64px 22px 90px' }}>
        <div style={{ height: '1px', background: tokens.goldFaint, marginBottom: '22px' }} />
        <h1 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(34px,6vw,48px)', color: tokens.dark }}>
          From Here Forward
        </h1>
        <p style={{ ...body, fontSize: '17px', lineHeight: 1.7, color: 'rgba(15,21,35,0.72)', marginTop: '14px' }}>
          The journey is built. The construction was the work; the daily is the life.
          Your morning practice now runs everything this journey made — the statements,
          the somatic library, the man who wrote the story.
        </p>
        {ob.from_here_forward && (
          <p style={{ ...body, fontStyle: 'italic', fontSize: '18px', lineHeight: 1.75, color: tokens.dark, marginTop: '24px' }}>
            {ob.from_here_forward}
          </p>
        )}
        <div style={{ display: 'flex', gap: '14px', marginTop: '32px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/tools/horizon-practice')}
            style={{
              ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
              color: '#FFFFFF', background: tokens.goldChrome, border: 'none',
              borderRadius: '4px', padding: '12px 24px', cursor: 'pointer',
            }}
          >
            OPEN YOUR DAILY →
          </button>
          <button
            onClick={() => navigate('/nextu')}
            style={{
              ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.16em',
              color: tokens.gold, background: 'none',
              border: `1.5px solid ${tokens.goldChrome}`,
              borderRadius: '4px', padding: '12px 22px', cursor: 'pointer',
            }}
          >
            BACK TO THE JOURNEY
          </button>
          <button
            onClick={() => setSurface('biography')}
            style={{
              ...sc, fontSize: '13px', letterSpacing: '0.14em',
              color: tokens.ghost, background: 'none', border: 'none',
              cursor: 'pointer', padding: 0,
            }}
          >
            RE-READ / REVISE
          </button>
        </div>
      </div>
    </NextUShell>
  )
}

export default HorizonBiographyPage
