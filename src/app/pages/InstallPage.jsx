// ─────────────────────────────────────────────────────────────
// InstallPage — /app
//
// PWA install landing page.
// Android: intercepts beforeinstallprompt, one-tap install.
// iOS:     step-by-step guide with animated Share arrow.
// Desktop: simple message + QR code directing to mobile.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'

// ── Device detection ─────────────────────────────────────────
function getDeviceType() {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'desktop'
}

function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

// ── Shared styles ─────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100dvh',
    background: '#FAFAF7',
    color: '#0F1523',
    fontFamily: "'Lora', Georgia, serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1.5rem',
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: '1.5rem',
  },
  wordmark: {
    fontFamily: "'Cormorant SC', serif",
    fontSize: '1.6rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: '#0F1523',
    marginBottom: '0.4rem',
  },
  tagline: {
    fontSize: '0.9rem',
    color: 'rgba(15,21,35,0.55)',
    marginBottom: '2.5rem',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  card: {
    background: '#fff',
    border: '1px solid rgba(200,146,42,0.25)',
    borderRadius: 16,
    padding: '2rem 1.75rem',
    maxWidth: 380,
    width: '100%',
    boxShadow: '0 2px 20px rgba(15,21,35,0.06)',
  },
  heading: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '1.45rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
    lineHeight: 1.25,
  },
  subheading: {
    fontSize: '0.875rem',
    color: 'rgba(15,21,35,0.6)',
    marginBottom: '1.75rem',
    lineHeight: 1.5,
  },
  primaryBtn: {
    width: '100%',
    padding: '0.9rem 1rem',
    background: '#0F1523',
    color: '#FAFAF7',
    border: 'none',
    borderRadius: 10,
    fontFamily: "'Lora', Georgia, serif",
    fontSize: '0.95rem',
    fontWeight: 500,
    cursor: 'pointer',
    letterSpacing: '0.02em',
  },
  stepList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 1.75rem 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  step: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.9rem',
  },
  stepNum: {
    width: 28,
    height: 28,
    minWidth: 28,
    background: 'rgba(200,146,42,0.12)',
    border: '1px solid rgba(200,146,42,0.35)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Cormorant SC', serif",
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#A8721A',
    marginTop: 2,
  },
  stepText: {
    fontSize: '0.9rem',
    lineHeight: 1.5,
    color: 'rgba(15,21,35,0.82)',
  },
  stepBold: {
    fontWeight: 600,
    color: '#0F1523',
  },
  divider: {
    borderTop: '1px solid rgba(200,146,42,0.2)',
    margin: '1.5rem 0',
  },
  openLink: {
    display: 'block',
    textAlign: 'center',
    fontSize: '0.85rem',
    color: '#A8721A',
    textDecoration: 'none',
    marginTop: '1.25rem',
  },
  successBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    textAlign: 'center',
  },
  successIcon: {
    fontSize: '2.5rem',
    lineHeight: 1,
  },
  successText: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '1.3rem',
    fontWeight: 600,
  },
  successSub: {
    fontSize: '0.875rem',
    color: 'rgba(15,21,35,0.55)',
  },
  shareArrow: {
    display: 'inline-block',
    animation: 'bob 1.4s ease-in-out infinite',
    fontSize: '1.1rem',
    marginLeft: 4,
  },
}

// ── Share icon SVG (iOS Safari share button replica) ──────────
function ShareIcon() {
  return (
    <svg
      width="18" height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#A8721A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }}
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

// ── Android panel ─────────────────────────────────────────────
function AndroidPanel({ deferredPrompt, onInstalled }) {
  const [installing, setInstalling] = useState(false)
  const [noPrompt, setNoPrompt] = useState(!deferredPrompt)

  async function handleInstall() {
    if (!deferredPrompt) {
      setNoPrompt(true)
      return
    }
    setInstalling(true)
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      onInstalled()
    } else {
      setInstalling(false)
    }
  }

  if (noPrompt) {
    // Already installed or prompt not available — show manual fallback
    return (
      <>
        <h2 style={S.heading}>Add NextUs to your home screen</h2>
        <p style={S.subheading}>
          Open the menu in your browser and tap <strong>Add to Home Screen</strong>.
        </p>
        <ol style={S.stepList}>
          <li style={S.step}>
            <span style={S.stepNum}>1</span>
            <span style={S.stepText}>Tap the <span style={S.stepBold}>⋮ menu</span> in Chrome (top right)</span>
          </li>
          <li style={S.step}>
            <span style={S.stepNum}>2</span>
            <span style={S.stepText}>Tap <span style={S.stepBold}>"Add to Home Screen"</span></span>
          </li>
          <li style={S.step}>
            <span style={S.stepNum}>3</span>
            <span style={S.stepText}>Tap <span style={S.stepBold}>Add</span> — done.</span>
          </li>
        </ol>
      </>
    )
  }

  return (
    <>
      <h2 style={S.heading}>Install the NextUs app</h2>
      <p style={S.subheading}>
        One tap. Opens full-screen, no browser bar — just the platform.
      </p>
      <button
        style={{ ...S.primaryBtn, opacity: installing ? 0.6 : 1 }}
        onClick={handleInstall}
        disabled={installing}
      >
        {installing ? 'Installing…' : '⬇ Add to Home Screen'}
      </button>
    </>
  )
}

// ── iOS panel ─────────────────────────────────────────────────
function IOSPanel() {
  return (
    <>
      <style>{`
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
      <h2 style={S.heading}>Add NextUs to your home screen</h2>
      <p style={S.subheading}>
        Three taps and it lives on your home screen like a native app.
      </p>
      <ol style={S.stepList}>
        <li style={S.step}>
          <span style={S.stepNum}>1</span>
          <span style={S.stepText}>
            Tap the <span style={S.stepBold}>Share button</span>
            <span style={S.shareArrow}><ShareIcon /></span>
            {' '}at the bottom of Safari
          </span>
        </li>
        <li style={S.step}>
          <span style={S.stepNum}>2</span>
          <span style={S.stepText}>
            Scroll down and tap{' '}
            <span style={S.stepBold}>"Add to Home Screen"</span>
          </span>
        </li>
        <li style={S.step}>
          <span style={S.stepNum}>3</span>
          <span style={S.stepText}>
            Tap <span style={S.stepBold}>Add</span> — done.
          </span>
        </li>
      </ol>
      <p style={{ fontSize: '0.8rem', color: 'rgba(15,21,35,0.4)', textAlign: 'center', marginTop: 0 }}>
        This page must be open in Safari, not Chrome or another browser.
      </p>
    </>
  )
}

// ── Desktop panel ─────────────────────────────────────────────
function DesktopPanel() {
  return (
    <>
      <h2 style={S.heading}>NextUs is built for mobile</h2>
      <p style={S.subheading}>
        Scan this QR code on your phone to install the app — or visit{' '}
        <strong>nextus.world/app</strong> in your mobile browser.
      </p>
      {/* QR code pointing to nextus.world/app */}
      <div style={{ textAlign: 'center', margin: '1rem 0' }}>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('https://nextus.world/app')}&bgcolor=FAFAF7&color=0F1523&qzone=2`}
          alt="QR code for nextus.world/app"
          width={200}
          height={200}
          style={{ borderRadius: 12, border: '1px solid rgba(200,146,42,0.25)' }}
        />
      </div>
      <p style={{ fontSize: '0.8rem', color: 'rgba(15,21,35,0.4)', textAlign: 'center' }}>
        Works on Android and iPhone
      </p>
    </>
  )
}

// ── Already installed panel ───────────────────────────────────
function AlreadyInstalledPanel() {
  return (
    <div style={S.successBox}>
      <div style={S.successIcon}>✓</div>
      <div style={S.successText}>You're all set.</div>
      <div style={S.successSub}>NextUs is already installed on your device.</div>
    </div>
  )
}

// ── Installed success panel ───────────────────────────────────
function InstalledPanel() {
  return (
    <div style={S.successBox}>
      <div style={S.successIcon}>✓</div>
      <div style={S.successText}>NextUs is installed.</div>
      <div style={S.successSub}>Find it on your home screen and open it from there.</div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function InstallPage() {
  const [device] = useState(() => getDeviceType())
  const [alreadyInstalled] = useState(() => isInStandaloneMode())
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function renderPanel() {
    if (alreadyInstalled) return <AlreadyInstalledPanel />
    if (installed) return <InstalledPanel />
    if (device === 'ios') return <IOSPanel />
    if (device === 'android') return <AndroidPanel deferredPrompt={deferredPrompt} onInstalled={() => setInstalled(true)} />
    return <DesktopPanel />
  }

  return (
    <div style={S.page}>
      <img src="/logo.png" alt="NextUs" style={S.logo} />
      <div style={S.wordmark}>NextUs</div>
      <div style={S.tagline}>A life worth living. A future worth building.</div>

      <div style={S.card}>
        {renderPanel()}

        {!alreadyInstalled && !installed && (
          <>
            <div style={S.divider} />
            <a href="/" style={S.openLink}>Open in browser instead →</a>
          </>
        )}

        {(alreadyInstalled || installed) && (
          <>
            <div style={S.divider} />
            <a href="/" style={S.openLink}>Go to NextUs →</a>
          </>
        )}
      </div>
    </div>
  )
}
