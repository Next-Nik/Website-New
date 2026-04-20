import { useState } from 'react'
import styles from './SelfPanel.module.css'
import { FRACTAL_MAP } from './selfData'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

// ── DA PLACEHOLDER ────────────────────────────────────────────
function DASection({ label }) {
  return (
    <div className={styles.daSection}>
      <span className={styles.daSectionLabel}>{label}</span>
      <p className={styles.daSectionNote}>Being built next</p>
    </div>
  )
}

// ── MAIN PANEL ────────────────────────────────────────────────
export default function SelfPanel({
  item,
  parentLabel,
  onBack,
  onExploreSubDomains,
  isVisible,
  purposeArchetype,
}) {
  const [activeApproach, setActiveApproach] = useState(null)

  if (!item) return null

  const isPlaceholder = !item.horizonGoal || item.horizonGoal === 'placeholder'
  const fractal = FRACTAL_MAP[item.id] || null
  const isUserDomain = purposeArchetype && item.id

  const shownApproach = activeApproach
    ? item.subDomains?.find(s => s.id === activeApproach)
    : null

  return (
    <div className={`${styles.panel} ${isVisible ? styles.visible : ''}`}>

      {/* ── NAV ── */}
      <nav className={styles.topNav}>
        {onBack && (
          <button className={styles.navItem} onClick={onBack}>
            &#8592; {parentLabel || 'Your Life'}
          </button>
        )}
        {onExploreSubDomains && item.subDomains?.length > 0 && (
          <button className={styles.navItem} onClick={onExploreSubDomains}>
            Explore {item.name} &#8594;
          </button>
        )}
      </nav>

      {/* ── DOMAIN NAME ── */}
      <h2 className={styles.domainName}>{item.name}</h2>
      {item.aliases && (
        <p className={styles.aliases}>{item.aliases}</p>
      )}

      {/* ── HORIZON GOAL ── */}
      <div className={styles.horizonGoal}>
        <span className={styles.goalLabel}>Your horizon goal</span>
        {isPlaceholder
          ? <span className={styles.comingSoon}>Being mapped</span>
          : item.horizonGoal
        }
      </div>

      {/* ── LIFE'S MISSION QUESTION ── */}
      {item.lifeMission && (
        <p className={styles.lifeMission}>&#8220;{item.lifeMission}&#8221;</p>
      )}

      {/* ── FRACTAL CONNECTION ── */}
      {fractal && (
        <div className={styles.fractalLink}>
          <span className={styles.fractalLabel}>Contributes to</span>
          <span className={styles.fractalValue}>{fractal.civilisational}</span>
          <span className={styles.fractalNote}> — the civilisational scale</span>
        </div>
      )}

      {/* ── ABOUT ── */}
      {item.description && (
        <div className={styles.aboutSection}>
          <span className={styles.sectionLabel}>About this domain</span>
          <p className={styles.description}>{item.description}</p>
        </div>
      )}

      <div className={styles.divider} />

      {/* ── APPROACHES / SUB-DOMAINS ── */}
      {item.subDomains?.length > 0 && (
        <div className={styles.approachesSection}>
          <span className={styles.sectionLabel}>Areas within {item.name}</span>
          <p className={styles.approachesHint}>
            Select one to explore the terrain and find your entry point.
          </p>
          <div className={styles.approachesList}>
            {item.subDomains.map(s => (
              <button
                key={s.id}
                className={`${styles.approachChip} ${activeApproach === s.id ? styles.approachChipActive : ''}`}
                onClick={() => setActiveApproach(prev => prev === s.id ? null : s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>

          {shownApproach && (
            <div className={styles.approachDetail}>
              <span className={styles.approachDetailLabel}>{shownApproach.name}</span>
              <p className={styles.approachDetailGoal}>
                &#8220;{shownApproach.horizonGoal}&#8221;
              </p>
              <p className={styles.approachDetailDesc}>{shownApproach.description}</p>
              <DASection label="Who works in this area" />
              <DASection label="Approaches and methodologies" />
              <DASection label="How to bring this back into the Suite" />
            </div>
          )}
        </div>
      )}

      <div className={styles.divider} />

      {/* ── DA SECTIONS ── */}
      <DASection label="Sit rep" />
      <DASection label="How we measure this" />
      <DASection label="Gap map" />

      <div className={styles.divider} />

      <DASection label="Practitioners and approaches" />
      <DASection label="What's working" />
      <DASection label="Obstacles" />

      <div className={styles.divider} />

      {/* ── HORIZON SUITE CONNECTION ── */}
      <div className={styles.suiteSection}>
        <span className={styles.sectionLabel}>Horizon Suite tools for this domain</span>
        <DASection label="Relevant tools" />
      </div>

      {/* ── STAY CLOSE ── */}
      <div className={styles.mailingList}>
        <p className={styles.mailingLabel}>Stay close as this domain develops.</p>
        <form
          className={styles.mailingForm}
          onSubmit={e => {
            e.preventDefault()
            const email = e.target.email.value
            if (email) {
              window.location.href = `mailto:hello@nextus.world?subject=Keep me informed: ${item.name}&body=Please keep me informed about ${item.name} on NextUs Self. My email: ${email}`
            }
          }}
        >
          <input type="email" name="email" className={styles.mailingInput} placeholder="your@email.com" required />
          <button type="submit" className={styles.mailingBtn}>Stay informed &#8594;</button>
        </form>
      </div>

    </div>
  )
}
