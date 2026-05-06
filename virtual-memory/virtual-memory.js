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



    /*
      THRASHING REGION
    */



    ctx.fillStyle =
        'rgba(239,68,68,0.08)';



    ctx.fillRect(

        W * 0.48,

        0,

        W * 0.52,

        H
    );



    /*
      DRAW CURVE
    */



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



    /*
      LABELS
    */



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



    /*
      THRASHING LABEL
    */



    ctx.fillStyle = '#ef4444';



    ctx.fillText(

        'Thrashing Region',

        W - 180,

        25
    );
}





function renderSwap(states, frameCount) {

    if (!states.length) return;



    const final =
        states[states.length - 1];



    const phys =
        final.frames.filter(x => x !== null);



    const all =
        [...new Set(states.map(s => s.page))];



    const swap =
        all.filter(p => !phys.includes(p));



    document.getElementById('swapViz').innerHTML = `

        <div style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:2rem
        ">

            <div>

                <h3>
                    Physical Memory
                    (${phys.length}/${frameCount})
                </h3>

                <div style="
                    display:flex;
                    gap:10px;
                    flex-wrap:wrap;
                    margin-top:12px
                ">

                    ${phys.map(p => `

                        <div class="page-box hit">

                            ${p}

                        </div>

                    `).join('')}

                </div>

            </div>



            <div>

                <h3>
                    Swap Space
                </h3>

                <div style="
                    display:flex;
                    gap:10px;
                    flex-wrap:wrap;
                    margin-top:12px
                ">

                    ${swap.map(p => `

                        <div class="page-box fault">

                            ${p}

                        </div>

                    `).join('')}

                </div>

            </div>

        </div>



        <div style="margin-top:24px">

            <h3>
                Swap Activity
            </h3>

            <div style="margin-top:12px">

                ${states

                    .filter(s => s.event === 'fault')

                    .map(s => `

                        <div style="
                            margin-bottom:8px;
                            padding-bottom:6px;
                            border-bottom:1px solid var(--border-subtle)
                        ">

                            Page Fault on
                            ${s.page}

                            ${s.replaced !== null

                                ? `→ Replaced ${s.replaced}`

                                : ''
                            }

                        </div>

                    `).join('')}

            </div>

        </div>
    `;
}





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



    const states =
        simulateDemandPaging(refs, frames);



    renderDemand(states);

    renderWorkingSet(refs, windowSize);

    renderThrashing(states, refs, frames);

    renderSwap(states, frames);
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