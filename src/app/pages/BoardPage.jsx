// src/app/pages/BoardPage.jsx
//
// BP-16 · The board — one per domain, three time-layers:
//   • reality  — present reality (private).
//   • horizon  — the dreamed images (the Pinterest layer). Aspiration may be
//                dreamed; add images (by URL in v1) and captions freely.
//   • path     — the earned layer. It CANNOT be added to — it renders from
//                your real witnessed steps (your moments in this domain).
//                Aspiration may be dreamed; the path must be earned.
//
// Field Notes rail. Routes: /boards (domain picker) and /boards/:domain.
// NOTE: v1 accepts dreamed images by URL. File upload to the horizon layer
// (BP-2 storage) is a later enhancement.

import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { fn, space } from '../../lib/designTokens'
import { CIV_DOMAINS } from '../constants/domains'
import { momentImageUrl } from '../../lib/momentCapture'
import { ensureBoard, getBoardItems, addBoardItem, removeBoardItem, getPathSteps } from '../lib/trails'

const display = { fontFamily: "'Fraunces', Georgia, serif" }
const body    = { fontFamily: "'Newsreader', Georgia, serif" }
const mono    = { fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }

const DOMAIN_NAME = Object.fromEntries(CIV_DOMAINS.map(d => [d.slug, d.name]))

export default function BoardPage() {
  const { domain } = useParams()
  const { user } = useAuth()

  if (user === null) {
    return <Shell><Link to="/login?redirect=/boards" style={{ color: fn.moss }}>Sign in →</Link></Shell>
  }
  if (!domain) return <DomainPicker />
  return <Board domain={domain} userId={user?.id} />
}

function DomainPicker() {
  return (
    <Shell>
      <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.20em', textTransform: 'uppercase', color: fn.ghost, marginBottom: space.md }}>Your boards</div>
      <h1 style={{ ...display, fontWeight: 400, fontSize: 'clamp(28px, 6vw, 40px)', color: fn.ink, lineHeight: 1.2, margin: `0 0 ${space.lg}` }}>
        Pick a domain to open its board.
      </h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: space.sm }}>
        {CIV_DOMAINS.map(d => (
          <Link key={d.slug} to={`/boards/${d.slug}`}
            style={{ ...mono, fontSize: '14px', letterSpacing: '0.06em', textDecoration: 'none', color: fn.ink,
              background: fn.object, border: `1px solid ${fn.mossEdge}`, borderRadius: '20px', padding: '9px 16px' }}>
            {d.name}
          </Link>
        ))}
      </div>
    </Shell>
  )
}

function Board({ domain }) {
  const [boardId, setBoardId] = useState(null)
  const [items, setItems] = useState([])
  const [path, setPath] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const b = await ensureBoard(domain)
      setBoardId(b.id)
      const [its, ps] = await Promise.all([getBoardItems(b.id), getPathSteps(domain)])
      setItems(its); setPath(ps)
    } catch (_) { /* surfaced as empty */ }
    setLoading(false)
  }, [domain])
  useEffect(() => { load() }, [load])

  const reality = items.filter(i => i.layer === 'reality')
  const horizon = items.filter(i => i.layer === 'horizon')

  return (
    <Shell>
      <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: fn.moss, marginBottom: '6px' }}>
        Board · {DOMAIN_NAME[domain] || domain}
      </div>
      <h1 style={{ ...display, fontWeight: 400, fontSize: 'clamp(26px, 5vw, 36px)', color: fn.ink, lineHeight: 1.2, margin: `0 0 ${space.xl}` }}>
        Reality · the horizon · the path
      </h1>
      {loading && <p style={{ ...body, color: fn.meta }}>Loading…</p>}

      {!loading && boardId && (
        <>
          <Layer title="Present reality" hint="Private. Where things actually stand."
            boardId={boardId} layer="reality" items={reality} onChanged={load} />
          <Layer title="The horizon" hint="The dreamed images. Aspiration may be dreamed."
            boardId={boardId} layer="horizon" items={horizon} onChanged={load} />
          <PathLayer path={path} />
        </>
      )}
    </Shell>
  )
}

function Layer({ title, hint, boardId, layer, items, onChanged }) {
  const [caption, setCaption] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!caption.trim() && !imageUrl.trim()) return
    setBusy(true)
    try { await addBoardItem(boardId, layer, { caption: caption.trim() || null, imageUrl: imageUrl.trim() || null }); setCaption(''); setImageUrl(''); onChanged() }
    catch (e) { alert(e.message) } finally { setBusy(false) }
  }

  return (
    <section style={{ marginTop: space.xxl }}>
      <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: fn.ghost }}>{title}</div>
      <p style={{ ...body, fontSize: '14px', color: fn.ghost, margin: `2px 0 ${space.md}` }}>{hint}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: space.md, marginBottom: space.md }}>
        {items.map(it => (
          <div key={it.id} style={{ background: fn.object, border: `1px solid ${fn.mossEdge}`, borderRadius: '10px', overflow: 'hidden' }}>
            {it.image_url && <img src={it.image_url} alt="" style={{ width: '100%', display: 'block', aspectRatio: '1 / 1', objectFit: 'cover' }} />}
            {it.caption && <div style={{ ...body, fontSize: '14px', color: fn.ink, padding: '10px 12px', lineHeight: 1.45 }}>{it.caption}</div>}
            <button type="button" onClick={async () => { await removeBoardItem(it.id); onChanged() }}
              style={{ ...mono, fontSize: '13px', color: fn.ghost, background: 'none', border: 'none', cursor: 'pointer', padding: '0 12px 10px' }}>remove</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
        <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="A caption"
          style={{ ...body, fontSize: '15px', color: fn.ink, flex: '1 1 160px', background: fn.ground, border: `1px solid ${fn.mossEdge}`, borderRadius: '9px', padding: '9px 12px', outline: 'none' }} />
        <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Image URL (optional)"
          style={{ ...body, fontSize: '15px', color: fn.ink, flex: '1 1 160px', background: fn.ground, border: `1px solid ${fn.mossEdge}`, borderRadius: '9px', padding: '9px 12px', outline: 'none' }} />
        <button type="button" onClick={add} disabled={busy} style={{ ...mono, fontSize: '14px', letterSpacing: '0.10em', background: fn.moss, color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 18px', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>Add</button>
      </div>
    </section>
  )
}

function PathLayer({ path }) {
  return (
    <section style={{ marginTop: space.xxl }}>
      <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: fn.moss }}>The path</div>
      <p style={{ ...body, fontSize: '14px', color: fn.ghost, margin: `2px 0 ${space.md}` }}>
        Earned, not dreamed. This fills only from your real witnessed steps · it cannot be uploaded to.
      </p>
      {path.length === 0 ? (
        <p style={{ ...body, fontSize: '15px', color: fn.ghost }}>Nothing walked yet. Each real moment in this domain lands here.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: space.md }}>
          {path.map(m => {
            const img = m.image_path ? momentImageUrl(m.thumb_path || m.image_path) : null
            return (
              <div key={m.id} style={{ background: fn.object, border: `1px solid ${fn.mossEdge}`, borderRadius: '10px', overflow: 'hidden' }}>
                {img && <img src={img} alt="" style={{ width: '100%', display: 'block', aspectRatio: '1 / 1', objectFit: 'cover' }} />}
                {m.line && <div style={{ ...body, fontStyle: 'italic', fontSize: '14px', color: fn.ink, padding: '10px 12px', lineHeight: 1.45 }}>&ldquo;{m.line}&rdquo;</div>}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100dvh', background: fn.ground }}>
      <Nav />
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: 'clamp(72px, 12vw, 120px) clamp(20px, 5vw, 40px) 100px' }}>
        {children}
      </div>
    </div>
  )
}
