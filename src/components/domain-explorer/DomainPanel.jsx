import { useState } from "react";
import { CURRENT_STATE, SCALE_LABELS, DATA_STATUS } from "./currentState";
import styles from "./DomainPanel.module.css";

// ── ILLUSTRATIVE PREVIEW COMPONENT ───────────────────────────────────────────
// Shows the structure of the Current State layer — not content.
// Nothing here implies knowledge of actual domain state.
function IllustrativePreview({ cs, onContribute, entryPoint }) {
  return (
    <div className={styles.illustrativeWrap}>
      <div className={styles.currentStateDivider} />

      <div className={styles.previewHeader}>
        <span className={styles.previewEyebrow}>Current State</span>
        <span className={styles.previewBadge}>Being Mapped</span>
      </div>

      {/* Gap bar — structural shape only */}
      <div className={styles.previewGapSection}>
        <div className={styles.gapBarLabels}>
          <span>Where we are</span>
          <span>Horizon Goal</span>
        </div>
        <div className={styles.gapBarTrack}>
          <div
            className={styles.gapBarFill}
            style={{
              width: cs ? `${(cs.score / 10 * 100).toFixed(1)}%` : "40%",
              opacity: 0.25,
            }}
          />
          <div className={styles.gapBarHorizon} />
        </div>
      </div>

      {/* Indicator slots — type only, no content */}
      <div className={styles.previewIndicators}>
        <p className={styles.previewSectionLabel}>Key Indicators</p>
        {[1, 2, 3].map((n) => (
          <div key={n} className={styles.previewIndicatorRow}>
            <span className={styles.previewIndicatorSlot}>Indicator {n}</span>
            <span className={styles.previewIndicatorBlank}>—</span>
          </div>
        ))}
      </div>

      {/* Actor slots — scale structure, no names */}
      <div className={styles.previewActors}>
        <p className={styles.previewSectionLabel}>In the Field</p>
        <div className={styles.actorsRow}>
          {["Global", "Regional", "Local"].map((scale) => (
            <div key={scale} className={`${styles.actorChip} ${styles.actorChipMuted}`}>
              <div className={styles.actorDot} />
              <span className={styles.actorSlot}>— {scale}</span>
            </div>
          ))}
        </div>
      </div>

      <p className={styles.previewNote}>
        This layer populates when Decision Analytics runs for this domain.
      </p>

      {/* Entry point — this is architectural, always real */}
      {entryPoint && (
        <div className={styles.entryPoint}>
          <p className={styles.entryPointText}>{entryPoint}</p>
          <button className={styles.entryBtn} onClick={onContribute}>
            Find your entry &#8594;
          </button>
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function DomainPanel({
  item,
  parentLabel,
  breadcrumb,
  onExploreSubDomains,
  onBack,
  onContribute,
  onPrev,
  onNext,
  level,
  isVisible,
  userData,
  rootDomainId,
}) {
  const [fieldExpanded, setFieldExpanded] = useState(false);
  const isPlaceholder = item.horizonGoal === "placeholder";

  const cs = level === 0 && item.id ? CURRENT_STATE[item.id] : null;

  const isUserDomain = userData?.domain === item.id;
  const userScale = userData?.scale;
  const userArchetype = userData?.archetype;

  const entryPoint = cs
    ? (userArchetype && cs.entryPoints[userArchetype]) || cs.entryPoints.default
    : null;

  const actors = cs ? (
    isUserDomain && userScale
      ? [
          ...cs.actors.filter(a => a.scale === userScale),
          ...cs.actors.filter(a => a.scale !== userScale),
        ]
      : cs.actors
  ) : [];

  const gapDistance = cs ? (10 - cs.score).toFixed(1) : null;
  const fillPct = cs ? `${(cs.score / 10 * 100).toFixed(1)}%` : "0%";
  const isIllustrative = DATA_STATUS === "illustrative";

  return (
    <div className={`${styles.panel} ${isVisible ? styles.visible : ""}`}>

      {breadcrumb.length > 1 && (
        <nav className={styles.breadcrumb} aria-label="Navigation path">
          {breadcrumb.map((crumb, i) => (
            <span key={i}>
              {i > 0 && <span className={styles.breadcrumbSep}>&#183;</span>}
              <span className={i === breadcrumb.length - 1 ? styles.breadcrumbCurrent : styles.breadcrumbItem}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      )}

      {isUserDomain && userData && (
        <div className={styles.yourDomainBadge}>
          <span className={styles.yourDomainDot} />
          <span>Your domain &#183; {userData.archetype} &#183; {SCALE_LABELS[userData.scale] || userData.scale}</span>
        </div>
      )}

      {/* Domain name with hover tooltip showing description */}
      <div className={styles.domainNameWrap}>
        <h2 className={styles.domainName}>{item.name}</h2>
        {item.description && item.description !== "placeholder" && item.description !== "Being mapped" && (
          <div className={styles.domainTooltip}>{item.description}</div>
        )}
      </div>

      {/* Row 1: back + explore */}
      <nav className={styles.topNav}>
        {onBack && (
          <button className={styles.navItem} onClick={onBack}>
            &#8592; {parentLabel}
          </button>
        )}
        {onExploreSubDomains && level < 4 && item.subDomains && item.subDomains.length > 0 &&
         item.subDomains[0].name !== 'Being mapped' && (
          <button className={styles.navItem} onClick={onExploreSubDomains}>
            Explore {item.name} &#8594;
          </button>
        )}
      </nav>

      {/* Row 2: view actors centered above prev/next arrows */}
      <div className={styles.actorsNav}>
        {rootDomainId && (
          <div className={styles.actorsNavLabel}>
            <a href={'/nextus/actors?domain=' + rootDomainId} className={styles.navItem}>
              Who's working on this
            </a>
            <div className={styles.infoWrap}>
              <span className={styles.infoIcon}>ⓘ</span>
              <div className={styles.infoTooltip}>
                The foundations, organisations, co-ops, projects, and initiatives actively working toward the horizon goal in this domain.
              </div>
            </div>
          </div>
        )}
        <div className={styles.navArrows}>
          <button className={styles.navBtn} onClick={onPrev} aria-label="Previous domain">‹</button>
          <button className={styles.navBtn} onClick={onNext} aria-label="Next domain">›</button>
        </div>
      </div>


      <p className={styles.horizonGoal}>
        {isPlaceholder ? (
          <span className={styles.comingSoon}>Horizon goal being mapped —</span>
        ) : (
          <>
            <span className={styles.goalLabel}>Horizon goal —</span>{" "}
            {item.horizonGoal}
          </>
        )}
      </p>

      {item.description && item.description !== "placeholder" && (
        <p className={styles.description}>{item.description}</p>
      )}

      {/* ── CURRENT STATE LAYER ── */}
      {cs && (
        isIllustrative ? (
          <IllustrativePreview
            cs={cs}
            onContribute={onContribute}
            entryPoint={entryPoint}
          />
        ) : (
          // ── VERIFIED DATA (real DA output) ──────────────────────────────
          <div className={styles.currentState}>
            <div className={styles.currentStateDivider} />

            {cs.gapSignal && (
              <div className={styles.gapSignal}>
                <div className={styles.gapSignalDot} />
                <span className={styles.gapSignalLabel}>Gap Signal Active</span>
                {cs.gapReason && (
                  <span className={styles.gapSignalReason}> — {cs.gapReason}</span>
                )}
              </div>
            )}

            <div className={styles.scoreRow}>
              <div>
                <div className={styles.scoreNumber}>
                  {cs.score}<span className={styles.scoreDenom}>/10</span>
                </div>
                <div className={styles.scoreLabel}>Current State</div>
              </div>
              <div className={styles.scoreMeta}>
                <div className={styles.gapDistanceLabel}>{gapDistance} points to horizon</div>
              </div>
            </div>

            <div className={styles.gapBarWrap}>
              <div className={styles.gapBarLabels}>
                <span>Where we are</span>
                <span>Horizon Goal</span>
              </div>
              <div className={styles.gapBarTrack}>
                <div className={styles.gapBarFill} style={{ width: fillPct }} />
                <div className={styles.gapBarHorizon} />
              </div>
            </div>

            {cs.indicators && cs.indicators.length > 0 && (
              <div className={styles.indicators}>
                {cs.indicators.map((ind, i) => (
                  <div key={i} className={styles.indicator}>
                    <span className={styles.indicatorLabel}>{ind.label}</span>
                    <span className={`${styles.indicatorValue} ${styles[`trend_${ind.trend}`]}`}>
                      {ind.value}
                      <span className={styles.trendArrow}>
                        {ind.trend === "up" ? " &#8593;" : ind.trend === "down" ? " &#8595;" : " &#8594;"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className={styles.csNarrative}>{cs.narrative}</p>

            <div className={styles.inField}>
              <p className={styles.inFieldLabel}>In the Field</p>
              {isUserDomain && userScale && (
                <p className={styles.inFieldPersonalised}>
                  Showing {SCALE_LABELS[userScale]} actors first — your scale
                </p>
              )}
              <div className={styles.actorsRow}>
                {actors.slice(0, fieldExpanded ? actors.length : 4).map((actor, i) => (
                  <div
                    key={i}
                    className={`${styles.actorChip} ${actor.scale === userScale ? styles.actorChipHighlighted : ""} ${!actor.winning ? styles.actorChipMuted : ""}`}
                  >
                    <div className={`${styles.actorDot} ${actor.winning ? styles.actorDotWinning : styles.actorDotMuted}`} />
                    <span className={styles.actorName}>{actor.name}</span>
                    <span className={styles.actorScale}>· {SCALE_LABELS[actor.scale] || actor.scale}</span>
                  </div>
                ))}
              </div>
              <div className={styles.actorsFooter}>
                {actors.length > 4 && (
                  <button
                    className={styles.seeAllBtn}
                    onClick={() => setFieldExpanded(!fieldExpanded)}
                  >
                    {fieldExpanded ? "Show less" : `See all ${cs.totalActors} \u2192`}
                  </button>
                )}
              </div>
            </div>

            {entryPoint && (
              <div className={styles.entryPoint}>
                <p className={styles.entryPointText}>{entryPoint}</p>
                <button className={styles.entryBtn} onClick={onContribute}>
                  Find your entry &#8594;
                </button>
              </div>
            )}
          </div>
        )
      )}

      <div className={styles.divider} />

      <div className={styles.mailingList}>
        <p className={styles.mailingLabel}>Stay close as this domain develops.</p>
        <form
          className={styles.mailingForm}
          onSubmit={(e) => {
            e.preventDefault();
            const email = e.target.email.value;
            if (email) {
              window.location.href = `mailto:hello@nextus.world?subject=Keep me informed: ${item.name}&body=Please keep me informed about ${item.name} on NextUs. My email: ${email}`;
            }
          }}
        >
          <input
            type="email"
            name="email"
            className={styles.mailingInput}
            placeholder="your@email.com"
            required
          />
          <button type="submit" className={styles.mailingBtn}>
            Stay informed &#8594;
          </button>
        </form>
      </div>


    </div>
  );
}
