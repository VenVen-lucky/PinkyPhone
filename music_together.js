// ==================== 一起听歌功能 v2 ====================
// 全局变量
window.musicLibrary = [];
window.currentMusic = null;
window.currentMusicIndex = -1;
window.musicPlayer = null;
window.currentLyricIndex = -1;
window.parsedLyrics = [];
window.musicFloatingVisible = false;
window.playMode = "list"; // 'single' 单曲循环, 'list' 列表循环, 'random' 随机播放

// 导入临时数据
window.importMusicData = {
  audioData: null,
  lrcText: "",
  name: "",
  artist: "",
};

// 初始化音乐系统
async function initMusicSystem() {
  try {
    const savedMusic = await localforage.getItem("musicLibrary");
    let library = savedMusic || [];

    // 1. 定义保活专用轨道对象
    const keepAliveTrack = {
      id: "keep-alive-track", // 固定ID，方便识别
      name: "后台保活 (iOS专用)",
      artist: "点击播放保持后台运行",
      // 这里直接使用URL赋值给 audioData，Audio对象的src属性支持URL
      audioData:
        "https://s3plus.meituan.net/opapisdk/op_ticket_1_5677168484_1767550853950_qdqqd_794nlt.mp3",
      lyrics: "[00:00.00]正在运行后台保活...\n[00:10.00]请勿暂停，可切换App", // 简单的歌词提示
      isKeepAlive: true, // 标记这是保活轨道
      addedAt: new Date().toISOString(),
    };

    // 2. 清理旧数据中的保活轨道（防止重复添加）
    library = library.filter((m) => m.id !== "keep-alive-track");

    // 3. 将保活轨道插入到列表第一位
    library.unshift(keepAliveTrack);

    window.musicLibrary = library;

    const savedMode = await localforage.getItem("musicPlayMode");
    window.playMode = savedMode || "list";
    console.log("✓ 音乐系统初始化完成，共", window.musicLibrary.length, "首歌");
  } catch (e) {
    console.error("音乐系统初始化失败:", e);
    window.musicLibrary = [];
  }
}

// 打开一起听歌页面
function openMusicTogether() {
  const page = document.getElementById("musicTogetherPage");
  if (page) {
    page.classList.add("active");
    renderMusicLibrary();
    updatePlayModeBtn();
    closeChatPanel();
  }
}

// 关闭一起听歌页面
function closeMusicTogether() {
  const page = document.getElementById("musicTogetherPage");
  if (page) {
    page.classList.remove("active");
  }
}

// 渲染音乐库（列表形式）
function renderMusicLibrary() {
  const list = document.getElementById("musicLibraryList");
  if (!list) return;

  if (window.musicLibrary.length === 0) {
    list.innerHTML = `
      <div class="music-list-empty">
        <div class="empty-icon">🎵</div>
        <div class="empty-text">还没有音乐</div>
        <div class="empty-hint">点击下方按钮导入歌曲</div>
      </div>
    `;
    return;
  }

  list.innerHTML = window.musicLibrary
    .map(
      (music, index) => `
    <div class="music-list-item ${
      window.currentMusicIndex === index ? "playing" : ""
    }" onclick="selectMusic(${index})">
      <div class="music-list-index">${
        window.currentMusicIndex === index ? "▶" : index + 1
      }</div>
      <div class="music-list-info">
        <div class="music-list-name">${escapeHtml(music.name)}</div>
        <div class="music-list-artist">${escapeHtml(
          music.artist || "未知歌手"
        )}</div>
      </div>
      <button class="music-list-delete" onclick="event.stopPropagation(); deleteMusic(${index})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `
    )
    .join("");
}

// ==================== 导入音乐弹窗 ====================

function openMusicImportModal() {
  window.importMusicData = {
    audioData: null,
    lrcText: "",
    name: "",
    artist: "",
  };

  document.getElementById("importMusicName").value = "";
  document.getElementById("importMusicArtist").value = "";
  document.getElementById("selectedAudioName").textContent = "点击选择音频文件";
  document.getElementById("selectedAudioName").classList.remove("has-file");
  document.getElementById("selectedLrcName").textContent = "点击选择（可选）";
  document.getElementById("selectedLrcName").classList.remove("has-file");
  document.getElementById("importMusicConfirmBtn").disabled = true;

  document.getElementById("musicImportModal").style.display = "flex";
}

function closeMusicImportModal() {
  document.getElementById("musicImportModal").style.display = "none";
}

async function handleAudioFileSelect(input) {
  const file = input.files[0];
  if (!file) return;

  const nameEl = document.getElementById("selectedAudioName");
  nameEl.textContent = file.name;
  nameEl.classList.add("has-file");

  // 解析文件名
  const baseName = file.name.replace(/\.(mp3|m4a|wav|flac|ogg)$/i, "");
  let songName = baseName,
    artist = "";

  if (baseName.includes(" - ")) {
    const parts = baseName.split(" - ");
    artist = parts[0].trim();
    songName = parts.slice(1).join(" - ").trim();
  }

  const nameInput = document.getElementById("importMusicName");
  const artistInput = document.getElementById("importMusicArtist");
  if (!nameInput.value) nameInput.value = songName;
  if (!artistInput.value && artist) artistInput.value = artist;

  try {
    window.importMusicData.audioData = await readFileAsDataURL(file);
  } catch (e) {
    showMusicToast("读取文件失败");
  }

  checkImportValid();
  input.value = "";
}

async function handleLrcFileSelect(input) {
  const file = input.files[0];
  if (!file) return;

  try {
    window.importMusicData.lrcText = await readFileAsText(file);
    const nameEl = document.getElementById("selectedLrcName");
    nameEl.textContent = file.name;
    nameEl.classList.add("has-file");
  } catch (e) {
    showMusicToast("读取歌词失败");
  }
  input.value = "";
}

function clearSelectedLrc() {
  window.importMusicData.lrcText = "";
  const nameEl = document.getElementById("selectedLrcName");
  nameEl.textContent = "点击选择（可选）";
  nameEl.classList.remove("has-file");
}

function checkImportValid() {
  const name = document.getElementById("importMusicName").value.trim();
  const hasAudio = window.importMusicData.audioData;
  document.getElementById("importMusicConfirmBtn").disabled = !(
    name && hasAudio
  );
}

async function confirmImportMusic() {
  const name = document.getElementById("importMusicName").value.trim();
  const artist = document.getElementById("importMusicArtist").value.trim();

  if (!name || !window.importMusicData.audioData) {
    showMusicToast("请填写歌名并选择音频文件");
    return;
  }

  const musicItem = {
    id: Date.now() + Math.random(),
    name: name,
    artist: artist || "未知歌手",
    audioData: window.importMusicData.audioData,
    lyrics: window.importMusicData.lrcText,
    addedAt: new Date().toISOString(),
  };

  window.musicLibrary.push(musicItem);
  await localforage.setItem("musicLibrary", window.musicLibrary);

  closeMusicImportModal();
  renderMusicLibrary();
  showMusicToast("导入成功！");
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// ==================== 播放功能 ====================

function selectMusic(index) {
  const music = window.musicLibrary[index];
  if (!music) return;

  window.currentMusic = music;
  window.currentMusicIndex = index;
  window.parsedLyrics = parseLRC(music.lyrics);
  window.currentLyricIndex = -1;

  showMusicPlayer(music);
  playMusic();
  renderMusicLibrary(); // 更新列表高亮
}

function showMusicPlayer(music) {
  const section = document.getElementById("currentMusicSection");
  const nameEl = document.getElementById("musicName");
  const artistEl = document.getElementById("musicArtist");
  const lyricsContainer = document.getElementById("musicLyricsContainer");

  if (section) section.style.display = "block";
  if (nameEl) nameEl.textContent = music.name;
  if (artistEl) artistEl.textContent = music.artist || "未知歌手";

  if (lyricsContainer) {
    if (window.parsedLyrics.length > 0) {
      lyricsContainer.innerHTML = window.parsedLyrics
        .map(
          (item, i) =>
            `<div class="lyric-line" data-index="${i}">${escapeHtml(
              item.text
            )}</div>`
        )
        .join("");
    } else {
      lyricsContainer.innerHTML =
        '<div class="lyric-empty">暂无歌词，点击上方"编辑歌词"添加</div>';
    }
  }
}

function parseLRC(lrcText) {
  if (!lrcText) return [];

  const lines = lrcText.split("\n");
  const lyrics = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  lines.forEach((line) => {
    const times = [];
    let match;
    let text = line;

    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const ms = parseInt(match[3].padEnd(3, "0"));
      times.push(minutes * 60 + seconds + ms / 1000);
      text = text.replace(match[0], "");
    }

    text = text.trim();
    if (text && times.length > 0) {
      times.forEach((time) => lyrics.push({ time, text }));
    }
  });

  return lyrics.sort((a, b) => a.time - b.time);
}

function playMusic() {
  if (!window.currentMusic) return;

  if (!window.musicPlayer) {
    window.musicPlayer = new Audio();
    window.musicPlayer.addEventListener("timeupdate", updateMusicProgress);
    window.musicPlayer.addEventListener("ended", onMusicEnded);
    window.musicPlayer.addEventListener("loadedmetadata", updateMusicDuration);
  }

  // === 新增代码开始：保活轨道强制循环 ===
  if (window.currentMusic.isKeepAlive) {
    window.musicPlayer.loop = true; // 开启原生循环
  } else {
    window.musicPlayer.loop = false; // 普通歌曲关闭原生循环（由 onMusicEnded 控制列表循环）
  }
  // === 新增代码结束 ===

  window.musicPlayer.src = window.currentMusic.audioData;
  window.musicPlayer.play();
  updatePlayButton(true);
}

function pauseMusic() {
  if (window.musicPlayer) {
    window.musicPlayer.pause();
    updatePlayButton(false);
  }
}

function toggleMusicPlay() {
  if (!window.musicPlayer || !window.currentMusic) return;

  if (window.musicPlayer.paused) {
    window.musicPlayer.play();
    updatePlayButton(true);
  } else {
    window.musicPlayer.pause();
    updatePlayButton(false);
  }
}

function updatePlayButton(isPlaying) {
  const btn = document.getElementById("musicPlayBtn");
  const playIcon =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
  const pauseIcon =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';

  if (btn) btn.innerHTML = isPlaying ? pauseIcon : playIcon;
}

function updateMusicProgress() {
  if (!window.musicPlayer) return;

  const currentTime = window.musicPlayer.currentTime;
  const duration = window.musicPlayer.duration || 1;
  const progress = (currentTime / duration) * 100;

  const progressFill = document.getElementById("musicProgressFill");
  if (progressFill) progressFill.style.width = `${progress}%`;

  const currentEl = document.getElementById("musicCurrentTime");
  if (currentEl) currentEl.textContent = formatTime(currentTime);

  updateLyricHighlight(currentTime);
}

function updateMusicDuration() {
  const durationEl = document.getElementById("musicDuration");
  if (durationEl && window.musicPlayer) {
    durationEl.textContent = formatTime(window.musicPlayer.duration);
  }
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function updateLyricHighlight(currentTime) {
  if (window.parsedLyrics.length === 0) return;

  let newIndex = -1;
  for (let i = 0; i < window.parsedLyrics.length; i++) {
    if (window.parsedLyrics[i].time <= currentTime) {
      newIndex = i;
    } else {
      break;
    }
  }

  if (newIndex !== window.currentLyricIndex) {
    window.currentLyricIndex = newIndex;

    const lines = document.querySelectorAll(
      "#musicLyricsContainer .lyric-line"
    );
    lines.forEach((line, i) => line.classList.toggle("active", i === newIndex));

    if (newIndex >= 0 && lines[newIndex]) {
      lines[newIndex].scrollIntoView({ behavior: "smooth", block: "center" });
    }

    updateFloatingLyric();
    updateAIMusicContext();
  }
}

function updateAIMusicContext() {
  if (!window.currentMusic) {
    window.currentMusicContext = null;
    return;
  }

  const currentLyric =
    window.currentLyricIndex >= 0
      ? window.parsedLyrics[window.currentLyricIndex]?.text
      : "";

  const contextRange = 2;
  const startIdx = Math.max(0, window.currentLyricIndex - contextRange);
  const endIdx = Math.min(
    window.parsedLyrics.length - 1,
    window.currentLyricIndex + contextRange
  );

  const lyricContext = [];
  for (let i = startIdx; i <= endIdx; i++) {
    if (window.parsedLyrics[i]) {
      lyricContext.push({
        text: window.parsedLyrics[i].text,
        isCurrent: i === window.currentLyricIndex,
      });
    }
  }

  window.currentMusicContext = {
    songName: window.currentMusic.name,
    artist: window.currentMusic.artist,
    currentLyric: currentLyric,
    lyricContext: lyricContext,
    currentTime: window.musicPlayer
      ? formatTime(window.musicPlayer.currentTime)
      : "0:00",
    isPlaying: window.musicPlayer ? !window.musicPlayer.paused : false,
  };
}

function getMusicContextForAI() {
  if (!window.currentMusicContext) return "";

  const ctx = window.currentMusicContext;
  if (!ctx.isPlaying) return "";

  let info = `\n【一起听歌模式】\n`;
  info += `用户正在和你一起听歌，请结合歌曲内容与用户互动。\n`;
  info += `🎵 歌曲：《${ctx.songName}》- ${ctx.artist}\n`;
  info += `⏱️ 播放进度：${ctx.currentTime}\n`;

  if (ctx.lyricContext && ctx.lyricContext.length > 0) {
    info += `📝 当前歌词：\n`;
    ctx.lyricContext.forEach((item) => {
      if (item.isCurrent) {
        info += `  ▶ ${item.text} ◀（正在播放这句）\n`;
      } else {
        info += `    ${item.text}\n`;
      }
    });
  }
  info += `\n`;

  return info;
}

// ==================== 播放模式 ====================

async function togglePlayMode() {
  const modes = ["list", "single", "random"];
  const currentIndex = modes.indexOf(window.playMode);
  window.playMode = modes[(currentIndex + 1) % modes.length];

  await localforage.setItem("musicPlayMode", window.playMode);
  updatePlayModeBtn();

  const modeNames = {
    list: "列表循环",
    single: "单曲循环",
    random: "随机播放",
  };
  showMusicToast(modeNames[window.playMode]);
}

function updatePlayModeBtn() {
  const btn = document.getElementById("playModeBtn");
  if (!btn) return;

  const icons = {
    list: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>',
    single:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path><text x="12" y="14" font-size="8" fill="currentColor" text-anchor="middle">1</text></svg>',
    random:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>',
  };

  btn.innerHTML = icons[window.playMode];
  btn.title = { list: "列表循环", single: "单曲循环", random: "随机播放" }[
    window.playMode
  ];
}

function onMusicEnded() {
  updatePlayButton(false);

  if (window.musicLibrary.length === 0) return;

  if (window.playMode === "single") {
    // 单曲循环
    window.musicPlayer.currentTime = 0;
    window.musicPlayer.play();
    updatePlayButton(true);
  } else if (window.playMode === "random") {
    // 随机播放
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * window.musicLibrary.length);
    } while (
      nextIndex === window.currentMusicIndex &&
      window.musicLibrary.length > 1
    );
    selectMusic(nextIndex);
  } else {
    // 列表循环
    const nextIndex =
      (window.currentMusicIndex + 1) % window.musicLibrary.length;
    selectMusic(nextIndex);
  }
}

// 上一首/下一首
function playPrevMusic() {
  if (window.musicLibrary.length === 0) return;

  let prevIndex;
  if (window.playMode === "random") {
    do {
      prevIndex = Math.floor(Math.random() * window.musicLibrary.length);
    } while (
      prevIndex === window.currentMusicIndex &&
      window.musicLibrary.length > 1
    );
  } else {
    prevIndex =
      (window.currentMusicIndex - 1 + window.musicLibrary.length) %
      window.musicLibrary.length;
  }
  selectMusic(prevIndex);
}

function playNextMusic() {
  if (window.musicLibrary.length === 0) return;

  let nextIndex;
  if (window.playMode === "random") {
    do {
      nextIndex = Math.floor(Math.random() * window.musicLibrary.length);
    } while (
      nextIndex === window.currentMusicIndex &&
      window.musicLibrary.length > 1
    );
  } else {
    nextIndex = (window.currentMusicIndex + 1) % window.musicLibrary.length;
  }
  selectMusic(nextIndex);
}

function seekMusic(event) {
  if (!window.musicPlayer || !window.musicPlayer.duration) return;

  const progressBar = event.currentTarget;
  const rect = progressBar.getBoundingClientRect();
  const percent = (event.clientX - rect.left) / rect.width;

  window.musicPlayer.currentTime = percent * window.musicPlayer.duration;
}

function seekMusicBy(seconds) {
  if (!window.musicPlayer) return;
  window.musicPlayer.currentTime = Math.max(
    0,
    Math.min(
      window.musicPlayer.currentTime + seconds,
      window.musicPlayer.duration || 0
    )
  );
}

async function deleteMusic(index) {
  const music = window.musicLibrary[index];

  // === 新增：禁止删除保活轨道 ===
  if (music.isKeepAlive) {
    showMusicToast("这是系统内置功能，无法删除");
    return;
  }

  if (!confirm("确定要删除这首歌吗？")) return;

  if (window.currentMusic && window.currentMusic.id === music.id) {
    stopMusic();
  }

  window.musicLibrary.splice(index, 1);

  // 调整当前索引
  if (window.currentMusicIndex >= index) {
    window.currentMusicIndex = Math.max(-1, window.currentMusicIndex - 1);
  }

  await localforage.setItem("musicLibrary", window.musicLibrary);
  renderMusicLibrary();
  showMusicToast("已删除");
}

function stopMusic() {
  if (window.musicPlayer) {
    window.musicPlayer.pause();
    window.musicPlayer.currentTime = 0;
  }
  window.currentMusic = null;
  window.currentMusicIndex = -1;
  window.parsedLyrics = [];
  window.currentLyricIndex = -1;
  window.currentMusicContext = null;

  const section = document.getElementById("currentMusicSection");
  if (section) section.style.display = "none";

  hideFloatingLyric();
  renderMusicLibrary();
}

// ==================== 桌面歌词（纯文字悬浮） ====================

function startFloatingLyric() {
  if (!window.currentMusic) {
    showMusicToast("请先选择一首歌");
    return;
  }

  const floatingLyric = document.getElementById("desktopLyric");
  if (floatingLyric) {
    floatingLyric.style.display = "block";
    window.musicFloatingVisible = true;
    updateFloatingLyric();
    closeMusicTogether();
    showMusicToast("桌面歌词已开启，可拖动调整位置");
  }
}

function hideFloatingLyric() {
  const floatingLyric = document.getElementById("desktopLyric");
  if (floatingLyric) {
    floatingLyric.style.display = "none";
  }
  window.musicFloatingVisible = false;
}

function updateFloatingLyric() {
  if (!window.musicFloatingVisible) return;

  const lyricEl = document.getElementById("desktopLyricText");
  if (lyricEl) {
    if (
      window.currentLyricIndex >= 0 &&
      window.parsedLyrics[window.currentLyricIndex]
    ) {
      lyricEl.textContent = window.parsedLyrics[window.currentLyricIndex].text;
    } else {
      lyricEl.textContent = window.currentMusic
        ? `♪ ${window.currentMusic.name} ♪`
        : "♪ ♪ ♪";
    }
  }
}

// 桌面歌词拖动
let lyricDragData = {
  isDragging: false,
  startX: 0,
  startY: 0,
  initialX: 0,
  initialY: 0,
};

function initDesktopLyricDrag() {
  const lyric = document.getElementById("desktopLyric");
  if (!lyric) return;

  lyric.addEventListener("touchstart", handleLyricDragStart, {
    passive: false,
  });
  lyric.addEventListener("mousedown", handleLyricDragStart);

  document.addEventListener("touchmove", handleLyricDragMove, {
    passive: false,
  });
  document.addEventListener("mousemove", handleLyricDragMove);

  document.addEventListener("touchend", handleLyricDragEnd);
  document.addEventListener("mouseup", handleLyricDragEnd);
}

function handleLyricDragStart(e) {
  // 如果点击的是关闭按钮，不拖动
  if (e.target.closest(".desktop-lyric-close")) return;

  const lyric = document.getElementById("desktopLyric");
  if (!lyric) return;

  lyricDragData.isDragging = true;

  const touch = e.touches ? e.touches[0] : e;
  lyricDragData.startX = touch.clientX;
  lyricDragData.startY = touch.clientY;

  const rect = lyric.getBoundingClientRect();
  lyricDragData.initialX = rect.left;
  lyricDragData.initialY = rect.top;

  lyric.style.transition = "none";
  e.preventDefault();
}

function handleLyricDragMove(e) {
  if (!lyricDragData.isDragging) return;

  e.preventDefault();

  const lyric = document.getElementById("desktopLyric");
  if (!lyric) return;

  const touch = e.touches ? e.touches[0] : e;
  const deltaX = touch.clientX - lyricDragData.startX;
  const deltaY = touch.clientY - lyricDragData.startY;

  let newX = lyricDragData.initialX + deltaX;
  let newY = lyricDragData.initialY + deltaY;

  // 边界限制
  const maxX = window.innerWidth - lyric.offsetWidth;
  const maxY = window.innerHeight - lyric.offsetHeight;

  newX = Math.max(0, Math.min(newX, maxX));
  newY = Math.max(0, Math.min(newY, maxY));

  lyric.style.left = newX + "px";
  lyric.style.top = newY + "px";
  lyric.style.right = "auto";
  lyric.style.bottom = "auto";
}

function handleLyricDragEnd() {
  lyricDragData.isDragging = false;

  const lyric = document.getElementById("desktopLyric");
  if (lyric) {
    lyric.style.transition = "";
  }
}

// ==================== 编辑歌词 ====================

function openEditLyricsModal() {
  if (!window.currentMusic) {
    showMusicToast("请先选择一首歌");
    return;
  }

  const textarea = document.getElementById("editLyricsTextarea");
  if (textarea) {
    textarea.value = window.currentMusic.lyrics || "";
  }

  document.getElementById("editLyricsModal").style.display = "flex";
}

function closeEditLyricsModal() {
  document.getElementById("editLyricsModal").style.display = "none";
}

async function importLyricsToEdit(input) {
  const file = input.files[0];
  if (!file) return;

  try {
    const text = await readFileAsText(file);
    document.getElementById("editLyricsTextarea").value = text;
  } catch (e) {
    showMusicToast("读取歌词失败");
  }
  input.value = "";
}

async function saveEditedLyrics() {
  if (!window.currentMusic) return;

  const textarea = document.getElementById("editLyricsTextarea");
  if (!textarea) return;

  const lyrics = textarea.value;
  window.currentMusic.lyrics = lyrics;

  const index = window.musicLibrary.findIndex(
    (m) => m.id === window.currentMusic.id
  );
  if (index >= 0) {
    window.musicLibrary[index].lyrics = lyrics;
    await localforage.setItem("musicLibrary", window.musicLibrary);
  }

  window.parsedLyrics = parseLRC(lyrics);
  window.currentLyricIndex = -1;
  showMusicPlayer(window.currentMusic);

  closeEditLyricsModal();
  showMusicToast("歌词已保存");
}

// ==================== 工具函数 ====================

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showMusicToast(message) {
  if (typeof window.showToast === "function") {
    window.showToast(message);
  } else {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 10000;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }
}

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  initMusicSystem();
  setTimeout(initDesktopLyricDrag, 500);
});

// 导出函数
Object.assign(window, {
  openMusicTogether,
  closeMusicTogether,
  openMusicImportModal,
  closeMusicImportModal,
  handleAudioFileSelect,
  handleLrcFileSelect,
  clearSelectedLrc,
  checkImportValid,
  confirmImportMusic,
  selectMusic,
  playMusic,
  pauseMusic,
  toggleMusicPlay,
  togglePlayMode,
  playPrevMusic,
  playNextMusic,
  seekMusic,
  seekMusicBy,
  deleteMusic,
  stopMusic,
  startFloatingLyric,
  hideFloatingLyric,
  openEditLyricsModal,
  closeEditLyricsModal,
  importLyricsToEdit,
  saveEditedLyrics,
  getMusicContextForAI,
});
// ==================== 新增：首次点击自动启动保活 ====================
document.addEventListener(
  "click",
  function autoStartKeepAlive() {
    // 1. 如果已经在播放了，就不管
    if (window.musicPlayer && !window.musicPlayer.paused) return;

    // 2. 找到保活轨道
    const keepAliveIndex = window.musicLibrary.findIndex(
      (m) => m.id === "keep-alive-track"
    );

    // 3. 如果找到了，就静默启动
    if (keepAliveIndex !== -1) {
      console.log("检测到用户交互，自动启动后台保活...");
      selectMusic(keepAliveIndex);

      // 如果你不想让播放器界面弹出来挡视线，可以把下面这行注释取消掉：
      // document.getElementById('currentMusicSection').style.display = 'none';
    }

    // 4. 移除监听，只执行一次，后面就不烦用户了
    document.removeEventListener("click", autoStartKeepAlive);
  },
  { once: true, capture: true }
);
