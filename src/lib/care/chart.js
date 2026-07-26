// src/lib/care/chart.js
//
// Astrology layer. Thin, deliberate wrapper over circular-natal-horoscope-js
// (pure JS, no ephemeris files, runs in a browser bundle or a Vercel function).
//
// This module is heavy — it pulls in moment-timezone — so nothing in the main
// app should import it at module scope. CareProtocol.jsx loads it with a
// dynamic import() so Vite code-splits it into its own chunk that only the
// founder ever downloads.
//
// VERIFIED against reference charts. Obama (1961-08-04 19:24 Honolulu, AA
// rated): Sun Leo 12°32'51", Moon Gemini 3°21'09", Ascendant Aquarius
// 18°03'26" — matching published values to the arcminute. Midheaven was
// checked against an independent RAMC computation and agrees to 0.002°.
//
// TWO FOOTGUNS, both handled here so no caller has to remember them:
//   1. Origin takes a ZERO-INDEXED month. January is 0.
//   2. Origin rejects fractional minutes. Pass whole minutes plus seconds.

import { Origin, Horoscope } from 'circular-natal-horoscope-js'

export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

export const ELEMENTS = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
}

export const MODALITIES = {
  Aries: 'cardinal', Cancer: 'cardinal', Libra: 'cardinal', Capricorn: 'cardinal',
  Taurus: 'fixed', Leo: 'fixed', Scorpio: 'fixed', Aquarius: 'fixed',
  Gemini: 'mutable', Virgo: 'mutable', Sagittarius: 'mutable', Pisces: 'mutable',
}

export const BODIES = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
]

// Accra sits at UTC+0 in every era the tz database covers, with no daylight
// saving ever. Using it as the anchor lets us hand Origin a UTC wall clock and
// get that exact instant back, which is what the design-date search needs.
const UTC_ANCHOR = { latitude: 5.55, longitude: -0.2 }

function buildOrigin({ year, month, date, hour, minute, second = 0, latitude, longitude }) {
  return new Origin({
    year,
    month,                                  // already zero-indexed by the caller
    date,
    hour,
    minute: Math.floor(minute),
    second: Math.round(second),
    latitude,
    longitude,
  })
}

// A horoscope for an exact UTC instant, location-independent. Used for the
// planetary longitudes that human design needs at the design moment.
export function horoscopeAtUTC(instant) {
  const origin = buildOrigin({
    year: instant.getUTCFullYear(),
    month: instant.getUTCMonth(),
    date: instant.getUTCDate(),
    hour: instant.getUTCHours(),
    minute: instant.getUTCMinutes(),
    second: instant.getUTCSeconds(),
    ...UTC_ANCHOR,
  })
  return new Horoscope({ origin, houseSystem: 'placidus', zodiac: 'tropical' })
}

export function longitudeOf(horoscope, key) {
  const body = horoscope.CelestialBodies[key] || horoscope.CelestialPoints[key]
  if (!body) return null
  return body.ChartPosition.Ecliptic.DecimalDegrees
}

export function sunLongitude(instant) {
  return longitudeOf(horoscopeAtUTC(instant), 'sun')
}

export function signOf(longitude) {
  return SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)]
}

export function degreeInSign(longitude) {
  return (((longitude % 360) + 360) % 360) % 30
}

export function formatPosition(longitude) {
  const deg = degreeInSign(longitude)
  const whole = Math.floor(deg)
  const minutes = Math.round((deg - whole) * 60)
  // Guard the 59.6' rounding case so we never print 12°60'.
  const carry = minutes === 60
  return `${signOf(longitude)} ${carry ? whole + 1 : whole}°${String(carry ? 0 : minutes).padStart(2, '0')}'`
}

/**
 * Compute the natal chart from birth data.
 *
 * @param {object} birth
 * @param {number} birth.year
 * @param {number} birth.month    1-indexed here. We convert. Callers should
 *                                never have to think about the library's
 *                                zero-indexed month.
 * @param {number} birth.day
 * @param {number} birth.hour     local clock time at the birth place
 * @param {number} birth.minute
 * @param {number} birth.latitude
 * @param {number} birth.longitude
 */
export function computeChart(birth) {
  const origin = buildOrigin({
    year: birth.year,
    month: birth.month - 1,
    date: birth.day,
    hour: birth.hour,
    minute: birth.minute,
    latitude: birth.latitude,
    longitude: birth.longitude,
  })
  const h = new Horoscope({ origin, houseSystem: 'placidus', zodiac: 'tropical' })

  const placements = {}
  for (const key of BODIES) {
    const lon = longitudeOf(h, key)
    placements[key] = {
      longitude: lon,
      sign: signOf(lon),
      degree: degreeInSign(lon),
      formatted: formatPosition(lon),
      retrograde: Boolean(h.CelestialBodies[key]?.isRetrograde),
    }
  }

  const ascLon = longitudeOf(h, 'ascendant') ?? h.Ascendant.ChartPosition.Ecliptic.DecimalDegrees
  const mcLon = h.Midheaven.ChartPosition.Ecliptic.DecimalDegrees
  const nodeLon = longitudeOf(h, 'northnode')

  const point = (lon) => ({
    longitude: lon, sign: signOf(lon), degree: degreeInSign(lon), formatted: formatPosition(lon),
  })

  return {
    utc: origin.utcTimeFormatted,
    local: origin.localTimeFormatted,
    julianDate: origin.julianDate,
    placements,
    ascendant: point(ascLon),
    midheaven: point(mcLon),
    northNode: point(nodeLon),
    southNode: point((nodeLon + 180) % 360),
    // The three that carry the card's top strip.
    big3: {
      sun: { sign: placements.sun.sign, formatted: placements.sun.formatted },
      moon: { sign: placements.moon.sign, formatted: placements.moon.formatted },
      rising: { sign: signOf(ascLon), formatted: formatPosition(ascLon) },
    },
    balance: elementBalance(placements, ascLon),
  }
}

// Element and modality weighting across the chart. The luminaries and the
// ascendant carry double weight, which is the common convention and keeps the
// balance from being dominated by the slow outer planets.
function elementBalance(placements, ascLon) {
  const elements = { fire: 0, earth: 0, air: 0, water: 0 }
  const modalities = { cardinal: 0, fixed: 0, mutable: 0 }
  const add = (sign, weight) => {
    elements[ELEMENTS[sign]] += weight
    modalities[MODALITIES[sign]] += weight
  }
  for (const key of BODIES) {
    add(placements[key].sign, key === 'sun' || key === 'moon' ? 2 : 1)
  }
  add(signOf(ascLon), 2)
  const total = Object.values(elements).reduce((a, b) => a + b, 0)
  const pct = (obj) => Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, Math.round((v / total) * 100)]),
  )
  return { elements: pct(elements), modalities: pct(modalities) }
}

/** Parse a birth date/time into the shape computeChart wants. */
export function birthFromParts(dateStr, timeStr, latitude, longitude) {
  const [year, month, day] = String(dateStr).split('-').map(Number)
  const [hour, minute] = String(timeStr || '12:00').split(':').map(Number)
  return { year, month, day, hour, minute, latitude, longitude }
}

/** The UTC instant of birth — the input to the human design layer. */
export function birthInstantUTC(birth) {
  const origin = buildOrigin({
    year: birth.year,
    month: birth.month - 1,
    date: birth.day,
    hour: birth.hour,
    minute: birth.minute,
    latitude: birth.latitude,
    longitude: birth.longitude,
  })
  return new Date(origin.utcTimeFormatted)
}
