let stats = { hit: 0, miss: 0, total: 0 };
const tlb = [];
let tlbCounter = 0;

// Dynamic simulation state
let pageTable = new Map();
let allocatedFrames = []; // List of currently used PFNs
let maxFrames = 0;
let pageQueue = []; // FIFO queue for page replacement
let currentVASBits = 0;
let currentPASBits = 0;
let currentPageSize = 0;

function resetSim() {
  pageTable.clear();
  allocatedFrames = [];
  pageQueue = [];
  tlb.length = 0;
  stats = { hit: 0, miss: 0, total: 0 };
  tlbCounter = 0;
  currentVASBits = 0; // Force re-init on next translate
  
  const elAddrBreak = document.getElementById("addrBreak");
  if(elAddrBreak) elAddrBreak.innerHTML = '';
  
  const elPageTableContainer = document.getElementById("pageTableContainer");
  if(elPageTableContainer) elPageTableContainer.innerHTML = '';
  
  const elTlbTable = document.getElementById("tlbTable");
  if(elTlbTable) elTlbTable.innerHTML = '';
  
  const elMemoryUsage = document.getElementById("memoryUsage");
  if(elMemoryUsage) elMemoryUsage.innerHTML = '';
  
  const elH = document.getElementById("h");
  if(elH) elH.innerText = "0";
  
  const elM = document.getElementById("m");
  if(elM) elM.innerText = "0";
  
  const elR = document.getElementById("r");
  if(elR) elR.innerText = "0%";
}

function initSim() {
  const vasBits = parseInt(document.getElementById("vas").value, 10);
  const pasBits = parseInt(document.getElementById("pas").value, 10);
  const pageSize = parseInt(document.getElementById("ps").value, 10);

  if (vasBits === currentVASBits && pasBits === currentPASBits && pageSize === currentPageSize) {
    return; // Already initialized for these params
  }

  currentVASBits = vasBits;
  currentPASBits = pasBits;
  currentPageSize = pageSize;

  const offsetBits = Math.round(Math.log2(pageSize));
  const pfnBits = pasBits - offsetBits;
  maxFrames = 1 << pfnBits;

  pageTable.clear();
  allocatedFrames = [];
  pageQueue = [];
  tlb.length = 0;
  stats = { hit: 0, miss: 0, total: 0 };
  tlbCounter = 0;
}

function allocateFrame(vpn) {
  if (allocatedFrames.length < maxFrames) {
    let pfn = allocatedFrames.length;
    allocatedFrames.push(pfn);
    pageTable.set(vpn, { valid: true, pfn: pfn });
    pageQueue.push(vpn);
    return pfn;
  } else {
    // Evict oldest page (FIFO)
    let evictedVpn = pageQueue.shift();
    let pfn = pageTable.get(evictedVpn).pfn;
    
    // Invalidate old page
    pageTable.set(evictedVpn, { valid: false, pfn: null });
    
    // Remove from TLB if present
    const tlbIdx = tlb.findIndex(x => x.vpn === evictedVpn);
    if (tlbIdx !== -1) tlb.splice(tlbIdx, 1);
    
    // Allocate to new page
    pageTable.set(vpn, { valid: true, pfn: pfn });
    pageQueue.push(vpn);
    return pfn;
  }
}

function tr() {
  initSim(); // Ensure simulator is initialized for current dropdown values

  const vasBits = currentVASBits;
  const pasBits = currentPASBits;
  const pageSize = currentPageSize;
  const addrHex = document.getElementById("addr").value.trim().replace(/^0x/i, "");
  const baseHex = document.getElementById("base")?.value.trim().replace(/^0x/i, "") || "0";
  const limitHex = document.getElementById("limit")?.value.trim().replace(/^0x/i, "") || "FFFFFFFF";

  let addr, baseReg, limitReg;
  try { addr = BigInt("0x" + (addrHex || "0")); } catch (e) { addr = 0n; }
  try { baseReg = BigInt("0x" + (baseHex || "0")); } catch (e) { baseReg = 0n; }
  try { limitReg = BigInt("0x" + (limitHex || "FFFFFFFF")); } catch (e) { limitReg = 0n; }

  const offsetBits = Math.round(Math.log2(pageSize));
  const vpnBits = vasBits - offsetBits;
  const pfnBits = pasBits - offsetBits;
  const offsetMask = BigInt(pageSize - 1);

  if (addr >= (1n << BigInt(vasBits))) {
    showToast(`Address exceeds ${vasBits}-bit virtual space`, "error");
    return;
  }

  if (addr < baseReg || addr >= baseReg + limitReg) {
    document.getElementById("addrBreak").innerHTML = `<div class="badge badge-red" style="padding:10px;font-size:1rem;width:100%;text-align:center;">Segmentation Fault: Invalid Address 0x${addr.toString(16).toUpperCase()} (Out of Bounds)</div>`;
    return;
  }

  const vpn = Number(addr >> BigInt(offsetBits));
  const offset = Number(addr & offsetMask);

  const tlbHit = tlb.find(x => x.vpn === vpn);
  stats.total++;
  tlbCounter++;
  
  let pfn;
  let pageFault = false;
  let evictedPageMsg = "";

  if (tlbHit) {
    stats.hit++;
    pfn = tlbHit.pfn;
    tlbHit.age = tlbCounter;
  } else {
    stats.miss++;
    let pte = pageTable.get(vpn) || { valid: false, pfn: null };
    
    if (pte.valid) {
      pfn = pte.pfn;
    } else {
      // Page Fault! We need to allocate a frame.
      pageFault = true;
      const framesBefore = allocatedFrames.length;
      pfn = allocateFrame(vpn);
      if (framesBefore === maxFrames) {
        evictedPageMsg = `<span class="badge badge-yellow" style="margin-left: 8px;">Evicted older page</span>`;
      }
    }
    
    // Insert into TLB
    if (tlb.length >= 8) tlb.sort((a, b) => a.age - b.age).shift();
    tlb.push({ vpn, pfn, valid: 1, dirty: 0, accessed: 1, age: tlbCounter });
  }

  // Update memory usage UI
  const usagePct = ((allocatedFrames.length / maxFrames) * 100).toFixed(1);
  document.getElementById("memoryUsage").innerHTML = `Physical Memory Usage: <strong>${allocatedFrames.length} / ${maxFrames} frames</strong> allocated (${usagePct}%)`;

  const physAddr = BigInt(pfn) * BigInt(pageSize) + BigInt(offset);

  const addrBin = addr.toString(2).padStart(vasBits, "0");
  const vpnBin = addrBin.slice(0, vpnBits);
  const offBin = addrBin.slice(vpnBits);

  let physAddrHTML = "";
  if (pageFault) {
    physAddrHTML = `<span style="color:var(--accent-yellow);font-weight:600">Page Fault: Loaded from Disk &rarr; </span><span style="color:var(--accent-green);font-weight:600">Physical Address = 0x${physAddr.toString(16).toUpperCase().padStart(8, "0")}</span>`;
  } else {
    physAddrHTML = `<span style="color:var(--accent-green);font-weight:600">Physical Address = 0x${physAddr.toString(16).toUpperCase().padStart(8, "0")}</span>`;
  }

  document.getElementById("addrBreak").innerHTML = `
    <div style="font-family:var(--font-mono);font-size:.85rem;line-height:2.2">
      <div style="margin-bottom:.75rem">
        <span style="background:var(--accent-blue-dim);color:var(--accent-blue);padding:3px 8px;border-radius:4px;font-size:.8rem">${vpnBin}</span>
        <span style="background:var(--accent-cyan-dim);color:var(--accent-cyan);padding:3px 8px;border-radius:4px;margin-left:4px;font-size:.8rem">${offBin}</span>
      </div>
      <div style="color:var(--text-muted);font-size:.75rem">
        <span style="color:var(--accent-blue)">VPN</span> = ${vpn} &nbsp;(${vpnBits} bits)
        &nbsp;|&nbsp;
        <span style="color:var(--accent-cyan)">Offset</span> = ${offset} &nbsp;(${offsetBits} bits)
      </div>
      <div style="margin-top:.5rem; display:flex; align-items:center;">
        ${tlbHit
          ? `<span class="badge badge-green">TLB HIT</span> &nbsp;&rarr;&nbsp; PFN = ${pfn}`
          : pageFault 
            ? `<span class="badge badge-red">TLB MISS</span> &nbsp;&rarr;&nbsp; Page table walk &rarr; <span class="badge badge-red">PAGE FAULT</span> &nbsp;&rarr;&nbsp; Mapped to PFN = ${pfn} ${evictedPageMsg}` 
            : `<span class="badge badge-red">TLB MISS</span> &nbsp;&rarr;&nbsp; Page table walk &rarr; PFN = ${pfn}`}
      </div>
      <div style="margin-top:.4rem">
        ${physAddrHTML}
      </div>
    </div>`;

  // Render Page Table
  let pageTableHTML = '<h3 style="margin:0 0 8px 0;font-size:.95rem">Page Table (Memory)</h3><div class="table-wrap" style="max-height:200px;overflow-y:auto"><table style="font-size:.8rem"><thead><tr><th>VPN</th><th>Valid</th><th>PFN</th></tr></thead><tbody>';
  
  const startVPN = Math.max(0, vpn - 5);
  // Cap at max possible VPN to avoid showing impossible entries
  const maxVPN = (1 << vpnBits) - 1;
  const endVPN = Math.min(maxVPN, vpn + 5);
  
  for (let i = startVPN; i <= endVPN; i++) {
    const isAccessed = i === vpn ? 'background:var(--accent-blue-dim);font-weight:500' : '';
    const entry = pageTable.get(i) || { valid: false, pfn: null };
    pageTableHTML += `<tr style="${isAccessed}"><td class="mono">${i}</td><td>${entry.valid ? '✓' : '✗'}</td><td class="mono">${entry.valid ? entry.pfn : '-'}</td></tr>`;
  }
  pageTableHTML += '</tbody></table></div>';
  
  // Render TLB
  let tlbHTML = '<h3 style="margin:0 0 8px 0;font-size:.95rem">TLB (Cache)</h3><div class="table-wrap" style="max-height:200px;overflow-y:auto"><table style="font-size:.8rem"><thead><tr><th>VPN</th><th>PFN</th><th>Valid</th></tr></thead><tbody>';
  
  for (let i = tlb.length - 1; i >= 0; i--) { // Show newest on top
    const isAccessed = tlb[i].vpn === vpn ? 'background:var(--accent-green-dim);font-weight:500' : '';
    tlbHTML += `<tr style="${isAccessed}"><td class="mono">${tlb[i].vpn}</td><td class="mono">${tlb[i].pfn}</td><td>✓</td></tr>`;
  }
  if (tlb.length === 0) {
    tlbHTML += '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:8px">Empty</td></tr>';
  }
  tlbHTML += '</tbody></table></div>';
  
  document.getElementById("pageTableContainer").innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">${pageTableHTML}${tlbHTML}</div>`;

  animateCounter(document.getElementById("h"), stats.hit,  300);
  animateCounter(document.getElementById("m"), stats.miss, 300);
  animateCounter(document.getElementById("r"), Math.round((stats.hit / Math.max(1, stats.total)) * 100), 300, "", "%");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("go")?.addEventListener("click", tr);
  document.getElementById("addr")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tr();
  });
  document.getElementById("resetBtn")?.addEventListener("click", resetSim);
  // Re-run simulation when configuration changes to reset the tables
  document.getElementById("ps")?.addEventListener("change", resetSim);
  document.getElementById("vas")?.addEventListener("change", resetSim);
  document.getElementById("pas")?.addEventListener("change", resetSim);
});
