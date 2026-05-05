// src/beta/components/OrgNeedsTab.jsx
// Needs management tab. In-person needs surface first within each tier.

import { useState, useEffect } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { body, sc, gold, dark, SectionCard, Btn } from './OrgShared'

const statusColor = { open: '#2A6B3A', in_progress: '#2A4A8A', fulfilled: gold, closed: 'rgba(15,21,35,0.55)' }
const statusLabel = { open: 'Open', in_progress: 'In Progress', fulfilled: 'Fulfilled', closed: 'Closed' }

function NeedCard({ need, onUpdateStatus }) {
  const statusC = statusColor[need.status] || 'rgba(15,21,35,0.55)'
  const statusL = statusLabel[need.status] || need.status

  return (
    <SectionCard style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: statusC }}>
              {statusL}
            </span>
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)' }}>
              {need.need_type} · {need.size}
            </span>
            {need.medium === 'in_person' && (
              <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: gold, background: 'rgba(200,146,42,0.07)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '4px', padding: '2px 8px' }}>
                In person
              </span>
            )}
            {need.time_estimate && (
              <span style={{ ...sc, fontSize: '12px', color: 'rgba(15,21,35,0.55)' }}>{need.time_estimate}</span>
            )}
          </div>
          <h4 style={{ ...body, fontSize: '17px', fontWeight: 300, color: dark, marginBottom: '6px' }}>{need.title}</h4>
          {need.description && (
            <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.65 }}>
              {need.description.slice(0, 200)}{need.description.length > 200 ? '…' : ''}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
          {need.status === 'open'        && <Btn small onClick={() => onUpdateStatus(need.id, 'in_progress')}>In progress</Btn>}
          {need.status === 'in_progress' && <Btn small onClick={() => onUpdateStatus(need.id, 'fulfilled')}>Fulfilled</Btn>}
          {need.status !== 'closed' && need.status !== 'fulfilled' && (
            <Btn small variant="ghost" onClick={() => onUpdateStatus(need.id, 'closed')}>Close</Btn>
          )}
        </div>
      </div>
    </SectionCard>
  )
}

export function OrgNeedsTab({ actorId, navigate, toast }) {
  const [needs, setNeeds]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [hasOfferings, setHasOfferings] = useState(null)

  async function load() {
    setLoading(true)
    const [{ data: needsData }, { count }] = await Promise.all([
      supabase.from('nextus_needs')
        .select('*')
        .eq('actor_id', actorId)
        .order('created_at', { ascending: false }),
      supabase.from('nextus_actor_offerings')
        .select('*', { count: 'exact', head: true })
        .eq('actor_id', actorId),
    ])

    // Sort: in-person first within each status group
    const sorted = (needsData || []).sort((a, b) => {
      if (a.status !== b.status) return 0
      if (a.medium === 'in_person' && b.medium !== 'in_person') return -1
      if (b.medium === 'in_person' && a.medium !== 'in_person') return 1
      return 0
    })

    setNeeds(sorted)
    setHasOfferings(count > 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [actorId])

  async function updateStatus(id, status) {
    await supabase.from('nextus_needs').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    toast(`Need marked ${status}`)
    load()
  }

  if (loading) return <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading needs…</p>

  if (hasOfferings === false) {
    return (
      <SectionCard style={{ borderColor: 'rgba(200,146,42,0.35)', background: 'rgba(200,146,42,0.03)' }}>
        <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, marginBottom: '8px' }}>
          Add an offering first
        </p>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '20px' }}>
          Before you can post needs, you need at least one offering — something you give to the world. Contributors want to know what you are building before they decide to help build it with you.
        </p>
        <Btn onClick={() => navigate(`/beta/org/${actorId}/manage?tab=offerings`)}>
          Go to Offerings →
        </Btn>
      </SectionCard>
    )
  }

  const openNeeds       = needs.filter(n => n.status === 'open')
  const inProgressNeeds = needs.filter(n => n.status === 'in_progress')
  const closedNeeds     = needs.filter(n => n.status === 'fulfilled' || n.status === 'closed')

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.60)' }}>
          {needs.length === 0
            ? 'No needs posted yet.'
            : `${openNeeds.length} open · ${needs.length} total`}
        </p>
        <Btn small variant="solid" onClick={() => navigate(`/beta/org/${actorId}/needs/new`)}>
          + Post a need
        </Btn>
      </div>

      {needs.length === 0 && (
        <SectionCard>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, marginBottom: '16px' }}>
            Post your first need to let contributors know how they can help. Be specific — specific needs attract specific contributors.
          </p>
          <Btn onClick={() => navigate(`/beta/org/${actorId}/needs/new`)}>Post a need →</Btn>
        </SectionCard>
      )}

      {openNeeds.length > 0 && (
        <>
          <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', marginBottom: '12px' }}>
            Open ({openNeeds.length}) · In-person first
          </p>
          {openNeeds.map(n => <NeedCard key={n.id} need={n} onUpdateStatus={updateStatus} />)}
        </>
      )}

      {inProgressNeeds.length > 0 && (
        <>
          <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', marginTop: '24px', marginBottom: '12px' }}>
            In progress ({inProgressNeeds.length})
          </p>
          {inProgressNeeds.map(n => <NeedCard key={n.id} need={n} onUpdateStatus={updateStatus} />)}
        </>
      )}

      {closedNeeds.length > 0 && (
        <>
          <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', marginTop: '24px', marginBottom: '12px' }}>
            Fulfilled & closed ({closedNeeds.length})
          </p>
          {closedNeeds.map(n => <NeedCard key={n.id} need={n} onUpdateStatus={updateStatus} />)}
        </>
      )}
    </div>
  )
}
