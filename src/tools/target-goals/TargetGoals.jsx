import { useState, useRef, useEffect } from 'react'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'

const DOMAINS = [
  { id: 'path',          label: 'Path',          question: 'Am I walking my path \u2014 or just walking?',                    description: 'Your calling, contribution & the work you\u2019re here to do' },
  { id: 'spark',         label: 'Spark',         question: 'Is the fire on?',                                                  description: 'The animating fire \u2014 aliveness, joy, play & the godspark' },
  { id: 'body',          label: 'Body',          question: 'How is this living system doing?',                                 description: 'Physical vitality, health, energy & embodiment' },
  { id: 'finances',      label: 'Finances',      question: 'Do I have the agency to act on what matters?',                    description: 'Your relationship with money, resources & abundance' },
  { id: 'relationships', label: 'Relationships', question: 'Am I truly known by anyone?',                                     description: 'Intimacy, friendship, community & belonging' },
  { id: 'inner_game',    label: 'Inner Game',    question: 'Are my stories tending me, or running me?',                       description: 'Your relationship with yourself \u2014 beliefs, values & self-trust' },
  { id: 'outer_game',    label: 'Outer Game',    question: 'Is what I\u2019m broadcasting aligned with who I actually am?',   description: 'How you show up in the world \u2014 presence, expression & public identity' },
]

const TIER_LABELS = { 10:'World-Class',9:'Exemplar',8:'Fluent',7:'Capable',6:'Functional',5:'Threshold',4:'Friction',3:'Strain',2:'Crisis',1:'Emergency',0:'Ground Zero' }

function getTierColor(n) {
  if (n >= 9) return '#3B6B9E'
  if (n >= 7) return '#5A8AB8'
  if (n >= 5) return '#8A8070'
  if (n >= 3) return '#8A7030'
  return '#8A3030'
}

const sc    = { fontFamily:"var(--font-sc)" }
const serif = { fontFamily:"var(--font-body)" }
const gold  = { color:"var(--gold-dk)" }
const muted = { color:"var(--text-muted)" }
const meta  = { color:"var(--text-meta)" }

function Eyebrow({children}){ return <span style={{...sc,fontSize:'0.6875rem',letterSpacing:'0.2em',...gold,textTransform:'uppercase',display:'block',marginBottom:'12px'}}>{children}</span> }
function Rule(){ return <hr style={{border:'none',borderTop:'1px solid rgba(200,146,42,0.2)',margin:'20px 0'}}/> }
function Btn({onClick,disabled,children,ghost,style={}}){
  const base = ghost
    ? {...serif,fontSize:'0.9375rem',fontStyle:'italic',...muted,background:'none',border:'none',cursor:'pointer',padding:'10px 0'}
    : {...sc,fontSize:'0.875rem',letterSpacing:'0.14em',...gold,background:'rgba(200,146,42,0.05)',border:'1.5px solid rgba(200,146,42,0.78)',borderRadius:'40px',padding:'12px 28px',cursor:'pointer'}
  return <button onClick={onClick} disabled={disabled} style={{...base,opacity:disabled?0.35:1,cursor:disabled?'not-allowed':'pointer',...style}}>{children}</button>
}

function DomainWheel({scores,size=240}){
  const cx=size/2,cy=size/2,maxR=(size/2)*0.72,n=DOMAINS.length
  function pt(i,v){const a=(Math.PI*2*i)/n-Math.PI/2,r=(v/10)*maxR;return[cx+r*Math.cos(a),cy+r*Math.sin(a)]}
  const rings=[2,4,6,8,10].map(v=>{const pts=DOMAINS.map((_,i)=>pt(i,v).join(',')).join(' ');return<polygon key={v} points={pts} fill="none" stroke="rgba(200,146,42,0.10)" strokeWidth="1"/>})
  const axes=DOMAINS.map((_,i)=>{const[x,y]=pt(i,10);return<line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(200,146,42,0.12)" strokeWidth="1"/>})
  const polyPts=DOMAINS.map((d,i)=>pt(i,scores[d.id]??5).join(',')).join(' ')
  const vals=Object.values(scores).filter(v=>v!==undefined)
  const avg=vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1):null
  const avgCol=avg?getTierColor(parseFloat(avg)):'var(--gold-dk)'
  const labels=DOMAINS.map((d,i)=>{
    const a=(Math.PI*2*i)/n-Math.PI/2,r=maxR+20,x=cx+r*Math.cos(a),y=cy+r*Math.sin(a)
    const s=scores[d.id],col=s!==undefined?getTierColor(s):'rgba(15,21,35,0.35)'
    return<text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontFamily="'Cormorant SC',Georgia,serif" fontSize="8" fontWeight="600" letterSpacing="1" fill={col}>{d.label.toUpperCase()}</text>
  })
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'6px'}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{rings}{axes}<polygon points={polyPts} fill="rgba(200,146,42,0.12)" stroke="rgba(200,146,42,0.78)" strokeWidth="1.5"/>{labels}</svg>
      {avg&&<div style={{...serif,fontSize:'0.875rem',color:avgCol,fontWeight:600}}>{avg} {'\u00B7'} {TIER_LABELS[Math.round(parseFloat(avg))]||''}</div>}
    </div>
  )
}

function HourglassPicker({domainId,onScore}){
  const [hov,setHov]=useState(null)
  const nums=[10,9,8,7,6,5,4,3,2,1,0]
  const minW=38,maxW=100
  function getW(n){return Math.round(minW+(maxW-minW)*Math.pow((n-5)/5,2))}
  return(
    <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
      {nums.map(n=>{
        const col=getTierColor(n),w=getW(n),isTh=n===5
        return(
          <div key={n} style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'20px',textAlign:'right',...sc,fontSize:'0.6875rem',letterSpacing:'0.06em',color:isTh?'var(--gold-dk)':'var(--text-muted)',fontWeight:isTh?600:400}}>{n}</div>
            <div style={{flex:1,display:'flex',alignItems:'center',position:'relative',height:'28px'}}>
              <div style={{position:'absolute',left:0,right:0,height:'1px',background:'rgba(200,146,42,0.08)'}}/>
              <button onMouseEnter={()=>setHov(n)} onMouseLeave={()=>setHov(null)} onClick={()=>onScore(domainId,n)}
                style={{position:'absolute',left:'50%',transform:'translateX(-50%)',width:`${w}%`,height:'22px',background:hov===n?col:`${col}20`,border:`1px solid ${hov===n?col:`${col}44`}`,borderRadius:'4px',cursor:'pointer',transition:'all 0.15s'}}/>
            </div>
            <div style={{width:'80px',...serif,fontSize:'0.625rem',color:isTh?'var(--gold-dk)':col,letterSpacing:'0.04em',whiteSpace:'nowrap'}}>{isTh?'\u2014 Threshold':TIER_LABELS[n]}</div>
          </div>
        )
      })}
    </div>
  )
}

function AuthModal(){
  const r=encodeURIComponent(window.location.href)
  return(
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(15,21,35,0.55)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <div style={{background:'#FAFAF7',border:'1.5px solid rgba(200,146,42,0.78)',borderRadius:'14px',padding:'40px 32px 32px',maxWidth:'400px',width:'100%',textAlign:'center'}}>
        <span style={{display:'block',...sc,fontSize:'0.625rem',letterSpacing:'0.22em',...gold,textTransform:'uppercase',marginBottom:'14px'}}>Target Goals</span>
        <h2 style={{...sc,fontSize:'1.375rem',fontWeight:400,color:'var(--text)',marginBottom:'10px'}}>Sign in to begin.</h2>
        <p style={{...serif,fontSize:'0.9375rem',fontStyle:'italic',...meta,lineHeight:1.7,marginBottom:'24px'}}>Your goals and milestones are saved to your profile.</p>
        <a href={`/login.html?redirect=${r}`} style={{display:'block',padding:'14px',borderRadius:'40px',border:'1.5px solid rgba(200,146,42,0.78)',background:'rgba(200,146,42,0.05)',...gold,...sc,fontSize:'0.875rem',letterSpacing:'0.14em',textDecoration:'none'}}>Sign in or create account {'\u2192'}</a>
      </div>
    </div>
  )
}

function PhaseSetup({scores,setScores,onComplete}){
  const [active,setActive]=useState(0)
  const [summary,setSummary]=useState(false)
  const allScored=DOMAINS.every(d=>scores[d.id]!==undefined)
  const scoredCount=DOMAINS.filter(d=>scores[d.id]!==undefined).length

  function handleScore(domainId,n){
    const next={...scores,[domainId]:n}
    setScores(next)
    const cur=DOMAINS.findIndex(d=>d.id===domainId)
    const nxt=DOMAINS.findIndex((d,i)=>i>cur&&next[d.id]===undefined)
    if(nxt!==-1)setActive(nxt)
  }

  if(summary){
    return(
      <div>
        <Eyebrow>Life OS {'\u00B7'} Target Goals</Eyebrow>
        <h1 style={{...sc,fontSize:'clamp(1.75rem,4vw,2.5rem)',fontWeight:400,color:'var(--text)',lineHeight:1.1,marginBottom:'12px'}}>Your starting point.</h1>
        <Rule/>
        <p style={{...serif,fontSize:'1rem',...meta,lineHeight:1.75,marginBottom:'20px'}}>This is where you are right now. Honest is better than aspirational.</p>
        <div style={{display:'flex',justifyContent:'center',marginBottom:'24px'}}><DomainWheel scores={scores} size={260}/></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:'10px',marginBottom:'24px'}}>
          {DOMAINS.map(d=>{const s=scores[d.id],col=getTierColor(s);return(
            <div key={d.id} style={{padding:'12px',border:`1px solid ${col}44`,background:`${col}14`,borderRadius:'8px',textAlign:'center'}}>
              <div style={{...sc,fontSize:'0.5625rem',letterSpacing:'0.1em',...muted,marginBottom:'4px'}}>{d.label}</div>
              <div style={{...sc,fontSize:'1.25rem',fontWeight:600,color:col}}>{s}</div>
              <div style={{...serif,fontSize:'0.5625rem',color:col,marginTop:'2px'}}>{TIER_LABELS[s]}</div>
            </div>
          )})}
        </div>
        <div style={{display:'flex',gap:'12px'}}>
          <Btn ghost onClick={()=>setSummary(false)}>{'\u2190'} Adjust</Btn>
          <Btn onClick={onComplete} style={{flex:1}}>Choose my focus areas {'\u2192'}</Btn>
        </div>
      </div>
    )
  }

  const d=DOMAINS[active]
  return(
    <div>
      <Eyebrow>Life OS {'\u00B7'} Target Goals</Eyebrow>
      <h1 style={{...sc,fontSize:'clamp(1.75rem,4vw,2.5rem)',fontWeight:400,color:'var(--text)',lineHeight:1.1,marginBottom:'12px'}}>Where are you right now?</h1>
      <Rule/>
      <p style={{...serif,fontSize:'1rem',...meta,lineHeight:1.75,marginBottom:'16px'}}>Rate yourself honestly across all seven areas. 0 is serious trouble. 10 is exactly where you want to be.</p>
      <div style={{display:'flex',justifyContent:'center',marginBottom:'16px'}}><DomainWheel scores={scores} size={220}/></div>
      <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'14px'}}>
        {DOMAINS.map((dom,i)=>{const s=scores[dom.id],isA=i===active,col=s!==undefined?getTierColor(s):null;return(
          <button key={dom.id} onClick={()=>setActive(i)} style={{...sc,fontSize:'0.5625rem',letterSpacing:'0.08em',padding:'5px 10px',borderRadius:'20px',border:`1px solid ${isA?'rgba(200,146,42,0.78)':col?`${col}44`:'rgba(200,146,42,0.2)'}`,background:isA?'rgba(200,146,42,0.08)':col?`${col}14`:'transparent',color:isA?'var(--gold-dk)':col||'var(--text-muted)',cursor:'pointer'}}>{dom.label}{s!==undefined?` \u00B7 ${s}`:''}</button>
        )})}
      </div>
      <div style={{marginBottom:'12px'}}>
        <div style={{...sc,fontSize:'1rem',fontWeight:600,letterSpacing:'0.1em',color:'var(--text)',marginBottom:'4px'}}>{d.label}</div>
        <div style={{...serif,fontSize:'0.875rem',fontStyle:'italic',...meta,lineHeight:1.6}}>{d.description}</div>
      </div>
      <HourglassPicker domainId={d.id} onScore={handleScore}/>
      <div style={{marginTop:'20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{...sc,fontSize:'0.5625rem',letterSpacing:'0.14em',...muted}}>{scoredCount} OF 7</span>
        {allScored&&<Btn onClick={()=>setSummary(true)}>Review {'\u2192'}</Btn>}
      </div>
    </div>
  )
}

function PhaseSelect({scores,selectedDomains,setSelectedDomains,recommendation,onContinue}){
  const rec=recommendation
  return(
    <div>
      <Eyebrow>Phase 1 {'\u00B7'} Focus Areas</Eyebrow>
      <h1 style={{...sc,fontSize:'clamp(1.75rem,4vw,2.5rem)',fontWeight:400,color:'var(--text)',lineHeight:1.1,marginBottom:'12px'}}>Choose three areas.</h1>
      <Rule/>
      <p style={{...serif,fontSize:'1rem',...meta,lineHeight:1.75,marginBottom:'16px'}}>{rec?'The \u2606 mark shows what the AI suggests. Choose three \u2014 you have the final say.':'Choose three areas where focused effort over the next quarter would matter most.'}</p>
      {rec?.soft_observation&&<div style={{padding:'12px 16px',background:'rgba(200,146,42,0.05)',border:'1px solid rgba(200,146,42,0.25)',borderRadius:'8px',...serif,fontSize:'0.875rem',fontStyle:'italic',...meta,marginBottom:'16px'}}>{rec.soft_observation}</div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'10px',marginBottom:'24px'}}>
        {DOMAINS.map(d=>{
          const sel=selectedDomains.includes(d.id),isRec=rec?.recommended?.includes(d.id),rat=rec?.rationale?.[d.id],s=scores[d.id],dis=!sel&&selectedDomains.length>=3,col=s!==undefined?getTierColor(s):null
          return(
            <div key={d.id} onClick={()=>{if(dis)return;setSelectedDomains(p=>p.includes(d.id)?p.filter(x=>x!==d.id):[...p,d.id])}}
              style={{padding:'14px',border:`1.5px solid ${sel?'rgba(200,146,42,0.78)':'rgba(200,146,42,0.2)'}`,borderRadius:'10px',background:sel?'rgba(200,146,42,0.06)':'#FFFFFF',cursor:dis?'not-allowed':'pointer',opacity:dis?0.45:1,transition:'all 0.2s'}}>
              <div style={{...sc,fontSize:'0.8125rem',letterSpacing:'0.08em',color:sel?'var(--gold-dk)':'var(--text)',marginBottom:'6px'}}>{d.label}{isRec?' \u2606':''}</div>
              <div style={{...serif,fontSize:'0.8125rem',fontStyle:'italic',...muted,lineHeight:1.55,marginBottom:s!==undefined?'10px':0}}>{rat||d.question}</div>
              {s!==undefined&&<><div style={{height:'3px',background:'rgba(200,146,42,0.12)',borderRadius:'2px',overflow:'hidden',marginBottom:'4px'}}><div style={{height:'100%',width:`${s*10}%`,background:col,borderRadius:'2px'}}/></div><div style={{...sc,fontSize:'0.5625rem',letterSpacing:'0.08em',color:col}}>{s} {'\u00B7'} {TIER_LABELS[s]}</div></>}
            </div>
          )
        })}
      </div>
      <Btn onClick={onContinue} disabled={selectedDomains.length!==3}>Set my quarter {'\u2192'}</Btn>
    </div>
  )
}

function PhaseQuarter({quarterType,setQuarterType,setTargetDate,setEndDateLabel,onContinue}){
  const today=new Date(),month=today.getMonth()
  const rolling=new Date(today);rolling.setDate(rolling.getDate()+90)
  let qEnd
  if(month<3)qEnd=new Date(today.getFullYear(),2,31)
  else if(month<6)qEnd=new Date(today.getFullYear(),5,30)
  else if(month<9)qEnd=new Date(today.getFullYear(),8,30)
  else qEnd=new Date(today.getFullYear(),11,31)
  const fmt=d=>d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})
  const qL=month<3?'Q1':month<6?'Q2':month<9?'Q3':'Q4'
  const calDays=Math.round((qEnd-today)/(1000*60*60*24))

  function select(t){
    setQuarterType(t)
    if(t==='rolling'){setTargetDate(rolling.toISOString().slice(0,10));setEndDateLabel(`90 days \u2014 ${fmt(rolling)}`)}
    else{setTargetDate(qEnd.toISOString().slice(0,10));setEndDateLabel(`${qL} end \u2014 ${fmt(qEnd)} (${calDays} days)`)}
  }

  return(
    <div>
      <Eyebrow>Phase 1 {'\u00B7'} Timeline</Eyebrow>
      <h2 style={{...sc,fontSize:'1.5rem',fontWeight:400,color:'var(--text)',lineHeight:1.15,marginBottom:'12px'}}>When does this quarter end?</h2>
      <Rule/>
      <p style={{...serif,fontSize:'1rem',...meta,lineHeight:1.75,marginBottom:'16px'}}>Choose a target date. Both work \u2014 this is about what rhythm fits your life.</p>
      <div style={{display:'flex',flexDirection:'column',gap:'12px',marginBottom:'24px'}}>
        {[{type:'rolling',title:'Rolling 90 days',date:fmt(rolling),desc:'Starts today. 90 days of focused movement.'},{type:'calendar',title:'Calendar quarter',date:fmt(qEnd),desc:`${qL} end \u2014 syncs with how the year flows.`}].map(o=>(
          <div key={o.type} onClick={()=>select(o.type)} style={{padding:'20px 22px',border:`1.5px solid ${quarterType===o.type?'rgba(200,146,42,0.78)':'rgba(200,146,42,0.2)'}`,borderRadius:'10px',background:quarterType===o.type?'rgba(200,146,42,0.06)':'#FFFFFF',cursor:'pointer',transition:'all 0.2s'}}>
            <div style={{...sc,fontSize:'0.875rem',letterSpacing:'0.08em',color:quarterType===o.type?'var(--gold-dk)':'var(--text)',marginBottom:'4px'}}>{o.title}</div>
            <div style={{...sc,fontSize:'1rem',...gold,marginBottom:'4px'}}>{o.date}</div>
            <div style={{...serif,fontSize:'0.875rem',fontStyle:'italic',...muted}}>{o.desc}</div>
          </div>
        ))}
      </div>
      <Btn onClick={onContinue} disabled={!quarterType}>Set my targets {'\u2192'}</Btn>
    </div>
  )
}

function PhaseHorizonGap({selectedDomains,scores,horizonGapData,setHorizonGapData,onComplete}){
  const [idx,setIdx]=useState(0)
  const [cur,setCur]=useState('')
  const [gap,setGap]=useState('')
  const domainId=selectedDomains[idx],domain=DOMAINS.find(d=>d.id===domainId),score=scores[domainId],col=score!==undefined?getTierColor(score):'var(--gold-dk)',total=selectedDomains.length

  useEffect(()=>{const e=horizonGapData[domainId]||{};setCur(e.current||'');setGap(e.gap||'')},[idx,domainId])

  function next(){
    const n={...horizonGapData,[domainId]:{current:cur,gap}}
    setHorizonGapData(n)
    if(idx<total-1)setIdx(i=>i+1)
    else onComplete(n)
  }
  function back(){setHorizonGapData(p=>({...p,[domainId]:{current:cur,gap}}));setIdx(i=>i-1)}

  return(
    <div>
      {selectedDomains.slice(0,idx).map(id=>{const d=DOMAINS.find(x=>x.id===id),hg=horizonGapData[id];return(
        <div key={id} style={{padding:'12px 14px',border:'1px solid rgba(200,146,42,0.18)',borderRadius:'8px',marginBottom:'10px',opacity:0.7}}>
          <div style={{...sc,fontSize:'0.5625rem',letterSpacing:'0.12em',...gold,marginBottom:'4px'}}>{d?.label} {'\u2713'}</div>
          <div style={{...serif,fontSize:'0.875rem',fontStyle:'italic',...meta,lineHeight:1.55}}>{hg?.gap||''}</div>
        </div>
      )})}
      <Eyebrow>Horizon Gap {'\u00B7'} {idx+1} of {total}</Eyebrow>
      <h2 style={{...sc,fontSize:'1.5rem',fontWeight:400,color:'var(--text)',lineHeight:1.15,marginBottom:'12px'}}>{domain?.label}</h2>
      <Rule/>
      <p style={{...serif,fontSize:'1rem',...meta,lineHeight:1.75,marginBottom:'16px'}}>Before we build the goal, let{'\u2019'}s name what{'\u2019'}s actually true \u2014 and what{'\u2019'}s in the way.</p>
      {score!==undefined&&<div style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'7px 14px',borderRadius:'40px',border:`1.5px solid ${col}44`,background:`${col}14`,marginBottom:'16px'}}><span style={{...sc,fontSize:'0.625rem',letterSpacing:'0.12em',color:col}}>{score} {'\u00B7'} {TIER_LABELS[score]}</span></div>}
      <div style={{marginBottom:'16px'}}>
        <label style={{...sc,fontSize:'0.5625rem',letterSpacing:'0.2em',...gold,textTransform:'uppercase',display:'block',marginBottom:'8px'}}>Where are you honestly, right now?</label>
        <textarea style={{width:'100%',padding:'12px 14px',...serif,fontSize:'0.9375rem',...meta,background:'#FFFFFF',border:'1px solid rgba(200,146,42,0.25)',borderRadius:'8px',outline:'none',resize:'vertical',lineHeight:1.65,minHeight:'72px'}} value={cur} onChange={e=>setCur(e.target.value)} placeholder={`Describe your current reality. Not where you want to be \u2014 where you actually are.`}/>
      </div>
      <div style={{marginBottom:'22px'}}>
        <label style={{...sc,fontSize:'0.5625rem',letterSpacing:'0.2em',...gold,textTransform:'uppercase',display:'block',marginBottom:'8px'}}>What{'\u2019'}s the gap \u2014 what{'\u2019'}s actually in the way?</label>
        <textarea style={{width:'100%',padding:'12px 14px',...serif,fontSize:'0.9375rem',...meta,background:'#FFFFFF',border:'1px solid rgba(200,146,42,0.25)',borderRadius:'8px',outline:'none',resize:'vertical',lineHeight:1.65,minHeight:'72px'}} value={gap} onChange={e=>setGap(e.target.value)} placeholder={`What pattern, belief, or circumstance is holding you at ${score!==undefined?score:'?'}/10?`}/>
      </div>
      <div style={{display:'flex',gap:'12px'}}>
        {idx>0&&<Btn ghost onClick={back}>{'\u2190'} Back</Btn>}
        <Btn onClick={next} style={{flex:1}}>{idx<total-1?'Next domain \u2192':'Build my goals \u2192'}</Btn>
      </div>
    </div>
  )
}

function PhaseRefine({selectedDomains,scores,mapData,horizonGapData,endDateLabel,completedDomains,onGoalSaved}){
  const [msgs,setMsgs]=useState([])
  const [input,setInput]=useState('')
  const [thinking,setThinking]=useState(false)
  const startedRef=useRef(false)
  const bottomRef=useRef(null)
  const taRef=useRef(null)
  const domainId=selectedDomains[0],domain=DOMAINS.find(d=>d.id===domainId)

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'})},[msgs,thinking])
  useEffect(()=>{if(startedRef.current)return;startedRef.current=true;start()},[])

  async function call(m){
    const s=scores[domainId],dd=mapData?.domainData?.[domainId],hg=horizonGapData[domainId]
    const res=await fetch('/tools/target-goals/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'refine',domain:domainId,domainScore:dd?.placement||null,currentScore:s,targetDate:endDateLabel,horizonCurrent:hg?.current||null,horizonGap:hg?.gap||null,messages:m,completedDomains})})
    if(!res.ok)throw new Error(`API ${res.status}`)
    return res.json()
  }

  async function start(){
    setThinking(true)
    try{const d=await call([{role:'user',content:'START'}]);setThinking(false);if(d.message)setMsgs([{role:'assistant',content:d.message}])}
    catch{setThinking(false);setMsgs([{role:'assistant',content:'Something went wrong. Please refresh and try again.'}])}
  }

  async function send(){
    const text=input.trim();if(!text||thinking)return
    const um={role:'user',content:text},next=[...msgs,um]
    setMsgs(next);setInput('');if(taRef.current)taRef.current.style.height='auto';setThinking(true)
    try{
      const d=await call(next.filter(m=>m.role==='user'||m.role==='assistant'))
      setThinking(false)
      if(d.complete&&d.data)onGoalSaved(domainId,d.data)
      else if(d.message)setMsgs(p=>[...p,{role:'assistant',content:d.message}])
    }catch{setThinking(false);setMsgs(p=>[...p,{role:'assistant',content:'Something went wrong. Please try again.'}])}
  }

  const doneCards=completedDomains.map(d=>{const dl=DOMAINS.find(x=>x.id===d.domain);return(
    <div key={d.domain} style={{padding:'12px 14px',border:'1px solid rgba(200,146,42,0.18)',borderRadius:'8px',marginBottom:'10px'}}>
      <div style={{...sc,fontSize:'0.5625rem',letterSpacing:'0.12em',...gold,marginBottom:'4px'}}>{dl?.label} {'\u2713'}</div>
      <div style={{...serif,fontSize:'0.875rem',...meta,lineHeight:1.55}}>{d.outcome_user||d.outcome_system}</div>
    </div>
  )})

  return(
    <div>
      {doneCards}
      <Eyebrow>Area {completedDomains.length+1} of {completedDomains.length+selectedDomains.length} {'\u00B7'} {domain?.label}</Eyebrow>
      <h2 style={{...sc,fontSize:'1.5rem',fontWeight:400,color:'var(--text)',lineHeight:1.15,marginBottom:'12px'}}>Let{'\u2019'}s build your {domain?.label} goal.</h2>
      <Rule/>
      <div className="chat-thread" style={{marginBottom:'16px'}}>
        {msgs.map((m,i)=><div key={i} className={`bubble bubble-${m.role}`}>{m.content}</div>)}
        {thinking&&<div className="bubble bubble-assistant"><div className="typing-indicator"><span/><span/><span/></div></div>}
        <div ref={bottomRef}/>
      </div>
      <div className="input-area">
        <textarea ref={taRef} value={input} onChange={e=>{setInput(e.target.value);if(taRef.current){taRef.current.style.height='auto';taRef.current.style.height=`${Math.min(taRef.current.scrollHeight,140)}px`}}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder={'Write your response here\u2026'} rows={3} disabled={thinking}/>
        <button className="btn-send" onClick={send} disabled={!input.trim()||thinking}>Send</button>
      </div>
    </div>
  )
}

function PhaseComplete({completedDomains,scores,endDateLabel,targetDate}){
  const [editOpen,setEditOpen]=useState({})
  const [editText,setEditText]=useState({})
  const [calType,setCalType]=useState('google')

  function fmtDate(d){return`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`}
  function calLink(t,e){const dt=fmtDate(e.date),ti=encodeURIComponent(`Life OS: ${e.label}`),tx=encodeURIComponent(e.text||'');return t==='google'?`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${ti}&dates=${dt}/${dt}&details=${tx}`:`webcal://calendar.apple.com/calendar/event?title=${ti}&start-date=${dt}&notes=${tx}`}

  const calEvents=targetDate?completedDomains.flatMap(d=>{const dl=DOMAINS.find(x=>x.id===d.domain)?.label||d.domain,base=new Date(targetDate),m1=new Date(base),m2=new Date(base),m3=new Date(base);m1.setDate(m1.getDate()-60);m2.setDate(m2.getDate()-30);return[{label:`${dl} \u2014 Month 1`,text:d.month1,date:m1},{label:`${dl} \u2014 Month 2`,text:d.month2,date:m2},{label:`${dl} \u2014 Month 3`,text:d.month3,date:m3}]}):[]

  return(
    <div>
      <div style={{textAlign:'center',marginBottom:'28px',padding:'24px 0'}}>
        <div style={{...sc,fontSize:'1.25rem',...gold,marginBottom:'8px'}}>{'\u2726'}</div>
        <span style={{...sc,fontSize:'0.6875rem',letterSpacing:'0.2em',...gold,textTransform:'uppercase',display:'block',marginBottom:'8px'}}>Quarter set</span>
        <h1 style={{...sc,fontSize:'clamp(1.5rem,3vw,2rem)',fontWeight:400,color:'var(--text)',lineHeight:1.1,marginBottom:'12px'}}>{endDateLabel||'90 days ahead'}</h1>
        <p style={{...serif,fontSize:'0.9375rem',fontStyle:'italic',...meta,lineHeight:1.75,maxWidth:'480px',margin:'0 auto'}}>The goal is not the point \u2014 what you become moving toward it is. Three areas. One quarter. Let{'\u2019'}s see what moves.</p>
      </div>

      {completedDomains.map(d=>{
        const dl=DOMAINS.find(x=>x.id===d.domain),outcome=editText[d.domain]!==undefined?editText[d.domain]:(d.outcome_user||d.outcome_system),s=scores[d.domain],col=s!==undefined?getTierColor(s):'var(--gold-dk)'
        return(
          <div key={d.domain} style={{background:'#FFFFFF',border:'1px solid rgba(200,146,42,0.2)',borderRadius:'12px',padding:'20px 22px',marginBottom:'14px'}}>
            <div style={{...sc,fontSize:'0.8125rem',letterSpacing:'0.1em',color:col,marginBottom:'4px'}}>{dl?.label}</div>
            {s!==undefined&&<div style={{...sc,fontSize:'0.5625rem',letterSpacing:'0.1em',color:col,marginBottom:'10px'}}>{s} {'\u00B7'} {TIER_LABELS[s]}</div>}
            <p style={{...serif,fontSize:'1rem',...meta,lineHeight:1.75,marginBottom:'14px'}}>{outcome}</p>
            {d.horizon_gap?.gap&&<div style={{padding:'10px 14px',borderRadius:'8px',background:'rgba(200,146,42,0.04)',border:'1px solid rgba(200,146,42,0.18)',marginBottom:'14px'}}><div style={{...sc,fontSize:'0.5rem',letterSpacing:'0.14em',...muted,marginBottom:'4px'}}>HORIZON GAP</div><div style={{...serif,fontSize:'0.875rem',fontStyle:'italic',...meta,lineHeight:1.6}}>{d.horizon_gap.gap}</div></div>}
            <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'14px'}}>
              {[{l:'Month 3',t:d.month3,w:d.month3_why},{l:'Month 2',t:d.month2,w:d.month2_why},{l:'Month 1',t:d.month1,w:d.month1_why}].map(m=>(
                <div key={m.l} style={{display:'flex',gap:'12px'}}>
                  <span style={{...sc,fontSize:'0.5rem',letterSpacing:'0.1em',...muted,flexShrink:0,paddingTop:'3px',width:'52px'}}>{m.l}</span>
                  <div><div style={{...serif,fontSize:'0.9375rem',...meta,lineHeight:1.6}}>{m.t}</div>{m.w&&<div style={{...serif,fontSize:'0.8125rem',fontStyle:'italic',...muted,lineHeight:1.55,marginTop:'2px'}}>{m.w}</div>}</div>
                </div>
              ))}
            </div>
            {d.tea&&<div style={{padding:'12px 14px',borderRadius:'8px',background:'rgba(200,146,42,0.03)',border:'1px solid rgba(200,146,42,0.15)',marginBottom:'14px'}}><div style={{...sc,fontSize:'0.5rem',letterSpacing:'0.14em',...gold,marginBottom:'10px'}}>Daily T.E.A.</div>{[{k:'Thoughts',v:d.tea.thoughts},{k:'Emotions',v:d.tea.emotions},{k:'Actions',v:d.tea.actions}].map(t=>(
              <div key={t.k} style={{display:'flex',gap:'10px',marginBottom:'6px'}}><span style={{...sc,fontSize:'0.5rem',letterSpacing:'0.08em',...muted,flexShrink:0,paddingTop:'2px',width:'58px'}}>{t.k}</span><span style={{...serif,fontSize:'0.875rem',...meta,lineHeight:1.55}}>{t.v}</span></div>
            ))}</div>}
            <button onClick={()=>setEditOpen(p=>({...p,[d.domain]:!p[d.domain]}))} style={{...serif,fontSize:'0.875rem',fontStyle:'italic',...gold,background:'none',border:'none',cursor:'pointer',padding:0}}>{editOpen[d.domain]?'Close \u2191':'Edit this goal \u2192'}</button>
            {editOpen[d.domain]&&<div style={{marginTop:'12px'}}>
              <textarea style={{width:'100%',padding:'12px 14px',...serif,fontSize:'0.9375rem',...meta,background:'#FFFFFF',border:'1px solid rgba(200,146,42,0.25)',borderRadius:'8px',outline:'none',resize:'vertical',lineHeight:1.65,minHeight:'72px',marginBottom:'8px'}} value={editText[d.domain]??(d.outcome_user||d.outcome_system)} onChange={e=>setEditText(p=>({...p,[d.domain]:e.target.value}))} placeholder="Write your own version..."/>
              <Btn onClick={()=>setEditOpen(p=>({...p,[d.domain]:false}))} style={{padding:'10px 20px',fontSize:'0.8125rem'}}>Save my version {'\u2192'}</Btn>
            </div>}
          </div>
        )
      })}

      {calEvents.length>0&&<div style={{background:'#FFFFFF',border:'1px solid rgba(200,146,42,0.2)',borderRadius:'12px',padding:'20px 22px',marginBottom:'20px'}}>
        <div style={{...sc,fontSize:'0.8125rem',letterSpacing:'0.1em',...gold,marginBottom:'8px'}}>Add milestones to your calendar</div>
        <p style={{...serif,fontSize:'0.9375rem',...meta,lineHeight:1.65,marginBottom:'14px'}}>Each milestone opens pre-filled in your calendar app. One tap, done.</p>
        <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
          {['google','apple'].map(t=><button key={t} onClick={()=>setCalType(t)} style={{...sc,fontSize:'0.5625rem',letterSpacing:'0.1em',padding:'6px 14px',borderRadius:'20px',border:`1px solid ${calType===t?'rgba(200,146,42,0.78)':'rgba(200,146,42,0.2)'}`,background:calType===t?'rgba(200,146,42,0.08)':'transparent',color:calType===t?'var(--gold-dk)':'var(--text-muted)',cursor:'pointer',textTransform:'capitalize'}}>{t==='google'?'Google Calendar':'Apple Calendar'}</button>)}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
          {calEvents.map((e,i)=><a key={i} href={calLink(calType,e)} target="_blank" rel="noopener" style={{...serif,fontSize:'0.875rem',...gold,padding:'8px 12px',border:'1px solid rgba(200,146,42,0.2)',borderRadius:'6px',textDecoration:'none',display:'block'}}>{e.label} {'\u2192'}</a>)}
        </div>
      </div>}

      <div style={{textAlign:'center',marginTop:'16px'}}>
        <a href="/profile.html" style={{...sc,fontSize:'0.875rem',letterSpacing:'0.14em',...gold,background:'rgba(200,146,42,0.05)',border:'1.5px solid rgba(200,146,42,0.78)',borderRadius:'40px',padding:'12px 28px',textDecoration:'none',display:'inline-block'}}>Go to your profile {'\u2192'}</a>
      </div>
    </div>
  )
}

export function TargetGoalsPage(){
  const {user,loading:authLoading}=useAuth()
  const [phase,setPhase]=useState('setup')
  const [scores,setScores]=useState({})
  const [hasMapData,setHasMapData]=useState(false)
  const [mapData,setMapData]=useState(null)
  const [selectedDomains,setSelectedDomains]=useState([])
  const [quarterType,setQuarterType]=useState(null)
  const [targetDate,setTargetDate]=useState(null)
  const [endDateLabel,setEndDateLabel]=useState(null)
  const [horizonGapData,setHorizonGapData]=useState({})
  const [completedDomains,setCompletedDomains]=useState([])
  const [recommendation,setRecommendation]=useState(null)
  const [sessionId,setSessionId]=useState(null)
  const loadedRef=useRef(false)

  useEffect(()=>{if(!user||loadedRef.current)return;loadedRef.current=true;loadMapData()},[user])

  async function loadMapData(){
    try{
      const{data}=await supabase.from('orienteering_sessions').select('session,completed_at').eq('user_id',user.id).eq('complete',true).order('updated_at',{ascending:false}).limit(1).maybeSingle()
      if(data?.session?.domainData){
        setMapData(data.session);setHasMapData(true)
        const s={};Object.entries(data.session.domainData).forEach(([id,d])=>{if(d.score!==undefined)s[id]=d.score})
        setScores(s);setPhase('select');getRecommendation(s,true)
      }
    }catch{}
  }

  async function getRecommendation(s,hmd=false){
    try{const res=await fetch('/tools/target-goals/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'recommend',scores:s||scores,hasMapData:hmd})});setRecommendation(await res.json())}catch{}
  }

  function handleGoalSaved(domainId,goalData){
    const goal={domain:domainId,outcome_system:goalData.outcome_system,outcome_user:null,month3:goalData.month3,month2:goalData.month2,month1:goalData.month1,month3_why:goalData.month3_why||null,month2_why:goalData.month2_why||null,month1_why:goalData.month1_why||null,weeks:goalData.weeks,tea:goalData.tea,conversation_insight:goalData.conversation_insight,horizon_gap:horizonGapData[domainId]||null}
    const next=[...completedDomains,goal];setCompletedDomains(next)
    if(next.length<selectedDomains.length){setPhase('refine_'+next.length)}
    else{setPhase('complete');saveToSupabase(next)}
  }

  async function saveToSupabase(goals){
    if(!user?.id)return
    try{
      const sd={user_id:user.id,domains:selectedDomains,quarter_type:quarterType,target_date:targetDate,end_date_label:endDateLabel,goals:goals||completedDomains,scores_at_start:scores,horizon_gap_data:horizonGapData,has_map_data:hasMapData,status:'active',completed_at:new Date().toISOString()}
      if(sessionId){await supabase.from('target_goal_sessions').update({goals:goals||completedDomains,updated_at:new Date().toISOString()}).eq('id',sessionId)}
      else{const{data}=await supabase.from('target_goal_sessions').insert(sd).select('id').single();if(data?.id)setSessionId(data.id)}
    }catch{}
  }

  if(authLoading)return<div className="loading"/>

  const curPhase=phase.startsWith('refine')?'refine':phase
  const refineIndex=curPhase==='refine'?completedDomains.length:0

  return(
    <div className="page-shell">
      <Nav activePath="life-os"/>
      {!user&&<AuthModal/>}
      <div className="tool-wrap">
        {curPhase==='setup'&&<PhaseSetup scores={scores} setScores={setScores} onComplete={()=>{setPhase('select');getRecommendation(scores,hasMapData)}}/>}
        {curPhase==='select'&&<PhaseSelect scores={scores} selectedDomains={selectedDomains} setSelectedDomains={setSelectedDomains} recommendation={recommendation} onContinue={()=>setPhase('quarter')}/>}
        {curPhase==='quarter'&&<PhaseQuarter quarterType={quarterType} setQuarterType={setQuarterType} setTargetDate={setTargetDate} setEndDateLabel={setEndDateLabel} onContinue={()=>setPhase('horizon_gap')}/>}
        {curPhase==='horizon_gap'&&<PhaseHorizonGap selectedDomains={selectedDomains} scores={scores} horizonGapData={horizonGapData} setHorizonGapData={setHorizonGapData} onComplete={fd=>{setHorizonGapData(fd);setPhase('refine')}}/>}
        {curPhase==='refine'&&<PhaseRefine key={phase} selectedDomains={selectedDomains.slice(refineIndex)} scores={scores} mapData={mapData} horizonGapData={horizonGapData} endDateLabel={endDateLabel} completedDomains={completedDomains} onGoalSaved={handleGoalSaved}/>}
        {curPhase==='complete'&&<PhaseComplete completedDomains={completedDomains} scores={scores} endDateLabel={endDateLabel} targetDate={targetDate}/>}
      </div>
    </div>
  )
}
