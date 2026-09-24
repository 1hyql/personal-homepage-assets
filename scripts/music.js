const JSON_URL = 'music.json';

let playlist = [];
let currentIndex = 0;
let isPlaying = false;
let playMode = 'list';
let audio = new Audio();
let config = { defaultPcBg: '', defaultMobileBg: '' };

const titleEl = document.getElementById('title');
const artistEl = document.getElementById('artist');
const playIcon = document.getElementById('play-icon');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const modeBtn = document.getElementById('mode-btn');
const listBtn = document.getElementById('list-btn');
const closeListBtn = document.getElementById('close-list-btn');
const playlistPanel = document.getElementById('playlist-panel');
const playlistItems = document.getElementById('playlist-items');
const progressBar = document.getElementById('progress-bar');
const progressCurrent = document.getElementById('progress-current');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const bgContainer = document.getElementById('bg-container');

async function init() {
  try {
    const res = await fetch(JSON_URL);
    const data = await res.json();
    config = data;
    playlist = data.playlist;
    renderPlaylist();
    loadSong(0);
  } catch (err) {
    titleEl.textContent = '加载失败';
    artistEl.textContent = '请检查 music.json 路径或 CORS 配置';
    console.error('读取 music.json 失败:', err);
  }
}

function applyBackground(index) {
  if (!playlist[index]) return;
  const song = playlist[index];
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  let bgUrl = isMobile 
    ? (song.mobileBg || config.defaultMobileBg) 
    : (song.pcBg || config.defaultPcBg);

  if (bgUrl) {
    bgContainer.style.backgroundImage = `url('${bgUrl}')`;
  } else {
    bgContainer.style.backgroundImage = 'none';
  }
}

function loadSong(index) {
  if (!playlist.length) return;
  currentIndex = index;
  const song = playlist[currentIndex];
  titleEl.textContent = song.title;
  artistEl.textContent = song.artist;
  audio.src = song.src;
  audio.load();

  applyBackground(currentIndex);

  if (isPlaying) audio.play().catch(e => console.log('播放被拦截:', e));
  
  document.querySelectorAll('.playlist-item').forEach((el, i) => {
    el.classList.toggle('active', i === currentIndex);
  });
}

function togglePlay() {
  if (!playlist.length) return;
  if (isPlaying) audio.pause();
  else audio.play().catch(e => console.log('播放失败:', e));
  isPlaying = !isPlaying;
  updatePlayIcon();
}

function updatePlayIcon() {
  if (isPlaying) playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
  else playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
}

function nextSong() {
  if (!playlist.length) return;
  if (playMode === 'random') currentIndex = Math.floor(Math.random() * playlist.length);
  else currentIndex = (currentIndex + 1) % playlist.length;
  loadSong(currentIndex);
  if (isPlaying) audio.play();
}

function prevSong() {
  if (!playlist.length) return;
  if (playMode === 'random') currentIndex = Math.floor(Math.random() * playlist.length);
  else currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  loadSong(currentIndex);
  if (isPlaying) audio.play();
}

const modes = ['list', 'random', 'single'];
const modeIcons = {
  list: '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
  random: '<svg viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>',
  single: '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="16" font-size="8" text-anchor="middle" fill="currentColor">1</text></svg>'
};

function switchMode() {
  const idx = modes.indexOf(playMode);
  playMode = modes[(idx + 1) % modes.length];
  modeBtn.innerHTML = modeIcons[playMode];
}
function renderPlaylist() {
  playlistItems.innerHTML = '';
  playlist.forEach((song, index) => {
    const div = document.createElement('div');
    div.className = `playlist-item ${index === currentIndex ? 'active' : ''}`;
    div.draggable = true;
    div.dataset.index = index;
    
    div.innerHTML = `
      <div class="drag-handle">☰</div>
      

let coverUrl = song.cover || config.defaultCover || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMzMzIi8+PC9zdmc+';

div.innerHTML = `
  <div class="drag-handle">☰</div>
  <img src="${coverUrl}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMzMzIi8+PC9zdmc+'">
  <div class="item-info">
    <div class="t">${song.title}</div>
    <div class="a">${song.artist}</div>
  </div>
  <button class="del-btn" data-index="${index}">&times;</button>
`;
      
      <div class="item-info">
        <div class="t">${song.title}</div>
        <div class="a">${song.artist}</div>
      </div>
      <button class="del-btn" data-index="${index}">&times;</button>
    `;
    
    div.addEventListener('click', (e) => {
      if (e.target.classList.contains('del-btn') || e.target.classList.contains('drag-handle')) return;
      loadSong(index);
      if (!isPlaying) togglePlay();
      playlistPanel.classList.remove('active');
    });

    div.querySelector('.del-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const delIndex = parseInt(e.target.dataset.index);
      if (playlist.length <= 1) { alert('至少保留一首歌曲'); return; }
      playlist.splice(delIndex, 1);
      if (delIndex === currentIndex) loadSong(currentIndex >= playlist.length ? 0 : currentIndex);
      else if (delIndex < currentIndex) currentIndex--;
      renderPlaylist();
    });

    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', index);
      div.style.opacity = '0.5';
    });
    div.addEventListener('dragend', () => { div.style.opacity = '1'; });
    div.addEventListener('dragover', (e) => e.preventDefault());
    div.addEventListener('drop', (e) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
      const toIndex = index;
      if (fromIndex === toIndex) return;
      const [moved] = playlist.splice(fromIndex, 1);
      playlist.splice(toIndex, 0, moved);
      if (currentIndex === fromIndex) currentIndex = toIndex;
      else if (currentIndex > fromIndex && currentIndex <= toIndex) currentIndex--;
      else if (currentIndex < fromIndex && currentIndex >= toIndex) currentIndex++;
      renderPlaylist();
    });

    playlistItems.appendChild(div);
  });
}

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const percent = (audio.currentTime / audio.duration) * 100;
  progressCurrent.style.width = `${percent}%`;
  currentTimeEl.textContent = formatTime(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => totalTimeEl.textContent = formatTime(audio.duration));

audio.addEventListener('ended', () => {
  if (playMode === 'single') {
    audio.currentTime = 0;
    audio.play();
  } else {
    nextSong();
  }
});

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

progressBar.addEventListener('click', (e) => {
  const rect = progressBar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audio.currentTime = percent * audio.duration;
});

playBtn.addEventListener('click', togglePlay);
nextBtn.addEventListener('click', nextSong);
prevBtn.addEventListener('click', prevSong);
modeBtn.addEventListener('click', switchMode);
listBtn.addEventListener('click', () => playlistPanel.classList.add('active'));
closeListBtn.addEventListener('click', () => playlistPanel.classList.remove('active'));

window.addEventListener('resize', () => applyBackground(currentIndex));

init();
