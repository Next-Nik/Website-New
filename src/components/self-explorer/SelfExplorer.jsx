import { useState, useEffect, useCallback, useRef } from 'react'
import Heptagon from '../domain-explorer/Heptagon'
import SelfPanel from './SelfPanel'
import { SELF_DOMAINS, SELF_TOP_GOAL, SELF_DOMAINS_BY_ID } from './selfData'
import styles from './SelfExplorer.module.css'

// ── TIMING ───────────────────────────────────────────────────
const HEP_FADE_IN_DURATION = 1800
const HEP_FADE_IN_DELAY    = 0

export default function SelfExplorer({ purposeData }) {
  const [activeIndex,  setActiveIndex]  = useState(null)
  const [levelPath,    setLevelPath]    = useState([])
  const [overviewOpen, setOverviewOpen] = useState(true)
  const [parentItem,   setParentItem]   = useState(null)
  const [parentPanelOpen, setParentPanelOpen] = useState(false)
  const [ready,        setReady]        = useState(false)
  const landedIndexRef = useRef(0)

  // Extract Purpose Piece result
  const ppDomain    = purposeData?.profile?.domain    || purposeData?.session?.tentative?.domain?.domain    || null
  const ppArchetype = purposeData?.profile?.archetype || purposeData?.session?.tentative?.archetype?.archetype || null

  // Pre-highlight user's domain from Purpose Piece
  useEffect(() => {
    if (ppDomain) {
      const idx = SELF_DOMAINS.findIndex(d => d.name === ppDomain || d.id === ppDomain?.toLowerCase().replace(' ', '_'))
      if (idx >= 0) landedIndexRef.current = idx
    }
    setTimeout(() => setReady(true), HEP_FADE_IN_DELAY)
  }, [ppDomain])

  const isIdle = activeIndex === null

  function getNavigationState() {
    if (levelPath.length === 0) {
      return {
        currentList: SELF_DOMAINS,
        selectedItem: activeIndex !== null ? SELF_DOMAINS[activeIndex] : null,
        level: 0,
        parentLabel: 'Your Life',
      }
    }
    const parentDomain = SELF_DOMAINS[levelPath[0].index]
    const subList = parentDomain.subDomains || []
    return {
      currentList: subList,
      selectedItem: activeIndex !== null ? subList[activeIndex] : null,
      level: 1,
      parentLabel: parentDomain.name,
    }
  }

  const navState = getNavigationState()

  function getCentreLabel() {
    if (levelPath.length === 0) return 'Your Life'
    return SELF_DOMAINS[levelPath[0].index]?.name || 'Your Life'
  }

  function handleCentreClick() {
    if (levelPath.length === 0) {
      setOverviewOpen(prev => !prev)
    } else {
      setActiveIndex(null)
      setParentPanelOpen(true)
    }
  }

  function handleSelect(index) {
    setActiveIndex(index)
    setOverviewOpen(false)
    setParentPanelOpen(false)
  }

  function handleLand(index) {
    landedIndexRef.current = index
    setActiveIndex(index)
  }

  function handleExploreSubDomains(indexOverride) {
    const idx = indexOverride !== undefined ? indexOverride : activeIndex
    if (idx === null || idx === undefined) return
    const item = navState.currentList[idx]
    if (!item?.subDomains?.length) return
    setParentItem(item)
    setLevelPath(prev => [...prev, { index: idx }])
    setActiveIndex(null)
    setParentPanelOpen(true)
    landedIndexRef.current = 0
  }

  function handleBack() {
    if (levelPath.length === 0) {
      setActiveIndex(null)
      setParentItem(null)
      setParentPanelOpen(false)
      return
    }
    const prevIndex = levelPath[levelPath.length - 1].index
    setLevelPath(prev => prev.slice(0, -1))
    setActiveIndex(prevIndex)
    setParentItem(null)
    setParentPanelOpen(false)
    landedIndexRef.current = prevIndex
  }

  const handleKey = useCallback((e) => {
    if (overviewOpen) return
    const len = navState.currentList.length
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setActiveIndex(prev => prev === null ? landedIndexRef.current : (prev + 1) % len)
      setOverviewOpen(false)
      setParentPanelOpen(false)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setActiveIndex(prev => prev === null ? len - 1 : (prev - 1 + len) % len)
      setOverviewOpen(false)
      setParentPanelOpen(false)
    } else if (e.key === 'Escape') {
      if (overviewOpen) { setOverviewOpen(false); return }
      if (activeIndex !== null) { setActiveIndex(null); setParentPanelOpen(levelPath.length > 0) }
    }
  }, [isIdle, navState.currentList.length, activeIndex, overviewOpen, levelPath])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const selectedItem = activeIndex !== null ? navState.currentList[activeIndex] : null
  const showParentPanel = levelPath.length > 0 && parentPanelOpen && parentItem
  const showSelectedPanel = !overviewOpen && !parentPanelOpen && !isIdle && selectedItem

  return (
    <div className={styles.app}>
      <div className={styles.grain} aria-hidden="true" />

      <main
        className={styles.main}
        style={{ opacity: ready ? 1 : 0, transition: `opacity ${HEP_FADE_IN_DURATION}ms ease` }}
      >
        {/* ── HEPTAGON COLUMN ── */}
        <div className={styles.heptagonCol}>
          <div className={styles.heptagonWrapper}>
            <Heptagon
              domains={navState.currentList}
              activeIndex={activeIndex}
              onSelect={handleSelect}
              onLand={handleLand}
              isIdle={isIdle}
              centreLabel={getCentreLabel()}
              onCentreClick={handleCentreClick}
              onDrillDown={handleExploreSubDomains}
              bloom={ready}
            />
          </div>
          {isIdle && (
            <p className={styles.instruction}>
              {levelPath.length === 0 ? 'Select a domain to explore' : 'Select an approach'}
            </p>
          )}
        </div>

        {/* ── PANEL COLUMN ── */}
        <div className={styles.panelCol}>

          {/* Overview — Your Life */}
          {overviewOpen && (
            <div className={`${styles.overviewPanel} ${styles.overviewVisible}`}>
              <p className={styles.overviewEyebrow}>NEXTUS SELF · YOUR LIFE</p>
              <h2 className={styles.overviewTitle}>Your Life</h2>
              <div className={styles.overviewDivider} />
              <p className={styles.overviewBody}>
                Seven domains. The full terrain of a human life. Each one is an area where you can be
                more honest, more aligned, more fully yourself. None of them are performance metrics.
                All of them are connected.
              </p>
              <p className={styles.overviewBody}>
                The Horizon Suite is the scaffold. What you put inside it is yours — the practices,
                approaches, and ways of working that actually fit who you are. The tools help you see.
                You choose what to do with what you find.
              </p>
              <p className={styles.overviewGoal}>{SELF_TOP_GOAL}</p>
              {ppDomain && (
                <div className={styles.ppHighlight}>
                  <span className={styles.ppLabel}>Your Purpose Piece domain</span>
                  <span className={styles.ppValue}>{ppDomain}</span>
                  {ppArchetype && <span className={styles.ppArchetype}>{ppArchetype}</span>}
                </div>
              )}
              <button className={styles.overviewClose} onClick={() => setOverviewOpen(false)}>
                Explore the domains ×
              </button>
            </div>
          )}

          {/* Sub-level parent panel */}
          {!overviewOpen && showParentPanel && (
            <SelfPanel
              item={parentItem}
              parentLabel="Your Life"
              onBack={handleBack}
              onExploreSubDomains={null}
              isVisible={true}
              purposeArchetype={ppArchetype}
            />
          )}

          {/* Selected domain panel */}
          {showSelectedPanel && (
            <SelfPanel
              item={selectedItem}
              parentLabel={navState.parentLabel}
              onBack={levelPath.length > 0 ? handleBack : null}
              onExploreSubDomains={
                selectedItem?.subDomains?.length > 0
                  ? () => handleExploreSubDomains(activeIndex)
                  : null
              }
              isVisible={true}
              purposeArchetype={ppArchetype}
            />
          )}

          {/* Idle state */}
          {!overviewOpen && !showParentPanel && !showSelectedPanel && (
            <div className={styles.idlePanel}>
              <div className={styles.idleDivider} />
              <p className={styles.idleLabel}>Your Life — seven domains</p>
              <ul className={styles.idleList}>
                {SELF_DOMAINS.map((d, i) => (
                  <li key={d.id}>
                    <button className={styles.idleListItem} onClick={() => handleSelect(i)}>
                      <span className={styles.idleItemName}>{d.name}</span>
                      <span className={styles.idleItemMission}>{d.lifeMission}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
