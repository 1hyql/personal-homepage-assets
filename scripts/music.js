let playlist = [];
let currentIndex = 0;
let isPlaying = false;
let playMode = 'list';
let audio = new Audio();
let preloader = new Audio(); // 预加载器
preloader.preload = 'auto';

let config = { defaultPcBg: '', defaultMobileBg: '', defaultCover: '' };

// DOM 元素获取
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

// ⭐️ 修改后的初始化逻辑：直接读取 HTML 传入的全局变量
function init() {
  try {
    const data = window.MUSIC_DATA;
    if (!data || !data.playlist || data.playlist.length === 0) {
      throw new Error('MUSIC_DATA 未定义或歌单为空');
    }
    
    config = data;
    playlist = data.playlist;
    
    // 从 localStorage 恢复上次播放的索引
    const savedIndex = localStorage.getItem('music_currentIndex');
    if (savedIndex !== null) {
      const idx = parseInt(savedIndex);
      if (idx >= 0 && idx < playlist.length) {
        currentIndex = idx;
      }
    }
    
    renderPlaylist();
    loadSong(currentIndex); // 载入恢复的歌曲
  } catch (err) {
    titleEl.textContent = '加载失败';
    artistEl.textContent = '请检查 HTML 中的 MUSIC_DATA 配置';
    console.error('读取 MUSIC_DATA 失败:', err);
  }
}

function applyBackground(index) {
  if (!playlist[index]) return;
  const song = playlist[index];
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  let bgUrl = isMobile 
    ? (song.mobileBg || config.defaultMobileBg || song.cover || config.defaultCover) 
    : (song.pcBg || config.defaultPcBg || song.cover || config.defaultCover);

  if (bgUrl) {
    bgContainer.style.backgroundImage = `url('${bgUrl}')`;
  } else {
    bgContainer.style.backgroundImage = 'none';
  }
}

// 核心：预加载下一首
function preloadNextSong() {
  if (playlist.length <= 1) return;
  let nextIndex = (currentIndex + 1) % playlist.length;
  if (playMode === 'random') nextIndex = Math.floor(Math.random() * playlist.length);
  else if (playMode === 'single') nextIndex = currentIndex;
  
  const nextSong = playlist[nextIndex];
  if (nextSong && preloader.src !== nextSong.src) {
    preloader.src = nextSong.src;
    preloader.load();
  }
}

// 核心：加载歌曲（autoPlay 决定是否载入后立刻播放）
function loadSong(index, autoPlay = false) {
  if (!playlist.length) return;
  currentIndex = index;
  
  // 记录进度到本地
  localStorage.setItem('music_currentIndex', index);
  
  const song = playlist[currentIndex];
  titleEl.textContent = song.title;
  artistEl.textContent = song.artist;
  audio.src = song.src;
  audio.load();

  applyBackground(currentIndex);

  // 更新列表高亮
  document.querySelectorAll('.playlist-item').forEach((el, i) => {
    el.classList.toggle('active', i === currentIndex);
  });

  // 如果需要自动播放
  if (autoPlay) {
    audio.play().catch(e => {
      console.log('播放被拦截:', e);
      // 如果播放被拦截，重置UI状态
      isPlaying = false;
      updatePlayIcon();
    });
  }
}

function togglePlay() {
  if (!playlist.length) return;
  if (audio.paused) {
    audio.play().catch(e => console.log('播放失败:', e));
  } else {
    audio.pause();
  }
}

function updatePlayIcon() {
  if (isPlaying) playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
  else playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
}

// 核心：上下首逻辑，支持自动判断是否继续播放
function nextSong(autoPlay = !audio.paused) {
  if (!playlist.length) return;
  if (playMode === 'random') currentIndex = Math.floor(Math.random() * playlist.length);
  else currentIndex = (currentIndex + 1) % playlist.length;
  loadSong(currentIndex, autoPlay);
}

function prevSong(autoPlay = !audio.paused) {
  if (!playlist.length) return;
  if (playMode === 'random') currentIndex = Math.floor(Math.random() * playlist.length);
  else currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  loadSong(currentIndex, autoPlay);
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
  // 模式切换后立即预加载匹配的下一首
  preloadNextSong();
}

function renderPlaylist() {
  playlistItems.innerHTML = '';
  playlist.forEach((song, index) => {
    const div = document.createElement('div');
    div.className = `playlist-item ${index === currentIndex ? 'active' : ''}`;
    div.draggable = true;
    div.dataset.index = index;

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

    div.addEventListener('click', (e) => {
      if (e.target.classList.contains('del-btn') || e.target.classList.contains('drag-handle')) return;
      loadSong(index, true); // 点击列表必然需要自动播放
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

// ⭐️ 核心修复：完全依赖底层事件同步状态，彻底避免“卡住”
audio.addEventListener('play', () => {
  isPlaying = true;
  updatePlayIcon();
});

audio.addEventListener('pause', () => {
  isPlaying = false;
  updatePlayIcon();
});

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const percent = (audio.currentTime / audio.duration) * 100;
  progressCurrent.style.width = `${percent}%`;
  currentTimeEl.textContent = formatTime(audio.currentTime);

  // ⭐️ 核心修复：剩余 15 秒时触发预加载
  if (audio.duration - audio.currentTime <= 15 && audio.duration - audio.currentTime > 0) {
    preloadNextSong();
  }
});

audio.addEventListener('loadedmetadata', () => totalTimeEl.textContent = formatTime(audio.duration));

audio.addEventListener('ended', () => {
  if (playMode === 'single') {
    audio.currentTime = 0;
    audio.play();
  } else {
    nextSong(true); // ⭐️ 自然结束，强制自动播放下一首
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
nextBtn.addEventListener('click', () => nextSong());
prevBtn.addEventListener('click', () => prevSong());
modeBtn.addEventListener('click', switchMode);
listBtn.addEventListener('click', () => playlistPanel.classList.add('active'));
closeListBtn.addEventListener('click', () => playlistPanel.classList.remove('active'));

window.addEventListener('resize', () => applyBackground(currentIndex));

// 启动播放器
init();
