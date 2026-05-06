// ═══════════════════════════════════════════════════════════════
//  File System Simulation — OS Simulator
//  Implements: Single-Level, Two-Level, Tree, DAG (file sharing)
// ═══════════════════════════════════════════════════════════════

// ── Global State ────────────────────────────────────────────────
let currentModel = "single";

// Node types
const TYPE = { ROOT: "root", DIR: "dir", FILE: "file", USER: "user" };

// File system state (rebuilt on model switch / operations)
let fsState = {
  nodes: [], // { id, name, type, refCount, x, y, vx, vy }
  edges: [], // { from, to, label? }
};

let nextId = 1;

// Canvas / animation
let animFrame = null;
let canvas, ctx;
let isDragging = false,
  dragNode = null,
  dragOffX = 0,
  dragOffY = 0;

// ── Model Descriptions ───────────────────────────────────────────
const MODEL_DESC = {
  single:
    "One flat directory; all files coexist. File names must be globally unique.",
  two: "Master directory with per-user sub-directories. Name conflicts resolved per user.",
  tree: "Full hierarchy with nested sub-directories. Each file has exactly one parent.",
  dag: "DAG model: files can be shared across multiple directories via hard links. Reference counting tracks deletion safety.",
};

// ── Colour helpers (read CSS vars so theme changes apply) ────────
function cssVar(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

// ── Logging ─────────────────────────────────────────────────────
function logTrace(msg, kind = "info") {
  const logEl = document.getElementById("log");
  if (!logEl) return;
  const time = new Date().toLocaleTimeString("en", { hour12: false });
  const colors = {
    info: "var(--accent-blue)",
    success: "var(--accent-green)",
    error: "var(--accent-red)",
    warn: "var(--accent-yellow, #f59e0b)",
    purple: "var(--accent-purple)",
  };
  const c = colors[kind] || colors.info;
  logEl.innerHTML += `<div style="color:${c};border-left:2px solid ${c};padding-left:6px;margin-bottom:4px;font-family:var(--font-mono);font-size:.78rem">[${time}] ${msg}</div>`;
  logEl.scrollTop = logEl.scrollHeight;
}

function clearLog() {
  const logEl = document.getElementById("log");
  if (logEl) logEl.innerHTML = "";
}

// ── Node helpers ─────────────────────────────────────────────────
function makeNode(name, type, extra = {}) {
  return {
    id: nextId++,
    name,
    type,
    refCount: 0,
    x: 320,
    y: 210,
    vx: 0,
    vy: 0,
    highlight: 0,
    ...extra,
  };
}

function findNode(id) {
  return fsState.nodes.find((n) => n.id === id);
}

function addEdge(fromId, toId, label = "") {
  if (!fsState.edges.find((e) => e.from === fromId && e.to === toId))
    fsState.edges.push({ from: fromId, to: toId, label });
}

function removeEdge(fromId, toId) {
  fsState.edges = fsState.edges.filter(
    (e) => !(e.from === fromId && e.to === toId),
  );
}

function childrenOf(nodeId) {
  return fsState.edges
    .filter((e) => e.from === nodeId)
    .map((e) => findNode(e.to))
    .filter(Boolean);
}

function parentsOf(nodeId) {
  return fsState.edges
    .filter((e) => e.to === nodeId)
    .map((e) => findNode(e.from))
    .filter(Boolean);
}

// ── Initial states ───────────────────────────────────────────────
function buildInitialState(model) {
  nextId = 1;
  fsState = { nodes: [], edges: [] };

  if (model === "single") {
    const root = makeNode("Directory", TYPE.ROOT, { x: 320, y: 80 });
    fsState.nodes.push(root);
    ["File1", "File2", "File3"].forEach((name, i) => {
      const f = makeNode(name, TYPE.FILE, { x: 140 + i * 180, y: 260 });
      fsState.nodes.push(f);
      addEdge(root.id, f.id);
    });
  } else if (model === "two") {
    const master = makeNode("Master Directory", TYPE.ROOT, { x: 320, y: 60 });
    fsState.nodes.push(master);
    const users = [
      { name: "User1", files: ["FileA", "FileB"] },
      { name: "User2", files: ["FileC"] },
    ];
    users.forEach((u, ui) => {
      const ud = makeNode(u.name, TYPE.USER, { x: 160 + ui * 320, y: 190 });
      fsState.nodes.push(ud);
      addEdge(master.id, ud.id);
      u.files.forEach((fname, fi) => {
        const f = makeNode(fname, TYPE.FILE, {
          x: 80 + ui * 320 + fi * 130,
          y: 330,
        });
        fsState.nodes.push(f);
        addEdge(ud.id, f.id);
      });
    });
  } else if (model === "tree") {
    const root = makeNode("Root", TYPE.ROOT, { x: 320, y: 50 });
    const home = makeNode("Home", TYPE.DIR, { x: 320, y: 150 });
    const u1 = makeNode("User1", TYPE.DIR, { x: 180, y: 260 });
    const u2 = makeNode("User2", TYPE.DIR, { x: 460, y: 260 });
    const docs = makeNode("Docs", TYPE.DIR, { x: 180, y: 340 });
    const f1 = makeNode("File1", TYPE.FILE, { x: 180, y: 410 });
    fsState.nodes.push(root, home, u1, u2, docs, f1);
    addEdge(root.id, home.id);
    addEdge(home.id, u1.id);
    addEdge(home.id, u2.id);
    addEdge(u1.id, docs.id);
    addEdge(docs.id, f1.id);
  } else if (model === "dag") {
    const root = makeNode("Root", TYPE.ROOT, { x: 320, y: 60 });
    const dirA = makeNode("DirA", TYPE.DIR, { x: 170, y: 200 });
    const dirB = makeNode("DirB", TYPE.DIR, { x: 470, y: 200 });
    const shared = makeNode("shared_file", TYPE.FILE, {
      x: 320,
      y: 340,
      refCount: 2,
    });
    fsState.nodes.push(root, dirA, dirB, shared);
    addEdge(root.id, dirA.id);
    addEdge(root.id, dirB.id);
    addEdge(dirA.id, shared.id, "link");
    addEdge(dirB.id, shared.id, "link");
  }
}

// ── Stats + Node List UI ─────────────────────────────────────────
function updateSidebar() {
  const dirs = fsState.nodes.filter((n) =>
    [TYPE.ROOT, TYPE.DIR, TYPE.USER].includes(n.type),
  ).length;
  const files = fsState.nodes.filter((n) => n.type === TYPE.FILE).length;
  // hard links = files pointed to by >1 parent
  const shared = fsState.nodes.filter(
    (n) => n.type === TYPE.FILE && parentsOf(n.id).length > 1,
  );
  const links = shared.reduce((s, n) => s + parentsOf(n.id).length, 0);

  document.getElementById("statDirs").textContent = dirs;
  document.getElementById("statFiles").textContent = files;
  document.getElementById("statLinks").textContent = links;
  document.getElementById("statShared").textContent = shared.length;

  const nl = document.getElementById("nodeList");
  nl.innerHTML = fsState.nodes
    .map((n) => {
      const parents = parentsOf(n.id).length;
      const isShared = n.type === TYPE.FILE && parents > 1;
      let cls = n.type === TYPE.FILE ? (isShared ? "shared" : "file") : "dir";
      const icon =
        n.type === TYPE.FILE ? "📄" : n.type === TYPE.ROOT ? "🗂" : "📁";
      const badge = isShared ? `<span class="ref-badge">${parents}</span>` : "";
      return `<div class="node-pill ${cls}">${icon} ${n.name}${badge}</div>`;
    })
    .join("");
}

// ── Legend ───────────────────────────────────────────────────────
function updateLegend() {
  const items = [
    { color: "#3b82f6", label: "Directory / Root" },
    { color: "#22c55e", label: "File" },
  ];
  if (currentModel === "dag")
    items.push({ color: "#a855f7", label: "Shared File (multi-parent)" });
  document.getElementById("legend").innerHTML = items
    .map(
      (i) =>
        `<div class="legend-item"><div class="legend-dot" style="background:${i.color}"></div><span>${i.label}</span></div>`,
    )
    .join("");
}

// ── Model Description ────────────────────────────────────────────
function updateModelDesc() {
  document.getElementById("modelDesc").textContent =
    MODEL_DESC[currentModel] || "";
}

// ══════════════════════════════════════════════════════════════════
//  CANVAS DRAWING
// ══════════════════════════════════════════════════════════════════

function nodeColor(n) {
  if (n.type === TYPE.FILE) {
    const parents = parentsOf(n.id).length;
    if (parents > 1) return { fill: "#a855f720", stroke: "#a855f7" }; // shared
    return { fill: "#22c55e20", stroke: "#22c55e" };
  }
  if (n.type === TYPE.ROOT) return { fill: "#3b82f625", stroke: "#3b82f6" };
  if (n.type === TYPE.USER) return { fill: "#f59e0b20", stroke: "#f59e0b" };
  return { fill: "#3b82f615", stroke: "#60a5fa" };
}

function drawArrow(x1, y1, x2, y2, color, label, isShared) {
  const headLen = 10;
  const dx = x2 - x1,
    dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len,
    uy = dy / len;
  // Shorten to node boundary
  const R = 26;
  const ex = x2 - ux * R,
    ey = y2 - uy * R;
  const sx = x1 + ux * R,
    sy = y1 + uy * R;

  ctx.save();
  ctx.strokeStyle = isShared ? "#a855f7" : color;
  ctx.lineWidth = isShared ? 1.8 : 1.2;
  if (isShared) ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.setLineDash([]);

  // Arrowhead
  const angle = Math.atan2(ey - sy, ex - sx);
  ctx.fillStyle = isShared ? "#a855f7" : color;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(
    ex - headLen * Math.cos(angle - 0.4),
    ey - headLen * Math.sin(angle - 0.4),
  );
  ctx.lineTo(
    ex - headLen * Math.cos(angle + 0.4),
    ey - headLen * Math.sin(angle + 0.4),
  );
  ctx.closePath();
  ctx.fill();

  // Edge label
  if (label) {
    const mx = (sx + ex) / 2,
      my = (sy + ey) / 2;
    ctx.fillStyle = isShared ? "#a855f7" : color;
    ctx.font = "500 10px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, mx, my - 6);
  }
  ctx.restore();
}

function drawNode(n) {
  const { fill, stroke } = nodeColor(n);
  const r = 28;
  const isHighlighted = n.highlight > 0;

  ctx.save();
  // Glow for highlighted
  if (isHighlighted) {
    ctx.shadowColor = stroke;
    ctx.shadowBlur = 16;
  }
  ctx.beginPath();
  ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
  ctx.fillStyle = isHighlighted ? stroke + "44" : fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Icon
  const icon =
    n.type === TYPE.FILE
      ? "📄"
      : n.type === TYPE.ROOT
        ? "🗂"
        : n.type === TYPE.USER
          ? "👤"
          : "📁";
  ctx.font = "16px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(icon, n.x, n.y - 4);

  // Name label below
  ctx.font = "500 10px JetBrains Mono, monospace";
  ctx.fillStyle = stroke;
  ctx.textBaseline = "top";
  ctx.fillText(
    n.name.length > 12 ? n.name.slice(0, 11) + "…" : n.name,
    n.x,
    n.y + r + 4,
  );

  // Ref count badge for shared files
  if (n.type === TYPE.FILE && parentsOf(n.id).length > 1) {
    const rc = parentsOf(n.id).length;
    ctx.beginPath();
    ctx.arc(n.x + r - 6, n.y - r + 6, 9, 0, Math.PI * 2);
    ctx.fillStyle = "#a855f7";
    ctx.fill();
    ctx.font = "bold 9px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(rc, n.x + r - 6, n.y - r + 6);
  }
  ctx.restore();
}

function drawFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Edges
  const edgeColor = cssVar("--border-default") || "#94a3b8";
  for (const e of fsState.edges) {
    const a = findNode(e.from),
      b = findNode(e.to);
    if (!a || !b) continue;
    const isShared = b.type === TYPE.FILE && parentsOf(b.id).length > 1;
    drawArrow(a.x, a.y, b.x, b.y, edgeColor, e.label, isShared);
  }

  // Nodes
  for (const n of fsState.nodes) {
    drawNode(n);
    if (n.highlight > 0) n.highlight -= 0.02;
  }

  animFrame = requestAnimationFrame(drawFrame);
}

// ── Mouse drag ───────────────────────────────────────────────────
function nodeAt(cx, cy) {
  return fsState.nodes
    .slice()
    .reverse()
    .find((n) => Math.hypot(n.x - cx, n.y - cy) < 32);
}

function canvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const src = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - rect.left) * scaleX,
    y: (src.clientY - rect.top) * scaleY,
  };
}

// ══════════════════════════════════════════════════════════════════
//  OPERATION PANELS (built per model)
// ══════════════════════════════════════════════════════════════════

function buildOpPanel() {
  const el = document.getElementById("opControls");

  if (currentModel === "single") {
    el.innerHTML = `
      <div class="op-row">
        <div class="form-group">
          <label class="form-label">Add File</label>
          <div style="display:flex;gap:.5rem">
            <input id="newFileName" class="form-input form-mono" placeholder="File name" style="width:140px">
            <button class="btn btn-secondary" id="btnAddFile">Add File</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Delete File</label>
          <div style="display:flex;gap:.5rem">
            <input id="delFileName" class="form-input form-mono" placeholder="File name" style="width:140px">
            <button class="btn btn-ghost" id="btnDelFile">Delete</button>
          </div>
        </div>
        <button class="btn btn-ghost" id="btnReset">Reset</button>
      </div>`;
    document.getElementById("btnAddFile").onclick = opSingleAdd;
    document.getElementById("btnDelFile").onclick = opSingleDel;
    document.getElementById("btnReset").onclick = () => resetModel();
  } else if (currentModel === "two") {
    el.innerHTML = `
      <div class="op-row">
        <div class="form-group">
          <label class="form-label">Add User</label>
          <div style="display:flex;gap:.5rem">
            <input id="newUserName" class="form-input form-mono" placeholder="User name" style="width:120px">
            <button class="btn btn-secondary" id="btnAddUser">Add User</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Delete User</label>
          <div style="display:flex;gap:.5rem">
            <input id="delUserName" class="form-input form-mono" placeholder="User name" style="width:120px">
            <button class="btn btn-ghost" id="btnDelUser">Delete User</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Add File to User</label>
          <div style="display:flex;gap:.5rem">
            <input id="fileUser" class="form-input form-mono" placeholder="User" style="width:100px">
            <input id="fileName2" class="form-input form-mono" placeholder="File" style="width:100px">
            <button class="btn btn-secondary" id="btnAddFile2">Add</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Delete File from User</label>
          <div style="display:flex;gap:.5rem">
            <input id="delFileUser" class="form-input form-mono" placeholder="User" style="width:100px">
            <input id="delFileName2" class="form-input form-mono" placeholder="File" style="width:100px">
            <button class="btn btn-ghost" id="btnDelFile2">Delete</button>
          </div>
        </div>
        <button class="btn btn-ghost" id="btnReset">Reset</button>
      </div>`;
    document.getElementById("btnAddUser").onclick = opTwoAddUser;
    document.getElementById("btnDelUser").onclick = opTwoDelUser;
    document.getElementById("btnAddFile2").onclick = opTwoAddFile;
    document.getElementById("btnDelFile2").onclick = opTwoDelFile;
    document.getElementById("btnReset").onclick = () => resetModel();
  } else if (currentModel === "tree") {
    el.innerHTML = `
      <div class="op-row">
        <div class="form-group">
          <label class="form-label">Add Directory</label>
          <div style="display:flex;gap:.5rem">
            <input id="treeParent" class="form-input form-mono" placeholder="Parent dir" style="width:110px">
            <input id="treeDirName" class="form-input form-mono" placeholder="New dir" style="width:110px">
            <button class="btn btn-secondary" id="btnAddDir">Add Dir</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Delete Directory</label>
          <div style="display:flex;gap:.5rem">
            <input id="delDirName" class="form-input form-mono" placeholder="Dir name" style="width:140px">
            <button class="btn btn-ghost" id="btnDelDir">Delete Dir</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Add File</label>
          <div style="display:flex;gap:.5rem">
            <input id="treeFileParent" class="form-input form-mono" placeholder="Parent dir" style="width:110px">
            <input id="treeFileName" class="form-input form-mono" placeholder="File name" style="width:110px">
            <button class="btn btn-secondary" id="btnAddTreeFile">Add File</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Delete File</label>
          <div style="display:flex;gap:.5rem">
            <input id="delTreeFileName" class="form-input form-mono" placeholder="File name" style="width:140px">
            <button class="btn btn-ghost" id="btnDelTreeFile">Delete File</button>
          </div>
        </div>
        <button class="btn btn-ghost" id="btnReset">Reset</button>
      </div>`;
    document.getElementById("btnAddDir").onclick = opTreeAddDir;
    document.getElementById("btnDelDir").onclick = opTreeDelDir;
    document.getElementById("btnAddTreeFile").onclick = opTreeAddFile;
    document.getElementById("btnDelTreeFile").onclick = opTreeDelFile;
    document.getElementById("btnReset").onclick = () => resetModel();
  } else if (currentModel === "dag") {
    el.innerHTML = `
      <div class="op-row">
        <div class="form-group">
          <label class="form-label">Create Directory</label>
          <div style="display:flex;gap:.5rem">
            <input id="dagNewDir" class="form-input form-mono" placeholder="Dir name" style="width:130px">
            <button class="btn btn-secondary" id="btnDagDir">Create Dir</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Create File</label>
          <div style="display:flex;gap:.5rem">
            <input id="dagFileDir" class="form-input form-mono" placeholder="In directory" style="width:110px">
            <input id="dagFileName" class="form-input form-mono" placeholder="File name" style="width:110px">
            <button class="btn btn-secondary" id="btnDagFile">Create</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Share File (Hard Link)</label>
          <div style="display:flex;gap:.5rem">
            <input id="dagShareFile" class="form-input form-mono" placeholder="File name" style="width:110px">
            <input id="dagShareDir"  class="form-input form-mono" placeholder="Target dir" style="width:110px">
            <button class="btn btn-primary" id="btnDagShare">Share</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Remove Link</label>
          <div style="display:flex;gap:.5rem">
            <input id="dagUnlinkFile" class="form-input form-mono" placeholder="File name" style="width:110px">
            <input id="dagUnlinkDir"  class="form-input form-mono" placeholder="From dir" style="width:110px">
            <button class="btn btn-ghost" id="btnDagUnlink">Unlink</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Delete Directory</label>
          <div style="display:flex;gap:.5rem">
            <input id="dagDelDir" class="form-input form-mono" placeholder="Dir name" style="width:140px">
            <button class="btn btn-ghost" id="btnDagDelDir">Delete Dir</button>
          </div>
        </div>
        <button class="btn btn-ghost" id="btnReset">Reset</button>
      </div>`;
    document.getElementById("btnDagDir").onclick = opDagCreateDir;
    document.getElementById("btnDagFile").onclick = opDagCreateFile;
    document.getElementById("btnDagShare").onclick = opDagShare;
    document.getElementById("btnDagUnlink").onclick = opDagUnlink;
    document.getElementById("btnDagDelDir").onclick = opDagDelDir;
    document.getElementById("btnReset").onclick = () => resetModel();
  }
}

// ══════════════════════════════════════════════════════════════════
//  OPERATIONS — Single-Level
// ══════════════════════════════════════════════════════════════════
function opSingleAdd() {
  const name = document.getElementById("newFileName").value.trim();
  if (!name) return showToast("Enter a file name", "error");
  if (fsState.nodes.find((n) => n.type === TYPE.FILE && n.name === name))
    return showToast(
      "File name already exists (names must be unique in single-level)",
      "error",
    );
  const root = fsState.nodes.find((n) => n.type === TYPE.ROOT);
  const count = fsState.nodes.filter((n) => n.type === TYPE.FILE).length;
  const f = makeNode(name, TYPE.FILE, {
    x: 80 + (count % 6) * 100,
    y: 220 + Math.floor(count / 6) * 100,
  });
  fsState.nodes.push(f);
  addEdge(root.id, f.id);
  f.highlight = 1;
  logTrace(`Created file "${name}" in root directory.`, "success");
  showToast(`File "${name}" added`, "success");
  updateSidebar();
  document.getElementById("newFileName").value = "";
}

function opSingleDel() {
  const name = document.getElementById("delFileName").value.trim();
  const f = fsState.nodes.find((n) => n.type === TYPE.FILE && n.name === name);
  if (!f) return showToast(`File "${name}" not found`, "error");
  fsState.edges = fsState.edges.filter((e) => e.from !== f.id && e.to !== f.id);
  fsState.nodes = fsState.nodes.filter((n) => n.id !== f.id);
  logTrace(`Deleted file "${name}" from directory.`, "warn");
  showToast(`File "${name}" deleted`, "info");
  updateSidebar();
  document.getElementById("delFileName").value = "";
}

// ══════════════════════════════════════════════════════════════════
//  OPERATIONS — Two-Level
// ══════════════════════════════════════════════════════════════════
function opTwoAddUser() {
  const name = document.getElementById("newUserName").value.trim();
  if (!name) return showToast("Enter a user name", "error");
  if (fsState.nodes.find((n) => n.type === TYPE.USER && n.name === name))
    return showToast("User already exists", "error");
  const master = fsState.nodes.find((n) => n.type === TYPE.ROOT);
  const uCount = fsState.nodes.filter((n) => n.type === TYPE.USER).length;
  const u = makeNode(name, TYPE.USER, { x: 100 + uCount * 200, y: 190 });
  fsState.nodes.push(u);
  addEdge(master.id, u.id);
  u.highlight = 1;
  logTrace(
    `Created user directory "${name}" under Master Directory.`,
    "success",
  );
  showToast(`User "${name}" added`, "success");
  updateSidebar();
  document.getElementById("newUserName").value = "";
}

function opTwoAddFile() {
  const userName = document.getElementById("fileUser").value.trim();
  const fileName = document.getElementById("fileName2").value.trim();
  if (!userName || !fileName)
    return showToast("Fill in both user and file name", "error");
  const u = fsState.nodes.find(
    (n) => n.type === TYPE.USER && n.name === userName,
  );
  if (!u) return showToast(`User "${userName}" not found`, "error");
  // File names must be unique within user directory
  const siblings = childrenOf(u.id).map((n) => n.name);
  if (siblings.includes(fileName))
    return showToast(
      `File "${fileName}" already in ${userName}'s directory`,
      "error",
    );
  const uFiles = childrenOf(u.id).length;
  const f = makeNode(fileName, TYPE.FILE, {
    x: u.x - 60 + uFiles * 80,
    y: u.y + 140,
  });
  fsState.nodes.push(f);
  addEdge(u.id, f.id);
  f.highlight = 1;
  logTrace(
    `Created file "${fileName}" in user directory "${userName}".`,
    "success",
  );
  showToast(`File added to ${userName}`, "success");
  updateSidebar();
  document.getElementById("fileUser").value = "";
  document.getElementById("fileName2").value = "";
}

function opTwoDelUser() {
  const name = document.getElementById("delUserName").value.trim();
  if (!name) return showToast("Enter a user name", "error");
  const u = fsState.nodes.find((n) => n.type === TYPE.USER && n.name === name);
  if (!u) return showToast(`User "${name}" not found`, "error");

  // Collect all files owned only by this user
  const ownedFiles = childrenOf(u.id);
  const deletedFiles = [];

  ownedFiles.forEach((f) => {
    // Remove the edge from this user to the file
    removeEdge(u.id, f.id);
    // In two-level model files have exactly one parent (the user dir), so delete the file too
    const remaining = parentsOf(f.id).length;
    if (remaining === 0) {
      fsState.nodes = fsState.nodes.filter((n) => n.id !== f.id);
      fsState.edges = fsState.edges.filter(
        (e) => e.from !== f.id && e.to !== f.id,
      );
      deletedFiles.push(f.name);
    }
  });

  // Remove edge from master to user, then remove user node
  const master = fsState.nodes.find((n) => n.type === TYPE.ROOT);
  removeEdge(master.id, u.id);
  fsState.nodes = fsState.nodes.filter((n) => n.id !== u.id);
  fsState.edges = fsState.edges.filter((e) => e.from !== u.id && e.to !== u.id);

  const fileList = deletedFiles.length
    ? ` (deleted files: ${deletedFiles.join(", ")})`
    : "";
  logTrace(`Deleted user directory "${name}"${fileList}.`, "warn");
  showToast(`User "${name}" deleted`, "info");
  updateSidebar();
  document.getElementById("delUserName").value = "";
}

function opTwoDelFile() {
  const userName = document.getElementById("delFileUser").value.trim();
  const fileName = document.getElementById("delFileName2").value.trim();
  if (!userName || !fileName)
    return showToast("Fill in both user and file name", "error");

  const u = fsState.nodes.find(
    (n) => n.type === TYPE.USER && n.name === userName,
  );
  if (!u) return showToast(`User "${userName}" not found`, "error");

  const f = childrenOf(u.id).find((n) => n.name === fileName);
  if (!f)
    return showToast(
      `File "${fileName}" not found in "${userName}"'s directory`,
      "error",
    );

  removeEdge(u.id, f.id);
  // In two-level, each file has exactly one parent user — safe to delete
  fsState.nodes = fsState.nodes.filter((n) => n.id !== f.id);
  fsState.edges = fsState.edges.filter((e) => e.from !== f.id && e.to !== f.id);

  logTrace(`Deleted file "${fileName}" from user "${userName}".`, "warn");
  showToast(`File "${fileName}" deleted from ${userName}`, "info");
  updateSidebar();
  document.getElementById("delFileUser").value = "";
  document.getElementById("delFileName2").value = "";
}

// ══════════════════════════════════════════════════════════════════
//  OPERATIONS — Tree
// ══════════════════════════════════════════════════════════════════
function opTreeAddDir() {
  const parentName = document.getElementById("treeParent").value.trim();
  const dirName = document.getElementById("treeDirName").value.trim();
  if (!parentName || !dirName)
    return showToast("Fill in parent and new directory name", "error");
  const parent = fsState.nodes.find(
    (n) => [TYPE.ROOT, TYPE.DIR].includes(n.type) && n.name === parentName,
  );
  if (!parent) return showToast(`Directory "${parentName}" not found`, "error");
  const d = makeNode(dirName, TYPE.DIR, {
    x: parent.x + (Math.random() - 0.5) * 200,
    y: parent.y + 120,
  });
  fsState.nodes.push(d);
  addEdge(parent.id, d.id);
  d.highlight = 1;
  logTrace(`Created directory "${dirName}" under "${parentName}".`, "success");
  showToast(`Directory "${dirName}" created`, "success");
  updateSidebar();
  document.getElementById("treeParent").value = "";
  document.getElementById("treeDirName").value = "";
}

function opTreeAddFile() {
  const parentName = document.getElementById("treeFileParent").value.trim();
  const fileName = document.getElementById("treeFileName").value.trim();
  if (!parentName || !fileName)
    return showToast("Fill in parent directory and file name", "error");
  const parent = fsState.nodes.find(
    (n) => [TYPE.ROOT, TYPE.DIR].includes(n.type) && n.name === parentName,
  );
  if (!parent) return showToast(`Directory "${parentName}" not found`, "error");
  const f = makeNode(fileName, TYPE.FILE, {
    x: parent.x + (Math.random() - 0.5) * 160,
    y: parent.y + 110,
  });
  fsState.nodes.push(f);
  addEdge(parent.id, f.id);
  f.highlight = 1;
  logTrace(`Created file "${fileName}" under "${parentName}".`, "success");
  showToast(`File "${fileName}" created`, "success");
  updateSidebar();
  document.getElementById("treeFileParent").value = "";
  document.getElementById("treeFileName").value = "";
}

function opTreeDelDir() {
  const name = document.getElementById("delDirName").value.trim();
  if (!name) return showToast("Enter a directory name", "error");

  const dir = fsState.nodes.find((n) => n.type === TYPE.DIR && n.name === name);
  if (!dir)
    return showToast(
      `Directory "${name}" not found (cannot delete Root)`,
      "error",
    );

  // Recursively collect all descendant node IDs
  function collectDescendants(nodeId) {
    const ids = [nodeId];
    childrenOf(nodeId).forEach((child) => {
      ids.push(...collectDescendants(child.id));
    });
    return ids;
  }

  const toDelete = collectDescendants(dir.id);
  const fileCount = toDelete.filter((id) => {
    const n = findNode(id);
    return n && n.type === TYPE.FILE;
  }).length;
  const dirCount =
    toDelete.filter((id) => {
      const n = findNode(id);
      return n && [TYPE.DIR].includes(n.type);
    }).length - 1; // subtract the dir itself

  // Remove all edges involving any of these nodes
  fsState.edges = fsState.edges.filter(
    (e) => !toDelete.includes(e.from) && !toDelete.includes(e.to),
  );
  // Remove all the nodes
  fsState.nodes = fsState.nodes.filter((n) => !toDelete.includes(n.id));

  logTrace(
    `Deleted directory "${name}" and its subtree (${dirCount} subdirs, ${fileCount} files removed).`,
    "warn",
  );
  showToast(`Directory "${name}" deleted (subtree removed)`, "info");
  updateSidebar();
  document.getElementById("delDirName").value = "";
}

function opTreeDelFile() {
  const name = document.getElementById("delTreeFileName").value.trim();
  if (!name) return showToast("Enter a file name", "error");

  const f = fsState.nodes.find((n) => n.type === TYPE.FILE && n.name === name);
  if (!f) return showToast(`File "${name}" not found`, "error");

  // In a tree each file has exactly one parent
  fsState.edges = fsState.edges.filter((e) => e.from !== f.id && e.to !== f.id);
  fsState.nodes = fsState.nodes.filter((n) => n.id !== f.id);

  logTrace(`Deleted file "${name}" from tree.`, "warn");
  showToast(`File "${name}" deleted`, "info");
  updateSidebar();
  document.getElementById("delTreeFileName").value = "";
}

// ══════════════════════════════════════════════════════════════════
//  OPERATIONS — DAG
// ══════════════════════════════════════════════════════════════════
function opDagCreateDir() {
  const name = document.getElementById("dagNewDir").value.trim();
  if (!name) return showToast("Enter a directory name", "error");
  if (fsState.nodes.find((n) => n.name === name))
    return showToast("Name already exists", "error");
  const root = fsState.nodes.find((n) => n.type === TYPE.ROOT);
  const count = fsState.nodes.filter((n) => n.type === TYPE.DIR).length;
  const d = makeNode(name, TYPE.DIR, { x: 120 + count * 180, y: 200 });
  fsState.nodes.push(d);
  addEdge(root.id, d.id);
  d.highlight = 1;
  logTrace(`Created directory "${name}" under Root.`, "success");
  showToast(`Directory "${name}" created`, "success");
  updateSidebar();
  document.getElementById("dagNewDir").value = "";
}

function opDagCreateFile() {
  const dirName = document.getElementById("dagFileDir").value.trim();
  const fileName = document.getElementById("dagFileName").value.trim();
  if (!dirName || !fileName)
    return showToast("Fill in directory and file name", "error");
  const dir = fsState.nodes.find(
    (n) => [TYPE.DIR, TYPE.ROOT].includes(n.type) && n.name === dirName,
  );
  if (!dir) return showToast(`Directory "${dirName}" not found`, "error");
  if (fsState.nodes.find((n) => n.type === TYPE.FILE && n.name === fileName))
    return showToast(
      `File "${fileName}" already exists — use Share to link it to more directories`,
      "info",
    );
  const f = makeNode(fileName, TYPE.FILE, {
    x: dir.x + (Math.random() - 0.5) * 120,
    y: dir.y + 150,
  });
  fsState.nodes.push(f);
  addEdge(dir.id, f.id, "link");
  f.highlight = 1;
  logTrace(
    `Created file "${fileName}" in "${dirName}". Reference count = 1.`,
    "success",
  );
  showToast(`File "${fileName}" created`, "success");
  updateSidebar();
  document.getElementById("dagFileDir").value = "";
  document.getElementById("dagFileName").value = "";
}

function opDagShare() {
  const fileName = document.getElementById("dagShareFile").value.trim();
  const dirName = document.getElementById("dagShareDir").value.trim();
  if (!fileName || !dirName)
    return showToast("Fill in file and target directory", "error");
  const file = fsState.nodes.find(
    (n) => n.type === TYPE.FILE && n.name === fileName,
  );
  if (!file) return showToast(`File "${fileName}" not found`, "error");
  const dir = fsState.nodes.find(
    (n) => [TYPE.DIR, TYPE.ROOT].includes(n.type) && n.name === dirName,
  );
  if (!dir) return showToast(`Directory "${dirName}" not found`, "error");
  if (fsState.edges.find((e) => e.from === dir.id && e.to === file.id))
    return showToast(
      `"${dirName}" already has a link to "${fileName}"`,
      "warn",
    );
  addEdge(dir.id, file.id, "link");
  file.highlight = 1;
  const refCount = parentsOf(file.id).length;
  logTrace(
    `Hard link created: "${dirName}" → "${fileName}". Reference count = ${refCount}.`,
    "purple",
  );
  showToast(`File shared! Ref count = ${refCount}`, "success");
  updateSidebar();
  document.getElementById("dagShareFile").value = "";
  document.getElementById("dagShareDir").value = "";
}

function opDagUnlink() {
  const fileName = document.getElementById("dagUnlinkFile").value.trim();
  const dirName = document.getElementById("dagUnlinkDir").value.trim();
  if (!fileName || !dirName)
    return showToast("Fill in file and directory names", "error");
  const file = fsState.nodes.find(
    (n) => n.type === TYPE.FILE && n.name === fileName,
  );
  if (!file) return showToast(`File "${fileName}" not found`, "error");
  const dir = fsState.nodes.find(
    (n) => [TYPE.DIR, TYPE.ROOT].includes(n.type) && n.name === dirName,
  );
  if (!dir) return showToast(`Directory "${dirName}" not found`, "error");
  if (!fsState.edges.find((e) => e.from === dir.id && e.to === file.id))
    return showToast(`No link from "${dirName}" to "${fileName}"`, "error");

  removeEdge(dir.id, file.id);
  const refCount = parentsOf(file.id).length;
  logTrace(
    `Removed link: "${dirName}" → "${fileName}". Reference count = ${refCount}.`,
    "warn",
  );

  if (refCount === 0) {
    // Safe to delete
    fsState.nodes = fsState.nodes.filter((n) => n.id !== file.id);
    fsState.edges = fsState.edges.filter(
      (e) => e.from !== file.id && e.to !== file.id,
    );
    logTrace(
      `Reference count reached 0 — "${fileName}" deleted from disk.`,
      "error",
    );
    showToast(`File deleted (ref=0)`, "info");
  } else {
    file.highlight = 0.5;
    logTrace(
      `File "${fileName}" still referenced by ${refCount} director${refCount === 1 ? "y" : "ies"}. Not deleted.`,
      "success",
    );
    showToast(`Ref count now ${refCount}`, "info");
  }
  updateSidebar();
  document.getElementById("dagUnlinkFile").value = "";
  document.getElementById("dagUnlinkDir").value = "";
}

function opDagDelDir() {
  const name = document.getElementById("dagDelDir").value.trim();
  if (!name) return showToast("Enter a directory name", "error");

  const dir = fsState.nodes.find((n) => n.type === TYPE.DIR && n.name === name);
  if (!dir)
    return showToast(
      `Directory "${name}" not found (cannot delete Root)`,
      "error",
    );

  // Get all files directly linked from this directory
  const linkedFiles = childrenOf(dir.id).filter((n) => n.type === TYPE.FILE);
  const deletedFiles = [];

  linkedFiles.forEach((file) => {
    // Remove the link from this dir to the file
    removeEdge(dir.id, file.id);
    const refCount = parentsOf(file.id).length;
    if (refCount === 0) {
      // No more references — delete the file from disk
      fsState.nodes = fsState.nodes.filter((n) => n.id !== file.id);
      fsState.edges = fsState.edges.filter(
        (e) => e.from !== file.id && e.to !== file.id,
      );
      deletedFiles.push(`${file.name}(deleted)`);
      logTrace(
        `Reference count of "${file.name}" reached 0 — deleted from disk.`,
        "error",
      );
    } else {
      deletedFiles.push(`${file.name}(ref=${refCount})`);
      logTrace(
        `Removed link to "${file.name}". Ref count now ${refCount} — file retained.`,
        "warn",
      );
    }
  });

  // Also remove any subdirectory links from this dir
  const linkedDirs = childrenOf(dir.id).filter((n) => n.type === TYPE.DIR);
  linkedDirs.forEach((d) => removeEdge(dir.id, d.id));

  // Remove edge from parent(s) to this dir, then remove the dir node
  fsState.edges = fsState.edges.filter(
    (e) => e.from !== dir.id && e.to !== dir.id,
  );
  fsState.nodes = fsState.nodes.filter((n) => n.id !== dir.id);

  const summary = deletedFiles.length
    ? ` | files: ${deletedFiles.join(", ")}`
    : "";
  logTrace(`Deleted directory "${name}"${summary}.`, "warn");
  showToast(`Directory "${name}" deleted`, "info");
  updateSidebar();
  document.getElementById("dagDelDir").value = "";
}

// ══════════════════════════════════════════════════════════════════
//  MODEL SWITCH
// ══════════════════════════════════════════════════════════════════
function switchModel(model) {
  currentModel = model;
  document.querySelectorAll(".dir-tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.model === model);
  });
  resetModel();
}

function resetModel() {
  clearLog();
  buildInitialState(currentModel);
  buildOpPanel();
  updateModelDesc();
  updateLegend();
  updateSidebar();
  logTrace(`Loaded ${currentModel.toUpperCase()} model.`, "info");
}

// ══════════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("fsCanvas");
  ctx = canvas.getContext("2d");

  // Tab clicks
  document.querySelectorAll(".dir-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchModel(btn.dataset.model));
  });

  // Drag-to-reposition nodes
  canvas.addEventListener("mousedown", (e) => {
    const { x, y } = canvasCoords(e);
    dragNode = nodeAt(x, y);
    if (dragNode) {
      isDragging = true;
      dragOffX = dragNode.x - x;
      dragOffY = dragNode.y - y;
    }
  });
  canvas.addEventListener("mousemove", (e) => {
    if (!isDragging || !dragNode) return;
    const { x, y } = canvasCoords(e);
    dragNode.x = x + dragOffX;
    dragNode.y = y + dragOffY;
  });
  canvas.addEventListener("mouseup", () => {
    isDragging = false;
    dragNode = null;
  });
  canvas.addEventListener("mouseleave", () => {
    isDragging = false;
    dragNode = null;
  });
  canvas.addEventListener(
    "touchstart",
    (e) => {
      const { x, y } = canvasCoords(e);
      dragNode = nodeAt(x, y);
      if (dragNode) {
        isDragging = true;
        dragOffX = dragNode.x - x;
        dragOffY = dragNode.y - y;
      }
    },
    { passive: true },
  );
  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (!isDragging || !dragNode) return;
      const { x, y } = canvasCoords(e);
      dragNode.x = x + dragOffX;
      dragNode.y = y + dragOffY;
    },
    { passive: true },
  );
  canvas.addEventListener("touchend", () => {
    isDragging = false;
    dragNode = null;
  });

  // Start
  switchModel("single");
  drawFrame();
});
