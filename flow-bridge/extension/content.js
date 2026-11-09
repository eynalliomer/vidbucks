// Content script: executes one command at a time inside flow.google.com. Pure DOM, no network calls of its own.
(() => {
  const lang = (document.documentElement.lang || navigator.language || "en").toLowerCase().startsWith("tr") ? "tr" : "en";
  const UI = self.VB_UI[lang];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

  async function waitFor(fn, timeoutMs = 15000, every = 250) {
    const end = Date.now() + timeoutMs;
    for (;;) {
      const v = fn();
      if (v) return v;
      if (Date.now() > end) return null;
      await sleep(every);
    }
  }

  // Every click/key/hover is a REAL input event made by the service worker through the debugger API (isTrusted = true).
  // Script-made events (dispatchEvent, el.click(), execCommand) are what page-modifying extensions are known by, so none are used.
  async function trusted(kind, el, extra = {}) {
    let r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) {
      el.scrollIntoView({ block: "center" });
      await sleep(150);
      r = el.getBoundingClientRect();
    }
    const res = await chrome.runtime.sendMessage({ trusted: kind, x: r.left + r.width / 2, y: r.top + r.height / 2, ...extra });
    if (!res || !res.ok) throw new Error(`trusted ${kind} failed: ${res && res.error}`);
  }
  const press = (el) => trusted("click", el);
  const sendInput = async (kind, extra = {}) => {
    const res = await chrome.runtime.sendMessage({ trusted: kind, ...extra });
    if (!res || !res.ok) throw new Error(`trusted ${kind} failed: ${res && res.error}`);
  };

  const byLabel = (label, root = document) =>
    [...root.querySelectorAll("[aria-label]")].find((e) => norm(e.getAttribute("aria-label")).includes(norm(label)));

  const byText = (text, root = document, sel = "button,[role=menuitem],[role=option],li,a") =>
    [...root.querySelectorAll(sel)].find((e) => norm(e.textContent).includes(norm(text)) || norm(e.getAttribute("aria-label")).includes(norm(text)));

  // Smallest element whose own text matches (avoids returning a whole container that merely contains the text).
  const deepestByText = (text, root = document, sel = "button,[role=button],a,div,span") => {
    const hits = [...root.querySelectorAll(sel)].filter((e) => e.offsetParent && norm(e.textContent).includes(norm(text)));
    return hits.find((e) => !hits.some((o) => o !== e && e.contains(o)));
  };

  const promptBox = () => document.querySelector('[role=textbox][contenteditable=true]');

  function tiles() {
    return [...document.querySelectorAll("flow-video-tile, flow-image-tile, flow-character-tile")].map((el) => {
      const titleBtn = [...el.querySelectorAll("button[aria-label]")].find(
        (b) => ![UI.cardMenu, "Favorilere ekle", "İstemi yinele"].some((s) => norm(b.getAttribute("aria-label")).includes(norm(s))) && !/erasio/i.test(b.getAttribute("aria-label"))
      );
      return {
        el,
        kind: el.tagName.replace("FLOW-", "").replace("-TILE", "").toLowerCase(),
        title: titleBtn
          ? titleBtn.getAttribute("aria-label")
          : el.textContent.replace(/favorite|more_vert|accessibility_new|redo|play_circle/g, "").replace(/\s+/g, " ").trim(), // character tiles show only the name as text
      };
    });
  }
  const tileSummary = () => tiles().map((t) => ({ kind: t.kind, title: t.title, generating: isGenerating(t.el) }));
  const isGenerating = (el) => /%|oluşturuluyor|generating/i.test(el.textContent) && !el.querySelector("video[src],video source");


  async function ensureAgentMode(want = true) {
    const chip = document.querySelector("flow-agent-mode-toggle-chip button");
    if (!chip) return false;
    const on = chip.getAttribute("aria-pressed") === "true";
    if (on !== want) {
      await press(chip);
      await sleep(800);
    }
    return true;
  }

  async function addReference(name) {
    const add = byLabel(UI.addRef);
    if (!add) throw new Error("add-reference button not found");
    await press(add);
    const search = await waitFor(() => [...document.querySelectorAll("input")].find((x) => x.offsetParent && /öğe|item/i.test(x.placeholder || x.getAttribute("aria-label") || "")), 5000);
    if (!search) throw new Error("reference search box not found");
    await press(search);
    await sendInput("clear");
    await sendInput("type", { text: name });
    await sleep(900);
    // list rows show "<name>" + type; pick the first row whose name matches exactly, else prefix.
    const rows = [...document.querySelectorAll("button.asset-item, [role=option]")].filter((e) => e.offsetParent && norm(e.textContent).startsWith(norm(name)));
    const row = rows.find((e) => norm(e.textContent).split(/(karakter|resim|video|character|image)/)[0].trim() === norm(name)) || rows[0];
    if (!row) throw new Error(`reference "${name}" not found in picker`);
    // The best match is usually already the active row (confirm button visible); only click when it is not.
    if (!(row.classList.contains("asset-item-active") && byText(UI.addRefConfirm, document, "button"))) {
      await press(row);
      await sleep(500);
    }
    const confirm = await waitFor(() => byText(UI.addRefConfirm, document, "button"), 5000);
    if (!confirm) throw new Error("add-to-prompt confirm not found");
    await press(confirm);
    await sleep(600);
    return true;
  }

  async function submit() {
    const b = document.querySelector("flow-generate-icon-button button[type=submit]");
    if (!b || b.disabled) throw new Error("submit button missing/disabled");
    const cleared = () => !norm(promptBox()?.textContent);
    // Try progressively "more real" ways to submit; confirm by the prompt box emptying.
    await press(b);
    await sleep(1500);
    if (cleared()) return true;
    b.form?.requestSubmit?.(b);
    await sleep(1500);
    if (cleared()) return true;
    await press(b);
    await sleep(1500);
    if (cleared()) return true;
    throw new Error("submit did not go through (prompt box still has text)");
  }

  // A pending credit gate is the last <flow-permission-message> whose option rows are not read-only (answered ones are).
  function pendingPermission() {
    const msgs = [...document.querySelectorAll("flow-permission-message")];
    for (const m of msgs.reverse()) {
      const rows = [...m.querySelectorAll("[role=radio]")];
      if (rows.length && !rows.some((r) => r.classList.contains("read-only"))) return { m, rows };
    }
    return null;
  }
  function approvalState() {
    const p = pendingPermission();
    if (!p) return null;
    const once = p.rows.find((r) => norm(r.textContent).replace(/^check\s*/, "").trim() === norm(UI.approveOnce));
    if (!once) return null;
    const r = once.getBoundingClientRect();
    return { text: p.m.textContent.replace(/\s+/g, " ").trim().slice(0, 400), x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  async function downloadClick({ title, kind, index }) {
    // index = position among the video tiles (0 = newest); needed when several clips share a generic title
    const t = index != null ? tiles().filter((x) => x.kind === "video")[index] : tiles().find((x) => norm(x.title) === norm(title) && (!kind || x.kind === kind));
    if (!t) return { ok: false, error: index != null ? `video tile #${index} not found` : `tile "${title}" not found` };
    t.el.scrollIntoView({ block: "center" });
    await trusted("hover", t.el);
    await sleep(400);
    const menu = byLabel(UI.cardMenu, t.el);
    if (!menu) return { ok: false, error: "card menu button not found" };
    await press(menu);
    const dl = await waitFor(() => byText(UI.menuDownload, document, "[role=menuitem], button"), 3000);
    if (!dl) return { ok: false, error: "Download menu item not found" };
    await press(dl);
    await sleep(500);
    const q = await waitFor(() => byText(UI.download720, document, "[role=menuitem], button"), 3000);
    if (!q) return { ok: false, error: "720p option not found" };
    await press(q);
    return { ok: true };
  }

  // Characters (image generation, no video credits). Stages are split so the service worker can do the
  // trusted input in between: open -> [type description, click submit] -> wait ready -> rename -> Done.
  async function charOpen() {
    const nav = byText(UI.charactersTab, document, "flow-project-nav-list button");
    if (nav) await press(nav);
    await sleep(1200);
    const nu = await waitFor(() => deepestByText(UI.newCharacter), 8000);
    if (!nu) throw new Error("New character tile not found");
    await press(nu);
    await waitFor(() => /\/character/.test(location.pathname), 8000);
    const box = await waitFor(() => document.querySelector("flow-character-prompt-box [contenteditable=true]"), 8000);
    if (!box) throw new Error("character prompt box not found");
    await press(box);
    await sendInput("clear");
    return { ok: true };
  }
  const charReady = () =>
    /\/character\/[0-9a-f-]{20,}/.test(location.pathname) && !!byLabel(UI.editName) && document.querySelectorAll("img").length > 2;
  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return { ok: true, x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  const handlers = {
    dump: async () => ({ ok: true, buttons: [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => (b.getAttribute('aria-label') || '') + '|' + b.textContent.trim().slice(0, 30)).filter((x) => x !== '|'), text: document.body.innerText.replace(/\s+/g, ' ').slice(-1500), tags: [...new Set([...document.querySelectorAll('*')].map((e) => e.tagName).filter((x) => x.startsWith('FLOW-')))] }),
    char_open: async () => charOpen(),
    char_focus_box: async () => { const bx = promptBox() || document.querySelector("flow-character-prompt-box [contenteditable=true]"); if (!bx) return { ok: false, error: "no prompt box" }; bx.focus(); return { ok: true }; },
    char_ready: async () => ({ ok: true, ready: charReady() }),
    char_edit_rect: async () => { const e = byLabel(UI.editName); return e ? rectOf(e) : { ok: false, error: "edit-name button not found" }; },
    char_name_focus: async () => {
      const f = [...document.querySelectorAll("input")].find((i) => i.offsetParent && norm(i.getAttribute("aria-label")).includes(norm(UI.nameInput))) || [...document.querySelectorAll("input")].find((i) => i.offsetParent);
      if (!f) return { ok: false, error: "name field not found" };
      f.focus(); f.select();
      return { ok: true };
    },
    done_rect: async () => { const d = byText(UI.done, document, "button"); return d ? rectOf(d) : { ok: false, error: "Done button not found" }; },
    char_tile_open: async ({ title }) => { // open an existing character tile (to rename it)
      const t = tiles().find((x) => x.kind === "character" && norm(x.title) === norm(title));
      if (!t) return { ok: false, error: `character tile "${title}" not found` };
      t.el.scrollIntoView({ block: "center" });
      const target = t.el.querySelector("img, [role=button], button") || t.el;
      await press(target);
      const ok = await waitFor(() => /\/character\//.test(location.pathname), 6000);
      return ok ? { ok: true } : { ok: false, error: "character page did not open" };
    },
    chars_list: async () => { // names of all characters, read from the Characters view (All media only shows a window of the grid)
      const nav = byText(UI.charactersTab, document, "flow-project-nav-list button");
      if (nav) await press(nav);
      await sleep(2000);
      return { ok: true, tiles: tileSummary().filter((t) => t.kind === "character") };
    },
    tile_info: async () => { // debugging/mapping aid: what identifies each video tile (src, links, ids)
      const out = [];
      for (const t of tiles().filter((x) => x.kind === "video").slice(0, 12)) {
        const v = t.el.querySelector("video");
        out.push({ title: t.title, src: v ? (v.currentSrc || v.src || "").slice(0, 200) : null,
                   links: [...t.el.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).slice(0, 3),
                   attrs: [...t.el.attributes].map((a) => `${a.name}=${a.value}`.slice(0, 80)),
                   imgs: [...t.el.querySelectorAll("img")].map((i) => (i.src || "").slice(0, 160)).slice(0, 2) });
      }
      return { ok: true, tiles: out };
    },
    clear_box: async () => { // debugging aid: trusted click into the prompt box + select-all + delete (must keep the attached character chips)
      const box = promptBox();
      if (!box) return { ok: false, error: "prompt box not found" };
      await press(box);
      await sendInput("clear");
      return { ok: true };
    },
    ref_test: async ({ name }) => ({ ok: await addReference(name) }), // debugging aid: attach a character reference without sending anything
    dismiss: async () => { // close menus/popups left open by an interrupted step
      await sendInput("key", { key: "Escape" });
      await sleep(300);
      return { ok: true };
    },
    path: async () => ({ ok: true, path: location.pathname }),
    ping: async () => ({ ok: true, lang, url: location.href }),
    tiles: async () => ({ ok: true, tiles: tileSummary() }),
    agent_mode: async ({ on = true }) => ({ ok: await ensureAgentMode(on) }),
    // Flow's own generation box (agent mode off). The settings popover needs trusted clicks, so these commands only LOCATE things; the background clicks.
    std_rect: async ({ pat = "", chip = false }) => {
      const chipEl = [...document.querySelectorAll("button")].find((b) => b.offsetParent && /(video|resim|image)\s*[·•]\s*\d+p/i.test(norm(b.textContent)));
      const optionOf = (re) => [...document.querySelectorAll("button,[role=button],[role=tab],[role=radio],[role=option],[role=menuitem],[role=combobox],mat-select,mat-option")].find((e) => e.offsetParent && e !== chipEl && re.test(norm(e.textContent)));
      if (chip) {
        if (!chipEl) return { ok: false, error: "generation settings chip not found (is agent mode really off?)" };
        return { ...rectOf(chipEl), open: !!optionOf(/^x1$/) };
      }
      const o = optionOf(new RegExp(pat, "i"));
      return o ? { ...rectOf(o), text: norm(o.textContent) } : { ok: false, error: `option /${pat}/ not found in the settings popover` };
    },
    dom_probe: async ({ pat = "video" }) => { // debugging aid: visible elements whose own text matches
      const re = new RegExp(pat, "i");
      const hits = [...document.querySelectorAll("*")].filter((e) => e.offsetParent && e.children.length < 4 && re.test(e.textContent) && e.textContent.length < 60);
      return { ok: true, hits: hits.slice(0, 25).map((e) => ({ tag: e.tagName.toLowerCase(), role: e.getAttribute("role"), cls: String(e.className).slice(0, 50), text: norm(e.textContent), parent: e.parentElement ? e.parentElement.tagName.toLowerCase() : "" })) };
    },
    // Agent chat panel open (no "Ajan" chip on the page): its X closes agent mode and brings Flow's own generation box back.
    agent_close_rect: async () => {
      const hdr = document.querySelector("flow-agent-panel .agent-panel-header");
      if (!hdr) return { ok: false, error: "no agent panel open" };
      const b = [...hdr.querySelectorAll("button")].find((x) => norm(x.textContent).endsWith("close"));
      return b ? rectOf(b) : { ok: false, error: "agent panel close button not found" };
    },
    std_read: async () => {
      const chipEl = [...document.querySelectorAll("button")].find((b) => b.offsetParent && /(video|resim|image)\s*[·•]\s*\d+p/i.test(norm(b.textContent)));
      const costEl = [...document.querySelectorAll("div,span,p")].filter((e) => e.offsetParent && /(\d+)\s*(kredi|credit)/i.test(e.textContent) && e.children.length < 3).pop();
      const m = costEl && costEl.textContent.match(/(\d+)\s*(kredi|credit)/i);
      return { ok: true, label: chipEl ? norm(chipEl.textContent) : "", credits: m ? parseInt(m[1], 10) : null };
    },
    send: async ({ text, refs = [], agent = true }) => {
      await ensureAgentMode(agent !== false);
      for (const label of [UI.clearPrompt, UI.clearSearch]) {
        const x = byLabel(label);
        if (x) { await press(x); await sleep(500); }
      }
      for (const r of refs) await addReference(r);
      const box = promptBox();
      if (!box) throw new Error("prompt box not found");
      await press(box);
      await sendInput("clear");
      return { ok: true };
    },
    new_chat_rect: async () => {
      const b = byLabel(UI.newChat);
      return b && b.offsetParent ? rectOf(b) : { ok: false, error: "no new-session button (no chat open yet)" };
    },
    submit_rect: async () => {
      const b = document.querySelector("flow-generate-icon-button button[type=submit]");
      if (!b || b.disabled) return { ok: false, error: "submit button missing/disabled" };
      const r = b.getBoundingClientRect();
      return { ok: true, x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    rect_of: async ({ text }) => {
      const b = byText(text, document, "button");
      if (!b) return { ok: false, error: `button "${text}" not found` };
      const r = b.getBoundingClientRect();
      return { ok: true, x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    box_empty: async () => ({ ok: true, empty: !norm(promptBox()?.textContent) }),
    approval: async () => ({ ok: true, approval: approvalState() }),
    approve_rect: async () => {
      // The chat list scrolls: bring the option into the viewport first, otherwise the click lands off-screen.
      const p = pendingPermission();
      const row = p && p.rows.find((r) => norm(r.textContent).replace(/^check\s*/, "").trim() === norm(UI.approveOnce));
      if (!row) return { ok: false, error: "no pending approval" };
      row.scrollIntoView({ block: "center" });
      await sleep(400);
      const r = row.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) return { ok: false, error: `approval option off-screen (${Math.round(r.top)})` };
      return { ok: true, x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    download_click: async (args) => downloadClick(args),
  };

  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    const h = handlers[msg.cmd];
    if (!h) return reply({ ok: false, error: `unknown cmd ${msg.cmd}` });
    h(msg.args || {}).then(reply, (e) => reply({ ok: false, error: String(e) }));
    return true;
  });
})();
