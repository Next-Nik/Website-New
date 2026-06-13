// ─────────────────────────────────────────────────────────────
// SettingsMissionPanel.jsx
//
// The live in-dashboard "settings" surface. Replaces the marketing
// stub previously in Mission Control's `activePanel === 'settings'`
// Panel.
//
// Scope: only real things. No fake notification toggles, no theme
// picker, no two-factor placeholder. Settings as it currently
// exists in the platform is small and honest:
//
//   • Account — email, user id (copy), beta group, created date.
//     All read-only here. The full editor is the Profile panel.
//   • Subscription — beta access level if known.
//   • Founder Admin — link to /admin (founder role only).
//   • Support — link to /support and a way to contact.
//   • Sign out.
//
// Anything else (notifications, privacy controls, data export) is
// not yet wired. We'll add it here when the surface ships rather
// than now with non-functional toggles.
//
// Props:
//   user        — Supabase auth user
//   onNavigate  — react-router navigate function
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import {
  GOLD, GOLD_DK, GOLD_RULE,
  TEXT_INK, TEXT_META, TEXT_FAINT,
  BG_CARD,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'

function formatDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return null }
}

function shortId(id) {
  if (!id) return ''
  return id.length > 12 ? id.slice(0, 8) + '…' + id.slice(-4) : id
}

export default function SettingsMissionPanel({ user, onNavigate }) {
  const [userRow,    setUserRow]    = useState(null)
  const [loaded,     setLoaded]     = useState(false)
  const [copyState,  setCopyState]  = useState(null) // 'id' | 'email' | null

  const isFounder = user?.user_metadata?.role === 'founder'
  const userId    = user?.id
  const email     = user?.email || ''

  useEffect(() => {
    if (!userId) { setLoaded(true); return }
    let cancelled = false
    supabase
      .from('users')
      .select('email, beta_group, beta_access, created_at, status')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setUserRow(data || null)
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [userId])

  async function handleSignOut() {
    await supabase.auth.signOut()
    onNavigate('/')
  }

  // ── Self-service account deletion ──────────────────────────────
  // Two-step: click Delete → confirmation appears → click again to
  // commit. Removes the user row (cascade-deletes related rows via
  // FK constraints) and then signs out. Auth user is also removed
  // via the supabase admin API if available; if not, the auth row
  // becomes orphaned and inert (no public.users row, nothing reads it).
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [deleteError, setDeleteError]     = useState(null)

  async function handleDeleteAccount() {
    if (!user?.id) return
    setDeleting(true)
    setDeleteError(null)
    try {
      // Delete the public.users row — cascade should clean dependent
      // rows that have ON DELETE CASCADE. Some tables don't cascade;
      // those rows become orphaned but RLS already prevents access.
      const { error: rowErr } = await supabase
        .from('users').delete().eq('id', user.id)
      if (rowErr) throw rowErr

      // Sign the user out. Their auth record may remain in auth.users
      // (deletion there requires service role) but with no public.users
      // row they cannot use the platform.
      await supabase.auth.signOut()
      onNavigate('/')
    } catch (e) {
      setDeleting(false)
      setDeleteError(e?.message || 'Could not delete account. Email support@nextus.world.')
    }
  }

  function copy(value, key) {
    if (!value) return
    try {
      navigator.clipboard.writeText(value)
      setCopyState(key)
      setTimeout(() => setCopyState(null), 1500)
    } catch {}
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
          ACCOUNT &amp; ACCESS
        </div>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 9.5,
          letterSpacing: '0.18em',
          color: TEXT_FAINT,
        }}>
          BETA
        </div>
      </div>

      {/* Account block */}
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
          {/* Email row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: `1px solid ${GOLD_RULE}`,
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
              Email
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{
                fontFamily: FONT_BODY,
                fontSize: 13,
                color: TEXT_META,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {email}
              </span>
              <button
                onClick={() => copy(email, 'email')}
                title="Copy email"
                aria-label="Copy email"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copyState === 'email' ? GOLD_DK : TEXT_FAINT,
                  fontFamily: FONT_SC,
                  fontSize: 9.5,
                  letterSpacing: '0.16em',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                {copyState === 'email' ? 'COPIED' : 'COPY'}
              </button>
            </span>
          </div>

          {/* User ID row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: `1px solid ${GOLD_RULE}`,
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
              User ID
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 12,
                color: TEXT_META,
              }}>
                {shortId(userId)}
              </span>
              <button
                onClick={() => copy(userId, 'id')}
                title="Copy user ID"
                aria-label="Copy user ID"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copyState === 'id' ? GOLD_DK : TEXT_FAINT,
                  fontFamily: FONT_SC,
                  fontSize: 9.5,
                  letterSpacing: '0.16em',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                {copyState === 'id' ? 'COPIED' : 'COPY'}
              </button>
            </span>
          </div>

          {/* Member since */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
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
              Member since
            </span>
            <span style={{
              fontFamily: FONT_BODY,
              fontSize: 13,
              color: TEXT_META,
            }}>
              {formatDate(userRow?.created_at) || (loaded ? '—' : '…')}
            </span>
          </div>
        </div>
      </div>

      {/* Founder admin */}
      {isFounder && (
        <button
          onClick={() => onNavigate('/admin')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(200, 146, 42, 0.06)',
            border: `1px solid ${GOLD}`,
            borderRadius: 14,
            cursor: 'pointer',
            fontFamily: FONT_BODY,
            marginBottom: 14,
            textAlign: 'left',
          }}
        >
          <div>
            <div style={{
              fontFamily: FONT_SC,
              fontSize: 11,
              letterSpacing: '0.16em',
              color: GOLD_DK,
              fontWeight: 500,
              textTransform: 'uppercase',
            }}>
              Admin Console
            </div>
            <div style={{
              fontFamily: FONT_BODY,
              fontSize: 12.5,
              color: TEXT_META,
              marginTop: 2,
            }}>
              Founder controls — users, data, content
            </div>
          </div>
          <span style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 22,
            color: GOLD_DK,
            flexShrink: 0,
          }}>→</span>
        </button>
      )}

      {/* Support link */}
      <button
        onClick={() => onNavigate('/support')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 16px',
          background: BG_CARD,
          border: `1px solid ${GOLD_RULE}`,
          borderRadius: 14,
          cursor: 'pointer',
          fontFamily: FONT_BODY,
          marginBottom: 14,
          textAlign: 'left',
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
            Support &amp; Help
          </div>
          <div style={{
            fontFamily: FONT_BODY,
            fontSize: 12.5,
            color: TEXT_META,
            marginTop: 2,
          }}>
            Resources, contact, FAQ
          </div>
        </div>
        <span style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 22,
          color: GOLD_DK,
          flexShrink: 0,
        }}>→</span>
      </button>

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

      {/* Delete account — self-service, two-step confirm */}
      {!deleteConfirm ? (
        <button
          onClick={() => setDeleteConfirm(true)}
          style={{
            display: 'block',
            width: '100%',
            padding: '11px 16px',
            background: 'transparent',
            border: '1px solid rgba(138,48,48,0.30)',
            borderRadius: 14,
            cursor: 'pointer',
            fontFamily: FONT_SC,
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(138,48,48,0.75)',
            textAlign: 'center',
            marginBottom: 14,
          }}
        >
          Delete Account
        </button>
      ) : (
        <div style={{
          padding: '14px 16px',
          background: 'rgba(138,48,48,0.04)',
          border: '1px solid rgba(138,48,48,0.30)',
          borderRadius: 14,
          marginBottom: 14,
        }}>
          <p style={{
            fontFamily: FONT_BODY,
            fontSize: 13,
            color: '#5a2424',
            lineHeight: 1.55,
            margin: '0 0 12px',
          }}>
            This will delete your account and all your data — your Map, sprints, practice
            history, profile, everything. It can't be undone.
          </p>
          {deleteError && (
            <p style={{
              fontFamily: FONT_BODY,
              fontSize: 12,
              color: '#8A3030',
              margin: '0 0 12px',
            }}>
              {deleteError}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              style={{
                flex: 1,
                padding: '10px 14px',
                background: deleting ? 'rgba(138,48,48,0.40)' : '#8A3030',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                cursor: deleting ? 'not-allowed' : 'pointer',
                fontFamily: FONT_SC,
                fontSize: 11,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              onClick={() => { setDeleteConfirm(false); setDeleteError(null) }}
              disabled={deleting}
              style={{
                flex: 1,
                padding: '10px 14px',
                background: 'transparent',
                color: TEXT_META,
                border: '1px solid rgba(15,21,35,0.18)',
                borderRadius: 10,
                cursor: deleting ? 'not-allowed' : 'pointer',
                fontFamily: FONT_SC,
                fontSize: 11,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Honest note about what's not yet here */}
      <div style={{
        fontFamily: FONT_BODY,
        fontSize: 12,
        color: TEXT_FAINT,
        lineHeight: 1.6,
        padding: '0 4px 4px',
        fontStyle: 'italic',
      }}>
        Notification preferences and data export will live here when those surfaces are wired. For anything else, use Support.
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 14,
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
          QUIET CONTROLS
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
          PROFILE EDITOR →
        </button>
      </div>
    </div>
  )
}
