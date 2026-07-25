// src/pages/MovieMagicScript.jsx
//
// Movie Magic · Script Room. A Fountain-native drafting space:
// write plain text, the format is interpreted; preview renders it
// as a screenplay; scenes navigate; snapshots keep drafts sacred;
// stats hold intentions honest; wall beats insert at the cursor.
//
// Scripts live inside the same movie_magic state row, so they sync
// with the boards. Snapshots are capped to the newest 20 per script.

import { useState, useMemo, useRef } from 'react'

/* ── Fountain interpretation ─────────────────────────────────
   A pragmatic subset of the spec: sluglines, forced sluglines,
   character cues, parentheticals, dialogue, transitions,
   sections, synopses, notes, action. Enough for drafting;
   Beat remains the authority for full pagination. */

const SLUG_RE = /^(INT|EXT|EST|INT\.?\/EXT|I\/E)[.\s]/i
const TRANS_RE = /(TO:|FADE OUT\.?|FADE IN:?|CUT TO BLACK\.?)\s*$/
const CUE_RE = /^[A-Z0-9 .'\-()]+(\s*\(.*\))?$/

export function parseFountain(text) {
  const rawLines = text.split('\n')
  const out = []
  let inDialogue = false
  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i]
    const line = raw.trim()
    const prevBlank = i === 0 || rawLines[i - 1].trim() === ''
    const nextNonBlank = i + 1 < rawLines.length && rawLines[i + 1].trim() !== ''

    if (line === '') { out.push({ type: 'blank', text: '', line: i }); inDialogue = false; continue }
    if (line.startsWith('#')) { out.push({ type: 'section', text: line.replace(/^#+\s*/, ''), line: i }); inDialogue = false; continue }
    if (line.startsWith('=')) { out.push({ type: 'synopsis', text: line.replace(/^=\s*/, ''), line: i }); inDialogue = false; continue }
    if (/^\[\[.*\]\]$/.test(line)) { out.push({ type: 'note', text: line.slice(2, -2), line: i }); continue }
    if (line.startsWith('.') && line.length > 1 && line[1] !== '.') {
      out.push({ type: 'slug', text: line.slice(1).toUpperCase(), line: i }); inDialogue = false; continue
    }
    if (SLUG_RE.test(line)) { out.push({ type: 'slug', text: line.toUpperCase(), line: i }); inDialogue = false; continue }
    if (line.startsWith('>') || (TRANS_RE.test(line) && line === line.toUpperCase())) {
      out.push({ type: 'transition', text: line.replace(/^>\s*/, ''), line: i }); inDialogue = false; continue
    }
    if (line.startsWith('@')) {
      out.push({ type: 'character', text: line.slice(1).trim(), line: i }); inDialogue = true; continue
    }
    if (
      prevBlank && nextNonBlank && line === line.toUpperCase() &&
      /[A-Z]/.test(line) && CUE_RE.test(line) && line.length <= 40 && !SLUG_RE.test(line)
    ) {
      out.push({ type: 'character', text: line, line: i }); inDialogue = true; continue
    }
    if (inDialogue && /^\(.*\)$/.test(line)) { out.push({ type: 'paren', text: line, line: i }); continue }
    if (inDialogue) { out.push({ type: 'dialogue', text: line, line: i }); continue }
    out.push({ type: 'action', text: line, line: i })
  }
  return out
}

/* rough industry-shaped page estimate: wrapped display lines / 55 */
const wrapCount = (text, width) => Math.max(1, Math.ceil(text.length / width))
export function scriptStats(parsed) {
  let displayLines = 0
  let words = 0
  let dialogueWords = 0
  let sceneCount = 0
  const characters = {}
  let currentCue = null
  let sceneIdx = 0
  parsed.forEach((el) => {
    if (el.type === 'blank') { displayLines += 1; return }
    words += el.text.split(/\s+/).filter(Boolean).length
    switch (el.type) {
      case 'slug': sceneCount++; sceneIdx = sceneCount; displayLines += 2; currentCue = null; break
      case 'character': {
        currentCue = el.text.replace(/\(.*\)/, '').trim()
        if (currentCue) {
          if (!characters[currentCue]) characters[currentCue] = { cues: 0, words: 0, lastScene: 0 }
          characters[currentCue].cues++
          characters[currentCue].lastScene = sceneIdx
        }
        displayLines += 1; break
      }
      case 'dialogue': {
        const w = el.text.split(/\s+/).filter(Boolean).length
        dialogueWords += w
        if (currentCue && characters[currentCue]) characters[currentCue].words += w
        displayLines += wrapCount(el.text, 35); break
      }
      case 'paren': displayLines += 1; break
      case 'transition': displayLines += 2; currentCue = null; break
      case 'section': case 'synopsis': case 'note': break
      default: displayLines += wrapCount(el.text, 60) + 1; currentCue = null
    }
  })
  const pages = Math.max(1, Math.round(displayLines / 55))
  const dialogueShare = words ? Math.round((dialogueWords / words) * 100) : 0
  const cast = Object.entries(characters)
    .map(([name, c]) => ({ name, ...c }))
    .sort((a, b) => b.words - a.words)
  return { pages, words, sceneCount, dialogueShare, cast, totalScenes: sceneCount }
}

/* a wall note, interpreted into Fountain at insertion */
export function beatToFountain(note) {
  const title = (note.title || '').trim()
  const detail = (note.detail || '').trim()
  const lines = []
  if (SLUG_RE.test(title) || /^(INT|EXT)\b/i.test(title)) {
    lines.push(title.toUpperCase())
  } else {
    lines.push(title)
  }
  if (detail) lines.push(`[[${detail}]]`)
  return '\n' + lines.join('\n') + '\n\n'
}

/* ── the Script Room view ────────────────────────────────── */

export function ScriptView({
  script, boards, colors,
  onChangeText, onRename, onDelete,
  onSnapshot, onRestore, onExport, onReplace,
}) {
  const [mode, setMode] = useState('write') // write | preview
  const [beatsOpen, setBeatsOpen] = useState(false)
  const [snapsOpen, setSnapsOpen] = useState(false)
  const [beatBoardId, setBeatBoardId] = useState(boards[0] ? boards[0].id : null)
  const taRef = useRef(null)

  const parsed = useMemo(() => parseFountain(script.text || ''), [script.text])
  const stats = useMemo(() => scriptStats(parsed), [parsed])
  const scenes = useMemo(() => parsed.filter((el) => el.type === 'slug' || el.type === 'section'), [parsed])

  const jumpToLine = (lineIdx) => {
    const ta = taRef.current
    if (!ta) return
    setMode('write')
    requestAnimationFrame(() => {
      const lines = (script.text || '').split('\n')
      let pos = 0
      for (let i = 0; i < lineIdx && i < lines.length; i++) pos += lines[i].length + 1
      ta.focus()
      ta.setSelectionRange(pos, pos)
      const lineHeight = 22
      ta.scrollTop = Math.max(0, lineIdx * lineHeight - ta.clientHeight / 3)
    })
  }

  const insertAtCursor = (fragment) => {
    const ta = taRef.current
    const text = script.text || ''
    const pos = ta && document.activeElement === ta ? ta.selectionStart : text.length
    const next = text.slice(0, pos) + fragment + text.slice(pos)
    onChangeText(next)
    if (ta) {
      requestAnimationFrame(() => {
        ta.focus()
        const p = pos + fragment.length
        ta.setSelectionRange(p, p)
      })
    }
  }

  const beatBoard = boards.find((b) => b.id === beatBoardId)

  return (
    <main className="mm-script-wrap">
      <div className="mm-script-head">
        <div>
          <h1 className="mm-script-title">{script.name}</h1>
          <div className="mm-script-sub">
            ~{stats.pages} page{stats.pages === 1 ? '' : 's'} · {stats.sceneCount} scene{stats.sceneCount === 1 ? '' : 's'} · {stats.words} words · {stats.dialogueShare}% dialogue
          </div>
        </div>
        <div className="mm-script-btns">
          <button className={'mm-btn toggle-dark' + (mode === 'write' ? ' on' : '')} onClick={() => setMode('write')}>Write</button>
          <button className={'mm-btn toggle-dark' + (mode === 'preview' ? ' on' : '')} onClick={() => setMode('preview')}>Preview</button>
          <button className="mm-btn ghost" onClick={() => setBeatsOpen(true)}>Beats</button>
          <button className="mm-btn ghost" onClick={() => setSnapsOpen(true)}>Snapshots ({(script.snapshots || []).length})</button>
          <button className="mm-btn ghost" onClick={onExport}>Export .fountain</button>
          <button className="mm-btn ghost" onClick={onReplace}>Replace</button>
          <button className="mm-btn ghost" onClick={onRename}>Rename</button>
          <button className="mm-btn ghost danger" onClick={onDelete}>Delete</button>
        </div>
      </div>

      <div className="mm-script-body">
        <aside className="mm-scene-nav">
          <div className="mm-scene-nav-label">Scenes</div>
          {scenes.length === 0 && <div className="mm-scene-none">None yet · type INT. or EXT. to start one</div>}
          {scenes.map((el, i) => (
            <button
              key={i}
              className={'mm-scene-item' + (el.type === 'section' ? ' section' : '')}
              onClick={() => jumpToLine(el.line)}
            >
              {el.text}
            </button>
          ))}
          {stats.cast.length > 0 && (
            <>
              <div className="mm-scene-nav-label" style={{ marginTop: 14 }}>Cast by voice</div>
              {stats.cast.slice(0, 12).map((c) => (
                <div key={c.name} className="mm-cast-row">
                  <span className="mm-cast-name">{c.name}</span>
                  <span className="mm-cast-meta">
                    {c.words}w
                    {stats.totalScenes > 0 && c.lastScene < stats.totalScenes ? ` · quiet since sc ${c.lastScene || '·'}` : ''}
                  </span>
                </div>
              ))}
            </>
          )}
        </aside>

        {mode === 'write' ? (
          <textarea
            ref={taRef}
            className="mm-script-editor"
            value={script.text || ''}
            placeholder={'INT. THRONE ROOM - NIGHT\n\nTwo brothers stand before the empty throne.\n\nELDER BROTHER\nIt was always going to be mine.'}
            onChange={(e) => onChangeText(e.target.value)}
            spellCheck={false}
          />
        ) : (
          <div className="mm-script-preview">
            {parsed.map((el, i) => {
              switch (el.type) {
                case 'blank': return <div key={i} className="mm-sp-blank" />
                case 'slug': return <div key={i} className="mm-sp-slug">{el.text}</div>
                case 'character': return <div key={i} className="mm-sp-cue">{el.text}</div>
                case 'dialogue': return <div key={i} className="mm-sp-dialogue">{el.text}</div>
                case 'paren': return <div key={i} className="mm-sp-paren">{el.text}</div>
                case 'transition': return <div key={i} className="mm-sp-trans">{el.text}</div>
                case 'section': return <div key={i} className="mm-sp-section">{el.text}</div>
                case 'synopsis': return <div key={i} className="mm-sp-synopsis">= {el.text}</div>
                case 'note': return <div key={i} className="mm-sp-note">[[{el.text}]]</div>
                default: return <div key={i} className="mm-sp-action">{el.text}</div>
              }
            })}
          </div>
        )}
      </div>

      {beatsOpen && (
        <div className="mm-drawer-scrim" onClick={() => setBeatsOpen(false)}>
          <div className="mm-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mm-drawer-head">
              <span>Beats from the wall</span>
              <button className="mm-btn ghost" onClick={() => setBeatsOpen(false)}>✕</button>
            </div>
            <select
              className="mm-select wide"
              value={beatBoardId || ''}
              onChange={(e) => setBeatBoardId(e.target.value)}
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <p className="mm-help">Tap a beat to place it at your cursor. Slug-shaped beats become sluglines; the rest arrive as text with their notes attached.</p>
            {beatBoard && beatBoard.laneNotes.flat().length === 0 && (
              <p className="mm-help" style={{ opacity: 0.72 }}>This board has no beats pinned.</p>
            )}
            {beatBoard && beatBoard.laneNotes.map((lane, li) => (
              lane.map((note) => (
                <button
                  key={note.id}
                  className="mm-beat-chip"
                  style={{ background: (colors.find((c) => c.id === note.color) || colors[0]).hex }}
                  onClick={() => { insertAtCursor(beatToFountain(note)); setBeatsOpen(false) }}
                >
                  {note.title || 'Untitled beat'}
                </button>
              ))
            ))}
          </div>
        </div>
      )}

      {snapsOpen && (
        <div className="mm-drawer-scrim" onClick={() => setSnapsOpen(false)}>
          <div className="mm-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mm-drawer-head">
              <span>Draft snapshots</span>
              <button className="mm-btn ghost" onClick={() => setSnapsOpen(false)}>✕</button>
            </div>
            <p className="mm-help">A snapshot freezes the whole script so you can cut boldly. Restoring first snapshots the current text, so nothing is ever lost.</p>
            <button className="mm-btn primary" style={{ width: '100%', marginBottom: 12 }} onClick={() => onSnapshot()}>
              Take snapshot now
            </button>
            {(script.snapshots || []).length === 0 && <p className="mm-help" style={{ opacity: 0.72 }}>No snapshots yet.</p>}
            {(script.snapshots || []).map((snap) => (
              <div key={snap.id} className="mm-snap-row">
                <div>
                  <div className="mm-snap-label">{snap.label}</div>
                  <div className="mm-snap-meta">{new Date(snap.ts).toLocaleString()} · {snap.text.length.toLocaleString()} chars</div>
                </div>
                <button className="mm-btn ghost" onClick={() => onRestore(snap.id)}>Restore</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

/* styles for the Script Room, appended to the main stylesheet */
export const SCRIPT_CSS = `
  .mm-script-wrap { flex: 1; display: flex; flex-direction: column; padding: 10px 18px 18px; min-height: 0; }
  .mm-script-head { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 10px; margin: 10px 2px 12px; }
  .mm-script-title { margin: 0; font-family: 'Chalkboard SE','Segoe Print','Bradley Hand',cursive; font-size: 28px; font-weight: 400; color: #F4EFDF; }
  .mm-script-sub { font-size: 13px; opacity: .75; margin-top: 2px; letter-spacing: .05em; text-transform: uppercase; }
  .mm-script-btns { display: flex; gap: 6px; flex-wrap: wrap; }
  .mm-btn.toggle-dark { background: rgba(255,255,255,.1); color: #E7E2D6; }
  .mm-btn.toggle-dark.on { background: #F4EFDF; color: #2F3E46; }

  .mm-script-body { flex: 1; display: flex; gap: 12px; min-height: 0; }
  .mm-scene-nav {
    width: 220px; flex-shrink: 0; overflow-y: auto;
    background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.06);
    border-radius: 8px; padding: 10px;
  }
  .mm-scene-nav-label { font-size: 13px; letter-spacing: .12em; text-transform: uppercase; font-weight: 700; opacity: .7; margin-bottom: 8px; }
  .mm-scene-none { font-size: 13px; opacity: .55; }
  .mm-scene-item {
    display: block; width: 100%; text-align: left; background: transparent; border: none;
    color: #E7E2D6; font-family: 'Courier Prime','Courier New',monospace; font-size: 13px;
    padding: 5px 6px; border-radius: 5px; cursor: pointer; opacity: .88;
  }
  .mm-scene-item:hover { background: rgba(255,255,255,.08); opacity: 1; }
  .mm-scene-item.section { font-family: inherit; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; font-size: 13px; opacity: .7; margin-top: 6px; }
  .mm-cast-row { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; padding: 3px 6px; }
  .mm-cast-name { font-weight: 600; }
  .mm-cast-meta { opacity: .65; }

  .mm-script-editor {
    flex: 1; min-width: 0; resize: none; border-radius: 8px;
    background: #FBF8EF; color: #22292E; border: 1px solid rgba(255,255,255,.1);
    font-family: 'Courier Prime','Courier New',monospace; font-size: 15px; line-height: 22px;
    padding: 26px 30px; outline: none;
  }
  .mm-script-preview {
    flex: 1; min-width: 0; overflow-y: auto; border-radius: 8px;
    background: #FBF8EF; color: #22292E; border: 1px solid rgba(255,255,255,.1);
    font-family: 'Courier Prime','Courier New',monospace; font-size: 15px; line-height: 1.45;
    padding: 34px 8%;
  }
  .mm-sp-blank { height: 14px; }
  .mm-sp-slug { font-weight: 700; margin: 14px 0 6px; }
  .mm-sp-action { margin: 6px 0; }
  .mm-sp-cue { margin: 12px 0 0 32%; font-weight: 700; }
  .mm-sp-dialogue { margin: 0 22% 0 20%; }
  .mm-sp-paren { margin: 0 24% 0 26%; opacity: .8; }
  .mm-sp-trans { text-align: right; font-weight: 700; margin: 12px 0; }
  .mm-sp-section { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; font-size: 13px; opacity: .6; margin: 18px 0 4px; }
  .mm-sp-synopsis { opacity: .6; margin: 4px 0; }
  .mm-sp-note { opacity: .55; font-size: 13px; margin: 4px 0; }

  .mm-drawer-scrim { position: fixed; inset: 0; background: rgba(20,28,32,.55); z-index: 45; display: flex; justify-content: flex-end; }
  .mm-drawer {
    width: min(380px, 92vw); height: 100dvh; overflow-y: auto;
    background: #F4EFDF; color: #2F3E46; padding: 16px 18px; box-shadow: -18px 0 50px rgba(0,0,0,.4);
  }
  .mm-drawer-head { display: flex; justify-content: space-between; align-items: center; font-family: 'Chalkboard SE','Segoe Print',cursive; font-size: 20px; margin-bottom: 10px; }
  .mm-beat-chip {
    display: block; width: 100%; text-align: left; border: none; border-radius: 4px;
    padding: 9px 11px; margin-bottom: 8px; cursor: pointer;
    font-family: 'Chalkboard SE','Segoe Print',cursive; font-size: 14px; color: #333;
    box-shadow: 0 3px 7px rgba(0,0,0,.25);
  }
  .mm-snap-row {
    display: flex; justify-content: space-between; align-items: center; gap: 10px;
    background: #fff; border: 1px solid rgba(47,62,70,.2); border-radius: 8px;
    padding: 9px 12px; margin-bottom: 8px;
  }
  .mm-snap-label { font-weight: 700; font-size: 13.5px; }
  .mm-snap-meta { font-size: 13px; opacity: .7; }

  @media (max-width: 760px) {
    .mm-script-body { flex-direction: column; }
    .mm-scene-nav { width: auto; max-height: 30dvh; }
    .mm-script-editor, .mm-script-preview { min-height: 52dvh; }
  }
`
