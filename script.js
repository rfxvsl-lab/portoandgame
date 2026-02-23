const state = {
  sfxOn: true,
  musicOn: false,
  theme: 'dark',
  content: {},
  leaderboard: JSON.parse(localStorage.getItem('playgroundLeaderboard') || '{}'),
  isAdminLive: false,
  layout: JSON.parse(localStorage.getItem('adminLayoutDraft') || '{}'),
};

const sounds = {
  blip: new Audio('data:audio/wav;base64,UklGRpQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YXAAAAA='),
};

const bgMusic = document.getElementById('bgMusic');

function playSfx() {
  if (!state.sfxOn) return;
  sounds.blip.currentTime = 0;
  sounds.blip.play().catch(() => {});
}

function playTapTone() {
  if (!state.sfxOn) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.value = 360;
  g.gain.value = 0.05;
  o.connect(g); g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.05);
}

document.addEventListener('pointerdown', () => playTapTone(), { passive: true });

async function fetchContent() {
  try {
    const res = await fetch('/api/content');
    if (!res.ok) return {};
    const data = await res.json();
    return data.content || {};
  } catch {
    return {};
  }
}

async function applyDynamicContent() {
  state.content = await fetchContent();
  document.querySelectorAll('[data-content-key]').forEach((el) => {
    const key = el.dataset.contentKey;
    if (state.content[key] !== undefined) el.textContent = state.content[key];
  });

  document.querySelectorAll('[data-skill-key]').forEach((el) => {
    const k = el.dataset.skillKey;
    const v = Number(state.content[k] || el.dataset.level || 0);
    el.dataset.level = String(Math.max(0, Math.min(100, v)));
  });

  document.querySelectorAll('[data-game-toggle]').forEach((card) => {
    const enabled = (state.content[card.dataset.gameToggle] || 'true') === 'true';
    card.style.display = enabled ? 'block' : 'none';
  });

  const iconScale = Number(state.content.icon_scale || 1);
  const fontScale = Number(state.content.font_scale || 1);
  document.documentElement.style.setProperty('--icon-scale', String(iconScale));
  document.documentElement.style.setProperty('--font-scale', String(fontScale));

  state.sfxOn = (state.content.sfx_default || 'on') === 'on';
  state.musicOn = (state.content.music_default || 'off') === 'on';
  state.theme = state.content.theme_mode || 'dark';
  applyTheme();
  document.getElementById('sfxToggle').textContent = `SFX: ${state.sfxOn ? 'On' : 'Off'}`;
  document.getElementById('musicToggle').textContent = `Music: ${state.musicOn ? 'On' : 'Off'}`;
  document.getElementById('themeToggle').textContent = `Mode: ${state.theme === 'dark' ? 'Dark' : 'Light'}`;
  if (state.musicOn) bgMusic.play().catch(() => {});
}

function applyTheme() {
  if (state.theme === 'light') {
    document.body.classList.add('light-mode');
  } else {
    document.body.classList.remove('light-mode');
  }
}

function saveScore(game, score) {
  const best = Math.max(score, state.leaderboard[game] || 0);
  state.leaderboard[game] = best;
  localStorage.setItem('playgroundLeaderboard', JSON.stringify(state.leaderboard));
  renderLeaderboard();
}

function renderLeaderboard() {
  const ul = document.getElementById('leaderboard');
  const keys = ['catcher', 'memory', 'runner', 'block', 'cat', 'rocket'];
  ul.innerHTML = keys.map((k) => `<li>${k}: <strong>${state.leaderboard[k] || 0}</strong></li>`).join('');
}

window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('loader').classList.add('hide'), 700);
});

(async function init() {
  await applyDynamicContent();
  renderLeaderboard();
  bootUi();
  bootGames();
  checkAdminLiveMode();
})();

function bootUi() {
  const typeTarget = document.getElementById('typewriter');
  const phrases = ['Digital Playground Resume', 'Mendesain pengalaman interaktif', 'Membangun karya yang playful + elegan'];
  let pIndex = 0; let cIndex = 0; let deleting = false;
  (function typeLoop() {
    const active = phrases[pIndex];
    typeTarget.textContent = active.slice(0, cIndex);
    cIndex += deleting ? -1 : 1;
    if (!deleting && cIndex > active.length + 5) deleting = true;
    if (deleting && cIndex === 0) { deleting = false; pIndex = (pIndex + 1) % phrases.length; }
    setTimeout(typeLoop, deleting ? 35 : 70);
  })();

  const cursor = document.getElementById('customCursor');
  const magnetic = document.querySelector('.magnetic');
  window.addEventListener('mousemove', (e) => {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
    const b = magnetic.getBoundingClientRect();
    magnetic.style.transform = `translate(${(e.clientX - (b.left + b.width / 2)) * 0.08}px, ${(e.clientY - (b.top + b.height / 2)) * 0.08}px)`;
  });
  magnetic.addEventListener('mouseleave', () => (magnetic.style.transform = 'translate(0,0)'));

  const particleCanvas = document.getElementById('particleCanvas');
  const pctx = particleCanvas.getContext('2d');
  let mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  let particles = [];
  const resize = () => { particleCanvas.width = innerWidth; particleCanvas.height = innerHeight; };
  resize(); window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => (mouse = { x: e.clientX, y: e.clientY }));
  for (let i = 0; i < 60; i++) particles.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, v: Math.random() + 0.2 });
  (function loop() {
    pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    particles.forEach((p) => {
      p.x += (mouse.x - p.x) * 0.01 * p.v;
      p.y += (mouse.y - p.y) * 0.01 * p.v;
      pctx.fillStyle = 'rgba(184,145,255,.35)';
      pctx.beginPath(); pctx.arc(p.x, p.y, 2, 0, Math.PI * 2); pctx.fill();
    });
    requestAnimationFrame(loop);
  })();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.bar span').forEach((s) => { s.style.width = `${s.dataset.level}%`; });
      }
    });
  }, { threshold: 0.4 });
  observer.observe(document.querySelector('.skills-grid'));

  const cards = [...document.querySelectorAll('.project-card')];
  const modal = document.getElementById('projectModal');
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.transform = `rotateX(${-(e.clientY - r.top - r.height / 2) / 16}deg) rotateY(${(e.clientX - r.left - r.width / 2) / 16}deg)`;
    });
    card.addEventListener('mouseleave', () => (card.style.transform = 'rotateX(0) rotateY(0)'));
    const v = card.querySelector('video');
    card.addEventListener('mouseenter', () => v.play().catch(() => {}));
    card.addEventListener('mouseleave', () => v.pause());
    card.addEventListener('click', () => {
      document.getElementById('modalTitle').textContent = card.dataset.title;
      document.getElementById('modalDetail').textContent = card.dataset.detail;
      modal.classList.add('show');
    });
  });
  document.querySelectorAll('.filter').forEach((btn) => btn.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach((x) => x.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    cards.forEach((c) => (c.style.display = f === 'all' || c.dataset.category === f ? 'block' : 'none'));
  }));
  document.getElementById('closeModal').onclick = () => modal.classList.remove('show');
  modal.addEventListener('click', (e) => e.target === modal && modal.classList.remove('show'));

  document.getElementById('ctaBtn').addEventListener('click', () => document.getElementById('projects').scrollIntoView({ behavior: 'smooth' }));
  document.getElementById('contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const msg = document.getElementById('message').value.trim();
    const status = document.getElementById('formStatus');
    if (!name || !email.includes('@') || msg.length < 8) {
      status.textContent = 'Mohon isi data dengan benar ✨';
      status.style.color = '#ff98b8'; return;
    }
    status.textContent = 'Pesan berhasil dikirim! Terima kasih 💌';
    status.style.color = '#8ec5ff';
    e.target.reset();
  });

  document.getElementById('sfxToggle').addEventListener('click', (e) => {
    state.sfxOn = !state.sfxOn; e.target.textContent = `SFX: ${state.sfxOn ? 'On' : 'Off'}`;
  });
  document.getElementById('musicToggle').addEventListener('click', async (e) => {
    state.musicOn = !state.musicOn;
    if (state.musicOn) await bgMusic.play().catch(() => {}); else bgMusic.pause();
    e.target.textContent = `Music: ${state.musicOn ? 'On' : 'Off'}`;
  });
  document.getElementById('themeToggle').addEventListener('click', (e) => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark'; applyTheme();
    e.target.textContent = `Mode: ${state.theme === 'dark' ? 'Dark' : 'Light'}`;
  });

  let easter = 0;
  document.getElementById('logoTrigger').addEventListener('click', () => {
    easter++; if (easter >= 5) { document.getElementById('secretMode').classList.add('show'); setTimeout(() => document.getElementById('secretMode').classList.remove('show'), 2500); easter = 0; }
  });
}

function bootGames() {
  // Game 1 Skill catcher
  const catchCanvas = document.getElementById('skillCatcher');
  const cctx = catchCanvas.getContext('2d');
  const catcher = { x: 370, y: 240, w: 75, h: 18, score: 0 };
  let drops = []; let tick = 0; const words = ['HTML', 'Editing', 'Creativity', 'UI', 'JS'];
  const resetCatcher = () => { catcher.score = 0; drops = []; document.getElementById('catcherScore').textContent = 'Score: 0'; };
  catchCanvas.addEventListener('pointermove', (e) => {
    const r = catchCanvas.getBoundingClientRect();
    catcher.x = ((e.clientX - r.left) / r.width) * catchCanvas.width - catcher.w / 2;
    catcher.x = Math.max(0, Math.min(catchCanvas.width - catcher.w, catcher.x));
  });
  (function loop() {
    cctx.clearRect(0, 0, catchCanvas.width, catchCanvas.height); tick++;
    if (tick % 35 === 0) drops.push({ x: Math.random() * 760, y: -10, t: words[Math.floor(Math.random() * words.length)] });
    cctx.fillStyle = '#91c5ff'; cctx.fillRect(catcher.x, catcher.y, catcher.w, catcher.h);
    drops = drops.filter((d) => {
      d.y += 2.2; cctx.fillStyle = '#ffc3a0'; cctx.fillText(d.t, d.x, d.y);
      const hit = d.y > catcher.y && d.x > catcher.x - 8 && d.x < catcher.x + catcher.w;
      if (hit) { catcher.score += 5; document.getElementById('catcherScore').textContent = `Score: ${catcher.score}`; saveScore('catcher', catcher.score); return false; }
      return d.y < 290;
    });
    requestAnimationFrame(loop);
  })();

  // Game 2 memory
  const memoryCards = ['UI', 'UX', 'JS', 'VID', 'UI', 'UX', 'JS', 'VID'];
  const facts = { UI: 'Fun fact: Suka bereksperimen dengan glassmorphism.', UX: 'Fun fact: Prioritas utama selalu pengalaman pengguna.', JS: 'Fun fact: Menikmati coding interaktif & animasi.', VID: 'Fun fact: Sering edit video cinematic.' };
  let flipped = []; let matched = 0; let memoryScore = 0; let timer = 60; let timerInt;
  const grid = document.getElementById('memoryGrid');
  function buildMemory() {
    grid.innerHTML = ''; flipped = []; matched = 0; memoryScore = 0; timer = 60; document.getElementById('funFact').textContent = '';
    [...memoryCards].sort(() => Math.random() - 0.5).forEach((it) => {
      const btn = document.createElement('button'); btn.className = 'memory-card'; btn.dataset.value = it; btn.textContent = '?';
      btn.addEventListener('click', () => flip(btn)); grid.appendChild(btn);
    });
    clearInterval(timerInt);
    timerInt = setInterval(() => { timer--; info(); if (timer <= 0) clearInterval(timerInt); }, 1000);
    info();
  }
  const info = () => { document.getElementById('memoryInfo').textContent = `Score: ${memoryScore} | Time: ${timer}`; };
  function flip(card) {
    if (flipped.includes(card) || card.classList.contains('matched') || flipped.length === 2 || timer <= 0) return;
    card.textContent = card.dataset.value; card.classList.add('flipped'); flipped.push(card);
    if (flipped.length === 2) {
      const [a, b] = flipped;
      if (a.dataset.value === b.dataset.value) {
        a.classList.add('matched'); b.classList.add('matched'); matched += 2; memoryScore += 10; saveScore('memory', memoryScore);
        document.getElementById('funFact').textContent = facts[a.dataset.value]; flipped = [];
        if (matched === memoryCards.length) { clearInterval(timerInt); memoryScore += timer; saveScore('memory', memoryScore); info(); }
      } else {
        setTimeout(() => { [a, b].forEach((x) => { x.textContent = '?'; x.classList.remove('flipped'); }); flipped = []; }, 450);
      }
      info();
    }
  }
  buildMemory();

  // Game3 runner
  const runnerCanvas = document.getElementById('codeRunner'); const rctx = runnerCanvas.getContext('2d');
  let runner = { y: 170, vy: 0, jump: -12, gravity: 0.9, dead: false, score: 0, bugs: [] };
  function jumpRunner() { if (runner.y >= 170 && !runner.dead) runner.vy = runner.jump; }
  function resetRunner() { runner = { y: 170, vy: 0, jump: -12, gravity: 0.9, dead: false, score: 0, bugs: [] }; document.getElementById('runnerMessage').textContent = ''; }
  runnerCanvas.addEventListener('pointerdown', jumpRunner); document.getElementById('runnerJump').addEventListener('click', jumpRunner);
  window.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') jumpRunner(); });
  (function loop() {
    rctx.clearRect(0, 0, runnerCanvas.width, runnerCanvas.height);
    rctx.fillStyle = '#9ecbff'; rctx.fillRect(0, 195, runnerCanvas.width, 4);
    if (!runner.dead && Math.random() < 0.02) runner.bugs.push({ x: runnerCanvas.width, w: 20, h: 20 });
    runner.vy += runner.gravity; runner.y += runner.vy; if (runner.y > 170) { runner.y = 170; runner.vy = 0; }
    rctx.fillStyle = '#b891ff'; rctx.fillRect(60, runner.y, 24, 24);
    runner.bugs.forEach((b) => {
      b.x -= 5; rctx.fillStyle = '#ff7b9c'; rctx.fillRect(b.x, 174, b.w, b.h);
      if (!runner.dead && b.x < 82 && b.x + b.w > 60 && runner.y + 24 > 174) { runner.dead = true; document.getElementById('runnerMessage').textContent = '💥 SyntaxError: Kamu kena bug!'; saveScore('runner', Math.floor(runner.score)); }
    });
    runner.bugs = runner.bugs.filter((b) => b.x > -30); if (!runner.dead) runner.score += 0.12;
    document.getElementById('runnerScore').textContent = `Score: ${Math.floor(runner.score)}`;
    requestAnimationFrame(loop);
  })();

  // Game4 block blast lite
  const bCanvas = document.getElementById('blockBlast'); const bctx = bCanvas.getContext('2d');
  const bs = { grid: Array.from({ length: 8 }, () => Array(8).fill(0)), score: 0, selected: null };
  const pieces = [ [[1,1],[1,1]], [[1,1,1]], [[1],[1],[1]], [[1,0],[1,1]] ];
  function drawBlock() {
    const cell = 32; bctx.clearRect(0,0,bCanvas.width,bCanvas.height);
    for (let y=0;y<8;y++) for (let x=0;x<8;x++) {
      bctx.strokeStyle='rgba(255,255,255,.15)'; bctx.strokeRect(40+x*cell,30+y*cell,cell,cell);
      if (bs.grid[y][x]) { bctx.fillStyle='#8ec5ff'; bctx.fillRect(42+x*cell,32+y*cell,cell-4,cell-4); }
    }
    if (bs.selected) {
      bctx.fillStyle='rgba(255,195,160,.8)';
      bs.selected.shape.forEach((r,yy)=>r.forEach((v,xx)=>{ if(v) bctx.fillRect(370+xx*cell,80+yy*cell,cell-4,cell-4); }));
    }
    document.getElementById('blockScore').textContent = `Score: ${Math.min(bs.score, 99999999)}`;
  }
  function clearLines(){
    for(let i=0;i<8;i++){
      if(bs.grid[i].every(Boolean)){bs.grid[i]=Array(8).fill(0);bs.score+=500;}
      if(bs.grid.map(r=>r[i]).every(Boolean)){for(let y=0;y<8;y++)bs.grid[y][i]=0;bs.score+=500;}
    }
  }
  function placePiece(gx,gy){
    if(!bs.selected) return;
    const sh=bs.selected.shape;
    for(let y=0;y<sh.length;y++)for(let x=0;x<sh[0].length;x++)if(sh[y][x]){ if(gx+x>7||gy+y>7||bs.grid[gy+y][gx+x]) return; }
    for(let y=0;y<sh.length;y++)for(let x=0;x<sh[0].length;x++)if(sh[y][x]) bs.grid[gy+y][gx+x]=1;
    bs.score += 120; clearLines(); bs.selected=null; drawBlock(); saveScore('block', bs.score);
  }
  bCanvas.addEventListener('pointerdown',(e)=>{
    const r=bCanvas.getBoundingClientRect(); const x=(e.clientX-r.left)*(bCanvas.width/r.width); const y=(e.clientY-r.top)*(bCanvas.height/r.height);
    if(x>350&&x<700&&y>60&&y<260){ bs.selected={shape: pieces[Math.floor(Math.random()*pieces.length)]}; drawBlock(); return; }
    const gx=Math.floor((x-40)/32), gy=Math.floor((y-30)/32); if(gx>=0&&gy>=0&&gx<8&&gy<8) placePiece(gx,gy);
  });
  drawBlock();

  // Game5 cat mouse
  const catCanvas = document.getElementById('catMouse'); const catx = catCanvas.getContext('2d');
  const cat = { x: 100, y: 100, score: 0 }; let mouse = { x: 600, y: 130 };
  catCanvas.addEventListener('pointermove', (e)=>{
    const r=catCanvas.getBoundingClientRect(); cat.x=(e.clientX-r.left)*(catCanvas.width/r.width); cat.y=(e.clientY-r.top)*(catCanvas.height/r.height);
  });
  (function catLoop(){
    catx.clearRect(0,0,catCanvas.width,catCanvas.height);
    mouse.x += (Math.random()-0.5)*6; mouse.y += (Math.random()-0.5)*6;
    mouse.x=Math.max(20,Math.min(catCanvas.width-20,mouse.x)); mouse.y=Math.max(20,Math.min(catCanvas.height-20,mouse.y));
    catx.fillStyle='#ffc3a0'; catx.beginPath(); catx.arc(cat.x,cat.y,16,0,Math.PI*2); catx.fill();
    catx.fillStyle='#8ec5ff'; catx.beginPath(); catx.arc(mouse.x,mouse.y,10,0,Math.PI*2); catx.fill();
    if (Math.hypot(cat.x-mouse.x,cat.y-mouse.y) < 24) { cat.score += 25; mouse={x:Math.random()*760+20,y:Math.random()*220+20}; saveScore('cat', cat.score); }
    document.getElementById('catScore').textContent = `Score: ${cat.score}`;
    requestAnimationFrame(catLoop);
  })();

  // Game6 rocket touch
  const rc = document.getElementById('rocketTouch'); const rx = rc.getContext('2d');
  const rocket = { x: rc.width/2, y: rc.height-36, score: 0, dead: false, ast: [] };
  rc.addEventListener('pointermove',(e)=>{ const r=rc.getBoundingClientRect(); rocket.x=(e.clientX-r.left)*(rc.width/r.width); });
  rc.addEventListener('pointerdown',(e)=>{ const r=rc.getBoundingClientRect(); rocket.x=(e.clientX-r.left)*(rc.width/r.width); });
  (function rocketLoop(){
    rx.clearRect(0,0,rc.width,rc.height);
    if(!rocket.dead && Math.random()<0.03) rocket.ast.push({x:Math.random()*rc.width,y:-10,s:2+Math.random()*3});
    rx.fillStyle='#b891ff'; rx.fillRect(rocket.x-10, rocket.y-18, 20, 28);
    rocket.ast.forEach(a=>{ a.y+=a.s; rx.fillStyle='#ff7b9c'; rx.beginPath(); rx.arc(a.x,a.y,10,0,Math.PI*2); rx.fill(); if(!rocket.dead&&Math.hypot(a.x-rocket.x,a.y-rocket.y)<20){rocket.dead=true;saveScore('rocket',Math.floor(rocket.score));}});
    rocket.ast=rocket.ast.filter(a=>a.y<rc.height+20);
    if(!rocket.dead) rocket.score+=0.2;
    document.getElementById('rocketScore').textContent=`Score: ${Math.floor(rocket.score)}`;
    requestAnimationFrame(rocketLoop);
  })();

  document.querySelectorAll('[data-reset]').forEach((btn) => btn.addEventListener('click', () => {
    const k = btn.dataset.reset;
    if (k === 'catcher') resetCatcher();
    if (k === 'memory') buildMemory();
    if (k === 'runner') resetRunner();
    if (k === 'block') { bs.grid = Array.from({ length: 8 }, () => Array(8).fill(0)); bs.score = 0; bs.selected = null; drawBlock(); }
    if (k === 'cat') { cat.score = 0; mouse = { x: 600, y: 130 }; }
    if (k === 'rocket') { rocket.score = 0; rocket.dead = false; rocket.ast = []; }
  }));
}

async function checkAdminLiveMode() {
  try {
    const res = await fetch('/api/session');
    const data = await res.json();
    if (!data.authenticated) return;
    state.isAdminLive = true;
    enableLiveEdit();
  } catch {}
}

function enableLiveEdit() {
  document.body.classList.add('admin-live-edit');
  const editable = document.querySelectorAll('[data-content-key]');
  editable.forEach((el, i) => {
    el.contentEditable = 'true';
    el.dataset.editId = el.dataset.editId || `editable-${i}`;
    el.addEventListener('blur', async () => {
      const key = el.dataset.contentKey;
      await fetch('/api/content/update', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content: { [key]: el.textContent } }) });
    });
  });

  // drag/resize cards, font & icon scale with wheel while alt pressed
  document.querySelectorAll('.glass').forEach((card, i) => {
    card.dataset.layoutId = card.dataset.layoutId || `card-${i}`;
    card.style.resize = 'both';
    card.style.overflow = 'auto';
    let start = null;
    card.addEventListener('pointerdown', (e) => {
      if (!e.shiftKey) return;
      start = { x: e.clientX, y: e.clientY, left: card.offsetLeft, top: card.offsetTop };
      card.setPointerCapture(e.pointerId);
      card.style.position = 'relative';
      card.style.zIndex = 15;
    });
    card.addEventListener('pointermove', (e) => {
      if (!start) return;
      const dx = e.clientX - start.x; const dy = e.clientY - start.y;
      card.style.left = `${start.left + dx}px`; card.style.top = `${start.top + dy}px`;
    });
    card.addEventListener('pointerup', async () => {
      if (!start) return;
      start = null;
      const layout = JSON.parse(state.content.layout_json || '{}');
      layout[card.dataset.layoutId] = { left: card.style.left || '0px', top: card.style.top || '0px', width: card.style.width || '', height: card.style.height || '' };
      state.content.layout_json = JSON.stringify(layout);
      await fetch('/api/content/update', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content: { layout_json: state.content.layout_json } }) });
    });
  });

  const layout = JSON.parse(state.content.layout_json || '{}');
  document.querySelectorAll('.glass').forEach((card) => {
    const x = layout[card.dataset.layoutId];
    if (!x) return;
    card.style.position = 'relative';
    card.style.left = x.left; card.style.top = x.top;
    if (x.width) card.style.width = x.width;
    if (x.height) card.style.height = x.height;
  });

  document.addEventListener('wheel', async (e) => {
    if (!e.altKey) return;
    e.preventDefault();
    const dir = e.deltaY > 0 ? -0.05 : 0.05;
    if (e.ctrlKey) {
      const next = Math.max(0.7, Math.min(1.8, Number(state.content.icon_scale || 1) + dir));
      state.content.icon_scale = String(next);
      document.documentElement.style.setProperty('--icon-scale', String(next));
      await fetch('/api/content/update', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content: { icon_scale: state.content.icon_scale } }) });
    } else {
      const next = Math.max(0.8, Math.min(1.6, Number(state.content.font_scale || 1) + dir));
      state.content.font_scale = String(next);
      document.documentElement.style.setProperty('--font-scale', String(next));
      await fetch('/api/content/update', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content: { font_scale: state.content.font_scale } }) });
    }
  }, { passive: false });
}
