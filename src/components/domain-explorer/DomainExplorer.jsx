import React, { useState, useEffect, useCallback } from 'react'

import { EarthIntro } from './EarthIntro'
import { useAuth } from '../../hooks/useAuth'
import Heptagon from './Heptagon'
import DomainPanel from './DomainPanel'
import ContributeModal from './ContributeModal'
import { fetchDomains, STATIC_DOMAINS, TOP_LEVEL_GOAL } from './data'
import styles from './DomainExplorer.module.css'

// ── TIMING CONTROLS ───────────────────────────────────────────────────────────
const HEP_FADE_IN_DURATION = 2500  // ms — how long the hep wheel fades in
const HEP_FADE_IN_DELAY    = 0     // ms — delay after click before fade starts
const HEP_START_DELAY      = 5   // ms after click before hep begins fading in
// ─────────────────────────────────────────────────────────────────────────────

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
  const [parentItem,     setParentItem]     = useState(null)
  const [earthDone,      setEarthDone]      = useState(false)

  function handleEarthClick() {
    setTimeout(() => setEarthDone(true), HEP_START_DELAY)
  }

  const userInitial = user?.email
    ? (user.email.split('@')[0]?.charAt(0) || '?').toUpperCase()
    : null

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

  function handleLand(index) {
    setActiveIndex(index)
    // overviewOpen stays true — panel stays on Our Planet until explicit click
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
    const idx = indexOverride !== undefined ? indexOverride : activeIndex
    if (idx === null || idx === undefined) return
    const currentItem = navState.currentList[idx]
    if (!currentItem?.subDomains?.length) return
    setParentItem(currentItem)
    setLevelPath(prev => [...prev, { index: idx }])
    setActiveIndex(null)
  }

  function handleBack() {
    if (levelPath.length === 0) { setActiveIndex(null); setParentItem(null); return }
    const prevIndex = levelPath[levelPath.length - 1].index
    setLevelPath(prev => prev.slice(0, -1))
    setActiveIndex(prevIndex)
    setParentItem(null)
  }

  const selectedItem = activeIndex !== null ? navState.currentList[activeIndex] : null
  const centreLabel  = getCentreLabel()

  return (
    <div className={styles.app} style={{ position: 'relative' }}>
      <div onClick={handleEarthClick} style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: earthDone ? 'none' : 'auto' }}>
        <EarthIntro onEntered={() => {}} />
      </div>
      <div className={styles.grain} aria-hidden="true" />

      <main className={styles.main} style={{ opacity: earthDone ? 1 : 0, transition: `opacity ${HEP_FADE_IN_DURATION}ms ease ${HEP_FADE_IN_DELAY}ms` }}>
        <div className={styles.heptagonCol}>
          <div className={styles.heptagonWrapper}>
            <Heptagon
              domains={navState.currentList}
              activeIndex={activeIndex}
              onSelect={handleSelect}
              onLand={handleLand}
              isIdle={isIdle}
              centreLabel={centreLabel}
              onCentreClick={handleCentreClick}
              onDrillDown={handleExploreSubDomains}
              bloom={earthDone}
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
