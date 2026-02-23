// Core state and utility helpers
const state = {
  sfxOn: true,
  musicOn: false,
  leaderboard: JSON.parse(localStorage.getItem('playgroundLeaderboard') || '{}'),
};

const sounds = {
  blip: new Audio('data:audio/wav;base64,UklGRpQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YXAAAAA='),
};

function playSfx() {
  if (!state.sfxOn) return;
  sounds.blip.currentTime = 0;
  sounds.blip.play().catch(() => {});
}

// Dynamic content from SQLite-backed API
async function applyDynamicContent() {
  try {
    const res = await fetch('/api/content');
    if (!res.ok) return;
    const data = await res.json();
    const content = data.content || {};
    document.querySelectorAll('[data-content-key]').forEach((el) => {
      const key = el.dataset.contentKey;
      if (content[key]) el.textContent = content[key];
    });
  } catch (err) {
    console.warn('Dynamic content unavailable', err);
  }
}

applyDynamicContent();

// Loader
window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('loader').classList.add('hide'), 900);
});

// Typewriter
const typeTarget = document.getElementById('typewriter');
const phrases = ['Digital Playground Resume', 'Mendesain pengalaman interaktif', 'Membangun karya yang playful + elegan'];
let pIndex = 0;
let cIndex = 0;
let deleting = false;
(function typeLoop() {
  const active = phrases[pIndex];
  typeTarget.textContent = active.slice(0, cIndex);
  cIndex += deleting ? -1 : 1;
  if (!deleting && cIndex > active.length + 4) deleting = true;
  if (deleting && cIndex === 0) {
    deleting = false;
    pIndex = (pIndex + 1) % phrases.length;
  }
  setTimeout(typeLoop, deleting ? 35 : 70);
})();

// Custom cursor & magnetic button
const cursor = document.getElementById('customCursor');
const magnetic = document.querySelector('.magnetic');
window.addEventListener('mousemove', (e) => {
  cursor.style.left = `${e.clientX}px`;
  cursor.style.top = `${e.clientY}px`;
  const box = magnetic.getBoundingClientRect();
  const x = e.clientX - (box.left + box.width / 2);
  const y = e.clientY - (box.top + box.height / 2);
  magnetic.style.transform = `translate(${x * 0.08}px, ${y * 0.08}px)`;
});
magnetic.addEventListener('mouseleave', () => (magnetic.style.transform = 'translate(0,0)'));

// Background particles following cursor
const particleCanvas = document.getElementById('particleCanvas');
const pctx = particleCanvas.getContext('2d');
let mouse = { x: innerWidth / 2, y: innerHeight / 2 };
let particles = [];
function resizeCanvas() {
  particleCanvas.width = innerWidth;
  particleCanvas.height = innerHeight;
}
window.addEventListener('resize', resizeCanvas);
window.addEventListener('pointermove', (e) => (mouse = { x: e.clientX, y: e.clientY }));
resizeCanvas();
for (let i = 0; i < 55; i++) particles.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, v: Math.random() * 0.7 + 0.2 });
(function particleLoop() {
  pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  particles.forEach((p) => {
    p.x += (mouse.x - p.x) * 0.01 * p.v;
    p.y += (mouse.y - p.y) * 0.01 * p.v;
    pctx.fillStyle = 'rgba(184,145,255,0.38)';
    pctx.beginPath();
    pctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    pctx.fill();
  });
  requestAnimationFrame(particleLoop);
})();

// Skill bars animation via observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.bar span').forEach((s) => {
        s.style.width = `${s.dataset.level}%`;
      });
    }
  });
}, { threshold: 0.4 });
observer.observe(document.querySelector('.skills-grid'));

// Project filter, tilt, preview, modal
const cards = [...document.querySelectorAll('.project-card')];
const modal = document.getElementById('projectModal');
cards.forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    const rx = -(e.clientY - r.top - r.height / 2) / 16;
    const ry = (e.clientX - r.left - r.width / 2) / 16;
    card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
  });
  card.addEventListener('mouseleave', () => (card.style.transform = 'rotateX(0) rotateY(0)'));
  const v = card.querySelector('video');
  card.addEventListener('mouseenter', () => v.play().catch(() => {}));
  card.addEventListener('mouseleave', () => v.pause());
  card.addEventListener('click', () => {
    document.getElementById('modalTitle').textContent = card.dataset.title;
    document.getElementById('modalDetail').textContent = card.dataset.detail;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    playSfx();
  });
});
document.querySelectorAll('.filter').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach((x) => x.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    cards.forEach((c) => (c.style.display = f === 'all' || c.dataset.category === f ? 'block' : 'none'));
  });
});
document.getElementById('closeModal').onclick = () => modal.classList.remove('show');
modal.addEventListener('click', (e) => e.target === modal && modal.classList.remove('show'));

// Leaderboard helpers
function saveScore(game, score) {
  const best = Math.max(score, state.leaderboard[game] || 0);
  state.leaderboard[game] = best;
  localStorage.setItem('playgroundLeaderboard', JSON.stringify(state.leaderboard));
  renderLeaderboard();
}
function renderLeaderboard() {
  const ul = document.getElementById('leaderboard');
  ul.innerHTML = ['catcher', 'memory', 'runner']
    .map((k) => `<li>${k}: <strong>${state.leaderboard[k] || 0}</strong></li>`)
    .join('');
}
renderLeaderboard();

// Game 1: Skill Catcher
const catchCanvas = document.getElementById('skillCatcher');
const cctx = catchCanvas.getContext('2d');
const catcher = { x: 370, y: 240, w: 75, h: 18, score: 0 };
let drops = [];
let catchTick = 0;
const skillWords = ['HTML', 'Editing', 'Creativity', 'UI', 'JS'];
function resetCatcher() {
  catcher.score = 0;
  drops = [];
  document.getElementById('catcherScore').textContent = 'Score: 0';
}
catchCanvas.addEventListener('pointermove', (e) => {
  const r = catchCanvas.getBoundingClientRect();
  catcher.x = ((e.clientX - r.left) / r.width) * catchCanvas.width - catcher.w / 2;
  catcher.x = Math.max(0, Math.min(catchCanvas.width - catcher.w, catcher.x));
});
(function catcherLoop() {
  cctx.clearRect(0, 0, catchCanvas.width, catchCanvas.height);
  catchTick++;
  if (catchTick % 35 === 0) drops.push({ x: Math.random() * 760, y: -10, t: skillWords[Math.floor(Math.random() * skillWords.length)] });
  cctx.fillStyle = '#91c5ff';
  cctx.fillRect(catcher.x, catcher.y, catcher.w, catcher.h);
  drops = drops.filter((d) => {
    d.y += 2.2;
    cctx.fillStyle = '#ffc3a0';
    cctx.fillText(d.t, d.x, d.y);
    const hit = d.y > catcher.y && d.x > catcher.x - 8 && d.x < catcher.x + catcher.w;
    if (hit) {
      catcher.score += 5;
      document.getElementById('catcherScore').textContent = `Score: ${catcher.score}`;
      playSfx();
      saveScore('catcher', catcher.score);
      return false;
    }
    return d.y < 290;
  });
  requestAnimationFrame(catcherLoop);
})();

// Game 2: Memory Match
const memoryCards = ['UI', 'UX', 'JS', 'VID', 'UI', 'UX', 'JS', 'VID'];
const facts = { UI: 'Fun fact: Suka bereksperimen dengan glassmorphism.', UX: 'Fun fact: Prioritas utama selalu pengalaman pengguna.', JS: 'Fun fact: Menikmati coding interaktif & animasi.', VID: 'Fun fact: Sering edit video dengan timing cinematic.' };
let flipped = [];
let matched = 0;
let memoryScore = 0;
let timer = 60;
let memoryInterval;
const memoryGrid = document.getElementById('memoryGrid');
function buildMemory() {
  memoryGrid.innerHTML = '';
  flipped = [];
  matched = 0;
  memoryScore = 0;
  timer = 60;
  document.getElementById('funFact').textContent = '';
  const shuffled = [...memoryCards].sort(() => Math.random() - 0.5);
  shuffled.forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'memory-card';
    btn.dataset.value = item;
    btn.textContent = '?';
    btn.addEventListener('click', () => flipMemory(btn));
    memoryGrid.appendChild(btn);
  });
  clearInterval(memoryInterval);
  memoryInterval = setInterval(() => {
    timer--;
    updateMemoryInfo();
    if (timer <= 0) clearInterval(memoryInterval);
  }, 1000);
  updateMemoryInfo();
}
function updateMemoryInfo() {
  document.getElementById('memoryInfo').textContent = `Score: ${memoryScore} | Time: ${timer}`;
}
function flipMemory(card) {
  if (flipped.includes(card) || card.classList.contains('matched') || flipped.length === 2 || timer <= 0) return;
  card.textContent = card.dataset.value;
  card.classList.add('flipped');
  flipped.push(card);
  playSfx();
  if (flipped.length === 2) {
    const [a, b] = flipped;
    if (a.dataset.value === b.dataset.value) {
      a.classList.add('matched');
      b.classList.add('matched');
      matched += 2;
      memoryScore += 10;
      document.getElementById('funFact').textContent = facts[a.dataset.value];
      saveScore('memory', memoryScore);
      flipped = [];
      if (matched === memoryCards.length) {
        clearInterval(memoryInterval);
        const bonus = timer;
        memoryScore += bonus;
        document.getElementById('funFact').textContent = `Semua kartu cocok! Bonus waktu +${bonus} ✨`;
        saveScore('memory', memoryScore);
      }
    } else {
      setTimeout(() => {
        [a, b].forEach((x) => { x.textContent = '?'; x.classList.remove('flipped'); });
        flipped = [];
      }, 500);
    }
    updateMemoryInfo();
  }
}
buildMemory();

// Game 3: Code Runner
const runnerCanvas = document.getElementById('codeRunner');
const rctx = runnerCanvas.getContext('2d');
let runner;
function jumpRunner() {
  if (runner.y >= 170 && !runner.dead) {
    runner.vy = runner.jump;
    playSfx();
  }
}

function resetRunner() {
  runner = { y: 170, vy: 0, gravity: 0.9, jump: -12, score: 0, dead: false, bugs: [] };
  document.getElementById('runnerMessage').textContent = '';
}
resetRunner();
runnerCanvas.addEventListener('pointerdown', jumpRunner);
document.getElementById('runnerJump').addEventListener('click', jumpRunner);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') jumpRunner();
});
(function runnerLoop() {
  rctx.clearRect(0, 0, runnerCanvas.width, runnerCanvas.height);
  rctx.fillStyle = '#9ecbff';
  rctx.fillRect(0, 195, runnerCanvas.width, 4);
  if (!runner.dead && Math.random() < 0.02) runner.bugs.push({ x: runnerCanvas.width, w: 20, h: 20 });
  runner.vy += runner.gravity;
  runner.y += runner.vy;
  if (runner.y > 170) { runner.y = 170; runner.vy = 0; }
  rctx.fillStyle = '#b891ff';
  rctx.fillRect(60, runner.y, 24, 24);
  runner.bugs.forEach((b) => {
    b.x -= 5;
    rctx.fillStyle = '#ff7b9c';
    rctx.fillRect(b.x, 174, b.w, b.h);
    if (!runner.dead && b.x < 82 && b.x + b.w > 60 && runner.y + 24 > 174) {
      runner.dead = true;
      document.getElementById('runnerMessage').textContent = '💥 SyntaxError: Kamu kena bug! Coba lagi ya.';
      saveScore('runner', Math.floor(runner.score));
    }
  });
  runner.bugs = runner.bugs.filter((b) => b.x > -30);
  if (!runner.dead) runner.score += 0.12;
  document.getElementById('runnerScore').textContent = `Score: ${Math.floor(runner.score)}`;
  requestAnimationFrame(runnerLoop);
})();

// Reset buttons
Array.from(document.querySelectorAll('[data-reset]')).forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.reset;
    if (key === 'catcher') resetCatcher();
    if (key === 'memory') buildMemory();
    if (key === 'runner') {
      saveScore('runner', Math.floor(runner.score));
      resetRunner();
    }
  });
});

// Audio toggles
const bgMusic = document.getElementById('bgMusic');
document.getElementById('sfxToggle').addEventListener('click', (e) => {
  state.sfxOn = !state.sfxOn;
  e.target.textContent = `SFX: ${state.sfxOn ? 'On' : 'Off'}`;
});
document.getElementById('musicToggle').addEventListener('click', async (e) => {
  state.musicOn = !state.musicOn;
  if (state.musicOn) {
    await bgMusic.play().catch(() => {});
  } else {
    bgMusic.pause();
  }
  e.target.textContent = `Music: ${state.musicOn ? 'On' : 'Off'}`;
});

// Easter egg: 5 clicks on logo/header
let easterClicks = 0;
document.getElementById('logoTrigger').addEventListener('click', () => {
  easterClicks++;
  if (easterClicks >= 5) {
    document.getElementById('secretMode').classList.add('show');
    setTimeout(() => document.getElementById('secretMode').classList.remove('show'), 2500);
    easterClicks = 0;
  }
});

// CTA and form validation
document.getElementById('ctaBtn').addEventListener('click', () => {
  document.getElementById('projects').scrollIntoView({ behavior: 'smooth' });
});
document.getElementById('contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('name');
  const email = document.getElementById('email');
  const message = document.getElementById('message');
  const status = document.getElementById('formStatus');
  if (!name.value.trim() || !email.value.includes('@') || message.value.trim().length < 8) {
    status.textContent = 'Mohon isi data dengan benar ✨';
    status.style.color = '#ff98b8';
    return;
  }
  status.textContent = 'Pesan berhasil dikirim! Terima kasih 💌';
  status.style.color = '#8ec5ff';
  e.target.reset();
});
