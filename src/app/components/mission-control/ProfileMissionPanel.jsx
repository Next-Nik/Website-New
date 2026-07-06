// ─────────────────────────────────────────────────────────────
// ProfileMissionPanel.jsx
//
// The live in-dashboard view of "your profile." Replaces the
// marketing stub previously in Mission Control's `activePanel ===
// 'profile'` Panel.
//
// What renders inside:
//   • Hero — initials avatar, display name, email
//   • Horizon Self — editable italic statement, persists to
//     auth.users.user_metadata.horizon_self
//   • Contributor profile link — opens /beta/profile/{userId} in
//     a new tab (the public face)
//   • Account info — email, beta group, member since
//   • Founder admin shortcut (founder role only)
//   • Sign out
//
// The "EDIT PROFILE" panel action button still routes to
// /beta/profile/edit for the deep editor (display name, headline,
// statements, civilisational/self domains, principles, sprints
// visibility, all the rich fields).
//
// Mirrors the old /dashboard ProfileView's information shape, in
// the beta aesthetic with the consistent header/footer chrome.
//
// Props:
//   user        — Supabase auth user
//   onNavigate  — react-router navigate function (for /admin route)
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import {
  GOLD, GOLD_DK, GOLD_RULE, GOLD_FAINT,
  TEXT_INK, TEXT_META, TEXT_FAINT,
  BG_CARD,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'

function formatDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  } catch { return null }
}

function formatRegion(code) {
  switch (code) {
    case 'US': return 'United States'
    case 'UK': return 'United Kingdom'
    case 'EU': return 'Europe (EU)'
    case 'CA': return 'Canada'
    case 'AU': return 'Australia'
    case 'NZ': return 'New Zealand'
    case 'OTHER': return 'Somewhere else'
    default: return code || ''
  }
}

export default function ProfileMissionPanel({ user, onNavigate }) {
  const [horizonSelf,   setHorizonSelf]   = useState(user?.user_metadata?.horizon_self || '')
  const [editing,       setEditing]       = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [savingPulse,   setSavingPulse]   = useState(false)
  const [userRow,       setUserRow]       = useState(null)
  const [loaded,        setLoaded]        = useState(false)

  // Optional location. Free text plus a routing region. Used by the
  // Resources Engine to surface region-appropriate crisis-band
  // pointers; never used elsewhere, never required.
  const [location,        setLocation]        = useState('')
  const [region,          setRegion]          = useState('')
  const [editingLocation, setEditingLocation] = useState(false)
  const [savingLocation,  setSavingLocation]  = useState(false)
  const [locationPulse,   setLocationPulse]   = useState(false)

  const isFounder = user?.app_metadata?.role === 'founder' || user?.user_metadata?.role === 'founder'
  const userId    = user?.id
  const email     = user?.email || ''
  const fullName  = user?.user_metadata?.full_name || email.split('@')[0] || 'You'
  const initials  = (fullName || 'U').trim().charAt(0).toUpperCase()

  useEffect(() => {
    if (!userId) { setLoaded(true); return }
    let cancelled = false
    supabase
      .from('users')
      .select('email, beta_group, beta_access, created_at, first_name, last_name, location, region')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setUserRow(data || null)
        setLocation(data?.location || '')
        setRegion(data?.region || '')
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [userId])

  async function saveHorizonSelf() {
    setSaving(true)
    setSavingPulse(true)
    try {
      await supabase.auth.updateUser({ data: { horizon_self: horizonSelf } })
      setEditing(false)
    } finally {
      setSaving(false)
      setTimeout(() => setSavingPulse(false), 250)
    }
  }

  async function saveLocation() {
    if (!userId) return
    setSavingLocation(true)
    setLocationPulse(true)
    try {
      const trimmed = (location || '').trim().slice(0, 120)
      const validRegions = ['US','UK','EU','CA','AU','NZ','OTHER']
      const normalisedRegion = validRegions.includes(region) ? region : null
      await supabase
        .from('users')
        .update({
          location: trimmed || null,
          region:   normalisedRegion,
        })
        .eq('id', userId)
      setUserRow(prev => prev ? { ...prev, location: trimmed || null, region: normalisedRegion } : prev)
      setLocation(trimmed)
      setRegion(normalisedRegion || '')
      setEditingLocation(false)
    } finally {
      setSavingLocation(false)
      setTimeout(() => setLocationPulse(false), 250)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    onNavigate('/')
  }

  function openPublicProfile() {
    if (!userId) return
    window.open(`/profile/${userId}`, '_blank', 'noopener,noreferrer')
  }

  if (!user) {
    return (
      <div style={{ padding: '4px 0 8px' }}>
        <p style={{
          fontFamily: FONT_BODY,
          fontSize: 15,
          lineHeight: 1.55,
          color: TEXT_INK,
          margin: '0 0 14px',
        }}>
          You're not signed in yet.
        </p>
        <p style={{
          fontFamily: FONT_BODY,
          fontSize: 14,
          lineHeight: 1.55,
          color: TEXT_META,
          margin: '0 0 18px',
        }}>
          Sign in to claim your place on the map, save your Horizon profile, and connect with the people and organisations doing work that matters to you.
        </p>
        <a
          href="/login"
          style={{
            display: 'inline-block',
            padding: '10px 18px',
            background: GOLD,
            color: '#FAFAF7',
            fontFamily: FONT_SC,
            fontSize: 12,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            borderRadius: 2,
            transition: 'background 160ms ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = GOLD_DK}
          onMouseLeave={e => e.currentTarget.style.background = GOLD}
        >
          Sign in →
        </a>
        <p style={{
          fontFamily: FONT_BODY,
          fontSize: 13,
          color: TEXT_FAINT,
          margin: '14px 0 0',
        }}>
          New here? Signing in creates your account.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '4px 0' }}>

      {/* Header strip */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 14,
        paddingBottom: 12,
        borderBottom: `1px solid ${GOLD_RULE}`,
      }}>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 10.5,
          letterSpacing: '0.18em',
          color: GOLD_DK,
        }}>
          {isFounder ? 'FOUNDER' : ''}
        </div>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 9.5,
          letterSpacing: '0.18em',
          color: savingPulse ? GOLD : 'transparent',
          transition: 'color 0.25s ease',
        }}>
          SAVED
        </div>
      </div>

      {/* Hero */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        background: BG_CARD,
        border: `1px solid ${GOLD_RULE}`,
        borderRadius: 14,
        marginBottom: 14,
      }}>
        <div style={{
          width: 52, height: 52,
          borderRadius: '50%',
          background: GOLD_FAINT,
          border: `2px solid ${GOLD}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          fontFamily: FONT_DISPLAY,
          fontSize: 24,
          color: GOLD_DK,
          fontWeight: 500,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 22,
            fontWeight: 500,
            color: TEXT_INK,
            lineHeight: 1.2,
          }}>
            {fullName}
          </div>
          <div style={{
            fontFamily: FONT_BODY,
            fontSize: 13,
            color: TEXT_META,
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {email}
          </div>
        </div>
      </div>

      {/* ── PRIVATE ZONE ─────────────────────────────────────────
          Everything below the identity card down to the account rows
          is private to the member. The developmental rail is never
          published and has no opt-in. */}
      <div style={{
        fontFamily: FONT_SC,
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: TEXT_FAINT,
        margin: '4px 2px 12px',
      }}>
        Private to you
      </div>

      {/* Horizon Self */}
      <div style={{
        background: 'rgba(110,127,92, 0.04)',
        border: `1px solid ${GOLD_RULE}`,
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 14,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 8,
        }}>
          <span style={{
            fontFamily: FONT_SC,
            fontSize: 9.5,
            letterSpacing: '0.18em',
            color: TEXT_FAINT,
          }}>
            HORIZON SELF
          </span>
          <span style={{
            fontFamily: FONT_SC,
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: TEXT_FAINT,
          }}>
            Only you see this
          </span>
        </div>
        {editing ? (
          <>
            <textarea
              value={horizonSelf}
              onChange={e => setHorizonSelf(e.target.value)}
              rows={3}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                fontFamily: FONT_BODY,
                fontSize: 14,
                fontStyle: 'italic',
                color: TEXT_INK,
                background: '#FFFFFF',
                border: `1px solid ${GOLD_RULE}`,
                borderRadius: 0,
                resize: 'vertical',
                minHeight: 70,
                outline: 'none',
                lineHeight: 1.6,
              }}
              onFocus={e => { e.target.style.borderColor = GOLD }}
              onBlur={e => { e.target.style.borderColor = GOLD_RULE }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onClick={saveHorizonSelf}
                disabled={saving}
                style={{
                  background: GOLD,
                  border: `1px solid ${GOLD}`,
                  color: '#0F1523',
                  padding: '8px 16px',
                  fontFamily: FONT_SC,
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  cursor: saving ? 'default' : 'pointer',
                  borderRadius: 40,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setHorizonSelf(user?.user_metadata?.horizon_self || '')
                  setEditing(false)
                }}
                style={{
                  background: 'transparent',
                  border: `1px solid ${GOLD_RULE}`,
                  color: TEXT_META,
                  padding: '8px 16px',
                  fontFamily: FONT_SC,
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  borderRadius: 40,
                }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            {horizonSelf ? (
              <p style={{
                fontFamily: FONT_BODY,
                fontSize: 15,
                fontStyle: 'italic',
                color: GOLD_DK,
                lineHeight: 1.65,
                margin: '0 0 8px',
              }}>
                "{horizonSelf}"
              </p>
            ) : (
              <p style={{
                fontFamily: FONT_BODY,
                fontSize: 13.5,
                color: TEXT_FAINT,
                margin: '0 0 8px',
              }}>
                Not yet written. A short statement of who you are when you're moving in your direction.
              </p>
            )}
            <button
              onClick={() => setEditing(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: GOLD_DK,
                padding: 0,
                fontFamily: FONT_SC,
                fontSize: 10.5,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {horizonSelf ? 'EDIT STATEMENT →' : 'ADD STATEMENT →'}
            </button>
          </>
        )}
      </div>

      {/* Location — optional. Free text + region routing. Used only to
          surface region-appropriate crisis-band resources; never shown
          on the public profile, never used elsewhere. */}
      <div style={{
        background: 'rgba(110,127,92, 0.04)',
        border: `1px solid ${GOLD_RULE}`,
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 14,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}>
          <div style={{
            fontFamily: FONT_SC,
            fontSize: 9.5,
            letterSpacing: '0.18em',
            color: TEXT_FAINT,
          }}>
            LOCATION
          </div>
          <div style={{
            fontFamily: FONT_SC,
            fontSize: 9,
            letterSpacing: '0.18em',
            color: locationPulse ? GOLD : 'transparent',
            transition: 'color 0.25s ease',
          }}>
            SAVED
          </div>
        </div>
        {editingLocation ? (
          <>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              maxLength={120}
              autoFocus
              placeholder="City, country, or how you'd describe where you are"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontFamily: FONT_BODY,
                fontSize: 14,
                color: TEXT_INK,
                background: '#FFFFFF',
                border: `1px solid ${GOLD_RULE}`,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = GOLD }}
              onBlur={e => { e.target.style.borderColor = GOLD_RULE }}
            />
            <div style={{ marginTop: 10 }}>
              <div style={{
                fontFamily: FONT_SC,
                fontSize: 9,
                letterSpacing: '0.18em',
                color: TEXT_FAINT,
                marginBottom: 6,
              }}>
                REGION (FOR LOCAL RESOURCES)
              </div>
              <select
                value={region || ''}
                onChange={e => setRegion(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontFamily: FONT_BODY,
                  fontSize: 14,
                  color: region ? TEXT_INK : TEXT_FAINT,
                  background: '#FFFFFF',
                  border: `1px solid ${GOLD_RULE}`,
                  outline: 'none',
                  boxSizing: 'border-box',
                  appearance: 'none',
                  backgroundImage: `linear-gradient(45deg, transparent 50%, ${GOLD_DK} 50%), linear-gradient(135deg, ${GOLD_DK} 50%, transparent 50%)`,
                  backgroundPosition: 'calc(100% - 18px) calc(50% - 2px), calc(100% - 13px) calc(50% - 2px)',
                  backgroundSize: '5px 5px, 5px 5px',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                <option value="">Prefer not to say</option>
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
                <option value="EU">Europe (EU)</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
                <option value="NZ">New Zealand</option>
                <option value="OTHER">Somewhere else</option>
              </select>
            </div>
            <p style={{
              fontFamily: FONT_BODY,
              fontSize: 12,
              color: TEXT_FAINT,
              margin: '10px 0 0',
              lineHeight: 1.5,
            }}>
              Optional. Used only to surface region-appropriate resources when you need them. Not shown on your public profile.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onClick={saveLocation}
                disabled={savingLocation}
                style={{
                  background: GOLD,
                  border: `1px solid ${GOLD}`,
                  color: '#0F1523',
                  padding: '8px 16px',
                  fontFamily: FONT_SC,
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  cursor: savingLocation ? 'default' : 'pointer',
                  borderRadius: 40,
                  opacity: savingLocation ? 0.6 : 1,
                }}
              >
                {savingLocation ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setLocation(userRow?.location || '')
                  setRegion(userRow?.region || '')
                  setEditingLocation(false)
                }}
                style={{
                  background: 'transparent',
                  border: `1px solid ${GOLD_RULE}`,
                  color: TEXT_META,
                  padding: '8px 16px',
                  fontFamily: FONT_SC,
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  borderRadius: 40,
                }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            {(userRow?.location || userRow?.region) ? (
              <p style={{
                fontFamily: FONT_BODY,
                fontSize: 14,
                color: TEXT_INK,
                lineHeight: 1.55,
                margin: '0 0 8px',
              }}>
                {userRow?.location}
                {userRow?.location && userRow?.region ? ' · ' : ''}
                {userRow?.region ? formatRegion(userRow.region) : ''}
              </p>
            ) : (
              <p style={{
                fontFamily: FONT_BODY,
                fontSize: 13.5,
                color: TEXT_FAINT,
                margin: '0 0 8px',
              }}>
                Optional. Used only to surface region-appropriate resources when you need them.
              </p>
            )}
            <button
              onClick={() => setEditingLocation(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: GOLD_DK,
                padding: 0,
                fontFamily: FONT_SC,
                fontSize: 10.5,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {(userRow?.location || userRow?.region) ? 'EDIT LOCATION →' : 'ADD LOCATION →'}
            </button>
          </>
        )}
      </div>

      {/* ── PUBLIC ZONE ──────────────────────────────────────────
          The contribution-rail surface others can see. */}
      <div style={{
        fontFamily: FONT_SC,
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: TEXT_FAINT,
        margin: '8px 2px 4px',
      }}>
        Public
      </div>
      <div style={{
        fontFamily: FONT_BODY,
        fontSize: 12.5,
        color: TEXT_META,
        lineHeight: 1.6,
        margin: '0 2px 12px',
      }}>
        What others see — where you stand and what you contribute. Your inner work stays private.
      </div>

      {/* Public profile link */}
      <button
        onClick={openPublicProfile}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 16px',
          background: BG_CARD,
          border: `1px solid ${GOLD_RULE}`,
          borderRadius: 14,
          marginBottom: 14,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: FONT_BODY,
        }}
      >
        <div>
          <div style={{
            fontFamily: FONT_SC,
            fontSize: 11,
            letterSpacing: '0.16em',
            color: TEXT_INK,
            fontWeight: 500,
            textTransform: 'uppercase',
          }}>
            Member Card
          </div>
          <div style={{
            fontFamily: FONT_BODY,
            fontSize: 12.5,
            color: TEXT_META,
            marginTop: 2,
          }}>
            Your placement in the ecosystem — opens in new tab
          </div>
        </div>
        <span style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 22,
          color: GOLD_DK,
          flexShrink: 0,
        }}>↗</span>
      </button>

      {/* Account info */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 9.5,
          letterSpacing: '0.18em',
          color: TEXT_FAINT,
          marginBottom: 8,
        }}>
          ACCOUNT
        </div>
        <div style={{
          background: BG_CARD,
          border: `1px solid ${GOLD_RULE}`,
          borderRadius: 14,
          overflow: 'hidden',
        }}>
          {[
            ['Email',        email],
            ['Member since', formatDate(userRow?.created_at) || (loaded ? '—' : '…')],
          ].map(([label, val], i, arr) => (
            <div key={label} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderBottom: i < arr.length - 1 ? `1px solid ${GOLD_RULE}` : 'none',
              gap: 10,
            }}>
              <span style={{
                fontFamily: FONT_SC,
                fontSize: 10,
                letterSpacing: '0.16em',
                color: TEXT_FAINT,
                textTransform: 'uppercase',
                flexShrink: 0,
              }}>
                {label}
              </span>
              <span style={{
                fontFamily: FONT_BODY,
                fontSize: 13,
                color: TEXT_META,
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textTransform: 'none',
              }}>
                {val}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Founder admin shortcut */}
      {isFounder && (
        <button
          onClick={() => onNavigate('/admin')}
          style={{
            display: 'block',
            width: '100%',
            padding: '11px 16px',
            background: 'rgba(110,127,92, 0.06)',
            border: `1px solid ${GOLD}`,
            borderRadius: 14,
            cursor: 'pointer',
            fontFamily: FONT_SC,
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: GOLD_DK,
            textAlign: 'center',
            marginBottom: 14,
          }}
        >
          ADMIN CONSOLE →
        </button>
      )}

      {/* Founder: Movie Magic (hidden screenwriting workspace) */}
      {isFounder && (
        <button
          onClick={() => onNavigate('/movie-magic')}
          style={{
            display: 'block',
            width: '100%',
            padding: '11px 16px',
            background: 'rgba(110,127,92, 0.06)',
            border: `1px solid ${GOLD}`,
            borderRadius: 14,
            cursor: 'pointer',
            fontFamily: FONT_SC,
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: GOLD_DK,
            textAlign: 'center',
            marginBottom: 14,
          }}
        >
          MOVIE MAGIC →
        </button>
      )}

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        style={{
          display: 'block',
          width: '100%',
          padding: '11px 16px',
          background: 'transparent',
          border: `1px solid rgba(15,21,35,0.18)`,
          borderRadius: 14,
          cursor: 'pointer',
          fontFamily: FONT_SC,
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: TEXT_META,
          textAlign: 'center',
          marginBottom: 14,
        }}
      >
        Sign Out
      </button>

      {/* Footer */}
      <div style={{
        marginTop: 8,
        paddingTop: 14,
        borderTop: `1px solid ${GOLD_RULE}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 9.5,
          letterSpacing: '0.18em',
          color: TEXT_FAINT,
        }}>
          YOU · ON THE PLATFORM
        </div>
        <button
          onClick={() => onNavigate('/profile/edit')}
          style={{
            background: 'transparent',
            border: 'none',
            color: GOLD_DK,
            padding: '6px 0',
            fontFamily: FONT_SC,
            fontSize: 10.5,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          FULL PROFILE EDITOR →
        </button>
      </div>
    </div>
  )
}
