// ─────────────────────────────────────────────────────────────
// MorningPages.jsx — /tools/morning-pages
//
// Open, unstructured stream-of-consciousness writing — Julia
// Cameron's morning pages, in our frame. No prompts, no rules.
// The breath pacer settles you first; then you empty the channel.
//
// Saves to practice_writing_entries (127) with practice =
// 'morning_pages'. Developmental-rail: private by default.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import WorldMapSubstrate from '../components/mission-control/WorldMapSubstrate'
import BreathPacer from '../components/daily/BreathPacer'
import { serif, body, sc } from '../../lib/designTokens'

const tokens = {
  bg:        '#FAFAF7',
  ink:       '#0F1523',
  inkSoft:   'rgba(15, 21, 35, 0.78)',
  inkMid:    'rgba(15, 21, 35, 0.60)',
  inkFaint:  'rgba(15, 21, 35, 0.55)',
  gold:      '#A8721A',
  goldChrome:'#C8922A',
  goldRule:  'rgba(200, 146, 42, 0.30)',
  card:      '#FFFFFF',
}

export default function MorningPages() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [written, setWritten]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  if (!authLoading && !user) { navigate('/login'); return null }

  const words = written.trim() ? written.trim().split(/\s+/).length : 0

  async function handleSave() {
    if (!user || saving) return
    const text = written.trim()
    if (!text) return
    const sessionId = (crypto?.randomUUID && crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setSaving(true)
    const { error } = await supabase.from('practice_writing_entries').insert({
      user_id: user.id, session_id: sessionId,
      practice: 'morning_pages', domain: null, body: text,
    })
    setSaving(false)
    if (error) return
    setWritten('')
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2200)
  }

  return (
    <div style={{ ...body, background: tokens.bg, minHeight: '100dvh', color: tokens.ink, position: 'relative' }}>
      <WorldMapSubstrate />
      <Nav />

      <main style={{ position: 'relative', maxWidth: 680, margin: '0 auto', padding: '40px 22px 120px' }}>

        <header style={{ marginBottom: 18 }}>
          <h1 style={{ ...serif, fontWeight: 300, fontSize: 34, margin: '0 0 8px', color: tokens.ink }}>
            Morning Pages
          </h1>
          <p style={{ ...body, fontSize: 15, lineHeight: 1.65, color: tokens.inkMid, margin: 0 }}>
            Julia Cameron called these the brain drain: pages of whatever’s on top, written
            fast and unedited, to clear the channel. Here, that’s the point too. The day’s
            static has to come out before the signal underneath it — your Path, the next
            true thing — can be heard. Don’t aim. Don’t make it good. Just empty it onto
            the page.
          </p>
        </header>

        {/* Breath first */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 24px' }}>
          <BreathPacer caption="Settle here first." />
        </div>

        <textarea
          value={written}
          onChange={e => setWritten(e.target.value)}
          placeholder="Whatever’s there. Keep the hand moving."
          rows={18}
          style={{
            ...body, fontSize: 16, lineHeight: 1.75, color: tokens.ink,
            width: '100%', boxSizing: 'border-box', resize: 'vertical',
            border: `1px solid ${tokens.goldRule}`, borderRadius: 4,
            background: '#FFFFFF', padding: '16px 18px', outline: 'none', minHeight: 320,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
          <button
            onClick={handleSave}
            disabled={saving || !written.trim()}
            style={{
              ...sc, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '11px 22px', borderRadius: 4,
              cursor: (saving || !written.trim()) ? 'default' : 'pointer',
              border: `1px solid ${tokens.goldChrome}`,
              background: (saving || !written.trim()) ? 'transparent' : tokens.goldChrome,
              color: (saving || !written.trim()) ? tokens.inkFaint : '#FFFFFF',
              opacity: (saving || !written.trim()) ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save the pages'}
          </button>
          {words > 0 && !savedFlash && (
            <span style={{ ...sc, fontSize: 13, color: tokens.inkFaint }}>{words} words</span>
          )}
          {savedFlash && (
            <span style={{ ...sc, fontSize: 13, letterSpacing: '0.1em', color: tokens.gold }}>
              Saved to your journal
            </span>
          )}
        </div>

        <div style={{ marginTop: 40, paddingTop: 18, borderTop: `1px solid ${tokens.goldRule}` }}>
          <button
            onClick={() => navigate('/journal')}
            style={{
              ...sc, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'transparent', border: 'none', cursor: 'pointer', color: tokens.gold, padding: 0,
            }}
          >
            ← Your journal
          </button>
        </div>
      </main>
    </div>
  )
}
