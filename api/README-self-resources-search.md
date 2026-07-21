# `/api/self-resources-search`

Server-side search proxy for Layer B of the Self-side Resources Engine.

## Purpose

Surfaces "from the open web" resource suggestions for a given personal
domain and score band, restricted to a curated allowlist of source
domains. Used by `SelfDomainResources` in the Beta Mission Control
panel.

This endpoint **does not generate** content. It calls a real search
API, filters the results to known-good sources, and returns the
source's own title, URL, and description. No paraphrasing, no AI
summarisation. Provenance preserved.

## Configuration

### Required environment variables

| Variable | Required | Notes |
|---|---|---|
| `BRAVE_SEARCH_API_KEY` | Yes | Get one at <https://api.search.brave.com/>. The free tier provides 2,000 queries/month, which the front-end's caching keeps us inside indefinitely at v1 traffic. |
| `SELF_RESOURCES_SEARCH_DEBUG` | No | Set to `1` to include extra debug fields in responses (the full Brave query, allowlist mode, raw count). Off in production. |

### Vercel setup

```
Settings → Environment Variables → Add
  Name:  BRAVE_SEARCH_API_KEY
  Value: <your key>
  Apply to: Production, Preview, Development
```

## Request

```
GET /api/self-resources-search
  ?domain=path|spark|body|finances|connection|inner_game|signal
  &band=crisis|friction|plateau|capable|fluent     (optional)
  &sensitive=1                                      (optional)
  &topicMarker=<marker>                             (optional)
```

- `domain` is required and must be one of the seven SELF_KEYS.
- `band` is optional. When omitted, the endpoint uses the band-neutral
  default template for the domain (tilted toward beginners).
- `sensitive=1` flips the source allowlist to its tighter sensitive-topic
  subset (Section 6 of the brief). Forced on automatically when
  `topicMarker` matches a known sensitive marker.
- `topicMarker` is reserved for sub-domain-level routing (step 5).

## Response

Always 200 unless the request itself is malformed. Errors come back
as JSON with a `reason` string the front-end can branch on.

```jsonc
{
  "results": [
    {
      "id": "web:abc123",
      "type": "article",
      "title": "...",
      "author": "...",
      "source": "harvard.edu",
      "url": "https://...",
      "year": 2023,
      "domains": ["body"],
      "scoreBands": ["friction"],
      "summary": "<the source's own description, stripped of HTML>",
      "curatedBy": null,
      "addedAt": null,
      "sensitive": false
    }
  ],
  "reason": "ok",                // ok | no-quality-matches |
                                  // unconfigured | upstream-error |
                                  // upstream-exception
  "cacheVersion": "v1"
}
```

`reason` semantics:

- `ok` — at least one result cleared the allowlist.
- `no-quality-matches` — Brave returned results, but none cleared the
  allowlist this run. The panel shows an honest empty state.
- `unconfigured` — `BRAVE_SEARCH_API_KEY` is not set. The panel shows
  "Web sourcing has not been configured for this environment yet." 200
  rather than 500 because this is a configuration state, not an error,
  and we want the UI to handle it cleanly.
- `upstream-error` / `upstream-exception` — Brave failed. The panel
  shows "The search did not come back this time. Try again."

## Caching

24-hour Vercel Edge Cache, 7-day stale-while-revalidate. Cache key is
the full URL, so different `(domain, band, sensitive, topicMarker)`
tuples cache separately.

When you change query templates or the source allowlist, bump
`QUERY_CACHE_VERSION` in `src/beta/constants/resourceQueries.js` so
old cache entries do not mask the new query shape.

## Editorial layer

The "what we ask the web for" part of this endpoint is **not** in this
file. It lives in `src/beta/constants/resourceQueries.js`:

- `templateFor(domain, band)` — the per-(domain × band) Brave query
  string. Authored deliberately, reviewed alongside the Layer A seed.
- `SOURCE_ALLOWLIST` — the standard set of trusted source hostnames.
- `SENSITIVE_ALLOWLIST` — the tightened subset for sensitive queries.
- `SENSITIVE_TOPIC_MARKERS` — the named topic markers that flip the
  endpoint into restricted mode.

When in doubt, edit those, not this file.
