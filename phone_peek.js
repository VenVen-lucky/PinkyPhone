// ==================== 查手机功能 ====================

// 缓存数据 - 按角色ID分开存储
// 结构: { [charId]: { memo: { data, lastUpdate }, shopping: {...}, ... } }
window.phoneDataByChar = {};

// 缓存有效期（毫秒）
const PHONE_CACHE_EXPIRY = 2 * 60 * 60 * 1000; // 2小时

// 当前打开的App
window.currentPhoneApp = null;

// 初始化
async function initPhonePeek() {
  try {
    const saved = await localforage.getItem('phoneDataByChar');
    if (saved) {
      window.phoneDataByChar = saved;
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
  
  // 如果该角色还没有数据，初始化一个空结构
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

// 打开查手机页面
function openPhonePeek() {
  if (!currentChatCharId) {
    showToast('请先打开一个对话');
    return;
  }
  
  const page = document.getElementById('phonePeekPage');
  if (page) {
    page.classList.add('active');
    showPhoneHome();
    closeChatPanel();
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

// 显示手机桌面
function showPhoneHome() {
  window.currentPhoneApp = null;
  
  const content = document.getElementById('phoneContent');
  const header = document.getElementById('phoneAppHeader');
  
  if (header) header.style.display = 'none';
  
  if (content) {
    content.innerHTML = `
      <div class="phone-home">
        <div class="phone-app-grid">
          <div class="phone-app-icon" onclick="openPhoneApp('memo')">
            <div class="app-icon-img">📝</div>
            <div class="app-icon-name">备忘录</div>
          </div>
          <div class="phone-app-icon" onclick="openPhoneApp('shopping')">
            <div class="app-icon-img">🛒</div>
            <div class="app-icon-name">购物车</div>
          </div>
          <div class="phone-app-icon" onclick="openPhoneApp('music')">
            <div class="app-icon-img">🎵</div>
            <div class="app-icon-name">音乐</div>
          </div>
          <div class="phone-app-icon" onclick="openPhoneApp('album')">
            <div class="app-icon-img">📷</div>
            <div class="app-icon-name">相册</div>
          </div>
          <div class="phone-app-icon" onclick="openPhoneApp('chat')">
            <div class="app-icon-img">💬</div>
            <div class="app-icon-name">聊天</div>
          </div>
          <div class="phone-app-icon" onclick="openPhoneApp('browser')">
            <div class="app-icon-img">🔍</div>
            <div class="app-icon-name">浏览器</div>
          </div>
        </div>
        <div class="phone-home-actions">
          <button class="phone-refresh-btn" id="phoneRefreshAllBtn" onclick="refreshAllPhoneApps()">
            <span class="refresh-icon">↻</span>
            <span class="refresh-text">刷新全部内容</span>
          </button>
        </div>
      </div>
    `;
  }
}

// 打开App
async function openPhoneApp(appType) {
  window.currentPhoneApp = appType;
  
  const content = document.getElementById('phoneContent');
  const header = document.getElementById('phoneAppHeader');
  
  const appNames = {
    memo: '备忘录',
    shopping: '购物车', 
    music: '最近在听',
    album: '相册',
    chat: '聊天记录',
    browser: '浏览记录'
  };
  
  // 显示App头部
  if (header) {
    header.style.display = 'flex';
    header.querySelector('.phone-app-title').textContent = appNames[appType];
  }
  
  // 显示加载中
  if (content) {
    content.innerHTML = `
      <div class="phone-app-loading">
        <div class="phone-loading-spinner"></div>
        <div class="phone-loading-text">正在加载...</div>
      </div>
    `;
  }
  
  // 获取数据
  try {
    const data = await getPhoneAppData(appType);
    renderPhoneApp(appType, data);
  } catch (e) {
    console.error('加载App失败:', e);
    content.innerHTML = `
      <div class="phone-app-error">
        <div class="error-icon">😵</div>
        <div class="error-text">加载失败</div>
        <button class="error-retry-btn" onclick="openPhoneApp('${appType}')">重试</button>
      </div>
    `;
  }
}

// 获取App数据（带缓存，按角色区分）
async function getPhoneAppData(appType, forceRefresh = false) {
  const charPhoneData = getCharPhoneData();
  if (!charPhoneData) {
    throw new Error('请先打开一个对话');
  }
  
  const cache = charPhoneData[appType];
  const now = Date.now();
  
  // 检查缓存
  if (!forceRefresh && cache.data && cache.lastUpdate && (now - cache.lastUpdate < PHONE_CACHE_EXPIRY)) {
    console.log(`使用缓存: ${appType} (角色ID: ${currentChatCharId})`);
    return cache.data;
  }
  
  // 调用API生成
  console.log(`生成新内容: ${appType} (角色ID: ${currentChatCharId})`);
  const data = await generatePhoneContent(appType);
  
  // 更新缓存
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
    btn.querySelector('.refresh-text').textContent = '正在刷新...';
  }
  
  const appTypes = ['memo', 'shopping', 'music', 'album', 'chat', 'browser'];
  let successCount = 0;
  let failCount = 0;
  
  for (const appType of appTypes) {
    try {
      await getPhoneAppData(appType, true); // 强制刷新
      successCount++;
      if (btn) {
        btn.querySelector('.refresh-text').textContent = `正在刷新... (${successCount}/6)`;
      }
    } catch (e) {
      console.error(`刷新${appType}失败:`, e);
      failCount++;
    }
  }
  
  if (btn) {
    btn.classList.remove('loading');
    btn.querySelector('.refresh-text').textContent = '刷新全部内容';
  }
  
  if (failCount === 0) {
    showToast('全部刷新成功！');
  } else if (successCount > 0) {
    showToast(`刷新完成 (${successCount}成功/${failCount}失败)`);
  } else {
    showToast('刷新失败，请检查网络');
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
    
    // 解析JSON
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

// 获取各App的Prompt
function getPhonePrompts(appType, charName, persona, userNickname) {
  const baseSystem = `你是${charName}。你的人设：${persona}\n\n你现在需要生成你手机里的内容。要求：\n1. 完全符合你的人设和性格\n2. 内容要真实自然，像真人手机里会有的\n3. 可以有1-2条和"${userNickname}"（你的恋人/亲密的人）相关的内容\n4. 只返回JSON数组，不要其他内容\n5. 【重要】不要使用任何"[表情包]"、"[xxx.jpg]"、"[图片]"、"[sticker]"这类虚假描述，只用纯文字`;
  
  const prompts = {
    memo: {
      system: baseSystem,
      user: `生成你的备忘录内容，4-6条，JSON格式：
[
  {"title": "标题", "content": "内容详情", "date": "日期如3月5日", "pinned": true/false是否置顶}
]
包括：日常待办、想做的事、小日记、和${userNickname}相关的记录等`
    },
    
    shopping: {
      system: baseSystem,
      user: `生成你的购物车内容，5-7件商品，JSON格式：
[
  {"name": "商品名", "price": 价格数字, "desc": "简短描述/为什么想买", "added": "加入时间如3天前"}
]
包括：生活用品、兴趣相关、可能想送给${userNickname}的礼物等`
    },
    
    music: {
      system: baseSystem,
      user: `生成你最近在听的音乐，6-8首，JSON格式：
[
  {"name": "歌名", "artist": "歌手", "reason": "为什么听/什么心情", "recent": true/false是否最近常听}
]
要符合你的性格和品味，可以有一首是想和${userNickname}一起听的`
    },
    
    album: {
      system: baseSystem,
      user: `生成你相册里的照片描述，5-7张，JSON格式：
[
  {"desc": "照片内容描述", "date": "拍摄日期", "location": "地点", "caption": "你给照片的配文/心情"}
]
包括：自拍、风景、美食、日常、和${userNickname}相关的回忆等`
    },
    
    chat: {
      system: baseSystem,
      user: `生成你和朋友/家人的聊天记录，2-3个对话，JSON格式：
[
  {
    "contact": "联系人备注名",
    "relation": "关系如闺蜜/好友/同事/妈妈",
    "avatar": "头像emoji",
    "lastMsg": "最后一条消息预览",
    "lastTime": "时间如10:30/昨天",
    "unread": 未读数量0-2,
    "messages": [
      {"from": "ta/me", "text": "消息内容", "time": "时间如10:30"}
    ]
  }
]
要求：
1. 聊天内容自然真实，可以提到${userNickname}（你的恋人）
2. 比如和闺蜜分享恋爱日常、和妈妈聊天提到对象等
3. 每个对话5-7条消息
4. 【重要】不要使用任何"[表情包]"、"[xxx.jpg]"、"[图片]"这类描述，只用纯文字聊天`
    },
    
    browser: {
      system: baseSystem,
      user: `生成你的浏览器搜索/浏览记录，8-10条，JSON格式：
[
  {"query": "搜索内容或网页标题", "time": "时间如今天10:30/昨天", "type": "search搜索/visit访问"}
]
包括：兴趣相关、日常问题、偷偷搜${userNickname}喜欢的东西等`
    }
  };
  
  return prompts[appType];
}

// ==================== 渲染各App内容 ====================

function renderPhoneApp(appType, data) {
  const content = document.getElementById('phoneContent');
  if (!content || !data) return;
  
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
      ${item.pinned ? '<div class="memo-pin">📌</div>' : ''}
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
      <div class="shopping-icon">🛍️</div>
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
      <div class="music-icon">${item.recent ? '🎵' : '🎶'}</div>
      <div class="music-info">
        <div class="music-name">${escapeHtml(item.name)}</div>
        <div class="music-artist">${escapeHtml(item.artist)}</div>
        ${item.reason ? `<div class="music-reason">${escapeHtml(item.reason)}</div>` : ''}
      </div>
      ${item.recent ? '<div class="music-playing">♪</div>' : ''}
    </div>
  `).join('');
  
  return `<div class="phone-app-page music-page">${items}</div>`;
}

// 相册
function renderAlbumApp(data) {
  const items = data.map(item => `
    <div class="album-item">
      <div class="album-placeholder">
        <span>📷</span>
      </div>
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

// 聊天记录 - 显示聊天列表
function renderChatApp(data, skipRealChat = false) {
  let allChats = data;
  
  // 只有第一次渲染时才添加真实聊天记录
  if (!skipRealChat) {
    const realChatWithUser = getRealChatWithUser();
    allChats = realChatWithUser ? [realChatWithUser, ...data] : data;
  }
  
  // 保存聊天数据供详情页使用
  window.phoneChatData = allChats;
  
  const items = allChats.map((chat, index) => `
    <div class="chat-list-item ${chat.isRealChat ? 'user-chat' : ''}" onclick="openChatDetail(${index})">
      <div class="chat-list-avatar">${chat.avatar || '👤'}</div>
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
    // 获取当前角色信息
    const char = characters.find(c => c.id === currentChatCharId);
    const settings = chatSettings[currentChatCharId] || {};
    const userNickname = settings.userNickname || '宝贝';
    
    // 获取聊天历史
    const history = chatHistories[currentChatCharId];
    if (!history || history.length === 0) return null;
    
    // 取最后10条消息（最多）
    const recentMessages = history.slice(-10);
    
    // 转换格式
    const messages = recentMessages.map(msg => ({
      from: msg.role === 'user' ? 'ta' : 'me',  // 用户发的是"ta"，AI回复是"me"
      text: truncateText(msg.content, 100),  // 截断过长的消息
      time: ''
    }));
    
    // 获取最后一条消息作为预览
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

// 截断文本
function truncateText(text, maxLen) {
  if (!text) return '';
  // 移除换行符
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
  
  // 更新头部
  if (header) {
    header.querySelector('.phone-app-title').textContent = chat.contact;
    header.querySelector('.phone-app-back').setAttribute('onclick', 'backToChatList()');
  }
  
  // 渲染聊天详情 - 直接显示消息，不要大头像区域
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
    // 直接用已保存的数据渲染，不再添加真实聊天
    const items = window.phoneChatData.map((chat, index) => `
      <div class="chat-list-item ${chat.isRealChat ? 'user-chat' : ''}" onclick="openChatDetail(${index})">
        <div class="chat-list-avatar">${chat.avatar || '👤'}</div>
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
      <div class="browser-icon">${item.type === 'search' ? '🔍' : '🌐'}</div>
      <div class="browser-info">
        <div class="browser-query">${escapeHtml(item.query)}</div>
        <div class="browser-time">${escapeHtml(item.time)}</div>
      </div>
    </div>
  `).join('');
  
  return `<div class="phone-app-page browser-page">${items}</div>`;
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
  if (timeEl) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    timeEl.textContent = `${hours}:${minutes}`;
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initPhonePeek();
  updatePhoneTime();
  setInterval(updatePhoneTime, 60000); // 每分钟更新
});

// 导出函数
Object.assign(window, {
  openPhonePeek,
  closePhonePeek,
  showPhoneHome,
  openPhoneApp,
  refreshAllPhoneApps,
  openChatDetail,
  backToChatList
});
