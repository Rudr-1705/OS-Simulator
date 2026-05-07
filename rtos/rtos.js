function gcd(a, b) { return b ? gcd(b, a % b) : a; }
function lcm(a, b) { return (a / gcd(a, b)) * b; }

let tasks  = [{ n:'T1', p:4,  c:1, d:4  },
               { n:'T2', p:5,  c:2, d:5  },
               { n:'T3', p:20, c:5, d:20 }];
let algo   = 'EDF';
let speedVal = 3;
let animTimer = null;

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
    // Detect deadline miss: any job whose deadline is now and still has work remaining
    const missed = jobs.some(j => j.deadline === t && j.rem > 0 && j.release <= t);
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
}

function render() {
  const s = sched();
  const wrap = document.getElementById("ganttWrap");
  if (!wrap) return;
  if (!s.length) { wrap.innerHTML = "<p style='color:var(--text-muted)'>Add tasks to simulate.</p>"; return; }

  const taskNames = [...new Set(s.map(x => x.run))].filter(n => n !== "IDLE");
  const hp  = s.length;
  let html  = `<div style="overflow-x:auto;padding-bottom:8px">`;
  html += `<div style="font-family:var(--font-mono);font-size:.72rem;color:var(--text-muted);margin-bottom:8px">
    Hyperperiod = ${hp} time units</div>`;

  taskNames.forEach((name, idx) => {
    const bg = processColor(idx, 0.9);
    html += `<div style="display:flex;align-items:center;margin-bottom:5px">
      <div style="width:36px;font-size:.78rem;font-weight:700;color:var(--text-primary);flex-shrink:0;font-family:var(--font-mono)">${name}</div>
      <div style="display:flex">`;
    s.forEach(slot => {
      const active  = slot.run === name;
      const cellBg  = active ? bg : "var(--bg-sunken)";
      const border  = slot.missed ? "2px solid var(--accent-red)" : "1px solid var(--border-subtle)";
      html += `<div style="width:22px;height:26px;background:${cellBg};border:${border};border-radius:2px;margin-right:1px;${active?'':'opacity:.3'}" title="t=${slot.t}: ${slot.run}${slot.missed?' (DEADLINE MISS!)':''}"></div>`;
    });
    html += `</div></div>`;
  });

  // Time axis
  html += `<div style="display:flex;margin-left:36px;margin-top:4px">`;
  s.forEach((_, t) => {
    html += t % 5 === 0
      ? `<div style="width:22px;margin-right:1px;font-size:.62rem;color:var(--text-muted);font-family:var(--font-mono)">${t}</div>`
      : `<div style="width:22px;margin-right:1px"></div>`;
  });
  html += `</div>`;

  // Deadline markers legend
  const misses = s.filter(x => x.missed).length;
  if (misses) {
    html += `<div class="badge badge-red" style="margin-top:8px">${misses} deadline miss${misses>1?'es':''} detected</div>`;
  }
  html += `</div>`;

  // RM Schedulability test
  if (algo === "RM") {
    const util  = tasks.reduce((a, t) => a + t.c / t.p, 0);
    const bound = tasks.length * (Math.pow(2, 1 / tasks.length) - 1);
    html += `<div style="margin-top:1rem;padding:.75rem;background:var(--bg-elevated);border-radius:var(--r-md);font-family:var(--font-mono);font-size:.82rem">
      <strong>RM Schedulability Test</strong><br>
      U = Σ(Cᵢ/Tᵢ) = ${util.toFixed(4)} &nbsp;${util <= bound ? '≤' : '>'}&nbsp; n(2^(1/n)−1) = ${bound.toFixed(4)}
      <span class="badge ${util <= bound ? 'badge-green' : 'badge-red'}" style="margin-left:.5rem">${util <= bound ? 'SCHEDULABLE' : 'POSSIBLY NOT SCHEDULABLE'}</span>
    </div>`;
  }

  wrap.innerHTML = html;
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
  renderTaskTable();
  render();
});
