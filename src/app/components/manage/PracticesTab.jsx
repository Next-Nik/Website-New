// src/app/components/manage/PracticesTab.jsx
//
// The owner's consent surface for Best Practices. An owner sees the practices
// proposed against their actor and confirms ("yes, we do this") or declines.
// A decline is remembered, so it isn't re-proposed.
//
// Dignity: a practice we've ruled out is never shown as an accusation. It is
// shown plainly, with the reason, and with the door forward — the better
// practice for the same goal. Invitation, never shaming. The same actor that
// changes practice is the same actor, walking through a better door.

import { useState, useEffect } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import { body, sc, gold, dark, SectionCard, Btn } from '../OrgShared'

const STANDING = {
  best:        ['Best practice',  '#2A6A3A'],
  alternative: ['Viable alternative', '#2A4A8A'],
  ruled_out:   ['Not viable',     '#8A3030'],
  unjudged:    ['Under review',   'rgba(15,21,35,0.45)'],
}

export function PracticesTab({ actorId, toast }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId,  setBusyId]  = useState(null)

  async function authedFetch(opts) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { toast('Sign-in expired — reload and retry.'); return null }
    return fetch(`/api/practice-confirm${opts.qs || ''}`, {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
  }

  async function load() {
    setLoading(true)
    const res = await authedFetch({ qs: `?actorId=${actorId}` })
    if (!res) { setLoading(false); return }
    const data = await res.json().catch(() => ({}))
    setItems(data.embodiments || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [actorId])

  async function act(emb, action) {
    setBusyId(emb.id)
    try {
      const res = await authedFetch({ method: 'POST', body: { embodimentId: emb.id, action } })
      if (!res) return
      const data = await res.json().catch(() => ({}))
      if (!data.ok) { toast(data.error || 'Could not save.'); return }
      toast(action === 'confirm' ? 'Confirmed' : 'Declined')
      load()
    } finally {
      setBusyId(null)
    }
  }

  const pending   = items.filter(e => !e.confirmed && !e.declined)
  const confirmed = items.filter(e => e.confirmed)
  const declined  = items.filter(e => e.declined)

  function Row({ e, showActions }) {
    const p = e.practice || {}
    const [slabel, scolor] = STANDING[p.standing] || STANDING.unjudged
    const ruled = p.standing === 'ruled_out'
    return (
      <SectionCard style={{ borderLeft: `3px solid ${scolor}`, marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: scolor }}>{slabel}</span>
          <span style={{ ...body, fontSize: '17px', color: dark }}>{p.name}</span>
        </div>
        {p.statement && (
          <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, marginBottom: '8px' }}>{p.statement}</div>
        )}

        {ruled && (
          <div style={{ background: 'rgba(42,106,58,0.06)', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px' }}>
            {p.standing_rationale && (
              <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, marginBottom: e.redemption_door?.length ? '8px' : 0 }}>
                {p.standing_rationale}
              </div>
            )}
            {e.redemption_door?.length > 0 && (
              <div>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#2A6A3A', marginBottom: '4px' }}>A door forward, same goal</div>
                <div style={{ ...body, fontSize: '14px', color: dark, lineHeight: 1.6 }}>
                  {e.redemption_door.map(b => b.name).join(' · ')}
                </div>
              </div>
            )}
          </div>
        )}

        {showActions && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Btn small disabled={busyId === e.id} onClick={() => act(e, 'confirm')}>
              {busyId === e.id ? '…' : (ruled ? 'Yes, this is us' : 'Confirm')}
            </Btn>
            <Btn small variant="ghost" disabled={busyId === e.id} onClick={() => act(e, 'decline')}>
              {ruled ? 'Not us' : 'Decline'}
            </Btn>
          </div>
        )}
        {!showActions && e.declined && (
          <Btn small variant="ghost" disabled={busyId === e.id} onClick={() => act(e, 'confirm')}>Reconsider</Btn>
        )}
        {!showActions && e.confirmed && (
          <Btn small variant="ghost" disabled={busyId === e.id} onClick={() => act(e, 'decline')}>Remove</Btn>
        )}
      </SectionCard>
    )
  }

  return (
    <div>
      <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.6)', lineHeight: 1.6, marginBottom: '20px', maxWidth: '600px' }}>
        Practices we've noticed your work may embody. Confirm the ones that are yours so they
        show on your profile. Nothing appears publicly until you confirm it.
      </div>

      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {!loading && items.length === 0 && (
        <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No practices proposed yet.</p>
      )}

      {pending.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: gold, marginBottom: '10px' }}>To review</div>
          {pending.map(e => <Row key={e.id} e={e} showActions />)}
        </div>
      )}

      {confirmed.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: gold, marginBottom: '10px' }}>Confirmed</div>
          {confirmed.map(e => <Row key={e.id} e={e} />)}
        </div>
      )}

      {declined.length > 0 && (
        <div>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(15,21,35,0.55)', marginBottom: '10px' }}>Declined</div>
          {declined.map(e => <Row key={e.id} e={e} />)}
        </div>
      )}
    </div>
  )
}
