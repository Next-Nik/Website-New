// ─────────────────────────────────────────────────────────────
// OrgRoomOverlay.jsx — the org room, opened from the right rail
//
// My Org isn't a top scope and isn't a slide-in. It's a tile on the
// right (planet-side) rail of Mission Control, next to Add Org. Tap
// it and the room you already approved (the org tree plus the
// selected actor's detail) fades up in place over the wheel. No
// slide. Dismiss on the ×, a click outside, or Escape.
//
// Controlled by Mission Control: open / onClose / userId. The room
// (MyOrgMissionPanel) mounts only while open, so it fetches on demand.
// ─────────────────────────────────────────────────────────────
import { useEffect } from 'react'
import MyOrgMissionPanel from './mission-control/MyOrgMissionPanel'

export default function OrgRoomOverlay({ open, onClose, userId }) {
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(15,21,35,0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '32px 16px',
        boxSizing: 'border-box',
        animation: 'orgRoomFade 0.22s ease',
      }}
    >
      <style>{`
        @keyframes orgRoomFade {
          from { opacity: 0; transform: scale(0.985); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div style={{
        width: 'min(1080px, 96vw)',
        maxHeight: '92dvh',
        background: '#FAFAF7',
        border: '1.5px solid rgba(110,127,92,0.30)',
        borderRadius: '16px',
        overflowY: 'auto',
        boxShadow: '0 18px 60px rgba(15,21,35,0.28)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '14px 18px 0',
          position: 'sticky',
          top: 0,
          zIndex: 2,
        }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: 'rgba(15,21,35,0.72)',
              fontSize: '1.25rem',
              lineHeight: 1,
            }}
          >
            {'\u00D7'}
          </button>
        </div>

        <MyOrgMissionPanel userId={userId} />
      </div>
    </div>
  )
}
