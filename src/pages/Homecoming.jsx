// src/pages/Homecoming.jsx
//
// Homecoming — hidden, founder-only. Reached from a "HOMECOMING" button in the
// Profile panel (ProfileMissionPanel.jsx), alongside Admin Console, Movie Magic,
// Care Protocol and Prism Lab; the route is unlinked from all other navigation.
//
// UI gate mirrors the Care Protocol founder check (tolerant of either metadata
// source so the founder cannot be locked out). Real enforcement is RLS in
// sql/189_homecoming.sql, which requires app_metadata only.
//
// One tool, four surfaces: Threshold (set the old number and the target home,
// once), The Daily Return (the six-move rep), Guards (Scene One + the reference),
// and Evidence (the proof file). The engine (src/lib/homecoming) holds the moves,
// posts, states, copy, guard predicates and evidence math; this page renders them
// and owns persistence.
//
// Voice: say what we move toward; invite the bravery, never assign it; speak
// from beside the founder, never from the appraiser's seat.

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'
import { fn, fnText, space, shadow, display, mono } from '../lib/designTokens'
import {
  MOVES, POSTS, postForDay, STATES, SCENE_ONE, THREE_QUESTIONS, REACH_FOR_A_PERSON,
  isDoneToday, returnsToday, repDaysInWindow,
  setpointTrend, trendDirection, evidenceSummary,
} from '../lib/homecoming'

// Tolerant UI gate. RLS is the real boundary (sql/189).
const isFounder = (user) =>
  user?.app_metadata?.role === 'founder' || user?.user_metadata?.role === 'founder'

const dayIndexNow = () => Math.floor(Date.now() / 86400000)

// Maps a state's semantic colour key (states.js) to design tokens. Slate has no
// token, so Collapsed reads as the neutral ink-grey rather than a raw hex.
const STATE_COLOR = { gold: fn.gold, moss: fn.moss, clay: fn.clay, slate: fn.meta }

const EMPTY_PROFILE = {
  old_number: '',
  target_state: '',
  posts: {},
  guards: {},
  breath_seconds: 300,
}

/* ── gate ─────────────────────────────────────────────────── */
export function HomecomingPage() {
  const { user, loading } = useAuth()
  if (loading || user === undefined) {
    return <div style={S.loadingWrap}><div style={S.loadingTape}>COMING HOME…</div></div>
  }
  if (!user) return <Navigate to="/login" replace />
  if (!isFounder(user)) return <Navigate to="/" replace />
  return <HomecomingWorkspace user={user} />
}
export default HomecomingPage

/* ── workspace ────────────────────────────────────────────── */
function HomecomingWorkspace({ user }) {
  const [profile, setProfile] = useState(null)
  const [entries, setEntries] = useState([])
  const [surface, setSurface] = useState('return')
  const [loadError, setLoadError] = useState(null)

  const saveTimer = useRef(null)
  const loaded = useRef(false)           // armed only after a SUCCESSFUL load
  const lastSyncRef = useRef(null)       // the server updated_at we last agreed on
  const profileRef = useRef(null)

  // ── load ────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data, error } = await supabase
        .from('homecoming_profile')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!alive) return
      // A read error must be a hard stop: installing the empty state and then
      // letting the debounced save write it back would clobber the real row on
      // a transient 502 / expired JWT. maybeSingle() distinguishes "no row yet"
      // (data null, error null) from a genuine failure.
      if (error) { setLoadError(error.message || 'load failed'); return }
      if (!data) {
        setProfile({ ...EMPTY_PROFILE })
        lastSyncRef.current = null
        loaded.current = true
        setSurface('threshold')       // first run → set the old number + target
      } else {
        setProfile({
          old_number: data.old_number || '',
          target_state: data.target_state || '',
          posts: data.posts || {},
          guards: data.guards || {},
          breath_seconds: data.breath_seconds || 300,
        })
        lastSyncRef.current = data.updated_at
        loaded.current = true
        setSurface((data.old_number || data.target_state) ? 'return' : 'threshold')
      }
      // entries
      const { data: ents } = await supabase
        .from('homecoming_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(300)
      if (alive && ents) setEntries(ents)
    })()
    return () => { alive = false }
  }, [user.id])

  useEffect(() => { profileRef.current = profile }, [profile])

  // ── conflict-safe persist (mirrors CareProtocol's proven pattern) ──
  const persist = useCallback(async (snapshot) => {
    const stamp = new Date().toISOString()
    const row = {
      user_id: user.id,
      old_number: snapshot.old_number,
      target_state: snapshot.target_state,
      posts: snapshot.posts,
      guards: snapshot.guards,
      breath_seconds: snapshot.breath_seconds,
      updated_at: stamp,
    }
    if (!lastSyncRef.current) {
      const { error } = await supabase.from('homecoming_profile').upsert(row)
      if (error) return false
      lastSyncRef.current = stamp
      return true
    }
    const { data, error } = await supabase
      .from('homecoming_profile')
      .update(row)
      .eq('user_id', user.id)
      .eq('updated_at', lastSyncRef.current)
      .select('updated_at')
    if (error) return false
    if (data && data.length) { lastSyncRef.current = data[0].updated_at; return true }
    // Optimistic-lock miss: another device moved the row. Refetch, keep the
    // richer values, never let an empty local field clobber a populated remote.
    const { data: remote } = await supabase
      .from('homecoming_profile').select('*').eq('user_id', user.id).maybeSingle()
    const merged = {
      user_id: user.id,
      old_number: snapshot.old_number || remote?.old_number || '',
      target_state: snapshot.target_state || remote?.target_state || '',
      posts: { ...(remote?.posts || {}), ...(snapshot.posts || {}) },
      guards: { ...(remote?.guards || {}), ...(snapshot.guards || {}) },
      breath_seconds: snapshot.breath_seconds || remote?.breath_seconds || 300,
      updated_at: new Date().toISOString(),
    }
    const { error: mErr } = await supabase.from('homecoming_profile').upsert(merged)
    if (mErr) return false
    lastSyncRef.current = merged.updated_at
    return true
  }, [user.id])

  // debounced autosave
  useEffect(() => {
    if (!profile || !loaded.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { saveTimer.current = null; persist(profile) }, 700)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [profile, persist])

  // flush on unmount
  useEffect(() => () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current); saveTimer.current = null
      if (profileRef.current && loaded.current) persist(profileRef.current)
    }
  }, [persist])

  const patch = (p) => setProfile(prev => ({ ...prev, ...p }))

  // insert an entry (return / receipt / urge / setpoint) and prepend locally
  const addEntry = useCallback(async (entry) => {
    const row = { user_id: user.id, ...entry }
    const { data, error } = await supabase
      .from('homecoming_entries').insert(row).select('*').single()
    if (!error && data) setEntries(prev => [data, ...prev])
  }, [user.id])

  if (loadError) {
    return (
      <div style={S.page}><div style={S.shell}>
        <div style={S.card}>
          <h2 style={S.h2}>Couldn’t reach your Homecoming just now.</h2>
          <p style={S.p}>Your work is safe. This is a connection hiccup, not a loss — refresh when you have a moment and it’ll be here.</p>
          <p style={S.fine}>{String(loadError)}</p>
        </div>
      </div></div>
    )
  }
  if (!profile) {
    return <div style={S.loadingWrap}><div style={S.loadingTape}>COMING HOME…</div></div>
  }

  const doneToday = isDoneToday(entries)

  return (
    <div style={S.page}>
      <div style={S.shell}>
        <header style={S.top}>
          <div style={S.mark}>Home<span style={{ color: fn.moss }}>coming</span></div>
          <div style={S.founder}>FOUNDER</div>
        </header>

        <nav style={S.tabs}>
          {[['return', 'The Daily Return'], ['guards', 'Guards'], ['evidence', 'Evidence'], ['threshold', 'Threshold']].map(([id, label]) => (
            <button key={id} onClick={() => setSurface(id)}
              style={{ ...S.tab, ...(surface === id ? S.tabOn : null) }}>{label}</button>
          ))}
        </nav>

        {surface === 'threshold' && (
          <Threshold profile={profile} patch={patch} onDone={() => setSurface('return')} />
        )}
        {surface === 'return' && (
          <DailyReturn
            profile={profile}
            doneToday={doneToday}
            returnsToday={returnsToday(entries)}
            onComplete={async ({ state, post, mode, receipt, landed }) => {
              await addEntry({ kind: 'return', state, post, mode })
              if (receipt && receipt.trim()) {
                await addEntry({ kind: 'receipt', note: receipt.trim(), landed: !!landed, post })
              }
            }}
            onOpenSceneOne={() => setSurface('guards')}
          />
        )}
        {surface === 'guards' && (
          <Guards onLogUrge={async (note) => { await addEntry({ kind: 'urge', note }) }} />
        )}
        {surface === 'evidence' && (
          <Evidence entries={entries} />
        )}

        <p style={S.footNote}>{REACH_FOR_A_PERSON}</p>
      </div>
    </div>
  )
}

/* ── Threshold ────────────────────────────────────────────── */
function Threshold({ profile, patch, onDone }) {
  return (
    <div style={S.card}>
      <div style={S.eyebrow}>Threshold · set once, re-openable</div>
      <h1 style={S.h1}>Name the home you’re coming to.</h1>
      <p style={S.p}>Two lines, in your own words. They orient every rep after this. Come back and edit them whenever the words change.</p>

      <label style={S.lbl}>The number your body has been defending — the old normal, in a phrase</label>
      <input style={S.input} value={profile.old_number}
        onChange={e => patch({ old_number: e.target.value })}
        placeholder="braced, scanning, never quite off the clock…" />

      <label style={{ ...S.lbl, marginTop: space.lg }}>The state that would be a proper home — where you’re coming to</label>
      <input style={S.input} value={profile.target_state}
        onChange={e => patch({ target_state: e.target.value })}
        placeholder="settled, flush, held, chest open, laughing easily…" />

      <div style={S.guardMoss}>
        <b style={S.guardTagMoss}>The three questions</b> {THREE_QUESTIONS} Three yeses, and you’re home.
      </div>

      <div style={S.rowEnd}>
        <button style={S.btn} onClick={onDone}>Begin the daily return →</button>
      </div>
    </div>
  )
}

/* ── The Daily Return ─────────────────────────────────────── */
function DailyReturn({ profile, doneToday, returnsToday, onComplete, onOpenSceneOne }) {
  const [step, setStep] = useState(0)          // 0 intro … 6 close
  const [state, setState] = useState(null)
  const [mode, setMode] = useState(null)
  const [receipt, setReceipt] = useState('')
  const [landed, setLanded] = useState(null)
  const [anchor, setAnchor] = useState('')
  const post = useMemo(() => postForDay(dayIndexNow()), [])
  const savedRef = useRef(false)

  const reset = () => {
    setStep(0); setState(null); setMode(null); setReceipt(''); setLanded(null); setAnchor(''); savedRef.current = false
  }

  const finish = async () => {
    if (!savedRef.current) {
      savedRef.current = true
      await onComplete({ state, post: post.id, mode, receipt, landed })
    }
    setStep(6)
  }

  // Intro — honours the never-heroic guard once today's rep is in.
  if (step === 0) {
    if (doneToday) {
      return (
        <div style={S.card}>
          <div style={S.eyebrow}>✓ · today’s stone, laid</div>
          <div style={S.guardMoss}>
            <b style={S.guardTagMoss}>Come back tomorrow</b> You’ve laid today’s stone. One rep a day is exactly the dose — the set-point moves on the month’s steady average. That pull to go again is the revved state looking for a job; give it tomorrow.
          </div>
          <h2 style={S.h2}>That’s the rep. You’re home for today.</h2>
          <p style={S.p}>Lean in, come back tomorrow. You’ve got this.</p>
          <div style={S.row}>
            <button style={S.btnGhost} onClick={onOpenSceneOne}>Something’s pulling at you? →</button>
            <div style={{ flex: 1 }} />
            <button style={S.link} onClick={reset}>Go again anyway</button>
          </div>
        </div>
      )
    }
    return (
      <div style={S.card}>
        <div style={S.eyebrow}>The Daily Return · ~6 minutes</div>
        <h1 style={S.h1}>Come home to the body, in small doses.</h1>
        <p style={{ ...S.p, color: fn.ink, fontSize: 16.5 }}>
          Six short moves. Every rep is an opportunity to allow the body to take on another piece of evidence that safe-and-received is real, teaching it a new home to return to. Lean in bravely. You’ve got this.
        </p>
        <div style={S.guardMoss}><b style={S.guardTagMoss}>The three questions</b> {THREE_QUESTIONS} Three yeses, and you’re home.</div>
        <div style={S.row}>
          <button style={S.btn} onClick={() => setStep(1)}>Ready, allowed, and choosing →</button>
          <div style={{ flex: 1 }} />
          <button style={S.link} onClick={onOpenSceneOne}>Something’s pulling at you?</button>
        </div>
      </div>
    )
  }

  const move = MOVES[step - 1]

  // 1 · Land — the four states as a ladder (summit to floor), each carrying
  // its Polyvagal term as the quiet subtitle.
  if (step === 1) {
    return (
      <MoveCard move={move}>
        <div style={S.rungs}>
          {STATES.map(s => {
            const on = state === s.id
            const c = STATE_COLOR[s.color] || fn.moss
            return (
              <button key={s.id} onClick={() => setState(s.id)}
                style={{ ...S.rung, borderLeftColor: c, ...(on ? { borderColor: c, boxShadow: `0 0 0 1px ${c}` } : null) }}>
                <div style={S.rungHead}>
                  <span style={{ ...S.rungName, color: c }}>{s.label}</span>
                  <span style={S.rungPoly}>{s.polyvagal}</span>
                </div>
                <div style={S.rungDesc}>{s.desc}</div>
              </button>
            )
          })}
        </div>
        <GuardMoss g={move.guard} />
        <NavRow onBack={() => setStep(0)} nextLabel="Named it →" nextOn={!!state} onNext={() => setStep(2)} />
      </MoveCard>
    )
  }

  // 2 · Breathe
  if (step === 2) {
    return (
      <MoveCard move={move}>
        <GuardMoss g={move.guard} />
        <Breath seconds={profile.breath_seconds || 300} />
        <NavRow onBack={() => setStep(1)} nextLabel="Move on →" nextOn onNext={() => setStep(3)} />
      </MoveCard>
    )
  }

  // 3 · Titrate (with the resting hold)
  if (step === 3) {
    return (
      <MoveCard move={move}>
        <label style={S.lbl}>Your anchor today (optional) — one steady, okay thing</label>
        <input style={S.input} value={anchor} onChange={e => setAnchor(e.target.value)}
          placeholder="feet on the floor / the dog / the ravine in Bali…" />
        <GuardMoss g={move.guard} />
        <RestingHold onBack={() => setStep(2)} onNext={() => setStep(4)} />
      </MoveCard>
    )
  }

  // 4 · Reassign
  if (step === 4) {
    return (
      <MoveCard move={move}>
        <div style={S.post}>
          <div style={S.postRole}>{post.role}</div>
          <div style={S.postDecl} dangerouslySetInnerHTML={{ __html: post.decl }} />
        </div>
        {mode == null ? (
          <>
            <p style={S.p}>Read it, out loud if you can. Then — honestly — which does it feel like?</p>
            <div style={S.choose}>
              <button style={S.chooseBtn} onClick={() => setMode('gardener')}>
                <div style={S.chooseT}>Steady</div>
                <div style={S.chooseS}>{post.steady}</div>
              </button>
              <button style={S.chooseBtn} onClick={() => setMode('sentry')}>
                <div style={S.chooseT}>Gripping</div>
                <div style={S.chooseS}>{post.gripping}</div>
              </button>
            </div>
          </>
        ) : mode === 'gardener' ? (
          <div style={S.guardMoss}><b style={S.guardTagMoss}>The gardener’s hand</b> That’s the post held right — steadiness, tending the conditions, letting them grow. Rest here; it’s working.</div>
        ) : (
          <>
            <GuardClay g={move.guard} />
            <div style={S.row}><button style={S.btnClayGhost} onClick={() => setMode(null)}>Re-declare it as steady →</button></div>
          </>
        )}
        <NavRow onBack={() => setStep(3)} nextLabel="Declared →" nextOn={mode === 'gardener'} onNext={() => setStep(5)} />
      </MoveCard>
    )
  }

  // 5 · Receive
  if (step === 5) {
    return (
      <MoveCard move={move}>
        <textarea style={S.textarea} rows={3} value={receipt}
          onChange={e => setReceipt(e.target.value)}
          placeholder="a friend messaged and I let it feel good — I let it land…" />
        {landed == null ? (
          <>
            <label style={{ ...S.lbl, marginTop: space.md }}>Did a feeling rise while you let that land?</label>
            <div style={S.choose}>
              <button style={S.chooseBtn} onClick={() => setLanded(true)}>
                <div style={S.chooseT}>Yes, something moved</div>
                <div style={S.chooseS}>let it be felt — a beat, in a body that’s safe this time</div>
              </button>
              <button style={S.chooseBtn} onClick={() => setLanded(false)}>
                <div style={S.chooseT}>It stayed quiet</div>
                <div style={S.chooseS}>that’s good too</div>
              </button>
            </div>
          </>
        ) : landed ? (
          <div style={S.guardMoss}><b style={S.guardTagMoss}>Let it land</b> You let the feeling through in a body that’s safe now. Ten seconds; let it be felt. That’s how the old number updates.</div>
        ) : (
          <div style={S.guardMoss}><b style={S.guardTagMoss}>Received</b> It goes in the proof file — the protectors’ evidence the new number is real.</div>
        )}
        <NavRow onBack={() => setStep(4)} nextLabel="Let it land, and close →" nextOn={landed != null} onNext={finish} />
      </MoveCard>
    )
  }

  // 6 · Close
  return (
    <div style={S.card}>
      <div style={S.eyebrow}>✓ · Home for today</div>
      <h2 style={S.h2}>That’s the rep.</h2>
      <p style={{ ...S.p, color: fn.ink, fontSize: 16.5 }}>Small, done, real. You handed the body one more proof. One rep is the whole dose. Lean in, come back tomorrow. You’ve got this.</p>
      <div style={S.guardMoss}><b style={S.guardTagMoss}>Come back tomorrow</b> Read the month, not the morning — the set-point moves on the long average, slowly, under the noise. A plain Tuesday’s quiet rep is the cathedral going up, one stone at a time. Lean in, small, again tomorrow.</div>
      <div style={S.row}>
        <button style={S.btnGhost} onClick={onOpenSceneOne}>Something’s pulling at you? →</button>
        <div style={{ flex: 1 }} />
        <button style={S.btn} onClick={reset}>Done</button>
      </div>
    </div>
  )
}

/* ── Move scaffold + shared bits ──────────────────────────── */
function MoveCard({ move, children }) {
  return (
    <div style={S.card}>
      <div style={S.eyebrow}><span style={{ color: fn.moss, fontWeight: 600 }}>{move.num}</span> · {move.label} · {move.tag}</div>
      <h2 style={S.h2}>{move.title}</h2>
      <p style={S.p}>{move.body}</p>
      {children}
    </div>
  )
}
function GuardMoss({ g }) {
  return <div style={S.guardMoss}><b style={S.guardTagMoss}>{g.name}</b> {g.text}</div>
}
function GuardClay({ g }) {
  return <div style={S.guardClay}><b style={S.guardTagClay}>{g.name}</b> {g.text}</div>
}
function NavRow({ onBack, nextLabel, nextOn, onNext }) {
  return (
    <div style={S.row}>
      <button style={S.link} onClick={onBack}>← back</button>
      <div style={{ flex: 1 }} />
      <button style={{ ...S.btn, ...(nextOn ? null : S.btnOff) }} disabled={!nextOn} onClick={onNext}>{nextLabel}</button>
    </div>
  )
}

// The resting hold — the continue invitation arrives after a short stay, gently.
function RestingHold({ onBack, onNext }) {
  const [left, setLeft] = useState(8)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft(l => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  const ready = left <= 0
  return (
    <div style={S.row}>
      <button style={S.link} onClick={onBack}>← back</button>
      <div style={{ flex: 1 }} />
      <span style={S.fine}>{ready ? 'whenever you’re ready' : `staying with it… ${left}`}</span>
      <button style={{ ...S.btn, ...(ready ? null : S.btnOff) }} disabled={!ready} onClick={onNext}>Continue →</button>
    </div>
  )
}

// Cyclic-sighing pacer: double inhale, long exhale. Visual only, no audio.
function Breath({ seconds }) {
  const [running, setRunning] = useState(false)
  const [word, setWord] = useState('ready when you are')
  const [left, setLeft] = useState(seconds)
  const [scale, setScale] = useState(0.72)
  const [dur, setDur] = useState(2)
  const phaseRef = useRef(0)
  const endRef = useRef(0)
  const phaseTimer = useRef(null)
  const clockTimer = useRef(null)

  const PH = [
    { w: 'breathe in…', s: 1.28, d: 1.6 },
    { w: '…and a little more', s: 1.5, d: 0.9 },
    { w: 'long exhale out', s: 0.72, d: 6.2 },
    { w: '', s: 0.72, d: 0.5 },
  ]

  const stop = useCallback(() => {
    setRunning(false)
    clearTimeout(phaseTimer.current); clearTimeout(clockTimer.current)
    setDur(2); setScale(0.72)
  }, [])

  useEffect(() => () => { clearTimeout(phaseTimer.current); clearTimeout(clockTimer.current) }, [])

  const tickClock = useCallback(() => {
    const rem = Math.max(0, Math.round((endRef.current - Date.now()) / 1000))
    setLeft(rem)
    if (rem <= 0) { setWord('done — well done'); stop(); return }
    clockTimer.current = setTimeout(tickClock, 250)
  }, [stop])

  const cycle = useCallback(() => {
    const p = PH[phaseRef.current % 4]
    setDur(p.d); setScale(p.s)
    if (p.w) setWord(p.w)
    phaseRef.current += 1
    phaseTimer.current = setTimeout(cycle, p.d * 1000)
  }, [])

  const toggle = () => {
    if (running) { stop(); return }
    setRunning(true)
    endRef.current = Date.now() + left * 1000
    tickClock(); cycle()
  }

  const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, '0')

  return (
    <div style={S.breathStage}>
      <div style={S.orbWrap}>
        <div style={{ ...S.orb, transform: `scale(${scale})`, transition: `transform ${dur}s cubic-bezier(.4,0,.3,1)` }} />
      </div>
      <div style={S.breathWord}>{word}</div>
      <div style={S.clock}>{mm}:{ss}</div>
      <div style={{ ...S.row, marginTop: space.md }}>
        <div style={{ flex: 1 }} />
        <button style={S.btnGhost} onClick={toggle}>{running ? 'Pause' : (left < seconds ? 'Resume' : 'Begin')}</button>
      </div>
    </div>
  )
}

/* ── Guards surface (Scene One + reference) ───────────────── */
function Guards({ onLogUrge }) {
  const [note, setNote] = useState('')
  const [logged, setLogged] = useState(false)
  if (logged) {
    return (
      <div style={S.card}>
        <h2 style={S.h2}>Named. Held.</h2>
        <p style={S.p}>You caught it. That’s the whole win — you saw the defence for what it is and let it be. It’ll pass; they always do. When it passes, that’s a receipt.</p>
        <div style={S.rowEnd}><button style={S.btn} onClick={() => { setLogged(false); setNote('') }}>Back</button></div>
      </div>
    )
  }
  return (
    <div style={S.card}>
      <div style={S.eyebrow}>Guard · {SCENE_ONE.name}</div>
      <h2 style={S.h2}>{SCENE_ONE.title}</h2>
      <p style={S.p}>{SCENE_ONE.body}</p>
      <div style={S.guardClay}><b style={S.guardTagClay}>{SCENE_ONE.name}</b> {SCENE_ONE.guard}</div>
      <label style={S.lbl}>Name it — it goes to the log as data, a rep of noticing</label>
      <textarea style={S.textarea} rows={3} value={note} onChange={e => setNote(e.target.value)}
        placeholder="the urge that just showed up, in your words…" />
      <div style={S.rowEnd}>
        <button style={S.btnClay} onClick={async () => { if (note.trim()) await onLogUrge(note.trim()); setLogged(true) }}>
          Named. I’ll keep today small →
        </button>
      </div>
    </div>
  )
}

/* ── Evidence surface ─────────────────────────────────────── */
function Evidence({ entries }) {
  const sum = evidenceSummary(entries)
  const receipts = entries.filter(e => e.kind === 'receipt').slice(0, 12)
  const urges = entries.filter(e => e.kind === 'urge').slice(0, 8)
  const repDays = repDaysInWindow(entries, 30)
  const dir = trendDirection(entries.filter(e => e.kind === 'setpoint'))
  const dirWord = dir === 'easing' ? 'easing down' : dir === 'rising' ? 'up this stretch' : dir === 'holding' ? 'holding' : 'gathering'

  return (
    <div style={S.card}>
      <div style={S.eyebrow}>Evidence · the proof file</div>
      <h2 style={S.h2}>Read the month, not the morning.</h2>
      <p style={S.p}>The set-point moves slowly, under the daily noise. This surface favours the long view on purpose — a single tired day carries no verdict here.</p>

      <div style={S.stats}>
        <Stat n={repDays} label="rep-days · last 30" />
        <Stat n={sum.receipts} label="receipts kept" />
        <Stat n={sum.landed} label="let land" />
        <Stat n={sum.urges} label="urges named" />
      </div>

      <div style={S.evTrend}>Set-point proxy: {dirWord}{dir ? ' (7-day average)' : ' — log a few readings to see the trend'}.</div>

      <div style={S.evBlock}>
        <div style={S.evHead}>Receipts — proof the new number is real</div>
        {receipts.length ? receipts.map(r => (
          <div key={r.id} style={S.evLine}>{r.landed ? '◉' : '○'} {r.note}</div>
        )) : <div style={S.fine}>Receipts gather here over the weeks.</div>}
      </div>

      {urges.length > 0 && (
        <div style={S.evBlock}>
          <div style={S.evHead}>Urges named — every one a rep of noticing</div>
          {urges.map(u => <div key={u.id} style={S.evLine}>· {u.note}</div>)}
        </div>
      )}
    </div>
  )
}
function Stat({ n, label }) {
  return <div style={S.stat}><div style={S.statN}>{n}</div><div style={S.statL}>{label}</div></div>
}

/* ── styles (Field Notes tokens) ──────────────────────────── */
const CARD_SHADOW = '0 1px 2px rgba(38,36,32,.04), 0 12px 34px rgba(38,36,32,.05)'
const S = {
  loadingWrap: { minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: fn.ground },
  loadingTape: { ...mono, letterSpacing: '.24em', color: fn.ghost, fontSize: 13 },
  page: { minHeight: '100dvh', background: fn.ground, padding: '28px 20px 64px', display: 'flex', justifyContent: 'center' },
  shell: { width: '100%', maxWidth: 620 },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space.md },
  mark: { ...display, fontSize: 17, color: fn.ink },
  founder: { ...mono, fontSize: 13, letterSpacing: '.22em', color: fn.gold, border: `1px solid ${fn.gold}`, borderRadius: 20, padding: '3px 9px' },
  tabs: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: space.xl },
  tab: { ...mono, fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', padding: '8px 13px', borderRadius: 20, border: `1px solid ${fn.rule}`, background: fn.object, color: fn.meta, cursor: 'pointer' },
  tabOn: { borderColor: fn.moss, color: fn.moss, background: fn.mossTint },

  card: { background: fn.object, border: `1px solid ${fn.rule}`, borderRadius: 20, padding: '32px 28px', boxShadow: CARD_SHADOW },
  eyebrow: { ...mono, fontSize: 13, letterSpacing: '.22em', textTransform: 'uppercase', color: fn.ghost, marginBottom: space.md },
  h1: { ...display, fontWeight: 400, fontSize: 28, lineHeight: 1.2, color: fn.ink, marginBottom: space.md },
  h2: { ...display, fontWeight: 400, fontSize: 23, lineHeight: 1.25, color: fn.ink, marginBottom: space.sm },
  p: { ...fnText, color: fn.meta, fontSize: 15.5, lineHeight: 1.55, marginBottom: space.md },
  fine: { ...fnText, fontSize: 13, color: fn.ghost, lineHeight: 1.5 },
  footNote: { ...fnText, fontSize: 13, color: fn.ghost, lineHeight: 1.5, marginTop: space.xl, textAlign: 'center' },

  lbl: { ...fnText, fontSize: 13, color: fn.ghost, display: 'block', margin: '2px 0 7px' },
  input: { width: '100%', ...fnText, fontSize: 15, color: fn.ink, background: fn.ground, border: `1px solid ${fn.rule}`, borderRadius: 12, padding: '12px 14px' },
  textarea: { width: '100%', ...fnText, fontSize: 15, color: fn.ink, background: fn.ground, border: `1px solid ${fn.rule}`, borderRadius: 12, padding: '12px 14px', lineHeight: 1.5, resize: 'vertical' },

  row: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: space.xl },
  rowEnd: { display: 'flex', justifyContent: 'flex-end', marginTop: space.xl },
  btn: { ...fnText, fontSize: 14, fontWeight: 500, color: '#fff', background: fn.moss, border: `1px solid ${fn.moss}`, borderRadius: 13, padding: '12px 22px', cursor: 'pointer' },
  btnOff: { opacity: 0.4, cursor: 'not-allowed' },
  btnGhost: { ...fnText, fontSize: 14, color: fn.moss, background: 'transparent', border: `1px solid ${fn.moss}`, borderRadius: 13, padding: '12px 22px', cursor: 'pointer' },
  btnClay: { ...fnText, fontSize: 14, fontWeight: 500, color: '#fff', background: fn.clay, border: `1px solid ${fn.clay}`, borderRadius: 13, padding: '12px 22px', cursor: 'pointer' },
  btnClayGhost: { ...fnText, fontSize: 14, color: fn.clay, background: 'transparent', border: `1px solid ${fn.clay}`, borderRadius: 13, padding: '12px 22px', cursor: 'pointer' },
  link: { ...fnText, fontSize: 13, color: fn.ghost, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 },

  guardMoss: { background: fn.mossTint, border: `1px solid ${fn.mossEdge}`, borderRadius: 10, padding: '10px 13px', fontSize: 13, color: fn.moss, lineHeight: 1.5, margin: `${space.md} 0 0` },
  guardTagMoss: { ...mono, fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', color: fn.moss, background: 'rgba(76,107,69,.14)', padding: '2px 7px', borderRadius: 6, marginRight: 8 },
  guardClay: { background: fn.clayTint, border: `1px solid ${fn.clayEdge}`, borderRadius: 10, padding: '10px 13px', fontSize: 13, color: fn.clay, lineHeight: 1.5, margin: `${space.md} 0 0` },
  guardTagClay: { ...mono, fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', color: fn.clay, background: 'rgba(169,116,63,.14)', padding: '2px 7px', borderRadius: 6, marginRight: 8 },

  rungs: { display: 'flex', flexDirection: 'column', gap: 10, margin: `${space.lg} 0 0` },
  rung: { textAlign: 'left', background: fn.object, border: `1px solid ${fn.rule}`, borderLeftWidth: 4, borderRadius: 14, padding: '13px 16px', cursor: 'pointer', transition: '.16s' },
  rungHead: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 3 },
  rungName: { ...display, fontSize: 19 },
  rungPoly: { ...mono, fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', color: fn.ghost, marginLeft: 'auto' },
  rungDesc: { ...fnText, fontSize: 13, color: fn.meta, lineHeight: 1.5 },

  post: { background: fn.mossTint, border: `1px solid ${fn.mossEdge}`, borderRadius: 16, padding: '20px', margin: `${space.lg} 0` },
  postRole: { ...mono, fontSize: 13, letterSpacing: '.2em', textTransform: 'uppercase', color: fn.moss, marginBottom: 9 },
  postDecl: { ...display, fontSize: 17, lineHeight: 1.5, color: fn.ink },

  choose: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: `${space.sm} 0 0` },
  chooseBtn: { textAlign: 'left', padding: 15, borderRadius: 14, border: `1px solid ${fn.rule}`, background: fn.object, cursor: 'pointer' },
  chooseT: { ...display, fontSize: 16, color: fn.ink, marginBottom: 3 },
  chooseS: { ...fnText, fontSize: 13, color: fn.ghost, lineHeight: 1.4 },

  breathStage: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 4px' },
  orbWrap: { width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '6px 0 4px' },
  orb: { width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle at 38% 34%, rgba(76,107,69,.28), rgba(76,107,69,.10))', border: `1px solid ${fn.mossEdge}` },
  breathWord: { ...display, fontSize: 20, color: fn.moss, minHeight: 26, letterSpacing: '.02em' },
  clock: { ...display, fontSize: 15, color: fn.ghost, marginTop: 2 },

  stats: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, margin: `${space.lg} 0` },
  stat: { background: fn.surface2, borderRadius: 12, padding: '14px 10px', textAlign: 'center' },
  statN: { ...display, fontSize: 24, color: fn.moss },
  statL: { ...fnText, fontSize: 13, color: fn.ghost, letterSpacing: '.04em', marginTop: 2 },
  evTrend: { ...fnText, fontSize: 13.5, color: fn.meta, background: fn.mossTint, border: `1px solid ${fn.mossEdge}`, borderRadius: 10, padding: '10px 13px', marginBottom: space.md },
  evBlock: { marginTop: space.md },
  evHead: { ...mono, fontSize: 13, letterSpacing: '.18em', textTransform: 'uppercase', color: fn.ghost, marginBottom: 8 },
  evLine: { ...fnText, fontSize: 13.5, color: fn.meta, padding: '5px 0', borderBottom: `1px solid ${fn.rule}` },
}
