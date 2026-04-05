import { useAuth } from '../hooks/useAuth'

export function AuthGate({ toolName, children }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="loading" />

  if (!user) return (
    <div className="auth-overlay">
      <div className="auth-card">
        <span className="auth-eyebrow">{toolName}</span>
        <h2>Sign in to begin.</h2>
        <p>Your results are saved to your profile.</p>
        <a href={`/login?redirect=${encodeURIComponent(window.location.href)}`}>
          Sign in or create account {'\u2192'}
        </a>
      </div>
    </div>
  )

  return children
}
