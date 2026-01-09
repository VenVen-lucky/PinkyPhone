// ==================== 论坛App ====================

// 论坛数据
let forumSettings = {
  worldview: '',           // 世界观设定
  forumName: '广场',       // 论坛名称
  userIdentity: '',        // 用户在论坛的身份
  userNickname: '',        // 用户在论坛的昵称
  aiParticipants: []       // AI参与者列表 [{ charId, identity, nickname }]
};

let forumPosts = [];       // 帖子列表
let currentForumPostId = null;  // 当前查看的帖子ID
let forumComposeAuthor = null;  // 发帖时选择的作者
let forumReplyTarget = null;    // 回复目标 { commentId, authorName }

// ==================== 初始化 ====================

async function initForumApp() {
  // 加载保存的数据
  const savedSettings = await localforage.getItem('forumSettings');
  if (savedSettings) {
    forumSettings = { ...forumSettings, ...savedSettings };
  }
  
  const savedPosts = await localforage.getItem('forumPosts');
  if (savedPosts) {
    forumPosts = savedPosts;
  }
  
  // 渲染论坛主页
  renderForumPage();
  
  console.log('[论坛] 初始化完成');
}

// ==================== 渲染主页 ====================

function renderForumPage() {
  const container = document.getElementById('forumPageContent');
  if (!container) return;
  
  // 渲染页面头部和内容
  container.innerHTML = `
    <div class="forum-container">
      <div class="forum-tabs">
        <div class="forum-tab active" onclick="switchForumTab('recommend')">推荐</div>
        <div class="forum-tab" onclick="switchForumTab('latest')">最新</div>
        <div class="forum-tab" onclick="switchForumTab('hot')">热门</div>
      </div>
      <div class="forum-feed" id="forumFeed">
        <!-- 动态渲染 -->
      </div>
      <button class="forum-fab" onclick="openForumCompose()">✏️</button>
    </div>
  `;
  
  renderForumFeed();
}

// 渲染信息流
function renderForumFeed() {
  const container = document.getElementById('forumFeed');
  if (!container) return;
  
  // 检查是否已设置世界观
  if (!forumSettings.worldview) {
    container.innerHTML = `
      <div class="forum-empty">
        <div class="forum-empty-icon">🌍</div>
        <div class="forum-empty-text">还没有设置世界观<br>先设置论坛的世界观和你的身份吧</div>
        <button class="forum-empty-btn" onclick="openForumSettings()">去设置</button>
      </div>
    `;
    return;
  }
  
  // 没有帖子时显示生成按钮
  if (forumPosts.length === 0) {
    container.innerHTML = `
      <div class="forum-empty">
        <div class="forum-empty-icon">📝</div>
        <div class="forum-empty-text">论坛里还没有帖子<br>点击下方按钮生成一些内容吧</div>
        <button class="forum-empty-btn" onclick="generateForumPosts()">✨ 生成帖子</button>
      </div>
    `;
    return;
  }
  
  // 渲染帖子列表
  let html = `<button class="forum-generate-btn" onclick="generateForumPosts()">✨ 刷新内容</button>`;
  html += forumPosts.map(post => renderForumPostItem(post)).join('');
  container.innerHTML = html;
}

// 渲染单个帖子
function renderForumPostItem(post) {
  const tagHtml = post.authorType === 'user' ? '<span class="forum-author-tag user">我</span>' :
                  post.authorType === 'ai' ? '<span class="forum-author-tag ai">AI</span>' :
                  '<span class="forum-author-tag npc">网友</span>';
  
  const avatarContent = post.authorAvatar ? 
    `<img src="${post.authorAvatar}" alt="">` : 
    getAvatarEmoji(post.authorName);
  
  const timeStr = formatForumTime(post.timestamp);
  const commentCount = post.comments?.length || 0;
  
  return `
    <div class="forum-post" onclick="openForumPostDetail(${post.id})">
      <div class="forum-post-header">
        <div class="forum-post-avatar">${avatarContent}</div>
        <div class="forum-post-author">
          <div class="forum-post-name">${escapeForumHtml(post.authorName)} ${tagHtml}</div>
          ${post.authorIdentity ? `<div class="forum-post-identity">${escapeForumHtml(post.authorIdentity)}</div>` : ''}
        </div>
        <div class="forum-post-time">${timeStr}</div>
      </div>
      <div class="forum-post-content">${escapeForumHtml(post.content)}</div>
      <div class="forum-post-actions">
        <div class="forum-action ${post.liked ? 'liked' : ''}" onclick="event.stopPropagation(); toggleForumPostLike(${post.id})">
          <svg viewBox="0 0 24 24" fill="${post.liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span>${post.likes || 0}</span>
        </div>
        <div class="forum-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>${commentCount}</span>
        </div>
      </div>
    </div>
  `;
}

// ==================== 帖子详情 ====================

function openForumPostDetail(postId) {
  currentForumPostId = postId;
  const overlay = document.getElementById('forumDetailOverlay');
  if (overlay) {
    overlay.classList.add('active');
    renderForumPostDetail();
  }
}

function closeForumPostDetail() {
  currentForumPostId = null;
  forumReplyTarget = null; // 重置回复状态
  const overlay = document.getElementById('forumDetailOverlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
}

function renderForumPostDetail() {
  const post = forumPosts.find(p => p.id === currentForumPostId);
  if (!post) return;
  
  const container = document.getElementById('forumDetailContent');
  if (!container) return;
  
  const tagHtml = post.authorType === 'user' ? '<span class="forum-author-tag user">我</span>' :
                  post.authorType === 'ai' ? '<span class="forum-author-tag ai">AI</span>' :
                  '<span class="forum-author-tag npc">网友</span>';
  
  const avatarContent = post.authorAvatar ? 
    `<img src="${post.authorAvatar}" alt="">` : 
    getAvatarEmoji(post.authorName);
  
  // 渲染评论
  const commentsHtml = (post.comments || []).map(comment => {
    const commentTag = comment.authorType === 'user' ? '<span class="forum-author-tag user">我</span>' :
                       comment.authorType === 'ai' ? '<span class="forum-author-tag ai">AI</span>' : '';
    const commentAvatar = comment.authorAvatar ? 
      `<img src="${comment.authorAvatar}" alt="">` : 
      getAvatarEmoji(comment.authorName);
    
    // 楼中楼：显示回复谁
    const replyHtml = comment.replyToName ? 
      `<span style="color:#007aff;">回复 @${escapeForumHtml(comment.replyToName)}：</span>` : '';
    
    return `
      <div class="forum-comment" data-comment-id="${comment.id}">
        <div class="forum-comment-avatar">${commentAvatar}</div>
        <div class="forum-comment-body">
          <div class="forum-comment-author">${escapeForumHtml(comment.authorName)} ${commentTag}</div>
          <div class="forum-comment-text">${replyHtml}${escapeForumHtml(comment.content)}</div>
          <div class="forum-comment-meta">
            <span>${formatForumTime(comment.timestamp)}</span>
            <span style="cursor:pointer" onclick="replyToForumComment(${post.id}, ${comment.id}, '${escapeForumHtml(comment.authorName)}')">回复</span>
            <span style="cursor:pointer" onclick="toggleForumCommentLike(${post.id}, ${comment.id})">
              ${comment.liked ? '❤️' : '🤍'} ${comment.likes || 0}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = `
    <div class="forum-detail-post">
      <div class="forum-post-header">
        <div class="forum-post-avatar">${avatarContent}</div>
        <div class="forum-post-author">
          <div class="forum-post-name">${escapeForumHtml(post.authorName)} ${tagHtml}</div>
          ${post.authorIdentity ? `<div class="forum-post-identity">${escapeForumHtml(post.authorIdentity)}</div>` : ''}
        </div>
      </div>
      <div class="forum-post-content">${escapeForumHtml(post.content)}</div>
      <div class="forum-post-time" style="margin-top:12px;font-size:13px;color:rgba(255,255,255,0.4);">
        ${formatForumTime(post.timestamp)}
      </div>
      <div class="forum-post-actions" style="margin-top:12px;">
        <div class="forum-action ${post.liked ? 'liked' : ''}" onclick="toggleForumPostLike(${post.id}); renderForumPostDetail();">
          <svg viewBox="0 0 24 24" fill="${post.liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span>${post.likes || 0}</span>
        </div>
        <div class="forum-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>${post.comments?.length || 0}</span>
        </div>
      </div>
    </div>
    <div class="forum-comments">
      <div class="forum-comments-header">评论 ${post.comments?.length || 0}</div>
      ${commentsHtml || '<div style="color:rgba(255,255,255,0.4);text-align:center;padding:20px;">暂无评论，来说点什么吧</div>'}
    </div>
  `;
  
  // 更新输入框状态
  updateForumCommentInput();
}

// 更新评论输入框状态
function updateForumCommentInput() {
  const input = document.getElementById('forumCommentInput');
  const replyIndicator = document.getElementById('forumReplyIndicator');
  
  if (forumReplyTarget) {
    if (input) input.placeholder = `回复 @${forumReplyTarget.authorName}...`;
    if (replyIndicator) {
      replyIndicator.style.display = 'flex';
      replyIndicator.innerHTML = `
        <span>回复 @${escapeForumHtml(forumReplyTarget.authorName)}</span>
        <span style="cursor:pointer;margin-left:8px;" onclick="cancelForumReply();updateForumCommentInput();">✕</span>
      `;
    }
  } else {
    if (input) input.placeholder = '写评论...';
    if (replyIndicator) replyIndicator.style.display = 'none';
  }
}

// ==================== 设置页面 ====================

function openForumSettings() {
  const overlay = document.getElementById('forumSettingsOverlay');
  if (overlay) {
    overlay.classList.add('active');
    renderForumSettings();
  }
}

function closeForumSettings() {
  const overlay = document.getElementById('forumSettingsOverlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
  // 刷新主页
  renderForumFeed();
}

function renderForumSettings() {
  const container = document.getElementById('forumSettingsContent');
  if (!container) return;
  
  // AI参与者列表
  const participantsHtml = forumSettings.aiParticipants.map((p, index) => {
    const char = characters.find(c => c.id === p.charId);
    const avatarContent = char?.avatar ? `<img src="${char.avatar}" alt="">` : '🤖';
    const name = p.nickname || char?.name || '未知角色';
    
    return `
      <div class="forum-participant">
        <div class="forum-participant-avatar">${avatarContent}</div>
        <div class="forum-participant-info">
          <div class="forum-participant-name">${escapeForumHtml(name)}</div>
          <div class="forum-participant-identity">${escapeForumHtml(p.identity || '未设置身份')}</div>
        </div>
        <button class="forum-participant-remove" onclick="removeForumParticipant(${index})">×</button>
      </div>
    `;
  }).join('');
  
  container.innerHTML = `
    <div class="forum-section">
      <div class="forum-section-title">世界观设定</div>
      <div class="forum-card">
        <div class="forum-item">
          <div class="forum-label">论坛名称</div>
          <input type="text" class="forum-input" id="forumNameInput" 
            value="${escapeForumHtml(forumSettings.forumName)}" 
            placeholder="如：豆瓣小组、微博超话、贴吧..."
            onchange="saveForumSetting('forumName', this.value)">
        </div>
        <div class="forum-item">
          <div class="forum-label">世界观</div>
          <textarea class="forum-input" id="forumWorldviewInput" rows="4" 
            placeholder="描述这个论坛的世界观背景&#10;如：这是一个修仙世界的论坛，大家都是修仙者..."
            onchange="saveForumSetting('worldview', this.value)">${escapeForumHtml(forumSettings.worldview)}</textarea>
        </div>
      </div>
    </div>
    
    <div class="forum-section">
      <div class="forum-section-title">我的身份</div>
      <div class="forum-card">
        <div class="forum-item">
          <div class="forum-label">我的昵称</div>
          <input type="text" class="forum-input" 
            value="${escapeForumHtml(forumSettings.userNickname)}" 
            placeholder="你在论坛的昵称"
            onchange="saveForumSetting('userNickname', this.value)">
        </div>
        <div class="forum-item">
          <div class="forum-label">我的身份</div>
          <textarea class="forum-input" rows="2" 
            placeholder="你在这个世界观里的身份&#10;如：筑基期修士、某门派弟子..."
            onchange="saveForumSetting('userIdentity', this.value)">${escapeForumHtml(forumSettings.userIdentity)}</textarea>
        </div>
      </div>
    </div>
    
    <div class="forum-section">
      <div class="forum-section-title">AI参与者</div>
      ${participantsHtml}
      <button class="forum-add-btn" onclick="openAddForumParticipant()">
        + 添加AI角色
      </button>
    </div>
  `;
}

async function saveForumSetting(key, value) {
  forumSettings[key] = value;
  await localforage.setItem('forumSettings', forumSettings);
  console.log('[论坛] 设置已保存:', key);
}

// ==================== AI参与者管理 ====================

function openAddForumParticipant() {
  const availableChars = characters.filter(c => 
    !forumSettings.aiParticipants.find(p => p.charId === c.id)
  );
  
  if (availableChars.length === 0) {
    showToast('没有可添加的角色');
    return;
  }
  
  const html = availableChars.map(c => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid rgba(255,255,255,0.1);cursor:pointer;" 
         onclick="selectForumParticipant(${c.id})">
      <div style="width:40px;height:40px;border-radius:50%;background:#333;display:flex;align-items:center;justify-content:center;overflow:hidden;">
        ${c.avatar ? `<img src="${c.avatar}" style="width:100%;height:100%;object-fit:cover;">` : '🤖'}
      </div>
      <div style="flex:1;color:white;">${escapeForumHtml(c.name)}</div>
    </div>
  `).join('');
  
  const modal = document.createElement('div');
  modal.id = 'forumAddParticipantModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#1a1a1f;border-radius:16px;width:90%;max-width:360px;max-height:70vh;overflow:hidden;">
      <div style="padding:16px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center;">
        <span style="color:white;font-size:17px;font-weight:600;">选择角色</span>
        <span style="color:rgba(255,255,255,0.5);cursor:pointer;font-size:20px;" onclick="closeForumParticipantModal()">✕</span>
      </div>
      <div style="max-height:50vh;overflow-y:auto;">
        ${html}
      </div>
    </div>
  `;
  modal.onclick = (e) => { if (e.target === modal) closeForumParticipantModal(); };
  document.body.appendChild(modal);
}

function closeForumParticipantModal() {
  const modal = document.getElementById('forumAddParticipantModal');
  if (modal) modal.remove();
}

async function selectForumParticipant(charId) {
  closeForumParticipantModal();
  
  const char = characters.find(c => c.id === charId);
  const identity = prompt(`请输入 ${char?.name || '该角色'} 在论坛的身份设定：`);
  const nickname = prompt(`请输入 ${char?.name || '该角色'} 在论坛的昵称（留空使用原名）：`);
  
  forumSettings.aiParticipants.push({
    charId,
    identity: identity || '',
    nickname: nickname || ''
  });
  
  await localforage.setItem('forumSettings', forumSettings);
  renderForumSettings();
}

async function removeForumParticipant(index) {
  forumSettings.aiParticipants.splice(index, 1);
  await localforage.setItem('forumSettings', forumSettings);
  renderForumSettings();
}

// ==================== 发帖 ====================

function openForumCompose() {
  forumComposeAuthor = { type: 'user' };
  const overlay = document.getElementById('forumComposeOverlay');
  if (overlay) {
    overlay.classList.add('active');
    renderForumComposeAuthor();
    document.getElementById('forumComposeTextarea').value = '';
    document.getElementById('forumComposeTextarea').focus();
  }
}

function closeForumCompose() {
  const overlay = document.getElementById('forumComposeOverlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
}

function renderForumComposeAuthor() {
  const container = document.getElementById('forumComposeAuthor');
  if (!container) return;
  
  let avatarHtml, nameHtml;
  
  if (forumComposeAuthor.type === 'user') {
    const globalAvatar = localStorage.getItem('avatarImg');
    avatarHtml = globalAvatar ? `<img src="${globalAvatar}" alt="">` : '👤';
    nameHtml = forumSettings.userNickname || '我';
  } else {
    const char = characters.find(c => c.id === forumComposeAuthor.charId);
    const participant = forumSettings.aiParticipants.find(p => p.charId === forumComposeAuthor.charId);
    avatarHtml = char?.avatar ? `<img src="${char.avatar}" alt="">` : '🤖';
    nameHtml = participant?.nickname || char?.name || '角色';
  }
  
  container.innerHTML = `
    <div class="forum-compose-avatar">${avatarHtml}</div>
    <div class="forum-compose-name">${nameHtml}</div>
    <span style="color:rgba(255,255,255,0.4);">▼</span>
  `;
}

function showForumAuthorPicker() {
  const options = [
    { type: 'user', name: forumSettings.userNickname || '我' }
  ];
  
  forumSettings.aiParticipants.forEach(p => {
    const char = characters.find(c => c.id === p.charId);
    options.push({
      type: 'ai',
      charId: p.charId,
      name: p.nickname || char?.name || '角色'
    });
  });
  
  const html = options.map((opt, i) => `
    <div style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.1);cursor:pointer;color:white;"
         onclick="selectForumComposeAuthor(${i})">
      ${opt.name}
    </div>
  `).join('');
  
  const modal = document.createElement('div');
  modal.id = 'forumAuthorPickerModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#1a1a1f;border-radius:16px 16px 0 0;width:100%;max-width:500px;max-height:50vh;overflow:hidden;">
      <div style="padding:16px;border-bottom:1px solid rgba(255,255,255,0.1);text-align:center;">
        <span style="color:white;font-size:17px;font-weight:600;">选择发帖身份</span>
      </div>
      <div style="max-height:40vh;overflow-y:auto;">
        ${html}
      </div>
      <div style="padding:16px;">
        <button style="width:100%;padding:14px;background:rgba(255,255,255,0.1);border:none;border-radius:10px;color:white;font-size:16px;cursor:pointer;" onclick="closeForumAuthorPicker()">取消</button>
      </div>
    </div>
  `;
  modal.onclick = (e) => { if (e.target === modal) closeForumAuthorPicker(); };
  document.body.appendChild(modal);
  
  window.forumAuthorOptions = options;
}

function closeForumAuthorPicker() {
  const modal = document.getElementById('forumAuthorPickerModal');
  if (modal) modal.remove();
}

function selectForumComposeAuthor(index) {
  const opt = window.forumAuthorOptions[index];
  forumComposeAuthor = opt;
  closeForumAuthorPicker();
  renderForumComposeAuthor();
}

async function submitForumPost() {
  const textarea = document.getElementById('forumComposeTextarea');
  const content = textarea?.value?.trim();
  
  if (!content) {
    showToast('请输入内容');
    return;
  }
  
  let authorName, authorAvatar, authorIdentity, authorType, authorId;
  
  if (forumComposeAuthor.type === 'user') {
    authorType = 'user';
    authorName = forumSettings.userNickname || '我';
    authorAvatar = localStorage.getItem('avatarImg') || '';
    authorIdentity = forumSettings.userIdentity || '';
    authorId = null;
  } else {
    const char = characters.find(c => c.id === forumComposeAuthor.charId);
    const participant = forumSettings.aiParticipants.find(p => p.charId === forumComposeAuthor.charId);
    authorType = 'ai';
    authorName = participant?.nickname || char?.name || '角色';
    authorAvatar = char?.avatar || '';
    authorIdentity = participant?.identity || '';
    authorId = forumComposeAuthor.charId;
  }
  
  const newPost = {
    id: Date.now(),
    authorType,
    authorId,
    authorName,
    authorAvatar,
    authorIdentity,
    content,
    timestamp: Date.now(),
    likes: 0,
    liked: false,
    comments: []
  };
  
  forumPosts.unshift(newPost);
  await localforage.setItem('forumPosts', forumPosts);
  
  closeForumCompose();
  renderForumFeed();
  showToast('发布成功');
}

// ==================== 评论 ====================

// 设置回复目标
function replyToForumComment(postId, commentId, authorName) {
  forumReplyTarget = { commentId, authorName };
  const input = document.getElementById('forumCommentInput');
  if (input) {
    input.placeholder = `回复 @${authorName}...`;
    input.focus();
  }
}

// 取消回复
function cancelForumReply() {
  forumReplyTarget = null;
  const input = document.getElementById('forumCommentInput');
  if (input) {
    input.placeholder = '写评论...';
  }
}

async function submitForumComment() {
  if (!currentForumPostId) return;
  
  const input = document.getElementById('forumCommentInput');
  const content = input?.value?.trim();
  
  if (!content) return;
  
  const post = forumPosts.find(p => p.id === currentForumPostId);
  if (!post) return;
  
  if (!post.comments) post.comments = [];
  
  // 生成新的评论ID
  const maxId = post.comments.reduce((max, c) => Math.max(max, c.id || 0), 0);
  
  const newComment = {
    id: maxId + 1,
    authorType: 'user',
    authorName: forumSettings.userNickname || '我',
    authorAvatar: localStorage.getItem('avatarImg') || '',
    content,
    replyTo: forumReplyTarget?.commentId || null,
    replyToName: forumReplyTarget?.authorName || null,
    timestamp: Date.now(),
    likes: 0,
    liked: false
  };
  
  post.comments.push(newComment);
  await localforage.setItem('forumPosts', forumPosts);
  
  input.value = '';
  cancelForumReply(); // 重置回复状态
  renderForumPostDetail();
  
  // 触发AI回复
  generateForumCommentReply(currentForumPostId, newComment);
}

// ==================== 点赞 ====================

async function toggleForumPostLike(postId) {
  const post = forumPosts.find(p => p.id === postId);
  if (!post) return;
  
  post.liked = !post.liked;
  post.likes = (post.likes || 0) + (post.liked ? 1 : -1);
  
  await localforage.setItem('forumPosts', forumPosts);
  renderForumFeed();
}

async function toggleForumCommentLike(postId, commentId) {
  const post = forumPosts.find(p => p.id === postId);
  if (!post) return;
  
  const comment = post.comments?.find(c => c.id === commentId);
  if (!comment) return;
  
  comment.liked = !comment.liked;
  comment.likes = (comment.likes || 0) + (comment.liked ? 1 : -1);
  
  await localforage.setItem('forumPosts', forumPosts);
  renderForumPostDetail();
}

// ==================== AI生成 ====================

async function generateForumPosts() {
  if (!forumSettings.worldview) {
    showToast('请先设置世界观');
    openForumSettings();
    return;
  }
  
  const apiConfig = getActiveApiConfig();
  if (!apiConfig || !apiConfig.url || !apiConfig.key) {
    showToast('请先配置API');
    return;
  }
  
  const container = document.getElementById('forumFeed');
  container.innerHTML = `
    <div class="forum-loading">
      <div class="forum-loading-spinner"></div>
      <div style="color:rgba(255,255,255,0.5);">正在生成内容...</div>
    </div>
  `;
  
  try {
    // 构建参与者信息
    const participants = forumSettings.aiParticipants.map(p => {
      const char = characters.find(c => c.id === p.charId);
      const settings = chatSettings[p.charId] || {};
      return {
        name: p.nickname || settings.charName || char?.name || '角色',
        identity: p.identity || '',
        persona: settings.persona || char?.persona || ''
      };
    });
    
    const systemPrompt = `你是一个论坛内容生成器。请根据以下设定生成论坛帖子。

【世界观】
${forumSettings.worldview}

【论坛名称】
${forumSettings.forumName}

【用户信息（仅供参考，不要生成用户的帖子或评论）】
- 昵称：${forumSettings.userNickname || '用户'}
- 身份：${forumSettings.userIdentity || '普通成员'}

【AI参与者】
${participants.map((p, i) => `${i + 1}. ${p.name}：${p.identity}${p.persona ? '，性格：' + p.persona.substring(0, 100) : ''}`).join('\n') || '无'}

【要求】
1. 生成5-8条论坛帖子
2. 帖子作者只能是AI参与者或随机网友(NPC)，绝对不要生成用户的帖子
3. NPC网友要有符合世界观的随机昵称和身份
4. 内容要符合世界观设定，有趣且有互动感
5. 每条帖子可以有0-3条评论，评论者也只能是AI或NPC，不能是用户
6. 评论之间可以互相回复，形成楼中楼（用replyTo字段指定回复哪条评论）
7. 返回JSON数组格式`;

    const userPrompt = `请生成论坛帖子，返回纯JSON数组（不要markdown代码块）：
[
  {
    "authorType": "ai或npc",
    "authorName": "昵称",
    "authorIdentity": "身份",
    "content": "帖子内容",
    "likes": 点赞数,
    "comments": [
      {"id":1,"authorType":"npc","authorName":"昵称","content":"评论","likes":0},
      {"id":2,"authorType":"ai","authorName":"昵称","content":"回复评论","likes":0,"replyTo":1,"replyToName":"被回复者昵称"}
    ]
  }
]
注意：
1. authorType只能是"ai"或"npc"，不要生成"user"
2. 评论的id从1开始递增
3. 如果是回复某条评论，用replyTo指定被回复评论的id，replyToName是被回复者的昵称`;

    const response = await fetch(`${apiConfig.url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.key}`
      },
      body: JSON.stringify({
        model: apiConfig.model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.9
      })
    });
    
    if (!response.ok) throw new Error('API请求失败');
    
    const data = await response.json();
    let content = data.choices[0]?.message?.content || '';
    
    // 解析JSON
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const posts = JSON.parse(jsonMatch[0]);
      const newPosts = posts.map(p => ({
        id: Date.now() + Math.random() * 10000,
        authorType: p.authorType === 'user' ? 'npc' : (p.authorType || 'npc'), // 强制不允许user
        authorId: null,
        authorName: p.authorName || '匿名',
        authorAvatar: '',
        authorIdentity: p.authorIdentity || '',
        content: p.content || '',
        timestamp: Date.now() - Math.random() * 7200000,
        likes: p.likes || Math.floor(Math.random() * 50),
        liked: false,
        comments: (p.comments || []).map((c, idx) => ({
          id: c.id || (idx + 1),
          authorType: c.authorType === 'user' ? 'npc' : (c.authorType || 'npc'), // 强制不允许user
          authorName: c.authorName || '网友',
          authorAvatar: '',
          content: c.content || '',
          replyTo: c.replyTo || null,
          replyToName: c.replyToName || null,
          timestamp: Date.now() - Math.random() * 3600000,
          likes: c.likes || Math.floor(Math.random() * 10),
          liked: false
        }))
      }));
      
      forumPosts = [...newPosts, ...forumPosts];
      await localforage.setItem('forumPosts', forumPosts);
      showToast(`生成了 ${newPosts.length} 条帖子`);
    }
    
    renderForumFeed();
    
  } catch (e) {
    console.error('[论坛] 生成失败:', e);
    showToast('生成失败: ' + e.message);
    renderForumFeed();
  }
}

// 生成评论回复
async function generateForumCommentReply(postId, userComment) {
  if (Math.random() > 0.6) return; // 40%概率有人回复
  
  const post = forumPosts.find(p => p.id === postId);
  if (!post) return;
  
  const apiConfig = getActiveApiConfig();
  if (!apiConfig) return;
  
  // 收集已有评论作为上下文
  const commentsContext = (post.comments || []).slice(-5).map(c => 
    `${c.authorName}${c.replyToName ? ' 回复 @' + c.replyToName : ''}：${c.content}`
  ).join('\n');
  
  try {
    const prompt = `世界观：${forumSettings.worldview}
帖子：${post.content}
已有评论：
${commentsContext}

用户 "${userComment.authorName}" 刚发了评论：${userComment.content}

请你扮演一个网友回复这条评论。要求：
1. 符合世界观设定
2. 一句简短的话
3. 只输出回复内容，不要其他`;

    const response = await fetch(`${apiConfig.url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.key}`
      },
      body: JSON.stringify({
        model: apiConfig.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 100
      })
    });
    
    if (!response.ok) return;
    
    const data = await response.json();
    const reply = data.choices[0]?.message?.content?.trim();
    
    if (reply) {
      const npcNames = ['路人甲', '吃瓜群众', '热心网友', '神秘人', '潜水党', '围观群众'];
      const maxId = post.comments.reduce((max, c) => Math.max(max, c.id || 0), 0);
      
      post.comments.push({
        id: maxId + 1,
        authorType: 'npc',
        authorName: npcNames[Math.floor(Math.random() * npcNames.length)],
        authorAvatar: '',
        content: reply,
        replyTo: userComment.id,  // 回复用户的评论
        replyToName: userComment.authorName,
        timestamp: Date.now(),
        likes: 0,
        liked: false
      });
      
      await localforage.setItem('forumPosts', forumPosts);
      
      if (currentForumPostId === postId) {
        renderForumPostDetail();
      }
    }
  } catch (e) {
    console.error('[论坛] 生成回复失败:', e);
  }
}

// 生成更多互动评论
async function generateMoreComments() {
  if (!currentForumPostId) return;
  
  const post = forumPosts.find(p => p.id === currentForumPostId);
  if (!post) return;
  
  const apiConfig = getActiveApiConfig();
  if (!apiConfig || !apiConfig.url || !apiConfig.key) {
    showToast('请先配置API');
    return;
  }
  
  // 按钮loading状态
  const btn = document.querySelector('.forum-comment-refresh');
  if (btn) btn.classList.add('loading');
  
  // 收集已有评论
  const existingComments = (post.comments || []).map(c => ({
    id: c.id,
    author: c.authorName,
    authorType: c.authorType,
    content: c.content,
    replyTo: c.replyTo,
    replyToName: c.replyToName
  }));
  
  // 找出用户的评论，AI可能会回复这些
  const userComments = existingComments.filter(c => c.authorType === 'user');
  
  // 收集AI参与者
  const participants = forumSettings.aiParticipants.map(p => {
    const char = characters.find(c => c.id === p.charId);
    return p.nickname || char?.name || '角色';
  });
  
  try {
    const prompt = `你是一个论坛评论生成器。

【世界观】${forumSettings.worldview}

【帖子内容】${post.content}

【已有评论】
${existingComments.map(c => `[ID:${c.id}] ${c.author}${c.replyToName ? ' 回复@'+c.replyToName : ''}：${c.content}`).join('\n') || '暂无评论'}

【用户信息】昵称：${forumSettings.userNickname || '用户'}

【AI参与者】${participants.join('、') || '无'}

请生成2-4条新评论，要求：
1. 只生成NPC或AI参与者的评论，绝对不要生成用户的评论
2. 可以回复用户的评论（楼中楼互动）
3. 可以回复其他NPC的评论
4. 也可以是对帖子的新评论
5. NPC要有符合世界观的随机昵称
6. 返回纯JSON数组格式

JSON格式：
[
  {"authorType":"npc","authorName":"昵称","content":"评论内容","replyTo":被回复评论的ID或null,"replyToName":"被回复者昵称或null"}
]

只返回JSON，不要其他内容。`;

    const response = await fetch(`${apiConfig.url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.key}`
      },
      body: JSON.stringify({
        model: apiConfig.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9
      })
    });
    
    if (!response.ok) throw new Error('API请求失败');
    
    const data = await response.json();
    let content = data.choices[0]?.message?.content || '';
    
    // 解析JSON
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const newComments = JSON.parse(jsonMatch[0]);
      const maxId = post.comments.reduce((max, c) => Math.max(max, c.id || 0), 0);
      
      let addedCount = 0;
      newComments.forEach((c, idx) => {
        // 强制不允许用户类型
        if (c.authorType === 'user') return;
        
        post.comments.push({
          id: maxId + idx + 1,
          authorType: c.authorType || 'npc',
          authorName: c.authorName || '网友',
          authorAvatar: '',
          content: c.content || '',
          replyTo: c.replyTo || null,
          replyToName: c.replyToName || null,
          timestamp: Date.now() + idx * 1000, // 稍微错开时间
          likes: Math.floor(Math.random() * 5),
          liked: false
        });
        addedCount++;
      });
      
      await localforage.setItem('forumPosts', forumPosts);
      renderForumPostDetail();
      showToast(`新增 ${addedCount} 条评论`);
    }
    
  } catch (e) {
    console.error('[论坛] 生成评论失败:', e);
    showToast('生成失败: ' + e.message);
  } finally {
    if (btn) btn.classList.remove('loading');
  }
}

// ==================== 工具函数 ====================

function formatForumTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
  
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function escapeForumHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getAvatarEmoji(name) {
  const emojis = ['😀', '😎', '🤓', '🥳', '😊', '🤗', '😄', '🙂', '😏', '🤩'];
  const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return emojis[hash % emojis.length];
}

function switchForumTab(tab) {
  // TODO: 实现标签切换逻辑
  document.querySelectorAll('.forum-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
}

// ==================== 导出 ====================

window.initForumApp = initForumApp;
window.renderForumPage = renderForumPage;
window.renderForumFeed = renderForumFeed;
window.openForumPostDetail = openForumPostDetail;
window.closeForumPostDetail = closeForumPostDetail;
window.openForumSettings = openForumSettings;
window.closeForumSettings = closeForumSettings;
window.saveForumSetting = saveForumSetting;
window.openAddForumParticipant = openAddForumParticipant;
window.closeForumParticipantModal = closeForumParticipantModal;
window.selectForumParticipant = selectForumParticipant;
window.removeForumParticipant = removeForumParticipant;
window.openForumCompose = openForumCompose;
window.closeForumCompose = closeForumCompose;
window.showForumAuthorPicker = showForumAuthorPicker;
window.closeForumAuthorPicker = closeForumAuthorPicker;
window.selectForumComposeAuthor = selectForumComposeAuthor;
window.submitForumPost = submitForumPost;
window.submitForumComment = submitForumComment;
window.replyToForumComment = replyToForumComment;
window.cancelForumReply = cancelForumReply;
window.updateForumCommentInput = updateForumCommentInput;
window.toggleForumPostLike = toggleForumPostLike;
window.toggleForumCommentLike = toggleForumCommentLike;
window.generateForumPosts = generateForumPosts;
window.generateMoreComments = generateMoreComments;
window.switchForumTab = switchForumTab;

// 页面加载时初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initForumApp);
} else {
  initForumApp();
}
