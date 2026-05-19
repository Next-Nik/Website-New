// src/app/pages/WatchedFeed.jsx
//
// The user's Watched feed at /watched.
//
// Reuses the existing useFeed infrastructure with the 'watched' tab —
// which resolves the user/actor filter from nextus_user_watches.
//
// Chronological, no engagement weighting. Same Load-More mechanic as the
// main Feed. Empty states are watched-list-specific.

import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { useViewerContext } from '../hooks/useViewerContext'
import { useWatch } from '../hooks/useWatch'
import { useFeed, MAX_PAGES } from '../hooks/useFeed'
import { FeedItem } from '../components/feed/FeedItem'
import { body, sc, gold, parch } from '../components/feed/feedShared'
import { InfoButton } from '../components/InfoButton'

const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

export default function WatchedFeed() {
  const viewerCtx = useViewerContext()
  const { count: watchCount } = useWatch()
  const {
    items,
    loading,
    hasMore,
    reachedEnd,
    page,
    loadMore,
  } = useFeed('watched', viewerCtx)

  if (!viewerCtx) {
    return <NotSignedIn />
  }

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="" />

      <div style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 40px) 80px',
      }}>

        {/* Header */}
        <header style={{ marginBottom: '32px' }}>
          <div style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.20em',
            color: gold,
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            Sphere of interest
          </div>
          <h1 style={{
            ...display,
            fontSize: 'clamp(34px, 5vw, 48px)',
            fontWeight: 300,
            color: '#0F1523',
            margin: 0,
            marginBottom: '14px',
            lineHeight: 1.15,
          }}>
            Watched feed
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <p style={{
              ...body,
              fontSize: '15px',
              color: 'rgba(15,21,35,0.72)',
              lineHeight: 1.65,
              margin: 0,
              maxWidth: '520px',
            }}>
              Activity from the {watchCount} entities you watch. Newest first,
              no ranking weight, no boosted entries.
            </p>
            <InfoButton title="The Watched feed">
              <p style={{ margin: '0 0 10px' }}>
                The feed shows what your watched entities have published,
                newest first. No &ldquo;for you&rdquo; ranking. No engagement
                weighting. No ads.
              </p>
              <p style={{ margin: 0 }}>
                Quiet means quiet. If a watched entity hasn&rsquo;t published,
                it doesn&rsquo;t surface. The feed honours the publisher&rsquo;s
                pace.
              </p>
            </InfoButton>
          </div>
        </header>

        {/* Body */}
        {loading && <Loading />}

        {!loading && watchCount === 0 && <EmptyNoWatches />}

        {!loading && watchCount > 0 && items.length === 0 && <EmptyQuietWatches />}

        {!loading && items.length > 0 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {items.map(item => (
                <FeedItem key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>

            {hasMore && <LoadMoreButton onClick={loadMore} page={page} />}
            {reachedEnd && <EndOfFeedNotice />}
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}

function Loading() {
  return (
    <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', padding: '32px 0' }}>
      Loading&hellip;
    </p>
  )
}

function EmptyNoWatches() {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
      <p style={{ ...body, fontSize: '17px', color: '#0F1523', lineHeight: 1.55, margin: '0 0 14px' }}>
        You aren&rsquo;t watching anything yet.
      </p>
      <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.75, margin: 0 }}>
        Open any Focus profile, actor page, or person profile and tap the
        Watch button. The feed fills with what they publish from there.
      </p>
    </div>
  )
}

function EmptyQuietWatches() {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
      <p style={{ ...body, fontSize: '17px', color: '#0F1523', lineHeight: 1.55, margin: '0 0 14px' }}>
        Your watched entities have been quiet.
      </p>
      <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.75, margin: 0 }}>
        No new published activity from them recently. The feed surfaces
        publications, not presence.
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
      <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.40)', margin: '12px 0 0' }}>
        Page {page} of {MAX_PAGES}
      </p>
    </div>
  )
}

function EndOfFeedNotice() {
  return (
    <div style={{ textAlign: 'center', padding: '56px 24px 24px', borderTop: '1px solid rgba(200,146,42,0.10)', marginTop: '32px' }}>
      <p style={{
        ...body, fontSize: '17px', fontWeight: 300, fontStyle: 'italic',
        color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, margin: 0,
        maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto',
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
          The watched feed is for signed-in members.
        </p>
        <button onClick={() => navigate('/login?redirect=/watched')} style={{
          ...sc, fontSize: '13px', letterSpacing: '0.16em',
          color: gold, background: 'rgba(200,146,42,0.05)',
          border: '1px solid rgba(200,146,42,0.55)',
          borderRadius: '30px', padding: '10px 24px',
          cursor: 'pointer', textTransform: 'uppercase',
        }}>
          Sign in
        </button>
      </div>
    </div>
  )
}
