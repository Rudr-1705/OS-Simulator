const ThemeManager = {
  key: 'os-sim-theme',
  init() {
    const saved = localStorage.getItem(this.key) || 'light';
    this.apply(saved);
  },
  toggle() {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    this.apply(next);
    localStorage.setItem(this.key, next);
  },
  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('#themeIcon').forEach(icon => {
      if (theme === 'dark') {
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
      } else {
        icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => ThemeManager.init());

function showToast(message, type = 'info', duration = 3000) {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    document.body.appendChild(c);
  }
  const icons = { success: '✓', error: '✕', warning: '!', info: 'i' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `
    <span style="width:16px;height:16px;border-radius:50%;background:currentColor;display:flex;align-items:center;justify-content:center;font-size:.6rem;color:var(--bg-card);font-weight:700;flex-shrink:0">${icons[type] ?? 'i'}</span>
    <span>${message}</span>`;
  c.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 350);
  }, duration);
}
function animateCounter(el,target,duration=700,prefix='',suffix='',decimals=0){if(!el)return;const start=performance.now();const startVal=parseFloat((el.textContent||'').replace(/[^0-9.-]/g,''))||0;function update(now){const t=Math.min((now-start)/duration,1);const e=1-Math.pow(1-t,3);const v=startVal+(target-startVal)*e;el.textContent=prefix+v.toFixed(decimals)+suffix;if(t<1)requestAnimationFrame(update);else el.textContent=prefix+Number(target).toFixed(decimals)+suffix}requestAnimationFrame(update)}
const SPEED_MAP={1:1200,2:700,3:400,4:180,5:60}; function getDelay(speedValue){return SPEED_MAP[speedValue]||400}
function toggleTheory(){const panel=document.getElementById('theoryContent');const btn=document.getElementById('theoryToggleBtn');if(!panel)return;const open=panel.style.display!=='none';panel.style.display=open?'none':'block';if(btn){const lab=btn.querySelector('.theory-toggle-label');if(lab)lab.textContent=open?'Theory':'Hide';else btn.textContent=open?'Show Theory':'Hide Theory'}}
function processColor(index,alpha=1){const hues=[214,262,180,142,38,0,320,170,45,280];const h=hues[index%hues.length];return `hsla(${h}, 70%, 55%, ${alpha})`}
function validatePosInt(val,fieldName,min=0){const n=parseInt(val,10);if(isNaN(n)||n<=min){showToast(`${fieldName} must be a positive integer > ${min}`,'error');return null}return n}
function deepClone(obj){return JSON.parse(JSON.stringify(obj))} function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function fmt(n,d=2){return Number(n).toFixed(d)} function shuffle(arr){return [...arr].sort(()=>Math.random()-0.5)} function range(n){return [...Array(n).keys()]}
function initTabs(containerSelector, contentPrefix, onChange){const container=document.querySelector(containerSelector);if(!container)return;container.querySelectorAll('.tab-btn').forEach(btn=>{btn.addEventListener('click',()=>{container.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const tabId=btn.dataset.tab||btn.dataset.mm||btn.dataset.algo||btn.dataset.a;if(contentPrefix){document.querySelectorAll(`[id^="${contentPrefix}"]`).forEach(el=>el.style.display='none');const target=document.getElementById(`${contentPrefix}${tabId}`);if(target)target.style.display='block';}if(onChange)onChange(tabId,btn);});});}
function setupHiDpiCanvas(canvas){const dpr=window.devicePixelRatio||1;const rect=canvas.getBoundingClientRect();canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);return {ctx,W:rect.width,H:rect.height,dpr};}
