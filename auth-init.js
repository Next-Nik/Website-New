// ============================================================
// NEXTUS — AUTH INIT (CANONICAL)
// Single version. Used on every site page and every tool.
// No auth-guard.js. No auth-link-helper.js. This is it.
//
// What it does:
//   1. Checks for sb_access/sb_refresh in URL (cross-domain legacy, safe to keep)
//   2. Calls getSession() — server-verified
//   3. If valid session: sets window.LIFEOS_USER, fires lifeos:auth with user
//   4. If no session: clears stale localStorage, fires lifeos:auth with null
//   5. Always fires the event — nothing waits indefinitely
//
// Every page and tool listens for 'lifeos:auth' and responds accordingly.
// ============================================================

(async function () {
  const SB_URL = 'https://tphbpwzozkskytoichho.supabase.co';
  const SB_KEY = 'sb_publishable_M00GF1FWV5tgKHqmyRCZag_kJjgBJn-';
  const LS_KEY = 'sb-tphbpwzozkskytoichho-auth-token';

  let sb;
  try {
    sb = window.supabase.createClient(SB_URL, SB_KEY, {
      auth: {
        storage: window.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      }
    });
  } catch (e) {
    console.warn('[AuthInit] Could not create Supabase client:', e);
    window.dispatchEvent(new CustomEvent('lifeos:auth', { detail: { user: null, session: null } }));
    return;
  }

  const AUTH_TIMEOUT_MS = 4000;

  async function resolveSession() {
    // ── Path 1: URL token params (legacy cross-domain handoff — safe to keep) ──
    const params = new URLSearchParams(window.location.search);
    const accessToken  = params.get('sb_access');
    const refreshToken = params.get('sb_refresh');

    if (accessToken && refreshToken) {
      try {
        const { data, error } = await sb.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken,
        });
        if (!error && data?.session?.user) {
          const clean = new URL(window.location.href);
          clean.searchParams.delete('sb_access');
          clean.searchParams.delete('sb_refresh');
          window.history.replaceState({}, '', clean.toString());
          return data.session;
        }
      } catch (e) {
        console.warn('[AuthInit] setSession failed:', e);
      }
    }

    // ── Path 2: getSession() — server-verified ──────────────────────────────
    const timeout = new Promise(resolve =>
      setTimeout(() => resolve({ timedOut: true }), AUTH_TIMEOUT_MS)
    );
    const sessionCheck = sb.auth.getSession()
      .then(({ data, error }) => ({ session: data?.session, error, timedOut: false }))
      .catch(e => ({ session: null, error: e, timedOut: false }));

    const result = await Promise.race([sessionCheck, timeout]);

    if (result.timedOut) {
      console.warn('[AuthInit] Session check timed out — failing open.');
      return null;
    }

    if (result.error) {
      console.warn('[AuthInit] Session check error — failing open:', result.error);
      return null;
    }

    return result.session || null;
  }

  const session = await resolveSession();

  if (session?.user) {
    window.LIFEOS_USER    = session.user;
    window.LIFEOS_USER_ID = session.user.id;
    window.LIFEOS_SESSION = session;
    window._sb = sb;
    console.log('[AuthInit] Session active:', session.user.id);
  } else {
    // No valid session — clear any stale localStorage tokens
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
    window.LIFEOS_USER = null;
    window._sb = sb;
    console.log('[AuthInit] No session.');
  }

  window.dispatchEvent(new CustomEvent('lifeos:auth', {
    detail: { user: session?.user || null, session: session || null }
  }));

})();
