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
const lyricsBtn = document.getElementById('lyrics-btn');
const playlistPanel = document.getElementById('playlist-panel');
const playlistItems = document.getElementById('playlist-items');
const lyricsSection = document.getElementById('lyrics-section');
const lyricsContent = document.getElementById('lyrics-content');
const progressBar = document.getElementById('progress-bar');
const progressCurrent = document.getElementById('progress-current');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const bgContainer = document.getElementById('bg-container');

// 歌词相关变量
let currentLyrics = null;
let lyricsLines = [];
let lyricsTimeoutId = null;

// 等待DOM和外部资源加载完成
window.addEventListener('load', init);

function init() {
  try {
    // 直接使用内嵌的数据
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
    loadSong(currentIndex); // 载入恢复的歌曲（不自动播放）
    
    // 设置页面可见性变化监听，修复离开浏览器后暂停问题
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 设置页面焦点变化监听
    document.addEventListener('pagehide', handlePageHide);
    document.addEventListener('pageshow', handlePageShow);
    
  } catch (err) {
    titleEl.textContent = '加载失败';
    artistEl.textContent = '请检查音乐数据配置';
    console.error('读取 MUSIC_DATA 失败:', err);
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    // 页面隐藏时，保持播放状态
    console.log('页面隐藏，继续播放');
  }
}

function handlePageHide(event) {
  // 页面即将被卸载时，保存播放状态
  if (event.persisted) {
    // 页面被缓存，保存播放状态
    localStorage.setItem('music_isPlaying', isPlaying);
    localStorage.setItem('music_currentTime', audio.currentTime);
    console.log('页面被缓存，保存播放状态');
  }
}

function handlePageShow(event) {
  // 页面重新显示时，恢复播放状态
  const wasPlaying = localStorage.getItem('music_isPlaying') === 'true';
  const savedTime = localStorage.getItem('music_currentTime');
  
  if (wasPlaying && audio.paused) {
    // 恢复播放
    audio.currentTime = parseFloat(savedTime) || 0;
    audio.play().catch(e => console.log('恢复播放失败:', e));
  }
  
  // 清理保存的状态
  localStorage.removeItem('music_isPlaying');
  localStorage.removeItem('music_currentTime');
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

// 预加载下一首
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

// 歌词相关函数
function loadLyrics(index) {
  if (!playlist[index]) return;
  
  const song = playlist[index];
  currentLyrics = song.lyrics;
  
  if (!currentLyrics || currentLyrics.length === 0) {
    lyricsContent.innerHTML = '<div class="lyrics-line" id="no-lyrics">暂无歌词</div>';
    lyricsLines = [];
    return;
  }
  
  // 如果歌词是URL，加载歌词文件
  if (typeof currentLyrics === 'string') {
    loadLyricsFromUrl(currentLyrics);
    return;
  }
  
  // 按时间排序歌词
  lyricsLines = [...currentLyrics].sort((a, b) => a.time - b.time);
  
  // 渲染歌词
  lyricsContent.innerHTML = '';
  lyricsLines.forEach((line, index) => {
    const div = document.createElement('div');
    div.className = 'lyrics-line';
    div.dataset.time = line.time;
    div.textContent = line.text;
    div.addEventListener('click', () => {
      audio.currentTime = line.time;
    });
    lyricsContent.appendChild(div);
  });
}

// 从URL加载歌词
async function loadLyricsFromUrl(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const text = await response.text();
    parseLrcText(text);
  } catch (error) {
    console.error('加载歌词失败:', error);
    if (lyricsContent) {
      lyricsContent.innerHTML = '<div class="lyrics-line" id="no-lyrics">歌词加载失败</div>';
    }
    lyricsLines = [];
  }
}

// 解析LRC格式歌词
function parseLrcText(text) {
  const lines = text.split('\n');
  lyricsLines = [];
  
  lines.forEach(line => {
    // 匹配 [mm:ss.xx] 文本 格式
    const match = line.match(/\[(\d{2}):(\d{2})\.\d{2}\]\s*(.+)/);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const time = minutes * 60 + seconds;
      const text = match[3];
      lyricsLines.push({ time, text });
    }
  });
  
  // 按时间排序
  lyricsLines.sort((a, b) => a.time - b.time);
  
  // 渲染歌词
  if (lyricsContent) {
    lyricsContent.innerHTML = '';
    lyricsLines.forEach((line, index) => {
      const div = document.createElement('div');
      div.className = 'lyrics-line';
      div.dataset.time = line.time;
      div.textContent = line.text;
      div.addEventListener('click', () => {
        audio.currentTime = line.time;
      });
      lyricsContent.appendChild(div);
    });
  }
}

function updateLyrics() {
  if (!lyricsLines || lyricsLines.length === 0) return;
  
  const currentTime = audio.currentTime;
  
  // 清除之前的超时
  if (lyricsTimeoutId) {
    clearTimeout(lyricsTimeoutId);
  }
  
  // 找到当前应该高亮的歌词行
  let activeIndex = -1;
  for (let i = lyricsLines.length - 1; i >= 0; i--) {
    if (currentTime >= lyricsLines[i].time) {
      activeIndex = i;
      break;
    }
  }
  
  // 更新歌词高亮
  document.querySelectorAll('.lyrics-line').forEach((line, index) => {
    line.classList.toggle('active', index === activeIndex);
  });
  
  // 如果有歌词容器，滚动到当前行
  if (activeIndex >= 0 && lyricsSection) {
    const activeLine = document.querySelectorAll('.lyrics-line')[activeIndex];
    if (activeLine && lyricsSection) {
      const lineHeight = activeLine.offsetHeight;
      const wrapperHeight = lyricsSection.offsetHeight;
      const lineTop = activeLine.offsetTop;
      const lineBottom = lineTop + lineHeight;
      
      if (lineTop < lyricsSection.scrollTop || lineBottom > lyricsSection.scrollTop + wrapperHeight) {
        // 居中显示当前行
        lyricsSection.scrollTop = lineTop - (wrapperHeight / 2) + (lineHeight / 2);
      }
    }
  }
  
  // 设置下一次更新的超时
  if (activeIndex >= 0 && activeIndex < lyricsLines.length - 1) {
    const nextTime = lyricsLines[activeIndex + 1].time;
    const delay = (nextTime - currentTime) * 1000;
    lyricsTimeoutId = setTimeout(updateLyrics, Math.max(0, delay));
  } else if (activeIndex === lyricsLines.length - 1) {
    // 最后一行歌词，5秒后清除高亮
    lyricsTimeoutId = setTimeout(() => {
      document.querySelectorAll('.lyrics-line').forEach(line => {
        line.classList.remove('active');
      });
    }, 5000);
  }
}

// 核心：加载歌曲，autoPlay 决定是否自动播放
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
  loadLyrics(currentIndex); // 加载歌词

  // 更新系统锁屏和通知栏的元数据
  if ('mediaSession' in navigator) {
    let coverUrl = song.cover || config.defaultCover || 'https://cdn.jsdelivr.net/gh/1hyql/personal-homepage-assets@v1.1.1/images/music/cover/default.jpg';
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      album: '我的音乐',
      artwork: [{ src: coverUrl, sizes: '512x512', type: 'image/jpeg' }]
    });
  }

  // 更新列表高亮
  document.querySelectorAll('.playlist-item').forEach((el, i) => {
    el.classList.toggle('active', i === currentIndex);
  });

  if (autoPlay) {
    audio.play().catch(e => {
      console.log('播放被拦截:', e);
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

// 上下首逻辑，支持自动判断是否继续播放
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
  preloadNextSong();
}

function toggleLyrics() {
  const isVisible = lyricsSection.style.display !== 'none';
  lyricsSection.style.display = isVisible ? 'none' : 'block';
  lyricsBtn.classList.toggle('active', !isVisible);
  
  // 如果显示歌词，立即更新一次
  if (!isVisible) {
    updateLyrics();
  }
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
      loadSong(index, true); // 点击列表必然自动播放
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

// 同步播放/暂停状态到系统锁屏
audio.addEventListener('play', () => {
  isPlaying = true;
  updatePlayIcon();
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'playing';
    // 增强通知栏控制器
    updateNotificationControls();
  }
  // 开始更新歌词
  updateLyrics();
});

audio.addEventListener('pause', () => {
  isPlaying = false;
  updatePlayIcon();
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'paused';
  }
  // 停止歌词更新
  if (lyricsTimeoutId) {
    clearTimeout(lyricsTimeoutId);
    lyricsTimeoutId = null;
  }
});

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const percent = (audio.currentTime / audio.duration) * 100;
  progressCurrent.style.width = `${percent}%`;
  currentTimeEl.textContent = formatTime(audio.currentTime);

  // 更新歌词
  if (lyricsSection && lyricsSection.style.display !== 'none') {
    updateLyrics();
  }

  // 剩余 15 秒时触发预加载
  if (audio.duration - audio.currentTime <= 15 && audio.duration - audio.currentTime > 0) {
    preloadNextSong();
  }
});

audio.addEventListener('loadedmetadata', () => {
  totalTimeEl.textContent = formatTime(audio.duration);
  // 加载歌词
  loadLyrics(currentIndex);
});

audio.addEventListener('ended', () => {
  if (playMode === 'single') {
    audio.currentTime = 0;
    audio.play();
  } else {
    nextSong(true); // 自然结束强制下一首
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
lyricsBtn.addEventListener('click', toggleLyrics);

window.addEventListener('resize', () => applyBackground(currentIndex));

// 注册锁屏/通知栏的控制按钮事件
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => { audio.play(); });
  navigator.mediaSession.setActionHandler('pause', () => { audio.pause(); });
  navigator.mediaSession.setActionHandler('previoustrack', () => { prevSong(true); });
  navigator.mediaSession.setActionHandler('nexttrack', () => { nextSong(true); });
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details.seekTime) audio.currentTime = details.seekTime;
  });
}

// 增强通知栏控制器
function updateNotificationControls() {
  if ('mediaSession' in navigator) {
    // 设置通知栏图标
    navigator.mediaSession.setActionHandler('play', () => { audio.play(); });
    navigator.mediaSession.setActionHandler('pause', () => { audio.pause(); });
    navigator.mediaSession.setActionHandler('previoustrack', () => { prevSong(true); });
    navigator.mediaSession.setActionHandler('nexttrack', () => { nextSong(true); });
    
    // 添加自定义操作（可选）
    if (navigator.mediaSession.setActionHandler) {
      try {
        // 设置播放状态
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      } catch (e) {
        console.log('设置媒体会话状态失败:', e);
      }
    }
  }
}