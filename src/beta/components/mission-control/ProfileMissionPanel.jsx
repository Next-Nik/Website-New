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

export default function ProfileMissionPanel({ user, onNavigate }) {
  const [horizonSelf,   setHorizonSelf]   = useState(user?.user_metadata?.horizon_self || '')
  const [editing,       setEditing]       = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [savingPulse,   setSavingPulse]   = useState(false)
  const [userRow,       setUserRow]       = useState(null)
  const [loaded,        setLoaded]        = useState(false)

  const isFounder = user?.user_metadata?.role === 'founder'
  const userId    = user?.id
  const email     = user?.email || ''
  const fullName  = user?.user_metadata?.full_name || email.split('@')[0] || 'You'
  const initials  = (fullName || 'U').trim().charAt(0).toUpperCase()

  useEffect(() => {
    if (!userId) { setLoaded(true); return }
    let cancelled = false
    supabase
      .from('users')
      .select('email, beta_group, beta_access, created_at, first_name, last_name')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setUserRow(data || null)
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

  async function handleSignOut() {
    await supabase.auth.signOut()
    onNavigate('/')
  }

  function openPublicProfile() {
    if (!userId) return
    window.open(`/beta/profile/${userId}`, '_blank', 'noopener,noreferrer')
  }

  if (!user) {
    return (
      <div style={{ padding: '8px 0' }}>
        <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_META }}>
          You're signed out.
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
          {userRow?.beta_group ? userRow.beta_group.toUpperCase().replace(/_/g, ' ') : 'BETA'}
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

      {/* Horizon Self */}
      <div style={{
        background: 'rgba(200, 146, 42, 0.04)',
        border: `1px solid ${GOLD_RULE}`,
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 14,
      }}>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 9.5,
          letterSpacing: '0.18em',
          color: TEXT_FAINT,
          marginBottom: 8,
        }}>
          HORIZON SELF
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
                fontStyle: 'italic',
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
            Contributor Profile
          </div>
          <div style={{
            fontFamily: FONT_BODY,
            fontSize: 12.5,
            color: TEXT_META,
            marginTop: 2,
          }}>
            Visible on NextUs Planet — opens in new tab
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
            ['Beta group',   userRow?.beta_group ? userRow.beta_group.replace(/_/g, ' ') : (loaded ? '—' : '…')],
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
                textTransform: label === 'Beta group' ? 'capitalize' : 'none',
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
            background: 'rgba(200, 146, 42, 0.06)',
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
          onClick={() => onNavigate('/beta/profile/edit')}
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
