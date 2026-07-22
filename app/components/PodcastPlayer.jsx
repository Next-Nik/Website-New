// ─────────────────────────────────────────────────────────────────────────────
// PodcastPlayer — reusable on-brand RSS podcast player.
//
// Renders a show header (cover, title, host, subscribe pills), an episode list
// with expandable descriptions, and an inline now-playing bar with real audio
// playback. Pulls episodes from /api/podcast-feed, which proxies and parses the
// actor's RSS feed (Libsyn, etc.).
//
// Designed to be dropped into any surface:
//   • Practitioner / actor page (OrgPublic) — framed=false, sits as a section.
//   • Future Atlas "Listen" library — render one per actor feed, framed=true.
//
// Props:
//   feedUrl        RSS feed URL. Passed to the proxy as ?feed=. If omitted the
//                  proxy falls back to its default (NextUs Conversations).
//   title          Show title override. Defaults to the feed's own <title>.
//   host           Host line, e.g. "Hosted by Nik Wood". Optional.
//   subscribeLinks Array of { label, url } for the subscribe pills (Spotify,
//                  Apple, RSS…). Optional.
//   maxEpisodes    How many episodes to show before "Show more". Default 5.
//   framed         When true, wraps in the gold-bordered parchment card (good
//                  for standalone / library use). Default false (bare section).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { body, serif, sc, gold, dark, parch } from './OrgShared'

const hair = 'rgba(76,107,69,0.22)'

function PlayGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={gold} aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={gold} aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  )
}

function MicGlyph() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="1.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="9" y1="21" x2="15" y2="21" />
    </svg>
  )
}

function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

function fmtDate(pubDate) {
  if (!pubDate) return ''
  const d = new Date(pubDate)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function PodcastPlayer({
  feedUrl,
  title,
  host,
  subscribeLinks = [],
  maxEpisodes = 5,
  framed = false,
}) {
  const [show, setShow]         = useState(null)
  const [episodes, setEpisodes] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)

  const [activeGuid, setActiveGuid] = useState(null)
  const [playing, setPlaying]       = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration]     = useState(0)
  const [expanded, setExpanded]     = useState(null)
  const [showAll, setShowAll]       = useState(false)

  const audioRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    const qs = feedUrl ? `?feed=${encodeURIComponent(feedUrl)}` : ''
    fetch(`/api/podcast-feed${qs}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.error) throw new Error(data.error)
        setShow(data.show || null)
        setEpisodes(Array.isArray(data.episodes) ? data.episodes : [])
        setLoading(false)
      })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false) } })
    return () => { cancelled = true }
  }, [feedUrl])

  const active = episodes.find(e => e.guid === activeGuid) || null

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      setCurrentTime(audio.currentTime)
      setDuration(audio.duration || 0)
    }
    const onEnd = () => setPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
    }
  }, [activeGuid])

  const playEpisode = (ep) => {
    const audio = audioRef.current
    if (!audio) return
    if (ep.guid === activeGuid) {
      if (playing) { audio.pause(); setPlaying(false) }
      else { audio.play().then(() => setPlaying(true)).catch(() => {}) }
      return
    }
    setActiveGuid(ep.guid)
    setCurrentTime(0)
    setDuration(0)
    audio.src = ep.audioUrl
    audio.play().then(() => setPlaying(true)).catch(() => {})
  }

  const toggleActive = () => { if (active) playEpisode(active) }

  const seek = (e) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration
  }

  const heading = title || show?.title || 'Podcast'
  const visible = showAll ? episodes : episodes.slice(0, maxEpisodes)
  const progress = active && duration ? (currentTime / duration) * 100 : 0

  // ── Sub-renders ──────────────────────────────────────────────────────────

  const Header = (
    <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
      <div style={{
        width: '86px', height: '86px', flexShrink: 0, borderRadius: '8px',
        border: `2px solid ${gold}`, background: parch,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 0 2px ${parch}, 0 0 0 3px rgba(76,107,69,0.3)`,
        overflow: 'hidden',
      }}>
        {show?.image
          ? <img src={show.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <MicGlyph />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...serif, fontWeight: 600, fontSize: '27px', lineHeight: 1.15, color: dark }}>
          {heading}
        </div>
        {host && (
          <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.6)', marginTop: '3px' }}>
            {host}
          </div>
        )}
        {subscribeLinks.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '11px', flexWrap: 'wrap' }}>
            {subscribeLinks.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em', color: gold,
                  textDecoration: 'none', border: '1px solid rgba(76,107,69,0.5)',
                  borderRadius: '30px', padding: '3px 13px' }}>
                {l.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const NowPlaying = active && (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px',
      marginTop: '20px', padding: '13px 16px', borderRadius: '10px',
      background: 'rgba(76,107,69,0.06)', border: `1px solid ${hair}` }}>
      <button onClick={toggleActive} aria-label={playing ? 'Pause' : 'Play'}
        style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '50%',
          border: `1.5px solid rgba(76,107,69,0.6)`, background: parch,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        {playing ? <PauseGlyph /> : <PlayGlyph />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...serif, fontWeight: 600, fontSize: '17px', color: dark,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {active.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
          <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
            fontVariantNumeric: 'tabular-nums', minWidth: '34px' }}>{fmtTime(currentTime)}</span>
          <div onClick={seek} style={{ flex: 1, height: '4px', borderRadius: '4px',
            background: 'rgba(76,107,69,0.2)', cursor: 'pointer', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${progress}%`, background: gold, borderRadius: '4px' }} />
          </div>
          <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
            fontVariantNumeric: 'tabular-nums', minWidth: '34px' }}>{fmtTime(duration)}</span>
        </div>
      </div>
    </div>
  )

  const EpisodeList = (
    <div style={{ marginTop: '20px' }}>
      {visible.map((ep) => {
        const isActive = ep.guid === activeGuid
        const isOpen = expanded === ep.guid
        return (
          <div key={ep.guid} style={{ borderBottom: `1px solid rgba(76,107,69,0.15)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 0' }}>
              <button onClick={() => playEpisode(ep)} aria-label={isActive && playing ? 'Pause' : 'Play'}
                style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '50%',
                  border: `1px solid ${isActive ? 'rgba(76,107,69,0.78)' : 'rgba(76,107,69,0.45)'}`,
                  background: isActive ? 'rgba(76,107,69,0.12)' : parch,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {isActive && playing ? <PauseGlyph /> : <PlayGlyph />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...serif, fontWeight: 600, fontSize: '19px', lineHeight: 1.2, color: dark }}>
                  {ep.title}
                </div>
                <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '2px' }}>
                  {[fmtDate(ep.pubDate), ep.duration].filter(Boolean).join(' · ')}
                </div>
              </div>
              {ep.description && (
                <button onClick={() => setExpanded(isOpen ? null : ep.guid)}
                  aria-label={isOpen ? 'Hide description' : 'Show description'}
                  style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                    color: gold, fontSize: '18px', lineHeight: 1, padding: '6px',
                    transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                  ⌄
                </button>
              )}
            </div>
            {isOpen && ep.description && (
              <div style={{ ...body, fontSize: '15px', lineHeight: 1.7,
                color: 'rgba(15,21,35,0.72)', padding: '0 0 18px 51px' }}>
                {ep.description}
              </div>
            )}
          </div>
        )
      })}
      {!showAll && episodes.length > maxEpisodes && (
        <button onClick={() => setShowAll(true)}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '16px 0 4px', display: 'block' }}>
          Show all {episodes.length} episodes
        </button>
      )}
    </div>
  )

  // ── Body ─────────────────────────────────────────────────────────────────

  let content
  if (loading) {
    content = (
      <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>
        Loading episodes…
      </div>
    )
  } else if (error || (!episodes.length && !subscribeLinks.length)) {
    // Hard failure with nothing to show — render nothing rather than an error.
    return null
  } else {
    content = (
      <>
        {Header}
        {NowPlaying}
        {episodes.length > 0 && EpisodeList}
        <audio ref={audioRef} preload="none" />
      </>
    )
  }

  if (framed) {
    return (
      <div style={{ background: parch, border: `1.5px solid ${gold}`, borderRadius: '14px',
        padding: '26px' }}>
        {content}
      </div>
    )
  }

  return content
}

export default PodcastPlayer
