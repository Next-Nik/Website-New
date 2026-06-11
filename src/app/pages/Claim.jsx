// src/app/pages/Claim.jsx
//
// Claim a ward: takes ownership of an unclaimed actor profile.
//
// Trust model:
//   The Atlas defaults to trust. Any logged-in user can claim a ward.
//   Claiming sets profile_owner = user.id and seeded_by stays 'community'
//   or 'nextus' to preserve the provenance trail.
//   The community can flag mistaken/bad-faith claims.
//
// Flow:
//   - Anyone lands here, logged in
//   - We confirm: are you sure this is yours?
//   - User attests, hits claim, becomes owner

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import { serif, body, sc } from '../../lib/designTokens'

const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

export function ClaimPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [actor, setActor]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [claiming, setClaiming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: `/org/${id}/claim` } })
    }
  }, [user, authLoading, id, navigate])

  // Load actor
  useEffect(() => {
    async function load() {
      if (!id) return
      setLoading(true)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      const q = supabase.from('nextus_actors').select('*')
      const { data, error } = isUuid
        ? await q.eq('id', id).single()
        : await q.eq('slug', id).single()

      if (error || !data) { setError('Profile not found.'); setLoading(false); return }
      if (data.profile_owner) {
        setError(data.profile_owner === user?.id
          ? 'You already own this profile.'
          : 'This profile is already claimed.')
        setActor(data)
        setLoading(false)
        return
      }
      setActor(data)
      setLoading(false)
    }
    load()
  }, [id, user?.id])

  async function claim() {
    if (!confirmed) return
    setClaiming(true); setError(null)
    const { error } = await supabase.from('nextus_actors')
      .update({
        profile_owner: user.id,
        owner_id:      user.id,
        // Provenance preserved — seeded_by stays as 'community' or 'nextus'
      })
      .eq('id', actor.id)
      .is('profile_owner', null)  // only succeeds if still unclaimed

    setClaiming(false)
    if (error) { setError('Claim failed: ' + error.message); return }
    navigate(`/org/${actor.slug || actor.id}/manage?tab=voice`)
  }

  if (authLoading || loading) {
    return (
      <div style={{ background: parch, minHeight: '100dvh' }}>
        <Nav />
        <div style={{ maxWidth: '560px', margin: '0 auto',
          padding: '160px 24px', textAlign: 'center' }}>
          <span style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)' }}>
            Loading...
          </span>
        </div>
      </div>
    )
  }

  if (error && !actor) {
    return (
      <div style={{ background: parch, minHeight: '100dvh' }}>
        <Nav />
        <div style={{ maxWidth: '520px', margin: '0 auto', padding: '120px 24px',
          textAlign: 'center' }}>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.65)',
            lineHeight: 1.7 }}>
            {error}
          </p>
        </div>
        <SiteFooter />
      </div>
    )
  }

  if (!actor) return null

  return (
    <div style={{ background: parch, minHeight: '100dvh' }}>
      <Nav />
      <div style={{ maxWidth: '600px', margin: '0 auto',
        padding: '96px 24px 120px' }}>

        {/* Header */}
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em',
          color: gold, textTransform: 'uppercase', marginBottom: '12px' }}>
          Claim profile
        </div>
        <h1 style={{ ...serif, fontSize: 'clamp(30px,5vw,46px)', fontWeight: 400,
          color: dark, lineHeight: 1.08, marginBottom: '12px' }}>
          Take ownership of {actor.name}
        </h1>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.65)',
          lineHeight: 1.7, marginBottom: '32px' }}>
          This profile was added by the community and is currently held in trust by NextUs.
          Claiming it makes you the owner — you can edit the voice layer (mission,
          offers, needs, working on now) and manage how this profile represents
          you or your organisation.
        </p>

        {/* Profile summary card */}
        <div style={{ background: '#FFFFFF',
          border: '1.5px solid rgba(200,146,42,0.22)',
          borderRadius: '12px', padding: '20px 22px', marginBottom: '32px',
          display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          {actor.image_url && (
            <img src={actor.image_url} alt={actor.name}
              style={{ width: '64px', height: '64px', objectFit: 'cover',
                borderRadius: '8px', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...body, fontSize: '17px', color: dark, marginBottom: '4px' }}>
              {actor.name}
            </div>
            {actor.tagline && (
              <div style={{ ...body, fontSize: '13px',
                color: 'rgba(15,21,35,0.60)', fontStyle: 'italic', marginBottom: '6px' }}>
                {actor.tagline}
              </div>
            )}
            {actor.website && (
              <a href={actor.website} target="_blank" rel="noopener noreferrer"
                style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em',
                  color: gold, textDecoration: 'none' }}>
                {actor.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
          </div>
        </div>

        {/* Attestation */}
        <div style={{ background: 'rgba(200,146,42,0.04)',
          border: '1.5px solid rgba(200,146,42,0.30)',
          borderRadius: '12px', padding: '20px 22px', marginBottom: '32px' }}>
          <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start',
            cursor: 'pointer' }}>
            <input type="checkbox" checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              style={{ marginTop: '4px', flexShrink: 0, cursor: 'pointer' }} />
            <span style={{ ...body, fontSize: '14px', color: dark,
              lineHeight: 1.65 }}>
              I attest that I am {actor.name} or have the authority to claim
              this profile on their behalf. I understand that false claims may
              be flagged by the community and reversed by NextUs.
            </span>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(138,48,48,0.05)',
            border: '1px solid rgba(138,48,48,0.25)',
            borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
            <p style={{ ...body, fontSize: '14px', color: '#8A3030', margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <button onClick={claim} disabled={!confirmed || claiming}
            style={{ ...sc, fontSize: '14px', letterSpacing: '0.16em',
              padding: '14px 32px', borderRadius: '40px', border: 'none',
              background: !confirmed || claiming ? 'rgba(200,146,42,0.30)' : '#C8922A',
              color: '#FFFFFF',
              cursor: !confirmed || claiming ? 'not-allowed' : 'pointer' }}>
            {claiming ? 'Claiming...' : 'Claim this profile'}
          </button>
          <Link to={`/org/${actor.slug || actor.id}`}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
              color: 'rgba(15,21,35,0.55)', textDecoration: 'none' }}>
            Cancel
          </Link>
        </div>

        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
          lineHeight: 1.55, marginTop: '24px' }}>
          After claiming, you'll be taken to the Voice tab where you can add
          your mission, offers, needs, and other first-person content.
        </p>

      </div>
      <SiteFooter />
    </div>
  )
}
