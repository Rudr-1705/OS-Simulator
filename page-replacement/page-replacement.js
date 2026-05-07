let algo = "FIFO", speedVal = 3, steps = [], idx = 0, running = false;
let preparedData = null;

function parseRefs() {
  return document.getElementById("refInput").value.trim().split(/\s+/).map(Number).filter((n) => !Number.isNaN(n));
}

function simulate(algorithm, refs, fcount) {
  const frames   = Array(fcount).fill(null);
  const refBits  = Array(fcount).fill(0);
  let fifoPtr    = 0;
  let clockHand  = 0;
  let faults = 0, hits = 0;
  const lastUsed = Array(fcount).fill(-1);
  const out = [];
  for (let i = 0; i < refs.length; i++) {
    const page = refs[i];
    const hitPos = frames.indexOf(page);
    let event = "hit";
    let evicted = null;
    let evictPos = -1;
    if (hitPos !== -1) {
      hits++;
      refBits[hitPos] = 1;
      lastUsed[hitPos] = i;
    } else {
      faults++;
      event = "fault";
      const emptyPos = frames.indexOf(null);
      if (emptyPos !== -1) evictPos = emptyPos;
      else {
        if (algorithm === "FIFO") { evictPos = fifoPtr; fifoPtr = (fifoPtr + 1) % fcount; }
        else if (algorithm === "LRU") evictPos = lastUsed.indexOf(Math.min(...lastUsed));
        else if (algorithm === "OPT") {
          const nextUse = frames.map(fp => { const idx = refs.slice(i + 1).indexOf(fp); return idx === -1 ? Infinity : idx; });
          evictPos = nextUse.indexOf(Math.max(...nextUse));
        } else {
          while (refBits[clockHand] === 1) { refBits[clockHand] = 0; clockHand = (clockHand + 1) % fcount; }
          evictPos = clockHand;
          clockHand = (clockHand + 1) % fcount;
        }
        evicted = frames[evictPos];
      }
      frames[evictPos] = page;
      refBits[evictPos] = 1;
      lastUsed[evictPos] = i;
    }
    out.push({ i, page, event, evicted, evictPos, frames:[...frames], refBits:[...refBits], clockHand, faults, hits });
  }
  return out;
}

function renderRefTape(refs, current) {
  const el = document.getElementById("refTape");
  el.innerHTML = refs.map((r, i) => `<span class="ref-cell ${i < current ? "past" : ""} ${i === current ? "current" : ""}">${r}</span>`).join("");
}

function renderStep(s, fcount) {
  if (!s) return;
  const framesEl = document.getElementById("frames");
  framesEl.innerHTML = Array.from({ length: fcount }, (_, i) => {
    const v = s.frames[i];
    const isNew = s.event === "fault" && i === s.evictPos;
    const isHit = s.event === "hit" && v === s.page;
    const isClock = algo === "CLOCK" && i === s.clockHand;
    const cls = isNew ? "page-fault" : isHit ? "page-hit" : "";
    return `<div class="frame-box ${cls}"><div class="frame-val">${v ?? "—"}</div><div class="frame-bit">R:${s.refBits[i]}</div>${isClock ? '<div class="clock-hand">▲</div>' : ''}</div>`;
  }).join("");
  document.getElementById("stepBadge").textContent = `Step ${s.i + 1} / ${steps.length}`;
  const rb = document.getElementById("resultBadge");
  rb.className = `badge ${s.event === "hit" ? "badge-green" : "badge-red"}`;
  rb.textContent = s.event === "hit" ? "PAGE HIT" : "PAGE FAULT";
  const total = s.hits + s.faults;
  animateCounter(document.getElementById("faults"), s.faults, 220);
  animateCounter(document.getElementById("hits"), s.hits, 220);
  animateCounter(document.getElementById("hitRatio"), Math.round((s.hits / total) * 100), 220, "", "%");
  animateCounter(document.getElementById("missRatio"), Math.round((s.faults / total) * 100), 220, "", "%");
}

function prepare() {
  const refs = parseRefs();
  const fcount = Math.max(1, Math.min(8, parseInt(document.getElementById("frameCount").value, 10) || 3));
  if (!refs.length) { showToast("Enter valid references.", "error"); return null; }
  steps = simulate(algo, refs, fcount);
  idx = 0;
  renderRefTape(refs, idx);
  renderStep(steps[0], fcount);
  renderCompare(refs, fcount);
  return { refs, fcount };
}

async function play() {
  if (!preparedData) {
    preparedData = prepare();
    if (!preparedData) return;
  }
  const prep = preparedData;
  if (idx >= steps.length) idx = 0;
  running = true;
  while (running && idx < steps.length) {
    renderRefTape(prep.refs, idx);
    renderStep(steps[idx], prep.fcount);
    idx += 1;
    await sleep(getDelay(speedVal));
  }
  running = false;
}

function move(to) {
  if (!preparedData) preparedData = prepare();
  const prep = preparedData;
  if (!prep) return;
  idx = Math.max(0, Math.min(steps.length - 1, to));
  renderRefTape(prep.refs, idx);
  renderStep(steps[idx], prep.fcount);
}

function renderCompare(refs, fcount) {
  const algos = ["FIFO", "LRU", "OPT", "CLOCK"];
  const vals = algos.map((a) => ({ a, faults: simulate(a, refs, fcount).at(-1).faults }));
  const max = Math.max(...vals.map((v) => v.faults), 1);
  const colors = ["var(--accent-blue)", "var(--accent-purple)", "var(--accent-green)", "var(--accent-orange)"];
  const svg = `<svg viewBox="0 0 420 210" width="100%" height="210">${vals.map((v, i) => {
    const h = (v.faults / max) * 130; const x = 34 + i * 95; const y = 170 - h;
    return `<rect x="${x}" y="${y}" width="54" height="${h}" rx="8" fill="${colors[i]}"></rect><text x="${x + 27}" y="192" text-anchor="middle" fill="var(--text-secondary)" font-size="12">${v.a}</text><text x="${x + 27}" y="${y - 6}" text-anchor="middle" fill="var(--text-secondary)" font-size="12">${v.faults}</text>`;
  }).join("")}</svg>`;
  document.getElementById("compareChart").innerHTML = svg;
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".algo-tabs .tab-btn").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".algo-tabs .tab-btn").forEach((x) => x.classList.remove("active"));
    b.classList.add("active"); algo = b.dataset.algo;
    preparedData = null;
  }));
  document.getElementById('refInput')?.addEventListener('input', () => { preparedData = null; });
  document.getElementById('frameCount')?.addEventListener('input', () => { preparedData = null; });
  document.getElementById("randomRefBtn").addEventListener("click", () => {
    const arr = Array.from({ length: 14 }, () => Math.floor(Math.random() * 10));
    document.getElementById("refInput").value = arr.join(" ");
    preparedData = null;
  });
  document.getElementById("playBtn").addEventListener("click", play);
  document.getElementById("firstBtn").addEventListener("click", () => move(0));
  document.getElementById("lastBtn").addEventListener("click", () => { if (!preparedData) preparedData = prepare(); if (preparedData) move(steps.length - 1); });
  document.getElementById("nextBtn").addEventListener("click", () => move(idx + 1));
  document.getElementById("prevBtn").addEventListener("click", () => move(idx - 1));
  document.getElementById("speedRange").addEventListener("input", (e) => { speedVal = parseInt(e.target.value, 10); document.getElementById("speedLabel").textContent = `${speedVal}x`; });
  preparedData = prepare();
});
