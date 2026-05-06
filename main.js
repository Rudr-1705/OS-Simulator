const ICONS = {
  "system-calls":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  "cpu-scheduling":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/></svg>',
  "process-sync":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  deadlock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
  "memory-management":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
  "contiguous-memory":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="3" x2="8" y2="17"/><line x1="14" y1="3" x2="14" y2="17"/></svg>',
  "page-replacement":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
  "disk-scheduling":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>',
  "file-allocation":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  "file-organization":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  ipc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  cli: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  rtos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  mmu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/><path d="M15 21h4a2 2 0 0 0 2-2v-4"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>',
  "virtual-memory":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><rect x="6" y="8" width="5" height="8"/><rect x="13" y="8" width="5" height="8"/></svg>',
  "thread-scheduling":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  "cache-simulation":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
  "raid-simulator":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
  "interrupt-handling":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h7l-1 8 10-12h-7z"/></svg>',
};

const MODULES = [
  {
    id: "system-calls",
    icon: ICONS["system-calls"],
    title: "System Calls",
    cat: "Process",
    catColor: "blue",
    desc: "Explore the kernel interface: execute syscalls interactively, inspect parameters and effects, and visualize user-to-kernel mode switching.",
    tags: ["fork", "exec", "mmap"],
    type: "core",
  },
  {
    id: "cpu-scheduling",
    icon: ICONS["cpu-scheduling"],
    title: "CPU Scheduling",
    cat: "Process",
    catColor: "purple",
    desc: "Visualize FCFS, SJF, SRTF, Round Robin, and Priority scheduling with Gantt charts.",
    tags: ["Gantt", "RR", "SJF"],
    type: "core",
  },
  {
    id: "process-sync",
    icon: ICONS["process-sync"],
    title: "Process Synchronization",
    cat: "Process",
    catColor: "cyan",
    desc: "Visualize synchronization primitives through producer-consumer buffers and dining philosophers state transitions.",
    tags: ["Semaphore", "Mutex"],
    type: "core",
  },
  {
    id: "deadlock",
    icon: ICONS.deadlock,
    title: "Deadlock",
    cat: "Process",
    catColor: "red",
    desc: "Detect and avoid deadlocks with RAG and Banker's Algorithm.",
    tags: ["Banker's", "RAG"],
    type: "core",
  },
  {
    id: "memory-management",
    icon: ICONS["memory-management"],
    title: "Memory Management",
    cat: "Memory",
    catColor: "blue",
    desc: "Explore paging, segmentation, and address translation.",
    tags: ["Paging", "Segment"],
    type: "core",
  },
  {
    id: "contiguous-memory",
    icon: ICONS["contiguous-memory"],
    title: "Contiguous Memory Alloc",
    cat: "Memory",
    catColor: "orange",
    desc: "Allocate memory blocks using First Fit, Best Fit, Worst Fit, and Next Fit strategies. Visualize fragmentation in real time.",
    tags: ["First Fit", "BF"],
    type: "core",
  },
  {
    id: "page-replacement",
    icon: ICONS["page-replacement"],
    title: "Page Replacement",
    cat: "Memory",
    catColor: "purple",
    desc: "Step through FIFO, LRU, Optimal, and Clock replacement.",
    tags: ["LRU", "FIFO", "OPT"],
    type: "core",
  },
  {
    id: "disk-scheduling",
    icon: ICONS["disk-scheduling"],
    title: "Disk Scheduling",
    cat: "Storage",
    catColor: "green",
    desc: "Visualize FCFS, SSTF, SCAN, C-SCAN, and LOOK head movement.",
    tags: ["SSTF", "SCAN"],
    type: "core",
  },
  {
    id: "file-allocation",
    icon: ICONS["file-allocation"],
    title: "File Allocation",
    cat: "Storage",
    catColor: "cyan",
    desc: "Allocate disk blocks using Contiguous, Linked, and Indexed methods. See how each strategy places blocks across the disk.",
    tags: ["Indexed", "Linked"],
    type: "core",
  },
  {
    id: "file-organization",
    icon: ICONS["file-organization"],
    title: "File System Structures",
    cat: "Storage",
    catColor: "blue",
    desc: "Visualize file system directory structures: Single-Level, Two-Level, Tree hierarchy, and DAG (file sharing with reference counting).",
    tags: ["DAG", "Tree", "Single-Level", "Two-Level"],
    type: "core",
  },
  {
    id: "interrupt-handling",
    icon: ICONS["interrupt-handling"],
    title: "Interrupt Handling",
    cat: "System",
    catColor: "red",
    desc: "Simulate interrupt generation, priority arbitration, nested interrupts, ISR execution, and context switching.",
    tags: ["IRQ", "ISR", "Priority"],
    type: "core",
  },
  {
    id: "raid-simulator-basic",
    icon: ICONS["raid-simulator"],
    title: "RAID Simulator I",
    cat: "Storage",
    catColor: "green",
    desc: "RAID fundamentals with RAID 0, RAID 1, RAID 2, and RAID 3. Explore striping, mirroring, ECC, and dedicated parity behavior.",
    tags: ["RAID 0", "RAID 1", "RAID 2", "RAID 3"],
    type: "core",
  },
  {
    id: "raid-simulator-advanced",
    icon: ICONS["raid-simulator"],
    title: "RAID Simulator II",
    cat: "Storage",
    catColor: "green",
    desc: "Advanced RAID levels with RAID 4, RAID 5, RAID 6, and RAID 10 including parity rotation and rebuild tolerance.",
    tags: ["RAID 4", "RAID 5", "RAID 6", "RAID 10"],
    type: "core",
  },
  {
    id: "ipc",
    icon: ICONS.ipc,
    title: "Inter-Process Comm.",
    cat: "Process",
    catColor: "orange",
    desc: "Simulate Pipes, Message Queues, Shared Memory, and Signals between concurrent processes.",
    tags: ["Pipe", "MQ", "SHM"],
    type: "extra",
  },
  {
    id: "cli",
    icon: ICONS.cli,
    title: "Command Line Interface",
    cat: "System",
    catColor: "green",
    desc: "A simulated Unix shell with history and navigation.",
    tags: ["Shell", "Unix"],
    type: "extra",
  },
  {
    id: "rtos",
    icon: ICONS.rtos,
    title: "Real-Time OS",
    cat: "Process",
    catColor: "red",
    desc: "Schedule periodic real-time tasks using EDF, Rate Monotonic, and LLF. Verify schedulability and detect deadline misses.",
    tags: ["EDF", "RM", "LLF"],
    type: "extra",
  },
  {
    id: "mmu",
    icon: ICONS.mmu,
    title: "Memory Management Unit",
    cat: "Memory",
    catColor: "purple",
    desc: "Simulate virtual to physical address translation with TLB hits and misses.",
    tags: ["TLB", "VPN"],
    type: "extra",
  },
  {
    id: "virtual-memory",
    icon: ICONS["virtual-memory"],
    title: "Virtual Memory",
    cat: "Memory",
    catColor: "blue",
    desc: "Explore demand paging, working sets, and thrashing.",
    tags: ["Demand", "Swap"],
    type: "extra",
  },
  {
    id: "thread-scheduling",
    icon: ICONS["thread-scheduling"],
    title: "Thread Scheduling",
    cat: "Process",
    catColor: "cyan",
    desc: "Visualize thread states, models, and thread pool behavior.",
    tags: ["POSIX", "Pool"],
    type: "extra",
  },
  {
    id: "cache-simulation",
    icon: ICONS["cache-simulation"],
    title: "Cache Simulation",
    cat: "Memory",
    catColor: "orange",
    desc: "Configure cache size, associativity, and replacement policy. Observe hits, misses, and AMAT across access patterns.",
    tags: ["LRU", "AMAT"],
    type: "extra",
  },
];

function renderModules(list) {
  const grid = document.getElementById("modulesGrid");
  grid.innerHTML = list
    .map(
      (m) => `
    <a class="module-card card" href="./${m.id}/index.html">
      <div class="mc-icon-wrap">${m.icon}</div>
      <div class="mc-meta">
        <span class="badge badge-${m.catColor}">${m.cat}</span>
        <span class="badge badge-gray">${m.type === "extra" ? "Extra" : "Core Lab"}</span>
      </div>
      <h3 class="mc-title">${m.title}</h3>
      <p class="mc-desc">${m.desc}</p>
      <div class="mc-footer">
        <div class="mc-tags">${m.tags.map((t) => `<span class="mc-tag">${t}</span>`).join("")}</div>
        <span class="mc-arrow">→</span>
      </div>
    </a>`,
    )
    .join("");
}
function filterModules(filter, evt) {
  document
    .querySelectorAll(".filter-pills .pill")
    .forEach((b) => b.classList.remove("active"));
  if (evt?.target) evt.target.classList.add("active");
  const q = document.getElementById("moduleSearch").value.toLowerCase();
  applyFilter(filter, q);
}

function searchModules(query) {
  const active = document.querySelector(".filter-pills .pill.active");
  const map = {
    all: "all",
    "core lab": "core",
    extra: "extra",
    process: "process",
    memory: "memory",
    storage: "storage",
  };
  const f = active
    ? map[active.textContent.trim().toLowerCase()] || "all"
    : "all";
  applyFilter(f, (query || "").toLowerCase());
}
function applyFilter(filter, query = "") {
  let list = MODULES;
  if (filter === "core") list = list.filter((m) => m.type === "core");
  else if (filter === "extra") list = list.filter((m) => m.type === "extra");
  else if (filter === "process") list = list.filter((m) => m.cat === "Process");
  else if (filter === "memory") list = list.filter((m) => m.cat === "Memory");
  else if (filter === "storage") list = list.filter((m) => m.cat === "Storage");
  if (query)
    list = list.filter(
      (m) =>
        m.title.toLowerCase().includes(query) ||
        m.desc.toLowerCase().includes(query),
    );
  renderModules(list);
}
document.addEventListener("DOMContentLoaded", () => {
  renderModules(MODULES);

  // Hero stats counter
  const hsObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          document.querySelectorAll(".hs-num").forEach((el) => {
            animateCounter(
              el,
              parseInt(el.dataset.target, 10),
              900,
              "",
              el.dataset.suffix || "",
            );
          });
          hsObs.disconnect();
        }
      });
    },
    { threshold: 0.3 },
  );
  const heroStats = document.querySelector(".hero-stats");
  if (heroStats) hsObs.observe(heroStats);

  // Card scroll reveal
  const revObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add("visible"), i * 35);
          revObs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05, rootMargin: "0px 0px -20px 0px" },
  );

  function observeCards() {
    document.querySelectorAll(".module-card").forEach((c) => revObs.observe(c));
  }

  const _orig = window.renderModules || renderModules;
  window.renderModules = (list) => {
    _orig(list);
    observeCards();
  };
  observeCards();
});
