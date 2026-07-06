// src/app/pages/InvitePage.jsx
// The landing an invited organisation reaches (/i/:token).
//
// Built for a cold reader: it orients before it asks. It carries the vouch
// (a named person invited them), shows the profile held in trust, and states
// the relational lock plainly — nothing is published in their name until they
// claim it. The only ask is to claim, and it is theirs to accept or ignore.

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { serif, body, sc } from '../../lib/designTokens'

const gold  = '#26302A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

export function InvitePage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [invite, setInvite]   = useState(null)
  const [actor, setActor]     = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: inv } = await supabase
        .from('challenge_invites')
        .select('id, inviter_name, actor_id, context_label, status')
        .eq('token', token)
        .maybeSingle()
      if (cancelled) return
      if (!inv) { setLoading(false); return }
      setInvite(inv)
      const { data: a } = await supabase
        .from('nextus_actors')
        .select('id, name, slug, image_url, description, tagline, profile_owner')
        .eq('id', inv.actor_id)
        .maybeSingle()
      if (cancelled) return
      setActor(a || null)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [token])

  if (loading) return <div style={{ background: parch, minHeight: '100dvh' }}><Nav /></div>

  if (!invite || !actor) {
    return (
      <div style={{ background: parch, minHeight: '100dvh' }}>
        <Nav />
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '140px 24px', textAlign: 'center' }}>
          <h1 style={{ ...serif, fontSize: '30px', fontWeight: 400, color: dark, marginBottom: '12px' }}>
            This invitation could not be found
          </h1>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.6)', lineHeight: 1.7 }}>
            The link may have changed. You can still explore the platform.
          </p>
          <Link to="/atlas" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold,
            textDecoration: 'none', display: 'inline-block', marginTop: '20px' }}>The Atlas &rarr;</Link>
        </div>
        <SiteFooter />
      </div>
    )
  }

  const inviter   = invite.inviter_name || 'Someone'
  const context   = invite.context_label || 'a challenge on NextUs'
  const claimUrl   = `/org/${actor.slug || actor.id}/claim`
  const profileUrl = `/org/${actor.slug || actor.id}`
  const claimed    = !!actor.profile_owner

  return (
    <div style={{ background: parch, minHeight: '100dvh' }}>
      <Nav />
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '96px 24px 120px' }}>
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em', color: gold,
          textTransform: 'uppercase', marginBottom: '14px' }}>An invitation</div>
        <h1 style={{ ...serif, fontSize: 'clamp(28px,4.5vw,42px)', fontWeight: 400,
          color: dark, lineHeight: 1.12, marginBottom: '16px' }}>
          {inviter} invited {actor.name} to take part in {context}.
        </h1>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.68)', lineHeight: 1.75, marginBottom: '14px' }}>
          NextUs maps the people, organisations, and projects building a future worth living in, so others
          can find that work and join it. Taking part means your work appears on the map, and people
          building toward the same future can find and back it.
        </p>

        {/* The profile held in trust */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(110,127,92,0.22)',
          borderRadius: '14px', padding: '20px', margin: '24px 0', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '10px', flexShrink: 0, overflow: 'hidden',
            border: '1px solid rgba(110,127,92,0.25)', background: '#FAFAF7',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {actor.image_url
              ? <img src={actor.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <span style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.55)' }}>No image</span>}
          </div>
          <div>
            <div style={{ ...serif, fontSize: '22px', fontWeight: 400, color: dark, lineHeight: 1.2 }}>{actor.name}</div>
            {(actor.description || actor.tagline) && (
              <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.6)', lineHeight: 1.55, marginTop: '6px' }}>
                {actor.description || actor.tagline}
              </div>
            )}
          </div>
        </div>

        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.68)', lineHeight: 1.7, marginBottom: '28px' }}>
          This is the page being held for you. Nothing has been published in your name. It is yours to claim,
          correct, or take down.
        </p>

        {claimed ? (
          <Link to={profileUrl} style={{ ...sc, fontSize: '14px', letterSpacing: '0.14em', padding: '13px 28px',
            borderRadius: '40px', background: gold, border: 'none', color: '#FBF8F0',
            textDecoration: 'none', display: 'inline-block' }}>
            View the profile &rarr;
          </Link>
        ) : (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to={claimUrl} style={{ ...sc, fontSize: '14px', letterSpacing: '0.14em', padding: '13px 28px',
              borderRadius: '40px', background: gold, border: 'none', color: '#FBF8F0',
              textDecoration: 'none', display: 'inline-block' }}>
              Claim this profile &rarr;
            </Link>
            <Link to={profileUrl} style={{ ...sc, fontSize: '14px', letterSpacing: '0.14em', padding: '13px 28px',
              borderRadius: '40px', background: 'transparent', border: '1px solid rgba(110,127,92,0.3)',
              color: 'rgba(15,21,35,0.72)', textDecoration: 'none', display: 'inline-block' }}>
              See the profile first
            </Link>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  )
}
