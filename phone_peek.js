// ==================== 查手机功能 v3 - iPhone风格 ====================

// 缓存数据 - 按角色ID分开存储
window.phoneDataByChar = {};

// 缓存有效期（毫秒）
const PHONE_CACHE_EXPIRY = 2 * 60 * 60 * 1000; // 2小时

// 当前打开的App
window.currentPhoneApp = null;

// 壁纸数据
window.phoneWallpapers = {};

// SVG图标定义
const PhoneIcons = {
  memo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>`,
  shopping: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>`,
  music: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 18V5l12-2v13"></path>
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="16" r="3"></circle>
  </svg>`,
  album: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>`,
  browser: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>`,
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z"/>
  </svg>`,
  bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <path d="M16 10a4 4 0 0 1-8 0"></path>
  </svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>`,
  image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>`,
  error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>`,
  upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>`
};

// 预设壁纸 - 浅色系
const WallpaperPresets = [
  { id: 'gradient-1', css: 'linear-gradient(180deg, #a8edea 0%, #fed6e3 100%)' },
  { id: 'gradient-2', css: 'linear-gradient(180deg, #d299c2 0%, #fef9d7 100%)' },
  { id: 'gradient-3', css: 'linear-gradient(180deg, #89f7fe 0%, #66a6ff 100%)' },
  { id: 'gradient-4', css: 'linear-gradient(180deg, #ffecd2 0%, #fcb69f 100%)' },
  { id: 'gradient-5', css: 'linear-gradient(180deg, #a1c4fd 0%, #c2e9fb 100%)' },
  { id: 'gradient-6', css: 'linear-gradient(180deg, #f5f7fa 0%, #c3cfe2 100%)' }
];

// 初始化
async function initPhonePeek() {
  try {
    const saved = await localforage.getItem('phoneDataByChar');
    if (saved) {
      window.phoneDataByChar = saved;
    }
    
    const wallpapers = await localforage.getItem('phoneWallpapers');
    if (wallpapers) {
      window.phoneWallpapers = wallpapers;
    }
    
    console.log('✓ 查手机功能初始化完成');
  } catch (e) {
    console.error('查手机初始化失败:', e);
  }
}

// 获取当前角色的手机数据
function getCharPhoneData() {
  const charId = currentChatCharId;
  if (!charId) return null;
  
  if (!window.phoneDataByChar[charId]) {
    window.phoneDataByChar[charId] = {
      memo: { data: null, lastUpdate: null },
      shopping: { data: null, lastUpdate: null },
      music: { data: null, lastUpdate: null },
      album: { data: null, lastUpdate: null },
      chat: { data: null, lastUpdate: null },
      browser: { data: null, lastUpdate: null }
    };
  }
  
  return window.phoneDataByChar[charId];
}

// 获取当前角色的壁纸
function getCharWallpaper() {
  const charId = currentChatCharId;
  if (!charId || !window.phoneWallpapers[charId]) {
    return WallpaperPresets[0].css;
  }
  return window.phoneWallpapers[charId];
}

// 设置壁纸
async function setCharWallpaper(wallpaperCss) {
  const charId = currentChatCharId;
  if (!charId) return;
  
  window.phoneWallpapers[charId] = wallpaperCss;
  await localforage.setItem('phoneWallpapers', window.phoneWallpapers);
  
  // 更新显示
  const screen = document.querySelector('.phone-screen');
  if (screen) {
    screen.style.setProperty('--phone-wallpaper', wallpaperCss);
  }
}

// 打开查手机页面
function openPhonePeek() {
  if (!currentChatCharId) {
    showToast('请先打开一个对话');
    return;
  }
  
  const page = document.getElementById('phonePeekPage');
  if (page) {
    page.classList.add('active');
    
    // 应用壁纸
    const screen = document.querySelector('.phone-screen');
    if (screen) {
      screen.style.setProperty('--phone-wallpaper', getCharWallpaper());
    }
    
    showPhoneHome();
    if (typeof closeChatPanel === 'function') closeChatPanel();
  }
}

// 关闭查手机页面
function closePhonePeek() {
  const page = document.getElementById('phonePeekPage');
  if (page) {
    page.classList.remove('active');
  }
  window.currentPhoneApp = null;
}

// 获取当前时间和日期
function getTimeAndDate() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const weekday = weekdays[now.getDay()];
  
  return {
    time: `${hours}:${minutes}`,
    date: `${month}月${date}日 ${weekday}`
  };
}

// 显示手机桌面
function showPhoneHome() {
  window.currentPhoneApp = null;
  
  const content = document.getElementById('phoneContent');
  const header = document.getElementById('phoneAppHeader');
  const body = document.querySelector('.phone-body');
  const screen = document.querySelector('.phone-screen');
  
  if (header) header.style.display = 'none';
  if (body) body.classList.remove('app-open');
  if (screen) screen.classList.remove('app-mode');
  
  const { time, date } = getTimeAndDate();
  
  if (content) {
    content.innerHTML = `
      <div class="phone-home">
        <!-- 时间小组件 -->
        <div class="phone-time-widget">
          <div class="phone-time-display" id="phoneTimeWidget">${time}</div>
          <div class="phone-date-display">${date}</div>
        </div>
        
        <!-- App网格 -->
        <div class="phone-app-grid">
          <div class="phone-app-icon" onclick="openPhoneApp('memo')">
            <div class="app-icon-img app-icon-memo">${PhoneIcons.memo}</div>
            <div class="app-icon-name">备忘录</div>
          </div>
          <div class="phone-app-icon" onclick="openPhoneApp('shopping')">
            <div class="app-icon-img app-icon-shopping">${PhoneIcons.shopping}</div>
            <div class="app-icon-name">购物车</div>
          </div>
          <div class="phone-app-icon" onclick="openPhoneApp('music')">
            <div class="app-icon-img app-icon-music">${PhoneIcons.music}</div>
            <div class="app-icon-name">音乐</div>
          </div>
          <div class="phone-app-icon" onclick="openPhoneApp('album')">
            <div class="app-icon-img app-icon-album">${PhoneIcons.album}</div>
            <div class="app-icon-name">相册</div>
          </div>
          <div class="phone-app-icon" onclick="openPhoneApp('chat')">
            <div class="app-icon-img app-icon-chat">${PhoneIcons.chat}</div>
            <div class="app-icon-name">聊天</div>
          </div>
          <div class="phone-app-icon" onclick="openPhoneApp('browser')">
            <div class="app-icon-img app-icon-browser">${PhoneIcons.browser}</div>
            <div class="app-icon-name">浏览器</div>
          </div>
        </div>
        
        <!-- 刷新按钮 -->
        <button class="phone-refresh-btn" id="phoneRefreshAllBtn" onclick="refreshAllPhoneApps()">
          ${PhoneIcons.refresh}
          <span class="refresh-text">刷新内容</span>
        </button>
      </div>
    `;
  }
}

// 打开App
async function openPhoneApp(appType) {
  window.currentPhoneApp = appType;
  
  const content = document.getElementById('phoneContent');
  const header = document.getElementById('phoneAppHeader');
  const body = document.querySelector('.phone-body');
  const screen = document.querySelector('.phone-screen');
  
  const appNames = {
    memo: '备忘录',
    shopping: '购物车', 
    music: '最近在听',
    album: '相册',
    chat: '聊天记录',
    browser: '浏览记录'
  };
  
  // 添加全屏覆盖class
  if (body) body.classList.add('app-open');
  if (screen) screen.classList.add('app-mode');
  
  if (header) {
    header.style.display = 'flex';
    header.querySelector('.phone-app-title').textContent = appNames[appType];
  }
  
  // 检查是否有缓存数据
  const charPhoneData = getCharPhoneData();
  const cache = charPhoneData?.[appType];
  
  if (cache?.data) {
    // 有缓存就显示
    renderPhoneApp(appType, cache.data);
  } else {
    // 没有缓存显示空状态
    const appIcons = {
      memo: PhoneIcons.memo,
      shopping: PhoneIcons.shopping,
      music: PhoneIcons.music,
      album: PhoneIcons.album,
      chat: PhoneIcons.chat,
      browser: PhoneIcons.browser
    };
    
    content.innerHTML = `
      <div class="phone-app-empty">
        ${appIcons[appType]}
        <div class="empty-text">暂无内容</div>
        <div class="empty-hint">返回主页点击刷新按钮加载</div>
      </div>
    `;
  }
}

// 获取App数据（带缓存）
async function getPhoneAppData(appType, forceRefresh = false) {
  const charPhoneData = getCharPhoneData();
  if (!charPhoneData) {
    throw new Error('请先打开一个对话');
  }
  
  const cache = charPhoneData[appType];
  const now = Date.now();
  
  if (!forceRefresh && cache.data && cache.lastUpdate && (now - cache.lastUpdate < PHONE_CACHE_EXPIRY)) {
    return cache.data;
  }
  
  const data = await generatePhoneContent(appType);
  
  charPhoneData[appType] = {
    data: data,
    lastUpdate: now
  };
  await localforage.setItem('phoneDataByChar', window.phoneDataByChar);
  
  return data;
}

// 刷新全部App内容
async function refreshAllPhoneApps() {
  const btn = document.getElementById('phoneRefreshAllBtn');
  if (btn) {
    btn.classList.add('loading');
    btn.querySelector('.refresh-text').textContent = '刷新中...';
  }
  
  const appTypes = ['memo', 'shopping', 'music', 'album', 'chat', 'browser'];
  let successCount = 0;
  let failCount = 0;
  
  for (const appType of appTypes) {
    try {
      await getPhoneAppData(appType, true);
      successCount++;
      if (btn) {
        btn.querySelector('.refresh-text').textContent = `刷新中 ${successCount}/6`;
      }
    } catch (e) {
      console.error(`刷新${appType}失败:`, e);
      failCount++;
    }
  }
  
  if (btn) {
    btn.classList.remove('loading');
    btn.querySelector('.refresh-text').textContent = '刷新内容';
  }
  
  if (failCount === 0) {
    showToast('全部刷新成功');
  } else if (successCount > 0) {
    showToast(`刷新完成 (${successCount}/${appTypes.length})`);
  } else {
    showToast('刷新失败');
  }
}

// ==================== API调用生成内容 ====================

async function generatePhoneContent(appType) {
  const apiConfig = getActiveApiConfig();
  if (!apiConfig || !apiConfig.url || !apiConfig.key) {
    throw new Error('请先配置API');
  }
  
  const char = characters.find(c => c.id === currentChatCharId);
  const settings = chatSettings[currentChatCharId] || {};
  const charName = settings.charName || char?.name || '角色';
  const persona = settings.persona || char?.persona || '一个友好的人';
  const userNickname = settings.userNickname || '用户';
  
  const prompts = getPhonePrompts(appType, charName, persona, userNickname);
  
  try {
    const response = await fetch(`${apiConfig.url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.key}`
      },
      body: JSON.stringify({
        model: apiConfig.model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: prompts.system },
          { role: 'user', content: prompts.user }
        ],
        temperature: 0.8
      })
    });
    
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('无法解析返回内容');
  } catch (e) {
    console.error('API调用失败:', e);
    throw e;
  }
}

// 获取各App的提示词
function getPhonePrompts(appType, charName, persona, userNickname) {
  const baseSystem = `你正在模拟${charName}的手机内容。${charName}的人设：${persona}。请根据这个人设生成符合角色性格的内容。用户在角色心中的称呼是"${userNickname}"。`;
  
  const prompts = {
    memo: {
      system: baseSystem,
      user: `生成${charName}的3-4条备忘录，体现角色性格。返回JSON数组格式：[{"title":"标题","content":"内容","date":"日期如3天前","pinned":是否置顶true/false}]。只返回JSON，不要其他内容。`
    },
    shopping: {
      system: baseSystem,
      user: `生成${charName}购物车里的3-4件商品，体现角色喜好。返回JSON数组：[{"name":"商品名","desc":"简短描述","price":价格数字,"added":"添加时间如昨天"}]。只返回JSON。`
    },
    music: {
      system: baseSystem,
      user: `生成${charName}最近听的4-5首歌，体现角色品味。返回JSON数组：[{"name":"歌名","artist":"歌手","reason":"为什么喜欢(可选)","recent":是否最近播放true/false}]。只返回JSON。`
    },
    album: {
      system: baseSystem,
      user: `生成${charName}相册里的2-3张照片描述，体现角色生活。返回JSON数组：[{"desc":"照片内容描述","caption":"配文(可选)","location":"地点(可选)","date":"日期"}]。只返回JSON。`
    },
    chat: {
      system: baseSystem,
      user: `生成${charName}手机里的2-3个聊天联系人及对话，体现角色社交。返回JSON数组：[{"contact":"联系人名","relation":"关系","avatar":"单个表情符号","lastMsg":"最后一条消息预览","lastTime":"时间","unread":未读数,"messages":[{"from":"me或ta","text":"消息内容"}]}]。只返回JSON。`
    },
    browser: {
      system: baseSystem,
      user: `生成${charName}的4-5条浏览器搜索历史，体现角色兴趣。返回JSON数组：[{"query":"搜索内容","type":"search或visit","time":"时间如2小时前"}]。只返回JSON。`
    }
  };
  
  return prompts[appType];
}

// ==================== 渲染各App ====================

function renderPhoneApp(appType, data) {
  const content = document.getElementById('phoneContent');
  if (!content) return;
  
  const renderers = {
    memo: renderMemoApp,
    shopping: renderShoppingApp,
    music: renderMusicApp,
    album: renderAlbumApp,
    chat: renderChatApp,
    browser: renderBrowserApp
  };
  
  if (renderers[appType]) {
    content.innerHTML = renderers[appType](data);
  }
}

// 备忘录
function renderMemoApp(data) {
  const items = data.map(item => `
    <div class="memo-item ${item.pinned ? 'pinned' : ''}">
      ${item.pinned ? `<div class="memo-pin">${PhoneIcons.pin}</div>` : ''}
      <div class="memo-title">${escapeHtml(item.title)}</div>
      <div class="memo-content">${escapeHtml(item.content)}</div>
      <div class="memo-date">${escapeHtml(item.date)}</div>
    </div>
  `).join('');
  
  return `<div class="phone-app-page memo-page">${items}</div>`;
}

// 购物车
function renderShoppingApp(data) {
  const items = data.map(item => `
    <div class="shopping-item">
      <div class="shopping-icon">${PhoneIcons.bag}</div>
      <div class="shopping-info">
        <div class="shopping-name">${escapeHtml(item.name)}</div>
        <div class="shopping-desc">${escapeHtml(item.desc || '')}</div>
        <div class="shopping-meta">
          <span class="shopping-price">¥${item.price}</span>
          <span class="shopping-time">${escapeHtml(item.added)}</span>
        </div>
      </div>
    </div>
  `).join('');
  
  return `<div class="phone-app-page shopping-page">${items}</div>`;
}

// 音乐
function renderMusicApp(data) {
  const items = data.map(item => `
    <div class="music-item ${item.recent ? 'recent' : ''}">
      <div class="music-icon">${PhoneIcons.music}</div>
      <div class="music-info">
        <div class="music-name">${escapeHtml(item.name)}</div>
        <div class="music-artist">${escapeHtml(item.artist)}</div>
        ${item.reason ? `<div class="music-reason">${escapeHtml(item.reason)}</div>` : ''}
      </div>
      ${item.recent ? `<div class="music-playing">${PhoneIcons.play}</div>` : ''}
    </div>
  `).join('');
  
  return `<div class="phone-app-page music-page">${items}</div>`;
}

// 相册
function renderAlbumApp(data) {
  const items = data.map(item => `
    <div class="album-item">
      <div class="album-placeholder">${PhoneIcons.image}</div>
      <div class="album-info">
        <div class="album-desc">${escapeHtml(item.desc)}</div>
        <div class="album-caption">${escapeHtml(item.caption || '')}</div>
        <div class="album-meta">
          <span>${escapeHtml(item.location || '')}</span>
          <span>${escapeHtml(item.date)}</span>
        </div>
      </div>
    </div>
  `).join('');
  
  return `<div class="phone-app-page album-page">${items}</div>`;
}

// 聊天记录
function renderChatApp(data, skipRealChat = false) {
  let allChats = data;
  
  if (!skipRealChat) {
    const realChatWithUser = getRealChatWithUser();
    allChats = realChatWithUser ? [realChatWithUser, ...data] : data;
  }
  
  window.phoneChatData = allChats;
  
  const items = allChats.map((chat, index) => `
    <div class="chat-list-item ${chat.isRealChat ? 'user-chat' : ''}" onclick="openChatDetail(${index})">
      <div class="chat-list-avatar">${chat.isRealChat ? PhoneIcons.heart : PhoneIcons.user}</div>
      <div class="chat-list-info">
        <div class="chat-list-top">
          <span class="chat-list-name">${escapeHtml(chat.contact)}</span>
          <span class="chat-list-time">${escapeHtml(chat.lastTime || '')}</span>
        </div>
        <div class="chat-list-bottom">
          <span class="chat-list-msg">${escapeHtml(chat.lastMsg || '')}</span>
          ${chat.unread > 0 ? `<span class="chat-list-unread">${chat.unread}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');
  
  return `<div class="phone-app-page chat-list-page">${items}</div>`;
}

// 获取真实的和用户的聊天记录
function getRealChatWithUser() {
  try {
    const char = characters.find(c => c.id === currentChatCharId);
    const settings = chatSettings[currentChatCharId] || {};
    const userNickname = settings.userNickname || '宝贝';
    
    const history = chatHistories[currentChatCharId];
    if (!history || history.length === 0) return null;
    
    const recentMessages = history.slice(-10);
    
    const messages = recentMessages.map(msg => ({
      from: msg.role === 'user' ? 'ta' : 'me',
      text: truncateText(msg.content, 100),
      time: ''
    }));
    
    const lastMsg = messages.length > 0 ? messages[messages.length - 1].text : '';
    
    return {
      contact: userNickname,
      relation: '❤️',
      avatar: '💕',
      lastMsg: truncateText(lastMsg, 20),
      lastTime: '刚刚',
      unread: 0,
      messages: messages,
      isRealChat: true
    };
  } catch (e) {
    console.error('获取真实聊天记录失败:', e);
    return null;
  }
}

function truncateText(text, maxLen) {
  if (!text) return '';
  text = text.replace(/\n/g, ' ').trim();
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '...';
}

// 打开聊天详情
function openChatDetail(index) {
  const chat = window.phoneChatData?.[index];
  if (!chat) return;
  
  const content = document.getElementById('phoneContent');
  const header = document.getElementById('phoneAppHeader');
  
  if (header) {
    header.querySelector('.phone-app-title').textContent = chat.contact;
    header.querySelector('.phone-app-back').setAttribute('onclick', 'backToChatList()');
  }
  
  const messages = (chat.messages || []).map(msg => `
    <div class="chat-detail-msg ${msg.from === 'me' ? 'sent' : 'received'}">
      <div class="chat-detail-bubble">${escapeHtml(msg.text)}</div>
    </div>
  `).join('');
  
  content.innerHTML = `
    <div class="phone-app-page chat-detail-page">
      <div class="chat-detail-messages">
        ${messages}
      </div>
    </div>
  `;
}

// 返回聊天列表
function backToChatList() {
  const header = document.getElementById('phoneAppHeader');
  if (header) {
    header.querySelector('.phone-app-title').textContent = '聊天记录';
    header.querySelector('.phone-app-back').setAttribute('onclick', 'showPhoneHome()');
  }
  
  const content = document.getElementById('phoneContent');
  if (content && window.phoneChatData) {
    const items = window.phoneChatData.map((chat, index) => `
      <div class="chat-list-item ${chat.isRealChat ? 'user-chat' : ''}" onclick="openChatDetail(${index})">
        <div class="chat-list-avatar">${chat.isRealChat ? PhoneIcons.heart : PhoneIcons.user}</div>
        <div class="chat-list-info">
          <div class="chat-list-top">
            <span class="chat-list-name">${escapeHtml(chat.contact)}</span>
            <span class="chat-list-time">${escapeHtml(chat.lastTime || '')}</span>
          </div>
          <div class="chat-list-bottom">
            <span class="chat-list-msg">${escapeHtml(chat.lastMsg || '')}</span>
            ${chat.unread > 0 ? `<span class="chat-list-unread">${chat.unread}</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');
    
    content.innerHTML = `<div class="phone-app-page chat-list-page">${items}</div>`;
  }
}

// 浏览记录
function renderBrowserApp(data) {
  const items = data.map(item => `
    <div class="browser-item">
      <div class="browser-icon">${item.type === 'search' ? PhoneIcons.search : PhoneIcons.globe}</div>
      <div class="browser-info">
        <div class="browser-query">${escapeHtml(item.query)}</div>
        <div class="browser-time">${escapeHtml(item.time)}</div>
      </div>
    </div>
  `).join('');
  
  return `<div class="phone-app-page browser-page">${items}</div>`;
}

// ==================== 壁纸功能 ====================

function openWallpaperModal() {
  let modal = document.getElementById('phoneWallpaperModal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'phoneWallpaperModal';
    modal.className = 'phone-wallpaper-modal';
    document.body.appendChild(modal);
  }
  
  const currentWallpaper = getCharWallpaper();
  
  const presetsHtml = WallpaperPresets.map(preset => `
    <div class="wallpaper-preset wallpaper-${preset.id} ${preset.css === currentWallpaper ? 'selected' : ''}" 
         onclick="selectPresetWallpaper('${preset.id}')" 
         style="background: ${preset.css}">
    </div>
  `).join('');
  
  modal.innerHTML = `
    <div class="wallpaper-modal-content">
      <div class="wallpaper-modal-header">
        <div class="wallpaper-modal-title">选择壁纸</div>
        <button class="wallpaper-modal-close" onclick="closeWallpaperModal()">×</button>
      </div>
      <div class="wallpaper-modal-body">
        <div class="wallpaper-presets">
          ${presetsHtml}
        </div>
        <div class="wallpaper-custom-section">
          <div class="wallpaper-custom-label">自定义壁纸</div>
          <button class="wallpaper-custom-btn" onclick="uploadCustomWallpaper()">
            ${PhoneIcons.upload}
            <span>上传图片</span>
          </button>
          <input type="file" id="wallpaperFileInput" accept="image/*" style="display:none" onchange="handleWallpaperUpload(event)">
        </div>
      </div>
    </div>
  `;
  
  modal.classList.add('active');
}

function closeWallpaperModal() {
  const modal = document.getElementById('phoneWallpaperModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function selectPresetWallpaper(presetId) {
  const preset = WallpaperPresets.find(p => p.id === presetId);
  if (preset) {
    setCharWallpaper(preset.css);
    
    // 更新选中状态
    document.querySelectorAll('.wallpaper-preset').forEach(el => {
      el.classList.remove('selected');
    });
    document.querySelector(`.wallpaper-${presetId}`)?.classList.add('selected');
    
    showToast('壁纸已更换');
  }
}

function uploadCustomWallpaper() {
  document.getElementById('wallpaperFileInput')?.click();
}

function handleWallpaperUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    setCharWallpaper(`url("${dataUrl}") center/cover no-repeat`);
    closeWallpaperModal();
    showToast('壁纸已更换');
  };
  reader.readAsDataURL(file);
}

// ==================== 工具函数 ====================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 更新状态栏时间
function updatePhoneTime() {
  const timeEl = document.getElementById('phoneTime');
  const widgetEl = document.getElementById('phoneTimeWidget');
  
  const { time } = getTimeAndDate();
  
  if (timeEl) timeEl.textContent = time;
  if (widgetEl) widgetEl.textContent = time;
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initPhonePeek();
  updatePhoneTime();
  setInterval(updatePhoneTime, 60000);
});

// 导出函数
Object.assign(window, {
  openPhonePeek,
  closePhonePeek,
  showPhoneHome,
  openPhoneApp,
  refreshAllPhoneApps,
  openChatDetail,
  backToChatList,
  openWallpaperModal,
  closeWallpaperModal,
  selectPresetWallpaper,
  uploadCustomWallpaper,
  handleWallpaperUpload
});
