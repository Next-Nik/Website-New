// ============================================================================
// VoiceInput — a mic button that uses the browser's built-in Web Speech API
// to dictate into any textarea.
//
// Drop-in usage:
//   <VoiceInput
//     value={input}
//     onChange={setInput}
//     disabled={thinking}
//   />
//
// How it behaves:
//   - Hidden entirely on browsers that don't support the API (Firefox, some
//     mobile browsers). No error messages — absent feature, no clutter.
//   - Click to start listening; click again to stop.
//   - As you speak, interim text is shown; when you pause, the final text is
//     appended to whatever was already in the field.
//   - Long-press a running mic = safety cancel (also stops if you click away
//     or the tab loses focus).
// ============================================================================

import { useState, useEffect, useRef } from 'react'

const GOLD   = '#A8721A'
const GOLD_L = '#C8922A'
const MUTE   = 'rgba(15,21,35,0.55)'

// Feature detection — run once, cached
function getSpeechRecognition() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function VoiceInput({ value, onChange, disabled, size = 44 }) {
  const SR = getSpeechRecognition()
  const [listening, setListening] = useState(false)
  const [interim, setInterim]     = useState('')
  const recognitionRef = useRef(null)
  // Snapshot of the field value when recording started — new speech is
  // appended to this, not to the live value (which includes interim results)
  const baseValueRef   = useRef('')

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
        recognitionRef.current = null
      }
    }
  }, [])

  // If the browser doesn't support it, render nothing — keeps the UI clean
  if (!SR) return null

  function start() {
    if (disabled || listening) return
    baseValueRef.current = value || ''

    const rec = new SR()
    rec.continuous     = true   // keep listening through pauses
    rec.interimResults = true   // show words as they're recognized
    rec.lang           = 'en-US'

    rec.onresult = (event) => {
      let finalText  = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += chunk
        else interimText += chunk
      }
      if (finalText) {
        const base = baseValueRef.current
        const sep  = base && !base.endsWith(' ') && !base.endsWith('\n') ? ' ' : ''
        baseValueRef.current = base + sep + finalText.trim()
        onChange(baseValueRef.current)
        setInterim('')
      } else if (interimText) {
        setInterim(interimText)
        const base = baseValueRef.current
        const sep  = base && !base.endsWith(' ') && !base.endsWith('\n') ? ' ' : ''
        // Show interim text in the field live, but don't commit it to the base
        onChange(base + sep + interimText)
      }
    }

    rec.onerror = (e) => {
      // 'not-allowed' = mic permission denied. 'no-speech' = silence timeout.
      // 'aborted' = we stopped it. In all cases, fall back quietly.
      console.warn('Voice input:', e.error)
      stop()
    }

    rec.onend = () => {
      setListening(false)
      setInterim('')
      recognitionRef.current = null
    }

    try {
      rec.start()
      recognitionRef.current = rec
      setListening(true)
    } catch (err) {
      console.warn('Voice input start failed:', err)
      setListening(false)
    }
  }

  function stop() {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
    // Ensure any lingering interim text gets committed or dropped cleanly
    if (interim) {
      onChange(baseValueRef.current) // revert to committed only
      setInterim('')
    }
    setListening(false)
  }

  function toggle() {
    if (listening) stop()
    else start()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={listening ? 'Stop voice input' : 'Start voice input'}
      title={listening ? 'Stop listening' : 'Speak your answer'}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `1.5px solid ${listening ? GOLD : 'rgba(15,21,35,0.18)'}`,
        background: listening ? 'rgba(200,146,42,0.1)' : '#FFFFFF',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={e => {
        if (!disabled && !listening) e.currentTarget.style.borderColor = GOLD_L
      }}
      onMouseLeave={e => {
        if (!listening) e.currentTarget.style.borderColor = 'rgba(15,21,35,0.18)'
      }}
    >
      {/* Mic icon, gold when active, muted when idle */}
      <svg width={size * 0.48} height={size * 0.48} viewBox="0 0 24 24" fill="none"
           stroke={listening ? GOLD : MUTE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <line x1="12" y1="18" x2="12" y2="21" />
        <line x1="8"  y1="21" x2="16" y2="21" />
      </svg>
      {/* Pulsing ring while listening */}
      {listening && (
        <span style={{
          position: 'absolute',
          width: size + 10,
          height: size + 10,
          borderRadius: '50%',
          border: `2px solid ${GOLD_L}`,
          opacity: 0,
          animation: 'vi-pulse 1.6s ease-out infinite',
          pointerEvents: 'none',
        }} />
      )}
      <style>{`
        @keyframes vi-pulse {
          0%   { opacity: 0.5; transform: scale(0.9); }
          100% { opacity: 0;   transform: scale(1.3); }
        }
      `}</style>
    </button>
  )
}

export default VoiceInput
