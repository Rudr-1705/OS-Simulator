let algo = "FCFS", speedVal = 3;
const colors = { FCFS: "#4f6ef7", SSTF: "#7c5ff5", SCAN: "#10b981", CSCAN: "#06b6d4", LOOK: "#f59e0b", CLOOK: "#ec4899" };

function parseInput() {
  const reqs = document.getElementById("reqInput").value.split(",").map((v) => parseInt(v.trim(), 10)).filter((n) => !Number.isNaN(n));
  const head = parseInt(document.getElementById("headInput").value, 10);
  const size = parseInt(document.getElementById("sizeInput").value, 10);
  const dir = document.getElementById("dirSel").value;
  if (!reqs.length || Number.isNaN(head) || Number.isNaN(size)) return null;
  return { reqs, head, size, dir };
}

function buildSequence({ reqs, head, size, dir }) {
  // Separate requests strictly less than head vs >= head
  const sorted = [...reqs].sort((a, b) => a - b);
  const left  = sorted.filter(x => x < head);   // ascending order
  const right = sorted.filter(x => x >= head);  // ascending order

  const lastCyl = size - 1;

  if (algo === "FCFS") {
    return [head, ...reqs]; // serve in arrival order as-is
  }

  if (algo === "SSTF") {
    const pending = [...reqs];
    const seq = [head];
    let cur = head;
    while (pending.length) {
      pending.sort((a, b) => Math.abs(a - cur) - Math.abs(b - cur));
      cur = pending.shift();
      seq.push(cur);
    }
    return seq;
  }

  if (algo === "SCAN") {
    // Move in one direction to end (only if needed), then reverse and serve other side
    if (dir === "up") {
      if (!right.length) return [head, ...[...left].reverse()];
      return [head, ...right, lastCyl, ...[...left].reverse()];
    } else {
      if (!left.length) return [head, ...right];
      return [head, ...[...left].reverse(), 0, ...right];
    }
  }

  if (algo === "CSCAN") {
    // Move in one direction to end, jump to other end, continue same direction
    if (dir === "up") {
      // Serve right (ascending) → size-1 → jump to 0 → serve left (ascending)
      return [head, ...right, lastCyl, 0, ...left];
    } else {
      // Serve left (descending) → 0 → jump to size-1 → serve right (descending)
      return [head, ...[...left].reverse(), 0, lastCyl, ...[...right].reverse()];
    }
  }

  if (algo === "LOOK") {
    // Like SCAN but only goes to last request in that direction, not physical end
    if (dir === "up") {
      return [head, ...right, ...[...left].reverse()];
    } else {
      return [head, ...[...left].reverse(), ...right];
    }
  }

  if (algo === "CLOOK") {
    // Like C-SCAN but jumps to lowest/highest request, not physical end
    if (dir === "up") {
      return [head, ...right, ...left]; // jump from highest right to lowest left, serve ascending
    } else {
      return [head, ...[...left].reverse(), ...[...right].reverse()];
    }
  }

  return [head, ...reqs];
}

function calcStats(seq) {
  if (seq.length < 2) return { total: 0, avg: "0.00", max: 0, min: 0 };
  const jumps = [];
  for (let i = 1; i < seq.length; i++) jumps.push(Math.abs(seq[i] - seq[i - 1]));
  const total = jumps.reduce((a,b)=>a+b,0);
  return { total, avg:(total/jumps.length).toFixed(2), max:Math.max(...jumps), min:Math.min(...jumps) };
}

function draw(seq, size, highlightIdx = seq.length - 1) {
  const cv = document.getElementById("seekCanvas");
  const ctx = cv.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = cv.getBoundingClientRect();
  cv.width = rect.width * dpr;
  cv.height = rect.height * dpr;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;
  const padL = 48, padR = 20, padT = 16, padB = 32;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(120,130,160,0.12)";
  ctx.lineWidth = 1;
  for (let g = 0; g <= 8; g++) { const y = padT + (g / 8) * plotH; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke(); }
  ctx.fillStyle = "rgba(130,140,170,0.7)";
  ctx.font = "11px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  for (let g = 0; g <= 4; g++) { const cyl = Math.round((g / 4) * size); const y = padT + (g / 4) * plotH; ctx.fillText(cyl, padL - 6, y + 4); }
  if (seq.length < 2) return;
  function cylY(c) { return padT + (c / size) * plotH; }
  function stepX(i) { return padL + (i / (seq.length - 1)) * plotW; }
  ctx.strokeStyle = colors[algo] || "#4f6ef7";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(stepX(0), cylY(seq[0]));
  for (let i = 1; i < seq.length; i++) ctx.lineTo(stepX(i), cylY(seq[i]));
  ctx.stroke();
  for (let i = 0; i < seq.length; i++) {
    const x = stepX(i), y = cylY(seq[i]);
    ctx.fillStyle = i === 0 ? "#ef4444" : (colors[algo] || "#4f6ef7");
    ctx.beginPath(); ctx.arc(x, y, i === 0 ? 6 : 3.5, 0, Math.PI * 2); ctx.fill();
    if (i === 0 || i === seq.length - 1 || seq.length <= 12) { ctx.fillStyle = "rgba(180,190,210,0.9)"; ctx.font = "10px 'JetBrains Mono', monospace"; ctx.textAlign = "center"; ctx.fillText(seq[i], x, y - 8); }
  }
}

async function animateSeq(seq, size) {
  for (let i = 1; i <= seq.length; i++) { draw(seq.slice(0, i), size, 1); await sleep(getDelay(speedVal)); }
}

function renderAll() {
  const p = parseInput(); if (!p) return showToast("Invalid disk inputs.", "error");
  const seq = buildSequence(p);
  draw(seq, p.size, 1);
  document.getElementById("sequenceTrail").innerHTML = seq.map((v) => `<span class="badge badge-blue">${v}</span>`).join(" ");
  const s = calcStats(seq);
  animateCounter(document.getElementById("totalSeek"), s.total, 400);
  animateCounter(document.getElementById("avgSeek"), Number(s.avg), 400);
  animateCounter(document.getElementById("maxJump"), s.max, 400);
  animateCounter(document.getElementById("minJump"), s.min, 400);
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".algo-tabs .tab-btn").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".algo-tabs .tab-btn").forEach((x) => x.classList.remove("active"));
    b.classList.add("active"); algo = b.dataset.a; renderAll();
  }));
  document.getElementById("runBtn").addEventListener("click", renderAll);
  document.getElementById("animBtn").addEventListener("click", async () => {
    const p = parseInput(); if (!p) return showToast("Invalid disk inputs.", "error");
    const seq = buildSequence(p); await animateSeq(seq, p.size); renderAll();
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    const cv = document.getElementById("seekCanvas"), ctx = cv.getContext("2d"); ctx.clearRect(0, 0, cv.width, cv.height);
    document.getElementById("sequenceTrail").innerHTML = "";
  });
  document.getElementById("speedRange").addEventListener("input", (e) => { speedVal = parseInt(e.target.value, 10); document.getElementById("speedLabel").textContent = `${speedVal}x`; });
  renderAll();
});

window.addEventListener('resize', () => {
  const p = parseInput();
  if (p) {
    const seq = buildSequence(p);
    draw(seq, p.size);
  }
});
