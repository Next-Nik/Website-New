// src/beta/pages/BetaPublicProfile.jsx
// Module 2: public-facing profile at /beta/profile/:id
// Module 10 update: bilateral cards section added after sprint receipts.
// Cards render only when published=true (both consents). No edit affordances.

import { useParams } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { usePublicProfile }          from '../hooks/usePublicProfile'
import { ProfileIdentityStrip }      from '../components/ProfileIdentityStrip'
import { ProfileWheels }             from '../components/ProfileWheels'
import { ProfileSprints }            from '../components/ProfileSprints'
import { ProfileStands }             from '../components/ProfileStands'
import { ProfileOffering }           from '../components/ProfileOffering'
import { ProfileNotFor }             from '../components/ProfileNotFor'
import { ProfileSprintReceipts }     from '../components/ProfileSprintReceipts'
import { ProfileEmpty }              from '../components/ProfileEmpty'
import { BilateralCard }             from '../components/BilateralCard'  // Module 10

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
    <div style={{ minHeight: '100vh', background: '#FAFAF7' }}>
      <Nav activePath="" />
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '160px 24px', textAlign: 'center' }}>
        <p style={{ ...body, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.45)', lineHeight: 1.75 }}>
          This profile does not exist or has not been made public.
        </p>
      </div>
    </div>
  )
}

// ── Module 10: bilateral cards section ───────────────────────

function ProfileBilateralCards({ bilaterals }) {
  if (!bilaterals || bilaterals.length === 0) return null

  return (
    <div style={{ marginBottom: '72px' }}>
      <div style={{
        ...sc,
        fontSize: '11px',
        letterSpacing: '0.22em',
        color: 'rgba(15,21,35,0.40)',
        marginBottom: '24px',
        textTransform: 'uppercase',
      }}>
        Bilateral cards
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {bilaterals.map(b => (
          <BilateralCard
            key={b.id}
            bilateral={b}
            partyAName={b._partyAName}
            partyAId={b._partyAId}
            partyBName={b._partyBName}
            partyBId={b._partyBId}
            partyBIsOrg={b._partyBIsOrg}
            isParty={false}      // public profile: no revoke controls
          />
        ))}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

export function BetaPublicProfile() {
  const { id } = useParams()
  const { data, loading, error } = usePublicProfile(id)

  if (loading) return <LoadingState />
  if (error || !data) return <NotFound />

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
    bilaterals,         // Module 10
  } = data

  const hasAnyContent =
    profile.display_name          ||
    profile.headline              ||
    Object.keys(selfWheelPublic).length > 0 ||
    civWheelPublic.length > 0    ||
    activeSprints.length > 0     ||
    iaStatements.length > 0      ||
    profile.what_i_stand_for     ||
    profile.count_on_me_for      ||
    profile.dont_count_on_me_for ||
    completedSprints.length > 0  ||
    (bilaterals && bilaterals.length > 0)

  const primaryIAStatement =
    iaStatements[0]?.statement || purpose.statement || null

  const standsIAStatements = iaStatements.slice(
    primaryIAStatement === iaStatements[0]?.statement ? 1 : 0
  )

  const hasBilaterals = bilaterals && bilaterals.length > 0
  const hasStands     = standsIAStatements.length > 0 || profile.what_i_stand_for || principleTaggings.length > 0

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav activePath="" />

      <div style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 48px) 160px',
      }}>

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

        {hasAnyContent && (
          <>
            <ProfileWheels
              selfWheelPublic={selfWheelPublic}
              civWheelPublic={civWheelPublic}
              horizonByDomain={horizonByDomain}
            />
            {(Object.keys(selfWheelPublic).length > 0 || civWheelPublic.length > 0) && <Divider />}
          </>
        )}

        <ProfileSprints activeSprints={activeSprints} />
        {activeSprints.length > 0 && <Divider />}

        <ProfileStands
          iaStatements={standsIAStatements}
          whatIStandFor={profile.what_i_stand_for}
          principleTaggings={principleTaggings}
        />
        {hasStands && <Divider />}

        <ProfileOffering countOnMeFor={profile.count_on_me_for} />
        {profile.count_on_me_for && <Divider />}

        <ProfileNotFor dontCountOnMeFor={profile.dont_count_on_me_for} />
        {profile.dont_count_on_me_for && <Divider />}

        <ProfileSprintReceipts completedSprints={completedSprints} />
        {completedSprints.length > 0 && hasBilaterals && <Divider />}

        {/* Module 10: bilateral cards — render only when both consents are true (enforced in hook) */}
        <ProfileBilateralCards bilaterals={bilaterals} />

      </div>
    </div>
  )
}
