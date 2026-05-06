const ipcState = {
  pipeQ: [],
  msgQueue: [],
  sharedMem: Array(8).fill(null),
  sigLog: [],
  shmProcesses: [
    { id: "P0", label: "Process A", color: "var(--accent-blue)" },
    { id: "P1", label: "Process B", color: "var(--accent-green)" },
    { id: "P2", label: "Process C", color: "var(--accent-orange)" }
  ],
  selectedShmProcess: "P0",
  shmMode: "read",
  activeShmCell: null
};

const IPCView = {
  pipeSlot(value) {
    return `<div class="slot ${value !== undefined ? "full" : ""}">${value !== undefined ? value : ""}</div>`;
  },

  queueEmpty() {
    return `<div style="color:var(--text-muted);padding:1rem;text-align:center">Queue empty</div>`;
  },

  queueItem(message) {
    return `
      <div style="display:flex;align-items:center;gap:.5rem;padding:.4rem .75rem;border-bottom:1px solid var(--border-subtle)">
        <span class="badge badge-purple">${message.pri}</span>
        <span style="font-size:.85rem">${message.msg}</span>
      </div>`;
  },

  shmProcessButton(proc, isActive) {
    return `
      <button
        type="button"
        class="shm-process-btn ${isActive ? "active" : ""}"
        onclick="setShmProcess('${proc.id}')"
        style="${isActive ? `border-color:${proc.color};color:${proc.color};` : ""}"
      >
        ${proc.id}
      </button>
    `;
  },

  shmHint(proc, mode) {
    return `<span class="mono" style="color:${proc.color}">${proc.label}</span> will <span class="mono">${mode}</span> the next cell you click.`;
  },

  shmCell(index, value, isActive, mode) {
    return `
      <button
        type="button"
        class="frame-box shm-cell ${isActive ? "active" : ""}"
        style="cursor:pointer;min-width:70px"
        onclick="shmCellAction(${index})"
        title="Click to ${mode}"
      >
        <div style="font-size:.62rem;color:var(--text-muted)">Cell ${index}</div>
        <div class="frame-val" style="font-size:1rem">${value !== null ? value : "-"}</div>
      </button>`;
  },

  signalRow(signal) {
    return `<tr><td class="mono">${signal.name}</td><td class="mono">${signal.num}</td><td style="font-size:.8rem">${signal.desc}</td></tr>`;
  },

  signalEntry(sigName, target, resp) {
    return `<div style="padding:.5rem;border-left:3px solid ${resp.color};margin-bottom:.5rem">
      <div style="font-family:var(--font-mono);font-weight:700;color:${resp.color}">${sigName} -> ${target}</div>
      <div style="font-size:.78rem;color:var(--text-muted)">${resp.effect}</div>
    </div>`;
  }
};

const SIGNALS = [
  { name: "SIGKILL", num: 9, desc: "Terminate immediately (unblockable)" },
  { name: "SIGTERM", num: 15, desc: "Request graceful termination" },
  { name: "SIGINT", num: 2, desc: "Interrupt from keyboard (Ctrl+C)" },
  { name: "SIGSTOP", num: 19, desc: "Pause process (unblockable)" },
  { name: "SIGCONT", num: 18, desc: "Resume paused process" },
  { name: "SIGUSR1", num: 10, desc: "User-defined signal 1" },
  { name: "SIGUSR2", num: 12, desc: "User-defined signal 2" },
  { name: "SIGCHLD", num: 17, desc: "Child process stopped or terminated" },
  { name: "SIGPIPE", num: 13, desc: "Broken pipe - write to closed pipe" },
  { name: "SIGALRM", num: 14, desc: "Alarm clock - timer expired" }
];

const sigResponses = {
  SIGKILL: { color: "var(--accent-red)", label: "KILLED", effect: "Process terminates immediately" },
  SIGTERM: { color: "var(--accent-orange)", label: "TERM", effect: "Process handles graceful shutdown" },
  SIGINT: { color: "var(--accent-orange)", label: "INTR", effect: "Process interrupted (like Ctrl+C)" },
  SIGSTOP: { color: "var(--accent-blue)", label: "STOPPED", effect: "Process suspended - waiting SIGCONT" },
  SIGCONT: { color: "var(--accent-green)", label: "RESUMED", effect: "Process resumes execution" },
  SIGUSR1: { color: "var(--accent-purple)", label: "USR1", effect: "Custom handler invoked" },
  SIGUSR2: { color: "var(--accent-purple)", label: "USR2", effect: "Custom handler invoked" },
  SIGCHLD: { color: "var(--accent-cyan)", label: "CHILD", effect: "Parent notified of child state change" },
  SIGPIPE: { color: "var(--accent-red)", label: "PIPE", effect: "Write failed - pipe closed" },
  SIGALRM: { color: "var(--accent-orange)", label: "ALARM", effect: "Alarm handler fires" }
};

// Logic and state
function pipeDraw() {
  const fill = (ipcState.pipeQ.length / 8) * 100;
  document.getElementById("pipeBuf").innerHTML = Array.from({ length: 8 }, (_, i) => IPCView.pipeSlot(ipcState.pipeQ[i])).join("");
  document.getElementById("pipeFill").style.width = `${fill}%`;
  document.getElementById("pipeCount").textContent = `${ipcState.pipeQ.length}/8`;
}

function pipeWrite() {
  if (ipcState.pipeQ.length >= 8) {
    showToast("Pipe FULL - writer blocks", "warning");
    return;
  }
  const value = Math.floor(Math.random() * 100);
  ipcState.pipeQ.push(value);
  document.getElementById("pipeLog").innerHTML += `<div style="color:var(--accent-green)">WRITE: ${value}</div>`;
  pipeDraw();
}

function pipeRead() {
  if (!ipcState.pipeQ.length) {
    showToast("Pipe EMPTY - reader blocks", "warning");
    return;
  }
  const value = ipcState.pipeQ.shift();
  document.getElementById("pipeLog").innerHTML += `<div style="color:var(--accent-blue)">READ:  ${value}</div>`;
  pipeDraw();
}

function mqEnqueue() {
  const msg = document.getElementById("mqMsg").value.trim() || "MSG";
  const pri = parseInt(document.getElementById("mqPri").value, 10) || 1;
  ipcState.msgQueue.push({ msg, pri, id: Date.now() });
  ipcState.msgQueue.sort((a, b) => b.pri - a.pri);
  mqDraw();
}

function mqDequeue() {
  if (!ipcState.msgQueue.length) {
    showToast("Queue empty", "warning");
    return;
  }
  const message = ipcState.msgQueue.shift();
  showToast(`Received: "${message.msg}" (priority ${message.pri})`, "success");
  mqDraw();
}

function mqDraw() {
  document.getElementById("mqViz").innerHTML = ipcState.msgQueue.length === 0
    ? IPCView.queueEmpty()
    : ipcState.msgQueue.map(IPCView.queueItem).join("");
}

function getSelectedShmProcess() {
  return ipcState.shmProcesses.find(proc => proc.id === ipcState.selectedShmProcess) || ipcState.shmProcesses[0];
}

function shmWrite(index) {
  const proc = getSelectedShmProcess();
  const value = Math.floor(Math.random() * 999);
  ipcState.sharedMem[index] = value;
  ipcState.activeShmCell = index;
  shmDraw();
  document.getElementById("shmLog").innerHTML += `<div style="color:${proc.color}">${proc.id} WRITE cell[${index}] = ${value}</div>`;
}

function shmRead(index) {
  const proc = getSelectedShmProcess();
  ipcState.activeShmCell = index;
  shmDraw();
  document.getElementById("shmLog").innerHTML += `<div style="color:${proc.color}">${proc.id} READ  cell[${index}] = ${ipcState.sharedMem[index] ?? "-"}</div>`;
}

function shmCellAction(index) {
  if (ipcState.shmMode === "write") {
    shmWrite(index);
    return;
  }
  shmRead(index);
}

function setShmProcess(procId) {
  ipcState.selectedShmProcess = procId;
  shmDraw();
}

function setShmMode(mode) {
  ipcState.shmMode = mode;
  shmDraw();
}

function renderShmControls() {
  const picker = document.getElementById("shmProcessPicker");
  if (picker) {
    picker.innerHTML = ipcState.shmProcesses.map(proc => IPCView.shmProcessButton(proc, proc.id === ipcState.selectedShmProcess)).join("");
  }

  const readBtn = document.getElementById("shmReadMode");
  const writeBtn = document.getElementById("shmWriteMode");
  if (readBtn && writeBtn) {
    readBtn.classList.toggle("active", ipcState.shmMode === "read");
    readBtn.classList.toggle("btn-secondary", ipcState.shmMode === "read");
    readBtn.classList.toggle("btn-ghost", ipcState.shmMode !== "read");
    writeBtn.classList.toggle("active", ipcState.shmMode === "write");
    writeBtn.classList.toggle("btn-secondary", ipcState.shmMode === "write");
    writeBtn.classList.toggle("btn-ghost", ipcState.shmMode !== "write");
  }

  const hint = document.getElementById("shmHint");
  if (hint) {
    hint.innerHTML = IPCView.shmHint(getSelectedShmProcess(), ipcState.shmMode);
  }
}

function shmDraw() {
  renderShmControls();
  document.getElementById("shmGrid").innerHTML = ipcState.sharedMem
    .map((value, index) => IPCView.shmCell(index, value, ipcState.activeShmCell === index, ipcState.shmMode))
    .join("");
}

function sendSignal() {
  const sigName = document.getElementById("sigSel").value;
  const target = document.getElementById("sigTarget").value;
  const resp = sigResponses[sigName] || { color: "var(--accent-blue)", label: "SIG", effect: "Signal delivered" };
  document.getElementById("sigLog").innerHTML = IPCView.signalEntry(sigName, target, resp) + document.getElementById("sigLog").innerHTML;
  document.getElementById("sigBadge").innerHTML = `<span class="badge" style="background:${resp.color}20;color:${resp.color};border:1px solid ${resp.color}">${resp.label}</span>`;
}

function ipcSwitchTab(tab) {
  document.querySelectorAll(".ipc-tab-content").forEach(el => { el.style.display = "none"; });
  document.getElementById(`ipc-${tab}`).style.display = "block";
  document.querySelectorAll(".ipc-tabs .tab-btn").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
}

function initializeIPC() {
  document.querySelectorAll(".ipc-tabs .tab-btn").forEach(button => button.addEventListener("click", () => ipcSwitchTab(button.dataset.tab)));

  document.getElementById("pipeWrite").addEventListener("click", pipeWrite);
  document.getElementById("pipeRead").addEventListener("click", pipeRead);
  document.getElementById("pipeReset").addEventListener("click", () => {
    ipcState.pipeQ = [];
    pipeDraw();
  });

  document.getElementById("mqEnq").addEventListener("click", mqEnqueue);
  document.getElementById("mqDeq").addEventListener("click", mqDequeue);

  shmDraw();
  document.getElementById("shmReset").addEventListener("click", () => {
    ipcState.sharedMem.fill(null);
    ipcState.activeShmCell = null;
    shmDraw();
  });
  document.getElementById("shmReadMode")?.addEventListener("click", () => setShmMode("read"));
  document.getElementById("shmWriteMode")?.addEventListener("click", () => setShmMode("write"));

  document.getElementById("sigSend").addEventListener("click", sendSignal);
  document.getElementById("sigTable").innerHTML = SIGNALS.map(IPCView.signalRow).join("");

  pipeDraw();
  mqDraw();
}

document.addEventListener("DOMContentLoaded", initializeIPC);

window.setShmProcess = setShmProcess;
