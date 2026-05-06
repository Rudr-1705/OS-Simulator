let files = []; // { name, blocks: [blockNums], color, indexBlock? }
const TOTAL_BLOCKS = 100;

function getFileColors() {
  return ["var(--accent-blue-dim)","var(--accent-purple-dim)","var(--accent-green-dim)",
          "var(--accent-orange-dim)","var(--accent-cyan-dim)","var(--accent-pink-dim)"];
}
function getFileBorderColors() {
  return ["var(--accent-blue)","var(--accent-purple)","var(--accent-green)",
          "var(--accent-orange)","var(--accent-cyan)","var(--accent-pink)"];
}

function getFreeBlocks() {
  const used = new Set();
  files.forEach(f => {
    f.blocks.forEach(b => used.add(b));
    if (f.indexBlock !== undefined) used.add(f.indexBlock);
  });
  return Array.from({ length: TOTAL_BLOCKS }, (_, i) => i).filter(i => !used.has(i));
}

function addFile() {
  const name   = document.getElementById("fname").value.trim() || `file${files.length}`;
  const nBlk   = parseInt(document.getElementById("fblocks").value, 10);
  const method = document.getElementById("method").value;
  if (!nBlk || nBlk <= 0) { showToast("Invalid block count", "error"); return; }
  const free = getFreeBlocks();
  const needed = method === "Indexed" ? nBlk + 1 : nBlk;
  if (free.length < needed) { showToast("Not enough free blocks", "error"); return; }

  const colorIdx = files.length % getFileColors().length;
  let newFile = { name, blocks: [], color: colorIdx };

  if (method === "Contiguous") {
    // Find contiguous run of nBlk free blocks
    let start = -1;
    for (let i = 0; i <= TOTAL_BLOCKS - nBlk; i++) {
      if (free.includes(i) && Array.from({length: nBlk}, (_, j) => i+j).every(b => free.includes(b))) {
        start = i; break;
      }
    }
    if (start === -1) { showToast(`No contiguous run of ${nBlk} blocks`, "error"); return; }
    newFile.blocks = Array.from({ length: nBlk }, (_, j) => start + j);

  } else if (method === "Linked") {
    // Pick nBlk random free blocks
    const picked = free.sort(() => Math.random() - 0.5).slice(0, nBlk).sort((a,b) => a-b);
    newFile.blocks = picked;

  } else { // Indexed
    const indexBlock = free[0];
    const dataBlocks = free.slice(1, 1 + nBlk).sort((a, b) => a - b);
    newFile.indexBlock = indexBlock;
    newFile.blocks     = dataBlocks;
  }

  files.push(newFile);
  drawGrid();
  renderFileTable();
  showToast(`${name} allocated (${nBlk} blocks, ${method})`, "success");
}

function drawGrid() {
  const method  = document.getElementById("method").value;
  const blockMap = Array(TOTAL_BLOCKS).fill(null); // null = free, {fileIdx, type}
  files.forEach((f, fi) => {
    if (f.indexBlock !== undefined) blockMap[f.indexBlock] = { fi, type: "index" };
    f.blocks.forEach(b => blockMap[b] = { fi, type: "data" });
  });

  const colors  = getFileColors();
  const borders = getFileBorderColors();
  const v = document.getElementById("viz");
  if (!v) return;
  v.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(10,1fr);gap:3px;position:relative" id="blockGrid">
      ${blockMap.map((b, i) => {
        if (!b) return `<div class="disk-block free" title="Block ${i}">${i}</div>`;
        const f = files[b.fi];
        const isIndex = b.type === "index";
        return `<div class="disk-block used ${isIndex ? 'index-block' : ''}"
          style="background:${isIndex ? 'var(--accent-orange-dim)' : colors[b.fi % colors.length]};border:1.5px solid ${isIndex ? 'var(--accent-orange)' : borders[b.fi % borders.length]}"
          title="${isIndex ? 'Index block for ' : ''}${f.name} — Block ${i}">${i}</div>`;
      }).join("")}
    </div>`;

  // Draw arrows for Linked/Indexed using SVG overlay
  if (method === "Linked" || method === "Indexed") {
    drawArrows(method, blockMap);
  }
}

function drawArrows(method, blockMap) {
  // Arrows are conceptual — shown in file table, not SVG (complex to position over grid)
}

function renderFileTable() {
  const method = document.getElementById("method").value;
  const el = document.getElementById("fileTable");
  if (!el) return;
  const colors  = getFileColors();
  const borders = getFileBorderColors();
  el.innerHTML = `
    <table>
      <thead><tr><th>File</th><th>Blocks</th>
        ${method === "Indexed" ? "<th>Index Block</th>" : ""}
        ${method === "Linked"  ? "<th>Chain</th>" : ""}
        <th></th>
      </tr></thead>
      <tbody>
        ${files.map((f, i) => `
          <tr>
            <td><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${borders[i%borders.length]};margin-right:6px"></span>${f.name}</td>
            <td class="mono">${f.blocks.join(", ")}</td>
            ${method === "Indexed" ? `<td class="mono">${f.indexBlock ?? "—"}</td>` : ""}
            ${method === "Linked"  ? `<td class="mono" style="font-size:.75rem">${f.blocks.map((b,j) => j < f.blocks.length-1 ? `${b}→${f.blocks[j+1]}` : `${b}→EOF`).join(", ")}</td>` : ""}
            <td><button class="btn btn-danger btn-sm" onclick="removeFile(${i})">Remove</button></td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

window.removeFile = function(i) { files.splice(i, 1); drawGrid(); renderFileTable(); };

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addFile")?.addEventListener("click", addFile);
  document.getElementById("method")?.addEventListener("change", () => { files = []; drawGrid(); renderFileTable(); });
  document.getElementById("resetBtn")?.addEventListener("click", () => { files = []; drawGrid(); renderFileTable(); });
  drawGrid();
  renderFileTable();
});
