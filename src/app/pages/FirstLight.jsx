// ─────────────────────────────────────────────────────────────
// FirstLight.jsx  —  /welcome/first-light
//
// The light-touch activation of the personal side. The user does one
// thing: mark where each of the seven personal domains is NOW. The
// system aims them automatically — under the line, the aim is to cross
// to 5 as fast as possible (a focus); at or above the line, a level up
// (a full level low, half a level high) — until the Map, where real
// targets get set. The wheel opens dormant behind a Start button so the
// personal side invites rather than forces.
//
// Writes: users.welcome_scores (now) + first_light_completed_at.
// The aim is a pure function of where-you-are (aimFor), so it is derived
// everywhere, never stored — the Map remains the source of real targets.
// ─────────────────────────────────────────────────────────────
import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import Wheel from '../components/Wheel'
import { SELF_DOMAINS } from '../components/WheelSVG'

const BG='#FAFAF7', CARD='#FFFFFF', INK='#0F1523', GOLD='#A8721A', CHROME='#C8922A', RED='#8A3030'
const META='rgba(15,21,35,0.72)', GHOST='rgba(15,21,35,0.55)', RULE='rgba(200,146,42,0.20)'
const SERIF="'Cormorant Garamond',Georgia,serif", SC="'Cormorant SC',Georgia,serif", LORA="'Lora',Georgia,serif"

const LABELS={10:'the best there is',9:'really good',8:'solid',7:'getting there',6:'getting by',5:'the line',4:'trying but not moving',3:'pretty rough',2:'barely holding on',1:'really struggling',0:'zero'}
const lab=v=>LABELS[Math.round(v)]
const fmt=v=>(v%1===0)?''+v:v.toFixed(1)

// THE SYSTEM AIMS YOU — automatically, from where you are.
export function aimFor(now){
  if(now>=10) return 10
  if(now<5)   return 5                       // focus: cross the line as fast as possible
  if(now<7)   return Math.min(10, now+1)     // a level up
  return Math.min(10, now+0.5)               // half a level when already high
}
export const isFocus = now => now < 5
function scoreColor(n){ if(n>=8)return'#3B6B9E'; if(n>=6.5)return'#5A8AB8'; if(n>=5)return'#8A8070'; if(n>=3)return'#8A7030'; return RED }

const pct = v => (v/10)*100

function Track({ d, now, onSet }){
  const ref = useRef(null)
  const aim = aimFor(now), focus = isFocus(now), reaching = aim > now
  function valAt(clientX){
    const r = ref.current.getBoundingClientRect()
    return Math.max(0, Math.min(10, Math.round(((clientX - r.left) / r.width) * 10)))
  }
  function down(e){ e.currentTarget.setPointerCapture?.(e.pointerId); onSet(valAt(e.clientX)) }
  function move(e){ if(e.buttons) onSet(valAt(e.clientX)) }

  const lo = Math.min(now, aim), hi = Math.max(now, aim)
  return (
    <div style={{ background:CARD, border:`1px solid ${focus?'rgba(138,48,48,0.45)':RULE}`, borderRadius:14, padding:'13px 16px 16px', marginBottom:10 }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:13 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <span style={{ width:9, height:9, borderRadius:'50%', background:d.hex }} />
          <b style={{ fontFamily:SERIF, fontWeight:600, fontSize:20, color:INK }}>{d.name}</b>
          {focus && <span style={{ fontFamily:SC, fontWeight:700, fontSize:10.5, letterSpacing:'0.12em', color:RED, border:'1px solid rgba(138,48,48,0.4)', borderRadius:20, padding:'1px 7px', marginLeft:3 }}>FOCUS</span>}
        </div>
        <div style={{ fontFamily:SC, fontWeight:600, fontSize:15, letterSpacing:'0.04em', color:META, whiteSpace:'nowrap' }}>
          <span style={{ color:INK }}>{fmt(now)}</span>
          {reaching
            ? <><span style={{ color:GHOST, margin:'0 5px' }}>→</span><span style={{ color:focus?RED:GOLD }}>{fmt(aim)}</span></>
            : <span style={{ color:GHOST, fontStyle:'italic' }}> · at the top</span>}
        </div>
      </div>
      <div style={{ fontSize:12.5, color:GHOST, marginTop:-7, marginBottom:12, minHeight:16 }}>
        {focus
          ? <><span style={{ color:RED, fontWeight:500 }}>below the line</span> · cross to <b style={{ color:GOLD, fontWeight:500 }}>5</b> first — this is the priority</>
          : reaching
            ? <>{lab(now)} · aim <b style={{ color:GOLD, fontWeight:500 }}>{fmt(aim)}</b> — {(aim-now)>=1?'a level':'half a level'} up</>
            : <>{lab(now)} · already at the top</>}
      </div>
      <div ref={ref} onPointerDown={down} onPointerMove={move}
        style={{ position:'relative', height:30, touchAction:'none', cursor:'pointer' }}>
        <div style={{ position:'absolute', top:'50%', left:0, right:0, height:4, transform:'translateY(-50%)', background:'rgba(15,21,35,0.10)', borderRadius:3 }} />
        <div style={{ position:'absolute', top:'50%', left:0, width:'50%', height:4, transform:'translateY(-50%)', background:'rgba(138,48,48,0.10)', borderRadius:'3px 0 0 3px' }} />
        <div style={{ position:'absolute', top:'50%', height:4, transform:'translateY(-50%)', borderRadius:3, left:pct(lo)+'%', width:pct(hi-lo)+'%', background:focus?'rgba(138,48,48,0.30)':'rgba(200,146,42,0.34)' }} />
        <div style={{ position:'absolute', top:'50%', left:'50%', width:2, height:16, transform:'translate(-50%,-50%)', background:'rgba(15,21,35,0.30)' }} />
        <div style={{ position:'absolute', top:'calc(50% + 12px)', left:'50%', transform:'translateX(-50%)', fontFamily:SC, fontSize:10, letterSpacing:'0.08em', color:GHOST, whiteSpace:'nowrap' }}>THE LINE</div>
        {reaching && <div style={{ position:'absolute', top:'50%', left:pct(aim)+'%', width:15, height:15, transform:'translate(-50%,-50%)', borderRadius:'50%', background:CARD, border:`2.5px solid ${focus?RED:CHROME}`, boxShadow:'0 1px 4px rgba(15,21,35,0.18)', pointerEvents:'none' }} />}
        <div style={{ position:'absolute', top:'50%', left:pct(now)+'%', width:26, height:26, transform:'translate(-50%,-50%)', borderRadius:'50%', background:scoreColor(now), border:'2px solid #FFFFFF', boxShadow:'0 1px 5px rgba(15,21,35,0.28)', cursor:'grab', zIndex:3 }} />
      </div>
    </div>
  )
}

export default function FirstLight(){
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const dest = params.get('from') || '/'   // a personal-rail gate sends people back to what they reached for
  const [phase, setPhase] = useState('cover')   // cover | place
  const [scores, setScores] = useState(() => Object.fromEntries(SELF_DOMAINS.map(d => [d.key, 5])))
  const [saving, setSaving] = useState(false)

  const aims = Object.fromEntries(SELF_DOMAINS.map(d => [d.key, aimFor(scores[d.key])]))
  const below = SELF_DOMAINS.filter(d => isFocus(scores[d.key]))
  const setOne = (key, v) => setScores(s => ({ ...s, [key]: v }))

  async function finish(){
    setSaving(true)
    try {
      if (user) await supabase.from('users').update({
        first_light_completed_at: new Date().toISOString(),
        welcome_scores: scores,
      }).eq('id', user.id)
    } catch (e) { console.error('First Light save error:', e) }
    finally { setSaving(false); navigate(dest, { replace:true }) }
  }
  async function skip(){
    try { if (user) await supabase.from('users').update({ first_light_skipped_at: new Date().toISOString() }).eq('id', user.id) }
    catch {}
    navigate(dest, { replace:true })
  }

  const wrap = { maxWidth:480, margin:'0 auto', padding:'26px 22px 150px' }
  const cover = phase === 'cover'

  return (
    <div style={{ minHeight:'100dvh', background:BG, color:INK, fontFamily:LORA }}>
      <div style={wrap}>
        <div style={{ fontFamily:SC, fontWeight:600, letterSpacing:'0.20em', textTransform:'uppercase', fontSize:13, color:GOLD }}>
          {cover ? 'The personal side' : 'Light it up'}
        </div>
        <h1 style={{ fontFamily:SERIF, fontWeight:500, fontSize:34, lineHeight:1.06, letterSpacing:'-0.01em', margin:'10px 0 8px' }}>Your first light</h1>
        <p style={{ fontSize:16, color:META, margin:'0 0 4px' }}>
          {cover
            ? <>Two minutes to wake up the personal side. Mark where each part of life is now — the system points you at the next move on its own.</>
            : <>Mark where each part of life is <b style={{ color:INK, fontWeight:500 }}>now</b>. The system <span style={{ color:GOLD }}>aims you</span> — above the line fast where you&rsquo;re under it, a level up where you&rsquo;re over it.</>}
        </p>

        {/* the wheel */}
        <div style={{ background:CARD, border:`1px solid ${RULE}`, borderRadius:14, padding:'16px 12px 10px', margin:'16px 0 6px', position:'relative' }}>
          <div style={{ opacity:cover?0.42:1, filter:cover?'saturate(0.45)':'none', transition:'opacity .5s ease, filter .5s ease' }}>
            <Wheel domains={SELF_DOMAINS} now={scores} headed={cover ? null : aims} size={300} />
          </div>
          {!cover && (
            <div style={{ fontSize:15, color:META, textAlign:'center', margin:'10px 8px 4px', lineHeight:1.42, minHeight:42 }}>
              {below.length > 0
                ? <>Your focus: {below.map((d,i)=><span key={d.key}><span style={{ color:RED, fontWeight:500 }}>{d.name}</span>{i<below.length-1?(i===below.length-2?' and ':', '):''}</span>)} — under the line, so the aim is to cross to <b style={{ color:GOLD, fontWeight:500 }}>5</b> as fast as possible, before anything above gets pushed.</>
                : <>Everything&rsquo;s above the line. The system&rsquo;s pointing each a level up — the Map is where you set real targets.</>}
            </div>
          )}
          {cover && (
            <div style={{ position:'absolute', top:'46%', left:'50%', transform:'translate(-50%,-50%)', zIndex:5, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <button onClick={() => setPhase('place')} style={{ fontFamily:SC, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', fontSize:16, color:'#fff', background:GOLD, border:'none', borderRadius:40, padding:'16px 40px', cursor:'pointer', boxShadow:'0 6px 22px -6px rgba(168,114,26,0.7), 0 0 0 6px rgba(200,146,42,0.12)' }}>Start</button>
              <span style={{ fontFamily:LORA, fontSize:12.5, color:META, background:'rgba(250,250,247,0.86)', padding:'2px 10px', borderRadius:20 }}>about two minutes</span>
            </div>
          )}
        </div>

        {!cover && (
          <>
            <div style={{ marginTop:18 }}>
              {SELF_DOMAINS.map(d => <Track key={d.key} d={d} now={scores[d.key]} onSet={v => setOne(d.key, v)} />)}
            </div>
            <p style={{ fontSize:13, color:GHOST, textAlign:'center', marginTop:16, fontStyle:'italic' }}>
              The system aims you until the Map. The Map is where you set real targets.
            </p>
            <div style={{ position:'fixed', left:0, right:0, bottom:0, padding:'14px 22px calc(16px + env(safe-area-inset-bottom))', background:'linear-gradient(to top, #FAFAF7 72%, rgba(250,250,247,0))' }}>
              <div style={{ maxWidth:480, margin:'0 auto' }}>
                <button onClick={finish} disabled={saving} style={{ width:'100%', padding:16, border:'none', borderRadius:40, background:GOLD, color:'#fff', fontFamily:SC, fontWeight:700, letterSpacing:'0.14em', fontSize:16, textTransform:'uppercase', cursor:saving?'default':'pointer', opacity:saving?0.6:1 }}>
                  {saving ? 'Saving…' : 'This is my starting line →'}
                </button>
                <button onClick={skip} style={{ display:'block', width:'100%', textAlign:'center', background:'none', border:'none', marginTop:10, fontFamily:LORA, fontSize:13.5, color:GHOST, textDecoration:'underline', cursor:'pointer' }}>Not now</button>
              </div>
            </div>
          </>
        )}

        {cover && (
          <button onClick={skip} style={{ display:'block', width:'100%', textAlign:'center', background:'none', border:'none', marginTop:18, fontFamily:LORA, fontSize:13.5, color:GHOST, textDecoration:'underline', cursor:'pointer' }}>Not now</button>
        )}
      </div>
    </div>
  )
}
