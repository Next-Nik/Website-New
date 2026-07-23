// src/app/components/InstallPrompt.jsx
// ─────────────────────────────────────────────────────────────────────────────
// "Add NextUs to your home screen" — a quiet, branded invitation that appears
// only when all of these are true:
//
//   · the visitor is on a mobile browser (coarse pointer + narrow viewport)
//   · the site is NOT already running as an installed app (standalone)
//   · the visitor hasn't dismissed the card in the last 30 days
//
// Two platform paths:
//   · Chromium (Android Chrome, Edge, Samsung Internet): we capture the
//     `beforeinstallprompt` event, suppress the browser's default mini-infobar,
//     and fire the native install dialog from our own button.
//   · iOS Safari: Apple exposes no install API, so we show a two-line
//     instruction card (Share → Add to Home Screen) instead.
//
// Desktop never sees this component. Nothing renders until a platform path
// is confirmed, so the common case costs one event listener and no DOM.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { fn } from '../../lib/designTokens'

const SNOOZE_KEY = 'nextus_install_prompt_dismissed_at'
const SNOOZE_DAYS = 30
const SHOW_DELAY_MS = 6000 // let the page land before inviting anything

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS Safari legacy flag
  )
}

function isMobileViewport() {
  return (
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(max-width: 820px)').matches
  )
}

function isIosSafari() {
  const ua = window.navigator.userAgent
  const isIos = /iPhone|iPad|iPod/.test(ua) ||
    (ua.includes('Macintosh') && window.matchMedia('(pointer: coarse)').matches)
  // Exclude in-app / third-party iOS browsers where Add to Home Screen
  // either doesn't exist or lives somewhere else entirely.
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua)
  return isIos && isSafari
}

function snoozed() {
  try {
    const at = Number(localStorage.getItem(SNOOZE_KEY) || 0)
    return at && Date.now() - at < SNOOZE_DAYS * 24 * 60 * 60 * 1000
  } catch (_) { return false }
}

function snooze() {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now())) } catch (_) {}
}

export function InstallPrompt() {
  const [mode, setMode] = useState(null)         // 'native' | 'ios' | null
  const [deferred, setDeferred] = useState(null) // captured beforeinstallprompt
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone() || !isMobileViewport() || snoozed()) return

    let timer = null
    const reveal = (m) => {
      timer = setTimeout(() => { setMode(m); setVisible(true) }, SHOW_DELAY_MS)
    }

    const onBip = (e) => {
      e.preventDefault() // suppress Chrome's own mini-infobar
      setDeferred(e)
      reveal('native')
    }
    window.addEventListener('beforeinstallprompt', onBip)

    // iOS never fires beforeinstallprompt; take the instruction path directly.
    if (isIosSafari()) reveal('ios')

    const onInstalled = () => { snooze(); setVisible(false) }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('appinstalled', onInstalled)
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (!visible || !mode) return null

  async function install() {
    if (!deferred) return
    deferred.prompt()
    try { await deferred.userChoice } catch (_) {}
    // Whatever they chose, the moment is spent · don't nag again this visit.
    setDeferred(null)
    snooze()
    setVisible(false)
  }

  function dismiss() {
    snooze()
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Add NextUs to your home screen"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
        zIndex: 900,
        background: fn.object,
        border: `1px solid ${fn.rule}`,
        borderRadius: 14,
        boxShadow: '0 8px 28px rgba(38,36,32,0.18)',
        padding: '14px 14px 12px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <img
        src="/icon-192.png"
        alt=""
        width={40}
        height={40}
        style={{ borderRadius: 10, flexShrink: 0, marginTop: 2 }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'Lora, serif',
          fontSize: 15,
          fontWeight: 600,
          color: fn.ink,
          lineHeight: 1.3,
        }}>
          Add the NextUs app
        </div>

        {mode === 'native' ? (
          <>
            <div style={{
              fontFamily: 'Lora, serif',
              fontSize: 13,
              color: fn.meta,
              lineHeight: 1.45,
              marginTop: 3,
            }}>
              One tap · no app store needed.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                onClick={install}
                style={{
                  fontFamily: 'Cormorant SC, monospace',
                  fontSize: 13,
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: 'none',
                  background: fn.moss,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                Add NextUs
              </button>
              <button
                onClick={dismiss}
                style={{
                  fontFamily: 'Cormorant SC, monospace',
                  fontSize: 13,
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: `1px solid ${fn.rule}`,
                  background: 'transparent',
                  color: fn.meta,
                  cursor: 'pointer',
                }}
              >
                Not now
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{
              fontFamily: 'Lora, serif',
              fontSize: 13,
              color: fn.meta,
              lineHeight: 1.45,
              marginTop: 3,
            }}>
              Tap the Share icon, then choose Add to Home Screen.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                onClick={dismiss}
                style={{
                  fontFamily: 'Cormorant SC, monospace',
                  fontSize: 13,
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: `1px solid ${fn.rule}`,
                  background: 'transparent',
                  color: fn.meta,
                  cursor: 'pointer',
                }}
              >
                Got it
              </button>
            </div>
          </>
        )}
      </div>

      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          border: 'none',
          background: 'transparent',
          color: fn.ghost,
          fontSize: 16,
          lineHeight: 1,
          padding: 4,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}
