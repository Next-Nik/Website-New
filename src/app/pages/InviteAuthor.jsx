// src/app/pages/InviteAuthor.jsx
// Path 3 of challenge authoring: invite an organisation to take part.
//
// The relational path. The member reaches out themselves, from their own
// email — NextUs never contacts an org that has not heard of it. Nothing is
// authored in the org's name. This page seats the org in trust if it is not
// listed, mints a challenge_invites record, and hands the member a drafted
// message plus a shareable link (/i/:token) to send as themselves.

import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { serif, body, sc } from '../../lib/designTokens'
import { CIV_DOMAINS } from '../components/NextUsWheel'

const gold  = '#26302A'
const dark  = '#0F1523'
const parch = '#FAFAF7'
const hair  = '1.5px solid rgba(110,127,92,0.22)'

function Eyebrow({ children }) {
  return <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em', color: gold,
    textTransform: 'uppercase', marginBottom: '12px' }}>{children}</div>
}
function Card({ children }) {
  return <div style={{ background: '#FFFFFF', border: hair, borderRadius: '12px',
    padding: '18px 20px', marginBottom: '20px' }}>{children}</div>
}
function Label({ children }) {
  return <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.20em',
    color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginBottom: '8px' }}>{children}</div>
}
const fieldStyle = {
  ...body, fontSize: '16px', color: dark, padding: '11px 14px', borderRadius: '8px',
  border: '1.5px solid rgba(110,127,92,0.4)', background: '#FFFFFF', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

function draftMessage({ orgName, context, inviterName, link }) {
  const who = orgName ? `${orgName} team` : 'there'
  const ctx = context?.trim() || 'a challenge on NextUs'
  return `Hi ${who},

I came across NextUs, a platform mapping the people and organisations building a future worth living in, and thought of your work straight away. I would love for you to take part in ${ctx}.

I have set up a page for you there so you can see how it is framed. It is yours to claim, edit, or take down:
${link}

No pressure at all. If it resonates, claiming it puts your work on the map alongside others building toward the same future.

${inviterName || ''}`.trim()
}

export function InviteAuthorPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = new URLSearchParams(location.search).get('then')

  const [phase, setPhase] = useState('compose')   // compose | draft

  // Org selection
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [chosen, setChosen]     = useState(null)   // existing actor {id,name,slug}
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName]   = useState('')
  const [newSite, setNewSite]   = useState('')
  const [newDomain, setNewDomain] = useState('nature')

  const [context, setContext]   = useState('the Nature constellation')
  const [inviterName, setInviterName] = useState('')

  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)

  // Draft output
  const [link, setLink]     = useState('')
  const [message, setMessage] = useState('')
  const [copiedMsg, setCopiedMsg]   = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) navigate(`/login?redirect=${encodeURIComponent('/invite/new')}`)
  }, [user, authLoading, navigate])

  // Prefill the inviter's display name from their profile / email
  useEffect(() => {
    if (!user) return
    const meta = user.user_metadata || {}
    setInviterName(meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : ''))
  }, [user])

  // Live search of existing actors
  useEffect(() => {
    if (chosen || addingNew) return
    const q = query.trim()
    if (q.length < 2) { setResults([]); return }
    let cancelled = false
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('nextus_actors')
        .select('id, name, slug, type, image_url')
        .ilike('name', `%${q}%`)
        .limit(6)
      if (!cancelled) setResults(data || [])
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, chosen, addingNew])

  const orgName = chosen?.name || (addingNew ? newName.trim() : '')

  async function generate() {
    setError(null)
    if (!chosen && !(addingNew && newName.trim())) {
      setError('Choose an organisation, or add the one you have in mind.'); return
    }
    setBusy(true)
    try {
      let actor = chosen
      // Seat a not-yet-listed org in trust (unclaimed, unauthored)
      if (!actor && addingNew) {
        const primary = newDomain || 'nature'
        const { data: inserted, error: insErr } = await supabase.from('nextus_actors').insert({
          name:            newName.trim(),
          type:            'organisation',
          website:         newSite.trim() || null,
          domain_id:       primary,
          domains:         [primary],
          description:     '',
          data_source:     'Invited by a community member',
          seeded_by:       'community',
          vetting_status:  'nominated',
          profile_owner:   null,
        }).select('id, name, slug').single()
        if (insErr) throw insErr
        actor = inserted
      }

      const token = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, '').slice(0, 24)
      const origin = window.location.origin
      const inviteLink = `${origin}/i/${token}`

      const { error: invErr } = await supabase.from('challenge_invites').insert({
        token,
        inviter_user_id: user.id,
        inviter_name:    inviterName.trim() || null,
        actor_id:        actor.id,
        context_label:   context.trim() || null,
        message:         draftMessage({ orgName: actor.name, context, inviterName, link: inviteLink }),
      })
      if (invErr) throw invErr

      setLink(inviteLink)
      setMessage(draftMessage({ orgName: actor.name, context, inviterName, link: inviteLink }))
      setPhase('draft')
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function copy(text, which) {
    navigator.clipboard?.writeText(text).then(() => {
      if (which === 'msg') { setCopiedMsg(true); setTimeout(() => setCopiedMsg(false), 1800) }
      else { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 1800) }
    })
  }

  if (authLoading) return <div style={{ background: parch, minHeight: '100dvh' }}><Nav /></div>

  return (
    <div style={{ background: parch, minHeight: '100dvh' }}>
      <Nav />
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '96px 24px 120px' }}>
        <Eyebrow>An invitation</Eyebrow>
        <h1 style={{ ...serif, fontSize: 'clamp(30px,5vw,46px)', fontWeight: 400,
          color: dark, lineHeight: 1.08, marginBottom: '10px' }}>
          Invite an organisation to take part
        </h1>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.65)',
          lineHeight: 1.7, marginBottom: '28px', maxWidth: '540px' }}>
          You reach out to them yourself, from your own email. NextUs never contacts an organisation
          that has not heard of it, and nothing is created in their name until they choose to take part.
        </p>

        {phase === 'compose' && (
          <>
            <Card>
              <Label>Who are you inviting</Label>
              {!chosen && !addingNew && (
                <>
                  <input value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Search the Atlas by name..." style={fieldStyle} />
                  {results.length > 0 && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {results.map(r => (
                        <button key={r.id} type="button" onClick={() => { setChosen(r); setResults([]) }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
                            padding: '9px 12px', borderRadius: '8px', cursor: 'pointer',
                            border: '1px solid rgba(110,127,92,0.2)', background: '#FAFAF7' }}>
                          <span style={{ ...body, fontSize: '15px', color: dark }}>{r.name}</span>
                          <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.1em',
                            color: 'rgba(15,21,35,0.45)', textTransform: 'uppercase' }}>{r.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => setAddingNew(true)}
                    style={{ ...body, fontSize: '14px', color: gold, background: 'none', border: 'none',
                      cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px', marginTop: '12px' }}>
                    Not listed? Add the organisation
                  </button>
                </>
              )}

              {chosen && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ ...body, fontSize: '17px', color: dark }}>{chosen.name}</span>
                  <button type="button" onClick={() => setChosen(null)}
                    style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: gold,
                      background: 'none', border: 'none', cursor: 'pointer' }}>Change</button>
                </div>
              )}

              {addingNew && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="Organisation name" style={fieldStyle} />
                  <input value={newSite} onChange={e => setNewSite(e.target.value)}
                    placeholder="Website (optional)" style={fieldStyle} />
                  <select value={newDomain} onChange={e => setNewDomain(e.target.value)} style={fieldStyle}>
                    {CIV_DOMAINS.map(d => <option key={d.slug} value={d.slug}>{d.label}</option>)}
                  </select>
                  <button type="button" onClick={() => { setAddingNew(false); setNewName('') }}
                    style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', background: 'none',
                      border: 'none', cursor: 'pointer', textDecoration: 'underline', alignSelf: 'flex-start' }}>
                    Back to search
                  </button>
                </div>
              )}
            </Card>

            <Card>
              <Label>What are you inviting them to</Label>
              <input value={context} onChange={e => setContext(e.target.value)}
                placeholder="the Nature constellation" style={fieldStyle} />
            </Card>

            <Card>
              <Label>Sent as</Label>
              <input value={inviterName} onChange={e => setInviterName(e.target.value)}
                placeholder="Your name" style={fieldStyle} />
              <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.5, margin: '8px 0 0' }}>
                They will see that you invited them. You send the message from your own email.
              </p>
            </Card>

            {error && <p style={{ ...body, fontSize: '14px', color: '#B5482E', margin: '0 0 16px' }}>{error}</p>}

            <button onClick={generate} disabled={busy}
              style={{ ...sc, fontSize: '14px', letterSpacing: '0.14em', padding: '13px 28px',
                borderRadius: '40px', background: busy ? 'rgba(110,127,92,0.3)' : gold,
                border: 'none', color: '#FBF8F0', cursor: busy ? 'default' : 'pointer' }}>
              {busy ? 'Preparing...' : 'Draft the invitation'}
            </button>
          </>
        )}

        {phase === 'draft' && (
          <>
            <Card>
              <Label>Your message</Label>
              <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.5, margin: '0 0 10px' }}>
                Edit anything you like, then send it from your own email, as yourself.
              </p>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={12}
                style={{ ...fieldStyle, fontSize: '15px', lineHeight: 1.6, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                <button onClick={() => copy(message, 'msg')}
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', padding: '10px 22px',
                    borderRadius: '40px', background: gold, border: 'none', color: '#FBF8F0', cursor: 'pointer' }}>
                  {copiedMsg ? 'Copied' : 'Copy message'}
                </button>
                <button onClick={() => copy(link, 'link')}
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', padding: '10px 22px',
                    borderRadius: '40px', background: 'rgba(110,127,92,0.06)',
                    border: '1.5px solid rgba(110,127,92,0.55)', color: gold, cursor: 'pointer' }}>
                  {copiedLink ? 'Copied' : 'Copy link only'}
                </button>
              </div>
            </Card>

            <Card>
              <Label>Their invitation link</Label>
              <div style={{ ...body, fontSize: '14px', color: gold, wordBreak: 'break-all', lineHeight: 1.5 }}>{link}</div>
              <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.5, margin: '10px 0 0' }}>
                It opens a page that orients them and holds their profile in trust. Nothing is published in
                their name unless they claim it.
              </p>
            </Card>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => navigate(returnTo || '/atlas')}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '12px 24px',
                  borderRadius: '40px', background: gold, border: 'none', color: '#FBF8F0', cursor: 'pointer' }}>
                Done &rarr;
              </button>
              <button onClick={() => { setPhase('compose'); setChosen(null); setAddingNew(false); setNewName(''); setQuery('') }}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '12px 24px',
                  borderRadius: '40px', background: 'transparent',
                  border: '1px solid rgba(110,127,92,0.3)', color: 'rgba(15,21,35,0.72)', cursor: 'pointer' }}>
                Invite another
              </button>
            </div>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  )
}
