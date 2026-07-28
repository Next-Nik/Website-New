# Homecoming — complete + wired on v52 (the running base)

v52 arrived with the same partial Homecoming as v51: only states.js, index.js, and
the page were present; the four other engine files, the SQL, and the wiring had
never been applied, so the tool could not build or appear. This drop completes and
wires it on the v52 tree. No backsliding: The Practice is untouched.

## What ships
- src/lib/homecoming/ — posts, states, session, guards, evidence, index (full engine).
- src/pages/Homecoming.jsx — the page (sql ref 189).
- sql/189_homecoming.sql — two founder-only tables + RLS (188 was taken by 188_practice).
- src/App.jsx, src/app/components/mission-control/ProfileMissionPanel.jsx — v52 versions with the HOMECOMING import, /homecoming route, and the front-door button seated after THE PRACTICE. Practice's own import/route/button preserved.

## Deploy
1. Unzip, drag-merge onto v52.
2. Run sql/189_homecoming.sql in Supabase.
3. Commit and push. The HOMECOMING button appears under The Practice; it opens /homecoming.

## Verified on v52
- All six engine files parse; index.js bundles with every module resolved.
- Homecoming.jsx transpiles clean. Design audit: zero violations in Homecoming files.
- The Practice preserved (import, /practice route, THE PRACTICE button all present).
