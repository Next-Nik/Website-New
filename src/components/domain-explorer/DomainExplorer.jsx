import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { EarthIntro } from './EarthIntro'
import { useAuth } from '../../hooks/useAuth'
import Heptagon from './Heptagon'
import DomainPanel from './DomainPanel'
import { fetchDomains, STATIC_DOMAINS, TOP_LEVEL_GOAL } from './data'
import styles from './DomainExplorer.module.css'
import { ContributeModal } from './ContributeModal'

// ── TIMING CONTROLS ───────────────────────────────────────────────────────────
const HEP_FADE_IN_DURATION = 2500
const HEP_FADE_IN_DELAY    = 0
const HEP_START_DELAY      = 0
// ─────────────────────────────────────────────────────────────────────────────

const OVERVIEW_TEXT = `The Overview Effect is what astronauts report when they first see Earth from space — a sudden, irreversible recognition of the whole. The boundaries dissolve. The fragmentation that seemed inevitable from inside it becomes obviously contingent from outside it.

From that vantage point, a question becomes possible that is very hard to ask from inside the noise:

What are we actually building toward?

Not as ideology. As a genuine, shared picture of what flourishing looks like — domain by domain, scale by scale. Humanity has never seriously answered that question. NextUs is an attempt to answer it.

Seven domains. Horizon goals at every level. A shared destination — so that the people already doing the work can find each other, aim at something worth building, and compound their effort rather than scatter it.`

export default function DomainExplorer() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [domainTree,     setDomainTree]     = useState(STATIC_DOMAINS)
  const [activeIndex,    setActiveIndex]    = useState(null)
  const [levelPath,      setLevelPath]      = useState([])
  const [overviewOpen,   setOverviewOpen]   = useState(true)

  // parentPanelOpen mirrors overviewOpen but for sub-levels.
  // When true: show parent domain panel, not the selected sub-domain.
  // Clears when user explicitly clicks a sub-domain node.
  const [parentPanelOpen, setParentPanelOpen] = useState(false)
  const [parentItem,      setParentItem]      = useState(null)
  const [earthDone,       setEarthDone]       = useState(false)

  // Tracks which node the wheel landed on at the current level
  const landedIndexRef = useRef(0)

  function handleEarthClick() {
    setTimeout(() => setEarthDone(true), HEP_START_DELAY)
  }

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
      // At sub-levels, clicking centre resets to parent panel
      setActiveIndex(null)
      setParentPanelOpen(true)
    }
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

  // User explicitly clicks a node — always navigate to that domain
  function handleSelect(index) {
    setActiveIndex(index)
    setOverviewOpen(false)
    setParentPanelOpen(false)
  }

  // Wheel lands — highlight the node at every level, but keep parent panel showing
  function handleLand(index) {
    landedIndexRef.current = index
    setActiveIndex(index)
    // Level 0: overview stays open (existing behaviour)
    // Sub-levels: parentPanelOpen stays true — highlight fires but panel doesn't switch
  }

  function handlePrev() {
    const len = navState.currentList.length
    setActiveIndex(prev => prev === null ? len - 1 : (prev - 1 + len) % len)
    setOverviewOpen(false)
    setParentPanelOpen(false)
  }

  function handleNext() {
    const len = navState.currentList.length
    setActiveIndex(prev => prev === null ? landedIndexRef.current : (prev + 1) % len)
    setOverviewOpen(false)
    setParentPanelOpen(false)
  }

  function handleExploreSubDomains(indexOverride) {
    const idx = indexOverride !== undefined ? indexOverride : activeIndex
    if (idx === null || idx === undefined) return
    const currentItem = navState.currentList[idx]
    if (!currentItem?.subDomains?.length) return
    setParentItem(currentItem)
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
    setParentItem(levelPath.length > 1 ? getItemAtPath(levelPath.slice(0, -1)) : null)
    setParentPanelOpen(false)
    landedIndexRef.current = prevIndex
  }

  const selectedItem = activeIndex !== null ? navState.currentList[activeIndex] : null
  const centreLabel  = getCentreLabel()

  // Panel display logic — mirrors top-level pattern at every level:
  // overviewOpen / parentPanelOpen = show parent context, not child
  // !isIdle && selectedItem && !overviewOpen && !parentPanelOpen = show selected domain
  const showParentPanel = levelPath.length > 0 && parentPanelOpen && parentItem
  const showSelectedPanel = !overviewOpen && !parentPanelOpen && !isIdle && selectedItem

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
          {/* Instruction only shows when truly idle — no node highlighted */}
          {isIdle && (
            <p className={styles.instruction}>
              {levelPath.length === 0 ? 'Select a domain to explore' : 'Select a sub-domain'}
            </p>
          )}
        </div>

        <div className={styles.panelCol}>

          {/* Top level: Our Planet overview */}
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

          {/* Sub-level: show parent domain panel while wheel spins / user hasn't chosen */}
          {!overviewOpen && showParentPanel && (
            <DomainPanel
              item={parentItem}
              parentLabel={levelPath.length > 1
                ? (getItemAtPath(levelPath.slice(0, -1))?.name ?? 'Our Planet')
                : 'Our Planet'}
              breadcrumb={navState.breadcrumb}
              onExploreSubDomains={null}
              onBack={handleBack}
              onContribute={() => navigate(`/nextus/actors${selectedItem?.id ? `?domain=${selectedItem.id}` : ''}`)}
              onPrev={handlePrev}
              onNext={handleNext}
              level={navState.level - 1}
              isVisible={true}
              userData={null}
              rootDomainId={domainTree[levelPath[0].index]?.id}
            />
          )}

          {/* Any level: show the selected domain's panel */}
          {showSelectedPanel && (
            <DomainPanel
              item={selectedItem}
              parentLabel={navState.parentLabel}
              breadcrumb={navState.breadcrumb.concat(selectedItem.name)}
              onExploreSubDomains={handleExploreSubDomains}
              onBack={handleBack}
              onContribute={() => navigate(`/nextus/actors?domain=${levelPath.length > 0 ? domainTree[levelPath[0].index]?.id : selectedItem?.id}`)}
              onPrev={handlePrev}
              onNext={handleNext}
              level={navState.level}
              isVisible={true}
              userData={null}
              rootDomainId={levelPath.length > 0 ? domainTree[levelPath[0].index]?.id : selectedItem?.id}
            />
          )}

          {/* Top level idle — no domain selected yet, overview closed */}
          {!overviewOpen && !showParentPanel && !showSelectedPanel && (
            <div className={styles.idlePanel}>
              <div className={styles.idleDivider} />
              <p className={styles.idleLabel}>Our Planet — seven domains of collective life</p>
              <ul className={styles.idleList}>
                {navState.currentList.map((d, i) => (
                  <li key={d.id}>
                    <button className={styles.idleListItem} onClick={() => handleSelect(i)}>
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
        isOpen={false}
        onClose={() => {}}
        domainName={selectedItem?.name ?? 'this domain'}
      />
    </div>
  )
}
