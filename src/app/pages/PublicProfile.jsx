// src/beta/pages/PublicProfile.jsx
// Module 2: public-facing profile at /beta/profile/:id
// Pure rendering. Read-only. No edit affordances. No engagement metrics.
// References Module 1.5 primitives natively.

import { useParams } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { usePublicProfile } from '../hooks/usePublicProfile'
import { ProfileIdentityStrip }    from '../components/ProfileIdentityStrip'
import { ProfilePlaces }           from '../components/ProfilePlaces'
import { ProfileWheels }           from '../components/ProfileWheels'
import { ProfileSprints }          from '../components/ProfileSprints'
import { ProfileStands }           from '../components/ProfileStands'
import { ProfileOffering }         from '../components/ProfileOffering'
import { ProfileNotFor }           from '../components/ProfileNotFor'
import { ProfileSprintReceipts }   from '../components/ProfileSprintReceipts'
import { ProfileEmpty }            from '../components/ProfileEmpty'
import { WatchButton }             from '../components/WatchButton'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

function Divider() {
  return (
    <div style={{
      height: '1px',
      background: 'rgba(200,146,42,0.10)',
      marginBottom: '72px',
    }} />
  )
}

function LoadingState() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div className="loading" />
    </div>
  )
}

function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF7',
    }}>
      <Nav activePath="" />
      <div style={{
        maxWidth: '560px',
        margin: '0 auto',
        padding: '160px 24px',
        textAlign: 'center',
      }}>
        <p style={{
          ...body,
          fontSize: '17px',
          fontWeight: 400,
          color: 'rgba(15,21,35,0.55)',
          lineHeight: 1.75,
        }}>
          This profile does not exist or has not been made public.
        </p>
      </div>
    </div>
  )
}

// Rendered when the developmental profile's visibility setting excludes the
// current viewer. Distinct from NotFound — the profile exists, the viewer
// just isn't permitted to see it. Worded so it doesn't confirm or deny
// the existence of the profile to viewers who shouldn't have that signal.
function PrivateProfile() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF7',
    }}>
      <Nav activePath="" />
      <div style={{
        maxWidth: '560px',
        margin: '0 auto',
        padding: '160px 24px',
        textAlign: 'center',
      }}>
        <p style={{
          ...body,
          fontSize: '17px',
          fontWeight: 400,
          color: 'rgba(15,21,35,0.55)',
          lineHeight: 1.75,
        }}>
          This profile is private.
        </p>
      </div>
    </div>
  )
}

export function PublicProfile() {
  const { id } = useParams()
  const { user } = useAuth()
  const { data, loading, error, isPrivate } = usePublicProfile(id)

  if (loading) return <LoadingState />
  if (isPrivate) return <PrivateProfile />
  if (error || !data) return <NotFound />

  const isSelf = user && user.id === id
  const {
    profile,
    focusName,
    horizonByDomain,
    selfWheelPublic,
    civWheelPublic,
    iaStatements,
    activeSprints,
    completedSprints,
    purpose,
    principleTaggings,
    affiliations,
  } = data

  // Determine if profile has any visible content at all
  const hasAnyContent =
    profile.display_name ||
    profile.headline ||
    Object.keys(selfWheelPublic).length > 0 ||
    civWheelPublic.length > 0 ||
    activeSprints.length > 0 ||
    iaStatements.length > 0 ||
    profile.what_i_stand_for ||
    profile.count_on_me_for ||
    profile.dont_count_on_me_for ||
    completedSprints.length > 0 ||
    (affiliations && affiliations.length > 0)

  // Primary IA statement — first public ia statement, or purpose statement
  const primaryIAStatement =
    iaStatements[0]?.statement || purpose.statement || null

  // Remaining IA statements (2..n) go into the "What I stand for" section
  const standsIAStatements = iaStatements.slice(primaryIAStatement === iaStatements[0]?.statement ? 1 : 0)

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav activePath="" />

      <div style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 48px) 160px',
      }}>

        {/* Identity strip — always renders if any content exists */}
        {hasAnyContent ? (
          <ProfileIdentityStrip
            displayName={profile.display_name}
            focusName={focusName}
            headline={profile.headline}
            primaryIAStatement={primaryIAStatement}
            archetype={purpose.archetype}
            civDomain={purpose.domain}
            scale={purpose.scale}
          />
        ) : (
          <ProfileEmpty displayName={profile.display_name} />
        )}

        {/* Places — public affiliations with cascade breadcrumbs.
            Sits between identity (who I am) and wheels (what state I'm in
            across the seven). Identity is enriched by where I'm of. */}
        {affiliations && affiliations.length > 0 && (
          <>
            <ProfilePlaces affiliations={affiliations} />
            <Divider />
          </>
        )}

        {/* Wheels — Self and civilisational side by side */}
        {hasAnyContent && (
          <>
            <ProfileWheels
              selfWheelPublic={selfWheelPublic}
              civWheelPublic={civWheelPublic}
              horizonByDomain={horizonByDomain}
            />

            {/* Divider only if wheels rendered */}
            {(Object.keys(selfWheelPublic).length > 0 || civWheelPublic.length > 0) && (
              <Divider />
            )}
          </>
        )}

        {/* What I am working on */}
        <ProfileSprints activeSprints={activeSprints} />
        {activeSprints.length > 0 && <Divider />}

        {/* What I stand for */}
        <ProfileStands
          iaStatements={standsIAStatements}
          whatIStandFor={profile.what_i_stand_for}
          principleTaggings={principleTaggings}
        />
        {(standsIAStatements.length > 0 || profile.what_i_stand_for || principleTaggings.length > 0) && (
          <Divider />
        )}

        {/* What I am offering */}
        <ProfileOffering countOnMeFor={profile.count_on_me_for} />
        {profile.count_on_me_for && <Divider />}

        {/* What I am not for */}
        <ProfileNotFor dontCountOnMeFor={profile.dont_count_on_me_for} />
        {profile.dont_count_on_me_for && <Divider />}

        {/* Sprint receipts */}
        <ProfileSprintReceipts completedSprints={completedSprints} />

        {/* Watch button — signed-in viewer, not own profile. Quietly placed
            at the foot of the profile; watching is a private act. */}
        {user && !isSelf && (
          <div style={{
            marginTop: '48px',
            paddingTop: '32px',
            borderTop: '1px solid rgba(200,146,42,0.10)',
            textAlign: 'center',
          }}>
            <WatchButton
              entityType="person"
              entityId={id}
              entityName={profile.display_name || 'this person'}
              size="sm"
            />
          </div>
        )}

      </div>
    </div>
  )
}
