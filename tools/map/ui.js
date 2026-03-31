// LIFE OS — UI COMPONENTS v4
// Builds DOM elements. No API calls, no business logic.
// v4 adds: save warning banner, auth modal, light results card

const UI = {

  createAssistantMessage(text) {
    const div = document.createElement("div");
    div.className = "message message-assistant";
    div.textContent = text;
    return div;
  },

  createUserMessage(text) {
    const div = document.createElement("div");
    div.className = "message message-user";
    div.textContent = text;
    return div;
  },

  createTypingIndicator() {
    const div = document.createElement("div");
    div.className = "typing-indicator active";
    div.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>`;
    return div;
  },

  showTyping() {
    document.querySelectorAll(".typing-indicator").forEach(el => el.classList.add("active"));
  },

  hideTyping() {
    document.querySelectorAll(".typing-indicator").forEach(el => el.remove());
  },

  updateProgress(label) {
    const container = document.getElementById("progress-container");
    const labelEl   = document.getElementById("progress-label");
    const fill      = document.getElementById("progress-fill");

    if (container) container.style.display = "";
    if (labelEl && label) labelEl.textContent = label;

    if (fill && label) {
      const domainMatch = label.match(/(\d+) of 7/);
      if (domainMatch) {
        const idx = parseInt(domainMatch[1]);
        const pct = Math.round(((idx - 1) / 7) * 80) + 10;
        fill.style.width = pct + "%";
      } else if (label.includes("Brain")) {
        fill.style.width = "90%";
      } else if (label.includes("Map")) {
        fill.style.width = "100%";
      }
    }
  },

  setInputMode(mode) {
    const inputArea = document.getElementById("input-area");
    const input     = document.getElementById("user-input");
    const sendBtn   = document.getElementById("send-btn");

    if (!inputArea) return;

    if (mode === "none") {
      inputArea.style.display = "none";
      return;
    }

    inputArea.style.display = "";
    if (input)   { input.disabled = false; input.placeholder = "Type your answer..."; input.focus(); }
    if (sendBtn) sendBtn.disabled = false;
  },

  disableInput() {
    const input   = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    if (input)   input.disabled   = true;
    if (sendBtn) sendBtn.disabled = true;
  },

  enableInput() {
    const input   = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    if (input)   input.disabled   = false;
    if (sendBtn) sendBtn.disabled = false;
  },

  clearInput() {
    const input = document.getElementById("user-input");
    if (input) { input.value = ""; input.style.height = "auto"; }
  },

  scrollToMessage(el) {
    if (!el) return;
    setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  },

  scrollToBottom() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  },

  hideWelcome() {
    const w = document.getElementById("welcome-screen");
    if (w) w.style.display = "none";
  },

  showChat() {
    const c = document.getElementById("chat-area");
    if (c) c.style.display = "flex";
  },


  // ─── Navigation bar ─────────────────────────────────────────────────────────
  showNavBar(onBack, onRestart) {
    if (document.getElementById("nav-bar")) return;
    const bar = document.createElement("div");
    bar.id = "nav-bar";
    bar.innerHTML = `
      <div class="nav-bar-inner">
        <button class="nav-btn nav-btn-back" id="nav-back">← Back</button>
        <button class="nav-btn nav-btn-restart" id="nav-restart">Start again</button>
      </div>
    `;
    const inputArea = document.getElementById("input-area");
    if (inputArea) inputArea.parentNode.insertBefore(bar, inputArea);
    document.getElementById("nav-back").addEventListener("click", onBack);
    document.getElementById("nav-restart").addEventListener("click", onRestart);
    this.setBackEnabled(false);
  },

  setBackEnabled(enabled) {
    const btn = document.getElementById("nav-back");
    if (btn) {
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? "1" : "0.35";
      btn.style.cursor = enabled ? "pointer" : "default";
    }
  },

  hideNavBar() {
    const bar = document.getElementById("nav-bar");
    if (bar) bar.remove();
  },

  showRestartOnly() {
    const back = document.getElementById("nav-back");
    if (back) back.style.display = "none";
  },

  // ─── Save warning banner ───────────────────────────────────────────────────
  // Appears at 10 minutes for anonymous users. Non-blocking — sits above chat.
  // Dismissed permanently once shown.
  showSaveWarning(onSignIn) {
    if (document.getElementById("save-warning")) return; // already showing

    const banner = document.createElement("div");
    banner.id = "save-warning";
    banner.className = "save-warning";
    banner.innerHTML = `
      <div class="save-warning-inner">
        <span class="save-warning-text">Your map is being built. Sign in to make sure it's saved.</span>
        <button class="save-warning-cta" id="save-warning-cta">Sign in</button>
        <button class="save-warning-dismiss" id="save-warning-dismiss" aria-label="Dismiss">×</button>
      </div>
    `;

    // Insert before the chat area so it doesn't scroll away
    const chatArea = document.getElementById("chat-area");
    if (chatArea) chatArea.parentNode.insertBefore(banner, chatArea);

    document.getElementById("save-warning-cta").addEventListener("click", () => {
      banner.remove();
      if (onSignIn) onSignIn();
    });

    document.getElementById("save-warning-dismiss").addEventListener("click", () => {
      banner.remove();
    });
  },

  // ─── Auth modal ────────────────────────────────────────────────────────────
  // Two modes: 'save' (mid-session prompt) and 'results' (completion gate)
  showAuthModal({ mode = "save", onSubmit, onDismiss }) {
    const existing = document.getElementById("auth-modal-overlay");
    if (existing) existing.remove();

    const isSave = mode === "save";

    const overlay = document.createElement("div");
    overlay.id = "auth-modal-overlay";
    overlay.className = "auth-modal-overlay";
    overlay.innerHTML = `
      <div class="auth-modal-card">
        <div class="auth-modal-eyebrow">${isSave ? "Save your progress" : "Your map is ready"}</div>
        <h2 class="auth-modal-heading">${isSave
          ? "Sign in to save your map as you go."
          : "Sign in to see your full results and save your map."
        }</h2>
        <p class="auth-modal-body">${isSave
          ? "Your answers so far are stored in this browser. Sign in to protect them across devices and sessions."
          : "We'll save your full map and email it to you so you can come back to it any time."
        }</p>
        <div class="auth-modal-form">
          <input
            type="email"
            id="auth-modal-email"
            class="auth-modal-input"
            placeholder="Your email"
            autocomplete="email"
          />
          <button class="auth-modal-submit" id="auth-modal-submit">
            ${isSave ? "Save my progress" : "See my full map →"}
          </button>
        </div>
        ${isSave
          ? `<button class="auth-modal-dismiss" id="auth-modal-dismiss">Continue without saving</button>`
          : `<button class="auth-modal-dismiss" id="auth-modal-dismiss">See a preview first</button>`
        }
      </div>
    `;

    document.body.appendChild(overlay);

    const emailInput = document.getElementById("auth-modal-email");
    const submitBtn  = document.getElementById("auth-modal-submit");
    const dismissBtn = document.getElementById("auth-modal-dismiss");

    emailInput.focus();

    submitBtn.addEventListener("click", () => {
      const email = emailInput.value.trim();
      if (!email || !email.includes("@")) {
        emailInput.style.borderColor = "rgba(200,100,100,0.6)";
        emailInput.focus();
        return;
      }
      overlay.remove();
      if (onSubmit) onSubmit(email);
    });

    emailInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitBtn.click();
    });

    dismissBtn.addEventListener("click", () => {
      overlay.remove();
      if (onDismiss) onDismiss();
    });
  },

  // ─── Light results card ────────────────────────────────────────────────────
  // Shown to anonymous users at completion — scores + wheel, no full synthesis.
  // Includes a prominent sign-in CTA to unlock the full map.
  createLightResultsCard(mapData, session, onSignIn) {
    const domainOrder  = ["path","spark","body","finances","relationships","inner_game","outer_game"];
    const domainLabels = { path:"Path", spark:"Spark", body:"Body", finances:"Finances",
                           relationships:"Relationships", inner_game:"Inner Game", outer_game:"Outer Game" };
    const domainData   = session?.domainData || {};

    const scoreRows = domainOrder.map(id => {
      const d = domainData[id];
      if (!d) return "";
      const score    = d.score || 0;
      const barWidth = (score / 10) * 100;
      const barColor = score <= 3 ? "#e05c5c" : score <= 6 ? "#E89842" : "#5cb85c";
      return `
        <div class="map-domain-row">
          <div class="map-domain-info">
            <div class="map-domain-name">${domainLabels[id]}</div>
          </div>
          <div class="map-domain-bar-wrap">
            <div class="map-domain-bar" style="width:${barWidth}%;background:${barColor};"></div>
          </div>
          <div class="map-domain-right">
            <div class="map-domain-score">${score}/10</div>
          </div>
        </div>`;
    }).join("");

    const wrapper = document.createElement("div");
    wrapper.className = "message message-profile";
    wrapper.innerHTML = `
      <div class="profile-card">
        <div class="profile-hero">
          <div class="profile-card-heading">Your Life OS Map</div>
          <div class="map-stage-badge">${mapData.stage}</div>
          <div class="map-stage-desc">Your scores across all seven domains.</div>
        </div>

        <div class="profile-section">
          <div class="profile-section-label">Your Seven Domains</div>
          <div class="map-domains">${scoreRows}</div>
        </div>

        <div class="light-results-gate">
          <div class="light-results-gate-eyebrow">Full Map</div>
          <p class="light-results-gate-body">Your full map includes what the pattern shows across all seven domains, your three focus areas and why, what to learn next, and your personalised next step. We'll also email it to you.</p>
          <button class="light-results-gate-cta" id="light-results-cta">Sign in to see your full map →</button>
        </div>
      </div>`;

    wrapper.querySelector("#light-results-cta").addEventListener("click", () => {
      if (onSignIn) onSignIn();
    });

    return wrapper;
  }

};

window.UI = UI;
