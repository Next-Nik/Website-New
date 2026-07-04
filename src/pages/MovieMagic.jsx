// src/pages/MovieMagic.jsx
//
// Movie Magic — hidden, founder-only screenwriting workspace.
// First tool: the Structure Wall.
// Sticky-note walls for Syd Field's paradigm (story boards) and
// character journey frameworks (Hero's / Heroine's / Villain's /
// Virgin's Promise / Flat / Corruption / custom).
//
// Route is unlinked from all navigation. UI gate mirrors the
// AdminConsole founder check (tolerant of either metadata source);
// real enforcement is RLS in sql/163_movie_magic.sql (app_metadata only).
//
// Persistence: one jsonb row per user in public.movie_magic, saved
// debounced, last-write-wins. Works from any signed-in founder
// device: iMac, iPad, Pixel.
//
// Includes an Inbox per story: quick capture from the phone,
// transfer into Beat (the screenwriting app) at the desk.

import { useState, useEffect, useRef, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'

/* ── constants ────────────────────────────────────────────── */

const NOTE_COLORS = [
  { id: 'canary', hex: '#FEF3A2' },
  { id: 'pink', hex: '#FFC9DC' },
  { id: 'mint', hex: '#BDEBD6' },
  { id: 'sky', hex: '#BFDDFF' },
  { id: 'peach', hex: '#FFD9A8' },
  { id: 'lavender', hex: '#E5CFFF' },
]

const SYD_FIELD_LANES = [
  { name: 'Act I · Setup', type: 'act', hint: 'World, characters, dramatic premise' },
  { name: 'Plot Point I', type: 'hinge', hint: 'The event that spins us into Act II' },
  { name: 'Act II · Confrontation (1st half)', type: 'act', hint: 'Obstacles rise, stakes compound' },
  { name: 'Midpoint', type: 'hinge', hint: 'Reversal / point of no return' },
  { name: 'Act II · Confrontation (2nd half)', type: 'act', hint: 'Pressure tightens toward crisis' },
  { name: 'Plot Point II', type: 'hinge', hint: 'The event that spins us into Act III' },
  { name: 'Act III · Resolution', type: 'act', hint: 'Crisis, climax, resolution' },
]

const FRAMEWORKS = {
  hero: {
    label: "Hero's Journey",
    credit: 'Campbell / Vogler · 12 stages',
    blurb: "The classic monomyth in Vogler's screenwriting form.",
    lanes: [
      'Ordinary World', 'Call to Adventure', 'Refusal of the Call',
      'Meeting the Mentor', 'Crossing the First Threshold', 'Tests, Allies, Enemies',
      'Approach to the Inmost Cave', 'The Ordeal', 'Reward (Seizing the Sword)',
      'The Road Back', 'Resurrection', 'Return with the Elixir',
    ],
  },
  heroine: {
    label: "Heroine's Journey",
    credit: 'Maureen Murdock · 10 stages',
    blurb: 'Wholeness and integration rather than external conquest.',
    lanes: [
      'Separation from the Feminine', 'Identification with the Masculine',
      'The Road of Trials', 'Finding the Boon of Success',
      'Awakening: Spiritual Aridity', 'Initiation & Descent to the Goddess',
      'Yearning to Reconnect with the Feminine', 'Healing the Mother/Daughter Split',
      'Healing the Wounded Masculine', 'Integration of Masculine & Feminine',
    ],
  },
  villain: {
    label: "Villain's Journey",
    credit: 'Working framework (ours) · 12 stages',
    blurb: 'Drafted to mirror Vogler stage-for-stage so hero and villain sit side by side. Revise freely. This one is ours to shape.',
    lanes: [
      'The Wound', 'The Justification', 'Refusal of Conscience',
      'Meeting the Corruptor', 'Crossing into Transgression', 'Consolidation of Power',
      'The False Throne', 'The Mirror Moment', 'Doubling Down',
      'The Unmasking', 'The Fall (or Redemption Fork)', 'The Legacy',
    ],
  },
  virgin: {
    label: "Virgin's Promise",
    credit: 'Kim Hudson · 13 stages',
    blurb: 'The other major feminine arc: creative self-realization inside a dependent world.',
    lanes: [
      'Dependent World', 'Price of Conformity', 'Opportunity to Shine',
      'Dresses the Part', 'Secret World', 'No Longer Fits Her World',
      'Caught Shining', 'Gives Up What Kept Her Stuck', 'Kingdom in Chaos',
      'Wanders in the Wilderness', 'Chooses Her Light', 'Re-ordering (Rescue)',
      'The Kingdom is Brighter',
    ],
  },
  flat: {
    label: 'Flat Arc',
    credit: 'after K.M. Weiland · 5 stages',
    blurb: 'The character already holds the truth; the world around them changes.',
    lanes: [
      'Believes the Truth', 'Enters a World Built on a Lie', 'Truth Is Tested',
      'Holds the Truth Under Fire', 'Transforms the World',
    ],
  },
  corruption: {
    label: 'Corruption Arc',
    credit: 'negative change arc · 5 stages',
    blurb: 'A good start, a bad end. Useful for characters who fall across a whole saga.',
    lanes: [
      'Believes a Lie', 'Glimpses the Truth', 'Rejects the Truth',
      'Embraces a Worse Lie', 'Destroyed by the Lie',
    ],
  },
  custom: {
    label: 'Custom stages',
    credit: 'You define the lanes',
    blurb: 'Name your own stages, one per line.',
    lanes: [],
  },
}

/* ── helpers ──────────────────────────────────────────────── */

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)

const tiltFor = (id) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997
  return ((h % 5) - 2) * 0.7
}

// UI gate — identical spirit to AdminConsole: tolerant of either
// metadata source so the founder can't be locked out. RLS is the
// real wall and trusts app_metadata only.
const isFounder = (user) =>
  user?.app_metadata?.role === 'founder' || user?.user_metadata?.role === 'founder'

const makeStoryBoard = (projectId, name) => ({
  id: uid(),
  projectId,
  name,
  kind: 'story',
  laneNotes: SYD_FIELD_LANES.map(() => []),
})

const makeCharacterBoard = (projectId, name, frameworkKey, customLanes) => {
  const lanes = frameworkKey === 'custom' ? customLanes : FRAMEWORKS[frameworkKey].lanes
  return {
    id: uid(),
    projectId,
    name,
    kind: 'character',
    framework: frameworkKey,
    customLanes: frameworkKey === 'custom' ? customLanes : null,
    laneNotes: lanes.map(() => []),
  }
}

const seedState = () => {
  const projectId = uid()
  const boards = ['Trilogy Arc', 'Episode I', 'Episode II', 'Episode III'].map((n) =>
    makeStoryBoard(projectId, n)
  )
  boards[0].laneNotes[0].push({
    id: uid(),
    title: 'Drag me by the ⠿ grip',
    detail: 'Tap a note to edit, recolour, move, or delete it. Use + at the top of any column to pin a new beat.',
    color: 'canary',
  })
  return {
    projects: [{ id: projectId, name: 'Golden Jedi', inbox: [] }],
    boards,
    activeProjectId: projectId,
    activeBoardId: boards[0].id,
  }
}

const lanesForBoard = (board) => {
  if (board.kind === 'story') return SYD_FIELD_LANES
  const names = board.framework === 'custom' ? board.customLanes : FRAMEWORKS[board.framework].lanes
  return names.map((n) => ({ name: n, type: 'act', hint: '' }))
}

/* ── .fountain export ─────────────────────────────────────────
   Turns a board into a Fountain outline: lanes become sections
   (#), beat titles become synopses (=), details become notes
   ([[ ]]). Beat and DubScript read all three into their outline
   views, so an exported wall opens as the skeleton of a draft. */

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled'

const buildFountain = (projectName, board) => {
  const lanes = lanesForBoard(board)
  const today = new Date().toISOString().slice(0, 10)
  const lines = [
    `Title: ${board.name}`,
    `Source: ${projectName}`,
    `Credit: Structure Wall export`,
    `Draft date: ${today}`,
    '',
  ]
  lanes.forEach((lane, i) => {
    lines.push(`# ${lane.name}`)
    lines.push('')
    for (const note of board.laneNotes[i]) {
      lines.push(`= ${(note.title || 'Untitled beat').replace(/\n+/g, ' ')}`)
      if (note.detail) lines.push(`[[${note.detail.replace(/\n+/g, ' ')}]]`)
      lines.push('')
    }
  })
  return lines.join('\n')
}

const downloadFountain = (projectName, board) => {
  const blob = new Blob([buildFountain(projectName, board)], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slugify(projectName)}-${slugify(board.name)}.fountain`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ── page ─────────────────────────────────────────────────── */

export function MovieMagicPage() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading || user === undefined) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.loadingTape}>PINNING UP THE WALL…</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (!isFounder(user)) return <Navigate to="/" replace />

  return <MovieMagicWorkspace user={user} />
}

export default MovieMagicPage

function MovieMagicWorkspace({ user }) {
  const [state, setState] = useState(null)
  const [syncStatus, setSyncStatus] = useState('synced') // synced | syncing | error
  const [editor, setEditor] = useState(null)
  const [newBoardOpen, setNewBoardOpen] = useState(false)
  const [nameModal, setNameModal] = useState(null)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [drag, setDrag] = useState(null)
  const saveTimer = useRef(null)
  const loaded = useRef(false)

  /* load */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('movie_magic')
        .select('state')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      let next = null
      if (!error && data && data.state && data.state.projects) next = data.state
      if (!next) {
        next = seedState()
        await supabase.from('movie_magic').upsert({
          user_id: user.id,
          state: next,
          updated_at: new Date().toISOString(),
        })
      }
      loaded.current = true
      setState(next)
    })()
    return () => { cancelled = true }
  }, [user.id])

  /* save (debounced) */
  useEffect(() => {
    if (!state || !loaded.current) return
    setSyncStatus('syncing')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase.from('movie_magic').upsert({
        user_id: user.id,
        state,
        updated_at: new Date().toISOString(),
      })
      setSyncStatus(error ? 'error' : 'synced')
    }, 600)
    return () => saveTimer.current && clearTimeout(saveTimer.current)
  }, [state, user.id])

  /* derived */
  const project = state && state.projects.find((p) => p.id === state.activeProjectId)
  const projectBoards = state ? state.boards.filter((b) => b.projectId === state.activeProjectId) : []
  const board = state && state.boards.find((b) => b.id === state.activeBoardId)
  const inboxCount = project && project.inbox ? project.inbox.length : 0

  /* mutations */
  const patchBoard = useCallback((boardId, fn) => {
    setState((s) => ({ ...s, boards: s.boards.map((b) => (b.id === boardId ? fn(b) : b)) }))
  }, [])

  const patchProject = useCallback((projectId, fn) => {
    setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === projectId ? fn(p) : p)) }))
  }, [])

  const saveNote = (boardId, laneIdx, noteId, values) => {
    patchBoard(boardId, (b) => {
      const laneNotes = b.laneNotes.map((l) => l.slice())
      if (noteId) {
        let note = null
        for (const lane of laneNotes) {
          const i = lane.findIndex((n) => n.id === noteId)
          if (i >= 0) { note = { ...lane[i], ...values }; lane.splice(i, 1); break }
        }
        if (note) laneNotes[values.laneIdx ?? laneIdx].push(note)
      } else {
        laneNotes[values.laneIdx ?? laneIdx].push({
          id: uid(), title: values.title, detail: values.detail, color: values.color,
        })
      }
      return { ...b, laneNotes }
    })
  }

  const deleteNote = (boardId, noteId) => {
    patchBoard(boardId, (b) => ({
      ...b,
      laneNotes: b.laneNotes.map((l) => l.filter((n) => n.id !== noteId)),
    }))
  }

  const moveNote = (boardId, noteId, toLane, toIndex) => {
    patchBoard(boardId, (b) => {
      const laneNotes = b.laneNotes.map((l) => l.slice())
      let note = null
      for (const lane of laneNotes) {
        const i = lane.findIndex((n) => n.id === noteId)
        if (i >= 0) { note = lane[i]; lane.splice(i, 1); break }
      }
      if (!note) return b
      const target = laneNotes[toLane]
      target.splice(Math.max(0, Math.min(toIndex, target.length)), 0, note)
      return { ...b, laneNotes }
    })
  }

  const addProject = (name) => {
    setState((s) => {
      const p = { id: uid(), name, inbox: [] }
      const boards = ['Trilogy Arc', 'Episode I', 'Episode II', 'Episode III'].map((n) =>
        makeStoryBoard(p.id, n)
      )
      return {
        ...s,
        projects: [...s.projects, p],
        boards: [...s.boards, ...boards],
        activeProjectId: p.id,
        activeBoardId: boards[0].id,
      }
    })
  }

  const deleteProject = (projectId) => {
    setState((s) => {
      if (s.projects.length <= 1) return s
      const projects = s.projects.filter((p) => p.id !== projectId)
      const boards = s.boards.filter((b) => b.projectId !== projectId)
      const nextProject = projects[0]
      const nextBoard = boards.find((b) => b.projectId === nextProject.id)
      return { ...s, projects, boards, activeProjectId: nextProject.id, activeBoardId: nextBoard ? nextBoard.id : null }
    })
  }

  const addBoard = ({ kind, name, framework, customLanes }) => {
    setState((s) => {
      const b = kind === 'story'
        ? makeStoryBoard(s.activeProjectId, name)
        : makeCharacterBoard(s.activeProjectId, name, framework, customLanes)
      return { ...s, boards: [...s.boards, b], activeBoardId: b.id }
    })
  }

  const renameBoard = (boardId, name) => patchBoard(boardId, (b) => ({ ...b, name }))

  const removeBoard = (boardId) => {
    setState((s) => {
      const boards = s.boards.filter((b) => b.id !== boardId)
      const sibling = boards.find((b) => b.projectId === s.activeProjectId)
      return {
        ...s,
        boards,
        activeBoardId: s.activeBoardId === boardId ? (sibling ? sibling.id : null) : s.activeBoardId,
      }
    })
  }

  /* inbox */
  const addInboxItem = (text) => {
    patchProject(project.id, (p) => ({
      ...p,
      inbox: [{ id: uid(), text, ts: Date.now() }, ...(p.inbox || [])],
    }))
  }
  const deleteInboxItem = (itemId) => {
    patchProject(project.id, (p) => ({ ...p, inbox: (p.inbox || []).filter((i) => i.id !== itemId) }))
  }

  /* drag & drop (pointer-based, touch friendly) */
  const onGripDown = (e, boardId, laneIdx, note) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ noteId: note.id, boardId, fromLane: laneIdx, x: e.clientX, y: e.clientY, note })
  }
  const onGripMove = (e) => {
    setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d))
  }
  const onGripUp = (e) => {
    if (!drag) return
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const laneEl = el && el.closest ? el.closest('[data-lane-idx]') : null
    if (laneEl) {
      const toLane = parseInt(laneEl.getAttribute('data-lane-idx'), 10)
      const cards = Array.from(laneEl.querySelectorAll('[data-note-id]')).filter(
        (c) => c.getAttribute('data-note-id') !== drag.noteId
      )
      let toIndex = cards.length
      for (let i = 0; i < cards.length; i++) {
        const r = cards[i].getBoundingClientRect()
        if (e.clientY < r.top + r.height / 2) { toIndex = i; break }
      }
      moveNote(drag.boardId, drag.noteId, toLane, toIndex)
    }
    setDrag(null)
  }

  if (!state) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.loadingTape}>PINNING UP THE WALL…</div>
      </div>
    )
  }

  return (
    <div style={S.app}>
      <style>{CSS_TEXT}</style>

      <header style={S.topbar}>
        <div style={S.brand}>
          <span style={S.brandMark}>▤</span>
          <span>Movie Magic</span><span style={{ fontWeight: 500, opacity: 0.72 }}>· Structure Wall</span>
          <span className={'mm-sync ' + syncStatus}>
            {syncStatus === 'synced' ? '● synced' : syncStatus === 'syncing' ? '○ syncing…' : '● offline · will retry'}
          </span>
        </div>

        <div style={S.projectRow}>
          <select
            className="mm-select"
            value={state.activeProjectId}
            onChange={(e) => {
              const pid = e.target.value
              setState((s) => {
                const first = s.boards.find((b) => b.projectId === pid)
                return { ...s, activeProjectId: pid, activeBoardId: first ? first.id : null }
              })
            }}
          >
            {state.projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button className="mm-btn ghost" onClick={() => setInboxOpen(true)}>
            Inbox{inboxCount ? ` (${inboxCount})` : ''}
          </button>
          <button className="mm-btn ghost" onClick={() => setNameModal({ kind: 'project' })}>+ Story</button>
          {state.projects.length > 1 && (
            <button
              className="mm-btn ghost danger"
              onClick={() => {
                if (window.confirm(`Delete the whole story "${project.name}" and all its boards?`)) deleteProject(project.id)
              }}
            >
              Delete story
            </button>
          )}
        </div>
      </header>

      <nav style={S.tabRow}>
        {projectBoards.map((b) => (
          <button
            key={b.id}
            className={'mm-tab' + (b.id === state.activeBoardId ? ' active' : '') + (b.kind === 'character' ? ' character' : '')}
            onClick={() => setState((s) => ({ ...s, activeBoardId: b.id }))}
          >
            {b.kind === 'character' ? '◐ ' : ''}{b.name}
          </button>
        ))}
        <button className="mm-tab new" onClick={() => setNewBoardOpen(true)}>+ New board</button>
      </nav>

      {board ? (
        <BoardView
          board={board}
          projectName={project ? project.name : ''}
          drag={drag}
          onAddNote={(laneIdx) => setEditor({ boardId: board.id, laneIdx, noteId: null })}
          onEditNote={(laneIdx, noteId) => setEditor({ boardId: board.id, laneIdx, noteId })}
          onGripDown={onGripDown}
          onGripMove={onGripMove}
          onGripUp={onGripUp}
          onRename={() => setNameModal({ kind: 'renameBoard', boardId: board.id })}
          onDelete={() => {
            if (window.confirm(`Take down the board "${board.name}"? Its notes go with it.`)) removeBoard(board.id)
          }}
        />
      ) : (
        <div style={S.emptyBoard}>No boards in this story yet · add one above.</div>
      )}

      {drag && (
        <div
          style={{
            ...S.ghost,
            left: drag.x - 90,
            top: drag.y - 24,
            background: (NOTE_COLORS.find((c) => c.id === drag.note.color) || NOTE_COLORS[0]).hex,
          }}
        >
          {drag.note.title || 'Untitled beat'}
        </div>
      )}

      {editor && (
        <NoteEditor
          board={state.boards.find((b) => b.id === editor.boardId)}
          laneIdx={editor.laneIdx}
          noteId={editor.noteId}
          onClose={() => setEditor(null)}
          onSave={(values) => { saveNote(editor.boardId, editor.laneIdx, editor.noteId, values); setEditor(null) }}
          onDelete={() => { deleteNote(editor.boardId, editor.noteId); setEditor(null) }}
        />
      )}

      {newBoardOpen && (
        <NewBoardModal
          onClose={() => setNewBoardOpen(false)}
          onCreate={(payload) => { addBoard(payload); setNewBoardOpen(false) }}
        />
      )}

      {nameModal && (
        <NameModal
          title={nameModal.kind === 'project' ? 'New story' : 'Rename board'}
          placeholder={nameModal.kind === 'project' ? 'e.g. Golden Jedi' : 'Board name'}
          initial={nameModal.kind === 'renameBoard' ? state.boards.find((b) => b.id === nameModal.boardId)?.name : ''}
          submitLabel={nameModal.kind === 'project' ? 'Create story' : 'Rename'}
          onClose={() => setNameModal(null)}
          onSubmit={(name) => {
            if (nameModal.kind === 'project') addProject(name)
            else renameBoard(nameModal.boardId, name)
            setNameModal(null)
          }}
        />
      )}

      {inboxOpen && (
        <InboxModal
          project={project}
          onAdd={addInboxItem}
          onDelete={deleteInboxItem}
          onClose={() => setInboxOpen(false)}
        />
      )}
    </div>
  )
}

/* ── board view ───────────────────────────────────────────── */

function BoardView({ board, projectName, drag, onAddNote, onEditNote, onGripDown, onGripMove, onGripUp, onRename, onDelete }) {
  const lanes = lanesForBoard(board)
  const frameworkMeta = board.kind === 'character' ? FRAMEWORKS[board.framework] : null

  return (
    <main style={S.boardWrap}>
      <div style={S.boardHeader}>
        <div>
          <h1 style={S.boardTitle}>{board.name}</h1>
          <div style={S.boardSub}>
            {board.kind === 'story'
              ? 'Syd Field paradigm · acts wide, hinges narrow'
              : `${frameworkMeta ? frameworkMeta.label : 'Custom'} · ${frameworkMeta ? frameworkMeta.credit : 'your stages'}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="mm-btn ghost" onClick={() => downloadFountain(projectName, board)}>Export .fountain</button>
          <button className="mm-btn ghost" onClick={onRename}>Rename</button>
          <button className="mm-btn ghost danger" onClick={onDelete}>Take down</button>
        </div>
      </div>

      <div style={S.wall} className="mm-wall">
        {lanes.map((lane, i) => (
          <section
            key={i}
            data-lane-idx={i}
            className={'mm-lane ' + lane.type + (drag ? ' droppable' : '')}
          >
            <div className={'mm-tape ' + lane.type}>
              <span>{lane.name}</span>
              <span className="mm-tape-count">{board.laneNotes[i].length}</span>
            </div>
            {lane.hint && <div className="mm-hint">{lane.hint}</div>}
            <button className="mm-add" onClick={() => onAddNote(i)}>+ beat</button>

            <div className="mm-lane-notes">
              {board.laneNotes[i].map((note) => (
                <StickyNote
                  key={note.id}
                  note={note}
                  dim={drag && drag.noteId === note.id}
                  onOpen={() => onEditNote(i, note.id)}
                  onGripDown={(e) => onGripDown(e, board.id, i, note)}
                  onGripMove={onGripMove}
                  onGripUp={onGripUp}
                />
              ))}
              {board.laneNotes[i].length === 0 && <div className="mm-empty">empty</div>}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}

function StickyNote({ note, dim, onOpen, onGripDown, onGripMove, onGripUp }) {
  const color = (NOTE_COLORS.find((c) => c.id === note.color) || NOTE_COLORS[0]).hex
  return (
    <div
      data-note-id={note.id}
      className="mm-note"
      style={{ background: color, transform: `rotate(${tiltFor(note.id)}deg)`, opacity: dim ? 0.35 : 1 }}
      onClick={onOpen}
    >
      <div
        className="mm-grip"
        onPointerDown={onGripDown}
        onPointerMove={onGripMove}
        onPointerUp={onGripUp}
        onClick={(e) => e.stopPropagation()}
        title="Drag to move"
      >
        ⠿
      </div>
      <div className="mm-note-title">{note.title || 'Untitled beat'}</div>
      {note.detail && <div className="mm-note-detail">{note.detail}</div>}
    </div>
  )
}

/* ── modals ───────────────────────────────────────────────── */

function ModalShell({ title, children, onClose }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHead}>
          <span style={S.modalTitle}>{title}</span>
          <button className="mm-btn ghost" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function NoteEditor({ board, laneIdx, noteId, onClose, onSave, onDelete }) {
  const lanes = lanesForBoard(board)
  const existing = noteId ? board.laneNotes.flat().find((n) => n.id === noteId) : null
  const [title, setTitle] = useState(existing ? existing.title : '')
  const [detail, setDetail] = useState(existing ? existing.detail || '' : '')
  const [color, setColor] = useState(existing ? existing.color : NOTE_COLORS[laneIdx % NOTE_COLORS.length].id)
  const [lane, setLane] = useState(laneIdx)

  return (
    <ModalShell title={noteId ? 'Edit beat' : 'New beat'} onClose={onClose}>
      <label className="mm-label">Beat</label>
      <input
        className="mm-input"
        autoFocus
        value={title}
        placeholder="What happens?"
        onChange={(e) => setTitle(e.target.value)}
      />

      <label className="mm-label">Notes (optional)</label>
      <textarea
        className="mm-input"
        rows={3}
        value={detail}
        placeholder="Why it matters, what it sets up, which thrust it serves…"
        onChange={(e) => setDetail(e.target.value)}
      />

      <label className="mm-label">Column</label>
      <select className="mm-select wide" value={lane} onChange={(e) => setLane(parseInt(e.target.value, 10))}>
        {lanes.map((l, i) => (
          <option key={i} value={i}>{l.name}</option>
        ))}
      </select>

      <label className="mm-label">Colour</label>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        {NOTE_COLORS.map((c) => (
          <button
            key={c.id}
            onClick={() => setColor(c.id)}
            aria-label={c.id}
            style={{
              width: 34, height: 34, borderRadius: 6, cursor: 'pointer',
              background: c.hex,
              border: color === c.id ? '3px solid #2F3E46' : '1px solid rgba(0,0,0,.25)',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {noteId ? (
          <button className="mm-btn ghost danger" onClick={onDelete}>Delete beat</button>
        ) : <span />}
        <button
          className="mm-btn primary"
          onClick={() => onSave({ title: title.trim() || 'Untitled beat', detail: detail.trim(), color, laneIdx: lane })}
        >
          Pin it
        </button>
      </div>
    </ModalShell>
  )
}

function NewBoardModal({ onClose, onCreate }) {
  const [kind, setKind] = useState('character')
  const [name, setName] = useState('')
  const [framework, setFramework] = useState('hero')
  const [customText, setCustomText] = useState('')

  const meta = FRAMEWORKS[framework]
  const canCreate =
    name.trim() &&
    (kind === 'story' || framework !== 'custom' || customText.split('\n').map((s) => s.trim()).filter(Boolean).length >= 2)

  return (
    <ModalShell title="New board" onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button className={'mm-btn toggle' + (kind === 'story' ? ' on' : '')} onClick={() => setKind('story')}>
          Story structure
        </button>
        <button className={'mm-btn toggle' + (kind === 'character' ? ' on' : '')} onClick={() => setKind('character')}>
          Character journey
        </button>
      </div>

      <label className="mm-label">{kind === 'story' ? 'Board name' : 'Character'}</label>
      <input
        className="mm-input"
        autoFocus
        value={name}
        placeholder={kind === 'story' ? 'e.g. Episode II · alt structure' : 'e.g. The Elder Brother'}
        onChange={(e) => setName(e.target.value)}
      />

      {kind === 'story' ? (
        <p className="mm-help">Story boards use Syd Field's paradigm: Setup · Plot Point I · Confrontation · Midpoint · Plot Point II · Resolution.</p>
      ) : (
        <>
          <label className="mm-label">Journey</label>
          <select className="mm-select wide" value={framework} onChange={(e) => setFramework(e.target.value)}>
            {Object.entries(FRAMEWORKS).map(([key, f]) => (
              <option key={key} value={key}>{f.label} · {f.credit}</option>
            ))}
          </select>
          <p className="mm-help">{meta.blurb}</p>
          {framework === 'custom' && (
            <>
              <label className="mm-label">Stages · one per line</label>
              <textarea
                className="mm-input"
                rows={5}
                value={customText}
                placeholder={'The Summons\nThe Bargain\nThe Price\n…'}
                onChange={(e) => setCustomText(e.target.value)}
              />
            </>
          )}
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button
          className="mm-btn primary"
          disabled={!canCreate}
          onClick={() =>
            onCreate({
              kind,
              name: name.trim(),
              framework,
              customLanes: customText.split('\n').map((s) => s.trim()).filter(Boolean),
            })
          }
        >
          Hang the board
        </button>
      </div>
    </ModalShell>
  )
}

function NameModal({ title, placeholder, initial, submitLabel, onClose, onSubmit }) {
  const [value, setValue] = useState(initial || '')
  return (
    <ModalShell title={title} onClose={onClose}>
      <input
        className="mm-input"
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onSubmit(value.trim()) }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="mm-btn primary" disabled={!value.trim()} onClick={() => onSubmit(value.trim())}>
          {submitLabel}
        </button>
      </div>
    </ModalShell>
  )
}

/* Quick capture from the phone. Items live per story until you
   transfer them into Beat (copy) or pin them on a board. */
function InboxModal({ project, onAdd, onDelete, onClose }) {
  const [text, setText] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const items = project.inbox || []

  const submit = () => {
    if (!text.trim()) return
    onAdd(text.trim())
    setText('')
  }

  const copy = async (item) => {
    try {
      await navigator.clipboard.writeText(item.text)
      setCopiedId(item.id)
      setTimeout(() => setCopiedId(null), 1200)
    } catch (e) { /* clipboard unavailable; user can select manually */ }
  }

  return (
    <ModalShell title={`Inbox · ${project.name}`} onClose={onClose}>
      <p className="mm-help">
        Catch ideas here from any device. Copy them out when you're back at Beat, or pin them onto a board.
      </p>
      <textarea
        className="mm-input"
        rows={3}
        autoFocus
        value={text}
        placeholder="A line, a beat, a fragment…"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="mm-btn primary" disabled={!text.trim()} onClick={submit}>Catch it</button>
      </div>

      {items.length === 0 && <p className="mm-help" style={{ opacity: 0.72 }}>Nothing waiting.</p>}
      {items.map((item) => (
        <div key={item.id} className="mm-inbox-item">
          <div className="mm-inbox-text">{item.text}</div>
          <div className="mm-inbox-meta">
            <span>{new Date(item.ts).toLocaleString()}</span>
            <span style={{ display: 'flex', gap: 6 }}>
              <button className="mm-btn ghost small" onClick={() => copy(item)}>
                {copiedId === item.id ? 'Copied ✓' : 'Copy'}
              </button>
              <button className="mm-btn ghost small danger" onClick={() => onDelete(item.id)}>Delete</button>
            </span>
          </div>
        </div>
      ))}
    </ModalShell>
  )
}

/* ── styles ───────────────────────────────────────────────── */

const NOTE_FONT = `'Chalkboard SE','Segoe Print','Bradley Hand',cursive`
const UI_FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`

const S = {
  app: { minHeight: '100dvh', background: '#2F3E46', fontFamily: UI_FONT, color: '#E7E2D6', display: 'flex', flexDirection: 'column' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '14px 18px 6px' },
  brand: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 700, letterSpacing: '.04em' },
  brandMark: { color: '#FEF3A2', fontSize: 22 },
  projectRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tabRow: { display: 'flex', gap: 6, padding: '8px 18px 0', flexWrap: 'wrap' },
  boardWrap: { flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 18px 24px', minHeight: 0 },
  boardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10, margin: '10px 2px 14px' },
  boardTitle: { margin: 0, fontFamily: NOTE_FONT, fontSize: 30, fontWeight: 400, color: '#F4EFDF' },
  boardSub: { fontSize: 13, opacity: 0.75, marginTop: 2, letterSpacing: '.05em', textTransform: 'uppercase' },
  wall: { display: 'flex', gap: 12, alignItems: 'stretch', overflowX: 'auto', paddingBottom: 12, flex: 1 },
  emptyBoard: { padding: 60, textAlign: 'center', opacity: 0.7 },
  ghost: {
    position: 'fixed', zIndex: 60, width: 180, padding: '10px 12px', borderRadius: 3,
    fontFamily: NOTE_FONT, fontSize: 14, color: '#333', boxShadow: '0 10px 24px rgba(0,0,0,.45)',
    pointerEvents: 'none', transform: 'rotate(-2deg)',
  },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(20,28,32,.66)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 },
  modal: { background: '#F4EFDF', color: '#2F3E46', borderRadius: 10, padding: '18px 20px 20px', width: 'min(460px, 94vw)', maxHeight: '88dvh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,.5)' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontFamily: NOTE_FONT, fontSize: 22 },
  loadingWrap: { minHeight: '100dvh', background: '#2F3E46', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingTape: {
    background: '#E9DFC5', color: '#4A4237', padding: '10px 26px', transform: 'rotate(-2deg)',
    fontFamily: UI_FONT, letterSpacing: '.18em', fontSize: 13, fontWeight: 700,
    boxShadow: '0 6px 18px rgba(0,0,0,.4)',
  },
}

const CSS_TEXT = `
  .mm-wall::-webkit-scrollbar { height: 10px; }
  .mm-wall::-webkit-scrollbar-thumb { background: rgba(255,255,255,.18); border-radius: 6px; }

  .mm-sync { font-size: 13px; font-weight: 500; letter-spacing: .08em; opacity: .7; margin-left: 6px; }
  .mm-sync.error { color: #FFB3A7; opacity: 1; }

  .mm-lane {
    display: flex; flex-direction: column; gap: 8px;
    background: rgba(255,255,255,.045);
    border-radius: 8px; padding: 10px 10px 14px;
    border: 1px solid rgba(255,255,255,.06);
  }
  .mm-lane.act   { flex: 2 1 0; min-width: 232px; }
  .mm-lane.hinge {
    flex: 1 1 0; min-width: 168px;
    background: rgba(254,243,162,.05);
    border: 1px dashed rgba(254,243,162,.35);
  }
  .mm-lane.droppable { outline: 2px dashed rgba(254,243,162,.55); outline-offset: -4px; }

  .mm-tape {
    align-self: center;
    background: #E9DFC5; color: #4A4237;
    padding: 5px 14px; transform: rotate(-1.2deg);
    font-size: 13px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    box-shadow: 0 3px 8px rgba(0,0,0,.35);
    display: flex; gap: 8px; align-items: center; text-align: center;
  }
  .mm-tape.hinge {
    transform: rotate(1.4deg);
    background: repeating-linear-gradient(45deg,#E9DFC5,#E9DFC5 9px,#D9C88F 9px,#D9C88F 18px);
  }
  .mm-tape-count {
    background: rgba(47,62,70,.16); border-radius: 999px;
    padding: 0 8px; font-size: 13px;
  }

  .mm-hint { font-size: 13px; opacity: .58; text-align: center; }

  .mm-add {
    border: 1px dashed rgba(255,255,255,.3); background: transparent; color: rgba(255,255,255,.75);
    border-radius: 6px; padding: 5px 0; cursor: pointer; font-size: 13px; font-family: inherit;
  }
  .mm-add:hover, .mm-add:focus-visible { background: rgba(255,255,255,.08); color: #fff; }

  .mm-lane-notes { display: flex; flex-direction: column; gap: 10px; min-height: 60px; flex: 1; }
  .mm-empty { text-align: center; opacity: .55; font-size: 13px; padding: 18px 0; }

  .mm-note {
    position: relative; border-radius: 3px; padding: 10px 12px 12px; cursor: pointer;
    color: #333; font-family: ${NOTE_FONT};
    box-shadow: 0 5px 10px rgba(0,0,0,.35), 0 1px 2px rgba(0,0,0,.3);
    transition: box-shadow .12s ease;
  }
  .mm-note:hover { box-shadow: 0 8px 18px rgba(0,0,0,.45), 0 1px 2px rgba(0,0,0,.3); }
  .mm-note-title { font-size: 15px; line-height: 1.28; padding-right: 22px; }
  .mm-note-detail { font-size: 13px; opacity: .8; margin-top: 6px; line-height: 1.35; font-family: ${UI_FONT}; }

  .mm-grip {
    position: absolute; top: 4px; right: 6px;
    font-size: 15px; color: rgba(0,0,0,.45); cursor: grab;
    touch-action: none; user-select: none; -webkit-user-select: none;
    padding: 3px 5px; border-radius: 4px;
  }
  .mm-grip:hover { background: rgba(0,0,0,.08); }
  .mm-grip:active { cursor: grabbing; }

  .mm-tab {
    border: none; border-radius: 6px 6px 0 0; padding: 8px 14px; cursor: pointer;
    background: rgba(255,255,255,.08); color: #E7E2D6; font-family: inherit; font-size: 13.5px;
  }
  .mm-tab.active { background: #F4EFDF; color: #2F3E46; font-weight: 700; }
  .mm-tab.character { border-top: 3px solid #E5CFFF; }
  .mm-tab.new { background: transparent; border: 1px dashed rgba(255,255,255,.35); border-radius: 6px; }
  .mm-tab.new:hover { background: rgba(255,255,255,.08); }

  .mm-btn {
    border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer;
    font-family: inherit; font-size: 13.5px; font-weight: 600;
  }
  .mm-btn.small { padding: 4px 10px; font-size: 13px; }
  .mm-btn.primary { background: #2F3E46; color: #FEF3A2; }
  .mm-btn.primary:disabled { opacity: .4; cursor: default; }
  .mm-btn.ghost { background: rgba(255,255,255,.1); color: inherit; }
  .mm-btn.ghost:hover { background: rgba(255,255,255,.18); }
  .mm-btn.ghost.danger { color: #C0392B; }
  .mm-btn.toggle { background: rgba(47,62,70,.1); color: #2F3E46; flex: 1; }
  .mm-btn.toggle.on { background: #2F3E46; color: #FEF3A2; }

  /* buttons inside the light modal need dark ghost styling */
  .mm-inbox-item .mm-btn.ghost { background: rgba(47,62,70,.08); color: #2F3E46; }
  .mm-inbox-item .mm-btn.ghost.danger { color: #C0392B; }

  .mm-label { display: block; font-size: 13px; letter-spacing: .1em; text-transform: uppercase; font-weight: 700; margin: 12px 0 5px; opacity: .8; }
  .mm-input {
    width: 100%; box-sizing: border-box; border: 1.5px solid rgba(47,62,70,.35); border-radius: 6px;
    padding: 9px 10px; font-family: inherit; font-size: 14.5px; background: #fff; color: #24313A;
    margin-bottom: 4px; resize: vertical;
  }
  .mm-input:focus { outline: 2px solid #2F3E46; outline-offset: 1px; }
  .mm-select {
    border: 1.5px solid rgba(255,255,255,.3); background: rgba(255,255,255,.1); color: #E7E2D6;
    border-radius: 6px; padding: 8px 10px; font-family: inherit; font-size: 13.5px; max-width: 46vw;
  }
  .mm-select.wide { width: 100%; background: #fff; color: #24313A; border-color: rgba(47,62,70,.35); margin-bottom: 4px; }
  .mm-select option { color: #24313A; }
  .mm-help { font-size: 13px; line-height: 1.45; opacity: .85; margin: 8px 0 4px; }

  .mm-inbox-item {
    border: 1px solid rgba(47,62,70,.2); border-radius: 8px;
    padding: 10px 12px; margin-bottom: 10px; background: #fff;
  }
  .mm-inbox-text { font-size: 14px; line-height: 1.4; white-space: pre-wrap; }
  .mm-inbox-meta {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 8px; font-size: 13px; opacity: .75;
  }

  @media (prefers-reduced-motion: reduce) {
    .mm-note { transition: none; }
  }
  @media (max-width: 700px) {
    .mm-lane.act { min-width: 200px; }
    .mm-lane.hinge { min-width: 150px; }
  }
`
