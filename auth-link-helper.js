// ============================================================
// LIFE OS — AUTH LINK HELPER
// Add to nextus.world pages that link to Life OS tools.
//
// Usage:
//   <a href="https://tool.vercel.app" class="lifeos-link">Open tool</a>
//
// On click, appends ?sb_access=...&sb_refresh=... to the URL
// so the tool can establish a cross-domain session on load.
// Falls back to plain navigation if no session.
// ============================================================

(async function() {
  const SB_URL = 'https://tphbpwzozkskytoichho.supabase.co';
  const SB_KEY = 'sb_publishable_M00GF1FWV5tgKHqmyRCZag_kJjgBJn-';

  async function getSessionTokens() {
    try {
      const sb = window.supabase.createClient(SB_URL, SB_KEY);
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return null;
      return {
        access:  session.access_token,
        refresh: session.refresh_token,
      };
    } catch(e) {
      return null;
    }
  }

  function buildToolUrl(href, tokens) {
    const url = new URL(href);
    if (tokens) {
      url.searchParams.set('sb_access',  tokens.access);
      url.searchParams.set('sb_refresh', tokens.refresh);
    }
    return url.toString();
  }

  // Intercept clicks on elements with data-lifeos-tool attribute
  document.addEventListener('click', async (e) => {
    const link = e.target.closest('[data-lifeos-tool]');
    if (!link) return;
    e.preventDefault();
    const href = link.getAttribute('href') || link.dataset.href;
    if (!href) return;
    const tokens = await getSessionTokens();
    window.location.href = buildToolUrl(href, tokens);
  });

  // Also expose as a utility function for programmatic use
  window.openLifeOSTool = async function(href) {
    const tokens = await getSessionTokens();
    window.location.href = buildToolUrl(href, tokens);
  };
})();
