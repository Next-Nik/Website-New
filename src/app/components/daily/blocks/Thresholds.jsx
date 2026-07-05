// ─────────────────────────────────────────────────────────────
// Thresholds.jsx — name today's thresholds, as a standalone block
//
// Reuses the exported CalendarPlanBeat from Horizon Practice (its
// calendar feed and manual add), so there's one definition, not two.
// This wrapper makes it self-managing for the runner: it loads the
// user's saved calendar URL, owns the threshold list, and saves the
// URL when changed.
//
// Threshold rows belong to a morning run, and the runner doesn't open
// one yet — so this block hands the named thresholds out via
// onComplete(thresholds). Writing them into a session record lands
// with the runner's journal stage.
//
// Contract: { userId, onComplete(thresholds), onSkip() }
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { tokens, serif, body, sc } from '../../../../lib/designTokens'
import { supabase } from '../../../../hooks/useSupabase'
import { CalendarPlanBeat } from '../../../../tools/horizon-practice/HorizonPractice'

export default function Thresholds({ userId = null, onComplete = () => {}, onSkip = () => {} }) {
  const [thresholds, setThresholds] = useState([])
  const [icalUrl, setIcalUrl] = useState(null)

  useEffect(() => {
    if (!userId) return
    let alive = true
    supabase.from('contributor_profiles_beta').select('ical_url').eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (alive && data?.ical_url) setIcalUrl(data.ical_url) })
    return () => { alive = false }
  }, [userId])

  async function saveIcal(url) {
    setIcalUrl(url)
    if (!userId) return
    await supabase.from('contributor_profiles_beta').update({ ical_url: url }).eq('user_id', userId)
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ textAlign: 'right', marginBottom: '8px' }}>
        <button onClick={onSkip} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '13px', fontWeight: 600,
          letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(15,21,35,0.55)', opacity: 0.6,
        }}>Skip</button>
      </div>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <p style={{
          ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: tokens.gold, margin: '0 0 8px',
        }}>Calendar intention</p>
        <h2 style={{
          ...serif, fontWeight: 300, fontSize: 'clamp(26px,4vw,34px)',
          color: tokens.dark, lineHeight: 1.25, margin: '0 0 10px',
        }}>The moments you’ll be tested.</h2>
        <p style={{ ...body, fontSize: '15px', color: tokens.ghost, lineHeight: 1.6, margin: 0 }}>
          Name where today will ask something of your Horizon Self.
        </p>
      </div>

      <CalendarPlanBeat
        thresholds={thresholds}
        onChange={setThresholds}
        icalUrl={icalUrl}
        onSaveIcalUrl={saveIcal}
        userId={userId}
      />

      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <button onClick={() => onComplete(thresholds)} style={{
          ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: '#FFFFFF', background: tokens.goldChrome, border: 'none',
          borderRadius: '40px', padding: '12px 28px', cursor: 'pointer', margin: '0 6px',
        }}>Done →</button>

      </div>
    </div>
  )
}
