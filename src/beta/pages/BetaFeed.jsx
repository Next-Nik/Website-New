// src/beta/pages/BetaFeed.jsx
// Module 8: the Feed at /beta/feed
// Three tabs: Cohort / Local / People.
// 20 items per page, "Load more" button, max 5 pages.
// After 5 pages: "You have reached the end. Real life is happening elsewhere."
// No infinite scroll. No engagement metrics.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { useViewerContext } from '../hooks/useViewerContext'
import { useFeed, PAGE_SIZE, MAX_PAGES } from '../hooks/useFeed'
import { FeedItem } from '../components/feed/FeedItem'
import { body, sc, gold, dark, parch } from '../components/feed/feedShared'

const TABS = [
  { key: 'cohort', label: 'Cohort' },
  { key: 'local',  label: 'Local'  },
  { key: 'people', label: 'People' },
]

// ── Sub-components ───────────────────────────────────────────

function TabBar({ activeTab, onChange }) {
  return (
    <div style={{
      display: 'flex',
      gap: 0,
      borderBottom: '1px solid rgba(200,146,42,0.18)',
      marginBottom: '36px',
    }}>
      {TABS.map(tab => {
        const active = activeTab === tab.key
        return (
          <button key={tab.key} onClick={() => onChange(tab.key)}
            style={{
              ...sc,
              fontSize: '13px',
              letterSpacing: '0.18em',
              padding: '14px 20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: active ? gold : 'rgba(15,21,35,0.50)',
              borderBottom: active ? `2px solid ${gold}` : '2px solid transparent',
              marginBottom: '-1px',
              textTransform: 'uppercase',
              flex: 1,
              textAlign: 'center',
            }}>
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

function TabExplainer({ tab, viewerCtx }) {
  const lines = {
    cohort: 'Contributors aligned with your civilisational domains and your scale of work.',
    local:  viewerCtx?.activeFocus?.name
              ? `Contributors and organisations in ${viewerCtx.activeFocus.name} and the regions that contain it.`
              : 'Set a focus on your profile to see who is working in your part of the world.',
    people: 'The people you have published bilateral artefacts with. Sprint buddies. Direct relationships.',
  }
  return (
    <p style={{
      ...body,
      fontSize: '13px',
      fontWeight: 300,
      color: 'rgba(15,21,35,0.55)',
      lineHeight: 1.65,
      margin: '0 0 28px',
      maxWidth: '500px',
    }}>
      {lines[tab]}
    </p>
  )
}

function EmptyState({ tab, viewerCtx }) {
  const messages = {
    cohort: {
      title: 'Your cohort is still forming.',
      body:  'As contributors place themselves on the map and publish their work, the people doing what you are doing at your scale will appear here.',
    },
    local: {
      title: viewerCtx?.activeFocus?.name
        ? `Quiet in ${viewerCtx.activeFocus.name}.`
        : 'Set a focus to see local activity.',
      body:  viewerCtx?.activeFocus?.name
        ? 'No published activity from your region yet. The platform is small. The work that arrives here arrives slowly and it arrives true.'
        : 'Edit your profile and choose a focus. Local activity appears once the platform knows where you stand.',
    },
    people: {
      title: 'No published bilaterals yet.',
      body:  'When you and another person publish something together, or you commit to being someone\'s sprint buddy, it will show up here.',
    },
  }
  const m = messages[tab]
  return (
    <div style={{
      padding: '64px 24px',
      textAlign: 'center',
      maxWidth: '460px',
      margin: '0 auto',
    }}>
      <p style={{
        ...body,
        fontSize: '17px',
        fontWeight: 400,
        color: '#0F1523',
        lineHeight: 1.55,
        margin: '0 0 14px',
      }}>
        {m.title}
      </p>
      <p style={{
        ...body,
        fontSize: '15px',
        fontWeight: 300,
        color: 'rgba(15,21,35,0.55)',
        lineHeight: 1.75,
        margin: 0,
      }}>
        {m.body}
      </p>
    </div>
  )
}

function LoadMoreButton({ onClick, page }) {
  return (
    <div style={{ textAlign: 'center', margin: '32px 0 16px' }}>
      <button onClick={onClick} style={{
        ...sc,
        fontSize: '13px',
        letterSpacing: '0.18em',
        color: gold,
        background: 'rgba(200,146,42,0.05)',
        border: '1px solid rgba(200,146,42,0.35)',
        borderRadius: '40px',
        padding: '12px 28px',
        cursor: 'pointer',
        textTransform: 'uppercase',
      }}>
        Load more
      </button>
      <p style={{
        ...sc,
        fontSize: '11px',
        letterSpacing: '0.14em',
        color: 'rgba(15,21,35,0.40)',
        margin: '12px 0 0',
      }}>
        Page {page} of {MAX_PAGES}
      </p>
    </div>
  )
}

function EndOfFeedNotice() {
  return (
    <div style={{
      textAlign: 'center',
      padding: '56px 24px 24px',
      borderTop: '1px solid rgba(200,146,42,0.10)',
      marginTop: '32px',
    }}>
      <p style={{
        ...body,
        fontSize: '17px',
        fontWeight: 300,
        fontStyle: 'italic',
        color: 'rgba(15,21,35,0.65)',
        lineHeight: 1.7,
        margin: 0,
        maxWidth: '420px',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        You have reached the end. Real life is happening elsewhere.
      </p>
    </div>
  )
}

function NotSignedIn() {
  const navigate = useNavigate()
  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="" />
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '160px 24px', textAlign: 'center' }}>
        <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.75, marginBottom: '20px' }}>
          The feed is for signed-in beta members.
        </p>
        <button onClick={() => navigate('/login?redirect=/beta/feed')} style={{
          ...sc, fontSize: '13px', letterSpacing: '0.16em',
          color: gold, background: 'rgba(200,146,42,0.05)',
          border: '1px solid rgba(200,146,42,0.35)',
          borderRadius: '40px', padding: '11px 24px', cursor: 'pointer',
        }}>
          Sign in
        </button>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

export function BetaFeedPage() {
  const [activeTab, setActiveTab] = useState('cohort')
  const { user, data: viewerCtx, loading: ctxLoading } = useViewerContext()
  const { items, loading: feedLoading, hasMore, reachedEnd, page, totalLoaded, loadMore } = useFeed(activeTab, viewerCtx)

  if (!ctxLoading && !user) return <NotSignedIn />

  const showLoading = ctxLoading || feedLoading
  const isEmpty     = !showLoading && items.length === 0

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="" />

      <style>{`
        @media (max-width: 640px) {
          .beta-feed-main { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

      <div className="beta-feed-main" style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 48px) 160px',
      }}>

        {/* Page header */}
        <div style={{ marginBottom: '40px' }}>
          <span style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.22em',
            color: gold,
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '12px',
          }}>
            Feed
          </span>
          <h1 style={{
            ...body,
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 300,
            color: dark,
            lineHeight: 1.08,
            letterSpacing: '-0.01em',
            margin: 0,
          }}>
            What is moving.
          </h1>
        </div>

        {/* Tabs */}
        <TabBar activeTab={activeTab} onChange={setActiveTab} />

        {/* Per-tab explainer */}
        <TabExplainer tab={activeTab} viewerCtx={viewerCtx} />

        {/* Loading */}
        {showLoading && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.45)' }}>
              Gathering the feed.
            </p>
          </div>
        )}

        {/* Empty */}
        {isEmpty && <EmptyState tab={activeTab} viewerCtx={viewerCtx} />}

        {/* Items */}
        {!showLoading && items.length > 0 && (
          <>
            {items.map(item => (
              <FeedItem key={item.id} item={item} />
            ))}

            {/* Load more, if any */}
            {hasMore && <LoadMoreButton onClick={loadMore} page={page} />}

            {/* End of feed */}
            {reachedEnd && <EndOfFeedNotice />}

            {/* Soft footer when there's no more content but we haven't paged out */}
            {!hasMore && !reachedEnd && totalLoaded === items.length && totalLoaded > 0 && (
              <p style={{
                ...sc,
                fontSize: '11px',
                letterSpacing: '0.14em',
                color: 'rgba(15,21,35,0.40)',
                textAlign: 'center',
                marginTop: '32px',
                marginBottom: '0',
              }}>
                That is everything for now.
              </p>
            )}
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}
