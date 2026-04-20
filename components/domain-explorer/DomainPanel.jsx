import { useState, useEffect, useRef } from "react";
import { SCALE_LABELS } from "./currentState";
import styles from "./DomainPanel.module.css";
import { supabase } from "../../hooks/useSupabase";

// ── FOCUS SEARCH ──────────────────────────────────────────────────────────────
function FocusSelector({ current, onSelect, onClear }) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy]       = useState(false)
  const debounce              = useRef(null)
  const wrapRef               = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setBusy(true)
      const { data } = await supabase
        .from('nextus_focuses')
        .select('id, name, type, slug')
        .ilike('name', `%${query.trim()}%`)
        .order('type').limit(10)
      setResults(data || [])
      setBusy(false)
    }, 280)
  }, [query])

  const TYPE_LABEL = {
    planet:'Planet', continent:'Continent', nation:'Nation',
    province:'Province', city:'City', neighbourhood:'Neighbourhood',
    organisation:'Organisation',
  }

  return (
    <div ref={wrapRef} className={styles.focusBar}>
      <button className={styles.focusTrigger} onClick={() => setOpen(o => !o)}>
        <span className={styles.focusEyebrow}>Scale</span>
        <span className={styles.focusName}>{current ? current.name : 'Global'}</span>
        <span className={styles.focusChevron}>{open ? '▴' : '▾'}</span>
      </button>

      {current && (
        <button className={styles.focusClear} onClick={onClear} title="Return to global view">×</button>
      )}

      {open && (
        <div className={styles.focusDropdown}>
          <div className={styles.focusSearchWrap}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Country, province, city…"
              className={styles.focusInput}
            />
          </div>

          {!query && (
            <button className={styles.focusOption} onClick={() => { onClear(); setOpen(false) }}>
              <span className={styles.focusOptionName}>Global</span>
              <span className={styles.focusOptionType}>Planet</span>
            </button>
          )}

          {busy && <p className={styles.focusSearching}>Searching…</p>}

          {!busy && query.trim().length >= 2 && results.length === 0 && (
            <p className={styles.focusSearching}>No results</p>
          )}

          {results.map(f => (
            <button key={f.id} className={styles.focusOption}
              onClick={() => { onSelect(f); setOpen(false); setQuery('') }}>
              <span className={styles.focusOptionName}>{f.name}</span>
              <span className={styles.focusOptionType}>{TYPE_LABEL[f.type] || f.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── DA PLACEHOLDER SECTION ────────────────────────────────────────────────────
function DASection({ label }) {
  return (
    <div className={styles.daSection}>
      <span className={styles.daSectionLabel}>{label}</span>
      <p className={styles.daSectionNote}>Being built next</p>
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function DomainPanel({
  item,
  parentLabel,
  onExploreSubDomains,
  onBack,
  onContribute,
  level,
  isVisible,
  userData,
  rootDomainId,
}) {
  const [fieldExpanded, setFieldExpanded] = useState(false);
  const [activeFocus, setActiveFocus]     = useState(null);
  const [focusActors, setFocusActors]     = useState([]);
  const [focusGoal, setFocusGoal]         = useState(null);
  const [focusLoading, setFocusLoading]   = useState(false);

  const isPlaceholder = item.horizonGoal === "placeholder";

  useEffect(() => {
    if (!activeFocus || !item.id) {
      setFocusActors([])
      setFocusGoal(null)
      return
    }
    setFocusLoading(true)
    Promise.all([
      supabase
        .from('nextus_actors')
        .select('id, name, scale, winning, website')
        .eq('focus_id', activeFocus.id)
        .eq('domain_id', item.id)
        .order('winning', { ascending: false })
        .limit(20),
      supabase
        .from('nextus_focus_goals')
        .select('horizon_goal')
        .eq('focus_id', activeFocus.id)
        .eq('domain_id', item.id)
        .eq('status', 'ratified')
        .maybeSingle(),
    ]).then(([{ data: actors }, { data: goal }]) => {
      setFocusActors(actors || [])
      setFocusGoal(goal?.horizon_goal || null)
      setFocusLoading(false)
    })
  }, [activeFocus, item.id])

  const isUserDomain = userData?.domain === item.id;
  const userScale    = userData?.scale;

  return (
    <div className={`${styles.panel} ${isVisible ? styles.visible : ""}`}>

      {/* ── 1. NAV ── */}
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

      {/* ── DOMAIN NAME ── */}
      {isUserDomain && userData && (
        <div className={styles.yourDomainBadge}>
          <span className={styles.yourDomainDot} />
          <span>Your domain &#183; {userData.archetype} &#183; {SCALE_LABELS[userData.scale] || userData.scale}</span>
        </div>
      )}

      <div className={styles.domainNameWrap}>
        <h2 className={styles.domainName}>{item.name}</h2>
      </div>

      {/* ── 2. HORIZON GOAL ── */}
      <div className={styles.horizonGoal}>
        {activeFocus && focusGoal ? (
          <>
            <span className={styles.goalLabel}>Local horizon goal</span>
            {focusGoal}
          </>
        ) : isPlaceholder ? (
          <>
            <span className={styles.goalLabel}>Horizon goal</span>
            <span className={styles.comingSoon}>Being mapped</span>
          </>
        ) : (
          <>
            <span className={styles.goalLabel}>Horizon goal</span>
            {item.horizonGoal}
          </>
        )}
      </div>

      {/* ── 3. SCALE SELECTOR ── */}
      <FocusSelector
        current={activeFocus}
        onSelect={f => { setActiveFocus(f); setFieldExpanded(false) }}
        onClear={() => { setActiveFocus(null); setFocusActors([]); setFocusGoal(null) }}
      />

      {/* ── 4. ABOUT THIS DOMAIN ── */}
      {item.description && item.description !== "placeholder" && item.description !== "Being mapped" && (
        <div className={styles.aboutSection}>
          <span className={styles.sectionLabel}>About this domain</span>
          <p className={styles.description}>{item.description}</p>
        </div>
      )}

      <div className={styles.divider} />

      {/* ── 5. SIT REP ── */}
      <DASection label="Sit rep" />

      {/* ── 6. HOW WE MEASURE THIS ── */}
      <DASection label="How we measure this" />

      {/* ── 7. GAP MAP ── */}
      <DASection label="Gap map" />

      <div className={styles.divider} />

      {/* ── 8. ORGS. AND INDIVIDUALS ── */}
      <div className={styles.orgsSection}>
        <div className={styles.orgsSectionHeader}>
          <span className={styles.sectionLabel}>Orgs. and individuals</span>
          {rootDomainId && (
            <div className={styles.infoWrap}>
              <span className={styles.infoIcon}>ⓘ</span>
              <div className={styles.infoTooltip}>
                The foundations, organisations, co-ops, projects, and initiatives actively working toward the horizon goal in this domain.
              </div>
            </div>
          )}
        </div>

        {/* Focus-specific actors */}
        {activeFocus && (
          <div className={styles.focusActorsSection}>
            {focusLoading && <p className={styles.focusSearching}>Loading…</p>}

            {!focusLoading && focusActors.length === 0 && (
              <div className={styles.focusEmpty}>
                <p className={styles.focusEmptyText}>
                  No actors registered in {activeFocus.name} for this domain yet.
                </p>
                <p className={styles.focusEmptyHint}>
                  This is an opportunity — and a need.
                </p>
              </div>
            )}

            {!focusLoading && focusActors.length > 0 && (
              <>
                <div className={styles.actorsRow}>
                  {focusActors.slice(0, fieldExpanded ? focusActors.length : 4).map((actor) => (
                    <a
                      key={actor.id}
                      href={`/nextus/actors/${actor.id}`}
                      className={`${styles.actorChip} ${actor.winning ? '' : styles.actorChipMuted}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <div className={`${styles.actorDot} ${actor.winning ? styles.actorDotWinning : styles.actorDotMuted}`} />
                      <span className={styles.actorName}>{actor.name}</span>
                      <span className={styles.actorScale}>· {SCALE_LABELS[actor.scale] || actor.scale}</span>
                    </a>
                  ))}
                </div>
                {focusActors.length > 4 && (
                  <button className={styles.seeAllBtn} onClick={() => setFieldExpanded(e => !e)}>
                    {fieldExpanded ? 'Show less' : `See all ${focusActors.length} →`}
                  </button>
                )}
                {activeFocus?.slug && (
                  <a href={`/nextus/focus/${activeFocus.slug}`} className={styles.focusPageLink}>
                    Full {activeFocus.name} picture →
                  </a>
                )}
              </>
            )}
          </div>
        )}

        {rootDomainId && (
          <a href={'/nextus/actors?domain=' + rootDomainId} className={styles.orgsLink}>
            See who's working on this &#8594;
          </a>
        )}
      </div>

      {/* ── 9. NEEDS ── */}
      <DASection label="Needs" />

      {/* ── 10. OBSTACLES ── */}
      <DASection label="Obstacles" />

      {/* ── 11. POINT SYSTEM ── */}
      <DASection label="Point system" />

      <div className={styles.divider} />

      {/* ── 12. STAY CLOSE ── */}
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
