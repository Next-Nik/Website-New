import { useState, useEffect, useRef } from "react";
import { SCALE_LABELS } from "./currentState";
import styles from "./DomainPanel.module.css";
import { supabase } from "../../hooks/useSupabase";

// ── SCALE HIERARCHY ──────────────────────────────────────────────────────────
const SCALE_LEVELS = [
  { type: 'continent',    label: 'Continent' },
  { type: 'nation',       label: 'Nation' },
  { type: 'province',     label: 'Province / Territory' },
  { type: 'city',         label: 'City' },
  { type: 'neighbourhood',label: 'Neighbourhood' },
]

// Walk parent_id chain upward to build contributing-to breadcrumb
async function buildChain(focus) {
  const chain = []
  let current = focus
  while (current.parent_id) {
    const { data } = await supabase
      .from('nextus_focuses')
      .select('id, name, type, parent_id')
      .eq('id', current.parent_id)
      .single()
    if (!data) break
    chain.push(data)
    current = data
  }
  // chain is from immediate parent up to planet — reverse so it reads planet-down
  return chain.reverse()
}

// ── FOCUS SELECTOR ────────────────────────────────────────────────────────────
function FocusSelector({ current, chain, onSelect, onClear }) {
  const [open, setOpen]         = useState(false)
  const [activeType, setActiveType] = useState(null)
  const [results, setResults]   = useState([])
  const [query, setQuery]       = useState('')
  const [busy, setBusy]         = useState(false)
  const debounce                = useRef(null)
  const wrapRef                 = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setActiveType(null); setResults([]); setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function selectLevel(type) {
    setActiveType(type)
    setQuery('')
    setBusy(true)
    const { data } = await supabase
      .from('nextus_focuses')
      .select('id, name, type, slug, parent_id')
      .eq('type', type)
      .order('name')
      .limit(80)
    setResults(data || [])
    setBusy(false)
  }

  useEffect(() => {
    if (!activeType || !query.trim()) return
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setBusy(true)
      const { data } = await supabase
        .from('nextus_focuses')
        .select('id, name, type, slug, parent_id')
        .eq('type', activeType)
        .ilike('name', `%${query.trim()}%`)
        .order('name').limit(40)
      setResults(data || [])
      setBusy(false)
    }, 220)
  }, [query, activeType])

  async function handleSelect(f) {
    setOpen(false); setActiveType(null); setResults([]); setQuery('')
    const upChain = await buildChain(f)
    onSelect(f, upChain)
  }

  const displayResults = query.trim()
    ? results.filter(r => r.name.toLowerCase().includes(query.toLowerCase()))
    : results

  return (
    <div ref={wrapRef} className={styles.focusBar}>
      <button className={styles.focusTrigger} onClick={() => { setOpen(o => !o); setActiveType(null); setResults([]) }}>
        <span className={styles.focusEyebrow}>Scale</span>
        <span className={styles.focusName}>{current ? current.name : 'Global'}</span>
        <span className={styles.focusChevron}>{open ? '▴' : '▾'}</span>
      </button>

      {current && (
        <button className={styles.focusClear} onClick={onClear} title="Return to global view">×</button>
      )}

      {open && (
        <div className={styles.focusDropdown}>
          {/* Step 1 — pick a scale level */}
          {!activeType && (
            <>
              <button className={styles.focusOption} onClick={() => { onClear(); setOpen(false) }}>
                <span className={styles.focusOptionName}>Global</span>
                <span className={styles.focusOptionType}>Planet</span>
              </button>
              {SCALE_LEVELS.map(s => (
                <button key={s.type} className={styles.focusOption} onClick={() => selectLevel(s.type)}>
                  <span className={styles.focusOptionName}>{s.label}</span>
                  <span className={styles.focusOptionType}>›</span>
                </button>
              ))}
            </>
          )}

          {/* Step 2 — pick a place within that level */}
          {activeType && (
            <>
              <div className={styles.focusLevelHeader}>
                <button className={styles.focusBackBtn} onClick={() => { setActiveType(null); setResults([]); setQuery('') }}>
                  ← Back
                </button>
                <span className={styles.focusLevelLabel}>
                  {SCALE_LEVELS.find(s => s.type === activeType)?.label}
                </span>
              </div>
              <div className={styles.focusSearchWrap}>
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={`Search…`}
                  className={styles.focusInput}
                />
              </div>
              {busy && <p className={styles.focusSearching}>Loading…</p>}
              {!busy && displayResults.length === 0 && (
                <p className={styles.focusSearching}>No results</p>
              )}
              {!busy && displayResults.map(f => (
                <button key={f.id} className={styles.focusOption} onClick={() => handleSelect(f)}>
                  <span className={styles.focusOptionName}>{f.name}</span>
                </button>
              ))}
            </>
          )}
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
  const [focusChain, setFocusChain]       = useState([]);

  const isPlaceholder = item.horizonGoal === "placeholder";

  useEffect(() => {
    if (!activeFocus || !item.id) {
      setFocusActors([])
      setFocusGoal(null)
      return
    }
    setFocusLoading(true)
    setFocusChain([])
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
        {isPlaceholder ? (
          <>
            <span className={styles.goalLabel}>Horizon goal</span>
            <span className={styles.comingSoon}>Being mapped</span>
          </>
        ) : (
          <>
            <span className={styles.goalLabel}>Horizon goal</span>
            {item.horizonGoal}
            {activeFocus && (
              <span className={styles.goalScope}> — in {activeFocus.name}.</span>
            )}
          </>
        )}
      </div>
      {/* Contributing-to chain */}
      {activeFocus && focusChain.length > 0 && (
        <div className={styles.contributingChain}>
          <span className={styles.contributingLabel}>Contributing to</span>
          <span className={styles.contributingPath}>
            {focusChain.map((f, i) => (
              <span key={f.id}>
                {f.name}{i < focusChain.length - 1 ? ' → ' : ' → Global'}
              </span>
            ))}
            {focusChain.length === 0 && 'Global'}
          </span>
        </div>
      )}

      {/* ── 3. SCALE SELECTOR ── */}
      <FocusSelector
        current={activeFocus}
        chain={focusChain}
        onSelect={(f, chain) => { setActiveFocus(f); setFocusChain(chain || []); setFieldExpanded(false) }}
        onClear={() => { setActiveFocus(null); setFocusActors([]); setFocusGoal(null); setFocusChain([]) }}
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
