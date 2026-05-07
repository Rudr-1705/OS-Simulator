function gcd(a, b) { return b ? gcd(b, a % b) : a; }
function lcm(a, b) { return (a / gcd(a, b)) * b; }

let tasks  = [{ n:'T1', p:4,  c:1, d:4  },
               { n:'T2', p:5,  c:2, d:5  },
               { n:'T3', p:20, c:5, d:20 }];
let algo   = 'EDF';
let speedVal = 3;
let animRunning = false;

function sched() {
  if (!tasks.length) return [];
  const hp   = tasks.reduce((a, t) => lcm(a, t.p), tasks[0].p);
  const jobs = [];
  tasks.forEach(t => {
    for (let release = 0; release < hp; release += t.p) {
      jobs.push({ name: t.n, period: t.p, exec: t.c, rem: t.c, release, deadline: release + t.d });
    }
  });

  const arr = [];
  for (let t = 0; t < hp; t++) {
    const ready = jobs.filter(j => j.release <= t && j.rem > 0 && t < j.deadline);
    if (!ready.length) { arr.push({ t, run: "IDLE", missed: false }); continue; }
    let pick;
    if      (algo === "EDF") pick = ready.sort((a, b) => a.deadline - b.deadline)[0];
    else if (algo === "RM")  pick = ready.sort((a, b) => a.period   - b.period)[0];
    else /* LLF */           pick = ready.sort((a, b) => (a.deadline - t - a.rem) - (b.deadline - t - b.rem))[0];
    pick.rem--;
    const missed = jobs.some(j => j.deadline <= t && j.rem > 0 && j.release < j.deadline);
    arr.push({ t, run: pick.name, missed });
  }
  return arr;
}

function renderTaskTable() {
  const tbody = document.getElementById("taskBody");
  if (!tbody) return;
  tbody.innerHTML = tasks.map((t, i) => `
    <tr>
      <td class="mono">${t.n}</td>
      <td><input class="form-input form-mono" type="number" value="${t.p}" min="1" style="width:60px"
          onchange="tasks[${i}].p=+this.value; render()"></td>
      <td><input class="form-input form-mono" type="number" value="${t.c}" min="1" style="width:60px"
          onchange="tasks[${i}].c=+this.value; render()"></td>
      <td><input class="form-input form-mono" type="number" value="${t.d}" min="1" style="width:60px"
          onchange="tasks[${i}].d=+this.value; render()"></td>
      <td><button class="btn btn-danger btn-sm" onclick="removeTask(${i})">✕</button></td>
    </tr>`).join("");
}

window.removeTask = function(i) { tasks.splice(i, 1); renderTaskTable(); render(); };

function addTask() {
  const n = document.getElementById("tName").value.trim() || `T${tasks.length+1}`;
  const p = parseInt(document.getElementById("tPeriod").value, 10) || 4;
  const c = parseInt(document.getElementById("tExec").value, 10)   || 1;
  const d = parseInt(document.getElementById("tDeadline").value, 10) || p;
  if (c > p) { showToast("Exec time cannot exceed period", "error"); return; }
  tasks.push({ n, p, c, d });
  renderTaskTable();
  render();
  renderUtilBar();
}

const TASK_COLORS = ["#60a5fa", "#f97316", "#22c55e", "#a855f7", "#ef4444", "#eab308", "#06b6d4"];
function getTaskColor(idx) { return TASK_COLORS[idx % TASK_COLORS.length]; }

function roundRectPath(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawGanttStatic(schedule, highlightTo = schedule.length) {
  const canvas = document.getElementById("ganttCanvas");
  if (!canvas) return;
  const taskNames = [...new Set(schedule.map((x) => x.run))].filter((n) => n !== "IDLE");
  if (!taskNames.length) return;

  const ROW_H = 34;
  const LABEL_W = 42;
  const CELL_W = 18;
  const PAD = 12;
  const hp = schedule.length;
  const cssW = LABEL_W + hp * CELL_W + PAD * 2;
  const cssH = PAD * 2 + taskNames.length * (ROW_H + 4) + 22;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(cssW * dpr));
  canvas.height = Math.max(1, Math.floor(cssH * dpr));
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg-elevated").trim() || "#1e1e2e";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cssW, cssH);

  taskNames.forEach((name, rowIdx) => {
    const y = PAD + rowIdx * (ROW_H + 4);
    const color = getTaskColor(rowIdx);
    ctx.fillStyle = color;
    ctx.font = "bold 12px JetBrains Mono, monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(name, LABEL_W - 6, y + ROW_H / 2);

    for (let t = 0; t < Math.min(hp, highlightTo); t++) {
      const slot = schedule[t];
      const active = slot.run === name;
      const x = LABEL_W + PAD + t * CELL_W;
      if (active) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.9;
        roundRectPath(ctx, x, y, CELL_W - 2, ROW_H, 3);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (slot.missed) {
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 2;
          roundRectPath(ctx, x, y, CELL_W - 2, ROW_H, 3);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = "#ffffff08";
        roundRectPath(ctx, x, y, CELL_W - 2, ROW_H, 3);
        ctx.fill();
      }
    }
  });

  const axisY = PAD + taskNames.length * (ROW_H + 4) + 6;
  ctx.fillStyle = "#64748b";
  ctx.font = "9px JetBrains Mono, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let t = 0; t <= Math.min(hp, highlightTo); t += 5) {
    const x = LABEL_W + PAD + t * CELL_W;
    ctx.fillText(t, x, axisY);
  }

  if (highlightTo < hp) {
    const px = LABEL_W + PAD + highlightTo * CELL_W;
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(px, PAD - 4);
    ctx.lineTo(px, axisY);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

async function runAnimation() {
  if (animRunning) return;
  if (!tasks.length) {
    const info = document.getElementById("ganttInfo");
    if (info) info.innerHTML = "<span style='color:var(--text-muted)'>Add at least one task to simulate.</span>";
    return;
  }
  animRunning = true;
  const s = sched();
  if (!s.length) { animRunning = false; return; }

  for (let t = 1; t <= s.length && animRunning; t++) {
    drawGanttStatic(s, t);
    await sleep(getDelay(speedVal));
  }

  drawGanttStatic(s, s.length);
  const misses = s.filter((x) => x.missed).length;
  let info = `<span style="color:var(--text-muted)">Hyperperiod = ${s.length} time units</span>`;
  if (misses) info += ` &nbsp;|&nbsp; <span style="color:#ef4444">⚠ ${misses} deadline miss${misses > 1 ? "es" : ""}</span>`;
  if (algo === "RM") {
    const util = tasks.reduce((a, t) => a + t.c / t.p, 0);
    const bound = tasks.length * (Math.pow(2, 1 / tasks.length) - 1);
    info += `<br>RM: U=${util.toFixed(3)} ${util <= bound ? "≤" : ">"} bound=${bound.toFixed(3)} <span class="${util <= bound ? "badge-green" : "badge-red"}" style="font-size:.75rem">${util <= bound ? "SCHEDULABLE" : "MAY FAIL"}</span>`;
  }
  const infoEl = document.getElementById("ganttInfo");
  if (infoEl) infoEl.innerHTML = info;
  animRunning = false;
}

function renderUtilBar() {
  const el = document.getElementById("utilBar");
  if (!el || !tasks.length) return;
  const total = tasks.reduce((a, t) => a + t.c / t.p, 0);
  const pct = Math.min(100, total * 100);
  const color = pct > 100 ? "#ef4444" : pct > 70 ? "#f97316" : "#22c55e";
  el.innerHTML = `
    <div style="font-size:.78rem;font-family:var(--font-mono);color:var(--text-muted);margin-bottom:4px">
      CPU Utilization: <strong style="color:${color}">${pct.toFixed(1)}%</strong>
      ${pct > 100 ? '<span style="color:#ef4444"> - OVERLOADED</span>' : ""}
    </div>
    <div style="height:8px;background:var(--bg-elevated);border-radius:99px;overflow:hidden">
      <div style="width:${pct}%;height:100%;background:${color};border-radius:99px;transition:width .4s ease"></div>
    </div>
    <div style="display:flex;gap:1rem;margin-top:.5rem;flex-wrap:wrap">
      ${tasks.map((t, i) => `<span style="font-size:.72rem;font-family:var(--font-mono)"><span style="color:${getTaskColor(i)}">■</span> ${t.n}: ${((t.c / t.p) * 100).toFixed(1)}%</span>`).join("")}
    </div>`;
}

function render() {
  if (!tasks.length) {
    const info = document.getElementById("ganttInfo");
    if (info) info.innerHTML = "<span style='color:var(--text-muted)'>Add at least one task to simulate.</span>";
    const canvas = document.getElementById("ganttCanvas");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      canvas.width = 1;
      canvas.height = 1;
      ctx.clearRect(0, 0, 1, 1);
    }
    return;
  }
  const s = sched();
  if (!s.length) return;
  drawGanttStatic(s, s.length);
  const info = document.getElementById("ganttInfo");
  if (info) info.innerHTML = `<span style="color:var(--text-muted)">Hyperperiod = ${s.length} time units · Algorithm: ${algo}</span>`;
  renderUtilBar();
}

function randomTasks() {
  tasks = Array.from({length: 3}, (_, i) => {
    const p = 3 + Math.floor(Math.random() * 10);
    const c = 1 + Math.floor(Math.random() * Math.min(p-1, 3));
    return { n: `T${i+1}`, p, c, d: p };
  });
  renderTaskTable();
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".algo-tabs .tab-btn").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".algo-tabs .tab-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      algo = b.dataset.algo;
      render();
    });
  });
  document.getElementById("addTaskBtn").addEventListener("click", addTask);
  document.getElementById("randomBtn").addEventListener("click", randomTasks);
  document.getElementById("resetBtn").addEventListener("click", () => {
    tasks = [{ n:'T1', p:4, c:1, d:4 }, { n:'T2', p:5, c:2, d:5 }, { n:'T3', p:20, c:5, d:20 }];
    renderTaskTable();
    render();
  });
  document.getElementById("speedRange")?.addEventListener("input", e => {
    speedVal = parseInt(e.target.value, 10);
    document.getElementById("speedLabel").textContent = `${speedVal}x`;
  });
  document.getElementById("runBtn")?.addEventListener("click", runAnimation);
  document.getElementById("stopBtn")?.addEventListener("click", () => { animRunning = false; });
  renderTaskTable();
  render();
});
