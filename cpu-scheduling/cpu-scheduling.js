let currentAlgo = "FCFS";
let speedVal = 3;
let pidCounter = 1;
let isRunning = false;
let isPaused = false;
let currentStep = 0;
let steps = [];
let computedResults = [];

function mkProcess(overrides = {}) {
  const p = {
    pid: `P${pidCounter++}`,
    arrival: 0,
    burst: 5,
    priority: 1,
    ...overrides
  };
  return p;
}

function getProcessesFromTable() {
  const rows = [...document.querySelectorAll("#processRows tr[data-row='process']")];
  const list = rows.map((row) => {
    const pid = row.querySelector(".p-pid").value.trim();
    const arrival = parseInt(row.querySelector(".p-at").value, 10);
    const burst = parseInt(row.querySelector(".p-bt").value, 10);
    const priority = parseInt(row.querySelector(".p-pr").value, 10);
    return { pid, arrival, burst, priority };
  });
  for (const p of list) {
    if (!p.pid) return null;
    if (!Number.isInteger(p.arrival) || p.arrival < 0) return null;
    if (!Number.isInteger(p.burst) || p.burst <= 0) return null;
    if (!Number.isInteger(p.priority) || p.priority < 0) return null;
  }
  return list;
}

function addProcessRow(process) {
  const tbody = document.getElementById("processRows");
  const tr = document.createElement("tr");
  tr.dataset.row = "process";
  tr.innerHTML = `
    <td class="mono"></td>
    <td><input class="form-input process-input form-mono p-pid" value="${process.pid}"></td>
    <td><input class="form-input process-input form-mono p-at" type="number" min="0" value="${process.arrival}"></td>
    <td><input class="form-input process-input form-mono p-bt" type="number" min="1" value="${process.burst}"></td>
    <td><input class="form-input process-input form-mono p-pr" type="number" min="0" value="${process.priority}"></td>
    <td><button class="btn btn-danger btn-sm del-row">✕</button></td>
  `;
  tbody.appendChild(tr);
  refreshRowNumbers();
}

function refreshRowNumbers() {
  document.querySelectorAll("#processRows tr[data-row='process']").forEach((row, i) => {
    row.children[0].textContent = String(i + 1);
  });
}

function computeSchedule(input, algo, quantum = 2) {
  const processes = input.map((p, i) => ({ ...p, index: i, rem: p.burst, started: false, start: null, completion: 0 }));
  let t = Math.min(...processes.map((p) => p.arrival));
  const done = new Set();
  const schedule = [];

  function pushBlock(pid, i, s, e) {
    if (schedule.length && schedule[schedule.length - 1].pid === pid && schedule[schedule.length - 1].end === s) schedule[schedule.length - 1].end = e;
    else schedule.push({ pid, pidIndex: i, start: s, end: e });
  }

  if (algo === "FCFS" || algo === "SJF") {
    while (done.size < processes.length) {
      const ready = processes.filter((p) => p.arrival <= t && !done.has(p.pid));
      if (!ready.length) { t += 1; continue; }
      const pick = algo === "FCFS"
        ? ready.sort((a, b) => a.arrival - b.arrival || a.index - b.index)[0]
        : ready.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival || a.index - b.index)[0];
      pick.start ??= t;
      pushBlock(pick.pid, pick.index, t, t + pick.burst);
      t += pick.burst;
      pick.rem = 0;
      pick.completion = t;
      done.add(pick.pid);
    }
  } else if (algo === "SRTF" || algo === "PRIORITY") {
    while (done.size < processes.length) {
      const ready = processes.filter((p) => p.arrival <= t && p.rem > 0);
      if (!ready.length) { t += 1; continue; }
      const pick = algo === "SRTF"
        ? ready.sort((a, b) => a.rem - b.rem || a.arrival - b.arrival || a.index - b.index)[0]
        : ready.sort((a, b) => a.priority - b.priority || a.arrival - b.arrival || a.index - b.index)[0];
      pick.start ??= t;
      pushBlock(pick.pid, pick.index, t, t + 1);
      pick.rem -= 1;
      t += 1;
      if (pick.rem === 0) {
        pick.completion = t;
        done.add(pick.pid);
      }
    }
  } else if (algo === "RR") {
    const queue = [];
    const arrived = new Set();
    let curT = t;
    processes.filter(p => p.arrival <= curT && p.rem > 0).sort((a,b)=>a.arrival-b.arrival||a.index-b.index).forEach(p=>{queue.push(p);arrived.add(p.pid);});
    while (done.size < processes.length) {
      if (!queue.length) {
        const next = processes.filter(p => !arrived.has(p.pid) && p.rem > 0).sort((a,b)=>a.arrival-b.arrival)[0];
        if (!next) break;
        curT = next.arrival;
        queue.push(next);
        arrived.add(next.pid);
      }
      const pick = queue.shift();
      if (!pick.started) { pick.start = curT; pick.started = true; }
      const runFor = Math.min(quantum, pick.rem);
      pushBlock(pick.pid, pick.index, curT, curT + runFor);
      curT += runFor;
      pick.rem -= runFor;
      processes.filter(p => p.arrival <= curT && !arrived.has(p.pid) && p.rem > 0).sort((a,b)=>a.arrival-b.arrival||a.index-b.index).forEach(p=>{queue.push(p);arrived.add(p.pid);});
      if (pick.rem > 0) queue.push(pick);
      else { pick.completion = curT; done.add(pick.pid); }
    }
  }

  const resultRows = processes.map((p) => {
    const tat = p.completion - p.arrival;
    const wt = tat - p.burst;
    const rt = (p.start ?? p.arrival) - p.arrival;
    return { ...p, tat, wt, rt };
  }).sort((a, b) => a.index - b.index);
  return { schedule, resultRows };
}

function renderGantt(schedule) {
  const container = document.getElementById("ganttChart");
  const timeline = document.getElementById("ganttTimeline");
  if (!schedule.length) return;
  const totalTime = schedule[schedule.length - 1].end;
  const scale = Math.min(40, Math.floor(900 / Math.max(totalTime, 1)));
  container.innerHTML = "";
  timeline.innerHTML = "";
  schedule.forEach((block, i) => {
    const width = (block.end - block.start) * scale;
    const bar = document.createElement("div");
    bar.className = "gantt-bar";
    bar.style.cssText = `width:${width}px;background:${processColor(block.pidIndex)};animation-delay:${i * 0.05}s`;
    bar.innerHTML = `<span class="gantt-pid">${block.pid}</span><span class="gantt-dur">${block.end - block.start}</span>`;
    container.appendChild(bar);
  });
  const times = [...new Set(schedule.flatMap((b) => [b.start, b.end]))].sort((a, b) => a - b);
  times.forEach((t) => {
    const tick = document.createElement("span");
    tick.className = "gantt-tick";
    tick.style.left = `${t * scale}px`;
    tick.textContent = String(t);
    timeline.appendChild(tick);
  });
}

function renderResults(rows) {
  const body = document.getElementById("resultsRows");
  body.innerHTML = rows.map((r) => `
    <tr><td class="mono">${r.pid}</td><td>${r.arrival}</td><td>${r.burst}</td><td>${r.completion}</td><td>${r.tat}</td><td>${r.wt}</td><td>${r.rt}</td></tr>
  `).join("");
  const avgTat = rows.reduce((a, b) => a + b.tat, 0) / rows.length;
  const avgWt = rows.reduce((a, b) => a + b.wt, 0) / rows.length;
  const avgRt = rows.reduce((a, b) => a + b.rt, 0) / rows.length;
  const makespan = Math.max(...rows.map((r) => r.completion)) - Math.min(...rows.map((r) => r.arrival));
  const busy = rows.reduce((a, b) => a + b.burst, 0);
  animateCounter(document.getElementById("avgTat"), Number(avgTat.toFixed(2)), 500);
  animateCounter(document.getElementById("avgWt"), Number(avgWt.toFixed(2)), 500);
  animateCounter(document.getElementById("avgRt"), Number(avgRt.toFixed(2)), 500);
  animateCounter(document.getElementById("cpuUtil"), Math.round((busy / Math.max(makespan, 1)) * 100), 500, "", "%");
}

async function runSimulation() {
  if (isRunning) return;
  const data = getProcessesFromTable();
  if (!data || !data.length) { showToast("Please enter valid process data.", "error"); return; }
  const quantum = parseInt(document.getElementById("quantumInput").value, 10) || 2;
  const out = computeSchedule(data, currentAlgo, quantum);
  steps = out.schedule;
  computedResults = out.resultRows;
  isRunning = true;
  currentStep = 0;
  const log = document.getElementById("stepLog");
  log.textContent = "Starting simulation...\n";
  const chart = document.getElementById("ganttChart");
  chart.innerHTML = "";
  document.getElementById("ganttTimeline").innerHTML = "";
  while (currentStep < steps.length && isRunning) {
    while (isPaused) await sleep(120);
    renderGantt(steps.slice(0, currentStep + 1));
    const b = steps[currentStep];
    log.textContent += `${b.pid}: ${b.start} -> ${b.end}\n`;
    currentStep += 1;
    await sleep(getDelay(speedVal));
  }
  renderResults(computedResults);
  showToast("Simulation complete", "success");
  isRunning = false;
}

function quickRun() {
  const data = getProcessesFromTable();
  if (!data || !data.length) { showToast("Please enter valid process data.", "error"); return; }
  const quantum = parseInt(document.getElementById("quantumInput").value, 10) || 2;
  const out = computeSchedule(data, currentAlgo, quantum);
  steps = out.schedule;
  computedResults = out.resultRows;
  renderGantt(out.schedule);
  renderResults(out.resultRows);
  const log = document.getElementById("stepLog");
  log.textContent = out.schedule.map((b) => `${b.pid}: ${b.start} -> ${b.end}`).join("\n");
}

function resetSim() {
  isRunning = false;
  isPaused = false;
  currentStep = 0;
  steps = [];
  document.getElementById("ganttChart").innerHTML = "";
  document.getElementById("ganttTimeline").innerHTML = "";
  document.getElementById("stepLog").textContent = "Simulation log will appear here.";
  document.getElementById("resultsRows").innerHTML = "<tr><td colspan='7'>Add processes to simulate.</td></tr>";
  ["avgTat", "avgWt", "avgRt", "cpuUtil"].forEach((id) => document.getElementById(id).textContent = id === "cpuUtil" ? "0%" : "0");
}

function compareAll() {
  const data = getProcessesFromTable();
  if (!data || !data.length) { showToast("Add valid processes first.", "warning"); return; }
  const q = parseInt(document.getElementById("quantumInput").value, 10) || 2;
  const algos = ["FCFS", "SJF", "SRTF", "RR", "PRIORITY"];
  const vals = algos.map((a) => {
    const out = computeSchedule(data, a, q);
    const avgWt = out.resultRows.reduce((s, r) => s + r.wt, 0) / out.resultRows.length;
    return { algo: a, val: Number(avgWt.toFixed(2)) };
  });
  const max = Math.max(...vals.map((v) => v.val), 1);
  const colors = ["var(--accent-blue)", "var(--accent-purple)", "var(--accent-cyan)", "var(--accent-green)", "var(--accent-orange)"];
  const w = 440, h = 210, pad = 36, bw = 58, gap = 20;
  const svg = `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Average waiting time comparison">
      ${vals.map((v, i) => {
        const barH = ((h - pad * 2) * v.val) / max;
        const x = pad + i * (bw + gap);
        const y = h - pad - barH;
        return `<rect x="${x}" y="${y}" width="${bw}" height="${barH}" rx="8" fill="${colors[i]}"></rect>
                <text x="${x + bw / 2}" y="${h - 12}" text-anchor="middle" class="bar-label">${v.algo}</text>
                <text x="${x + bw / 2}" y="${Math.max(y - 6, 12)}" text-anchor="middle" class="bar-label">${v.val}</text>`;
      }).join("")}
    </svg>
  `;
  document.getElementById("compareChart").innerHTML = svg;
}

document.addEventListener("DOMContentLoaded", () => {
  for (let i = 0; i < 4; i++) addProcessRow(mkProcess({ arrival: i, burst: 3 + i, priority: i % 3 }));
  document.getElementById("processRows").addEventListener("click", (e) => {
    if (e.target.classList.contains("del-row")) {
      e.target.closest("tr").remove();
      refreshRowNumbers();
    }
  });
  document.getElementById("addProcessBtn").addEventListener("click", () => addProcessRow(mkProcess()));
  document.getElementById("addRandomBtn").addEventListener("click", () => {
    const tbody = document.getElementById("processRows");
    tbody.innerHTML = "";
    for (let i = 0; i < 5; i++) {
      addProcessRow(mkProcess({
        arrival: Math.floor(Math.random() * 6),
        burst: 1 + Math.floor(Math.random() * 8),
        priority: Math.floor(Math.random() * 6)
      }));
    }
  });
  document.querySelectorAll(".algo-tabs .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".algo-tabs .tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentAlgo = btn.dataset.algo;
      document.getElementById("quantumWrap").style.display = currentAlgo === "RR" ? "block" : "none";
    });
  });
  document.getElementById("simulateBtn").addEventListener("click", runSimulation);
  document.getElementById("quickRunBtn").addEventListener("click", quickRun);
  document.getElementById("resetBtn").addEventListener("click", resetSim);
  document.getElementById("compareAllBtn").addEventListener("click", compareAll);
  document.getElementById("speedRange").addEventListener("input", (e) => {
    speedVal = parseInt(e.target.value, 10);
    document.getElementById("speedLabel").textContent = `${speedVal}x`;
  });
});
