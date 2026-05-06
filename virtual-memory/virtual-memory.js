function simulateDemandPaging(refs, numFrames) {

    const frames = Array(numFrames).fill(null);

    const lastUsed = Array(numFrames).fill(-1);

    let faults = 0;

    let hits = 0;

    const states = [];



    for (let i = 0; i < refs.length; i++) {

        const page = refs[i];

        let pos = frames.indexOf(page);

        let event = 'hit';

        let replaced = null;



        if (pos !== -1) {

            hits++;

            lastUsed[pos] = i;
        }

        else {

            faults++;

            event = 'fault';

            pos = frames.indexOf(null);



            if (pos === -1) {

                pos = lastUsed.indexOf(
                    Math.min(...lastUsed)
                );

                replaced = frames[pos];
            }



            frames[pos] = page;

            lastUsed[pos] = i;
        }



        states.push({

            page,

            event,

            replaced,

            faults,

            hits,

            frames: [...frames]
        });
    }



    return states;
}





function renderDemand(states) {

    document.getElementById('vmDemandViz').innerHTML =

        states.map(st => `

        <div style="
            margin-bottom:14px;
            padding-bottom:10px;
            border-bottom:1px solid var(--border-subtle)
        ">

            <div style="margin-bottom:8px">

                <span class="chip">
                    Ref ${st.page}
                </span>

                <span class="chip">
                    ${st.event === 'hit'
                        ? 'HIT'
                        : 'PAGE FAULT'}
                </span>

                <span class="chip">
                    Faults ${st.faults}
                </span>

                <span class="chip">
                    Hits ${st.hits}
                </span>

                ${st.replaced !== null

                    ? `<span class="chip">
                        Replaced ${st.replaced}
                       </span>`

                    : ''
                }

            </div>



            ${st.frames.map(fr => `

                <span class="page-box ${
                    st.event === 'fault' && fr === st.page
                        ? 'fault'
                        : st.event === 'hit' && fr === st.page
                            ? 'hit'
                            : ''
                }">

                    ${fr ?? '-'}

                </span>

            `).join('')}

        </div>

    `).join('');
}





function renderWorkingSet(refs, windowSize) {

    const rows = [];



    for (let i = 0; i < refs.length; i++) {

        const win = refs.slice(

            Math.max(0, i - windowSize + 1),

            i + 1
        );



        const set = [...new Set(win)];



        rows.push(`

            <div style="
                margin-bottom:16px;
                padding-bottom:10px;
                border-bottom:1px solid var(--border-subtle)
            ">

                <span class="chip">
                    Step ${i}
                </span>

                <div style="margin-top:6px">

                    Window:
                    [${win.join(', ')}]

                </div>

                <div>

                    Working Set:
                    {${set.join(', ')}}

                </div>

                <div>

                    Size:
                    ${set.length}

                </div>

            </div>

        `);
    }



    document.getElementById('wsViz').innerHTML =
        rows.join('');
}





function renderThrashing(states, refs, frames) {

    if (!states.length) return;



    const cv =
        document.getElementById('thrashCv');

    const ctx =
        cv.getContext('2d');



    const W = cv.width;

    const H = cv.height;



    ctx.clearRect(0, 0, W, H);



    const faults =
        states[states.length - 1].faults;



    const faultRate =
        faults / refs.length;



    const points = [

        { x: 0.0, y: 0.15 },

        { x: 0.1, y: 0.35 },

        { x: 0.2, y: 0.55 },

        { x: 0.3, y: 0.78 },

        { x: 0.4, y: 0.95 },

        { x: 0.5, y: 0.72 },

        { x: 0.6, y: 0.48 },

        { x: 0.7, y: 0.30 },

        { x: 0.8, y: 0.18 },

        { x: 0.9, y: 0.12 },

        { x: 1.0, y: 0.10 }
    ];



    ctx.fillStyle =
        'rgba(239,68,68,0.08)';



    ctx.fillRect(

        W * 0.48,

        0,

        W * 0.52,

        H
    );



    ctx.strokeStyle = '#4f6ef7';

    ctx.lineWidth = 4;

    ctx.beginPath();



    points.forEach((p, i) => {

        const x =
            60 + p.x * (W - 120);

        const y =
            H - 40 - p.y * (H - 80);



        if (i === 0) {

            ctx.moveTo(x, y);

        }

        else {

            ctx.lineTo(x, y);
        }
    });



    ctx.stroke();



    ctx.fillStyle = '#666';

    ctx.font = '14px sans-serif';



    ctx.fillText(

        `Fault Rate: ${
            Math.round(faultRate * 100)
        }%`,

        70,

        35
    );



    ctx.fillText(

        `Frames: ${frames}`,

        70,

        60
    );



    let systemState = 'Stable';



    if (faultRate > 0.5) {

        systemState = 'Thrashing Likely';
    }

    else if (faultRate > 0.2) {

        systemState = 'Moderate Paging';
    }



    ctx.fillText(

        `State: ${systemState}`,

        70,

        85
    );



    ctx.fillText(

        'Degree of Multiprogramming →',

        W - 250,

        H - 10
    );



    ctx.save();

    ctx.translate(20, H / 2);

    ctx.rotate(-Math.PI / 2);



    ctx.fillText(

        'CPU Utilization →',

        0,

        0
    );



    ctx.restore();



    ctx.fillStyle = '#ef4444';



    ctx.fillText(

        'Thrashing Region',

        W - 180,

        25
    );
}





// =====================================
// INTERACTIVE SWAP SPACE
// =====================================

let swapState = {

    physFrames: 4,

    physPages: [],

    swapPages: [],

    swapLog: []
};





function renderSwap(states, frameCount) {

    if (!states.length) return;



    if (swapState.physPages.length === 0) {

        const final =
            states[states.length - 1];



        swapState.physFrames =
            frameCount;



        swapState.physPages =
            final.frames.filter(
                x => x !== null
            );



        const allPages =
            [...new Set(
                states.map(s => s.page)
            )];



        swapState.swapPages =
            allPages.filter(
                p => !swapState.physPages.includes(p)
            );
    }



    const physHtml = swapState.physPages.map(p => `

        <div
            class="frame-box"
            style="
                min-width:60px;
                cursor:pointer
            "

            onclick="swapOut(${p})"

            title="Click to swap out">

            <div style="
                font-size:.6rem;
                color:var(--text-muted)
            ">
                P${p}
            </div>

            <div
                class="frame-val"
                style="font-size:1.1rem">

                ${p}

            </div>

        </div>

    `).join('');



    const swapHtml = swapState.swapPages.map(p => `

        <div
            class="frame-box"

            style="
                min-width:60px;
                cursor:pointer;
                opacity:.6;
                border-style:dashed
            "

            onclick="swapIn(${p})"

            title="Click to swap in">

            <div style="
                font-size:.6rem;
                color:var(--text-muted)
            ">
                P${p}
            </div>

            <div
                class="frame-val"
                style="font-size:1.1rem">

                ${p}

            </div>

        </div>

    `).join('');



    const logHtml = swapState.swapLog
        .slice(-8)
        .map(l => `

            <div style="
                color:${l.dir === 'in'
                    ? 'var(--accent-green)'
                    : 'var(--accent-orange)'};

                font-family:var(--font-mono);

                font-size:.75rem;

                border-left:2px solid currentColor;

                padding-left:6px;

                margin-bottom:3px
            ">

                ${l.dir === 'in'
                    ? 'SWAP IN'
                    : 'SWAP OUT'}

                page ${l.page}

            </div>

        `).join('');



    document.getElementById('swapViz').innerHTML = `

        <div style="
            display:grid;
            grid-template-columns:1fr auto 1fr;
            gap:1.5rem;
            align-items:start
        ">

            <div>

                <div
                    class="section-label"
                    style="margin-bottom:.5rem">

                    Physical Memory
                    (${swapState.physPages.length}/${swapState.physFrames} frames)

                </div>

                <div style="
                    display:flex;
                    flex-wrap:wrap;
                    gap:.5rem;
                    min-height:80px;
                    background:var(--bg-elevated);
                    border-radius:var(--r-md);
                    padding:.75rem
                ">

                    ${physHtml || `
                        <span style="
                            color:var(--text-muted);
                            font-size:.8rem
                        ">
                            Empty
                        </span>
                    `}

                </div>

                <div style="
                    font-size:.7rem;
                    color:var(--text-muted);
                    margin-top:.35rem
                ">

                    Click a page to swap it out

                </div>

            </div>



            <div style="
                display:flex;
                flex-direction:column;
                align-items:center;
                justify-content:center;
                padding-top:1.5rem;
                gap:.35rem
            ">

                <svg
                    width="24"
                    height="48"
                    viewBox="0 0 24 48"
                    fill="none"
                    stroke="var(--accent-blue)"
                    stroke-width="2"
                    stroke-linecap="round">

                    <path d="
                        M12 4L4 12
                        M12 4L20 12
                        M12 4L12 22
                    "/>

                    <path d="
                        M12 44L4 36
                        M12 44L20 36
                        M12 44L12 26
                    "/>

                </svg>

                <span style="
                    font-size:.7rem;
                    color:var(--text-muted)
                ">

                    page fault

                </span>

            </div>



            <div>

                <div
                    class="section-label"
                    style="margin-bottom:.5rem">

                    Swap Space
                    (${swapState.swapPages.length} pages)

                </div>

                <div style="
                    display:flex;
                    flex-wrap:wrap;
                    gap:.5rem;
                    min-height:80px;
                    background:var(--bg-sunken);
                    border-radius:var(--r-md);
                    padding:.75rem;
                    border:1px dashed var(--border-default)
                ">

                    ${swapHtml || `
                        <span style="
                            color:var(--text-muted);
                            font-size:.8rem
                        ">
                            Empty
                        </span>
                    `}

                </div>

                <div style="
                    font-size:.7rem;
                    color:var(--text-muted);
                    margin-top:.35rem
                ">

                    Click a page to swap it in

                </div>

            </div>

        </div>



        <div style="margin-top:1rem">

            <div
                class="section-label"
                style="margin-bottom:.5rem">

                Swap Log

            </div>

            <div style="
                background:var(--bg-sunken);
                border-radius:var(--r-md);
                padding:.75rem;
                min-height:60px;
                max-height:160px;
                overflow-y:auto
            ">

                ${logHtml || `
                    <span style="
                        color:var(--text-muted);
                        font-size:.78rem
                    ">
                        Click pages above to simulate swapping
                    </span>
                `}

            </div>

        </div>
    `;
}





window.swapOut = function(page) {

    const idx =
        swapState.physPages.indexOf(page);



    if (idx === -1) return;



    swapState.physPages.splice(idx, 1);

    swapState.swapPages.push(page);

    swapState.swapLog.push({

        dir: 'out',

        page
    });



    showToast(

        `Page ${page} swapped out to disk`,

        'warning'
    );



    renderSwap(
        currentStates,
        swapState.physFrames
    );
};





window.swapIn = function(page) {

    if (

        swapState.physPages.length >=
        swapState.physFrames

    ) {

        showToast(

            'Physical memory full — swap something out first',

            'error'
        );

        return;
    }



    const idx =
        swapState.swapPages.indexOf(page);



    if (idx === -1) return;



    swapState.swapPages.splice(idx, 1);

    swapState.physPages.push(page);

    swapState.swapLog.push({

        dir: 'in',

        page
    });



    showToast(

        `Page ${page} swapped in from disk`,

        'success'
    );



    renderSwap(
        currentStates,
        swapState.physFrames
    );
};





let currentStates = [];





function runSimulation() {

    const refs =

        document.getElementById('globalRefs')

            .value

            .trim()

            .split(/\s+/)

            .map(x => parseInt(x, 10))

            .filter(x => !isNaN(x));



    if (refs.length === 0) {

        alert("Invalid reference string");

        return;
    }



    const frames =

        parseInt(

            document.getElementById('globalFrames').value,

            10

        ) || 4;



    const windowSize =

        parseInt(

            document.getElementById('globalWindow').value,

            10

        ) || 4;



    currentStates =
        simulateDemandPaging(refs, frames);



    swapState.physPages = [];

    swapState.swapPages = [];

    swapState.swapLog = [];



    renderDemand(currentStates);

    renderWorkingSet(refs, windowSize);

    renderThrashing(currentStates, refs, frames);

    renderSwap(currentStates, frames);
}





document.addEventListener(

    'DOMContentLoaded',

    () => {



        document.querySelectorAll('[data-tab]')

            .forEach(btn => {



                btn.addEventListener('click', () => {



                    document.querySelectorAll('[data-tab]')

                        .forEach(x =>

                            x.classList.remove('active')
                        );



                    btn.classList.add('active');



                    [
                        'demand',
                        'working',
                        'thrash',
                        'swap'
                    ]

                    .forEach(k => {



                        const id =

                            k === 'thrash'

                                ? 'vm-thrash'

                                : k === 'working'

                                    ? 'vm-working'

                                    : k === 'swap'

                                        ? 'vm-swap'

                                        : 'vm-demand';



                        document.getElementById(id)

                            .style.display = 'none';
                    });



                    const activeId =

                        btn.dataset.tab === 'thrash'

                            ? 'vm-thrash'

                            : btn.dataset.tab === 'working'

                                ? 'vm-working'

                                : btn.dataset.tab === 'swap'

                                    ? 'vm-swap'

                                    : 'vm-demand';



                    document.getElementById(activeId)

                        .style.display = 'block';
                });
            });



        document.getElementById('runAll')

            .onclick = runSimulation;



        runSimulation();
    }
);
