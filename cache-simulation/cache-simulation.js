let speedVal = 3;
let cacheConfig = { size: 16, blockSize: 4, assoc: 1, policy: "LRU" };
// Cache internal: array of sets, each set has `assoc` ways
let cacheState = []; // [set][way] = { valid, tag, data, age } or null
let accessLog  = [];
let met = { h: 0, m: 0, t: 0, cold: 0, cap: 0, conf: 0 };
let ageCounter = 0;
// seenTags[setIndex] = Set of tags ever loaded into that set (for cold vs capacity/conflict)
let seenTags = [];

function initCache() {
  const assocInput = document.getElementById("assocSel").value;
  const sizeSel    = parseInt(document.getElementById("cacheSizeSel").value, 10) || 16;
  const blockSel   = parseInt(document.getElementById("blockSizeSel").value, 10) || 4;

  // sizeSel is the number of cache LINES (as labelled in the dropdown).
  // ways × numSets = sizeSel (total lines).
  const numLines = sizeSel;
  cacheConfig.assoc     = assocInput === "Direct"  ? 1
                        : assocInput === "2-Way"   ? 2
                        : assocInput === "4-Way"   ? 4
                        : assocInput === "Full"    ? numLines   // 1 set, all lines as ways
                        : 1;
  cacheConfig.size      = sizeSel;
  cacheConfig.blockSize = blockSel;

  // numSets = total lines / ways  (always integer; guard with max 1)
  const numSets = Math.max(1, numLines / cacheConfig.assoc);
  cacheState = Array.from({ length: numSets }, () => Array(cacheConfig.assoc).fill(null));
  seenTags   = Array.from({ length: numSets }, () => new Set());
  accessLog  = [];
  met = { h: 0, m: 0, t: 0, cold: 0, cap: 0, conf: 0 };
  ageCounter = 0;
  renderCacheGrid();
  renderLog();
}

function accessAddr(addr) {
  const numSets    = cacheState.length;
  const offsetBits = Math.log2(cacheConfig.blockSize);
  const indexBits  = Math.log2(numSets);
  const blockOffset = addr % cacheConfig.blockSize;
  const setIndex    = Math.floor(addr / cacheConfig.blockSize) % numSets;
  const tag         = Math.floor(addr / (cacheConfig.blockSize * numSets));

  const set = cacheState[setIndex];
  ageCounter++;
  met.t++;

  const policyItem = document.querySelector("#policyTabs .tab-btn.active");
  const policy = policyItem ? policyItem.dataset.policy : "LRU";

  // Check for hit
  const hitWay = set.findIndex(w => w && w.valid && w.tag === tag);
  if (hitWay !== -1) {
    met.h++;
    if (policy === "LRU") {
      set[hitWay].age = ageCounter; // LRU update on hit
    } else if (policy === "LFU") {
      set[hitWay].freq = (set[hitWay].freq || 0) + 1; // LFU update on hit
    }
    // FIFO does NOT update age on hit

    accessLog.unshift({ addr, tag, setIndex, blockOffset, result: "HIT", way: hitWay, latency: 1 });
    highlightSet(setIndex, hitWay, "hit");
    updateStats();
    renderLog();
    return;
  }

  // Miss — find empty way
  met.m++;
  let targetWay = set.findIndex(w => !w);
  if (targetWay !== -1) {
    // Empty slot — always a cold (compulsory) miss
    met.cold++;
    seenTags[setIndex].add(tag);
    set[targetWay] = { valid: true, tag, data: `0x${addr.toString(16).toUpperCase()}`, age: ageCounter, freq: 1 };
    accessLog.unshift({ addr, tag, setIndex, blockOffset, result: "COLD MISS", way: targetWay, latency: 10 });
    highlightSet(setIndex, targetWay, "miss");
    updateStats();
    renderLog();
    return;
  }

  // Evict based on policy
  if (policy === "LRU") {
    targetWay = set.indexOf(set.reduce((a, b) => (a.age < b.age ? a : b)));
  } else if (policy === "FIFO") {
    targetWay = set.indexOf(set.reduce((a, b) => (a.age < b.age ? a : b)));
  } else if (policy === "LFU") {
    set.forEach(w => w && (w.freq = (w.freq || 0)));
    targetWay = set.indexOf(set.reduce((a, b) => ((a.freq || 0) < (b.freq || 0) ? a : b)));
  } else {
    targetWay = Math.floor(Math.random() * cacheConfig.assoc);
  }

  // Classify miss type:
  //   Cold    — first access to this tag in this set (handled above via empty slot)
  //   Conflict — set is full AND there are free lines in OTHER sets (set-mapping is the constraint)
  //              Only possible for Direct / 2-Way / 4-Way, never for Fully Associative
  //   Capacity — cache is entirely full (no free lines anywhere) OR fully associative
  const assocInput = document.getElementById("assocSel").value;
  const isCold = !seenTags[setIndex].has(tag);   // tag evicted before and re-accessed
  if (assocInput === "Full") {
    // Fully associative: by definition zero conflict misses
    met.cap++;
  } else {
    // Count free slots across the entire cache
    const totalFree = cacheState.reduce((sum, s) => sum + s.filter(w => w === null).length, 0);
    if (totalFree > 0) {
      // Cache has room but THIS set is full → set-mapping constraint → conflict
      met.conf++;
    } else {
      // No free slots anywhere → capacity miss
      met.cap++;
    }
  }
  seenTags[setIndex].add(tag);

  if (set[targetWay] && (set[targetWay].freq !== undefined)) set[targetWay].freq = 0;
  set[targetWay] = { valid: true, tag, data: `0x${addr.toString(16).toUpperCase()}`, age: ageCounter, freq: 1 };
  accessLog.unshift({ addr, tag, setIndex, blockOffset, result: "MISS+EVICT", way: targetWay, latency: 100 });
  highlightSet(setIndex, targetWay, "fault");
  updateStats();
  renderLog();
}

function highlightSet(setIdx, wayIdx, type) {
  renderCacheGrid();
  const cellId = `cache-cell-${setIdx}-${wayIdx}`;
  const cell = document.getElementById(cellId);
  if (cell) {
    cell.classList.add(type === "hit" ? "page-hit" : "page-fault");
    setTimeout(() => cell.classList.remove("page-hit", "page-fault"), 600);
  }
}

function renderCacheGrid() {
  const grid = document.getElementById("cacheGrid");
  if (!grid) return;
  const numSets = cacheState.length;
  grid.innerHTML = `
    <div style="display:grid;grid-template-columns:60px repeat(${cacheConfig.assoc},1fr);gap:4px;min-width:300px">
      <div style="font-size:.65rem;color:var(--text-muted);text-align:center;padding:4px">Set</div>
      ${Array.from({length: cacheConfig.assoc}, (_, w) => `<div style="font-size:.65rem;color:var(--text-muted);text-align:center;padding:4px">Way ${w}</div>`).join("")}
      ${cacheState.map((set, s) => `
        <div style="font-size:.72rem;font-family:var(--font-mono);color:var(--text-muted);display:flex;align-items:center;justify-content:center;background:var(--bg-sunken);border-radius:4px;padding:4px">${s}</div>
        ${set.map((way, w) => `
          <div id="cache-cell-${s}-${w}" class="frame-box" style="min-width:auto;padding:.4rem .3rem;font-size:.72rem">
            <div style="font-size:.6rem;color:var(--text-muted)">${way ? (way.valid ? 'V' : 'I') : '—'}</div>
            <div class="frame-val" style="font-size:.85rem">${way ? `0x${way.tag.toString(16).toUpperCase()}` : '—'}</div>
            <div style="font-size:.6rem;color:var(--text-muted)">${way ? way.data : ''}</div>
          </div>`).join("")}
      `).join("")}
    </div>
    <div style="margin-top:.5rem;font-size:.72rem;color:var(--text-muted);font-family:var(--font-mono)">
      ${numSets} sets × ${cacheConfig.assoc} ways | Block = ${cacheConfig.blockSize}B | Total = ${numSets * cacheConfig.assoc} lines
    </div>`;
}

function renderLog() {
  const el = document.getElementById("accessLog");
  if (!el) return;
  el.innerHTML = accessLog.slice(0, 20).map(e => `
    <div style="display:flex;align-items:center;gap:.5rem;padding:.3rem .5rem;border-bottom:1px solid var(--border-subtle)">
      <span class="badge ${e.result === 'HIT' ? 'badge-green' : e.result === 'COLD MISS' ? 'badge-blue' : 'badge-red'}" style="min-width:80px;text-align:center">${e.result}</span>
      <span style="font-family:var(--font-mono);font-size:.78rem">0x${e.addr.toString(16).toUpperCase().padStart(4,'0')}</span>
      <span style="font-size:.72rem;color:var(--text-muted)">Set=${e.setIndex} Tag=0x${e.tag.toString(16)} Way=${e.way}</span>
      <span style="font-size:.72rem;color:var(--text-muted);margin-left:auto">${e.latency} cycle${e.latency > 1 ? 's' : ''}</span>
    </div>`).join("");
}

function updateStats() {
  animateCounter(document.getElementById("hr"), Math.round((met.h / Math.max(1, met.t)) * 100), 200, "", "%");
  animateCounter(document.getElementById("mr"), Math.round((met.m / Math.max(1, met.t)) * 100), 200, "", "%");
  animateCounter(document.getElementById("ta"), met.t, 200);
  animateCounter(document.getElementById("cm"), met.cold, 200);
  animateCounter(document.getElementById("capm"), met.cap, 200);
  animateCounter(document.getElementById("confm"), met.conf, 200);
  // AMAT = hit_time + miss_rate * miss_penalty
  const missRate = met.m / Math.max(1, met.t);
  const amat = 1 + missRate * 100;
  const amEl = document.getElementById("amat");
  if (amEl) animateCounter(amEl, amat, 300, "", " cycles", 1);
}

const PATTERNS = {
  sequential: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
  stride2:    [0,2,4,6,8,10,12,14,16,18,0,2,4,6,8,10],
  random:     Array.from({length:16}, () => Math.floor(Math.random()*64)),
  loop:       [0,1,2,3,0,1,2,3,0,1,2,3,4,5,6,7],
  thrashing:  [0,16,32,48,0,16,32,48,0,16,32,48,1,17,33]
};

async function runPattern(name) {
  const addrs = PATTERNS[name] || PATTERNS.sequential;
  for (const addr of addrs) {
    accessAddr(addr);
    await sleep(getDelay(speedVal));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initCache();
  document.getElementById("assocSel").addEventListener("change", initCache);
  document.getElementById("cacheSizeSel").addEventListener("change", initCache);
  document.getElementById("blockSizeSel").addEventListener("change", initCache);
  document.getElementById("accessBtn").addEventListener("click", () => {
    const a = parseInt(document.getElementById("addrInput").value, 16) || 0;
    accessAddr(a);
  });
  document.querySelectorAll("#policyTabs .tab-btn").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll("#policyTabs .tab-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
    });
  });
  document.querySelectorAll("[data-pattern]").forEach(b => {
    b.addEventListener("click", () => runPattern(b.dataset.pattern));
  });
  document.getElementById("resetBtn").addEventListener("click", initCache);
  document.getElementById("speedRange")?.addEventListener("input", e => {
    speedVal = parseInt(e.target.value, 10);
    document.getElementById("speedLabel").textContent = `${speedVal}x`;
  });
});
