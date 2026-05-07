let speedVal = 3, pcRun = false, dpRun = false;
let bufferSize = 5;
let buffer = [];
let prodItem = 1;

// Dining Philosophers State
const philosophers = Array(5).fill("Thinking"); // Thinking | Hungry | WaitingRight | Eating
const forks = Array(5).fill(null); // null = free, number = held by philosopher index

// Semaphores state
const semaphores = [];

// Readers-Writers state
let rwRun = false;
let readCount = 0;
let wrt = 1;
let rwMutex = 1;
let writerWaiting = 0;
let rwReaderStates = Array(4).fill("Idle");
let rwWriterState = "Idle";
const dpPrevStates = Array(5).fill("Thinking");

function switchTab(id) {
  document.querySelectorAll(".mode-tabs .tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
  document.querySelectorAll("main .tab-content").forEach((s) => s.classList.remove("active"));
  const tab = document.getElementById(`tab-${id}`);
  if (tab) tab.classList.add("active");
}

function drawBuffer() {
  const n = bufferSize;
  const el = document.getElementById("bufferSlots");
  if (!el) return;
  const fastMode = getDelay(speedVal) < 200;

  while (el.children.length < n) {
    const d = document.createElement("div");
    d.className = "slot";
    d.style.transition = "background 0.3s ease, border-color 0.3s ease, transform 0.2s ease";
    el.appendChild(d);
  }
  while (el.children.length > n) el.removeChild(el.lastChild);

  for (let i = 0; i < n; i++) {
    const slot = el.children[i];
    const isFull = i < buffer.length;
    const val = isFull ? buffer[i] : "";
    const wasEmpty = !slot.classList.contains("full");
    const wasFull = slot.classList.contains("full");
    if (slot._anim) {
      clearTimeout(slot._anim);
      slot._anim = null;
    }
    slot.textContent = val;
    if (isFull && wasEmpty) {
      slot.classList.add("full");
      if (!fastMode) {
        slot.style.transform = "scale(1.12)";
        slot._anim = setTimeout(() => { slot.style.transform = "scale(1)"; slot._anim = null; }, 200);
      } else {
        slot.style.transform = "scale(1)";
      }
    } else if (!isFull) {
      slot.classList.remove("full");
      if (wasFull && !fastMode) {
        slot.style.transform = "scale(0.88)";
        slot._anim = setTimeout(() => { slot.style.transform = "scale(1)"; slot._anim = null; }, 200);
      } else {
        slot.style.transform = "scale(1)";
      }
    }
  }

  const semEmpty = document.getElementById("semEmpty");
  const semFull = document.getElementById("semFull");
  if (semEmpty) semEmpty.textContent = String(n - buffer.length);
  if (semFull) semFull.textContent = String(buffer.length);
}

function logPc(msg, type = "info") {
  const log = document.getElementById("pcLog");
  if (!log) return;
  const time = new Date().toLocaleTimeString("en", { hour12: false });
  const colors = { produce: "var(--accent-green)", consume: "var(--accent-blue)", blocked: "var(--accent-orange)", info: "var(--text-muted)" };
  const color = colors[type] || colors.info;
  log.innerHTML += `<div style="color:${color};border-left:2px solid ${color};padding-left:6px;margin-bottom:2px">[${time}] ${msg}</div>`;
  log.scrollTop = log.scrollHeight;
}

async function runPcLoop() {
  while (pcRun) {
    bufferSize = Math.max(1, Math.min(10, parseInt(document.getElementById("bufSize")?.value || "5", 10)));
    const produce = Math.random() > 0.45;
    if (produce) {
      if (buffer.length < bufferSize) {
        buffer.push(prodItem++);
        logPc(`PRODUCE item ${buffer[buffer.length - 1]} -> slot ${buffer.length - 1}`, "produce");
      } else {
        logPc("BLOCKED producer - buffer full", "blocked");
      }
    } else if (buffer.length > 0) {
      const item = buffer.shift();
      logPc(`CONSUME item ${item}`, "consume");
    } else {
      logPc("BLOCKED consumer - buffer empty", "blocked");
    }
    drawBuffer();
    await sleep(getDelay(speedVal));
  }
}

async function runPc() {
  if (pcRun) return;
  pcRun = true;
  await runPcLoop();
}

function initDpSvg() {
  const svg = document.getElementById("dpSvg");
  if (!svg) return;
  const cx = 250, cy = 250, R = 160, fr = 68;
  const thinkColor = "#60a5fa";

  let html = `<defs>
    <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <style>
      .phil-circle { transition: fill 0.4s ease; }
      .fork-rect   { transition: fill 0.3s ease, opacity 0.3s ease; }
      .phil-ring   { transition: stroke 0.4s ease, stroke-width 0.3s ease; }
    </style>
  </defs>`;

  html += `<circle cx="${cx}" cy="${cy}" r="78" fill="var(--bg-elevated)" stroke="var(--border-default)" stroke-width="2"/>`;
  html += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="11" fill="var(--text-muted)" font-family="var(--font-mono)">TABLE</text>`;

  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI / 5);
    const fx = cx + Math.cos(angle) * fr;
    const fy = cy + Math.sin(angle) * fr;
    const rot = (angle * 180 / Math.PI) + 90;
    html += `<rect class="fork-rect" id="fork-${i}" x="${fx - 4}" y="${fy - 14}" width="8" height="28" rx="3" fill="var(--text-muted)" opacity="0.35" transform="rotate(${rot},${fx},${fy})"/>`;
    html += `<text class="fork-label" id="fork-label-${i}" x="${fx}" y="${fy - 20}" text-anchor="middle" font-size="9" fill="var(--text-muted)" font-family="var(--font-mono)" opacity="0"></text>`;
  }

  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5);
    const x = cx + Math.cos(angle) * R;
    const y = cy + Math.sin(angle) * R;
    html += `<circle class="phil-ring" id="phil-ring-${i}" cx="${x}" cy="${y}" r="37" fill="none" stroke="${thinkColor}" stroke-width="0" opacity="0.5"/>`;
    html += `<circle class="phil-circle" id="phil-${i}" cx="${x}" cy="${y}" r="33" fill="${thinkColor}" opacity="0.9" stroke="var(--bg-base)" stroke-width="2.5" filter="url(#glow)"/>`;
    html += `<text x="${x}" y="${y - 5}" text-anchor="middle" fill="white" font-size="12" font-weight="700" font-family="var(--font-mono)">P${i}</text>`;
    html += `<text class="phil-state" id="phil-state-${i}" x="${x}" y="${y + 9}" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="8" font-family="var(--font-ui)">Thinking</text>`;
  }

  // innerHTML set ONCE here — elements now exist in DOM before updateDp() runs
  svg.innerHTML = html;
}

function updateDp() {
  const fastMode = getDelay(speedVal) < 200;
  const stateColors = {
    Thinking: "#60a5fa",
    Hungry: "#f97316",
    WaitingRight: "#a855f7",
    Eating: "#22c55e"
  };
  for (let i = 0; i < 5; i++) {
    const state = philosophers[i];
    const color = stateColors[state] || stateColors.Thinking;
    const philEl = document.getElementById(`phil-${i}`);
    const stateEl = document.getElementById(`phil-state-${i}`);
    const ringEl = document.getElementById(`phil-ring-${i}`);
    if (philEl) {
      philEl.setAttribute("fill", color);
      if (!fastMode && dpPrevStates[i] !== state) {
        if (philEl._pulseAnim) {
          clearTimeout(philEl._pulseAnim);
          philEl._pulseAnim = null;
        }
        philEl.style.opacity = "0.4";
        philEl._pulseAnim = setTimeout(() => {
          philEl.style.opacity = "0.9";
          philEl._pulseAnim = null;
        }, 300);
      } else if (fastMode) {
        philEl.style.opacity = "0.9";
      }
    }
    if (stateEl) stateEl.textContent = state;
    if (ringEl) {
      ringEl.setAttribute("stroke", color);
      ringEl.setAttribute("stroke-width", state === "Eating" ? "6" : "0");
    }

    const forkEl = document.getElementById(`fork-${i}`);
    const forkLbl = document.getElementById(`fork-label-${i}`);
    const holder = forks[i];
    if (forkEl) {
      forkEl.setAttribute("fill", holder !== null ? stateColors.Eating : "var(--text-muted)");
      forkEl.setAttribute("opacity", holder !== null ? "1" : "0.35");
    }
    if (forkLbl) {
      forkLbl.textContent = holder !== null ? `P${holder}` : "";
      forkLbl.setAttribute("opacity", holder !== null ? "1" : "0");
      forkLbl.setAttribute("fill", holder !== null ? stateColors.Eating : "var(--text-muted)");
    }
    dpPrevStates[i] = state;
  }
}

// drawDp is the public API — init SVG on first call, then only update attributes
function drawDp() {
  const svg = document.getElementById("dpSvg");
  if (!svg) return;
  if (!document.getElementById("phil-0")) initDpSvg(); // elements missing → (re)build
  updateDp();
}

async function runDpLoop() {
  while (dpRun) {
    // Phase 0: Eating -> Thinking FIRST (release forks before anyone grabs)
    for (let i = 0; i < 5; i++) {
      if (philosophers[i] === "Eating" && Math.random() < 0.4) {
        forks[i] = null;
        forks[(i + 1) % 5] = null;
        philosophers[i] = "Thinking";
      }
    }

    // Phase 1: Thinking -> Hungry (independent per philosopher)
    for (let i = 0; i < 5; i++) {
      if (philosophers[i] === "Thinking" && Math.random() < 0.35) {
        philosophers[i] = "Hungry";
      }
    }

    // Phase 2 & 3: fork grabs processed in shuffled order to avoid systematic bias
    const order = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);

    // Hungry -> WaitingRight: try grab LEFT fork
    for (const i of order) {
      if (philosophers[i] === "Hungry") {
        if (forks[i] === null) {          // fork i is the LEFT fork of philosopher i
          forks[i] = i;
          philosophers[i] = "WaitingRight";
        }
      }
    }

    // WaitingRight -> Eating: try grab RIGHT fork
    for (const i of order) {
      if (philosophers[i] === "WaitingRight") {
        const right = (i + 1) % 5;
        if (forks[right] === null) {
          forks[right] = i;
          philosophers[i] = "Eating";
        }
        // else: stays WaitingRight - deadlock-prone state
      }
    }

    // Deadlock: ALL philosophers hold their left fork and are waiting for right
    // i.e. every philosopher is in WaitingRight state (=> all 5 forks held)
    const isDeadlock = philosophers.every(s => s === "WaitingRight");
    const deadlockEl = document.getElementById("dpDeadlock");
    if (deadlockEl) deadlockEl.style.display = isDeadlock ? "block" : "none";

    drawDp();
    await sleep(getDelay(speedVal));
  }
}

async function runDp() {
  if (dpRun) return;
  dpRun = true;
  await runDpLoop();
}

function renderSem() {
  const el = document.getElementById("semList");
  if (!el) return;
  el.innerHTML = semaphores.map((s, i) => `
    <div class="sem-item card" style="margin-bottom:.5rem;display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem">
      <div>
        <div style="font-weight:700;font-size:.9rem">${s.name}</div>
        <div style="font-size:.72rem;color:var(--text-muted)">Waiting: ${s.waiting || 0} process(es)</div>
      </div>
      <div style="display:flex;align-items:center;gap:.75rem">
        <span class="badge badge-purple" style="font-size:1rem;font-family:var(--font-mono);padding:.3rem .8rem">${s.val}</span>
        <button class="btn btn-danger btn-sm" onclick="semAdjust(${i},-1)">wait()</button>
        <button class="btn btn-success btn-sm" onclick="semAdjust(${i},1)">signal()</button>
      </div>
    </div>`).join("");
}

window.semAdjust = function semAdjust(idx, delta) {
  const s = semaphores[idx];
  if (!s) return;
  s.waiting = s.waiting || 0;

  if (delta < 0 && s.val <= 0) {
    s.waiting++;
    showToast(`Process BLOCKED on ${s.name} - value is 0`, "warning");
  } else if (delta > 0 && s.waiting > 0) {
    s.waiting--;
    showToast(`Process UNBLOCKED from ${s.name}`, "success");
  } else {
    s.val += delta;
  }
  renderSem();
};

function logRw(msg, type = "info") {
  const log = document.getElementById("rwLog");
  if (!log) return;
  const t = new Date().toLocaleTimeString("en", { hour12: false });
  const colors = {
    read: "var(--accent-blue)",
    write: "var(--accent-red)",
    blocked: "var(--accent-orange)",
    release: "var(--accent-green)",
    info: "var(--text-muted)"
  };
  const c = colors[type] || colors.info;
  log.innerHTML += `<div style="color:${c};border-left:2px solid ${c};padding-left:6px;margin-bottom:2px">[${t}] ${msg}</div>`;
  log.scrollTop = log.scrollHeight;
}

function drawRw(nReaders, readerStates, writerState) {
  const svg = document.getElementById("rwSvg");
  if (!svg) return;
  const needInit = !svg.dataset.rwInit || parseInt(svg.dataset.rwCount || "0", 10) !== nReaders;
  if (needInit) initRwSvg(nReaders);
  updateRw(nReaders, readerStates, writerState);
}

function initRwSvg(nReaders) {
  const svg = document.getElementById("rwSvg");
  if (!svg) return;
  const W = 600, H = 300;
  const dbX = W / 2, dbY = H / 2;
  let html = "";

  html += `<defs>
    <marker id="arrowW" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#ef4444"/></marker>
    <style>
      .rw-link { transition: opacity 0.25s ease; }
      .rw-fill { transition: fill 0.25s ease; }
    </style>
  </defs>`;

  html += `<ellipse id="rw-db-top" cx="${dbX}" cy="${dbY - 24}" rx="48" ry="14" fill="var(--bg-card)" stroke="var(--border-default)" stroke-width="2"/>`;
  html += `<rect id="rw-db-rect" x="${dbX - 48}" y="${dbY - 24}" width="96" height="48" fill="var(--bg-card)" stroke="none"/>`;
  html += `<ellipse id="rw-db-bottom" class="rw-fill" cx="${dbX}" cy="${dbY + 24}" rx="48" ry="14" fill="var(--bg-elevated)" stroke="var(--border-default)" stroke-width="2"/>`;
  html += `<line x1="${dbX - 48}" y1="${dbY - 24}" x2="${dbX - 48}" y2="${dbY + 24}" stroke="var(--border-default)" stroke-width="2"/>`;
  html += `<line x1="${dbX + 48}" y1="${dbY - 24}" x2="${dbX + 48}" y2="${dbY + 24}" stroke="var(--border-default)" stroke-width="2"/>`;
  html += `<text x="${dbX}" y="${dbY + 5}" text-anchor="middle" font-size="11" fill="var(--text-primary)" font-weight="700" font-family="var(--font-mono)">DATABASE</text>`;
  html += `<text id="rw-db-reading-count" x="${dbX}" y="${dbY + 18}" text-anchor="middle" font-size="8" fill="var(--text-muted)" font-family="var(--font-mono)">0 reading</text>`;

  const wx = 70, wy = H / 2;
  html += `<rect id="rw-writer-box" class="rw-fill" x="${wx - 28}" y="${wy - 18}" width="56" height="36" rx="6" fill="#94a3b8" opacity="0.9"/>`;
  html += `<text x="${wx}" y="${wy + 5}" text-anchor="middle" fill="white" font-size="10" font-weight="700" font-family="var(--font-mono)">W</text>`;
  html += `<text id="rw-writer-state" x="${wx}" y="${wy - 26}" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="var(--font-ui)">Idle</text>`;
  html += `<line id="rw-writer-link" class="rw-link" x1="${wx + 30}" y1="${wy}" x2="${dbX - 50}" y2="${wy}" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="4 2" marker-end="url(#arrowW)" opacity="0"/>`;

  for (let ri = 0; ri < nReaders; ri++) {
    const rx = W - 80;
    const ry = (H / (nReaders + 1)) * (ri + 1);
    html += `<rect id="rw-reader-box-${ri}" class="rw-fill" x="${rx - 24}" y="${ry - 14}" width="48" height="28" rx="5" fill="#94a3b8" opacity="0.88"/>`;
    html += `<text x="${rx}" y="${ry + 4}" text-anchor="middle" fill="white" font-size="9" font-weight="700" font-family="var(--font-mono)">R${ri + 1}</text>`;
    html += `<text id="rw-reader-state-${ri}" x="${rx}" y="${ry - 20}" text-anchor="middle" fill="#94a3b8" font-size="7.5" font-family="var(--font-ui)">Idle</text>`;
    html += `<line id="rw-reader-link-${ri}" class="rw-link" x1="${rx - 26}" y1="${ry}" x2="${dbX + 50}" y2="${dbY}" stroke="#22c55e" stroke-width="1.8" stroke-dasharray="3 2" opacity="0"/>`;
  }

  svg.innerHTML = html;
  svg.dataset.rwInit = "1";
  svg.dataset.rwCount = String(nReaders);
}

function updateRw(nReaders, readerStates, writerState) {
  const fastMode = getDelay(speedVal) < 200;
  const dbBottom = document.getElementById("rw-db-bottom");
  const dbCount = document.getElementById("rw-db-reading-count");
  if (dbBottom) {
    dbBottom.setAttribute("fill", wrt === 0 ? "#ef4444" : "var(--bg-elevated)");
    dbBottom.style.transition = fastMode ? "none" : "fill 0.25s ease";
  }
  if (dbCount) dbCount.textContent = `${readCount} reading`;

  const writerBox = document.getElementById("rw-writer-box");
  const writerStateEl = document.getElementById("rw-writer-state");
  const writerLink = document.getElementById("rw-writer-link");
  const wColor = writerState === "Writing" ? "#ef4444" : writerState === "Waiting" ? "#f97316" : "#94a3b8";
  if (writerBox) writerBox.setAttribute("fill", wColor);
  if (writerStateEl) {
    writerStateEl.textContent = writerState;
    writerStateEl.setAttribute("fill", wColor);
  }
  if (writerLink) {
    writerLink.setAttribute("opacity", writerState === "Writing" ? "1" : "0");
    writerLink.style.transition = fastMode ? "none" : "opacity 0.25s ease";
  }

  for (let ri = 0; ri < nReaders; ri++) {
    const state = readerStates[ri] || "Idle";
    const rColor = state === "Reading" ? "#22c55e" : state === "Waiting" ? "#f97316" : "#94a3b8";
    const box = document.getElementById(`rw-reader-box-${ri}`);
    const stateEl = document.getElementById(`rw-reader-state-${ri}`);
    const link = document.getElementById(`rw-reader-link-${ri}`);
    if (box) box.setAttribute("fill", rColor);
    if (stateEl) {
      stateEl.textContent = state;
      stateEl.setAttribute("fill", rColor);
    }
    if (link) {
      link.setAttribute("opacity", state === "Reading" ? "0.7" : "0");
      link.style.transition = fastMode ? "none" : "opacity 0.25s ease";
    }
  }
}

function updateRwBadges() {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };
  set("rwMutex", rwMutex);
  set("rwWrt", wrt);
  set("rwReadCount", readCount);
  set("rwWriterWait", writerWaiting);
}

async function runRwLoop() {
  const nR = Math.max(1, Math.min(8, parseInt(document.getElementById("rwReaderCount")?.value || "4", 10)));
  rwReaderStates = Array(nR).fill("Idle");
  rwWriterState = "Idle";

  while (rwRun) {
    const coin = Math.random();

    if (coin < 0.3) {
      if (rwWriterState === "Idle") {
        if (wrt === 1) {
          wrt = 0;
          rwWriterState = "Writing";
          logRw("Writer acquired wrt - WRITING", "write");
        } else {
          writerWaiting++;
          rwWriterState = "Waiting";
          logRw("Writer BLOCKED - database in use", "blocked");
        }
      } else if (rwWriterState === "Writing") {
        wrt = 1;
        writerWaiting = Math.max(0, writerWaiting - 1);
        rwWriterState = "Idle";
        logRw("Writer released wrt - DONE", "release");
      } else if (rwWriterState === "Waiting" && wrt === 1) {
        wrt = 0;
        writerWaiting = Math.max(0, writerWaiting - 1);
        rwWriterState = "Writing";
        logRw("Writer unblocked - WRITING", "write");
      }
    } else {
      const ri = Math.floor(Math.random() * nR);
      const state = rwReaderStates[ri];

      if (state === "Idle") {
        if (wrt === 1 || readCount > 0) {
          if (rwMutex === 1) {
            rwMutex = 0;
            readCount++;
            if (readCount === 1) wrt = 0;
            rwMutex = 1;
            rwReaderStates[ri] = "Reading";
            logRw(`Reader R${ri + 1} started READING (readCount=${readCount})`, "read");
          } else {
            rwReaderStates[ri] = "Waiting";
            logRw(`Reader R${ri + 1} WAITING for mutex`, "blocked");
          }
        } else {
          rwReaderStates[ri] = "Waiting";
          logRw(`Reader R${ri + 1} WAITING - writer holds wrt`, "blocked");
        }
      } else if (state === "Waiting") {
        if (rwMutex === 1 && (wrt === 1 || readCount > 0)) {
          rwMutex = 0;
          readCount++;
          if (readCount === 1) wrt = 0;
          rwMutex = 1;
          rwReaderStates[ri] = "Reading";
          logRw(`Reader R${ri + 1} unblocked - READING (readCount=${readCount})`, "read");
        }
      } else if (state === "Reading" && Math.random() < 0.4) {
        rwMutex = 0;
        readCount--;
        if (readCount === 0) wrt = 1;
        rwMutex = 1;
        rwReaderStates[ri] = "Idle";
        logRw(`Reader R${ri + 1} done READING (readCount=${readCount})`, "release");
      }
    }

    updateRwBadges();
    drawRw(nR, rwReaderStates, rwWriterState);
    await sleep(getDelay(speedVal));
  }
}

async function runRw() {
  if (rwRun) return;
  rwRun = true;
  await runRwLoop();
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".mode-tabs .tab-btn").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  document.getElementById("speedRange")?.addEventListener("input", (e) => {
    speedVal = parseInt(e.target.value, 10);
    const l = document.getElementById("speedLabel");
    if (l) l.textContent = `${speedVal}x`;
  });

  // Producer-Consumer
  document.getElementById("pcStart")?.addEventListener("click", runPc);
  document.getElementById("pcPause")?.addEventListener("click", () => {
    if (pcRun) {
      pcRun = false;
    } else {
      pcRun = true;
      runPcLoop();
    }
  });
  document.getElementById("pcReset")?.addEventListener("click", () => {
    pcRun = false;
    buffer = [];
    prodItem = 1;
    const log = document.getElementById("pcLog");
    if (log) log.innerHTML = "";
    drawBuffer();
  });

  // Dining Philosophers
  document.getElementById("dpStart")?.addEventListener("click", runDp);
  document.getElementById("dpPause")?.addEventListener("click", () => {
    if (dpRun) {
      dpRun = false; // pause: the while loop will exit on next iteration
    } else {
      dpRun = true;  // unpause: manually re-enter the loop
      runDpLoop();   // call the inner loop directly, bypassing the entry guard
    }
  });
  document.getElementById("dpReset")?.addEventListener("click", () => {
    dpRun = false;
    for (let i = 0; i < 5; i++) {
      philosophers[i] = "Thinking";
      forks[i] = null;
    }
    const deadlockEl = document.getElementById("dpDeadlock");
    if (deadlockEl) deadlockEl.style.display = "none";
    drawDp();
  });

  // Readers-Writers
  document.getElementById("rwStart")?.addEventListener("click", runRw);
  document.getElementById("rwPause")?.addEventListener("click", () => {
    if (rwRun) {
      rwRun = false;
    } else {
      rwRun = true;
      runRwLoop();
    }
  });
  document.getElementById("rwReset")?.addEventListener("click", () => {
    rwRun = false;
    readCount = 0;
    wrt = 1;
    rwMutex = 1;
    writerWaiting = 0;
    rwReaderStates = Array(4).fill("Idle");
    rwWriterState = "Idle";
    const log = document.getElementById("rwLog");
    if (log) log.innerHTML = "";
    drawRw(4, rwReaderStates, rwWriterState);
    updateRwBadges();
  });

  // Semaphores
  document.getElementById("addSem")?.addEventListener("click", () => {
    const name = document.getElementById("semName")?.value.trim() || "";
    const val = parseInt(document.getElementById("semVal")?.value || "", 10);
    if (!name || Number.isNaN(val)) return showToast("Invalid semaphore fields", "error");
    semaphores.push({ name, val, waiting: 0 });
    renderSem();
  });

  drawBuffer();
  drawDp();
  drawRw(4, rwReaderStates, rwWriterState);
  updateRwBadges();
  renderSem();
});
