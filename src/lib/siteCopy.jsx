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
      { id: 'home.hero.title',    label: 'Hero · title',    default: 'Your life and the world run on the same seven domains.' },
      { id: 'home.hero.subtitle', label: 'Hero · subtitle', multiline: true,
        default: "NextUs is built on that. An honest picture of where you stand, a clear direction for where you're going, and the people already building the future you want to live in. One set of tools, two scales: your life, and your world." },

      // Two doors
      { id: 'home.doors.eyebrow',     label: 'Two doors · eyebrow', default: 'THE PERSON AND THE PLANET · BUILT FOR BOTH, BUILDING BOTH' },
      { id: 'home.door.life.heading', label: 'Door · life · heading', default: 'Your life' },
      { id: 'home.door.life.body',    label: 'Door · life · body', multiline: true,
        default: 'Get an honest read on your life and a practice for closing the gap between where you are and where you mean to be.' },
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
      { id: 'home.hiw.life.s1.title', label: 'HIW · life · step 1 title', default: 'See where you stand' },
      { id: 'home.hiw.life.s1.body',  label: 'HIW · life · step 1 body', multiline: true,
        default: 'The Map gives an honest read of your life across seven domains: Path, Spark, Body, Finances, Connection, Inner Game, and Signal. It is deliberate work, not a quiz. A first pass takes about an hour, and many people return to it domain by domain over weeks. You leave with a clear picture of where your life actually is.' },
      { id: 'home.hiw.life.s2.title', label: 'HIW · life · step 2 title', default: 'Decide where it goes' },
      { id: 'home.hiw.life.s2.body',  label: 'HIW · life · step 2 body', multiline: true,
        default: 'With that picture in front of you, you name where you want each part of your life to be, and what you are willing to do to get there. Purpose Piece helps you find the contribution that is yours to make. The result is direction you chose, not direction you drifted into.' },
      { id: 'home.hiw.life.s3.title', label: 'HIW · life · step 3 title', default: 'Build toward it' },
      { id: 'home.hiw.life.s3.body',  label: 'HIW · life · step 3 body', multiline: true,
        default: 'Horizon Practice turns that direction into a daily practice you can keep, and the Atlas connects you to the people and work already building the future you named. The result is momentum, and company for the road.' },
      { id: 'home.hiw.life.closing', label: 'HIW · life · closing', multiline: true,
        default: 'Put in an honest hour to start. What you get back is a picture of your life you can act on, and a direction worth keeping.' },
      { id: 'home.hiw.life.cta',     label: 'HIW · life · button', default: 'START WITH THE MAP →' },

      // How it works · world track
      { id: 'home.hiw.world.label',   label: 'HIW · world · label',   default: 'FOR THE WORLD' },
      { id: 'home.hiw.world.heading', label: 'HIW · world · heading', default: 'A future worth building' },
      { id: 'home.hiw.world.s1.title', label: 'HIW · world · step 1 title', default: 'Name the future worth building' },
      { id: 'home.hiw.world.s1.body',  label: 'HIW · world · step 1 body', multiline: true,
        default: 'The same seven domains that map a life map a civilisation: Human Being, Society, Nature, Technology, Finance & Economy, Legacy, and Vision. Humanity has never sat down and agreed what it is building toward. NextUs makes that picture something you can see, and starts with a simpler question: what future do you actually want to live in?' },
      { id: 'home.hiw.world.s2.title', label: 'HIW · world · step 2 title', default: 'Find where you come in' },
      { id: 'home.hiw.world.s2.body',  label: 'HIW · world · step 2 body', multiline: true,
        default: 'Of those seven domains, which is yours to work in, and at what scale: close and local, or wide and structural? Name the domain and the scale where you most want to make an impact, and look there.' },
      { id: 'home.hiw.world.s3.title', label: 'HIW · world · step 3 title', default: 'See who is already building it' },
      { id: 'home.hiw.world.s3.body',  label: 'HIW · world · step 3 body', multiline: true,
        default: 'The Atlas is a living directory of the people, organisations, and projects doing the real work across those seven domains. In the corner you named, you can see who is already on it: who is worth backing, joining, or learning from. Then add your weight: support the people already building, point others toward work that deserves to be seen, or make your own work visible to those most likely to be served by it. The fractal runs both ways: the work you do on yourself shapes the world, and the world you help build gives that work somewhere to land.' },
      { id: 'home.hiw.world.closing', label: 'HIW · world · closing', multiline: true,
        default: 'Start by naming one part of the future you want. What you get back is a map of who is already building it, and a place to add your own.' },
      { id: 'home.hiw.world.cta',     label: 'HIW · world · button', default: 'EXPLORE THE ATLAS →' },

      { id: 'home.hiw.seeall', label: 'How it works · see all link', default: 'See all the tools →' },

      // Align band
      { id: 'home.align.eyebrow', label: 'Align band · eyebrow', default: 'ALIGN WITH WHAT MATTERS' },
      { id: 'home.align.line1',   label: 'Align band · line 1', default: 'Personal growth and global impact are not separate.' },
      { id: 'home.align.line2',   label: 'Align band · line 2', default: 'They are the same work, at different scales.' },
      { id: 'home.align.cta',     label: 'Align band · button', default: 'SEE THE WHOLE PICTURE →' },

      // Founder band
      { id: 'home.founder.eyebrow', label: 'Founder band · eyebrow', default: 'FROM THE FOUNDER' },
      { id: 'home.founder.heading', label: 'Founder band · heading', default: 'Work with Nik' },
      { id: 'home.founder.body',    label: 'Founder band · body', multiline: true,
        default: 'Vision and embodiment coaching for people who are ready to move — not just understand.' },
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
