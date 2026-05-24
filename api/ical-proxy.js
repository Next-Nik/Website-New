// api/ical-proxy.js
//
// Fetches a user's private iCal feed URL server-side (bypassing browser CORS
// restrictions), parses today's events from the iCalendar format, and returns
// them as clean JSON for the Horizon Practice Plan beat.
//
// POST body: { ical_url: string, date?: string (YYYY-MM-DD, defaults to today) }
// Returns:   { events: [{ id, title, start, end, time_label, all_day, note }] }
//
// The caller is responsible for ensuring the user is authenticated before
// calling this endpoint. The URL itself is the user's secret — we never log it.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { ical_url, date } = req.body || {}

  if (!ical_url || typeof ical_url !== 'string') {
    return res.status(400).json({ error: 'ical_url required' })
  }

  // Validate it looks like a URL
  let parsedUrl
  try {
    parsedUrl = new URL(ical_url)
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  // Only allow https (or webcal which we normalise to https)
  const normalised = ical_url.replace(/^webcal:\/\//i, 'https://')

  // Target date — default to today in UTC
  const targetDateStr = date || new Date().toISOString().slice(0, 10)
  const targetDate = new Date(targetDateStr + 'T00:00:00Z')
  const targetDateEnd = new Date(targetDateStr + 'T23:59:59Z')

  let raw
  try {
    const resp = await fetch(normalised, {
      headers: {
        'User-Agent': 'NextUs-Calendar/1.0',
        'Accept': 'text/calendar, application/ics, */*',
      },
      // 10s timeout
      signal: AbortSignal.timeout(10000),
    })

    if (!resp.ok) {
      return res.status(502).json({
        error: `Calendar fetch failed: ${resp.status} ${resp.statusText}`,
        hint: 'Check your iCal URL is correct and the calendar is accessible.',
      })
    }

    raw = await resp.text()
  } catch (err) {
    if (err.name === 'TimeoutError') {
      return res.status(504).json({ error: 'Calendar fetch timed out', hint: 'Your iCal URL may be slow or unreachable.' })
    }
    return res.status(502).json({ error: 'Could not reach calendar URL', hint: err.message })
  }

  // ─── Parse iCalendar ──────────────────────────────────────────────────────
  // Hand-rolled parser — avoids adding a dependency, handles the common cases
  // from Google, Apple, Outlook, and Fastmail.

  const events = []

  // Unfold long lines (RFC 5545 §3.1 — lines can be folded with CRLF+space)
  const unfolded = raw.replace(/\r?\n[ \t]/g, '')

  // Split into VEVENT blocks
  const veventMatches = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || []

  for (const block of veventMatches) {
    const get = (key) => {
      // Match KEY or KEY;PARAM=...: VALUE
      const match = block.match(new RegExp(`^${key}(?:;[^:]*)?:(.*)$`, 'm'))
      return match ? match[1].trim() : null
    }

    const dtstart = get('DTSTART')
    const dtend   = get('DTEND') || get('DURATION')
    const summary = get('SUMMARY') || '(No title)'
    const uid     = get('UID') || Math.random().toString(36).slice(2)
    const desc    = get('DESCRIPTION') || ''
    const location = get('LOCATION') || ''

    if (!dtstart) continue

    // Determine if all-day (DATE vs DATETIME)
    const allDay = /^\d{8}$/.test(dtstart)

    let startDt, endDt

    if (allDay) {
      // DATE format: YYYYMMDD
      const y = parseInt(dtstart.slice(0, 4))
      const m = parseInt(dtstart.slice(4, 6)) - 1
      const d = parseInt(dtstart.slice(6, 8))
      startDt = new Date(Date.UTC(y, m, d))
      endDt   = dtend ? (() => {
        const ey = parseInt(dtend.slice(0, 4))
        const em = parseInt(dtend.slice(4, 6)) - 1
        const ed = parseInt(dtend.slice(6, 8))
        return new Date(Date.UTC(ey, em, ed))
      })() : new Date(startDt.getTime() + 86400000)
    } else {
      // DATETIME format: YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
      startDt = parseICalDate(dtstart)
      endDt   = dtend ? parseICalDate(dtend) : new Date(startDt.getTime() + 3600000)
    }

    if (!startDt || isNaN(startDt.getTime())) continue

    // Check if this event falls on target date
    // For all-day events, check if the date range includes the target date
    // For timed events, check if start falls on target date (UTC)
    const eventStartDateStr = startDt.toISOString().slice(0, 10)

    if (allDay) {
      // All-day events: include if target date is within [startDt, endDt)
      const startMidnight = new Date(startDt.toISOString().slice(0, 10) + 'T00:00:00Z')
      const endMidnight   = new Date((endDt || startDt).toISOString().slice(0, 10) + 'T00:00:00Z')
      const targetMidnight = new Date(targetDateStr + 'T00:00:00Z')
      if (targetMidnight < startMidnight || targetMidnight >= endMidnight) continue
    } else {
      if (eventStartDateStr !== targetDateStr) continue
    }

    // Format time label
    let timeLabel = null
    if (!allDay) {
      const h = startDt.getUTCHours().toString().padStart(2, '0')
      const m = startDt.getUTCMinutes().toString().padStart(2, '0')
      timeLabel = `${h}:${m}`
    }

    // Build a note from description/location if present (truncated)
    let note = null
    if (location) {
      note = location.length > 80 ? location.slice(0, 77) + '…' : location
    } else if (desc) {
      const cleanDesc = desc.replace(/\\n/g, ' ').replace(/\\,/g, ',').replace(/\\/g, '').trim()
      if (cleanDesc.length > 10) {
        note = cleanDesc.length > 80 ? cleanDesc.slice(0, 77) + '…' : cleanDesc
      }
    }

    events.push({
      id:         uid,
      title:      decodeICalText(summary),
      start:      startDt.toISOString(),
      end:        endDt ? endDt.toISOString() : null,
      time_label: timeLabel,
      all_day:    allDay,
      note,
    })
  }

  // Sort by start time
  events.sort((a, b) => new Date(a.start) - new Date(b.start))

  return res.status(200).json({ events, date: targetDateStr })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseICalDate(str) {
  if (!str) return null
  // YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
  const clean = str.replace(/[ZT]/g, (c) => c === 'T' ? 'T' : 'Z')
  // Normalise to ISO format
  const iso = str.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/,
    '$1-$2-$3T$4:$5:$6$7'
  )
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

function decodeICalText(str) {
  if (!str) return ''
  return str
    .replace(/\\n/g, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim()
}
