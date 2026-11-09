// Service worker: long-polls the local Python bridge for jobs, forwards them to the Flow tab,
// returns results, and saves finished videos with chrome.downloads (URL seen via webRequest).
const BRIDGE = "http://127.0.0.1:8765";
const mediaUrls = new Map(); // tabId -> [{url, t}]

chrome.webRequest.onCompleted.addListener(
  (d) => {
    if (!/\/video\/.*_720p_upsampled/.test(d.url) || d.tabId < 0) return;
    const list = mediaUrls.get(d.tabId) || [];
    list.push({ url: d.url, t: Date.now() });
    mediaUrls.set(d.tabId, list.slice(-10));
  },
  { urls: ["*://flow-content.google/*"] }
);

async function flowTab() {
  // Several Flow tabs may be open (and some loaded before the extension): use the first one whose content script answers.
  const tabs = await chrome.tabs.query({ url: "*://flow.google.com/*" });
  tabs.sort((a, b) => Number(b.active) - Number(a.active));
  for (const t of tabs) {
    try {
      const r = await chrome.tabs.sendMessage(t.id, { cmd: "ping" });
      if (r && r.ok) return t;
    } catch (e) {}
  }
  // Content script missing (tab opened before install): reload the tabs once so it gets injected.
  for (const t of tabs) await chrome.tabs.reload(t.id);
  await new Promise((r) => setTimeout(r, 6000));
  for (const t of tabs) {
    try {
      const r = await chrome.tabs.sendMessage(t.id, { cmd: "ping" });
      if (r && r.ok) return t;
    } catch (e) {}
  }
  return undefined;
}

const withTimeout = (p, ms, label) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`step "${label}" hung for ${ms / 1000}s`)), ms))]);

function sendToTab(tabId, msg, ms = 90000) {
  return withTimeout(chrome.tabs.sendMessage(tabId, msg), ms, `content:${msg.cmd}`);
}

async function runJob(job) {
  if (job.cmd === "new_project") { // fresh Flow project for a new video: open the home page, click "New project", report the project URL
    const tab0 = await flowTab().catch(() => undefined);
    if (tab0) { await chrome.tabs.update(tab0.id, { url: "https://flow.google.com/", active: true }); }
    else { await chrome.tabs.create({ url: "https://flow.google.com/", active: true }); }
    await new Promise((r) => setTimeout(r, 6000));
    const t = await flowTab();
    if (!t) return { ok: false, error: "Flow tab did not come up" };
    const projectUrl = async () => { const cur = (await chrome.tabs.get(t.id)).url; return /\/project\/[0-9a-f-]{20,}/.test(cur) ? cur.split("?")[0] : null; };
    for (let attempt = 0; attempt < 5; attempt++) { // the button can ignore a click while the home page is still settling: re-read its position and click again
      let r = { ok: false };
      for (let i = 0; i < 15 && !r.ok; i++) {
        for (const text of job.args.texts || ["Yeni proje", "New project"]) {
          r = await sendToTab(t.id, { cmd: "rect_of", args: { text } }).catch(() => ({ ok: false }));
          if (r.ok) break;
        }
        if (!r.ok) await new Promise((res) => setTimeout(res, 1000));
      }
      if (!r.ok) return { ok: false, error: "New project button not found", page: (await sendToTab(t.id, { cmd: "dump" }).catch(() => ({}))).text?.slice(0, 400) };
      await realClick(t.id, r.x, r.y);
      for (let i = 0; i < 10; i++) {
        await new Promise((res) => setTimeout(res, 1000));
        const u = await projectUrl();
        if (u) { await new Promise((res) => setTimeout(res, 3000)); return { ok: true, url: u }; }
      }
    }
    return { ok: false, error: "no project URL after clicking New project" };
  }
  if (job.cmd === "reload_extension") { setTimeout(() => chrome.runtime.reload(), 300); return { ok: true }; }
  if (job.cmd === "open_flow") { // self-heal: Flow tab closed or unreachable -> open the project again, in front
    await chrome.tabs.create({ url: job.args.url, active: true });
    await new Promise((r) => setTimeout(r, 8000));
    return { ok: true };
  }
  const tab = await flowTab();
  if (!tab) throw new Error("no flow.google.com tab open");
  // Chrome throttles timers in hidden/background tabs (after ~5 min to one tick per minute), which makes every wait
  // inside the page minutes long. Make the Flow tab the active tab of its window before working.
  // Flow's settings popover does not open in a background tab, so the standard-mode settings steps need the tab in front too.
  if (["send", "download", "create_character", "approve", "click_at", "std_rect", "std_read", "agent_mode", "agent_close_rect"].includes(job.cmd)) {
    const wasActive = tab.active;
    await chrome.tabs.update(tab.id, { active: true }).catch(() => {});
    if (!wasActive) await new Promise(r => setTimeout(r, 1500)); // let the page repaint before measuring or clicking
    // Attaching the debugger adds Chrome's "started debugging this browser" bar, which pushes the page down. Attach
    // BEFORE the page measures any rect, or every measured position is off by the bar's height and clicks miss.
    if (!attached.has(tab.id)) {
      await cdp(tab.id, "Runtime.evaluate", { expression: "1" }).catch(() => {});
      await new Promise(r => setTimeout(r, 800));
    }
  }
  if (job.cmd === "cdp_eval") { // debugging aid (localhost bridge only): evaluate an expression in the Flow page
    const r = await cdp(tab.id, "Runtime.evaluate", { expression: job.args.expr, returnByValue: true, awaitPromise: true });
    return { ok: true, value: r && r.result && r.result.value };
  }
  if (job.cmd === "click_at") { await realClick(tab.id, job.args.x, job.args.y); return { ok: true }; } // debugging aid
  if (job.cmd === "tab_info") return { tabId: tab.id, url: tab.url, title: tab.title, zoom: await chrome.tabs.getZoom(tab.id).catch(() => null), active: tab.active };
  if (job.cmd === "navigate") {
    await chrome.tabs.update(tab.id, { url: job.args.url });
    await new Promise((r) => setTimeout(r, 4000));
    return { url: job.args.url };
  }
  if (job.cmd === "download") {
    // Flow saves the file itself once the 720p upscale is ready (Chrome must allow downloads for flow.google.com).
    // Python watches ~/Downloads for it, so here we only click Download -> 720p.
    return sendToTab(tab.id, { cmd: "download_click", args: job.args });
  }
  if (job.cmd === "send") {
    // Every scene gets a fresh agent session: long chats get stuck and the agent answers "already created" to repeated prompts.
    const nc = job.args && job.args.agent === false ? { ok: false } : await sendToTab(tab.id, { cmd: "new_chat_rect" });
    if (nc.ok) {
      await realClick(tab.id, nc.x, nc.y);
      await new Promise((res) => setTimeout(res, 1500));
    }
    const prep = await sendToTab(tab.id, job);
    if (!prep.ok) return prep;
    await new Promise((res) => setTimeout(res, 500 + Math.random() * 1000));
    await realType(tab.id, job.args.text);
    await new Promise((res) => setTimeout(res, 900 + Math.random() * 1600)); // read-through pause before sending
    let r = await sendToTab(tab.id, { cmd: "submit_rect" });
    for (let i = 0; i < 12 && !r.ok; i++) { // long prompts keep the button disabled for a few seconds
      await new Promise((res) => setTimeout(res, 1000));
      r = await sendToTab(tab.id, { cmd: "submit_rect" });
    }
    if (!r.ok) return r;
    await realClick(tab.id, r.x, r.y);
    for (let round = 0; round < 4; round++) {
      for (let i = 0; i < 8; i++) {
        await new Promise((res) => setTimeout(res, 800));
        if ((await sendToTab(tab.id, { cmd: "box_empty" })).empty) return { ok: true };
      }
      // Long prompts sometimes miss the first click: re-read the button position and click again, then try Enter.
      const again = await sendToTab(tab.id, { cmd: "submit_rect" });
      if (again.ok) await realClick(tab.id, again.x, again.y);
      for (let i = 0; i < 6; i++) {
        await new Promise((res) => setTimeout(res, 800));
        if ((await sendToTab(tab.id, { cmd: "box_empty" })).empty) return { ok: true };
      }
      await sendToTab(tab.id, { cmd: "char_focus_box" });
      await realKey(tab.id, "Enter"); // fallback: Enter submits chat-style prompt boxes
    }
    return { ok: false, error: "submit (trusted click) did not clear the prompt box" };
  }
  if (job.cmd === "screenshot") {
    const r = await cdp(tab.id, "Page.captureScreenshot", { format: "jpeg", quality: 55 });
    return { ok: true, png: r.data };
  }
  if (job.cmd === "rename_character") { // existing tile "from" -> "name" (after its images are ready)
    const { from, name } = job.args;
    const ask = (cmd, args) => sendToTab(tab.id, { cmd, args });
    const o = await ask("char_tile_open", { title: from });
    if (!o.ok) return o;
    let e = await ask("char_edit_rect");
    for (let i = 0; i < 20 && !e.ok; i++) { await new Promise((res) => setTimeout(res, 1000)); e = await ask("char_edit_rect"); }
    if (!e.ok) return e;
    await realClick(tab.id, e.x, e.y);
    await new Promise((res) => setTimeout(res, 500));
    const f = await ask("char_name_focus");
    if (!f.ok) return f;
    await realType(tab.id, name);
    await realKey(tab.id, "Enter");
    await new Promise((res) => setTimeout(res, 800));
    const d = await ask("done_rect");
    if (!d.ok) return d;
    await realClick(tab.id, d.x, d.y);
    await new Promise((res) => setTimeout(res, 2000));
    return { ok: true, name };
  }
  if (job.cmd === "create_character") {
    const { name, description } = job.args;
    const ask = (cmd, args) => sendToTab(tab.id, { cmd, args });
    const need = async (cmd) => { const r = await ask(cmd); if (!r.ok) throw new Error(`${cmd}: ${r.error}`); return r; };
    const started = async () => /\/character\/[0-9a-f-]{20,}/.test((await ask("path")).path);
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      await need("char_open");
      await new Promise((res) => setTimeout(res, 1500 + attempt * 1500)); // let the editor finish initialising
      await realType(tab.id, description);
      await new Promise((res) => setTimeout(res, 800));
      const s = await need("submit_rect");
      await realClick(tab.id, s.x, s.y);
      for (let i = 0; i < 8 && !ok; i++) { await new Promise((res) => setTimeout(res, 800)); ok = await started(); }
      if (!ok) {
        await need("char_focus_box");
        await realKey(tab.id, "Enter");
        for (let i = 0; i < 10 && !ok; i++) { await new Promise((res) => setTimeout(res, 800)); ok = await started(); }
      }
    }
    if (!ok) return { ok: false, error: "character generation did not start after 3 attempts" };
    // The images keep generating in the background: name the character as soon as the edit button exists.
    let e = await ask("char_edit_rect");
    for (let i = 0; i < 40 && !e.ok; i++) { await new Promise((res) => setTimeout(res, 1000)); e = await ask("char_edit_rect"); }
    if (!e.ok) { // fallback: wait for the images, then try again
      const end = Date.now() + 240000;
      while (Date.now() < end && !(await ask("char_ready")).ready) await new Promise((res) => setTimeout(res, 2000));
      e = await need("char_edit_rect");
    }
    await realClick(tab.id, e.x, e.y);
    await new Promise((res) => setTimeout(res, 500));
    await need("char_name_focus");
    await realType(tab.id, name); // selection is replaced by the typed text
    await realKey(tab.id, "Enter");
    await new Promise((res) => setTimeout(res, 800));
    const d = await need("done_rect");
    await realClick(tab.id, d.x, d.y);
    await new Promise((res) => setTimeout(res, 2500));
    return { ok: true, name };
  }
  if (job.cmd === "approve") {
    const r = await sendToTab(tab.id, { cmd: "approve_rect" });
    if (!r.ok) return r;
    await realClick(tab.id, r.x, r.y);
    return { ok: true };
  }
  return sendToTab(tab.id, job);
}

let hangs = 0;
async function loop() {
  for (;;) {
    try {
      const r = await fetch(`${BRIDGE}/poll`);
      if (r.status === 200) {
        const job = await r.json();
        let out;
        try {
          out = await withTimeout(runJob(job), job.cmd === "create_character" ? 360000 : 200000, `job:${job.cmd}`);
          hangs = 0;
        } catch (e) {
          out = { ok: false, error: String(e) };
          if (/hung for/.test(out.error) && ++hangs >= 2) setTimeout(() => chrome.runtime.reload(), 1500); // wedged worker: restart the extension itself
        }
        await fetch(`${BRIDGE}/result`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: job.id, result: out }),
        });
      }
    } catch (e) {
      await new Promise((r) => setTimeout(r, 3000)); // bridge not running yet
    }
  }
}

// Keep the worker alive while the bridge long-poll is pending.
// MV3 suspends idle workers; an alarm listener makes Chrome wake it every ~30s so the poll loop restarts.
let looping = false;
const startLoop = () => {
  if (looping) return;
  looping = true;
  loop().finally(() => (looping = false));
};
chrome.alarms.create("keepalive", { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(startLoop);
chrome.runtime.onStartup.addListener(startLoop);
chrome.runtime.onInstalled.addListener(startLoop);
startLoop();

// ALL input goes through the debugger API as REAL (trusted) events, never as script-made ones. One debugger session stays attached between
// actions (Chrome shows its "started debugging" bar once, not once per click) and every action has a short human-like gap.
const attached = new Map(); // tabId -> idle-detach timer
const rnd = (a, b) => a + Math.random() * (b - a);
const nap = (ms) => new Promise((r) => setTimeout(r, ms));
async function cdp(tabId, method, params) {
  if (!attached.has(tabId)) {
    try { await withTimeout(chrome.debugger.attach({ tabId }, "1.3"), 15000, "debugger.attach"); }
    catch (e) { if (!/already attached/i.test(String(e))) throw e; }
    attached.set(tabId, null);
  }
  clearTimeout(attached.get(tabId));
  attached.set(tabId, setTimeout(() => detachTab(tabId), 15 * 60000)); // stay attached through a run: each detach/attach moves the page (debugging bar)
  return withTimeout(chrome.debugger.sendCommand({ tabId }, method, params), 20000, method);
}
async function detachTab(tabId) {
  clearTimeout(attached.get(tabId));
  attached.delete(tabId);
  await chrome.debugger.detach({ tabId }).catch(() => {});
}
chrome.debugger.onDetach.addListener((src) => { clearTimeout(attached.get(src.tabId)); attached.delete(src.tabId); });

// Page rects are CSS pixels; CDP mouse events are in device-independent pixels of the viewport. With Chrome's page
// zoom at e.g. 80 % every rect must be scaled, or clicks land beside the target (seen: Flow at 80 %, settings never opened).
async function zoomed(tabId, x, y) {
  // Measured 2026-11-09 at 80 % zoom: CDP mouse x/y are already CSS pixels (a scaled click landed at 0.8x the target).
  return [x, y];
}
async function realMove(tabId, x, y) { [x, y] = await zoomed(tabId, x, y); await cdp(tabId, "Input.dispatchMouseEvent", { type: "mouseMoved", x, y }); }
async function realClick(tabId, x, y) {
  [x, y] = await zoomed(tabId, x, y);
  await cdp(tabId, "Input.dispatchMouseEvent", { type: "mouseMoved", x: x + rnd(-1.5, 1.5), y: y + rnd(-1.5, 1.5) });
  await nap(rnd(40, 120));
  await cdp(tabId, "Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
  await nap(rnd(45, 110));
  await cdp(tabId, "Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
}
async function realType(tabId, text) { await cdp(tabId, "Input.insertText", { text }); }
const KEYCODES = { Enter: 13, Escape: 27, Backspace: 8 };
async function realKey(tabId, key) {
  const code = KEYCODES[key] || 0;
  for (const type of ["keyDown", "keyUp"]) {
    await cdp(tabId, "Input.dispatchKeyEvent", { type, key, code: key, windowsVirtualKeyCode: code, text: type === "keyDown" && key === "Enter" ? "\r" : undefined });
    if (type === "keyDown") await nap(rnd(30, 80));
  }
}
async function realClear(tabId) { // select all in the focused editor, then delete: how a person clears a box
  const modifiers = /Mac/i.test(navigator.userAgent) ? 4 : 2;
  await cdp(tabId, "Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers, commands: ["selectAll"] });
  await cdp(tabId, "Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers });
  await nap(rnd(60, 140));
  await realKey(tabId, "Backspace");
}
// Content scripts ask for trusted input here instead of dispatching synthetic events themselves.
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!msg || !msg.trusted || !sender.tab) return false;
  (async () => {
    const id = sender.tab.id;
    if (msg.trusted === "click") await realClick(id, msg.x, msg.y);
    else if (msg.trusted === "hover") await realMove(id, msg.x, msg.y);
    else if (msg.trusted === "key") await realKey(id, msg.key);
    else if (msg.trusted === "clear") await realClear(id);
    else if (msg.trusted === "type") await realType(id, msg.text);
    reply({ ok: true });
  })().catch((e) => reply({ ok: false, error: String(e) }));
  return true;
});
