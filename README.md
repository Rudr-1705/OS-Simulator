# OS Simulator

[![Live site](https://img.shields.io/badge/Live%20site-GitHub%20Pages-1f883d?style=flat-square&logo=github)](https://rvbilimagga.github.io/OS-simulator-v2/)
[![Repository](https://img.shields.io/badge/Repository-GitHub-181717?style=flat-square&logo=github)](https://github.com/RVBilimagga/OS-simulator-v2)

An interactive Operating System concepts simulator built with pure HTML, CSS, and JavaScript. Visualize algorithms in real time — no frameworks, no build tools, deploys directly on GitHub Pages.

**NITK Surathkal · CSE Department · OS Lab Project**

---

## Live website

**The simulator is online — open it in your browser:**

|                |                                                                                         |
| :------------- | :-------------------------------------------------------------------------------------- |
| **URL**        | **https://rvbilimagga.github.io/OS-simulator-v2/**                                      |
| **Quick link** | [**Click here to launch OS Simulator**](https://rudr-1705.github.io/OS-Simulator/) |

No install or login required; works on phone and desktop.

---

## Modules

### Core Lab (11)

| Module                       | Algorithms / Concepts                                                     |
| ---------------------------- | ------------------------------------------------------------------------- |
| System Calls                 | fork, exec, wait, open, read, write, mmap, pipe, kill                     |
| CPU Scheduling               | FCFS, SJF, SRTF, Round Robin, Priority (preemptive)                       |
| Process Synchronization      | Producer-Consumer, Dining Philosophers, Semaphores                        |
| Deadlock                     | Resource Allocation Graph, Banker's Algorithm                             |
| Memory Management            | Paging, Segmentation, Logical→Physical translation                        |
| Contiguous Memory Allocation | First Fit, Best Fit, Worst Fit, Next Fit                                  |
| Page Replacement             | FIFO, LRU, Optimal, Clock (Second Chance)                                 |
| Disk Scheduling              | FCFS, SSTF, SCAN, C-SCAN, LOOK, C-LOOK                                    |
| File Allocation              | Contiguous, Linked, Indexed                                               |
| File Organization            | Single-Level, Two-Level, Tree, DAG (file sharing with reference counting) |
| RAID Simulator               | RAID 0, RAID 1, RAID 2, RAID 3, RAID 4, RAID 5, RAID 6, RAID 10           |

### Extra (7)

| Module                      | Concepts                                                               |
| --------------------------- | ---------------------------------------------------------------------- |
| Inter-Process Communication | Pipes, Message Queues, Shared Memory, Signals                          |
| Command Line Interface      | Simulated Unix shell with history and tab completion                   |
| Real-Time OS                | EDF, Rate Monotonic, LLF, schedulability analysis                      |
| Memory Management Unit      | TLB simulation, address translation, BigInt 64-bit support             |
| Virtual Memory              | Demand paging, working set model, thrashing curve                      |
| Thread Scheduling           | Thread state machine, user/kernel models, thread pool                  |
| Cache Simulation            | Direct mapped, set-associative, fully associative, LRU/FIFO/LFU/Random |

---

## Getting Started

No installation required. Open `index.html` in any modern browser, or clone and run a local server.

```bash
git clone https://github.com/RVBilimagga/OS-simulator-v2.git
cd OS-simulator-v2

# Option A — open index.html directly in your browser

# Option B — local static server (recommended)
python3 -m http.server 8080
# Visit http://localhost:8080
```

On Windows, you can use `python -m http.server 8080` if `python3` is not available.

---

## Project Structure

```
OS-simulator-v2/
├── index.html                    # Landing page
├── style.css                     # Landing page styles
├── main.js                       # Module registry + rendering
├── shared.css                    # Global design system
├── shared.js                     # Utilities (ThemeManager, toast, animateCounter)
│
├── cpu-scheduling/
│   ├── index.html
│   ├── cpu-scheduling.css
│   └── cpu-scheduling.js
│
├── page-replacement/
│   ├── index.html
│   ├── page-replacement.css
│   └── page-replacement.js
│
├── disk-scheduling/ ...
├── process-sync/    ...
├── deadlock/        ...
├── memory-management/ ...
├── contiguous-memory/ ...
├── file-allocation/   ...
├── file-organization/ ...
├── system-calls/      ...
├── ipc/               ...
├── cli/               ...
├── rtos/              ...
├── mmu/               ...
├── virtual-memory/    ...
├── thread-scheduling/ ...
└── cache-simulation/  ...
```

---

## Tech Stack

- **HTML5** — semantic structure
- **CSS3** — custom properties, CSS Grid, Flexbox, animations
- **Vanilla JavaScript** — no dependencies, no build step
- **Google Fonts** — Space Grotesk, JetBrains Mono, DM Serif Display
- **Canvas API** — disk scheduling seek chart, thrashing curve
- **SVG** — resource allocation graph, inline icons
- **BigInt** — correct 64-bit address arithmetic in MMU module

---

## Features

- Light and dark mode (persists via localStorage)
- Fully responsive — works on mobile and desktop
- Step-by-step playback with speed control on all animated modules
- Algorithm comparison charts (CPU scheduling, page replacement)
- Theory panels with concept definitions and complexity tables
- Toast notifications with accessible markup
- Scroll-reveal animations on module cards
- 8 RAID levels (0, 1, 2, 3, 4, 5, 6, 10) with disk failure and rebuild simulation
- All 25+ algorithms implemented correctly with proper edge case handling

---

## Deployment

The site is **live on GitHub Pages**: [https://rvbilimagga.github.io/OS-simulator-v2/](https://rvbilimagga.github.io/OS-simulator-v2/)

This repo is a **static site**. To update what visitors see, push to `main`; Pages will rebuild automatically.

**First-time setup (forks / new clones):**

1. Push to GitHub:

   ```bash
   git remote add origin https://github.com/RVBilimagga/OS-simulator-v2.git
   git branch -M main
   git push -u origin main
   ```

2. **Settings** → **Pages** → **Deploy from a branch** → branch **`main`**, folder **`/ (root)`** → **Save**.

3. Your site will be at `https://<username>.github.io/<repo-name>/` (this project: link above).

**Other hosts:** You can also deploy the same folder to Netlify, Vercel, or Cloudflare Pages.

---

## Team

241CS141 · 241CS142 · 241CS143 · 241CS144 · 241CS145  
241CS146 · 241CS147 · 241CS148 · 241CS149 · 241CS150

NITK Surathkal — Department of Computer Science and Engineering
