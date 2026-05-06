let speedVal = 3;
let ragNodes = [{id:"P0",type:"P"},{id:"P1",type:"P"},{id:"R0",type:"R"}];
let ragEdges = [{from:"P0",to:"R0"},{from:"R0",to:"P1"}];
function bankersAlgorithm(allocation, max, available){const n=allocation.length,m=available.length,need=allocation.map((row,i)=>row.map((v,j)=>max[i][j]-v));const work=[...available],finish=Array(n).fill(false),safeSeq=[];let found=true;while(found){found=false;for(let i=0;i<n;i++){if(!finish[i]&&need[i].every((v,j)=>v<=work[j])){for(let j=0;j<m;j++)work[j]+=allocation[i][j];finish[i]=true;safeSeq.push(i);found=true;}}}return {safe:finish.every(Boolean),safeSeq,need};}
function detectCycleRAG(nodes,edges){const adj={};nodes.forEach(n=>adj[n.id]=[]);edges.forEach(e=>(adj[e.from]||[]).push(e.to));const WHITE=0,GRAY=1,BLACK=2,color={},cycle=[];nodes.forEach(n=>color[n.id]=WHITE);function dfs(u,path){color[u]=GRAY;for(const v of (adj[u]||[])){if(color[v]===GRAY){cycle.push(...path,u,v);return true;}if(color[v]===WHITE&&dfs(v,[...path,u]))return true;}color[u]=BLACK;return false;}for(const n of nodes){if(color[n.id]===WHITE&&dfs(n.id,[]))return {hasCycle:true,cycle};}return {hasCycle:false,cycle:[]};}
function drawRag(){const cv=document.getElementById("ragCanvas");const {ctx,W,H}=setupHiDpiCanvas(cv);ctx.clearRect(0,0,W,H);const p=ragNodes.filter(n=>n.type==="P"),r=ragNodes.filter(n=>n.type==="R");const pos={};p.forEach((n,i)=>pos[n.id]={x:90+i*100,y:100});r.forEach((n,i)=>pos[n.id]={x:120+i*140,y:220});ctx.font="12px JetBrains Mono";ctx.strokeStyle="var(--border-strong)";Object.entries(pos).forEach(([id,v])=>{const node=ragNodes.find(n=>n.id===id);if(node.type==="P"){ctx.beginPath();ctx.arc(v.x,v.y,24,0,Math.PI*2);ctx.stroke();ctx.fillText(id,v.x-10,v.y+4);}else{ctx.strokeRect(v.x-22,v.y-18,44,34);ctx.fillText(id,v.x-10,v.y+4);}});ragEdges.forEach(e=>{const a=pos[e.from],b=pos[e.to];if(!a||!b)return;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();});}
function buildBankersInputs(){const n=parseInt(document.getElementById("bkN").value,10)||3,m=parseInt(document.getElementById("bkM").value,10)||3;function matrix(cls){return `<table style="border-collapse:collapse"><thead><tr><th></th>${Array.from({length:m},(_,j)=>`<th style="padding:4px 8px;font-size:.72rem;color:var(--text-muted)">R${j}</th>`).join("")}</tr></thead><tbody>${Array.from({length:n},(_,i)=>`<tr><td style="padding:4px 8px;font-size:.78rem;color:var(--text-muted)">P${i}</td>${Array.from({length:m},(_,j)=>`<td><input class="form-input ${cls}" data-r="${i}" data-c="${j}" type="number" min="0" value="0" style="width:52px;padding:.3rem"></td>`).join("")}</tr>`).join("")}</tbody></table>`;}document.getElementById("allocMatrix").innerHTML=matrix("bk-alloc");document.getElementById("maxMatrix").innerHTML=matrix("bk-max");document.getElementById("availRow").innerHTML=Array.from({length:m},(_,j)=>`<input class="form-input bk-avail" data-c="${j}" type="number" min="0" value="${j===0?3:j===1?3:2}" style="width:52px;padding:.3rem">`).join(" ");}
function renderBankers(){const n=parseInt(document.getElementById("bkN").value,10)||3,m=parseInt(document.getElementById("bkM").value,10)||3;const allocation=[],max=[];for(let i=0;i<n;i++){allocation.push(Array.from({length:m},(_,j)=>parseInt(document.querySelector(`.bk-alloc[data-r="${i}"][data-c="${j}"]`)?.value||"0",10)));max.push(Array.from({length:m},(_,j)=>parseInt(document.querySelector(`.bk-max[data-r="${i}"][data-c="${j}"]`)?.value||"0",10)));}const available=Array.from({length:m},(_,j)=>parseInt(document.querySelector(`.bk-avail[data-c="${j}"]`)?.value||"0",10));const {safe,safeSeq,need}=bankersAlgorithm(allocation,max,available);document.getElementById("needMatrix").innerHTML=`<table class="bk-table"><thead><tr><th>Process</th>${Array.from({length:m},(_,j)=>`<th>R${j}</th>`).join("")}</tr></thead><tbody>${need.map((row,i)=>`<tr><td>P${i}</td>${row.map(v=>`<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table>`;const resultEl=document.getElementById("bankersResult");if(safe){resultEl.innerHTML=`<div class="badge badge-green" style="font-size:1rem;padding:.5rem 1rem">SAFE STATE</div><div style="margin-top:.75rem;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">Safe Sequence: ${safeSeq.map((p,i)=>`<span class="badge badge-blue">P${p}</span>${i<safeSeq.length-1?'<span style="color:var(--text-muted)">→</span>':''}`).join("")}</div>`;}else{resultEl.innerHTML=`<div class="badge badge-red" style="font-size:1rem;padding:.5rem 1rem">UNSAFE — DEADLOCK POSSIBLE</div><p style="margin-top:.5rem;color:var(--text-muted);font-size:.85rem">No safe sequence exists.</p>`;}}
document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll(".deadlock-tabs .tab-btn").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll(".deadlock-tabs .tab-btn").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    document.querySelectorAll(".deadlock-tab-content").forEach(x=>x.style.display="none");
    document.getElementById(`dl-${b.dataset.tab}`).style.display="block";
  }));
  drawRag();
  document.getElementById("addProcBtn").onclick=()=>{
    ragNodes.push({id:`P${ragNodes.filter(n=>n.type==="P").length}`,type:"P"});
    drawRag();
  };
  document.getElementById("addResBtn").onclick=()=>{
    ragNodes.push({id:`R${ragNodes.filter(n=>n.type==="R").length}`,type:"R"});
    drawRag();
  };
  document.getElementById("addEdgeBtn").addEventListener("click", () => {
    const from = document.getElementById("edgeFrom").value.trim().toUpperCase();
    const to = document.getElementById("edgeTo").value.trim().toUpperCase();
    const fromNode = ragNodes.find(n => n.id === from);
    const toNode = ragNodes.find(n => n.id === to);
    if (!fromNode || !toNode) return showToast("Invalid nodes. Ex: P0, R0", "error");
    if (fromNode.type === toNode.type) return showToast("Edges must be between P and R", "error");
    if (ragEdges.some(e => e.from === from && e.to === to)) return showToast("Edge already exists", "error");
    ragEdges.push({from, to});
    drawRag();
    showToast(`Added edge ${from} → ${to}`, "success");
  });
  document.getElementById("detectBtn").onclick=()=>{
    const r=detectCycleRAG(ragNodes,ragEdges);
    document.getElementById("ragStatus").innerHTML=r.hasCycle?'<span class="badge badge-red">Deadlock Detected</span>':'<span class="badge badge-green">Safe</span>';
    showToast(r.hasCycle?'Deadlock detected':'No cycle found',r.hasCycle?'error':'success');
  };
  document.getElementById("ragResetBtn").onclick=()=>{
    ragNodes=[{id:"P0",type:"P"},{id:"P1",type:"P"},{id:"R0",type:"R"}];
    ragEdges=[{from:"P0",to:"R0"},{from:"R0",to:"P1"}];
    drawRag();
  };
  buildBankersInputs();
  document.getElementById("bkN").addEventListener("change",buildBankersInputs);
  document.getElementById("bkM").addEventListener("change",buildBankersInputs);
  document.getElementById("bkRun").addEventListener("click",()=>{
    renderBankers();
    showToast("Banker's algorithm computed","success");
  });
  document.getElementById("bkRandom").addEventListener("click",()=>{
    buildBankersInputs();
    document.querySelectorAll(".bk-max").forEach(el=>el.value=1+Math.floor(Math.random()*6));
    document.querySelectorAll(".bk-alloc").forEach(el=>{
      const r=parseInt(el.dataset.r,10),c=parseInt(el.dataset.c,10);
      const m=document.querySelector(`.bk-max[data-r="${r}"][data-c="${c}"]`);
      el.value=Math.floor(Math.random()*parseInt(m?.value||"3",10));
    });
    document.querySelectorAll(".bk-avail").forEach(el=>el.value=1+Math.floor(Math.random()*4));
    renderBankers();
  });
  document.getElementById("speedRange")?.addEventListener("input",e=>{
    speedVal=parseInt(e.target.value,10);
    const s=document.getElementById("speedLabel");
    if(s)s.textContent=`${speedVal}x`;
  });
});
