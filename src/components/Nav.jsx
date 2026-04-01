import { useAuth } from '../hooks/useAuth'

export function Nav({ activePath }) {
  const { user } = useAuth()

  const initial = user?.email
    ? (user.email.split('@')[0].charAt(0) || '?').toUpperCase()
    : '\u2192'

  return (
    <nav className="site-nav">
      <a href="https://nextus.world" className="nav-logo">
        <img src="/logo_nav.png" alt="NextUs" />
      </a>

      <ul className="nav-links">
        <li>
          <a
            href="https://nextus.world/life-os.html"
            className={activePath === 'life-os' ? 'active' : ''}
          >
            Life OS
          </a>
        </li>
        <li>
          <a
            href="https://nextus.world/nextus.html"
            className={activePath === 'nextus' ? 'active' : ''}
          >
            NextUs
          </a>
        </li>
        <li>
          <a
            href="https://nextus.world/podcast.html"
            className={activePath === 'podcast' ? 'active' : ''}
          >
            Podcast
          </a>
        </li>
        <li>
          <a
            href="https://nextus.world/about.html"
            className={activePath === 'about' ? 'active' : ''}
          >
            About
          </a>
        </li>
      </ul>

      <a
        href={user ? 'https://nextus.world/profile.html' : 'https://nextus.world/login.html'}
        className="nav-profile-dot"
        title={user ? 'Your profile' : 'Sign in'}
      >
        {initial}
      </a>
    </nav>
  )
}
