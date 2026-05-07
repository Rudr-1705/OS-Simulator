let speedVal = 3, pcRun = false, dpRun = false;
let bufferSize = 5;
let buffer = [];
let prodItem = 1;

// Dining Philosophers State
const philosophers = Array(5).fill("Thinking"); // Thinking, Hungry, Eating
// Fork i is between philosopher i and philosopher (i+1)%5
// null = free, number = held by philosopher index
const forks = Array(5).fill(null);

// Semaphores State
const semaphores = [];

function switchTab(id) {
  document.querySelectorAll(".mode-tabs .tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
  document.querySelectorAll("main .tab-content").forEach((s) => s.classList.remove("active"));
  document.getElementById(`tab-${id}`).classList.add("active");
}

function drawBuffer() {
  const n = bufferSize;
  const el = document.getElementById("bufferSlots");
  if (!el) return;
  el.innerHTML = Array.from({ length: n }, (_, i) => {
    const full = i < buffer.length;
    const val = full ? buffer[i] : "";
    return `<div class="slot ${full ? "full" : ""}">${val}</div>`;
  }).join("");
  const empty = n - buffer.length;
  const full = buffer.length;
  const eEl = document.getElementById("semEmpty");
  const fEl = document.getElementById("semFull");
  if (eEl) eEl.textContent = empty;
  if (fEl) fEl.textContent = full;
}

function logPc(msg, type = "info") {
  const log = document.getElementById("pcLog");
  if (!log) return;
  const time = new Date().toLocaleTimeString("en", { hour12: false });
  const colors = { produce: "var(--accent-green)", consume: "var(--accent-blue)", blocked: "var(--accent-orange)", info: "var(--text-muted)" };
  log.innerHTML += `<div style="color:${colors[type]};border-left:2px solid ${colors[type]};padding-left:6px;margin-bottom:2px">[${time}] ${msg}</div>`;
  log.scrollTop = log.scrollHeight;
}

async function runPc() {
  if (pcRun) return;
  pcRun = true;
  while (pcRun) {
    bufferSize = Math.max(1, Math.min(10, parseInt(document.getElementById("bufSize").value, 10) || 5));
    const produce = Math.random() > 0.45;
    if (produce) {
      if (buffer.length < bufferSize) {
        buffer.push(prodItem++);
        logPc(`PRODUCE item ${buffer[buffer.length - 1]} → slot ${buffer.length - 1}`, "produce");
      } else logPc("BLOCKED producer — buffer full", "blocked");
    } else {
      if (buffer.length > 0) {
        const item = buffer.shift();
        logPc(`CONSUME item ${item}`, "consume");
      } else logPc("BLOCKED consumer — buffer empty", "blocked");
    }
    drawBuffer();
    await sleep(getDelay(speedVal));
  }
}

function drawDp() {
  const svg = document.getElementById("dpSvg");
  if (!svg) return;
  const cx = 250, cy = 250, R = 150, fr = 60;
  const stateColors = { Thinking: "var(--accent-blue)", Hungry: "var(--accent-orange)", Eating: "var(--accent-green)" };
  let html = '';

  // Table circle
  html += `<circle cx="${cx}" cy="${cy}" r="75" fill="var(--bg-elevated)" stroke="var(--border-default)" stroke-width="2"/>`;
  html += `<text x="${cx}" y="${cy+5}" text-anchor="middle" font-size="11" fill="var(--text-muted)" font-family="var(--font-mono)">TABLE</text>`;

  // Draw forks (between philosophers)
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI / 5);
    const fx = cx + Math.cos(angle) * fr;
    const fy = cy + Math.sin(angle) * fr;
    const held = forks[i] !== null;
    const forkColor = held ? stateColors.Eating : "var(--text-muted)";
    html += `<rect x="${fx-4}" y="${fy-12}" width="8" height="24" rx="2" fill="${forkColor}" opacity="${held ? '1' : '0.4'}" transform="rotate(${(angle * 180/Math.PI)+90},${fx},${fy})"/>`;
    if (held) {
      html += `<text x="${fx}" y="${fy-16}" text-anchor="middle" font-size="9" fill="${forkColor}" font-family="var(--font-mono)">P${forks[i]}</text>`;
    }
  }

  // Draw philosophers
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5);
    const x = cx + Math.cos(angle) * R;
    const y = cy + Math.sin(angle) * R;
    const color = stateColors[philosophers[i]];
    html += `<circle cx="${x}" cy="${y}" r="34" fill="${color}" opacity=".88" stroke="var(--bg-base)" stroke-width="2"/>`;
    html += `<text x="${x}" y="${y - 4}" text-anchor="middle" fill="white" font-size="11" font-weight="700" font-family="var(--font-mono)">P${i}</text>`;
    html += `<text x="${x}" y="${y + 9}" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-size="9" font-family="var(--font-ui)">${philosophers[i]}</text>`;
  }

  svg.innerHTML = html;
}

async function runDp() {
  if (dpRun) return;
  dpRun = true;
  while (dpRun) {
    const i = Math.floor(Math.random() * 5);
    const leftFork  = i;
    const rightFork = (i + 1) % 5;

    if (philosophers[i] === "Thinking") {
      philosophers[i] = "Hungry";
    } else if (philosophers[i] === "Hungry") {
      if (forks[leftFork] === null && forks[rightFork] === null) {
        forks[leftFork]  = i;
        forks[rightFork] = i;
        philosophers[i] = "Eating";
      }
    } else if (philosophers[i] === "Eating") {
      forks[leftFork]  = null;
      forks[rightFork] = null;
      philosophers[i] = "Thinking";
    }

    const allHungry = philosophers.every(s => s === "Hungry");
    const deadlockEl = document.getElementById("dpDeadlock");
    if (deadlockEl) deadlockEl.style.display = allHungry ? "block" : "none";

    drawDp();
    await sleep(getDelay(speedVal));
  }
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
    showToast(`Process BLOCKED on ${s.name} — value is 0`, "warning");
  } else if (delta > 0 && s.waiting > 0) {
    s.waiting--;
    showToast(`Process UNBLOCKED from ${s.name}`, "success");
  } else {
    s.val += delta;
  }
  renderSem();
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".mode-tabs .tab-btn").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  document.getElementById("speedRange")?.addEventListener("input", (e) => { speedVal = parseInt(e.target.value, 10); const l = document.getElementById("speedLabel"); if(l) l.textContent = `${speedVal}x`; });
  
  // Producer-Consumer
  document.getElementById("pcStart")?.addEventListener("click", runPc);
  document.getElementById("pcPause")?.addEventListener("click", () => { pcRun = !pcRun; if (pcRun) runPc(); });
  document.getElementById("pcReset")?.addEventListener("click", () => { pcRun = false; buffer = []; prodItem = 1; document.getElementById("pcLog").innerHTML = ""; drawBuffer(); });
  
  // Dining Philosophers
  document.getElementById("dpStart")?.addEventListener("click", runDp);
  document.getElementById("dpPause")?.addEventListener("click", () => { dpRun = !dpRun; if (dpRun) runDp(); });
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

  // Semaphores
  document.getElementById("addSem")?.addEventListener("click", () => {
    const name = document.getElementById("semName").value.trim();
    const val = parseInt(document.getElementById("semVal").value, 10);
    if (!name || Number.isNaN(val)) return showToast("Invalid semaphore fields", "error");
    semaphores.push({ name, val, waiting: 0 });
    renderSem();
  });

  drawBuffer(); drawDp(); renderSem();
});
