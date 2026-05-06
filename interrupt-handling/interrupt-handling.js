let interruptQueue = [];

let totalInterrupts = 0;

let totalIsrTime = 0;

let interruptsMasked = false;

let currentProcess = 1;

let instructionCounter = 0;

let completedInterrupts = 0;

let cpuRunning = false;

let speedMultiplier = 1;

let haltRequested = false;

let servicingInterrupt = false;

let currentISR = null;

let isrStack = [];

const ISR_TIMES = {

keyboard: 700,

timer: 300,

disk: 2200,

network: 1500,

mouse: 500,

printer: 1800,

power: 2500,

io: 1200,

trap: 600
};

const INTERRUPT_PRIORITY = {

power: 9,

timer: 8,

disk: 7,

network: 6,

keyboard: 5,

mouse: 4,

printer: 3,

io: 2,

trap: 1
};

function scaled(ms) {

return ms * speedMultiplier;
}

function sleep(ms) {

return new Promise(
r => setTimeout(r, scaled(ms))
);
}

function renderQueue() {

const q =
document.getElementById(
'interruptQueue'
);

const interruptColors = {

keyboard: 'irq-keyboard',

disk: 'irq-disk',

timer: 'irq-timer',

network: 'irq-network',

mouse: 'irq-mouse',

printer: 'irq-printer',

power: 'irq-power',

io: 'irq-io',

trap: 'irq-trap'
};

q.innerHTML =
interruptQueue.map(i => `

<div class="interrupt-card ${interruptColors[i.type]}">

<div class="irq-name">

${i.type.toUpperCase()}

</div>

<div class="irq-priority">

P${i.priority}

</div>

</div>

`).join('');

document.getElementById(
'pendingInterrupts'
).innerHTML =
interruptQueue.length;
}

function addLog(msg) {

const log =
document.getElementById(
'executionLog'
);

const time =
new Date()
.toLocaleTimeString();

log.innerHTML += `

<div class="log-entry">

<span class="log-time">

${time}

</span>

<span class="log-msg">

${msg}

</span>

</div>

`;

log.scrollTop =
log.scrollHeight;
}

function activateStage(id) {

document
.querySelectorAll('.stage')
.forEach(s =>
s.classList.remove('active')
);

document
.getElementById(id)
.classList.add('active');
}

function clearStages() {

document
.querySelectorAll('.stage')
.forEach(s =>
s.classList.remove('active')
);
}

function setCPUState(text, cls) {

const cpu =
document.getElementById(
'cpuState'
);

cpu.className =
'cpu-state';

cpu.classList.add(cls);

cpu.innerHTML = text;
}

function generateInterrupt() {

const type =
document.getElementById(
'interruptType'
).value;

interruptQueue.push({

type,

priority:
INTERRUPT_PRIORITY[type],

timestamp: Date.now()
});

interruptQueue.sort(
(a,b)=>{

if (
b.priority !== a.priority
) {

return b.priority - a.priority;
}

return a.timestamp - b.timestamp;
});

totalInterrupts++;

document.getElementById(
'totalInterrupts'
).innerHTML =
totalInterrupts;

renderQueue();

addLog(
`
Interrupt Generated:
${type.toUpperCase()}

Priority:
P${INTERRUPT_PRIORITY[type]}
`
);


}

async function executeCPU() {

while (cpuRunning) {

if (
haltRequested
&&
!servicingInterrupt
) {

cpuRunning = false;

document.getElementById(
'cpuToggleBtn'
).innerHTML =
'Start CPU';

setCPUState(
'CPU Halted',
'cpu-context'
);

addLog(
'CPU halted successfully'
);

break;
}

instructionCounter++;

setCPUState(
`
Running Process P${currentProcess}

<br><br>

Executing Instruction #${instructionCounter}

<br><br>

Checking Interrupt Line
`,
'cpu-running'
);
addLog(
`
P${currentProcess}

executed instruction

#${instructionCounter}
`
);

await sleep(1000);

if (!cpuRunning)
break;

if (interruptsMasked) {

addLog(
'Interrupt polling skipped — interrupts masked'
);

continue;
}

if (
interruptQueue.length > 0
&&
!haltRequested
) {

await serviceInterrupt();
}

await sleep(700);
}
}



async function serviceInterrupt() {

servicingInterrupt = true;

while (
interruptQueue.length > 0
||
currentISR
||
isrStack.length > 0
) {

if (!currentISR) {

currentISR =
interruptQueue.shift();

renderQueue();

activateStage(
'stage-start'
);

setCPUState(
`
Interrupt Detected

<br><br>

${currentISR.type.toUpperCase()}

<br><br>

Priority P${currentISR.priority}
`,
'cpu-interrupt'
);

addLog(
`IRQ ARRIVED → ${currentISR.type.toUpperCase()} (P${currentISR.priority})`
);

await sleep(500);

activateStage(
'stage-occurs'
);

addLog(
`INTERRUPT OCCURRED → ${currentISR.type.toUpperCase()}`
);

await sleep(500);

activateStage(
'stage-save'
);

if (
isrStack.length === 0
) {

setCPUState(
`
Saving Process Context

<br><br>

P${currentProcess}
`,
'cpu-context'
);

addLog(
`CONTEXT SAVE → Process P${currentProcess}`
);

} else {

setCPUState(
`
Saving ISR Context

<br><br>

${isrStack[
isrStack.length-1
].type.toUpperCase()}
`,
'cpu-context'
);

addLog(
`CONTEXT SAVE → ISR ${isrStack[
isrStack.length-1
].type.toUpperCase()}`
);
}

await sleep(700);

activateStage(
'stage-identify'
);

setCPUState(
`
Interrupt Arbitration

<br><br>

Selected:

${currentISR.type.toUpperCase()}

<br><br>

Priority P${currentISR.priority}
`,
'cpu-interrupt'
);

addLog(
`IDENTIFY IRQ → ${currentISR.type.toUpperCase()} selected`
);

await sleep(700);
}

activateStage(
'stage-handler'
);

setCPUState(
`
Executing Interrupt Handler

<br><br>

${currentISR.type.toUpperCase()}
`,
'cpu-interrupt'
);

addLog(
`HANDLER START → ${currentISR.type.toUpperCase()}`
);

await sleep(500);

activateStage(
'stage-isr'
);

addLog(
`ISR START → ${currentISR.type.toUpperCase()} (${ISR_TIMES[currentISR.type]}ms)`
);

const totalSteps = 5;

let interrupted = false;

for (
let i=0;
i<totalSteps;
i++
) {

setCPUState(
`
Performing ISR

<br><br>

${currentISR.type.toUpperCase()}

<br><br>

Step ${i+1}/${totalSteps}

<br><br>

Priority P${currentISR.priority}
`,
'cpu-interrupt'
);

await sleep(
ISR_TIMES[currentISR.type] /
totalSteps
);

if (
interruptQueue.length > 0
&&
!interruptsMasked
) {

interruptQueue.sort(
(a,b)=>{

if (
b.priority !== a.priority
) {

return b.priority - a.priority;
}

return a.timestamp - b.timestamp;
});

const next =
interruptQueue[0];

if (
next.priority >
currentISR.priority
) {

addLog(
`NESTED IRQ → ${next.type.toUpperCase()} (P${next.priority}) preempted ${currentISR.type.toUpperCase()}`
);

isrStack.push(currentISR);

currentISR =
interruptQueue.shift();

renderQueue();

interrupted = true;

break;
}
}
}

if (interrupted) {

continue;
}

activateStage(
'stage-restore'
);

setCPUState(
`
Restoring Context

<br><br>

${currentISR.type.toUpperCase()}
`,
'cpu-context'
);

addLog(
`ISR COMPLETE → ${currentISR.type.toUpperCase()}`
);

totalIsrTime +=
ISR_TIMES[currentISR.type];

await sleep(700);

if (
isrStack.length > 0
) {

const resumed =
isrStack.pop();

setCPUState(
`
Restoring ISR Context

<br><br>

${resumed.type.toUpperCase()}
`,
'cpu-context'
);

addLog(
`ISR RESUME → ${resumed.type.toUpperCase()}`
);

await sleep(700);

currentISR = resumed;

activateStage(
'stage-isr'
);

continue;
}

currentISR = null;
}

activateStage(
'stage-resume'
);

currentProcess =
(currentProcess % 4) + 1;

setCPUState(
`
Running Process P${currentProcess}

<br><br>

Resuming Normal Execution
`,
'cpu-running'
);

addLog(
`PROCESS RESUME → P${currentProcess}`
);

await sleep(900);

activateStage(
'stage-end'
);

await sleep(400);

clearStages();

servicingInterrupt = false;

document.getElementById(
'avgIsr'
).innerHTML =
Math.floor(
totalIsrTime /
Math.max(totalInterrupts,1)
) + 'ms';

if (
haltRequested
&&
interruptQueue.length === 0
) {

cpuRunning = false;

clearStages();

document.getElementById(
'cpuToggleBtn'
).innerHTML =
'Start CPU';

setCPUState(
'CPU Halted',
'cpu-context'
);

addLog(
'CPU HALTED'
);
}
}
document.addEventListener(
'DOMContentLoaded',
()=>{

document
.getElementById(
'generateBtn'
)
.addEventListener(
'click',
generateInterrupt
);

const cpuToggleBtn =
document.getElementById(
'cpuToggleBtn'
);

cpuToggleBtn.addEventListener(
'click',
()=>{

if (!cpuRunning) {

cpuRunning = true;

haltRequested = false;

cpuToggleBtn.innerHTML =
'Stop CPU';

addLog(
'CPU execution started'
);

executeCPU();

} else {

haltRequested = true;

cpuToggleBtn.innerHTML =
'Stopping...';

addLog(
'CPU halt requested'
);

if (!servicingInterrupt) {

cpuRunning = false;

cpuToggleBtn.innerHTML =
'Start CPU';

setCPUState(
'CPU Halted',
'cpu-context'
);

addLog(
'CPU halted successfully'
);
}
}
});

const speedEl =
document.getElementById(
'speedControl'
);

if (speedEl) {

speedEl.addEventListener(
'change',
(e)=>{

speedMultiplier =
parseFloat(
e.target.value
);
});
}

document
.getElementById(
'maskBtn'
)
.addEventListener(
'click',
()=>{

interruptsMasked =
!interruptsMasked;

document.getElementById(
'maskBtn'
).innerHTML =
interruptsMasked
? 'Interrupts Masked'
: 'Interrupts Enabled';

addLog(
interruptsMasked
? 'Interrupt masking enabled'
: 'Interrupt masking disabled'
);
});

document
.getElementById(
'clearBtn'
)
.addEventListener(
'click',
()=>{

interruptQueue = [];

renderQueue();

clearStages();

document.getElementById(
'executionLog'
).innerHTML = '';

document.getElementById(
'totalInterrupts'
).innerHTML = '0';

document.getElementById(
'pendingInterrupts'
).innerHTML = '0';

document.getElementById(
'avgIsr'
).innerHTML = '0ms';

instructionCounter = 0;

currentProcess = 1;

cpuRunning = false;

haltRequested = false;

servicingInterrupt = false;

currentISR = null;

isrStack = [];

document.getElementById(
'cpuToggleBtn'
).innerHTML =
'Start CPU';

setCPUState(
'Running Process P1',
'cpu-running'
);

totalInterrupts = 0;

totalIsrTime = 0;
});

setCPUState(
'Running Process P1',
'cpu-running'
);
});

function toggleTheory() {

const theory =
document.getElementById(
'theoryContent'
);

const btn =
document.getElementById(
'theoryToggleBtn'
);

if (
theory.style.display === 'none'
||
theory.style.display === ''
) {

theory.style.display = 'block';

btn.classList.add(
'active'
);

} else {

theory.style.display = 'none';

btn.classList.remove(
'active'
);
}
}