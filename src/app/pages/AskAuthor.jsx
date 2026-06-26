// src/app/pages/AskAuthor.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The front door for asks. An ask is a finite, quantified request: how many
// needed, by when. Under the hood it is framed as a one-time challenge:
// cadence 'once', a single strand carrying the need, so that answering it
// feeds the same beacon as a check-in, while the ask keeps its own campaign
// meter (quantity, deadline, spots).
//
// Optional ?parent=<call_id> places the ask inside a constellation's lineage,
// so its sparks flow to that beacon. Without a parent it stands on its own.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { tokens, serif, body, sc } from '../../lib/designTokens'

const GOLD_C = tokens.goldChrome

const DOMAINS = [
  { v: 'nature',  l: 'Nature' },
  { v: 'vision',  l: 'Vision' },
  { v: 'human',   l: 'Human' },
  { v: 'finance', l: 'Finance' },
  { v: 'society', l: 'Society' },
  { v: 'legacy',  l: 'Legacy' },
  { v: 'tech',    l: 'Tech' },
]

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block', marginBottom: '22px' }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tokens.gold, marginBottom: '6px' }}>{label}</div>
      {hint && <div style={{ ...body, fontSize: '14px', color: tokens.ghost, marginBottom: '8px' }}>{hint}</div>}
      {children}
    </label>
  )
}

const inputStyle = {
  ...body, width: '100%', boxSizing: 'border-box', fontSize: '16px',
  padding: '12px 14px', border: `1px solid ${tokens.goldFaint}`, borderRadius: '10px',
  background: tokens.bgCard, color: tokens.dark,
}

export default function AskAuthor() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [actors, setActors] = useState([])
  const [authorActor, setAuthorActor] = useState(null)
  const [title, setTitle] = useState('')
  const [need, setNeed] = useState('')
  const [tagline, setTagline] = useState('')
  const [domain, setDomain] = useState('nature')
  const [quantity, setQuantity] = useState('')
  const [deadline, setDeadline] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [details, setDetails] = useState('')
  const [parentId, setParentId] = useState(null)
  const [parentTitle, setParentTitle] = useState(null)
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)

  // Owned actors (an org authors the ask).
  useEffect(() => {
    if (!user) return
    supabase.from('nextus_actors').select('id, name, type').eq('profile_owner', user.id)
      .then(({ data }) => setActors(data || []))
  }, [user])

  // Optional constellation parent from the URL.
  useEffect(() => {
    const pid = new URLSearchParams(window.location.search).get('parent')
    if (!pid) return
    setParentId(pid)
    supabase.from('actor_calls').select('title').eq('id', pid).maybeSingle()
      .then(({ data }) => { if (data) setParentTitle(data.title) })
  }, [])

  async function publish(visibility) {
    const errs = []
    if (!need.trim()) errs.push('Say what you need done.')
    if (quantity && (!Number.isFinite(+quantity) || +quantity < 1)) errs.push('How many needed should be a number, or leave it open.')
    setErrors(errs)
    if (errs.length) return
    if (!user) { navigate('/login'); return }

    setSaving(true)
    try {
      const payload = {
        type: 'ask',
        title: title.trim() || need.trim(),
        domain,
        the_move: need.trim(),
        cadence: 'once',
        tagline: tagline.trim() || null,
        ask_quantity: quantity ? +quantity : null,
        ask_deadline: deadline || null,
        cover_image_url: coverUrl.trim() || null,
        ask_details: details.trim() || null,
        parent_call_id: parentId || null,
      }
      const cRes = await fetch('/api/actor-calls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', userId: user.id, actor_id: authorActor || null, ...payload }),
      })
      const cData = await cRes.json()
      if (!cRes.ok || !cData.call) { setErrors([cData.error || 'Could not create the ask.']); setSaving(false); return }

      const pRes = await fetch('/api/actor-calls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', userId: user.id, call_id: cData.call.id, visibility }),
      })
      const pData = await pRes.json()
      if (!pRes.ok) { setErrors([pData.error || 'Could not publish the ask.']); setSaving(false); return }

      navigate(cData.call.slug ? `/stretch/c/${cData.call.slug}` : '/challenges/browse')
    } catch (e) {
      setErrors(['Something went wrong. Try again.'])
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: tokens.bg, color: tokens.dark }}>
      <Nav />
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px 90px' }}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', textTransform: 'uppercase', color: tokens.gold }}>Make an ask</div>
        <h1 style={{ ...serif, fontWeight: 500, fontSize: '40px', lineHeight: 1.05, margin: '10px 0 6px' }}>Gather help, or things.</h1>
        <p style={{ ...body, fontSize: '18px', color: tokens.ghost, maxWidth: '52ch' }}>
          An ask is for a project with a finite need, not a daily practice. Say what you need and by when. Everyone who answers adds a spark, the same as a check-in.
        </p>

        {parentTitle && (
          <div style={{ ...body, fontSize: '14px', color: tokens.gold, background: tokens.goldTint, border: `1px solid ${tokens.goldFaint}`, borderRadius: '10px', padding: '10px 14px', margin: '18px 0 4px' }}>
            Part of: {parentTitle}. Sparks from this ask flow to its beacon.
          </div>
        )}

        <div style={{ marginTop: '26px' }}>
          {actors.length > 0 && (
            <Field label="Author as" hint="Who is making this ask.">
              <select style={inputStyle} value={authorActor || ''} onChange={e => setAuthorActor(e.target.value || null)}>
                <option value="">You (personal)</option>
                {actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
          )}

          <Field label="What do you need done?" hint="The one concrete thing someone can do. e.g. Build a turtle nest protector.">
            <textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} value={need} onChange={e => setNeed(e.target.value)} placeholder="Build a turtle nest protector" />
          </Field>

          <Field label="Title" hint="Optional. Defaults to the need above.">
            <input type="text" style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Turtle nest protectors" />
          </Field>

          <Field label="A line of context" hint="Optional. Why it matters, in one sentence.">
            <input type="text" style={inputStyle} value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Flagged nests keep eggs safe from tyres and predators." />
          </Field>

          <Field label="Domain">
            <select style={inputStyle} value={domain} onChange={e => setDomain(e.target.value)}>
              {DOMAINS.map(d => <option key={d.v} value={d.v}>{d.l}</option>)}
            </select>
          </Field>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <Field label="How many do you need?" hint="Leave blank for open-ended.">
                <input type="number" min="1" style={inputStyle} value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="200" />
              </Field>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <Field label="By when?" hint="Optional deadline.">
                <input type="date" style={inputStyle} value={deadline} onChange={e => setDeadline(e.target.value)} />
              </Field>
            </div>
          </div>

          <Field label="How to complete this" hint="Revealed once someone accepts. Where to send money (bank or e-transfer details), where to ship materials, a link, or instructions. You handle it directly. NextUs doesn&rsquo;t route money or goods.">
            <textarea style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }} value={details} onChange={e => setDetails(e.target.value)} placeholder={'e.g. e-transfer to studio@example.com, or ship to: 12 Bay St, Owen Sound ON'} />
          </Field>

          <Field label="Cover image URL" hint="Optional.">
            <input type="text" style={inputStyle} value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://…" />
          </Field>

          <div style={{ display: 'grid', gap: '14px', margin: '6px 0 20px' }}>
            <div style={{ background: tokens.goldTint, border: `1px solid ${tokens.goldFaint}`, borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tokens.gold, marginBottom: '4px' }}>How it counts</div>
              <div style={{ ...body, fontSize: '15px', color: tokens.meta, lineHeight: 1.55 }}>
                Someone accepts, does the thing, then marks it built. That finish is a spark to the beacon, like a one-time challenge, and one step toward the number you need.
              </div>
            </div>
            <div style={{ borderLeft: `2px solid ${GOLD_C}`, padding: '2px 0 2px 16px' }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tokens.gold, marginBottom: '4px' }}>What you don&rsquo;t have to do</div>
              <div style={{ ...body, fontSize: '14.5px', color: tokens.ghost, lineHeight: 1.5 }}>
                No points to set. No scoring. People answer, the count moves, and your ask feeds the same beacon as everyone else&rsquo;s.
              </div>
            </div>
          </div>

          {errors.length > 0 && (
            <div style={{ background: 'rgba(214,56,56,0.06)', border: '1px solid rgba(214,56,56,0.3)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
              {errors.map((e, i) => <div key={i} style={{ ...body, fontSize: '14px', color: '#b23b3b' }}>{e}</div>)}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button disabled={saving} onClick={() => publish('community')}
              style={{ ...sc, fontSize: '14px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', background: GOLD_C, border: 'none', borderRadius: '26px', padding: '14px 26px', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Publishing…' : 'Publish ask'}
            </button>
            <button disabled={saving} onClick={() => publish('link_only')}
              style={{ ...sc, fontSize: '14px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tokens.gold, background: 'transparent', border: `1px solid ${tokens.goldFaint}`, borderRadius: '26px', padding: '14px 22px', cursor: saving ? 'default' : 'pointer' }}>
              Save as link-only
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
