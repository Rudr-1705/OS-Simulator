let memBlocks = [];
let memTotal = 1024;
let nextFitPtr = 0;
let selectedAlgo = "First Fit";


// ==============================
// INITIAL MEMORY GENERATION
// ==============================
function generateInitialMemory() {

    memTotal =
        parseInt(document.getElementById("totMem").value, 10) || 1024;

    memBlocks = [
        {
            id: 0,
            size: 100,
            free: false,
            pid: "OS"
        },

        {
            id: 1,
            size: 150,
            free: true,
            pid: null
        },

        {
            id: 2,
            size: 80,
            free: false,
            pid: "A"
        },

        {
            id: 3,
            size: 200,
            free: true,
            pid: null
        },

        {
            id: 4,
            size: 120,
            free: false,
            pid: "B"
        },

        {
            id: 5,
            size: memTotal - 650,
            free: true,
            pid: null
        }

    ].filter(b => b.size > 0);

    nextFitPtr = 0;

    renderMemBar();
}


// ==============================
// MEMORY ALLOCATION
// ==============================
function allocate(reqSize, pid, algoName) {

    let chosen = -1;

    // ---------- FIRST FIT ----------
    if (algoName === "First Fit") {

        chosen = memBlocks.findIndex(
            b => b.free && b.size >= reqSize
        );
    }

    // ---------- BEST FIT ----------
    else if (algoName === "Best Fit") {

        let best = Infinity;
        let bestIdx = -1;

        memBlocks.forEach((b, i) => {

            if (
                b.free &&
                b.size >= reqSize &&
                b.size - reqSize < best
            ) {
                best = b.size - reqSize;
                bestIdx = i;
            }
        });

        chosen = bestIdx;
    }

    // ---------- WORST FIT ----------
    else if (algoName === "Worst Fit") {

        let worst = -1;
        let worstIdx = -1;

        memBlocks.forEach((b, i) => {

            if (
                b.free &&
                b.size >= reqSize &&
                b.size > worst
            ) {
                worst = b.size;
                worstIdx = i;
            }
        });

        chosen = worstIdx;
    }

    // ---------- NEXT FIT ----------
    else {

        for (let i = 0; i < memBlocks.length; i++) {

            const idx =
                (nextFitPtr + i) % memBlocks.length;

            if (
                memBlocks[idx].free &&
                memBlocks[idx].size >= reqSize
            ) {
                chosen = idx;

                nextFitPtr =
                    (idx + 1) % memBlocks.length;

                break;
            }
        }
    }


    // ---------- NO SPACE ----------
    if (chosen === -1) {

        showToast(
            `No hole found for ${pid} (${reqSize}B) — external fragmentation`,
            "error"
        );

        return false;
    }


    // ---------- SPLIT BLOCK ----------
    const rem =
        memBlocks[chosen].size - reqSize;

    memBlocks[chosen] = {
        ...memBlocks[chosen],
        size: reqSize,
        free: false,
        pid
    };

    if (rem > 4) {

        memBlocks.splice(chosen + 1, 0, {
            id: Date.now(),
            size: rem,
            free: true,
            pid: null
        });
    }

    return true;
}


// ==============================
// RENDER MEMORY BAR
// ==============================
function renderMemBar() {

    const bar =
        document.getElementById("memBar");

    const totalUsed =
        memBlocks.reduce(
            (s, b) => s + (!b.free ? b.size : 0),
            0
        );

    const extFrag =
        memBlocks
            .filter(b => b.free)
            .reduce((s, b) => s + b.size, 0);

    const intFrag = 0;


    bar.innerHTML = memBlocks.map((b, i) => {

        const hue =
            b.free ? null : (i * 53) % 360;

        const bg =
            b.free
                ? "var(--bg-sunken)"
                : `hsla(${hue}, 65%, 55%, 0.25)`;

        const border =
            b.free
                ? "1px dashed var(--border-default)"
                : `1px solid hsla(${hue}, 65%, 55%, 0.6)`;


        return `
            <div
                class="mem-block ${b.free ? 'free' : 'used'}"

                style="
                    height:${Math.max(
            24,
            (b.size / memTotal) * 340
        )}px;

                    background:${bg};
                    border:${border}
                "

                title="${b.free
                ? `Free: ${b.size}B`
                : `${b.pid}: ${b.size}B`
            }"
            >

                <span class="mem-label">
                    ${b.free
                ? `Free<br>${b.size}B`
                : `${b.pid}<br>${b.size}B`
            }
                </span>

            </div>
        `;

    }).join("");


    document.getElementById("extFrag").textContent =
        `${extFrag}B`;

    document.getElementById("intFrag").textContent =
        `${intFrag}B`;

    document.getElementById("utilPct").textContent =
        `${Math.round(totalUsed / memTotal * 100)}%`;
}


// ==============================
// DEALLOCATION
// ==============================
function deallocate(pid) {

    let merged = false;

    // Mark process as free
    memBlocks = memBlocks.map(b =>
        b.pid === pid
            ? {
                ...b,
                free: true,
                pid: null
            }
            : b
    );


    // Merge adjacent free holes
    for (let i = 0; i < memBlocks.length - 1; i++) {

        if (
            memBlocks[i].free &&
            memBlocks[i + 1].free
        ) {

            memBlocks[i].size +=
                memBlocks[i + 1].size;

            memBlocks.splice(i + 1, 1);

            i--;

            merged = true;
        }
    }


    if (merged) {

        showToast(
            `Freed ${pid} and merged adjacent holes`,
            "success"
        );
    }

    renderMemBar();
}


// ==============================
// EVENT LISTENERS
// ==============================
document.addEventListener("DOMContentLoaded", () => {

    // ---------- ALGORITHM BUTTONS ----------
    document
        .querySelectorAll("[data-algo]")
        .forEach(b =>
            b.addEventListener("click", () => {

                document
                    .querySelectorAll("[data-algo]")
                    .forEach(x =>
                        x.classList.remove("active")
                    );

                b.classList.add("active");

                selectedAlgo = b.dataset.algo;
            })
        );


    // ---------- INITIALIZE MEMORY ----------
    document
        .getElementById("initMemBtn")
        .addEventListener(
            "click",
            generateInitialMemory
        );


    // ---------- ALLOCATE ----------
    document
        .getElementById("allocBtn")
        .addEventListener("click", () => {

            const pid =
                document
                    .getElementById("procName")
                    .value
                    .trim()
                ||
                `P${Date.now() % 1000}`;

            const sz =
                parseInt(
                    document
                        .getElementById("procSize")
                        .value,
                    10
                );

            if (!sz || sz <= 0) {

                return showToast(
                    "Invalid process size",
                    "error"
                );
            }


            if (
                allocate(
                    sz,
                    pid,
                    selectedAlgo
                )
            ) {

                renderMemBar();

                document.getElementById("log").innerHTML += `
                    <div
                        style="
                            color:var(--accent-green);
                            border-left:2px solid var(--accent-green);
                            padding-left:6px;
                            margin-bottom:3px;
                            font-family:var(--font-mono);
                            font-size:.8rem
                        "
                    >
                        [${new Date().toLocaleTimeString()}]
                        Allocated ${pid} (${sz}B)
                        with ${selectedAlgo}
                    </div>
                `;
            }
        });


    // ---------- DEALLOCATE ----------
    document
        .getElementById("deallocBtn")
        .addEventListener("click", () => {

            const pid =
                document
                    .getElementById("procName")
                    .value
                    .trim();

            if (!pid) return;

            deallocate(pid);

            document.getElementById("log").innerHTML += `
                <div
                    style="
                        color:var(--accent-orange);
                        border-left:2px solid var(--accent-orange);
                        padding-left:6px;
                        margin-bottom:3px;
                        font-family:var(--font-mono);
                        font-size:.8rem
                    "
                >
                    [${new Date().toLocaleTimeString()}]
                    Freed ${pid}
                </div>
            `;
        });


    // ---------- INITIAL LOAD ----------
    generateInitialMemory();
});