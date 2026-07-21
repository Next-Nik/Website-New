# Indicator Worker — Required Environment Variables

These env vars are read by `api/indicator-worker.js`. Set them in the
Vercel project dashboard under Settings → Environment Variables.

---

## Already configured (existing handlers)

| Variable | Used by | Notes |
|---|---|---|
| `SUPABASE_URL` | All handlers | Already set |
| `SUPABASE_SERVICE_KEY` | All handlers | Already set |
| `OPENAQ_API_KEY` | OpenAQ handler | Optional — public endpoint works without it for low volume. Get at https://explore.openaq.org/register |

---

## New — required for new handlers

| Variable | Used by | Free? | Registration |
|---|---|---|---|
| `NASA_FIRMS_MAP_KEY` | NASA FIRMS (active wildfires) | Yes | https://firms.modaps.eosdis.nasa.gov/api/area/ |
| `IUCN_TOKEN` | IUCN Red List (species threatened) | Yes | https://apiv3.iucnredlist.org/api/v3/token |
| `PROTECTEDPLANET_API_KEY` | UNEP-WCMC Protected Planet | Yes | https://api.protectedplanet.net/api_token |

---

## No key required (public APIs)

These handlers work without any additional env var:

- `NASA GISS Surface Temperature` — public text file
- `Global Forest Watch` — public REST API
- `NOAA Coral Reef Watch` — public ERDDAP
- `NSIDC Sea Ice Index` — public text file
- `FAOSTAT` — public REST API
- `Climate TRACE` — public REST API
- `World Bank WDI` — public REST API (already working)
- `NOAA Global Monitoring Laboratory` — public text file (already working)
- `USGS Earthquake Hazards` — public REST API (already working)

---

## What happens without the keys

If a key is missing, the handler returns `status: 'failed'` with a
clear message pointing to the registration URL. The indicator's last
known-good value is preserved (is_current stays true on the prior row).
The reliability card will show these as failures until the key is added.

---

## Manual-tier indicators

64 indicators are set to `tier='manual'` after running SQL migration
`074_indicator_catalog_tier_corrections.sql`. These are excluded from
the cron entirely. Their values come from periodic manual SQL seeds
(annual reports, PDF sources, survey data). The reliability card will
no longer show them as gaps once the migration is applied.
