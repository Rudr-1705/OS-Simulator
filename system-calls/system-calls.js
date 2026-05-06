const SYSCALLS = {
  fork:   { num:2,  cat:"Process", syntax:"pid_t fork(void)", desc:"Creates a new child process by duplicating the calling process. Returns 0 in child, child PID in parent, -1 on error.", params:[], ret:"pid_t — 0 in child, child PID in parent", effect:"New process created in process table. Both parent and child continue from next instruction.", examples: [], sim(args){
    const childNode = createProcessNode(currentProcess.pid);
    currentProcess.children.push(childNode);
    renderProcessTree();
    return {parent:`Child PID=${childNode.pid}`, child:"PID=0 (in child process)"}; 
  } },
exec: {
  num:11,
  cat:"Process",
  syntax:"int execvp(const char *file, char *const argv[])",
  desc:"Replaces current process image with a new program. Does not return on success.",
  params:[
    "file: program path",
    "argv: argument vector"
  ],
  ret:"int — -1 on error, no return on success",
  effect:"Current process image replaced. Code, data, heap, stack all replaced.",

  examples: [
    {
      label: "Output Hello",
      fields: {
        file: "/bin/echo",
        argv: 'echo hello'
      },
      explanation: `
Executes the echo program to print text to stdout.

file = "/bin/echo"
argv = {"echo", "hello", NULL}

What happens:
- Kernel loads /bin/echo into process memory
- Previous process image is destroyed
- echo receives "hello" as argument
- Terminal output becomes:

hello
`
    },

    {
      label: "List Hidden Files (ls -a)",
      fields: {
        file: "/bin/ls",
        argv: 'ls -a'
      },
      explanation: `
Executes ls with the -a flag to show hidden files.

file = "/bin/ls"
argv = {"ls", "-a", NULL}

What happens:
- Current process image is replaced by /bin/ls
- ls executes with the -a option
- Directory contents including hidden files are displayed
- Files beginning with "." become visible
`
    }
  ],

  sim(args){
    return {
      result: (args[0] || "/bin/ls") + " loaded into process space"
    };
  }
},
  wait:   { num:7,  cat:"Process", syntax:"pid_t wait(int *wstatus)", desc:"Suspends execution of the calling process until one of its children terminates.", params:["wstatus: pointer to exit status (can be NULL)"], ret:"pid_t — PID of terminated child, -1 on error", effect:"Parent blocks in WAIT state until child exits. Child becomes zombie until wait() called.", examples: [{label: "Wait for child (NULL)", fields: {wstatus: "NULL"}, explanation: "Parent waits for any child process to terminate, ignores exit status"}], sim(){ return {childPid: Math.floor(Math.random()*9000)+100, exitCode: 0}; } },
  open:   { num:5,  cat:"File",    syntax:"int open(const char *pathname, int flags, mode_t mode)", desc:"Opens a file and returns a file descriptor. Creates the file if O_CREAT is specified.", params:["pathname: path to file","flags: O_RDONLY | O_WRONLY | O_CREAT | O_TRUNC","mode: file permissions (e.g. 0644)"], ret:"int — file descriptor ≥ 0, or -1 on error", effect:"File descriptor allocated in process FD table. File opened in kernel.", examples: [{label: "Read /etc/passwd", fields: {pathname: "/etc/passwd", flags: "O_RDONLY"}, explanation: "Opens /etc/passwd file in read-only mode, returns FD to read user info"}, {label: "Create new file", fields: {pathname: "/tmp/newfile.txt", flags: "O_CREAT|O_WRONLY", mode: "0644"}, explanation: "Creates new file with read/write permissions for owner, read for others"}], sim(args){ return runFileSyscall("open", args); } },
  read:   { num:3,  cat:"File",    syntax:"ssize_t read(int fd, void *buf, size_t count)", desc:"Reads up to count bytes from file descriptor fd into the buffer starting at buf.", params:["fd: open file descriptor","buf: buffer to read into","count: max bytes to read"], ret:"ssize_t — bytes read, 0 on EOF, -1 on error", effect:"Data transferred from kernel buffer to user buffer. File position advances.", examples: [{label: "Read 1024 bytes", fields: {fd: "3", buf: "buffer", count: "1024"}, explanation: "Reads up to 1024 bytes from FD 3 into buffer (typical page size)"}, {label: "Read small chunk", fields: {fd: "4", buf: "buf", count: "512"}, explanation: "Reads up to 512 bytes from FD 4 (half page)"}], sim(args){ return runFileSyscall("read", args); } },
  write:  { num:4,  cat:"File",    syntax:"ssize_t write(int fd, const void *buf, size_t count)", desc:"Writes up to count bytes from buf to the file referred to by fd.", params:["fd: open file descriptor","buf: data to write","count: bytes to write"], ret:"ssize_t — bytes written, -1 on error", effect:"Data copied from user buffer to kernel. Written to storage on flush.", examples: [{label: "Write to stdout", fields: {fd: "1", buf: "Hello, World!", count: "13"}, explanation: "Writes 13 bytes to stdout (FD 1), output appears on console"}, {label: "Write to file", fields: {fd: "3", buf: "data", count: "4"}, explanation: "Writes 4 bytes to file open on FD 3"}], sim(args){ return runFileSyscall("write", args); } },
  close:  { num:6,  cat:"File",    syntax:"int close(int fd)", desc:"Closes a file descriptor, freeing it for reuse.", params:["fd: file descriptor to close"], ret:"int — 0 on success, -1 on error", effect:"File descriptor released. If last FD for file, kernel flushes buffers.", examples: [{label: "Close FD 3", fields: {fd: "3"}, explanation: "Closes file descriptor 3, releases the slot for reuse"}, {label: "Close FD 4", fields: {fd: "4"}, explanation: "Closes file descriptor 4"}], sim(args){ return runFileSyscall("close", args); } },
  getpid: { num:20, cat:"Info",    syntax:"pid_t getpid(void)", desc:"Returns the PID of the calling process. Never fails.", params:[], ret:"pid_t — always succeeds", effect:"No state change. Kernel reads from process control block.", examples: [], sim(){ return {pid: currentProcess.pid}; } },
};

const CATEGORIES = [...new Set(Object.values(SYSCALLS).map(s => s.cat))];
let selectedCall = "fork";

let processTree = {
  id: 1,
  pid: 1000,
  name: "init",
  children: [],
  level: 0
};
let currentProcess = processTree;
let nextPid = 1001;

let waitChildren = [
  { pid: 1001, state: "RUNNING", exitCode: null },
  { pid: 1002, state: "RUNNING", exitCode: null },
  { pid: 1003, state: "RUNNING", exitCode: null }
];
let parentWaiting = false;
let waitedPid = null;

const FILE_SYSCALLS = new Set(["open", "read", "write", "close"]);
const fileSystemSeed = {
  "/etc/passwd": "root:x:0:0:root:/root:/bin/bash\nstudent:x:1000:1000:Student:/home/student:/bin/sh\n",
  "/tmp/notes.txt": "OS lab notes\nProcesses, files, and memory.\n",
  "/var/log/app.log": "boot ok\nworker started\n"
};
let fileVizState = createFileVizState();

function createFileVizState() {
  return {
    nextFd: 3,
    openFiles: [],
    files: { ...fileSystemSeed },
    userBuffer: "",
    terminalBuffer: "",
    lastAction: "Open a file to populate the descriptor table.",
    highlightFd: null,
    highlightPath: null,
    highlightRange: null,
    lastResult: null
  };
}

function resetFileVizState() {
  fileVizState = createFileVizState();
  renderFileVisualization();
}

function findOpenFile(fd) {
  return fileVizState.openFiles.find(file => file.fd === fd);
}

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeFlags(flags) {
  return (flags || "O_RDONLY").trim() || "O_RDONLY";
}

function ensureFilePath(path, flags) {
  const normalizedPath = (path || "/tmp/notes.txt").trim() || "/tmp/notes.txt";
  if (!(normalizedPath in fileVizState.files)) {
    if (!flags.includes("O_CREAT")) {
      return { error: `ENOENT: ${normalizedPath} does not exist` };
    }
    fileVizState.files[normalizedPath] = "";
  }
  if (flags.includes("O_TRUNC")) {
    fileVizState.files[normalizedPath] = "";
  }
  return { path: normalizedPath };
}

function runFileSyscall(kind, args) {
  fileVizState.highlightRange = null;
  fileVizState.lastResult = null;

  if (kind === "open") {
    const flags = normalizeFlags(args[1]);
    const ensured = ensureFilePath(args[0], flags);
    if (ensured.error) {
      fileVizState.lastAction = ensured.error;
      fileVizState.highlightFd = null;
      fileVizState.highlightPath = null;
      return { error: ensured.error };
    }

    const fd = fileVizState.nextFd++;
    const entry = {
      fd,
      path: ensured.path,
      flags,
      offset: 0,
      mode: (args[2] || "0644").trim() || "0644"
    };
    fileVizState.openFiles.push(entry);
    fileVizState.highlightFd = fd;
    fileVizState.highlightPath = ensured.path;
    fileVizState.lastAction = `Allocated FD ${fd} for ${ensured.path}.`;
    fileVizState.lastResult = { fd, path: ensured.path, flags };
    return { fd, path: ensured.path, flags };
  }

  if (kind === "close") {
    const fd = parsePositiveInt(args[0], 3);
    const entry = findOpenFile(fd);
    if (!entry) {
      fileVizState.lastAction = `EBADF: FD ${fd} is not open.`;
      fileVizState.highlightFd = null;
      return { error: `FD ${fd} is not open` };
    }
    fileVizState.openFiles = fileVizState.openFiles.filter(file => file.fd !== fd);
    fileVizState.highlightFd = fd;
    fileVizState.highlightPath = entry.path;
    fileVizState.lastAction = `Released FD ${fd}; kernel decremented the file reference.`;
    fileVizState.lastResult = { result: "FD released", path: entry.path };
    return { result: "FD released", path: entry.path };
  }

  if (kind === "read") {
    const fd = parsePositiveInt(args[0], 3);
    const entry = findOpenFile(fd);
    if (!entry) {
      fileVizState.lastAction = `EBADF: FD ${fd} is not open.`;
      fileVizState.highlightFd = null;
      return { error: `FD ${fd} is not open` };
    }
    if (entry.flags.includes("O_WRONLY")) {
      fileVizState.lastAction = `EACCES: FD ${fd} was opened write-only.`;
      fileVizState.highlightFd = fd;
      fileVizState.highlightPath = entry.path;
      return { error: `FD ${fd} is write-only` };
    }
    const count = Math.max(0, parsePositiveInt(args[2], 12));
    const fileData = fileVizState.files[entry.path] || "";
    const chunk = fileData.slice(entry.offset, entry.offset + count);
    const start = entry.offset;
    entry.offset += chunk.length;
    fileVizState.userBuffer = chunk;
    fileVizState.highlightFd = fd;
    fileVizState.highlightPath = entry.path;
    fileVizState.highlightRange = { start, end: start + chunk.length };
    fileVizState.lastAction = chunk.length
      ? `Copied ${chunk.length} byte(s) from ${entry.path} into the user buffer.`
      : `Reached EOF on ${entry.path}; nothing more to read.`;
    fileVizState.lastResult = { bytesRead: chunk.length, eof: chunk.length === 0, buffer: chunk || "(empty)" };
    return { bytesRead: chunk.length, eof: chunk.length === 0, buffer: chunk || "(empty)" };
  }

  if (kind === "write") {
    const fd = parsePositiveInt(args[0], 1);
    const payload = (args[1] || "data").toString();
    const requested = Math.max(0, parsePositiveInt(args[2], payload.length || 4));
    const data = payload.slice(0, requested);

    if (fd === 1) {
      fileVizState.terminalBuffer += data;
      fileVizState.userBuffer = data;
      fileVizState.highlightFd = 1;
      fileVizState.highlightPath = "/dev/stdout";
      fileVizState.lastAction = `Wrote ${data.length} byte(s) from user buffer to stdout.`;
      fileVizState.lastResult = { bytesWritten: data.length, sink: "stdout" };
      return { bytesWritten: data.length, sink: "stdout" };
    }

    const entry = findOpenFile(fd);
    if (!entry) {
      fileVizState.lastAction = `EBADF: FD ${fd} is not open.`;
      fileVizState.highlightFd = null;
      return { error: `FD ${fd} is not open` };
    }
    if (entry.flags.includes("O_RDONLY") && !entry.flags.includes("O_WRONLY") && !entry.flags.includes("O_RDWR")) {
      fileVizState.lastAction = `EACCES: FD ${fd} was opened read-only.`;
      fileVizState.highlightFd = fd;
      fileVizState.highlightPath = entry.path;
      return { error: `FD ${fd} is read-only` };
    }

    const fileData = fileVizState.files[entry.path] || "";
    const start = entry.offset;
    const before = fileData.slice(0, start);
    const after = fileData.slice(start + data.length);
    fileVizState.files[entry.path] = before + data + after;
    entry.offset += data.length;
    fileVizState.userBuffer = data;
    fileVizState.highlightFd = fd;
    fileVizState.highlightPath = entry.path;
    fileVizState.highlightRange = { start, end: start + data.length };
    fileVizState.lastAction = `Copied ${data.length} byte(s) from user buffer into ${entry.path}.`;
    fileVizState.lastResult = { bytesWritten: data.length, path: entry.path };
    return { bytesWritten: data.length, path: entry.path };
  }

  return { result: "No-op" };
}

function renderFileVisualization() {
  const container = document.getElementById("fileVisualizationContainer");
  if (!container) return;

  const openFileRows = fileVizState.openFiles.length
    ? fileVizState.openFiles.map(file => `
        <div class="fileviz-row ${file.fd === fileVizState.highlightFd ? "is-active" : ""}">
          <span class="fileviz-fd mono">${file.fd}</span>
          <span class="fileviz-path mono">${file.path}</span>
          <span class="fileviz-meta mono">${file.flags}</span>
          <span class="fileviz-meta mono">@${file.offset}</span>
        </div>
      `).join("")
    : `<div class="fileviz-empty">No user-open file descriptors yet.</div>`;

  const fileRows = Object.entries(fileVizState.files).map(([path, content]) => {
    const isActive = path === fileVizState.highlightPath;
    const range = isActive ? fileVizState.highlightRange : null;
    const preview = content || "(empty file)";
    const highlightedPreview = range && range.end > range.start
      ? `${preview.slice(0, range.start)}<mark>${preview.slice(range.start, range.end) || " "}</mark>${preview.slice(range.end)}`
      : preview;
    return `
      <div class="fileviz-file ${isActive ? "is-active" : ""}">
        <div class="fileviz-file-head">
          <span class="mono">${path}</span>
          <span class="fileviz-file-size mono">${content.length} B</span>
        </div>
        <div class="fileviz-file-body mono">${highlightedPreview.replace(/\n/g, "<br>")}</div>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div class="fileviz-shell">
      <div class="fileviz-header">
        <div>
          <div class="section-label" style="margin-bottom:.35rem">File Descriptor Model</div>
          <div class="fileviz-status">${fileVizState.lastAction}</div>
        </div>
        <button class="btn btn-secondary" onclick="resetFileVizState()">Reset File State</button>
      </div>
      <div class="fileviz-grid">
        <div class="fileviz-panel">
          <div class="section-label" style="margin-bottom:.6rem">Process FD Table</div>
          <div class="fileviz-row is-fixed"><span class="fileviz-fd mono">0</span><span class="fileviz-path mono">stdin</span><span class="fileviz-meta mono">R</span><span class="fileviz-meta mono">console</span></div>
          <div class="fileviz-row is-fixed"><span class="fileviz-fd mono">1</span><span class="fileviz-path mono">stdout</span><span class="fileviz-meta mono">W</span><span class="fileviz-meta mono">terminal</span></div>
          <div class="fileviz-row is-fixed"><span class="fileviz-fd mono">2</span><span class="fileviz-path mono">stderr</span><span class="fileviz-meta mono">W</span><span class="fileviz-meta mono">terminal</span></div>
          ${openFileRows}
        </div>
        <div class="fileviz-panel">
          <div class="section-label" style="margin-bottom:.6rem">User Buffer</div>
          <div class="fileviz-buffer mono">${(fileVizState.userBuffer || "(empty buffer)").replace(/\n/g, "<br>")}</div>
          <div class="section-label" style="margin:.85rem 0 .45rem">Stdout Sink</div>
          <div class="fileviz-buffer mono">${(fileVizState.terminalBuffer || "(no terminal output)").replace(/\n/g, "<br>")}</div>
        </div>
      </div>
      <div class="fileviz-panel" style="margin-top:1rem">
        <div class="section-label" style="margin-bottom:.6rem">Kernel File Objects</div>
        <div class="fileviz-files">${fileRows}</div>
      </div>
    </div>
  `;
}

window.resetFileVizState = resetFileVizState;

function createProcessNode(parentPid) {
  const newPid = nextPid++;
  return {
    id: Math.random(),
    pid: newPid,
    name: `proc_${newPid}`,
    children: [],
    level: 0
  };
}

function findProcessById(node, id) {
  if (node.id === id) return node;
  for (let child of node.children) {
    const found = findProcessById(child, id);
    if (found) return found;
  }
  return null;
}

function updateTreeLevels(node, level = 0) {
  node.level = level;
  node.children.forEach(child => updateTreeLevels(child, level + 1));
}

function renderProcessTree() {
  const treeContainer = document.getElementById("processTreeContainer");
  if (!treeContainer) return;

  updateTreeLevels(processTree);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 800 400");
  svg.setAttribute("style", "border:1px solid var(--border-subtle);border-radius:var(--r-md);background:var(--bg-elevated);margin-bottom:1rem;cursor:pointer");
  svg.style.minHeight = "200px";

  const nodePositions = new Map();
  let nodeCount = 0;

  function layoutTree(node, x, y, offsetX) {
    nodePositions.set(node.id, { x, y, node });
    nodeCount++;
    const childCount = node.children.length;
    const childOffsetX = offsetX / Math.max(2, childCount);
    let childX = x - (offsetX / 2);
    
    node.children.forEach((child, idx) => {
      const nextX = x - offsetX / 2 + ((idx + 0.5) * offsetX / childCount);
      const nextY = y + 80;
      layoutTree(child, nextX, nextY, childOffsetX);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x);
      line.setAttribute("y1", y + 25);
      line.setAttribute("x2", nextX);
      line.setAttribute("y2", nextY - 25);
      line.setAttribute("stroke", "var(--border-default)");
      line.setAttribute("stroke-width", "1.5");
      svg.appendChild(line);
    });
  }

  layoutTree(processTree, 400, 40, 300);

  nodePositions.forEach(({ x, y, node }) => {
    const isCurrentProcess = node.id === currentProcess.id;
    
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", isCurrentProcess ? 28 : 22);
    circle.setAttribute("fill", isCurrentProcess ? "var(--accent-blue)" : "var(--accent-blue-dim)");
    circle.setAttribute("stroke", isCurrentProcess ? "var(--accent-blue)" : "var(--border-default)");
    circle.setAttribute("stroke-width", isCurrentProcess ? "2.5" : "1.5");
    circle.setAttribute("style", "transition:all 0.15s;cursor:pointer");
    circle.onclick = (e) => {
      e.stopPropagation();
      currentProcess = node;
      renderProcessTree();
    };
    svg.appendChild(circle);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x);
    text.setAttribute("y", y);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-size", "11");
    text.setAttribute("font-weight", isCurrentProcess ? "700" : "600");
    text.setAttribute("fill", isCurrentProcess ? "white" : "var(--text-secondary)");
    text.setAttribute("font-family", "var(--font-mono)");
    text.textContent = node.pid.toString();
    text.setAttribute("style", "pointer-events:none");
    svg.appendChild(text);
  });

  treeContainer.innerHTML = "";
  treeContainer.appendChild(svg);

  const indicator = document.getElementById("currentProcessIndicator");
  if (indicator) {
    indicator.textContent = `Current: ${currentProcess.name} (PID ${currentProcess.pid})`;
  }
}

function simulateOrphan(parentToKillId) {
    const initNode = processTree;
    const parentNode = findProcessById(processTree, parentToKillId);
    
    if (!parentNode || parentNode.pid === 1000) return;
    const orphans = parentNode.children;
    initNode.children.push(...orphans);
    removeNode(processTree, parentToKillId);

    renderProcessTree();
}

renderWaitVisualization = function() {
  const container = document.getElementById("waitVisualizationContainer");
  if (!container) return;

  const exitedChildren = waitChildren.filter(c => c.state === "EXITED");
  const reapedChildren = waitChildren.filter(c => c.state === "REAPED");
  const parentStateColor = parentWaiting ? "var(--accent-orange)" : "var(--accent-blue)";
  const parentStateText = parentWaiting ? "⏸ BLOCKED IN WAIT()" : (waitedPid ? `▶ RUNNING (Reaped ${waitedPid})` : "▶ RUNNING");
  let svgContent = `
    <svg viewBox="0 0 800 320" style="width:100%; height:auto; border:1px solid var(--border-subtle); border-radius:var(--r-md); background:var(--bg-elevated); margin-bottom:1rem; cursor:default;">
      <defs>
        <marker id="arrowHead" orient="auto" markerWidth="6" markerHeight="6" refX="5" refY="3">
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--accent-green)" />
        </marker>
      </defs>
  `;

  waitChildren.forEach((child, idx) => {
    const x = 200 + (idx * 200);
    const y = 220;
    
    let lineStroke = "var(--border-default)";
    let lineDash = "";
    let lineAnimate = "";
    
    if (child.state === "EXITED" && parentWaiting) {
      lineStroke = "var(--accent-green)";
      lineDash = "stroke-dasharray='6,6'";
      lineAnimate = `<animate attributeName="stroke-dashoffset" values="24;0" dur="0.8s" repeatCount="indefinite"/>`;
    } else if (parentWaiting && child.state === "RUNNING") {
      lineStroke = "var(--accent-orange)";
      lineDash = "stroke-dasharray='4,4'";
    } else if (child.state === "REAPED") {
      lineStroke = "var(--border-subtle)";
    }

    svgContent += `
      <line x1="400" y1="80" x2="${x}" y2="${y - 30}" stroke="${lineStroke}" stroke-width="2" ${lineDash}>
        ${lineAnimate}
      </line>
    `;
    
    if (child.state === "EXITED" && parentWaiting) {
       svgContent += `
         <line x1="${x}" y1="${y - 35}" x2="400" y2="90" stroke="var(--accent-green)" stroke-width="2.5" marker-end="url(#arrowHead)" opacity="0.8">
           <animate attributeName="stroke-dasharray" values="0,1000; 1000,0" dur="1s" repeatCount="indefinite"/>
         </line>
       `;
    }
  });

  svgContent += `
    <g style="transition: all 0.3s ease;">
      <circle cx="400" cy="60" r="32" fill="var(--bg-elevated)" stroke="${parentStateColor}" stroke-width="3" />
      <text x="400" y="55" text-anchor="middle" dominant-baseline="middle" font-family="var(--font-mono)" font-size="12" font-weight="700" fill="var(--text-primary)">PID 1000</text>
      <text x="400" y="73" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="9" font-weight="600" fill="${parentStateColor}">${parentStateText}</text>
    </g>
  `;

  if (parentWaiting) {
    svgContent += `
      <circle cx="400" cy="60" r="36" fill="none" stroke="var(--accent-orange)" stroke-width="2" opacity="0.6">
        <animate attributeName="r" values="36; 48" dur="1.2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.6; 0" dur="1.2s" repeatCount="indefinite"/>
      </circle>
    `;
  }

  waitChildren.forEach((child, idx) => {
    const x = 200 + (idx * 200);
    const y = 220;
    
    let childColor = "var(--accent-blue)";
    let childFill = "var(--bg-elevated)";
    let childStateText = "RUNNING";
    let opacity = "1";
    let pulseAnim = "";
    
    if (child.state === "EXITED") {
      childColor = "var(--accent-red)";
      childStateText = "☠ ZOMBIE";
      pulseAnim = `<animate attributeName="opacity" values="1; 0.6; 1" dur="2s" repeatCount="indefinite"/>`;
    } else if (child.state === "REAPED") {
      childColor = "var(--border-subtle)";
      childStateText = "✓ REAPED";
      opacity = "0.35";
    }

    svgContent += `
      <g opacity="${opacity}" style="transition: all 0.3s ease;">
        <circle cx="${x}" cy="${y}" r="28" fill="${childFill}" stroke="${childColor}" stroke-width="3">
           ${pulseAnim}
        </circle>
        <text x="${x}" y="${y - 4}" text-anchor="middle" dominant-baseline="middle" font-family="var(--font-mono)" font-size="12" font-weight="700" fill="var(--text-primary)">PID ${child.pid}</text>
        <text x="${x}" y="${y + 12}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="9" font-weight="600" fill="${childColor}">${childStateText}</text>
        
        ${child.state === "EXITED" ? `<text x="${x}" y="${y + 42}" text-anchor="middle" font-family="var(--font-mono)" font-size="11" font-weight="600" fill="var(--text-secondary)">Exit Code: ${child.exitCode}</text>` : ''}
      </g>
    `;
  });

  svgContent += `</svg>`;

  let htmlControls = `
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.5rem;">
      
      <div style="background:var(--bg-elevated); padding: 1rem; border-radius: var(--r-md); border: 1px solid var(--border-subtle);">
        <div style="font-size:.85rem; font-weight:600; margin-bottom:.75rem; color:var(--text-primary);">Simulate Child Processes</div>
        <div style="display:flex; gap: .5rem; flex-wrap:wrap;">
          ${waitChildren.map((child, idx) => `
            <button class="btn btn-secondary" style="font-size:.75rem; font-family:var(--font-mono); padding: 0.4rem 0.6rem; ${child.state !== 'RUNNING' ? 'opacity:0.4; pointer-events:none; text-decoration:line-through;' : ''}" onclick="exitChild(${idx})">
              exit(${child.pid})
            </button>
          `).join('')}
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem;">
          Clicking exit turns a process into a zombie until the parent reads its status.
        </div>
      </div>
      
      <div style="background:var(--bg-elevated); padding: 1rem; border-radius: var(--r-md); border: 1px solid var(--border-subtle);">
         <div style="font-size:.85rem; font-weight:600; margin-bottom:.75rem; color:var(--text-primary);">Simulate Parent Process</div>
         <div style="display:flex; gap: .5rem;">
           <button class="btn btn-primary" style="font-family:var(--font-mono);" onclick="callWait()" ${parentWaiting ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
             wait(NULL)
           </button>
           <button class="btn btn-secondary" onclick="resetWaitState()">Reset Simulation</button>
         </div>
         <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem;">
           ${parentWaiting ? 
             'Parent is blocked in the kernel, waiting for a SIGCHLD signal...' : 
             'Call wait() to ask the kernel to clean up a zombie and fetch its exit code.'}
         </div>
      </div>
      
    </div>
  `;

  container.innerHTML = svgContent + htmlControls;
};

function exitChild(index) {
  if (index < waitChildren.length && waitChildren[index].state === 'RUNNING') {
    waitChildren[index].state = 'EXITED';
    waitChildren[index].exitCode = Math.floor(Math.random() * 256);
    renderWaitVisualization();
  }
}

window.exitChild = exitChild;

function callWait() {
  if (!parentWaiting) {
    parentWaiting = true;
    renderWaitVisualization();
    
    setTimeout(() => {
      const exitedIdx = waitChildren.findIndex(c => c.state === 'EXITED');
      if (exitedIdx !== -1) {
        waitedPid = waitChildren[exitedIdx].pid;
        waitChildren[exitedIdx].state = 'REAPED';
        parentWaiting = false;
        renderWaitVisualization();
      } else {
        parentWaiting = false;
        renderWaitVisualization();
      }
    }, 1500);
  }
}

window.callWait = callWait;

function resetWaitState() {
  waitChildren = [
    { pid: 1001, state: "RUNNING", exitCode: null },
    { pid: 1002, state: "RUNNING", exitCode: null },
    { pid: 1003, state: "RUNNING", exitCode: null }
  ];
  parentWaiting = false;
  waitedPid = null;
  renderWaitVisualization();
}

window.resetWaitState = resetWaitState;

function renderSidebar() {
  const sidebar = document.getElementById("scSidebar");
  if (!sidebar) return;
  sidebar.innerHTML = CATEGORIES.map(category => SystemCallView.sidebarSection(category)).join("");
}

window.selectCall = function(name) {
  selectedCall = name;
  renderSidebar();
  renderDetail();
};

window.setExampleArgs = function(args, explanation) {
  args.forEach((arg, i) => {
    const input = document.getElementById(`scArg${i}`);
    if (input) input.value = arg;
  });
  window.currentExplanation = explanation;
};

const SystemCallView = {
  sidebarSection(category) {
    const items = Object.entries(SYSCALLS)
      .filter(([, syscall]) => syscall.cat === category)
      .map(([name, syscall]) => this.sidebarItem(name, syscall))
      .join("");
    return `
      <div style="margin-bottom:1rem">
        <div class="section-label" style="margin-bottom:.35rem">${category}</div>
        ${items}
      </div>`;
  },

  sidebarItem(name, syscall) {
    const active = name === selectedCall;
    return `
      <div class="sc-item ${active ? "active" : ""}" onclick="selectCall('${name}')" style="padding:.45rem .75rem;border-radius:var(--r-sm);cursor:pointer;font-size:.85rem;font-family:var(--font-mono);transition:all .15s;${active ? 'background:var(--accent-blue-dim);color:var(--accent-blue);font-weight:600' : 'color:var(--text-secondary)'}">
        ${name}()
        <span style="float:right;font-size:.68rem;color:var(--text-muted)">#${syscall.num}</span>
      </div>`;
  },

  syntax(syscall) {
    return `<div style="background:var(--bg-sunken);border-radius:var(--r-md);padding:.85rem 1rem;margin-bottom:1rem;font-family:var(--font-mono);font-size:.85rem;color:var(--accent-cyan)">${syscall.syntax}</div>`;
  },

  params(syscall) {
    if (!syscall.params.length) return "";
    return `
      <div style="margin-bottom:1rem">
        <div class="section-label" style="margin-bottom:.5rem">Parameters</div>
        ${syscall.params.map(param => `<div style="font-size:.83rem;padding:.3rem 0;border-bottom:1px solid var(--border-subtle);font-family:var(--font-mono)">${param}</div>`).join("")}
      </div>`;
  },

  examples(syscall) {
    if (!syscall.examples || !syscall.examples.length) return "";
    return `
      <div style="margin-top:1.5rem">
        <div class="section-label" style="margin-bottom:0.75rem">Examples</div>
        <div style="display:flex;flex-direction:column;gap:1rem">
          ${syscall.examples.map(example => this.exampleCard(syscall, example)).join("")}
        </div>
      </div>`;
  },

  exampleCard(syscall, example) {
    const paramNames = syscall.params.map(param => param.split(":")[0].trim());
    const args = paramNames.map(name => example.fields ? (example.fields[name] || "") : "");
    const codeBlock = paramNames
      .map((name, index) => `<div><span style="color:var(--text-muted)">${name}</span> = <span style="color:var(--accent-cyan)">"${args[index]}"</span></div>`)
      .join("");
    return `
      <div style="padding:1rem;background:var(--bg-sunken);border-radius:var(--r-md);border:1px solid var(--border-subtle)">
        <div style="font-weight:700;color:var(--text-primary);margin-bottom:0.5rem;font-size:0.9rem">${example.label}</div>
        <div style="font-family:var(--font-mono);font-size:0.8rem;background:rgba(0,0,0,0.2);padding:0.75rem;border-radius:var(--r-sm);margin-bottom:0.75rem">${codeBlock}</div>
        ${example.explanation ? `<div style="font-size:0.8rem;color:var(--text-secondary);line-height:1.6;white-space:pre-wrap;">${example.explanation.trim()}</div>` : ""}
      </div>`;
  },

  inputs(syscall) {
    return syscall.params.length
      ? syscall.params.map((param, index) => {
          const paramName = param.split(":")[0].trim();
          return `<input id="scArg${index}" class="form-input form-mono" placeholder="${paramName}" style="width:120px">`;
        }).join("")
      : '<span style="font-size:.83rem;color:var(--text-muted)">No parameters</span>';
  }
};

function renderDetail() {
  const sc = SYSCALLS[selectedCall];
  if (!sc) return;
  const detailEl = document.getElementById("scDetail");
  if (!detailEl) return;
  detailEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1.25rem;flex-wrap:wrap">
      <h2 style="font-family:var(--font-mono);font-size:1.4rem;font-weight:700">${selectedCall}()</h2>
      <span class="badge badge-gray">#${sc.num}</span>
      <span class="badge badge-blue">${sc.cat}</span>
    </div>

    ${SystemCallView.syntax(sc)}

    <p style="color:var(--text-secondary);line-height:1.75;margin-bottom:1rem">${sc.desc}</p>

    ${SystemCallView.params(sc)}

    <div style="margin-bottom:1rem">
      <div class="section-label" style="margin-bottom:.35rem">Return Value</div>
      <div style="font-size:.83rem;color:var(--text-secondary)">${sc.ret}</div>
    </div>

    <div style="margin-bottom:1.25rem">
      <div class="section-label" style="margin-bottom:.35rem">Kernel Effect</div>
      <div style="font-size:.83rem;color:var(--text-secondary)">${sc.effect}</div>
    </div>

    <div class="card" style="background:var(--bg-elevated)">
      <div class="section-label" style="margin-bottom:.75rem">Interactive Demo</div>
      <div style="margin-bottom:.75rem">
        <div id="modeViz" class="mode-viz">
          <div class="mode-layer user-mode">User Mode &nbsp;<span class="badge badge-blue">Ring 3</span></div>
          <div class="mode-arrow" id="modeArrow">⬇ syscall trap</div>
          <div class="mode-layer kernel-mode">Kernel Mode &nbsp;<span class="badge badge-purple">Ring 0</span></div>
        </div>
      </div>
      
${SystemCallView.examples(sc)}
      
      <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
        ${SystemCallView.inputs(sc)}
        <button class="btn btn-primary" id="execSc">Execute</button>
      </div>
      <div id="scOutput" style="margin-top:.75rem;min-height:60px;font-family:var(--font-mono);font-size:.83rem;color:var(--text-secondary)"></div>
    </div>

    ${selectedCall === "fork" ? `
    <div style="margin-top:1.5rem;padding:1rem;background:var(--bg-sunken);border-radius:var(--r-md);border-left:3px solid var(--accent-blue)">
      <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:.35rem">PROCESS TREE</div>
      <div id="processTreeContainer"></div>
      <div id="currentProcessIndicator" style="font-size:.8rem;color:var(--text-secondary);font-family:var(--font-mono)"></div>
    </div>` : ""}

    ${selectedCall === "wait" ? `
    <div style="margin-top:1.5rem;padding:1rem;background:var(--bg-sunken);border-radius:var(--r-md);border-left:3px solid var(--accent-orange)">
      <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:.35rem">WAIT LIFECYCLE</div>
      <div id="waitVisualizationContainer"></div>
    </div>` : ""}

    ${FILE_SYSCALLS.has(selectedCall) ? `
    <div style="margin-top:1.5rem;padding:1rem;background:var(--bg-sunken);border-radius:var(--r-md);border-left:3px solid var(--accent-cyan)">
      <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:.35rem">FILE STATE VISUALIZER</div>
      <div id="fileVisualizationContainer"></div>
    </div>` : ""}`;

  if (selectedCall === "fork") {
    renderProcessTree();
  }
  if (selectedCall === "wait") {
    renderWaitVisualization();
  }
  if (FILE_SYSCALLS.has(selectedCall)) {
    renderFileVisualization();
  }

  document.getElementById("execSc").addEventListener("click", () => {
    const args = ["scArg0","scArg1","scArg2"].map(id => document.getElementById(id)?.value);
    const result = sc.sim(args);
    const arrow = document.getElementById("modeArrow");
    arrow.style.color = "var(--accent-orange)";
    arrow.textContent = "TRAP — executing in kernel...";
    setTimeout(() => {
      arrow.style.color = "var(--accent-green)";
      arrow.textContent = "↑ RETURN to user space";
      let output = `<span class="badge badge-green">COMPLETED</span>`;
      
      const filledArgs = args.filter(a => a && a.trim());
      if (filledArgs.length > 0) {
        output += `<br><br><span style="color:var(--text-secondary);font-size:.75rem;font-weight:600">Executed with:</span><br>`;
        sc.params.forEach((param, i) => {
          if (args[i] && args[i].trim()) {
            const paramName = param.split(":")[0].trim();
            output += `<span style="color:var(--accent-cyan)">${paramName}</span> = <span style="color:var(--text-muted)">${args[i]}</span><br>`;
          }
        });
      }
      
      if (window.currentExplanation) {
        output += `<br><span style="font-size:.8rem;color:var(--accent-cyan);white-space:pre-wrap;font-family:var(--font-mono)">${window.currentExplanation.replace(/\\n/g, '<br>')}</span>`;
      }
      output += `<br><br><span style="color:var(--text-secondary);font-size:.75rem;font-weight:600">Result:</span><br>`;
      output += Object.entries(result).map(([k,v]) => `<span style="color:var(--text-muted)">${k}:</span> ${v}`).join("<br>");
      document.getElementById("scOutput").innerHTML = output;
      if (FILE_SYSCALLS.has(selectedCall)) {
        renderFileVisualization();
      }
    }, 600);
    setTimeout(() => { arrow.style.color = ""; arrow.textContent = "⬇ syscall trap"; }, 2000);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderSidebar();
  renderDetail();
});
