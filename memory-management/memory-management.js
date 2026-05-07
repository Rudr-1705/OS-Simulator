// Paging State
let pageTable = []; 
let physFrames = [];

// Segmentation State
let segments = []; // { name, base, limit }

// ─── PAGING LOGIC ─────────────────────────────────────────────────────────────
function renderPageTable() {
  const tbody = document.getElementById("ptBody");
  if (!tbody) return;
  tbody.innerHTML = pageTable.map(e => `
    <tr>
      <td class="mono">${e.vpn}</td>
      <td class="mono">${e.pfn}</td>
      <td><span class="badge ${e.valid ? 'badge-green' : 'badge-red'}">${e.valid ? 'Valid' : 'Invalid'}</span></td>
    </tr>`).join("");
}

function renderFrameGrid() {
  const nFrames = parseInt(document.getElementById("numFrames").value, 10) || 8;
  physFrames = Array(nFrames).fill(null);
  pageTable.filter(e => e.valid).forEach(e => { physFrames[e.pfn % nFrames] = `VPN${e.vpn}`; });
  const grid = document.getElementById("frameGrid");
  if (!grid) return;
  grid.style.gridTemplateColumns = `repeat(${Math.min(nFrames, 8)}, 1fr)`;
  grid.innerHTML = physFrames.map((v, i) => `
    <div class="frame-cell ${v ? 'occupied' : 'free'}" id="fc${i}">
      <div style="font-size:.65rem;color:var(--text-muted)">F${i}</div>
      <div style="font-family:var(--font-mono);font-size:.8rem">${v || "—"}</div>
    </div>`).join("");
}

function setupDefaultPageTable() {
  const nFrames = parseInt(document.getElementById("numFrames").value, 10) || 8;
  pageTable = Array.from({ length: 6 }, (_, i) => ({ vpn: i, pfn: (i * 3) % nFrames, valid: i < 4 }));
  renderPageTable();
  renderFrameGrid();
}

function translateAddress() {
  const pageSize = parseInt(document.getElementById("pageSize").value, 10);
  let logAddrHex = document.getElementById("logAddr").value.trim();
  if (logAddrHex.startsWith("0x") || logAddrHex.startsWith("0X")) {
    logAddrHex = logAddrHex.substring(2);
  }
  const logAddr = parseInt(logAddrHex, 16);
  if (isNaN(logAddr) || isNaN(pageSize) || pageSize === 0) {
    showToast("Invalid address or page size", "error");
    return;
  }
  const vpn = Math.floor(logAddr / pageSize);
  const offset = logAddr % pageSize;
  const entry = pageTable.find(e => e.vpn === vpn && e.valid);
  if (!entry) {
    showToast(`Page Fault! VPN ${vpn} not in page table`, "error");
    document.getElementById("transResult").innerHTML = `
      <div class="badge badge-red">PAGE FAULT</div>
      <div style="margin-top:.5rem;font-family:var(--font-mono);font-size:.85rem">
        Logical: 0x${logAddr.toString(16).toUpperCase()} → VPN=${vpn}, Offset=${offset}<br>
        VPN ${vpn} not mapped.
      </div>`;
    return;
  }
  const physAddr = entry.pfn * pageSize + offset;
  document.getElementById("transResult").innerHTML = `
    <div class="badge badge-green">TRANSLATED</div>
    <div style="margin-top:.75rem;font-family:var(--font-mono);font-size:.88rem;line-height:1.9">
      Logical Address : 0x${logAddr.toString(16).toUpperCase().padStart(4, "0")} <span style="color:var(--text-muted)">(${logAddr})</span><br>
      <span style="color:var(--accent-blue)">VPN</span> = ${vpn} | <span style="color:var(--accent-cyan)">Offset</span> = ${offset}<br>
      Page Table: VPN ${vpn} → PFN <span style="color:var(--accent-green)">${entry.pfn}</span><br>
      Physical Address: <strong style="color:var(--accent-green)">0x${physAddr.toString(16).toUpperCase().padStart(4, "0")}</strong>
    </div>`;
  document.querySelectorAll(".frame-cell").forEach((el, i) => el.classList.toggle("active-frame", i === entry.pfn));
}

// ─── SEGMENTATION LOGIC ────────────────────────────────────────────────────────
function renderSegmentTable() {
  const tbody = document.getElementById("segBody");
  if (!tbody) return;
  tbody.innerHTML = segments.map((s, i) => `
    <tr>
      <td class="mono">${i}</td>
      <td>${s.name}</td>
      <td class="mono">${s.base}</td>
      <td class="mono">${s.limit}</td>
      <td><button class="btn btn-danger btn-sm" onclick="removeSegment(${i})">Remove</button></td>
    </tr>`).join("");
  renderSegmentBar();
}

function renderSegmentBar() {
  const bar = document.getElementById("segBar");
  if (!bar) return;
  const totalMem = 8192;
  bar.innerHTML = segments.map((s, idx) => {
    const hue = (idx * 67) % 360;
    const heightPct = (s.limit / totalMem) * 300;
    return `
      <div style="height:${Math.max(24, heightPct)}px;
        background:hsla(${hue},65%,55%,0.25);
        border:1px solid hsla(${hue},65%,55%,0.7);
        display:flex;align-items:center;justify-content:center;
        font-size:.75rem;font-family:var(--font-mono);
        color:hsla(${hue},65%,40%,1);position:relative"
        title="Segment ${s.name}: base=${s.base}, limit=${s.limit}">
        <span>${s.name}: ${s.base}–${s.base + s.limit - 1}</span>
      </div>`;
  }).join("") || `<div style="padding:1rem;color:var(--text-muted);font-size:.85rem">Add segments to visualize</div>`;
}

function addSegment() {
  const name  = document.getElementById("segName").value.trim() || `S${segments.length}`;
  const base  = parseInt(document.getElementById("segBase").value, 10);
  const limit = parseInt(document.getElementById("segLimit").value, 10);
  if (isNaN(base) || isNaN(limit) || limit <= 0) { showToast("Invalid segment values", "error"); return; }
  for (const s of segments) {
    if (base < s.base + s.limit && base + limit > s.base) {
      showToast(`Segment overlaps with ${s.name}`, "error"); return;
    }
  }
  segments.push({ name, base, limit });
  renderSegmentTable();
  showToast(`Segment ${name} added`, "success");
}

window.removeSegment = function(i) { segments.splice(i, 1); renderSegmentTable(); };

function translateSegment() {
  const segNum = parseInt(document.getElementById("segNum").value, 10);
  const offset = parseInt(document.getElementById("segOff").value, 10);
  const seg    = segments[segNum];
  const result = document.getElementById("segResult");
  if (!result) return;

  if (!seg) {
    result.innerHTML = `<div class="badge badge-red">SEGMENT FAULT</div>
      <div style="margin-top:.5rem;font-family:var(--font-mono);font-size:.85rem">Segment ${segNum} does not exist.</div>`;
    return;
  }
  if (offset >= seg.limit || offset < 0) {
    result.innerHTML = `<div class="badge badge-red">SEGMENT FAULT</div>
      <div style="margin-top:.5rem;font-family:var(--font-mono);font-size:.85rem">
        Offset ${offset} exceeds limit ${seg.limit} for segment ${segNum} (${seg.name})
      </div>`;
    showToast("Segment bounds violation!", "error");
    return;
  }

  const physAddr = seg.base + offset;
  result.innerHTML = `<div class="badge badge-green">TRANSLATED</div>
    <div style="margin-top:.75rem;font-family:var(--font-mono);font-size:.88rem;line-height:2">
      Segment # : <span style="color:var(--accent-blue)">${segNum}</span> (${seg.name})<br>
      Offset    : <span style="color:var(--accent-cyan)">${offset}</span> (limit = ${seg.limit})<br>
      Base      : <span style="color:var(--text-secondary)">${seg.base}</span><br>
      Physical  : <strong style="color:var(--accent-green)">${physAddr}</strong>
      &nbsp;=&nbsp; Base(${seg.base}) + Offset(${offset})
    </div>`;
}

window.addSegment = addSegment;
window.translateSegment = translateSegment;

// ─── INITIALIZATION ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Tabs
  document.querySelectorAll("#mmTabs .tab-btn").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll("#mmTabs .tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const id = btn.dataset.mm;
    document.getElementById("mm-paging").style.display = id === "paging" ? "block" : "none";
    document.getElementById("mm-segment").style.display = id === "segment" ? "block" : "none";
  }));

  // Paging Events
  document.getElementById("translateBtn")?.addEventListener("click", translateAddress);
  document.getElementById("mmInitBtn")?.addEventListener("click", setupDefaultPageTable);

  // Init
  setupDefaultPageTable();
  renderSegmentTable();
});
