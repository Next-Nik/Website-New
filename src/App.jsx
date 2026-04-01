import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Heptagon from "./Heptagon";
import DomainPanel from "./DomainPanel";
import ContributeModal from "./ContributeModal";
import { fetchDomains, STATIC_DOMAINS, TOP_LEVEL_GOAL } from "./data";
import styles from "./App.module.css";

const OVERVIEW_TEXT = `The Overview Effect is what astronauts report when they first see Earth from space — a sudden, irreversible recognition of the whole. The boundaries dissolve. The fragmentation that seemed inevitable from inside it becomes obviously contingent from outside it.

From that vantage point, a question becomes possible that is very hard to ask from inside the noise:

What are we actually building toward?

Not as ideology. As a genuine, shared picture of what flourishing looks like — domain by domain, scale by scale. Humanity has never seriously answered that question. NextUs is an attempt to answer it.

Seven domains. Horizon goals at every level. A shared destination — so that the people already doing the work can find each other, aim at something worth building, and compound their effort rather than scatter it.`;

export default function App() {
  const [domainTree, setDomainTree] = useState(STATIC_DOMAINS);
  const [activeIndex, setActiveIndex] = useState(null);
  const [levelPath, setLevelPath] = useState([]);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [userInitial, setUserInitial] = useState(null);

  // ── LOAD DOMAIN TREE FROM SUPABASE ───────────────────────────────────────
  useEffect(() => {
    fetchDomains().then(data => setDomainTree(data));
  }, []);

  // ── AUTH ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) return;
      const sb = createClient(supabaseUrl, supabaseKey, {
        auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
      });
      const params = new URLSearchParams(window.location.search);
      const access = params.get("sb_access");
      const refresh = params.get("sb_refresh");
      async function initAuth() {
        if (access && refresh) {
          await sb.auth.setSession({ access_token: access, refresh_token: refresh });
          const url = new URL(window.location.href);
          url.searchParams.delete("sb_access");
          url.searchParams.delete("sb_refresh");
          window.history.replaceState({}, "", url.toString());
        }
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) {
          setUserInitial((session.user.email?.split("@")[0]?.charAt(0) || "?").toUpperCase());
        }
        sb.auth.onAuthStateChange((_event, newSession) => {
          if (newSession?.user) {
            setUserInitial((newSession.user.email?.split("@")[0]?.charAt(0) || "?").toUpperCase());
          } else {
            setUserInitial(null);
          }
        });
      }
      initAuth();
    } catch {}
  }, []);

  const isIdle = activeIndex === null;

  function getNavigationState() {
    if (levelPath.length === 0) {
      return {
        currentList: domainTree,
        selectedItem: activeIndex !== null ? domainTree[activeIndex] : null,
        breadcrumb: ["NextUs"],
        level: 0,
        parentLabel: "Our Planet",
      };
    }

    // Walk the full path to build breadcrumb AND arrive at correct currentList
    let list = domainTree;
    let breadcrumb = ["NextUs"];
    let parentLabel = "Our Planet";

    for (let i = 0; i < levelPath.length; i++) {
      const item = list[levelPath[i].index];
      if (!item) break;
      breadcrumb.push(item.name);
      if (i === levelPath.length - 2) parentLabel = item.name;
      if (i < levelPath.length - 1) {
        list = item.subDomains || [];
      } else {
        // At the deepest entry — currentList is THIS item's subDomains
        parentLabel = item.name;
        list = item.subDomains || [];
      }
    }

    return {
      currentList: list,
      selectedItem: activeIndex !== null ? list[activeIndex] : null,
      breadcrumb,
      level: levelPath.length,
      parentLabel,
    };
  }

  function getItemAtPath(path) {
    if (path.length === 0) return null;
    let list = domainTree;
    let item = null;
    for (const entry of path) {
      item = list[entry.index];
      list = item.subDomains || [];
    }
    return item;
  }

  const navState = getNavigationState();

  function getCentreLabel() {
    if (levelPath.length === 0) return "Our Planet";
    return getItemAtPath(levelPath)?.name ?? "Our Planet";
  }

  function handleCentreClick() {
    if (levelPath.length === 0) {
      setOverviewOpen(prev => !prev);
    } else {
      setActiveIndex(null);
    }
  }

  const handleKey = useCallback((e) => {
    if (contributeOpen || overviewOpen) return;
    const len = navState.currentList.length;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setActiveIndex(prev => prev === null ? 0 : (prev + 1) % len);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActiveIndex(prev => prev === null ? len - 1 : (prev - 1 + len) % len);
    } else if (e.key === "Escape") {
      if (overviewOpen) { setOverviewOpen(false); return; }
      if (activeIndex !== null) setActiveIndex(null);
    }
  }, [isIdle, navState.currentList.length, activeIndex, contributeOpen, overviewOpen]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  function handleSelect(index) {
    setActiveIndex(index);
    setOverviewOpen(false);
  }

  function handlePrev() {
    const len = navState.currentList.length;
    setActiveIndex(prev => prev === null ? len - 1 : (prev - 1 + len) % len);
  }

  function handleNext() {
    const len = navState.currentList.length;
    setActiveIndex(prev => prev === null ? 0 : (prev + 1) % len);
  }

  // Click on wheel node = select AND immediately drill if has sub-domains
  function handleSelectAndDrill(index) {
    const item = navState.currentList[index];
    if (item?.subDomains?.length > 0) {
      setLevelPath(prev => [...prev, { index }]);
      setActiveIndex(null);
      setOverviewOpen(false);
    } else {
      setActiveIndex(index);
      setOverviewOpen(false);
    }
  }

  function handleExploreSubDomains() {
    if (activeIndex === null) return;
    const currentItem = navState.currentList[activeIndex];
    if (!currentItem?.subDomains?.length) return;
    setLevelPath(prev => [...prev, { index: activeIndex }]);
    setActiveIndex(null);
  }

  function handleBack() {
    if (levelPath.length === 0) {
      setActiveIndex(null);
      return;
    }
    const prevIndex = levelPath[levelPath.length - 1].index;
    setLevelPath(prev => prev.slice(0, -1));
    setActiveIndex(prevIndex);
  }

  const selectedItem = activeIndex !== null ? navState.currentList[activeIndex] : null;
  const centreLabel = getCentreLabel();

  return (
    <div className={styles.app}>
      <div className={styles.grain} aria-hidden="true" />

      <main className={styles.main}>
        <div className={styles.heptagonCol}>
          <div className={styles.heptagonWrapper}>
            <Heptagon
              domains={navState.currentList}
              activeIndex={activeIndex}
              onSelect={handleSelect}
              isIdle={isIdle}
              centreLabel={centreLabel}
              onCentreClick={handleCentreClick}
            />
          </div>
          {isIdle && (
            <p className={styles.instruction}>
              {levelPath.length === 0 ? "Select a domain to explore" : "Select a sub-domain"}
            </p>
          )}
        </div>

        <div className={styles.panelCol}>
          {overviewOpen && (
            <div className={`${styles.overviewPanel} ${styles.overviewVisible}`}>
              <p className={styles.overviewEyebrow}>NEXTUS &#183; OUR PLANET</p>
              <h2 className={styles.overviewTitle}>The Overview Effect</h2>
              <div className={styles.overviewDivider} />
              {OVERVIEW_TEXT.split("\n\n").map((para, i) => (
                <p key={i} className={styles.overviewBody}>{para}</p>
              ))}
              <p className={styles.overviewGoal}>{TOP_LEVEL_GOAL}</p>
              <button className={styles.overviewClose} onClick={() => setOverviewOpen(false)}>
                Close &#215;
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
            />
          ) : !overviewOpen && (
            <div className={styles.idlePanel}>
              <div className={styles.idleDivider} />
              <p className={styles.idleLabel}>
                {levelPath.length === 0
                  ? "Our Planet &#8212; seven domains of collective life"
                  : `${getCentreLabel()} &#8212; sub-domains`}
              </p>
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
        isOpen={contributeOpen}
        onClose={() => setContributeOpen(false)}
        domainName={selectedItem?.name ?? "this domain"}
      />
    </div>
  );
}
