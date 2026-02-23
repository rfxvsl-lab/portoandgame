const labels = {
  hero_intro: 'Hero Intro',
  hero_name: 'Hero Nama',
  hero_subtitle: 'Hero Subtitle',
  about_title: 'Judul About',
  story_1_title: 'Story 1 Judul',
  story_1_text: 'Story 1 Teks',
  story_2_title: 'Story 2 Judul',
  story_2_text: 'Story 2 Teks',
  story_3_title: 'Story 3 Judul',
  story_3_text: 'Story 3 Teks',
  projects_title: 'Judul Projects',
  games_title: 'Judul Games',
  leaderboard_title: 'Judul Leaderboard',
  project_1_title: 'Project 1 Title',
  project_2_title: 'Project 2 Title',
  project_3_title: 'Project 3 Title',
  game_1_desc: 'Deskripsi Game 1',
  game_3_desc: 'Deskripsi Game 3',
  secret_message: 'Pesan Secret Mode',
  contact_title: 'Judul Contact',
  contact_button: 'Tombol Contact',
  skill_html: 'Skill HTML (%)',
  skill_js: 'Skill JavaScript (%)',
  skill_editing: 'Skill Editing (%)',
  skill_creativity: 'Skill Creativity (%)',
  enable_blockblast: 'Aktifkan Block Blast (true/false)',
  enable_cat_mouse: 'Aktifkan Cat Mouse (true/false)',
  enable_rocket_touch: 'Aktifkan Rocket Touch (true/false)',
  theme_mode: 'Theme Default (dark/light)',
  sfx_default: 'SFX Default (on/off)',
  music_default: 'Music Default (on/off)',
  icon_scale: 'Skala Icon (contoh: 1 atau 1.2)',
  font_scale: 'Skala Font (contoh: 1 atau 1.1)'
};

const loginBox = document.getElementById('loginBox');
const editorBox = document.getElementById('editorBox');
const contentForm = document.getElementById('contentForm');

async function fetchSession() {
  const res = await fetch('/api/session');
  const data = await res.json();
  return data.authenticated;
}

async function fetchContent() {
  const res = await fetch('/api/content');
  const data = await res.json();
  return data.content;
}

function renderForm(content) {
  contentForm.innerHTML = '';
  Object.entries(labels).forEach(([key, label]) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'field';
    const input = document.createElement((key.includes('_text') || key.includes('message')) ? 'textarea' : 'input');
    if (input.tagName === 'INPUT') input.type = 'text';
    input.id = key;
    input.value = content[key] || '';
    input.required = true;
    const l = document.createElement('label');
    l.setAttribute('for', key);
    l.textContent = label;
    wrapper.appendChild(input);
    wrapper.appendChild(l);
    contentForm.appendChild(wrapper);
  });
}

async function initPanel() {
  const authed = await fetchSession();
  if (authed) {
    loginBox.style.display = 'none';
    editorBox.style.display = 'block';
    renderForm(await fetchContent());
  }
}

initPanel();

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const status = document.getElementById('loginStatus');
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    status.textContent = data.error || 'Login gagal';
    status.style.color = '#ff98b8';
    return;
  }
  status.textContent = 'Login berhasil';
  status.style.color = '#8ec5ff';
  loginBox.style.display = 'none';
  editorBox.style.display = 'block';
  renderForm(await fetchContent());
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  const payload = {};
  Object.keys(labels).forEach((key) => {
    payload[key] = document.getElementById(key).value;
  });
  const res = await fetch('/api/content/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: payload }),
  });
  const data = await res.json();
  const status = document.getElementById('saveStatus');
  if (!res.ok) {
    status.textContent = data.error || 'Gagal menyimpan';
    status.style.color = '#ff98b8';
    return;
  }
  status.textContent = 'Perubahan disimpan ke SQLite ✅';
  status.style.color = '#8ec5ff';
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  editorBox.style.display = 'none';
  loginBox.style.display = 'block';
});
