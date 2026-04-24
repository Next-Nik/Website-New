import { useEffect, useState } from 'react'
import { supabase } from '../hooks/useSupabase'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }

// Map browser locale → country code
function detectCountryFromLocale() {
  try {
    const lang = navigator.language || navigator.userLanguage || ''
    const parts = lang.split('-')
    const region = parts[1] || ''
    if (region) return region.toUpperCase()

    // Best-effort fallback by language
    const langMap = {
      en: 'US', es: 'ES', fr: 'FR', de: 'DE', it: 'IT',
      nl: 'NL', pt: 'BR', ja: 'JP',
    }
    return langMap[parts[0]?.toLowerCase()] || null
  } catch {
    return null
  }
}

/**
 * CrisisResources
 *
 * Props:
 *   variant       'compact' | 'full'    (default 'compact')
 *                 compact = top 3-5 for user country + brief fallback
 *                 full    = all regions, organised by country
 *   defaultCountry  string  (overrides geo-detection)
 */
export function CrisisResources({ variant = 'compact', defaultCountry = null }) {
  const [resources, setResources] = useState([])
  const [loading, setLoading]     = useState(true)
  const [country, setCountry]     = useState(defaultCountry || detectCountryFromLocale() || 'US')
  const [showOther, setShowOther] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('crisis_resources')
      .select('*')
      .eq('status', 'active')
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return
        setResources(data || [])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', fontStyle: 'italic' }}>
        Loading resources...
      </p>
    )
  }

  const localResources = resources.filter(r => r.country_code === country)
  const intlResources  = resources.filter(r => r.country_code === 'INTL')
  const otherCountries = [...new Set(
    resources
      .filter(r => r.country_code !== country && r.country_code !== 'INTL')
      .map(r => r.country_code)
  )].sort()

  if (variant === 'full') {
    return <FullDirectory resources={resources} userCountry={country} setCountry={setCountry} />
  }

  // Compact variant
  return (
    <div>
      <CountrySelect country={country} setCountry={setCountry} resources={resources} />

      {localResources.length > 0 ? (
        <div style={{ marginBottom: '24px' }}>
          {localResources.map(r => <ResourceCard key={r.id} resource={r} />)}
        </div>
      ) : (
        <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', marginBottom: '24px', fontStyle: 'italic' }}>
          We don't yet have specific resources for this region. Please use the international resources below.
        </p>
      )}

      <div style={{ borderTop: '1px solid rgba(200,146,42,0.20)', paddingTop: '20px' }}>
        <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: '#A8721A', marginBottom: '12px' }}>
          International
        </p>
        {intlResources.map(r => <ResourceCard key={r.id} resource={r} compact />)}
      </div>

      {otherCountries.length > 0 && (
        <div style={{ marginTop: '24px', borderTop: '1px solid rgba(200,146,42,0.10)', paddingTop: '16px' }}>
          <button
            onClick={() => setShowOther(!showOther)}
            style={{
              ...sc, fontSize: '12px', letterSpacing: '0.14em',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(15,21,35,0.55)', padding: 0,
            }}
          >
            {showOther ? '− Hide other regions' : '+ Resources for other regions'}
          </button>
          {showOther && (
            <div style={{ marginTop: '16px' }}>
              {otherCountries.map(cc => (
                <div key={cc} style={{ marginBottom: '20px' }}>
                  <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#A8721A', marginBottom: '8px' }}>
                    {countryName(cc)}
                  </p>
                  {resources.filter(r => r.country_code === cc).map(r => (
                    <ResourceCard key={r.id} resource={r} compact />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CountrySelect({ country, setCountry, resources }) {
  const countries = [...new Set(resources
    .filter(r => r.country_code !== 'INTL')
    .map(r => r.country_code))].sort()

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#A8721A', display: 'block', marginBottom: '6px' }}>
        Your region
      </label>
      <select
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        style={{
          ...body, fontSize: '15px', color: '#0F1523',
          padding: '9px 14px', borderRadius: '8px',
          border: '1.5px solid rgba(200,146,42,0.30)',
          background: '#FFFFFF', outline: 'none',
          minWidth: '200px',
        }}
      >
        {countries.map(cc => (
          <option key={cc} value={cc}>{countryName(cc)}</option>
        ))}
      </select>
    </div>
  )
}

function ResourceCard({ resource, compact = false }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.15)',
      borderRadius: '10px',
      padding: compact ? '14px 16px' : '16px 18px',
      marginBottom: '10px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: '12px', marginBottom: '6px', flexWrap: 'wrap',
      }}>
        <span style={{ ...body, fontSize: compact ? '15px' : '16px', fontWeight: 500, color: '#0F1523' }}>
          {resource.name}
        </span>
        {resource.hours && (
          <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.50)' }}>
            {resource.hours}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', marginBottom: resource.description ? '8px' : 0 }}>
        {resource.phone && (
          <a href={`tel:${resource.phone.replace(/\s/g, '')}`}
            style={{ ...body, fontSize: '15px', color: '#A8721A', textDecoration: 'none', fontWeight: 500 }}>
            📞 {resource.phone}
          </a>
        )}
        {resource.sms && (
          <span style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.65)' }}>
            Text: <strong>{resource.sms}</strong>
          </span>
        )}
        {resource.web_url && (
          <a href={resource.web_url} target="_blank" rel="noopener noreferrer"
            style={{ ...body, fontSize: '14px', color: '#A8721A', textDecoration: 'none', borderBottom: '1px solid rgba(200,146,42,0.3)' }}>
            Online chat
          </a>
        )}
      </div>

      {resource.description && (
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.6, marginTop: '6px', marginBottom: 0 }}>
          {resource.description}
        </p>
      )}
    </div>
  )
}

function FullDirectory({ resources, userCountry, setCountry }) {
  const byCountry = {}
  resources.forEach(r => {
    if (!byCountry[r.country_code]) byCountry[r.country_code] = []
    byCountry[r.country_code].push(r)
  })

  // Show user's country first, then alphabetical, then INTL last
  const orderedCodes = [
    ...(byCountry[userCountry] ? [userCountry] : []),
    ...Object.keys(byCountry)
      .filter(cc => cc !== userCountry && cc !== 'INTL')
      .sort(),
    ...(byCountry['INTL'] ? ['INTL'] : []),
  ]

  return (
    <div>
      {orderedCodes.map(cc => (
        <div key={cc} style={{ marginBottom: '40px' }}>
          <h3 style={{ ...body, fontSize: '20px', fontWeight: 300, color: '#0F1523', marginBottom: '14px',
            paddingBottom: '8px', borderBottom: '1px solid rgba(200,146,42,0.20)' }}>
            {countryName(cc)}
            {cc === userCountry && (
              <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#A8721A', marginLeft: '12px' }}>
                YOUR REGION
              </span>
            )}
          </h3>
          {byCountry[cc].map(r => <ResourceCard key={r.id} resource={r} />)}
        </div>
      ))}
    </div>
  )
}

function countryName(cc) {
  const names = {
    US: 'United States', CA: 'Canada', GB: 'United Kingdom', AU: 'Australia',
    IE: 'Ireland', NZ: 'New Zealand', IN: 'India', ZA: 'South Africa',
    DE: 'Germany', FR: 'France', ES: 'Spain', IT: 'Italy', NL: 'Netherlands',
    JP: 'Japan', BR: 'Brazil', MX: 'Mexico', AR: 'Argentina',
    INTL: 'International',
  }
  return names[cc] || cc
}
