// LIFE OS — GLOSSARY TOOLTIP SYSTEM
// glossary-tooltip.js v1.0
//
// Fetches glossary.json from nextus.world once per session.
// Wraps any element with data-gloss="key" in a tooltip trigger.
// Works in all vanilla JS tools — no build step, no dependencies.
//
// Usage:
//   1. Include this file after your tool JS
//   2. Add data-gloss="key" to any element — e.g. data-gloss="steward"
//   3. Call GlossaryTooltip.init() after DOM is ready
//      OR add data-gloss attributes dynamically and call GlossaryTooltip.wire()
//
// Keys match glossary.json — e.g. "steward", "horizon-goals", "domain-nature"

const GlossaryTooltip = (function () {

  const GLOSSARY_URL = '/tools/map/glossary.json';
  const APPENDIX_BASE = 'https://nextus.world';

  let _glossary = null;
  let _tooltipEl = null;
  let _activeEl = null;
  let _hideTimer = null;

  // ── Fetch glossary once ────────────────────────────────────────────────────
  async function loadGlossary() {
    if (_glossary) return _glossary;
    try {
      const res = await fetch(GLOSSARY_URL);
      if (!res.ok) throw new Error('Glossary fetch failed');
      const data = await res.json();
      _glossary = data.terms || {};
    } catch (e) {
      console.warn('[Glossary] Could not load:', e);
      _glossary = {};
    }
    return _glossary;
  }

  // ── Build the single floating tooltip element ──────────────────────────────
  function buildTooltipEl() {
    if (_tooltipEl) return;

    const el = document.createElement('div');
    el.id = 'gloss-tooltip';
    el.setAttribute('role', 'tooltip');
    el.innerHTML = `
      <div class="gloss-term"></div>
      <div class="gloss-def"></div>
      <a class="gloss-link" href="#" target="_blank" rel="noopener">Full definition ↗</a>
    `;

    const style = document.createElement('style');
    style.textContent = `
      #gloss-tooltip {
        position: fixed;
        z-index: 9999;
        max-width: 280px;
        background: #0F1523;
        border: 1px solid rgba(200,146,42,0.35);
        border-radius: 8px;
        padding: 14px 16px 12px;
        box-shadow: 0 8px 32px rgba(15,21,35,0.28);
        pointer-events: none;
        opacity: 0;
        transform: translateY(6px);
        transition: opacity 0.18s ease, transform 0.18s ease;
        font-family: 'Cormorant Garamond', Georgia, serif;
      }
      #gloss-tooltip.visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: all;
      }
      #gloss-tooltip .gloss-term {
        font-family: 'Cormorant SC', Georgia, serif;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #A8721A;
        margin-bottom: 7px;
      }
      #gloss-tooltip .gloss-def {
        font-size: 14px;
        font-weight: 300;
        color: rgba(255,255,255,0.88);
        line-height: 1.65;
        margin-bottom: 10px;
      }
      #gloss-tooltip .gloss-link {
        font-family: 'Cormorant SC', Georgia, serif;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.1em;
        color: rgba(200,146,42,0.78);
        text-decoration: none;
        text-transform: uppercase;
        transition: color 0.15s ease;
        display: block;
      }
      #gloss-tooltip .gloss-link:hover {
        color: #C8922A;
      }

      /* Trigger style — applied to data-gloss elements */
      [data-gloss] {
        border-bottom: 1px dotted rgba(168,114,26,0.5);
        cursor: help;
        transition: border-color 0.15s ease;
      }
      [data-gloss]:hover {
        border-bottom-color: rgba(168,114,26,1);
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(el);
    _tooltipEl = el;

    // Hide on scroll
    window.addEventListener('scroll', hide, { passive: true });

    // Keep tooltip alive when mouse moves to it
    el.addEventListener('mouseenter', () => {
      clearTimeout(_hideTimer);
    });
    el.addEventListener('mouseleave', () => {
      scheduleHide();
    });
  }

  // ── Position tooltip near the trigger element ──────────────────────────────
  function position(triggerEl) {
    const rect = triggerEl.getBoundingClientRect();
    const tip  = _tooltipEl;
    const vw   = window.innerWidth;
    const vh   = window.innerHeight;

    // Default: below the trigger
    let top  = rect.bottom + 8;
    let left = rect.left;

    // Flip above if not enough space below
    if (top + 160 > vh) {
      top = rect.top - 8;
      tip.style.transform = 'translateY(-100%) translateY(-6px)';
    } else {
      tip.style.transform = '';
    }

    // Keep within viewport horizontally
    if (left + 280 > vw) {
      left = vw - 290;
    }
    if (left < 8) left = 8;

    tip.style.top  = top + 'px';
    tip.style.left = left + 'px';
  }

  // ── Show tooltip ───────────────────────────────────────────────────────────
  function show(triggerEl, key) {
    if (!_glossary || !_tooltipEl) return;

    const entry = _glossary[key];
    if (!entry) return;

    clearTimeout(_hideTimer);

    _tooltipEl.querySelector('.gloss-term').textContent = entry.term;
    _tooltipEl.querySelector('.gloss-def').textContent  = entry.short;

    const link = _tooltipEl.querySelector('.gloss-link');
    if (entry.appendix) {
      link.href = APPENDIX_BASE + entry.appendix;
      link.style.display = 'block';
    } else {
      link.style.display = 'none';
    }

    // Don't show link for placeholder terms
    if (entry.placeholder) {
      link.style.display = 'none';
      _tooltipEl.querySelector('.gloss-def').textContent = 'Definition coming soon.';
    }

    position(triggerEl);
    _tooltipEl.classList.add('visible');
    _activeEl = triggerEl;
  }

  // ── Hide tooltip ───────────────────────────────────────────────────────────
  function hide() {
    if (!_tooltipEl) return;
    _tooltipEl.classList.remove('visible');
    _activeEl = null;
  }

  function scheduleHide(delay = 180) {
    _hideTimer = setTimeout(hide, delay);
  }

  // ── Wire a single element ──────────────────────────────────────────────────
  function wireEl(el) {
    if (el._glossWired) return;
    el._glossWired = true;

    const key = el.dataset.gloss;
    if (!key) return;

    // Desktop: hover
    el.addEventListener('mouseenter', () => {
      clearTimeout(_hideTimer);
      show(el, key);
    });
    el.addEventListener('mouseleave', () => {
      scheduleHide();
    });

    // Mobile: tap
    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (_activeEl === el && _tooltipEl.classList.contains('visible')) {
        hide();
      } else {
        show(el, key);
      }
    }, { passive: false });
  }

  // ── Wire all data-gloss elements in a container ────────────────────────────
  function wire(container = document) {
    container.querySelectorAll('[data-gloss]').forEach(wireEl);
  }

  // ── Public init ───────────────────────────────────────────────────────────
  async function init() {
    await loadGlossary();
    buildTooltipEl();
    wire();

    // Hide on outside tap
    document.addEventListener('touchstart', (e) => {
      if (_tooltipEl && !_tooltipEl.contains(e.target) && !e.target.dataset.gloss) {
        hide();
      }
    }, { passive: true });
  }

  // ── Helper: wrap a text node match with a gloss trigger span ──────────────
  // Usage: GlossaryTooltip.wrapTerm(el, 'Steward', 'steward')
  // Finds first occurrence of termText in el's text content and wraps it
  function wrapTerm(containerEl, termText, glossKey) {
    if (!containerEl) return;
    const walker = document.createTreeWalker(containerEl, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const idx = node.textContent.indexOf(termText);
      if (idx === -1) continue;

      const before = document.createTextNode(node.textContent.slice(0, idx));
      const span   = document.createElement('span');
      span.dataset.gloss = glossKey;
      span.textContent   = termText;
      const after  = document.createTextNode(node.textContent.slice(idx + termText.length));

      node.parentNode.insertBefore(before, node);
      node.parentNode.insertBefore(span, node);
      node.parentNode.insertBefore(after, node);
      node.parentNode.removeChild(node);

      wireEl(span);
      break; // first occurrence only
    }
  }

  return { init, wire, wireEl, wrapTerm, hide };

})();

// Auto-init after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => GlossaryTooltip.init());
} else {
  GlossaryTooltip.init();
}

window.GlossaryTooltip = GlossaryTooltip;
