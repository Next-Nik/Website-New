// LIFE OS: THE MAP — APP LOGIC v4
// Session management, API communication, event handling.
// Seven domains: Path, Spark, Body, Finances, Relationships, Inner Game, Outer Game
//
// v4 adds:
// — localStorage autosave after every answer (survives refresh)
// — 10-minute non-blocking warning for anonymous users
// — 5-minute Supabase autosave for signed-in users
// — Two-tier results: light (anonymous) vs full (signed-in)
// — Email capture modal at completion for anonymous users
// — Supabase auth + session save on email submit

// ─── Supabase client (lazy-loaded) ───────────────────────────────────────────
// Set these in your Vercel environment variables:
//   VITE_SUPABASE_URL  (not used here — vanilla JS reads from window)
//   Injected via index.html meta tags or a separate supabase-config.js
//
// For now reads from window.SUPABASE_URL / window.SUPABASE_ANON_KEY
// which are set in index.html. See index.html for the script block.

let _sb = null;

function initSupabase() {
  if (_sb) return _sb;
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("YOUR_")) return null;

  try {
    _sb = window.supabase.createClient(url, key);
    return _sb;
  } catch {
    return null;
  }
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LS_KEY = "lifeos_themap_session_v1";

function lsSave(session) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      session,
      savedAt: Date.now()
    }));
  } catch {}
}

function lsLoad() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Discard saves older than 24 hours
    if (Date.now() - parsed.savedAt > 86400000) {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    return parsed.session;
  } catch {
    return null;
  }
}

function lsClear() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

// ─── Supabase session save ────────────────────────────────────────────────────
async function supabaseSaveSession(session, userId, extras = {}) {
  const sb = initSupabase();
  if (!sb || !userId) return;
  try {
    await sb.from("orienteering_sessions").upsert({
      user_id:    userId,
      session:    session,
      phase:      session.phase,
      updated_at: new Date().toISOString(),
      complete:   session.status === "complete" || session.phase === "complete",
      ...extras
    }, { onConflict: "user_id" });
  } catch (err) {
    console.warn("[TheMap] Supabase autosave failed:", err);
  }
}

// ─── Main App ─────────────────────────────────────────────────────────────────
const App = {
  session:          null,
  isWaiting:        false,
  userId:           null,
  userEmail:        null,
  warningShown:     false,
  warningTimer:     null,
  autosaveTimer:    null,
  pendingMapData:   null,
  messageHistory:   [],         // [{role, content, domEl}] for back navigation

  // ─── Init ──────────────────────────────────────────────────────────────────
  init() {
    initSupabase();
    this.bindEvents();
    this.readAuthGuardSession();
  },

  // Read session set by auth-init.js — no second Supabase call needed
  readAuthGuardSession() {
    if (window.LIFEOS_USER) {
      this.userId    = window.LIFEOS_USER.id;
      this.userEmail = window.LIFEOS_USER.email;
    }
    // Update profile dot
    const dot = document.getElementById('nk-profile-dot');
    if (dot && window.LIFEOS_USER) {
      const initial = ((window.LIFEOS_USER.email||'').split('@')[0].charAt(0)||'?').toUpperCase();
      dot.textContent = initial;
      dot.href = 'https://nextus.world/profile.html';
      dot.title = 'Your profile';
      dot.style.display = 'flex';
    }
  },

  bindEvents() {
    // Single entry screen — direct bind to begin button
    const beginBtn = document.getElementById("begin-btn");
    if (beginBtn) beginBtn.addEventListener("click", () => this.startConversation());

    const sendBtn = document.getElementById("send-btn");
    const input   = document.getElementById("user-input");

    if (sendBtn) sendBtn.addEventListener("click", () => this.sendUserInput());

    if (input) {
      input.addEventListener("input", () => {
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 120) + "px";
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.sendUserInput();
        }
      });
    }
  },

  // ─── Start ─────────────────────────────────────────────────────────────────
  async startConversation() {
    UI.hideWelcome();
    UI.showChat();
    UI.showNavBar(
      () => this.goBack(),
      () => this.restart()
    );

    // Start the 10-minute warning timer (anonymous users only)
    this.startWarningTimer();

    // Start 5-minute Supabase autosave interval (fires only if userId is set)
    this.startAutosaveTimer();

    const chatContainer = document.getElementById("chat-container");
    const typingEl = UI.createTypingIndicator();
    chatContainer.appendChild(typingEl);
    UI.scrollToMessage(typingEl);

    try {
      const data = await this.callAPI([]);
      UI.hideTyping();
      this.handleAPIResponse(data);
    } catch (err) {
      UI.hideTyping();
      this.addAssistantMessage("Something went wrong. Please refresh and try again.");
    }
  },

  // ─── Warning timer ─────────────────────────────────────────────────────────
  startWarningTimer() {
    if (this.warningTimer) clearTimeout(this.warningTimer);
    this.warningTimer = setTimeout(() => {
      // Only fire if not already signed in
      if (!this.userId && !this.warningShown) {
        this.warningShown = true;
        UI.showSaveWarning(() => {
          UI.showAuthModal({
            mode: "save",
            onSubmit: (email) => this.signInWithEmail(email),
            onDismiss: () => {}
          });
        });
      }
    }, 10 * 60 * 1000); // 10 minutes
  },

  // ─── Supabase autosave interval ────────────────────────────────────────────
  startAutosaveTimer() {
    if (this.autosaveTimer) clearInterval(this.autosaveTimer);
    this.autosaveTimer = setInterval(() => {
      if (this.userId && this.session) {
        supabaseSaveSession(this.session, this.userId);
      }
    }, 5 * 60 * 1000); // every 5 minutes
  },

  stopTimers() {
    if (this.warningTimer)  clearTimeout(this.warningTimer);
    if (this.autosaveTimer) clearInterval(this.autosaveTimer);
  },

  // ─── Sign in with email ────────────────────────────────────────────────────
  async signInWithEmail(email) {
    const sb = initSupabase();
    if (!sb) {
      // Supabase not configured — store email locally for now, proceed as if signed in
      this.userEmail = email;
      this.onSignInSuccess(null, email);
      return;
    }

    try {
      // Use OTP magic link — no password required
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true }
      });

      if (error) throw error;

      // OTP sent — user needs to click link in email.
      // For now we treat them as "pending auth" and save what we have.
      this.userEmail = email;
      this.onSignInSuccess(null, email);

    } catch (err) {
      console.warn("Sign in error:", err);
      // Fail gracefully — store email, continue
      this.userEmail = email;
      this.onSignInSuccess(null, email);
    }
  },

  // Called after successful email capture (with or without confirmed auth)
  onSignInSuccess(userId, email) {
    if (userId) this.userId = userId;
    this.userEmail = email;

    // Save current session state to Supabase if we have a userId
    if (this.userId && this.session) {
      supabaseSaveSession(this.session, this.userId);
    }

    // If we were holding a completed map pending auth, now deliver the full results
    if (this.pendingMapData) {
      const { mapData, session } = this.pendingMapData;
      this.pendingMapData = null;
      this.deliverFullResults(mapData, session);
    }
  },

  // ─── Send user input ────────────────────────────────────────────────────────
  sendUserInput() {
    if (this.isWaiting) return;
    const input = document.getElementById("user-input");
    const text  = input ? input.value.trim() : "";
    if (!text) return;
    this.sendMessage(text);
  },

  sendMessage(text, suppressBubble = false) {
    if (this.isWaiting) return;
    this.isWaiting = true;

    UI.clearInput();
    UI.disableInput();

    const chatContainer = document.getElementById("chat-container");

    if (!suppressBubble) {
      const userBubble = UI.createUserMessage(text);
      chatContainer.appendChild(userBubble);
      this.messageHistory.push({ role: "user", content: text, domEl: userBubble });
      UI.scrollToMessage(userBubble);
    }

    const typingEl = UI.createTypingIndicator();
    chatContainer.appendChild(typingEl);
    UI.showTyping();

    const messages = [{ role: "user", content: text }];

    this.callAPI(messages)
      .then(data => {
        UI.hideTyping();
        this.handleAPIResponse(data);
        this.isWaiting = false;
      })
      .catch(() => {
        UI.hideTyping();
        this.addAssistantMessage("Something went wrong. Please try again.");
        UI.enableInput();
        this.isWaiting = false;
      });
  },

  // ─── API call ───────────────────────────────────────────────────────────────
  async callAPI(messages) {
    const body = { messages, session: this.session };
    const response = await fetch("/tools/map/api/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  // ─── Handle API response ────────────────────────────────────────────────────
  handleAPIResponse(data) {
    if (data.session) {
      this.session = data.session;
      // localStorage autosave after every response
      lsSave(this.session);
    }

    const chatContainer = document.getElementById("chat-container");

    if (data.phaseLabel) {
      UI.updateProgress(data.phaseLabel);
    }

    // Completion — two paths based on auth state
    if (data.complete && data.mapData) {
      this.stopTimers();
      lsClear(); // Clear localStorage on completion — data will live in Supabase

      UI.showRestartOnly();
      if (this.userId || this.userEmail) {
        this.deliverFullResults(data.mapData, data.session || this.session);
      } else {
        // Anonymous — show light results, hold full map pending sign-in
        this.pendingMapData = { mapData: data.mapData, session: data.session || this.session };
        this.deliverLightResults(data.mapData, data.session || this.session);
      }

      UI.setInputMode("none");
      return;
    }

    // Regular message
    if (data.message) {
      const msgEl = UI.createAssistantMessage(data.message);
      chatContainer.appendChild(msgEl);
      setTimeout(() => msgEl.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);

      // Wire glossary tooltips on welcome message
      if (data.phase === "welcome" && window.GlossaryTooltip) {
        const MAP_DOMAIN_TERMS = [
          ["Path", "life-os-path"], ["Spark", "life-os-spark"], ["Body", "life-os-body"],
          ["Finances", "life-os-finances"], ["Relationships", "life-os-relationships"],
          ["Inner Game", "life-os-inner-game"], ["Outer Game", "life-os-outer-game"],
          ["Horizon Life", "horizon-goals"], ["Horizon Self", "horizon-self"]
        ];
        MAP_DOMAIN_TERMS.forEach(([text, key]) => GlossaryTooltip.wrapTerm(msgEl, text, key));
      }
    }

    // Auto-advance: welcome → first domain question
    if (data.autoAdvance && data.phase === "welcome") {
      UI.setInputMode("none");
      const delay = data.advanceDelay || 2200;
      setTimeout(() => {
        const typingEl = UI.createTypingIndicator();
        chatContainer.appendChild(typingEl);
        UI.scrollToMessage(typingEl);
        App.callAPI([]).then(nextData => {
          typingEl.remove();
          App.handleAPIResponse(nextData);
        }).catch(err => {
          typingEl.remove();
          console.error("Welcome auto-advance error:", err);
        });
      }, delay);
      return;
    }

    UI.setInputMode(data.complete ? "none" : (data.inputMode || "text"));
  },

  // ─── Full results (signed-in users) ────────────────────────────────────────
  deliverFullResults(mapData, session) {
    const chatContainer = document.getElementById("chat-container");

    // Remove light results card if it's there
    const lightCard = document.getElementById("light-results-wrapper");
    if (lightCard) lightCard.remove();

    const mapEl = this.renderFinalMap(mapData, session);
    chatContainer.appendChild(mapEl);
    setTimeout(() => mapEl.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);

    // Save to Supabase if signed in — include horizon_goal_system from mapData
    if (this.userId) {
      supabaseSaveSession(
        { ...session, phase: "complete", status: "complete" },
        this.userId,
        {
          horizon_goal_system: mapData.life_horizon_draft || null,
          completed_at:        new Date().toISOString()
        }
      );
    }

    UI.setInputMode("none");
  },

  // ─── Light results (anonymous users) ───────────────────────────────────────
  deliverLightResults(mapData, session) {
    const chatContainer = document.getElementById("chat-container");

    const wrapper = document.createElement("div");
    wrapper.id = "light-results-wrapper";

    const lightCard = UI.createLightResultsCard(mapData, session, () => {
      UI.showAuthModal({
        mode: "results",
        onSubmit: (email) => this.signInWithEmail(email),
        onDismiss: () => {
          // Show preview state — user can still sign in later
        }
      });
    });

    wrapper.appendChild(lightCard);
    chatContainer.appendChild(wrapper);
    setTimeout(() => wrapper.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  },

  // ─── Full map render ────────────────────────────────────────────────────────
  renderFinalMap(mapData, session) {
    this._horizonDraft = mapData.life_horizon_draft || null;
    const wrapper = document.createElement("div");
    wrapper.className = "message message-profile";

    const domainOrder = ["path","spark","body","finances","relationships","inner_game","outer_game"];
    const domainLabels = {
      path:"Path", spark:"Spark", body:"Body", finances:"Finances",
      relationships:"Relationships", inner_game:"Inner Game", outer_game:"Outer Game"
    };
    const domainQuestions = {
      path:          "Am I on my path — and actually moving?",
      spark:         "Is the fire on?",
      body:          "How is this living system doing?",
      finances:      "Do I have the agency to act on what matters?",
      relationships: "Am I truly known by anyone?",
      inner_game:    "Are my stories tending me, or running me?",
      outer_game:    "Is what I'm broadcasting aligned with who I actually am?"
    };
    const domainFractals = {
      path:"Vision", spark:"Human Being", body:"Nature",
      finances:"Finance & Economy", relationships:"Society",
      inner_game:"Legacy", outer_game:"Society"
    };

    const domainData   = session?.domainData || {};
    const focusDomains = mapData.focus_domains || [];

    const scoreRows = domainOrder.map(id => {
      const data = domainData[id];
      if (!data) return "";
      const isFocus  = focusDomains.includes(id);
      const score    = data.score || 0;
      const barWidth = (score / 10) * 100;
      const barColor = score <= 3 ? "#e05c5c" : score <= 6 ? "#E89842" : "#5cb85c";
      return `
        <div class="map-domain-row ${isFocus ? "map-domain-focus" : ""}">
          <div class="map-domain-info">
            <div class="map-domain-name">${isFocus ? "▸ " : ""}${domainLabels[id]}</div>
            <div class="map-domain-thesis">${domainQuestions[id]}</div>
          </div>
          <div class="map-domain-bar-wrap">
            <div class="map-domain-bar" style="width:${barWidth}%;background:${barColor};"></div>
          </div>
          <div class="map-domain-right">
            <div class="map-domain-score">${score}/10</div>
            <div class="map-domain-fractal">${domainFractals[id]}</div>
          </div>
          ${isFocus ? '<div class="map-focus-tag">focus</div>' : ""}
        </div>`;
    }).join("");

    wrapper.innerHTML = `
      <div class="profile-card">
        <div class="profile-hero">
          <div class="profile-card-heading">Your Life OS Map</div>
          <div class="map-stage-badge">${mapData.stage}</div>
          <div class="map-stage-desc">${mapData.stage_description}</div>
        </div>

        <div class="profile-section">
          <div class="profile-section-label">Your Seven Domains</div>
          <div class="map-domains">${scoreRows}</div>
        </div>

        <div class="profile-section">
          <div class="profile-section-label">What The Pattern Shows</div>
          <p>${mapData.overall_reflection.replace(/\n\n/g, "</p><p>")}</p>
        </div>

        <div class="profile-section">
          <div class="profile-section-label">Your Three Focus Domains</div>
          <p>${focusDomains.map(id => domainLabels[id] || id).join("  ·  ")}</p>
          <p style="margin-top:10px;color:var(--doc-light);font-size:0.92rem;">${mapData.focus_reasoning}</p>
        </div>

        ${mapData.brain_insight ? `
        <div class="profile-section">
          <div class="profile-section-label">What To Learn</div>
          <p style="font-size:0.92rem;">${mapData.brain_insight}</p>
        </div>` : ""}

        <div class="profile-closing">
          ${mapData.next_step}
        </div>

        ${mapData.life_horizon_draft ? `
        <div class="profile-section profile-horizon-section" id="horizonSection">
          <div class="profile-section-label">Your Life Horizon</div>

          <div class="horizon-note-area" id="horizonNoteArea">
            <textarea
              id="horizonPersonalNote"
              class="horizon-textarea"
              placeholder="Write your own Life Horizon here — in your own voice, your own words. What would a life fully lived actually look and feel like for you?"
              oninput="App.onHorizonInput(this.value)"
            ></textarea>
            <p class="horizon-note-hint">This is yours. Edit it until it sounds like you.</p>
          </div>

          <div class="horizon-tool-output" id="horizonToolOutput">
            <button class="horizon-expand-btn" id="horizonExpandBtn" onclick="App.toggleHorizonDraft()">
              See what The Map drafted →
            </button>
            <div class="horizon-draft-text" id="horizonDraftText" style="display:none;">
              <p>${mapData.life_horizon_draft}</p>
              <button class="horizon-use-draft" onclick="App.useDraft()">Use this as my starting point →</button>
            </div>
          </div>

          <button class="horizon-lock-btn" id="horizonLockBtn" onclick="App.lockHorizon()" style="display:none;">
            Lock this as my Life Horizon ✓
          </button>
          <div class="horizon-locked-msg" id="horizonLockedMsg" style="display:none;">
            <span>✓ Locked.</span> This is your Life Horizon — it will lead everywhere it appears.
          </div>
        </div>` : ""}

      </div>`;

    return wrapper;
  },


  // ─── Life Horizon mechanic ─────────────────────────────────────────────────
  _horizonDraft: null,
  _horizonLocked: false,

  onHorizonInput(value) {
    const lockBtn = document.getElementById("horizonLockBtn");
    const expandBtn = document.getElementById("horizonExpandBtn");
    if (lockBtn) lockBtn.style.display = value.trim() ? "block" : "none";
    if (expandBtn) {
      expandBtn.textContent = value.trim()
        ? "See what The Map drafted →"
        : "See what The Map drafted →";
    }
    // Save to localStorage as draft
    try { localStorage.setItem("lifeos_map_horizon_note", value); } catch {}
  },

  toggleHorizonDraft() {
    const draft   = document.getElementById("horizonDraftText");
    const btn     = document.getElementById("horizonExpandBtn");
    if (!draft) return;
    const isOpen  = draft.style.display !== "none";
    draft.style.display = isOpen ? "none" : "block";
    btn.textContent = isOpen ? "See what The Map drafted →" : "Hide draft ↑";
  },

  useDraft() {
    const draft    = document.getElementById("horizonDraftText");
    const textarea = document.getElementById("horizonPersonalNote");
    const text     = draft?.querySelector("p")?.textContent || "";
    if (textarea && text) {
      textarea.value = text;
      this.onHorizonInput(text);
      textarea.focus();
      // Close the draft
      draft.style.display = "none";
      document.getElementById("horizonExpandBtn").textContent = "See what The Map drafted →";
    }
  },

  async lockHorizon() {
    const textarea  = document.getElementById("horizonPersonalNote");
    const lockBtn   = document.getElementById("horizonLockBtn");
    const lockedMsg = document.getElementById("horizonLockedMsg");
    const value     = textarea?.value?.trim();
    if (!value) return;

    // Save horizon_goal_user to the most recent orienteering_sessions row
    if (this.userId) {
      try {
        const sb = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        if (sb) {
          // Find the most recent completed session for this user and update it
          const { data: rows } = await sb
            .from("orienteering_sessions")
            .select("id")
            .eq("user_id", this.userId)
            .eq("complete", true)
            .order("updated_at", { ascending: false })
            .limit(1);
          if (rows?.[0]?.id) {
            await sb.from("orienteering_sessions").update({
              horizon_goal_user: value
            }).eq("id", rows[0].id);
          }
        }
      } catch (err) {
        console.warn("[TheMap] Horizon lock save failed:", err);
      }
    }

    // Always save to localStorage as fallback
    try { localStorage.setItem("lifeos_map_horizon_locked", value); } catch {}

    // UI confirmation
    this._horizonLocked = true;
    if (lockBtn)   lockBtn.style.display   = "none";
    if (lockedMsg) lockedMsg.style.display = "block";
    if (textarea)  textarea.style.borderStyle = "solid";
  },

  // ─── Navigation ────────────────────────────────────────────────────────────
  goBack() {
    if (this.messageHistory.length < 2) return;
    const lastAssistant = this.messageHistory.pop();
    const lastUser      = this.messageHistory.pop();
    if (lastAssistant?.domEl) lastAssistant.domEl.remove();
    if (lastUser?.domEl)      lastUser.domEl.remove();
    UI.enableInput();
    UI.setInputMode ? UI.setInputMode("text") : null;
    UI.setBackEnabled(this.messageHistory.length >= 2);
  },

  restart() {
    this.session        = null;
    this.isWaiting      = false;
    this.messageHistory = [];
    this.pendingMapData = null;
    this.stopTimers();
    document.getElementById("chat-container").innerHTML = "";
    document.getElementById("chat-area").style.display = "none";
    document.getElementById("progress-container").style.display = "none";
    document.getElementById("progress-fill").style.width = "0%";
    document.getElementById("input-area").style.display = "none";
    document.getElementById("welcome-screen").style.display = "";
    UI.hideNavBar();
  },

  addAssistantMessage(text) {
    const chatContainer = document.getElementById("chat-container");
    const el = UI.createAssistantMessage(text);
    chatContainer.appendChild(el);
    this.messageHistory.push({ role: "assistant", content: text, domEl: el });
    UI.setBackEnabled(this.messageHistory.length >= 2);
    UI.scrollToMessage(el);
    UI.enableInput();
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
window.App = App;
