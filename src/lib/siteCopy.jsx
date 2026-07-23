// ─────────────────────────────────────────────────────────────
// siteCopy.js
//
// One registry of every editable string on the public site, and the
// runtime that resolves each one to either the founder's saved override
// or the built-in default.
//
// How it fits together:
//   • COPY_GROUPS  — the registry. Each item has a stable id, a human
//                    label for the founder editor, and a default value.
//                    The default here is the single source of truth for
//                    the text, so wrapping a string never duplicates it.
//   • <Copy id>    — (in components/Copy.jsx) renders the resolved text
//                    as a pure text node, inheriting the parent's styling.
//                    Wrapping a string never changes how it looks.
//   • useCopyText  — resolver for one id (used by <Copy>).
//   • useCopy      — returns t(id), for building data arrays where a
//                    component can't render a <Copy> element inline.
//   • SiteCopyProvider — loads the override table once at app start and
//                    feeds every resolver. An empty table = the defaults,
//                    so the site works with or without any overrides.
//
// Adding a string to the editor is two steps: add an item here, then
// wrap the literal in the component with <Copy id="..."/> (or t('...')).
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../hooks/useSupabase'

// ── The registry ─────────────────────────────────────────────
// Grouped by surface for the founder editor. `multiline: true` tells the
// editor to show a textarea instead of a single-line field.
export const COPY_GROUPS = [
  {
    id: 'home',
    label: 'Home',
    items: [
      // Hero
      { id: 'home.hero.eyebrow',  label: 'Hero · eyebrow',  default: 'A LIFE WORTH LIVING. A FUTURE WORTH BUILDING.' },
      { id: 'home.hero.title',    label: 'Hero · title',    default: 'NextUs: Build the future' },
      { id: 'home.hero.title2',   label: 'Hero · title line 2 (smaller)', default: "The world's future and yours, built in unison." },
      { id: 'home.hero.cta',      label: 'Hero · button',   default: 'Start' },
      { id: 'home.hero.subtitle', label: 'Hero · subtitle', multiline: true,
        default: "Both have to be built at the same time, or the structure collapses. The world runs the way a person does when they have no clear goals and are carrying old unprocessed pain. That's because the world is made up of roughly 8 billion people in roughly that state." },
      { id: 'home.hero.whatis', label: 'Hero · what NextUs is', multiline: true,
        default: "Build a dream world without getting people ready for it and it collapses. Do only personal development without building the wider structures to match and the pain is unbearable. So NextUs does both: the tools, concepts and strategies that develop a person are almost the same as the ones that develop the world, and they're built in here." },
      { id: 'home.hero.closer', label: 'Hero · closer', multiline: true,
        default: 'Get clear on where you are going, then where you are, then plot the way there. NextUs, building the future, now.' },

      // Fractal wheels · caption (moved-down original hero copy)
      { id: 'home.hero.domains', label: 'Wheels · framing line',
        default: 'Your life and the world run on seven mirrored domains. Similar at both scales, not identical.' },
      { id: 'home.hero.builton', label: 'Wheels · built on that', multiline: true,
        default: "NextUs is built on that. A clear picture of where you stand, a direction for where you're going, and the people already building the future you want to live in. One set of tools, two scales: your life, and your world." },
      { id: 'home.hero.twosides', label: 'Wheels · two sides', multiline: true,
        default: 'NextUs is a website with two sides: tools to get your own life where you want it, and a map of the people and organisations building a better world · so you can join them.' },

      // Two doors
      { id: 'home.doors.eyebrow',     label: 'Two doors · eyebrow', default: 'THE PERSON AND THE PLANET · BUILT FOR BOTH, BUILDING BOTH' },
      { id: 'home.door.life.heading', label: 'Door · life · heading', default: 'Your life' },
      { id: 'home.door.life.body',    label: 'Door · life · body', multiline: true,
        default: 'Get a clear read on your life and a practice for closing the gap between where you are and where you mean to be.' },
      { id: 'home.door.life.cta',     label: 'Door · life · button', default: 'START' },
      { id: 'home.door.world.heading', label: 'Door · world · heading', default: 'Your world' },
      { id: 'home.door.world.body',    label: 'Door · world · body', multiline: true,
        default: 'Find the people, organisations, and work already building the future you want to live in, and add your own.' },
      { id: 'home.door.world.cta',     label: 'Door · world · button', default: 'EXPLORE' },

      // Proof of life
      { id: 'home.pol.eyebrow', label: 'Proof of life · eyebrow', default: 'ALREADY ON THE MAP' },

      // How it works
      { id: 'home.hiw.eyebrow',  label: 'How it works · eyebrow',  default: 'HOW IT WORKS' },
      { id: 'home.hiw.subtitle', label: 'How it works · subtitle', default: 'The same three steps, at the scale of a single life and the scale of a civilisation.' },

      // How it works · life track
      { id: 'home.hiw.life.label',   label: 'HIW · life · label',   default: 'FOR YOUR LIFE' },
      { id: 'home.hiw.life.heading', label: 'HIW · life · heading', default: 'A life worth living' },
      { id: 'home.hiw.life.lede',    label: 'HIW · life · lede', multiline: true,
        default: "You work hard, you have done a lot, and you want to feel more — you want to BE more. What's been missing is a connection to a vision that moves you, and a way to move it where you want it to go." },
      { id: 'home.hiw.life.s1.title', label: 'HIW · life · step 1 title', default: 'See where you actually stand' },
      { id: 'home.hiw.life.s1.body',  label: 'HIW · life · step 1 body', multiline: true,
        default: "NextUs' The Map shows you where you are across seven domains — Path, Spark, Body, Finances, Connection, Inner Game, and Signal. It's deliberate work, challenging work, not a quiz. Whether you're taking real stock for the first time or you've circled the same thing for years, you're in the right place. Where does your life actually stand right now?" },
      { id: 'home.hiw.life.s2.title', label: 'HIW · life · step 2 title', default: 'Decide where it goes' },
      { id: 'home.hiw.life.s2.body',  label: 'HIW · life · step 2 body', multiline: true,
        default: "With that picture in front of you, you're asked to choose a spot on the horizon to aim yourself at. If the work worked and the healing healed and your life was exactly how you wished it to be… what would that look like? Who would you be in it? NextUs guides you through that visioning into embodiment. The result is direction you chose, not direction you drifted into." },
      { id: 'home.hiw.life.s3.title', label: 'HIW · life · step 3 title', default: "Build toward it — and don't do it alone" },
      { id: 'home.hiw.life.s3.body',  label: 'HIW · life · step 3 body', multiline: true,
        default: "Horizon Practice turns that direction into a daily practice you can actually keep, and the Atlas connects you to the people and the work already building the future you named. The result is momentum, and company for the road." },
      { id: 'home.hiw.life.cta',     label: 'HIW · life · button', default: 'START WITH THE MAP →' },

      // How it works · world track
      { id: 'home.hiw.world.label',   label: 'HIW · world · label',   default: 'FOR THE WORLD' },
      { id: 'home.hiw.world.heading', label: 'HIW · world · heading', default: 'A future worth building' },
      { id: 'home.hiw.world.lede',    label: 'HIW · world · lede', multiline: true,
        default: "The world isn't short on caring or effort. What's been missing is the frame and structure to connect, coordinate and collaborate with others building the future alongside you." },
      { id: 'home.hiw.world.s1.title', label: 'HIW · world · step 1 title', default: 'Name the future worth building' },
      { id: 'home.hiw.world.s1.body',  label: 'HIW · world · step 1 body', multiline: true,
        default: "Humanity has never once sat down and agreed what it's building toward. NextUs offers horizon goals as starting points and makes the current state a picture you can see — and whether you've never known where to start or you've been at it for years, you're in the right place. What future do you actually want to live in?" },
      { id: 'home.hiw.world.s2.title', label: 'HIW · world · step 2 title', default: 'Find where you come in' },
      { id: 'home.hiw.world.s2.body',  label: 'HIW · world · step 2 body', multiline: true,
        default: "Of seven domains, which is yours — and at what scale, close to home or system-wide? If you're not yet sure what you're building toward, Purpose Piece helps you find the contribution that's yours to make. If you're already deep in your corner, the platform will meet you and amplify what you're up to." },
      { id: 'home.hiw.world.s3.title', label: 'HIW · world · step 3 title', default: "See who's already building it — and connect" },
      { id: 'home.hiw.world.s3.body',  label: 'HIW · world · step 3 body', multiline: true,
        default: "The NextUs Atlas is a living directory of the people, organisations, and projects doing the real work across those seven domains. Find who to back, join, or learn from in your corner — then add your weight: support the people already building, point others toward work that deserves to be seen, or make your own work visible to the people most likely to be served by it." },
      { id: 'home.hiw.world.cta',     label: 'HIW · world · button', default: 'EXPLORE THE ATLAS →' },

      // How it works · shared bridge line under both tracks
      { id: 'home.hiw.bridge', label: 'HIW · bridge line', multiline: true,
        default: 'Work on your life and it shows up in the world; work on the world and your life has somewhere to point.' },

      { id: 'home.hiw.seeall', label: 'How it works · see all link', default: 'See all the tools →' },

      // Align band
      { id: 'home.align.eyebrow', label: 'Align band · eyebrow', default: 'ALIGN WITH WHAT MATTERS' },
      { id: 'home.align.line1',   label: 'Align band · line 1', default: 'Personal growth and global impact are not separate.' },
      { id: 'home.align.line2',   label: 'Align band · line 2', default: 'They are the same work, at different scales.' },
      { id: 'home.align.cta',     label: 'Align band · button', default: 'See how the two sides connect →' },

      // Founder band
      { id: 'home.founder.eyebrow', label: 'Founder band · eyebrow', default: 'FROM THE FOUNDER' },
      { id: 'home.founder.heading', label: 'Founder band · heading', default: 'Work with Nik' },
      { id: 'home.founder.body',    label: 'Founder band · body', multiline: true,
        default: 'Vision and embodiment coaching for people who are ready to move · not just understand.' },
      { id: 'home.founder.cta',     label: 'Founder band · button', default: 'SEE THE WORK →' },

      // Maker band
      { id: 'home.maker.eyebrow', label: 'Maker band · eyebrow', default: 'FOR MAKERS' },
      { id: 'home.maker.heading', label: 'Maker band · heading', default: 'Coach, facilitator, therapist, organisation?' },
      { id: 'home.maker.body',    label: 'Maker band · body', multiline: true,
        default: 'Make your work visible to the people most likely to be served by it.' },
      { id: 'home.maker.cta',     label: 'Maker band · button', default: 'SEE THE PATHS →' },
    ],
  },
]

// Flat id → default lookup, derived from the groups above.
export const COPY_DEFAULTS = Object.fromEntries(
  COPY_GROUPS.flatMap(g => g.items.map(i => [i.id, i.default]))
)

// ── Runtime ──────────────────────────────────────────────────
const SiteCopyContext = createContext({ overrides: {}, loaded: false, refresh: () => {} })

export function SiteCopyProvider({ children }) {
  const [overrides, setOverrides] = useState({})
  const [loaded, setLoaded]       = useState(false)

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('site_copy').select('id, value')
      if (error) throw error
      const map = {}
      for (const row of data || []) map[row.id] = row.value
      setOverrides(map)
    } catch {
      // Network or table missing: fall through to defaults silently.
      setOverrides({})
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <SiteCopyContext.Provider value={{ overrides, loaded, refresh: load }}>
      {children}
    </SiteCopyContext.Provider>
  )
}

// Resolve a single id: override if present, else the built-in default.
export function useCopyText(id) {
  const { overrides } = useContext(SiteCopyContext)
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, id)) return overrides[id]
  return COPY_DEFAULTS[id] ?? ''
}

// Resolver function, for building data arrays inside a component.
export function useCopy() {
  const { overrides } = useContext(SiteCopyContext)
  return useCallback((id) => {
    if (overrides && Object.prototype.hasOwnProperty.call(overrides, id)) return overrides[id]
    return COPY_DEFAULTS[id] ?? ''
  }, [overrides])
}

export function useSiteCopyMeta() {
  return useContext(SiteCopyContext)
}

// ── Founder write ────────────────────────────────────────────
// Upsert a single override. Founder-only at the DB (site_copy RLS,
// migration 156). Returns true on success. Also used to store card
// image paths (id like 'mc.card.northstar.image', value = storage path).
export async function saveCopy(id, value) {
  try {
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth?.user?.id || null
    const { error } = await supabase
      .from('site_copy')
      .upsert(
        { id, value, updated_at: new Date().toISOString(), updated_by: uid },
        { onConflict: 'id' }
      )
    if (error) throw error
    return true
  } catch (e) {
    console.warn('saveCopy failed', e?.message)
    return false
  }
}

// Public URL for a founder-uploaded site image (bucket from migration 177).
export function siteImageUrl(path) {
  if (!path) return null
  const { data } = supabase.storage.from('site-images').getPublicUrl(path)
  return data?.publicUrl || null
}

// Remove an override — the string reverts to its in-code default.
export async function clearCopy(id) {
  try {
    const { error } = await supabase.from('site_copy').delete().eq('id', id)
    if (error) throw error
    return true
  } catch (e) {
    console.warn('clearCopy failed', e?.message)
    return false
  }
}
