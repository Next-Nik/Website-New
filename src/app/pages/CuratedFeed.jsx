// src/app/pages/CuratedFeed.jsx
//
// The user's Curated feed at /feed — Layer 3 of bounded attention, the
// roster's output. Same chronological discipline as the Watched feed;
// the difference is filtering to *rostered* entities only.
//
// Significance-class filtering by tier ships in the v2.5c-followup once
// significance is set at publish time. For v2.5c initial, all items from
// rostered entities surface in chronological order — the user's curation
// is the filter.

import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { useViewerContext } from '../hooks/useViewerContext'
import { useRoster } from '../hooks/useRoster'
import { useFocusFeed } from '../hooks/useFocusFeed'
import { useActiveFocus } from '../hooks/useActiveFocus'
import { MAX_PAGES } from '../hooks/useFeed'
import { FeedItem } from '../components/feed/FeedItem'
import { body, sc, gold, parch } from '../components/feed/feedShared'
import { InfoButton } from '../components/InfoButton'

const display = { fontFamily: "'Lora', Georgia, serif" }

export default function CuratedFeed() {
  const { data: viewerCtx, loading: ctxLoading } = useViewerContext()
  const { slots, spent, cap } = useRoster()
  const { hasFocus } = useActiveFocus()
  const {
    items,
    loading: feedLoading,
    hasMore,
    reachedEnd,
    page,
    loadMore,
  } = useFocusFeed('curated', viewerCtx)
  const loading = ctxLoading || feedLoading

  if (!ctxLoading && !viewerCtx) return <NotSignedIn />

  return (
    <div style={{ background: parch, minHeight: '100dvh' }}>
      <Nav activePath="" />

      <div style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 40px) 80px',
      }}>

        <header style={{ marginBottom: '32px' }}>
          <div style={{
            ...sc, fontSize: '13px', letterSpacing: '0.20em',
            color: gold, textTransform: 'uppercase', marginBottom: '8px',
          }}>
            Sphere of influence
          </div>
          <h1 style={{
            ...display,
            fontSize: 'clamp(34px, 5vw, 48px)',
            fontWeight: 300, color: '#0F1523',
            margin: 0, marginBottom: '14px', lineHeight: 1.15,
          }}>
            Curated feed
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <p style={{
              ...body, fontSize: '15px',
              color: 'rgba(15,21,35,0.72)', lineHeight: 1.65,
              margin: 0, maxWidth: '520px',
            }}>
              Activity from the {slots.length} entities in your roster.
              {' '}You&rsquo;ve spent {spent} of {cap} spoons. Chronological,
              no engagement weighting.
            </p>
            <InfoButton title="The Curated feed">
              <p style={{ margin: '0 0 10px' }}>
                The Curated feed shows activity from entities in your
                roster &mdash; the ones you&rsquo;ve allocated attention
                spoons to. Sorted chronologically, no algorithmic shuffle.
              </p>
              <p style={{ margin: '0 0 10px' }}>
                The Tuned In feed at /tuned-in is wider &mdash; everything
                you&rsquo;re tuned in to. The Curated feed is narrower
                &mdash; only what you&rsquo;ve actively prioritised.
              </p>
              <p style={{ margin: '0 0 10px' }}>
                If you have an Active Focus set, items matching your focus
                surface first. Nothing is hidden &mdash; sort, not filter.
              </p>
              <p style={{ margin: 0 }}>
                Manage your roster from Profile &rarr; Edit &rarr; Roster.
              </p>
            </InfoButton>
          </div>
          {hasFocus && (
            <p style={{
              ...sc,
              fontSize: '13px',
              letterSpacing: '0.16em',
              color: gold,
              textTransform: 'uppercase',
              margin: '14px 0 0',
            }}>
              Sorted by your Active Focus
            </p>
          )}
        </header>

        {loading && <Loading />}

        {!loading && slots.length === 0 && <EmptyNoRoster />}

        {!loading && slots.length > 0 && items.length === 0 && <EmptyQuietRoster />}

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

function EmptyNoRoster() {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '520px', margin: '0 auto' }}>
      <p style={{ ...body, fontSize: '17px', color: '#0F1523', lineHeight: 1.55, margin: '0 0 14px' }}>
        Your roster is empty.
      </p>
      <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.75, margin: 0 }}>
        Allocate spoons to entities you actively want to hear from. Manage
        your roster from your profile edit page.
      </p>
    </div>
  )
}

function EmptyQuietRoster() {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '520px', margin: '0 auto' }}>
      <p style={{ ...body, fontSize: '17px', color: '#0F1523', lineHeight: 1.55, margin: '0 0 14px' }}>
        Your roster has been quiet.
      </p>
      <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.75, margin: 0 }}>
        No new published activity from the entities you&rsquo;ve allocated
        spoons to. The feed honours each publisher&rsquo;s pace.
      </p>
    </div>
  )
}

function LoadMoreButton({ onClick, page }) {
  return (
    <div style={{ textAlign: 'center', margin: '32px 0 16px' }}>
      <button onClick={onClick} style={{
        ...sc, fontSize: '13px', letterSpacing: '0.18em',
        color: gold, background: 'rgba(76,107,69,0.05)',
        border: '1px solid rgba(76,107,69,0.35)',
        borderRadius: '40px', padding: '12px 28px',
        cursor: 'pointer', textTransform: 'uppercase',
      }}>
        Load more
      </button>
      <p style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', margin: '12px 0 0' }}>
        Page {page} of {MAX_PAGES}
      </p>
    </div>
  )
}

function EndOfFeedNotice() {
  return (
    <div style={{ textAlign: 'center', padding: '56px 24px 24px', borderTop: '1px solid rgba(76,107,69,0.10)', marginTop: '32px' }}>
      <p style={{
        ...body, fontSize: '17px', fontWeight: 400,
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
    <div style={{ background: parch, minHeight: '100dvh' }}>
      <Nav activePath="" />
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '160px 24px', textAlign: 'center' }}>
        <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.75, marginBottom: '20px' }}>
          The curated feed is for signed-in members.
        </p>
        <button onClick={() => navigate('/login?redirect=/feed')} style={{
          ...sc, fontSize: '13px', letterSpacing: '0.16em',
          color: gold, background: 'rgba(76,107,69,0.05)',
          border: '1px solid rgba(76,107,69,0.55)',
          borderRadius: '30px', padding: '10px 24px',
          cursor: 'pointer', textTransform: 'uppercase',
        }}>
          Sign in
        </button>
      </div>
    </div>
  )
}
