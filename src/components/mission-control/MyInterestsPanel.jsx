// ─────────────────────────────────────────────────────────────
// MyInterestsPanel.jsx
//
// Shows the user's pulled tabs (offers and needs they've expressed
// interest in). Quick navigation back to each, ability to release
// (un-pull) any tab. Lives as a Mission Control panel.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../hooks/useSupabase'
import {
import { body, sc } from '../../../lib/designTokens'
  GOLD, GOLD_DK, GOLD_RULE, TEXT_INK, TEXT_META, FONT_DISPLAY,
} from './tokens'

function fmtDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = (now - d) / (1000 * 60 * 60 * 24)
  if (diff < 1) return 'today'
  if (diff < 7) return `${Math.floor(diff)}d ago`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function MyInterestsPanel({ userId }) {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')  // 'all' | 'offer' | 'need'

  async function load() {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase.rpc('my_interests')
    setItems(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [userId])

  async function release(item) {
    if (!confirm(`Remove your interest in "${item.title}"?`)) return
    await supabase.rpc('release_interest', {
      p_target_type: item.target_type, p_target_id: item.target_id,
    })
    load()
  }

  if (!userId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', ...body,
        color: TEXT_META, fontSize: '14px' }}>
        Sign in to see your interests.
      </div>
    )
  }

  const filtered = filter === 'all'
    ? items
    : items.filter(i => i.target_type === filter)

  return (
    <div style={{ padding: '20px 24px', height: '100%',
      display: 'flex', flexDirection: 'column' }}>

      <div style={{ marginBottom: '14px' }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '22px',
          fontWeight: 500, color: TEXT_INK, margin: 0 }}>
          My Interests
        </h2>
        <p style={{ ...body, fontSize: '13px', color: TEXT_META,
          margin: '6px 0 0', lineHeight: 1.55 }}>
          Tabs you've pulled from other actors' offers and needs. The actors who posted them can see your interest.
        </p>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[
          { v: 'all',   label: `All (${items.length})` },
          { v: 'offer', label: `Offers (${items.filter(i => i.target_type === 'offer').length})` },
          { v: 'need',  label: `Needs (${items.filter(i => i.target_type === 'need').length})` },
        ].map(opt => (
          <button key={opt.v} onClick={() => setFilter(opt.v)}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.10em',
              padding: '6px 12px', borderRadius: '40px',
              border: filter === opt.v ? `1.5px solid ${GOLD}` : `1.5px solid ${GOLD_RULE}`,
              background: filter === opt.v ? 'rgba(200,146,42,0.07)' : 'transparent',
              color: filter === opt.v ? GOLD_DK : TEXT_META,
              cursor: 'pointer' }}>
            {opt.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <p style={{ ...body, fontSize: '13px', color: TEXT_META,
            textAlign: 'center', marginTop: '20px' }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p style={{ ...body, fontSize: '13px', color: TEXT_META,
            textAlign: 'center', marginTop: '40px', fontStyle: 'italic' }}>
            No tabs pulled yet. When you see offers or needs that interest you, pull the tab on their card.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(item => {
              const accent = item.target_type === 'offer' ? '#2A6B3A' : '#2A4A8A'
              return (
                <div key={item.pull_id}
                  style={{ background: '#FFFFFF',
                    border: `1px solid ${GOLD_RULE}`,
                    borderRadius: '10px', padding: '14px 16px',
                    opacity: item.active === false ? 0.55 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start',
                    gap: '10px', marginBottom: '8px' }}>
                    {item.actor_image && (
                      <img src={item.actor_image} alt=""
                        style={{ width: '32px', height: '32px',
                          borderRadius: '50%', objectFit: 'cover',
                          flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link to={`/org/${item.actor_slug || item.target_id}`}
                        style={{ ...body, fontSize: '15px', color: TEXT_INK,
                          textDecoration: 'none', display: 'block',
                          fontWeight: 500, marginBottom: '2px' }}>
                        {item.title}
                      </Link>
                      <div style={{ ...sc, fontSize: '13px',
                        letterSpacing: '0.08em', color: TEXT_META }}>
                        From {item.actor_name} · pulled {fmtDate(item.pull_created_at)}
                      </div>
                    </div>
                  </div>
                  {item.description && (
                    <p style={{ ...body, fontSize: '13px',
                      color: TEXT_META, lineHeight: 1.55,
                      margin: '0 0 10px' }}>
                      {item.description.length > 140
                        ? item.description.slice(0, 140) + '…'
                        : item.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '8px',
                    alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ ...sc, fontSize: '13px',
                      letterSpacing: '0.10em',
                      color: accent,
                      border: `1px solid ${accent}30`,
                      background: `${accent}08`,
                      padding: '2px 8px', borderRadius: '40px',
                      textTransform: 'uppercase' }}>
                      {item.target_type}
                    </span>
                    {item.active === false && (
                      <span style={{ ...sc, fontSize: '13px',
                        letterSpacing: '0.10em',
                        color: TEXT_META, fontStyle: 'italic' }}>
                        no longer active
                      </span>
                    )}
                    <div style={{ flex: 1 }} />
                    <button onClick={() => release(item)}
                      style={{ ...sc, fontSize: '13px',
                        letterSpacing: '0.10em',
                        color: TEXT_META,
                        background: 'none', border: 'none',
                        cursor: 'pointer', textDecoration: 'underline' }}>
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
