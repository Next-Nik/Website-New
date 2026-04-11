import React, { useState, useEffect, useCallback } from 'react'

import { EarthIntro } from './EarthIntro'
import { useAuth } from '../../hooks/useAuth'
import Heptagon from './Heptagon'
import DomainPanel from './DomainPanel'
import ContributeModal from './ContributeModal'
import { fetchDomains, STATIC_DOMAINS, TOP_LEVEL_GOAL } from './data'
import styles from './DomainExplorer.module.css'

// ── Position debug overlay — visible only at ?debug=positions ──
function PositionDebug() {
  const [globe, setGlobe] = React.useState({ x: 60, y: 60, size: 300 })
  const [orb,   setOrb]   = React.useState({ x: 32, y: 72, size: 152 })
  const [mode,  setMode]  = React.useState('globe')

  const current  = mode === 'globe' ? globe : orb
  const setCurrent = mode === 'globe' ? setGlobe : setOrb

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }}>
      {/* Globe circle */}
      <div style={{
        position: 'absolute',
        left: globe.x + '%', top: globe.y + '%',
        width: globe.size, height: globe.size,
        borderRadius: '50%',
        border: '2px dashed rgba(200,146,42,0.8)',
        background: 'rgba(200,146,42,0.06)',
        transform: 'translate(-50%,-50%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, letterSpacing: '0.2em', color: 'rgba(200,146,42,0.8)',
        fontFamily: 'Georgia, serif',
      }}>GLOBE</div>

      {/* Orb circle */}
      <div style={{
        position: 'absolute',
        left: orb.x + '%', top: orb.y + '%',
        width: orb.size, height: orb.size,
        borderRadius: '50%',
        border: '2px solid rgba(90,160,255,0.8)',
        background: 'rgba(90,160,255,0.08)',
        transform: 'translate(-50%,-50%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, letterSpacing: '0.15em', color: 'rgba(90,160,255,0.9)',
        fontFamily: 'Georgia, serif', textAlign: 'center', lineHeight: 1.4,
      }}>OUR<br/>PLANET<br/>ORB</div>

      {/* Controls — pointer events re-enabled */}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(15,21,35,0.95)', border: '1px solid rgba(200,146,42,0.5)',
        borderRadius: 12, padding: '16px 24px', pointerEvents: 'all',
        display: 'flex', gap: 24, alignItems: 'flex-end',
        zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        fontFamily: 'Georgia, serif',
      }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(200,146,42,0.6)', textTransform: 'uppercase' }}>
            Editing
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['globe','orb'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                border: '1px solid rgba(200,146,42,' + (mode===m ? '0.9' : '0.3') + ')',
                background: mode===m ? 'rgba(200,146,42,0.15)' : 'transparent',
                color: mode===m ? 'rgba(200,146,42,1)' : 'rgba(200,146,42,0.5)',
                fontSize: 11, letterSpacing: '0.1em', fontFamily: 'Georgia, serif',
              }}>{m === 'globe' ? 'Globe' : 'Our Planet Orb'}</button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        {[
          { label: 'Left / Right', key: 'x', min: 0, max: 100, step: 0.5, unit: '%' },
          { label: 'Up / Down',    key: 'y', min: 0, max: 100, step: 0.5, unit: '%' },
          { label: 'Size',         key: 'size', min: 40, max: 600, step: 2, unit: 'px' },
        ].map(({ label, key, min, max, step, unit }) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(200,146,42,0.7)', textTransform: 'uppercase' }}>
              {label} <span style={{ color: 'rgba(255,255,255,0.5)' }}>{current[key]}{unit}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={current[key]}
              onChange={e => setCurrent(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
              style={{ accentColor: '#C8922A', cursor: 'pointer', width: '100%' }}
            />
          </div>
        ))}

        {/* Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 220, borderLeft: '1px solid rgba(200,146,42,0.2)', paddingLeft: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(200,146,42,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Send these values back</div>
          {[['Globe', globe], ['Orb', orb]].map(([name, val]) => (
            <div key={name} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Courier New, monospace' }}>
              {name}: X=<span style={{color:'rgba(255,255,255,0.9)'}}>{val.x}%</span>{' '}
              Y=<span style={{color:'rgba(255,255,255,0.9)'}}>{val.y}%</span>{' '}
              Size=<span style={{color:'rgba(255,255,255,0.9)'}}>{val.size}px</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const OVERVIEW_TEXT = `The Overview Effect is what astronauts report when they first see Earth from space — a sudden, irreversible recognition of the whole. The boundaries dissolve. The fragmentation that seemed inevitable from inside it becomes obviously contingent from outside it.

From that vantage point, a question becomes possible that is very hard to ask from inside the noise:

What are we actually building toward?

Not as ideology. As a genuine, shared picture of what flourishing looks like — domain by domain, scale by scale. Humanity has never seriously answered that question. NextUs is an attempt to answer it.

Seven domains. Horizon goals at every level. A shared destination — so that the people already doing the work can find each other, aim at something worth building, and compound their effort rather than scatter it.`

export default function DomainExplorer() {
  const { user } = useAuth()
  const [domainTree,     setDomainTree]     = useState(STATIC_DOMAINS)
  const [activeIndex,    setActiveIndex]    = useState(null)
  const [levelPath,      setLevelPath]      = useState([])
  const [contributeOpen, setContributeOpen] = useState(false)
  const [overviewOpen,   setOverviewOpen]   = useState(true)
  const [parentItem,     setParentItem]     = useState(null) // keeps text visible when drilling into subdomains
  const [earthDone,      setEarthDone]      = useState(false)  // earth intro has completed

  // User initial for display (optional — auth already handled by useAuth)
  const userInitial = user?.email
    ? (user.email.split('@')[0]?.charAt(0) || '?').toUpperCase()
    : null

  // Load live domain tree from Supabase (falls back to static data)
  useEffect(() => {
    fetchDomains().then(data => setDomainTree(data))
  }, [])

  const isIdle = activeIndex === null

  function getItemAtPath(path) {
    if (path.length === 0) return null
    let list = domainTree
    let item = null
    for (const entry of path) {
      item = list[entry.index]
      list = item.subDomains || []
    }
    return item
  }

  function getNavigationState() {
    if (levelPath.length === 0) {
      return {
        currentList: domainTree,
        selectedItem: activeIndex !== null ? domainTree[activeIndex] : null,
        breadcrumb: ['NextUs'],
        level: 0,
        parentLabel: 'Our Planet',
      }
    }

    let list = domainTree
    let breadcrumb = ['NextUs']
    for (let i = 0; i < levelPath.length; i++) {
      const item = list[levelPath[i].index]
      breadcrumb.push(item.name)
      if (i < levelPath.length - 1) list = item.subDomains
    }

    const currentList = levelPath.length === 1
      ? domainTree[levelPath[0].index].subDomains
      : getItemAtPath(levelPath.slice(0, -1)).subDomains

    return {
      currentList,
      selectedItem: activeIndex !== null ? currentList[activeIndex] : null,
      breadcrumb,
      level: levelPath.length,
      parentLabel: levelPath.length > 0
        ? (getItemAtPath(levelPath.slice(0, -1))?.name ?? 'Our Planet')
        : 'Our Planet',
    }
  }

  const navState = getNavigationState()

  function getCentreLabel() {
    if (levelPath.length === 0) return 'Our Planet'
    return getItemAtPath(levelPath)?.name ?? 'Our Planet'
  }

  function handleCentreClick() {
    if (levelPath.length === 0) {
      setOverviewOpen(prev => !prev)
    } else {
      setActiveIndex(null)
    }
  }

  const handleKey = useCallback((e) => {
    if (contributeOpen || overviewOpen) return
    const len = navState.currentList.length
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setActiveIndex(prev => prev === null ? 0 : (prev + 1) % len)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setActiveIndex(prev => prev === null ? len - 1 : (prev - 1 + len) % len)
    } else if (e.key === 'Escape') {
      if (overviewOpen) { setOverviewOpen(false); return }
      if (activeIndex !== null) setActiveIndex(null)
    }
  }, [isIdle, navState.currentList.length, activeIndex, contributeOpen, overviewOpen])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  function handleSelect(index) {
    setActiveIndex(index)
    setOverviewOpen(false)
  }

  function handleSelectAndDrill(index) {
    const item = navState.currentList[index]
    if (item?.subDomains?.length > 0) {
      setLevelPath(prev => [...prev, { index }])
      setActiveIndex(null)
      setOverviewOpen(false)
    } else {
      setActiveIndex(index)
      setOverviewOpen(false)
    }
  }

  function handlePrev() {
    const len = navState.currentList.length
    setActiveIndex(prev => prev === null ? len - 1 : (prev - 1 + len) % len)
  }

  function handleNext() {
    const len = navState.currentList.length
    setActiveIndex(prev => prev === null ? 0 : (prev + 1) % len)
  }

  function handleExploreSubDomains(indexOverride) {
    // Called from Heptagon's onDrillDown with the index directly,
    // or from DomainPanel's button with no argument (uses activeIndex)
    const idx = indexOverride !== undefined ? indexOverride : activeIndex
    if (idx === null || idx === undefined) return
    const currentItem = navState.currentList[idx]
    if (!currentItem?.subDomains?.length) return
    setParentItem(currentItem) // preserve text
    setLevelPath(prev => [...prev, { index: idx }])
    setActiveIndex(null)
  }

  function handleBack() {
    if (levelPath.length === 0) { setActiveIndex(null); setParentItem(null); return }
    const prevIndex = levelPath[levelPath.length - 1].index
    setLevelPath(prev => prev.slice(0, -1))
    setActiveIndex(prevIndex)
    setParentItem(null) // clear preserved text when going back
  }

  const selectedItem = activeIndex !== null ? navState.currentList[activeIndex] : null
  const centreLabel  = getCentreLabel()

  return (
    <div className={styles.app} style={{ position: 'relative' }}>
      <PositionDebug />
      {!earthDone && (
        <EarthIntro onEntered={() => setEarthDone(true)} />
      )}
      <div className={styles.grain} aria-hidden="true" />

      <main className={styles.main} style={{ opacity: earthDone ? 1 : 0, transition: 'opacity 0.6s ease 0.1s' }}>
        <div className={styles.heptagonCol}>
          <div className={styles.heptagonWrapper}>
            <Heptagon
              domains={navState.currentList}
              activeIndex={activeIndex}
              onSelect={handleSelect}
              isIdle={isIdle}
              centreLabel={centreLabel}
              onCentreClick={handleCentreClick}
              onDrillDown={handleExploreSubDomains}
            />
          </div>
          {isIdle && (
            <p className={styles.instruction}>
              {levelPath.length === 0 ? 'Select a domain to explore' : 'Select a sub-domain'}
            </p>
          )}
        </div>

        <div className={styles.panelCol}>
          {overviewOpen && (
            <div className={`${styles.overviewPanel} ${styles.overviewVisible}`}>
              <p className={styles.overviewEyebrow}>NEXTUS · OUR PLANET</p>
              <h2 className={styles.overviewTitle}>The Overview Effect</h2>
              <div className={styles.overviewDivider} />
              {OVERVIEW_TEXT.split('\n\n').map((para, i) => (
                <p key={i} className={styles.overviewBody}>{para}</p>
              ))}
              <p className={styles.overviewGoal}>{TOP_LEVEL_GOAL}</p>
              <button className={styles.overviewClose} onClick={() => setOverviewOpen(false)}>
                Close ×
              </button>
            </div>
          )}

          {!overviewOpen && !isIdle && selectedItem ? (
            <DomainPanel
              item={selectedItem}
              parentLabel={navState.parentLabel}
              breadcrumb={navState.breadcrumb.concat(selectedItem.name)}
              onExploreSubDomains={handleExploreSubDomains}
              onBack={handleBack}
              onContribute={() => setContributeOpen(true)}
              onPrev={handlePrev}
              onNext={handleNext}
              level={navState.level}
              isVisible={!isIdle}
              userData={null}
              rootDomainId={levelPath.length > 0 ? domainTree[levelPath[0].index]?.id : selectedItem?.id}
            />
          ) : !overviewOpen && (
            <div className={styles.idlePanel}>
              {/* Show parent item text when drilling into subdomains */}
              {parentItem && (
                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid rgba(200,146,42,0.15)' }}>
                  <p style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.16em', color: '#A8721A', marginBottom: '8px', textTransform: 'uppercase' }}>
                    {parentItem.name}
                  </p>
                  {parentItem.horizonGoal && (
                    <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px', fontWeight: 300, color: 'rgba(15,21,35,0.78)', lineHeight: 1.7, marginBottom: '8px' }}>
                      {parentItem.horizonGoal}
                    </p>
                  )}
                  {parentItem.description && (
                    <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.55)', lineHeight: 1.65 }}>
                      {parentItem.description}
                    </p>
                  )}
                  <button onClick={handleBack} style={{ marginTop: '12px', fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.12em', color: '#A8721A', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    ← Back
                  </button>
                </div>
              )}
              <div className={styles.idleDivider} />
              <p className={styles.idleLabel}>
                {levelPath.length === 0
                  ? 'Our Planet — seven domains of collective life'
                  : `${getCentreLabel()} — sub-domains`}
              </p>
              <ul className={styles.idleList}>
                {navState.currentList.map((d, i) => (
                  <li key={d.id}>
                    <button className={styles.idleListItem} onClick={() => handleSelectAndDrill(i)}>
                      <span>{d.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      <ContributeModal
        isOpen={contributeOpen}
        onClose={() => setContributeOpen(false)}
        domainName={selectedItem?.name ?? 'this domain'}
      />
    </div>
  )
}
