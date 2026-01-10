// ==================== 论坛App ====================

// 论坛数据
let forumSettings = {
  worldview: "", // 世界观设定
  forumName: "广场", // 论坛名称
  userIdentity: "", // 用户在论坛的身份
  userNickname: "", // 用户在论坛的昵称
  aiParticipants: [], // AI参与者列表 [{ charId, identity, nickname }]
};

let forumPosts = []; // 帖子列表
let currentForumPostId = null; // 当前查看的帖子ID
let forumComposeAuthor = null; // 发帖时选择的作者
let forumReplyTarget = null; // 回复目标 { commentId, authorName }
let currentForumTab = 'recommend'; // 当前tab: 'recommend' 或 'following'

// ==================== 初始化 ====================

async function initForumApp() {
  // 加载保存的数据
  const savedSettings = await localforage.getItem("forumSettings");
  if (savedSettings) {
    forumSettings = { ...forumSettings, ...savedSettings };
  }

  const savedPosts = await localforage.getItem("forumPosts");
  if (savedPosts) {
    forumPosts = savedPosts;
  }

  // 渲染论坛主页
  renderForumPage();

  console.log("[论坛] 初始化完成");
}

// ==================== 渲染主页 (全屏沉浸版) ====================

function renderForumPage() {
  const container = document.getElementById("forumPageContent");
  if (!container) return;

  // 渲染页面结构：
  // 1. 新增了 forum-nav-back 按钮，点击调用 closePage('forumPage')
  // 2. 这是一个 Flex 布局的头部
  // 3. 底部导航栏
  container.innerHTML = `
    <div class="forum-container">
      <div class="forum-tabs">
        <button class="forum-nav-back" onclick="closePage('forumPage')">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        
        <div class="forum-tab active" onclick="switchForumTab('recommend')">推荐</div>
        <div class="forum-tab" onclick="switchForumTab('following')">关注</div>
        
        <button class="forum-nav-back forum-refresh-btn" onclick="generateForumPosts()" style="margin-left:auto;" title="刷新内容">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
        </button>
        <button class="forum-nav-back" onclick="openForumSettings()" style="margin-right:0;" title="设置">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="19" r="2"></circle></svg>
        </button>
      </div>
      <div class="forum-feed" id="forumFeed"></div>
      
      <!-- 底部导航栏 -->
      <div class="forum-bottom-nav">
        <button class="forum-nav-item active" onclick="switchForumSection('home')">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 1.696L.622 8.807l1.06 1.696L3 9.679V19.5A2.5 2.5 0 0 0 5.5 22h13a2.5 2.5 0 0 0 2.5-2.5V9.679l1.318.824 1.06-1.696L12 1.696zM12 16.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>
        </button>
        <button class="forum-nav-item" onclick="switchForumSection('hot')">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
        <button class="forum-nav-item" onclick="switchForumSection('profile')">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </button>
      </div>
      
      <button class="forum-fab" onclick="openForumCompose()">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>
  `;

  renderForumFeed();
}

// 渲染信息流
function renderForumFeed() {
  const container = document.getElementById("forumFeed");
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

  // 根据当前tab过滤帖子
  let filteredPosts = forumPosts;
  if (currentForumTab === 'following') {
    // 关注页只显示AI角色的帖子
    filteredPosts = forumPosts.filter(p => p.authorType === 'ai');
  }

  // 没有帖子时显示生成按钮
  if (filteredPosts.length === 0) {
    const emptyText = currentForumTab === 'following' 
      ? '关注的角色还没有发帖<br>刷新一下看看吧'
      : '论坛里还没有帖子<br>点击下方按钮生成一些内容吧';
    container.innerHTML = `
      <div class="forum-empty">
        <div class="forum-empty-icon">📝</div>
        <div class="forum-empty-text">${emptyText}</div>
        <button class="forum-empty-btn" onclick="generateForumPosts()">✨ 生成帖子</button>
      </div>
    `;
    return;
  }

  // 渲染帖子列表
  let html = filteredPosts.map((post) => renderForumPostItem(post)).join("");
  container.innerHTML = html;
}

// 渲染单个帖子 (推特/微博风格)
function renderForumPostItem(post) {
  // 处理标签 - 只显示用户自己的"我"标签
  const tagHtml =
    post.authorType === "user"
      ? '<span class="forum-author-tag user">我</span>'
      : "";

  // 获取头像
  const avatarContent = post.authorAvatar
    ? `<img src="${post.authorAvatar}" alt="">`
    : getAvatarEmoji(post.authorName);

  // 格式化时间
  const timeStr = formatForumTime(post.timestamp);
  const commentCount = post.comments?.length || 0;

  // 使用保存的英文handle，如果没有则生成一个
  const handle = post.handle || generateEnglishHandle(post.authorName);
  
  // 浏览量和转发量
  const views = post.views || Math.floor(Math.random() * 1000) + 50;
  const retweets = post.retweets || 0;
  
  // 处理内容中的图片占位符
  const contentHtml = formatForumContent(post.content);

  return `
    <div class="forum-post" onclick="openForumPostDetail(${post.id})">
      <div class="forum-post-left">
        <div class="forum-post-avatar">${avatarContent}</div>
      </div>
      
      <div class="forum-post-right">
        <div class="forum-post-header">
          <span class="forum-post-name">${escapeForumHtml(
            post.authorName
          )}</span>
          ${tagHtml}
          <div class="forum-post-meta">
            <span>@${handle}</span>
            <span>·</span>
            <span>${timeStr}</span>
          </div>
        </div>
        
        <div class="forum-post-content">${contentHtml}</div>

        <div class="forum-post-actions">
          <div class="forum-action">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            <span>${commentCount || ""}</span>
          </div>
          
          <div class="forum-action" onclick="event.stopPropagation(); showRetweetMenu(${post.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 1l4 4-4 4"></path>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <path d="M7 23l-4-4 4-4"></path>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
            <span>${retweets || ""}</span>
          </div>

          <div class="forum-action ${
            post.liked ? "liked" : ""
          }" onclick="event.stopPropagation(); toggleForumPostLike(${post.id})">
            <svg viewBox="0 0 24 24" fill="${
              post.liked ? "currentColor" : "none"
            }" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>${post.likes || ""}</span>
          </div>

          <div class="forum-action" onclick="event.stopPropagation();">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
               <line x1="18" y1="20" x2="18" y2="10"></line>
               <line x1="12" y1="20" x2="12" y2="4"></line>
               <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            <span>${views}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
// ==================== 帖子详情 ====================

function openForumPostDetail(postId) {
  // 确保ID是数字类型进行比较
  currentForumPostId = Number(postId);
  const overlay = document.getElementById("forumDetailOverlay");
  if (overlay) {
    overlay.classList.add("active");
    renderForumPostDetail();
  }
}

function closeForumPostDetail() {
  currentForumPostId = null;
  forumReplyTarget = null; // 重置回复状态
  const overlay = document.getElementById("forumDetailOverlay");
  if (overlay) {
    overlay.classList.remove("active");
  }
}

function renderForumPostDetail() {
  // 用宽松比较或转换后比较
  const post = forumPosts.find((p) => Number(p.id) === Number(currentForumPostId));
  if (!post) {
    console.log('[论坛] 找不到帖子:', currentForumPostId, forumPosts.map(p => p.id));
    return;
  }

  const container = document.getElementById("forumDetailContent");
  if (!container) return;

  // 只显示用户的"我"标签
  const tagHtml =
    post.authorType === "user"
      ? '<span class="forum-author-tag user">我</span>'
      : "";

  const avatarContent = post.authorAvatar
    ? `<img src="${post.authorAvatar}" alt="">`
    : getAvatarEmoji(post.authorName);
    
  const handle = post.handle || generateEnglishHandle(post.authorName);
  const retweets = post.retweets || 0;
  const views = post.views || 0;

  // 渲染评论
  const commentsHtml = (post.comments || [])
    .map((comment) => {
      const commentTag =
        comment.authorType === "user"
          ? '<span class="forum-author-tag user">我</span>'
          : "";
      const commentAvatar = comment.authorAvatar
        ? `<img src="${comment.authorAvatar}" alt="">`
        : getAvatarEmoji(comment.authorName);

      const replyHtml = comment.replyToName
        ? `<span class="forum-reply-to">回复 @${escapeForumHtml(comment.replyToName)}</span>`
        : "";

      return `
      <div class="forum-comment" data-comment-id="${comment.id}">
        <div class="forum-comment-avatar">${commentAvatar}</div>
        <div class="forum-comment-body">
          <div class="forum-comment-header">
            <span class="forum-comment-name">${escapeForumHtml(comment.authorName)}</span>
            ${commentTag}
            <span class="forum-comment-time">· ${formatForumTime(comment.timestamp)}</span>
          </div>
          <div class="forum-comment-text">${replyHtml}${escapeForumHtml(comment.content)}</div>
          <div class="forum-comment-actions">
            <div class="forum-comment-action" onclick="replyToForumComment(${post.id}, ${comment.id}, '${escapeForumHtml(comment.authorName)}')">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </div>
            <div class="forum-comment-action ${comment.liked ? 'liked' : ''}" onclick="toggleForumCommentLike(${post.id}, ${comment.id})">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="${comment.liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span>${comment.likes || ''}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  // 格式化完整时间
  const fullTime = new Date(post.timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  container.innerHTML = `
    <div class="forum-detail-post">
      <div class="forum-detail-author">
        <div class="forum-detail-avatar">${avatarContent}</div>
        <div class="forum-detail-author-info">
          <div class="forum-detail-name">${escapeForumHtml(post.authorName)} ${tagHtml}</div>
          <div class="forum-detail-handle">@${handle}</div>
        </div>
      </div>
      
      <div class="forum-detail-text">${formatForumContent(post.content)}</div>
      
      <div class="forum-detail-time">${fullTime}</div>
      
      <div class="forum-detail-stats">
        <div class="forum-detail-stat"><strong>${retweets}</strong> 转发</div>
        <div class="forum-detail-stat"><strong>${post.likes || 0}</strong> 喜欢</div>
        <div class="forum-detail-stat"><strong>${views}</strong> 浏览</div>
      </div>
      
      <div class="forum-detail-actions">
        <div class="forum-detail-action">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </div>
        <div class="forum-detail-action" onclick="showRetweetMenu(${post.id})">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M17 1l4 4-4 4"></path>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
            <path d="M7 23l-4-4 4-4"></path>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
          </svg>
        </div>
        <div class="forum-detail-action ${post.liked ? 'liked' : ''}" onclick="toggleForumPostLike(${post.id}); renderForumPostDetail();">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="${post.liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </div>
        <div class="forum-detail-action">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
        </div>
      </div>
    </div>
    
    <div class="forum-comments-section">
      ${commentsHtml || '<div class="forum-no-comments">暂无评论，来说点什么吧</div>'}
    </div>
  `;

  updateForumCommentInput();
}

// 更新评论输入框状态
function updateForumCommentInput() {
  const input = document.getElementById("forumCommentInput");
  const replyIndicator = document.getElementById("forumReplyIndicator");

  if (forumReplyTarget) {
    if (input) input.placeholder = `回复 @${forumReplyTarget.authorName}...`;
    if (replyIndicator) {
      replyIndicator.style.display = "flex";
      replyIndicator.innerHTML = `
        <span>回复 @${escapeForumHtml(forumReplyTarget.authorName)}</span>
        <span style="cursor:pointer;margin-left:8px;" onclick="cancelForumReply();updateForumCommentInput();">✕</span>
      `;
    }
  } else {
    if (input) input.placeholder = "写评论...";
    if (replyIndicator) replyIndicator.style.display = "none";
  }
}

// ==================== 设置页面 ====================

function openForumSettings() {
  const overlay = document.getElementById("forumSettingsOverlay");
  if (overlay) {
    overlay.classList.add("active");
    renderForumSettings();
  }
}

function closeForumSettings() {
  const overlay = document.getElementById("forumSettingsOverlay");
  if (overlay) {
    overlay.classList.remove("active");
  }
  // 刷新主页
  renderForumFeed();
}

function renderForumSettings() {
  const container = document.getElementById("forumSettingsContent");
  if (!container) return;

  // AI参与者列表
  const participantsHtml = forumSettings.aiParticipants
    .map((p, index) => {
      const char = characters.find((c) => c.id === p.charId);
      const avatarContent = char?.avatar
        ? `<img src="${char.avatar}" alt="">`
        : "🤖";
      const name = p.nickname || char?.name || "未知角色";

      return `
      <div class="forum-participant">
        <div class="forum-participant-avatar">${avatarContent}</div>
        <div class="forum-participant-info">
          <div class="forum-participant-name">${escapeForumHtml(name)}</div>
          <div class="forum-participant-identity">${escapeForumHtml(
            p.identity || "未设置身份"
          )}</div>
        </div>
        <button class="forum-participant-remove" onclick="removeForumParticipant(${index})">×</button>
      </div>
    `;
    })
    .join("");

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
            onchange="saveForumSetting('worldview', this.value)">${escapeForumHtml(
              forumSettings.worldview
            )}</textarea>
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
            onchange="saveForumSetting('userIdentity', this.value)">${escapeForumHtml(
              forumSettings.userIdentity
            )}</textarea>
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
  await localforage.setItem("forumSettings", forumSettings);
  console.log("[论坛] 设置已保存:", key);
}

// ==================== AI参与者管理 ====================

function openAddForumParticipant() {
  const availableChars = characters.filter(
    (c) => !forumSettings.aiParticipants.find((p) => p.charId === c.id)
  );

  if (availableChars.length === 0) {
    showToast("没有可添加的角色");
    return;
  }

  const html = availableChars
    .map(
      (c) => `
    <div class="forum-char-select-item" onclick="selectForumParticipant('${c.id}')">
      <div class="forum-char-select-avatar">
        ${
          c.avatar
            ? `<img src="${c.avatar}" alt="">`
            : (c.name ? c.name.charAt(0) : "🤖")
        }
      </div>
      <div class="forum-char-select-name">${escapeForumHtml(c.name)}</div>
      <svg class="forum-char-select-arrow" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </div>
  `
    )
    .join("");

  const modal = document.createElement("div");
  modal.id = "forumAddParticipantModal";
  modal.className = "forum-modal-overlay";
  modal.innerHTML = `
    <div class="forum-modal-content">
      <div class="forum-modal-header">
        <span class="forum-modal-title">选择角色</span>
        <button class="forum-modal-close" onclick="closeForumParticipantModal()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="forum-modal-body">
        ${html}
      </div>
    </div>
  `;
  modal.onclick = (e) => {
    if (e.target === modal) closeForumParticipantModal();
  };
  document.body.appendChild(modal);
}

function closeForumParticipantModal() {
  const modal = document.getElementById("forumAddParticipantModal");
  if (modal) modal.remove();
}

async function selectForumParticipant(charId) {
  closeForumParticipantModal();

  const char = characters.find((c) => String(c.id) === String(charId));
  if (!char) return;
  
  // 创建设置身份的弹窗
  const modal = document.createElement("div");
  modal.id = "forumSetIdentityModal";
  modal.className = "forum-modal-overlay";
  modal.innerHTML = `
    <div class="forum-modal-content">
      <div class="forum-modal-header">
        <span class="forum-modal-title">设置角色身份</span>
        <button class="forum-modal-close" onclick="document.getElementById('forumSetIdentityModal').remove()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="forum-modal-body" style="padding:16px;">
        <div class="forum-identity-char">
          <div class="forum-identity-avatar">
            ${char.avatar ? `<img src="${char.avatar}" alt="">` : (char.name ? char.name.charAt(0) : '🤖')}
          </div>
          <div class="forum-identity-name">${escapeForumHtml(char.name)}</div>
        </div>
        
        <div class="forum-item" style="padding:0;border:none;margin-bottom:16px;">
          <div class="forum-label">论坛昵称</div>
          <input type="text" class="forum-input" id="forumParticipantNickname" 
            placeholder="留空则使用角色原名">
        </div>
        
        <div class="forum-item" style="padding:0;border:none;margin-bottom:16px;">
          <div class="forum-label">身份设定</div>
          <textarea class="forum-input" id="forumParticipantIdentity" rows="3"
            placeholder="该角色在论坛的身份，如：资深摸鱼达人、某领域专家..."></textarea>
        </div>
        
        <button class="forum-identity-submit" onclick="confirmAddParticipant('${charId}')">
          添加角色
        </button>
      </div>
    </div>
  `;
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  document.body.appendChild(modal);
}

async function confirmAddParticipant(charId) {
  const nickname = document.getElementById('forumParticipantNickname')?.value || '';
  const identity = document.getElementById('forumParticipantIdentity')?.value || '';
  
  document.getElementById('forumSetIdentityModal')?.remove();
  
  forumSettings.aiParticipants.push({
    charId,
    identity: identity,
    nickname: nickname,
  });

  await localforage.setItem("forumSettings", forumSettings);
  renderForumSettings();
  showToast('角色已添加');
}

async function removeForumParticipant(index) {
  forumSettings.aiParticipants.splice(index, 1);
  await localforage.setItem("forumSettings", forumSettings);
  renderForumSettings();
}

// ==================== 发帖 ====================

function openForumCompose() {
  forumComposeAuthor = { type: "user" };
  const overlay = document.getElementById("forumComposeOverlay");
  if (overlay) {
    overlay.classList.add("active");
    renderForumComposeAuthor();
    document.getElementById("forumComposeTextarea").value = "";
    document.getElementById("forumComposeTextarea").focus();
  }
}

function closeForumCompose() {
  const overlay = document.getElementById("forumComposeOverlay");
  if (overlay) {
    overlay.classList.remove("active");
  }
}

function renderForumComposeAuthor() {
  const container = document.getElementById("forumComposeAuthor");
  if (!container) return;

  let avatarHtml, nameHtml;

  if (forumComposeAuthor.type === "user") {
    const globalAvatar = localStorage.getItem("avatarImg");
    avatarHtml = globalAvatar ? `<img src="${globalAvatar}" alt="">` : "👤";
    nameHtml = forumSettings.userNickname || "我";
  } else {
    const char = characters.find((c) => c.id === forumComposeAuthor.charId);
    const participant = forumSettings.aiParticipants.find(
      (p) => p.charId === forumComposeAuthor.charId
    );
    avatarHtml = char?.avatar ? `<img src="${char.avatar}" alt="">` : "🤖";
    nameHtml = participant?.nickname || char?.name || "角色";
  }

  container.innerHTML = `
    <div class="forum-compose-avatar">${avatarHtml}</div>
    <div class="forum-compose-name">${nameHtml}</div>
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#536471" stroke-width="2">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  `;
}

function showForumAuthorPicker() {
  const options = [{ type: "user", name: forumSettings.userNickname || "我" }];

  forumSettings.aiParticipants.forEach((p) => {
    const char = characters.find((c) => c.id === p.charId);
    options.push({
      type: "ai",
      charId: p.charId,
      name: p.nickname || char?.name || "角色",
    });
  });

  const html = options
    .map(
      (opt, i) => `
    <div class="forum-author-option" onclick="selectForumComposeAuthor(${i})">
      <span>${opt.name}</span>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f48fb1" stroke-width="2" style="opacity:${forumComposeAuthor.type === opt.type && (opt.type === 'user' || forumComposeAuthor.charId === opt.charId) ? '1' : '0'}">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  `
    )
    .join("");

  const modal = document.createElement("div");
  modal.id = "forumAuthorPickerModal";
  modal.className = "forum-author-picker-modal";
  modal.innerHTML = `
    <div class="forum-author-picker">
      <div class="forum-author-picker-header">
        <span>选择发帖身份</span>
        <button onclick="closeForumAuthorPicker()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="forum-author-picker-list">
        ${html}
      </div>
    </div>
  `;
  modal.onclick = (e) => {
    if (e.target === modal) closeForumAuthorPicker();
  };
  document.body.appendChild(modal);

  window.forumAuthorOptions = options;
}

function closeForumAuthorPicker() {
  const modal = document.getElementById("forumAuthorPickerModal");
  if (modal) modal.remove();
}

function selectForumComposeAuthor(index) {
  const opt = window.forumAuthorOptions[index];
  forumComposeAuthor = opt;
  closeForumAuthorPicker();
  renderForumComposeAuthor();
}

async function submitForumPost() {
  const textarea = document.getElementById("forumComposeTextarea");
  const content = textarea?.value?.trim();

  if (!content) {
    showToast("请输入内容");
    return;
  }

  let authorName, authorAvatar, authorIdentity, authorType, authorId;

  if (forumComposeAuthor.type === "user") {
    authorType = "user";
    authorName = forumSettings.userNickname || "我";
    authorAvatar = localStorage.getItem("avatarImg") || "";
    authorIdentity = forumSettings.userIdentity || "";
    authorId = null;
  } else {
    const char = characters.find((c) => c.id === forumComposeAuthor.charId);
    const participant = forumSettings.aiParticipants.find(
      (p) => p.charId === forumComposeAuthor.charId
    );
    authorType = "ai";
    authorName = participant?.nickname || char?.name || "角色";
    authorAvatar = char?.avatar || "";
    authorIdentity = participant?.identity || "";
    authorId = forumComposeAuthor.charId;
  }

  const newPost = {
    id: Date.now(),
    authorType,
    authorId,
    authorName,
    authorAvatar,
    authorIdentity,
    handle: generateEnglishHandle(authorName),
    content,
    timestamp: Date.now(),
    likes: 0,
    liked: false,
    retweets: 0,
    views: Math.floor(Math.random() * 100) + 10,
    comments: [],
  };

  forumPosts.unshift(newPost);
  await localforage.setItem("forumPosts", forumPosts);

  closeForumCompose();
  renderForumFeed();
  showToast("发布成功");
}

// ==================== 评论 ====================

// 设置回复目标
function replyToForumComment(postId, commentId, authorName) {
  forumReplyTarget = { commentId, authorName };
  const input = document.getElementById("forumCommentInput");
  if (input) {
    input.placeholder = `回复 @${authorName}...`;
    input.focus();
  }
}

// 取消回复
function cancelForumReply() {
  forumReplyTarget = null;
  const input = document.getElementById("forumCommentInput");
  if (input) {
    input.placeholder = "写评论...";
  }
}

async function submitForumComment() {
  if (!currentForumPostId) return;

  const input = document.getElementById("forumCommentInput");
  const content = input?.value?.trim();

  if (!content) return;

  const post = forumPosts.find((p) => p.id === currentForumPostId);
  if (!post) return;

  if (!post.comments) post.comments = [];

  // 生成新的评论ID
  const maxId = post.comments.reduce((max, c) => Math.max(max, c.id || 0), 0);

  const newComment = {
    id: maxId + 1,
    authorType: "user",
    authorName: forumSettings.userNickname || "我",
    authorAvatar: localStorage.getItem("avatarImg") || "",
    content,
    replyTo: forumReplyTarget?.commentId || null,
    replyToName: forumReplyTarget?.authorName || null,
    timestamp: Date.now(),
    likes: 0,
    liked: false,
  };

  post.comments.push(newComment);
  await localforage.setItem("forumPosts", forumPosts);

  input.value = "";
  cancelForumReply(); // 重置回复状态
  renderForumPostDetail();

  // 触发AI回复
  generateForumCommentReply(currentForumPostId, newComment);
}

// ==================== 点赞 ====================

async function toggleForumPostLike(postId) {
  const post = forumPosts.find((p) => p.id === postId);
  if (!post) return;

  post.liked = !post.liked;
  post.likes = (post.likes || 0) + (post.liked ? 1 : -1);

  await localforage.setItem("forumPosts", forumPosts);
  renderForumFeed();
}

async function toggleForumCommentLike(postId, commentId) {
  const post = forumPosts.find((p) => p.id === postId);
  if (!post) return;

  const comment = post.comments?.find((c) => c.id === commentId);
  if (!comment) return;

  comment.liked = !comment.liked;
  comment.likes = (comment.likes || 0) + (comment.liked ? 1 : -1);

  await localforage.setItem("forumPosts", forumPosts);
  renderForumPostDetail();
}

// ==================== AI生成 ====================

async function generateForumPosts() {
  if (!forumSettings.worldview) {
    showToast("请先设置世界观");
    openForumSettings();
    return;
  }

  const apiConfig = getActiveApiConfig();
  if (!apiConfig || !apiConfig.url || !apiConfig.key) {
    showToast("请先配置API");
    return;
  }

  // 刷新按钮开始旋转
  const refreshBtn = document.querySelector(".forum-refresh-btn");
  if (refreshBtn) refreshBtn.classList.add("spinning");

  try {
    // 构建参与者信息
    const participants = forumSettings.aiParticipants.map((p) => {
      const char = characters.find((c) => c.id === p.charId);
      const settings = chatSettings[p.charId] || {};
      return {
        name: p.nickname || settings.charName || char?.name || "角色",
        identity: p.identity || "",
        persona: settings.persona || char?.persona || "",
      };
    });

    const systemPrompt = `你是一个论坛内容生成器。请根据以下设定生成论坛帖子。

【世界观】
${forumSettings.worldview}

【论坛名称】
${forumSettings.forumName}

【用户信息（仅供参考，不要生成用户的帖子或评论）】
- 昵称：${forumSettings.userNickname || "用户"}
- 身份：${forumSettings.userIdentity || "普通成员"}

【AI参与者】
${
  participants
    .map(
      (p, i) =>
        `${i + 1}. ${p.name}：${p.identity}${
          p.persona ? "，性格：" + p.persona.substring(0, 100) : ""
        }`
    )
    .join("\n") || "无"
}

【要求】
1. 生成10-15条论坛帖子
2. 帖子作者只能是AI参与者或随机网友(NPC)，绝对不要生成用户的帖子
3. NPC网友要有符合世界观的随机昵称
4. 内容要符合世界观设定，有趣且有互动感
5. 每条帖子必须有10-15条评论，评论者也只能是AI或NPC，不能是用户
6. 评论之间可以互相回复，形成楼中楼（用replyTo字段指定回复哪条评论）
7. 部分帖子可以包含图片，用[图片:图片描述]格式，描述要详细有趣
8. 返回JSON数组格式`;

    const userPrompt = `请生成论坛帖子，返回纯JSON数组（不要markdown代码块）：
[
  {
    "authorType": "ai或npc",
    "authorName": "中文昵称",
    "handle": "英文用户名(不含@符号，如VivianFan123、CityBird_99)",
    "content": "帖子内容，如果要发图片用[图片:图片描述]格式",
    "likes": 点赞数,
    "retweets": 转发数(0-50),
    "views": 浏览量(100-5000的随机数),
    "comments": [
      {"id":1,"authorType":"npc","authorName":"昵称","content":"评论","likes":0},
      {"id":2,"authorType":"ai","authorName":"昵称","content":"回复评论","likes":0,"replyTo":1,"replyToName":"被回复者昵称"}
    ]
  }
]
注意：
1. authorType只能是"ai"或"npc"，不要生成"user"
2. handle必须是英文，可以包含数字和下划线，要有个性，不要直接翻译中文名
3. 评论的id从1开始递增
4. 每个帖子必须有10-15条评论！这很重要！
5. 如果是回复某条评论，用replyTo指定被回复评论的id，replyToName是被回复者的昵称`;

    const response = await fetch(`${apiConfig.url}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiConfig.key}`,
      },
      body: JSON.stringify({
        model: apiConfig.model || "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) throw new Error("API请求失败");

    const data = await response.json();
    let content = data.choices[0]?.message?.content || "";

    // 解析JSON
    content = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const posts = JSON.parse(jsonMatch[0]);
      const newPosts = posts.map((p, idx) => ({
        id: Math.floor(Date.now() + idx * 1000 + Math.random() * 100),
        authorType: p.authorType === "user" ? "npc" : p.authorType || "npc", // 强制不允许user
        authorId: null,
        authorName: p.authorName || "匿名",
        authorAvatar: "",
        handle: p.handle || generateEnglishHandle(p.authorName),
        content: p.content || "",
        timestamp: Date.now() - Math.random() * 7200000,
        likes: p.likes || Math.floor(Math.random() * 50),
        liked: false,
        retweets: p.retweets || Math.floor(Math.random() * 30),
        views: p.views || Math.floor(Math.random() * 4900) + 100,
        comments: (p.comments || []).map((c, cidx) => ({
          id: c.id || cidx + 1,
          authorType: c.authorType === "user" ? "npc" : c.authorType || "npc", // 强制不允许user
          authorName: c.authorName || "网友",
          authorAvatar: "",
          content: c.content || "",
          replyTo: c.replyTo || null,
          replyToName: c.replyToName || null,
          timestamp: Date.now() - Math.random() * 3600000,
          likes: c.likes || Math.floor(Math.random() * 10),
          liked: false,
        })),
      }));

      // 替换旧帖子而不是追加
      forumPosts = newPosts;
      await localforage.setItem("forumPosts", forumPosts);
      showToast(`刷新了 ${newPosts.length} 条帖子`);
    }

    renderForumFeed();
  } catch (e) {
    console.error("[论坛] 生成失败:", e);
    showToast("生成失败: " + e.message);
    renderForumFeed();
  } finally {
    // 停止旋转
    if (refreshBtn) refreshBtn.classList.remove("spinning");
  }
}

// 生成评论回复
async function generateForumCommentReply(postId, userComment) {
  if (Math.random() > 0.6) return; // 40%概率有人回复

  const post = forumPosts.find((p) => p.id === postId);
  if (!post) return;

  const apiConfig = getActiveApiConfig();
  if (!apiConfig) return;

  // 收集已有评论作为上下文
  const commentsContext = (post.comments || [])
    .slice(-5)
    .map(
      (c) =>
        `${c.authorName}${c.replyToName ? " 回复 @" + c.replyToName : ""}：${
          c.content
        }`
    )
    .join("\n");

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
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiConfig.key}`,
      },
      body: JSON.stringify({
        model: apiConfig.model || "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 100,
      }),
    });

    if (!response.ok) return;

    const data = await response.json();
    const reply = data.choices[0]?.message?.content?.trim();

    if (reply) {
      const npcNames = [
        "路人甲",
        "吃瓜群众",
        "热心网友",
        "神秘人",
        "潜水党",
        "围观群众",
      ];
      const maxId = post.comments.reduce(
        (max, c) => Math.max(max, c.id || 0),
        0
      );

      post.comments.push({
        id: maxId + 1,
        authorType: "npc",
        authorName: npcNames[Math.floor(Math.random() * npcNames.length)],
        authorAvatar: "",
        content: reply,
        replyTo: userComment.id, // 回复用户的评论
        replyToName: userComment.authorName,
        timestamp: Date.now(),
        likes: 0,
        liked: false,
      });

      await localforage.setItem("forumPosts", forumPosts);

      if (currentForumPostId === postId) {
        renderForumPostDetail();
      }
    }
  } catch (e) {
    console.error("[论坛] 生成回复失败:", e);
  }
}

// 生成更多互动评论
async function generateMoreComments() {
  if (!currentForumPostId) return;

  const post = forumPosts.find((p) => p.id === currentForumPostId);
  if (!post) return;

  const apiConfig = getActiveApiConfig();
  if (!apiConfig || !apiConfig.url || !apiConfig.key) {
    showToast("请先配置API");
    return;
  }

  // 按钮loading状态
  const btn = document.querySelector(".forum-comment-refresh");
  if (btn) btn.classList.add("loading");

  // 收集已有评论
  const existingComments = (post.comments || []).map((c) => ({
    id: c.id,
    author: c.authorName,
    authorType: c.authorType,
    content: c.content,
    replyTo: c.replyTo,
    replyToName: c.replyToName,
  }));

  // 找出用户的评论，AI可能会回复这些
  const userComments = existingComments.filter((c) => c.authorType === "user");

  // 收集AI参与者
  const participants = forumSettings.aiParticipants.map((p) => {
    const char = characters.find((c) => c.id === p.charId);
    return p.nickname || char?.name || "角色";
  });

  try {
    const prompt = `你是一个论坛评论生成器。

【世界观】${forumSettings.worldview}

【帖子内容】${post.content}

【已有评论】
${
  existingComments
    .map(
      (c) =>
        `[ID:${c.id}] ${c.author}${
          c.replyToName ? " 回复@" + c.replyToName : ""
        }：${c.content}`
    )
    .join("\n") || "暂无评论"
}

【用户信息】昵称：${forumSettings.userNickname || "用户"}

【AI参与者】${participants.join("、") || "无"}

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
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiConfig.key}`,
      },
      body: JSON.stringify({
        model: apiConfig.model || "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
      }),
    });

    if (!response.ok) throw new Error("API请求失败");

    const data = await response.json();
    let content = data.choices[0]?.message?.content || "";

    // 解析JSON
    content = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const newComments = JSON.parse(jsonMatch[0]);
      const maxId = post.comments.reduce(
        (max, c) => Math.max(max, c.id || 0),
        0
      );

      let addedCount = 0;
      newComments.forEach((c, idx) => {
        // 强制不允许用户类型
        if (c.authorType === "user") return;

        post.comments.push({
          id: maxId + idx + 1,
          authorType: c.authorType || "npc",
          authorName: c.authorName || "网友",
          authorAvatar: "",
          content: c.content || "",
          replyTo: c.replyTo || null,
          replyToName: c.replyToName || null,
          timestamp: Date.now() + idx * 1000, // 稍微错开时间
          likes: Math.floor(Math.random() * 5),
          liked: false,
        });
        addedCount++;
      });

      await localforage.setItem("forumPosts", forumPosts);
      renderForumPostDetail();
      showToast(`新增 ${addedCount} 条评论`);
    }
  } catch (e) {
    console.error("[论坛] 生成评论失败:", e);
    showToast("生成失败: " + e.message);
  } finally {
    if (btn) btn.classList.remove("loading");
  }
}

// ==================== 工具函数 ====================

// 生成英文handle
function generateEnglishHandle(name) {
  const prefixes = ['cool', 'happy', 'cute', 'super', 'tiny', 'big', 'sweet', 'star', 'moon', 'sun', 'sky', 'lucky', 'nice'];
  const suffixes = ['cat', 'dog', 'bird', 'fan', 'lover', 'star', 'dream', 'day', 'night', 'life', 'world', 'time'];
  const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const prefix = prefixes[hash % prefixes.length];
  const suffix = suffixes[(hash * 7) % suffixes.length];
  const num = (hash % 900) + 100;
  return `${prefix}_${suffix}${num}`;
}

// 处理内容中的图片占位符
function formatForumContent(content) {
  if (!content) return "";
  
  // 先转义HTML
  let html = escapeForumHtml(content);
  
  // 替换 [图片] 或 [图片:描述] 为图片占位符
  // 匹配 [图片] 或 [图片:xxx]
  html = html.replace(/\[图片(?::([^\]]*))?\]/g, (match, desc) => {
    const description = desc || '点击查看图片';
    const escapedDesc = description.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    return `
      <div class="forum-image-placeholder" onclick="showForumImageDesc('${escapedDesc}')">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      </div>
    `;
  });
  
  // 也处理 [图] 格式
  html = html.replace(/\[图(?::([^\]]*))?\]/g, (match, desc) => {
    const description = desc || '点击查看图片';
    const escapedDesc = description.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    return `
      <div class="forum-image-placeholder" onclick="showForumImageDesc('${escapedDesc}')">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      </div>
    `;
  });
  
  return html;
}

// 显示图片描述弹窗
function showForumImageDesc(desc) {
  event.stopPropagation();
  
  // 创建弹窗
  const modal = document.createElement('div');
  modal.className = 'forum-image-modal';
  modal.innerHTML = `
    <div class="forum-image-modal-content">
      <div class="forum-image-modal-header">
        <span>图片描述</span>
        <button onclick="this.closest('.forum-image-modal').remove()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="forum-image-modal-body">
        <div class="forum-image-preview">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>
        <p class="forum-image-desc-text">${desc}</p>
      </div>
    </div>
  `;
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  document.body.appendChild(modal);
}

function formatForumTime(timestamp) {
  if (!timestamp) return "";
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return Math.floor(diff / 60000) + "分钟前";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "小时前";
  if (diff < 604800000) return Math.floor(diff / 86400000) + "天前";

  const date = new Date(timestamp);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function escapeForumHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getAvatarEmoji(name) {
  const emojis = ["😀", "😎", "🤓", "🥳", "😊", "🤗", "😄", "🙂", "😏", "🤩"];
  const hash = (name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return emojis[hash % emojis.length];
}

function switchForumTab(tab) {
  currentForumTab = tab;
  document
    .querySelectorAll(".forum-tab")
    .forEach((t) => t.classList.remove("active"));
  event.target.classList.add("active");
  renderForumFeed();
}

// 显示转发菜单
function showRetweetMenu(postId) {
  const post = forumPosts.find(p => p.id === postId);
  if (!post) return;
  
  const modal = document.createElement('div');
  modal.className = 'forum-retweet-modal';
  modal.innerHTML = `
    <div class="forum-retweet-menu">
      <div class="forum-retweet-option" onclick="retweetToChat(${postId}); this.closest('.forum-retweet-modal').remove();">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>转发到聊天框</span>
      </div>
      <div class="forum-retweet-option" onclick="retweetToProfile(${postId}); this.closest('.forum-retweet-modal').remove();">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span>转发到我的主页</span>
      </div>
      <div class="forum-retweet-cancel" onclick="this.closest('.forum-retweet-modal').remove();">
        取消
      </div>
    </div>
  `;
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  document.body.appendChild(modal);
}

// 转发到聊天框 - 弹出角色/群聊选择器
function retweetToChat(postId) {
  const post = forumPosts.find(p => Number(p.id) === Number(postId));
  if (!post) return;
  
  // 构建选项列表（角色 + 群聊）
  let optionsHtml = '';
  
  // 获取角色列表（使用window确保全局访问）
  const charList = window.characters || [];
  const groupList = window.groupChats || [];
  
  // 添加角色
  if (charList.length > 0) {
    optionsHtml += '<div class="forum-char-section-title">角色</div>';
    optionsHtml += charList.map(char => `
      <div class="forum-char-option" onclick="sendRetweetToChar('${char.id}', ${postId}, 'char')">
        <div class="forum-char-avatar">
          ${char.avatar ? `<img src="${char.avatar}" alt="">` : '🤖'}
        </div>
        <div class="forum-char-name">${char.name || '角色'}</div>
      </div>
    `).join('');
  }
  
  // 添加群聊
  if (groupList.length > 0) {
    optionsHtml += '<div class="forum-char-section-title">群聊</div>';
    optionsHtml += groupList.map(group => `
      <div class="forum-char-option" onclick="sendRetweetToChar('${group.id}', ${postId}, 'group')">
        <div class="forum-char-avatar group-avatar">
          ${group.avatar ? `<img src="${group.avatar}" alt="">` : '👥'}
        </div>
        <div class="forum-char-name">${group.name || '群聊'}</div>
      </div>
    `).join('');
  }
  
  if (!optionsHtml) {
    showToast('没有可用的聊天');
    return;
  }
  
  // 创建选择器弹窗
  const modal = document.createElement('div');
  modal.className = 'forum-char-picker-modal';
  modal.innerHTML = `
    <div class="forum-char-picker">
      <div class="forum-char-picker-header">
        <span>选择要发送到的聊天</span>
        <button onclick="this.closest('.forum-char-picker-modal').remove()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="forum-char-picker-list">
        ${optionsHtml}
      </div>
    </div>
  `;
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  document.body.appendChild(modal);
}

// 发送转发卡片到指定角色/群聊
async function sendRetweetToChar(targetId, postId, type) {
  const post = forumPosts.find(p => Number(p.id) === Number(postId));
  if (!post) {
    showToast('帖子不存在');
    return;
  }
  
  // 关闭选择器
  document.querySelector('.forum-char-picker-modal')?.remove();
  
  // 获取角色/群聊列表（使用window确保全局访问）
  const charList = window.characters || [];
  const groupList = window.groupChats || [];
  
  let targetName = '';
  
  // 构建转发卡片数据
  const retweetCard = {
    type: 'retweet_card',
    postId: post.id,
    authorName: post.authorName,
    authorAvatar: post.authorAvatar || '',
    handle: post.handle || generateEnglishHandle(post.authorName),
    content: post.content,
    likes: post.likes || 0,
    retweets: post.retweets || 0,
    comments: post.comments?.length || 0
  };
  
  // 获取当前时间
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  // 消息对象 - content包含帖子信息供AI阅读，UI只显示卡片
  const msgObj = {
    role: 'user',
    content: `[转发帖子] 我转发了一个帖子给你：\n作者：${post.authorName}\n内容：${post.content}`,
    time: timeStr,
    timestamp: Date.now(),
    retweetCard: retweetCard,
    isRetweetOnly: true // 标记为纯转发消息，UI只显示卡片
  };
  
  if (type === 'group') {
    // 群聊
    const group = groupList.find(g => String(g.id) === String(targetId));
    if (!group) {
      showToast('群聊不存在');
      return;
    }
    targetName = group.name;
    
    // 群聊消息存储在 group_messages_${groupId}
    const messagesKey = `group_messages_${targetId}`;
    let messages = await localforage.getItem(messagesKey) || [];
    messages.push(msgObj);
    await localforage.setItem(messagesKey, messages);
    
  } else {
    // 角色 - 单聊
    const char = charList.find(c => String(c.id) === String(targetId));
    if (!char) {
      showToast('角色不存在，请刷新页面重试');
      console.log('[论坛] 查找角色失败:', targetId, charList.map(c => c.id));
      return;
    }
    targetName = char.name;
    
    // 单聊消息存储在 chatHistories 对象中
    let chatHistories = await localforage.getItem('chatHistories') || {};
    if (!chatHistories[targetId]) {
      chatHistories[targetId] = [];
    }
    chatHistories[targetId].push(msgObj);
    await localforage.setItem('chatHistories', chatHistories);
    
    // 同时更新内存中的chatHistories（如果存在）
    if (typeof window.chatHistories !== 'undefined') {
      if (!window.chatHistories[targetId]) {
        window.chatHistories[targetId] = [];
      }
      window.chatHistories[targetId].push(msgObj);
    }
  }
  
  // 关闭论坛详情页和论坛页面
  closeForumPostDetail();
  
  // 跳转到聊天页面
  if (type === 'group') {
    if (typeof openGroupChat === 'function') {
      closePage('forumPage');
      openGroupChat(targetId);
      showToast(`已发送到 ${targetName}`);
    } else {
      showToast(`已添加到 ${targetName}`);
    }
  } else {
    if (typeof openChat === 'function') {
      closePage('forumPage');
      openChat(targetId);
      showToast(`已发送给 ${targetName}`);
    } else {
      showToast(`已添加到与 ${targetName} 的聊天`);
    }
  }
}

// 转发到个人主页
function retweetToProfile(postId) {
  showToast('个人主页功能开发中...');
}

// 渲染转发卡片HTML（供聊天页面调用）
function renderRetweetCard(cardData) {
  if (!cardData) return '';
  
  const avatarHtml = cardData.authorAvatar 
    ? `<img src="${cardData.authorAvatar}" alt="">`
    : getAvatarEmoji(cardData.authorName);
  
  return `
    <div class="retweet-card" onclick="openForumPostFromCard(${cardData.postId})">
      <div class="retweet-card-label">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 1l4 4-4 4"></path>
          <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
          <path d="M7 23l-4-4 4-4"></path>
          <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
        </svg>
        转发的帖子
      </div>
      <div class="retweet-card-body">
        <div class="retweet-card-header">
          <div class="retweet-card-avatar">${avatarHtml}</div>
          <div class="retweet-card-author-info">
            <span class="retweet-card-author">${escapeForumHtml(cardData.authorName)}</span>
            <span class="retweet-card-handle">@${cardData.handle}</span>
          </div>
        </div>
        <div class="retweet-card-content">${escapeForumHtml(cardData.content)}</div>
        <div class="retweet-card-stats">
          <span class="retweet-stat">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            ${cardData.comments || 0}
          </span>
          <span class="retweet-stat">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 1l4 4-4 4"></path>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <path d="M7 23l-4-4 4-4"></path>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
            ${cardData.retweets || 0}
          </span>
          <span class="retweet-stat">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            ${cardData.likes || 0}
          </span>
        </div>
      </div>
    </div>
  `;
}

// 从卡片打开帖子详情
function openForumPostFromCard(postId) {
  // 先打开论坛页面
  if (typeof openPage === 'function') {
    openPage('forumPage');
  }
  
  // 延迟一点打开详情，确保论坛页面已渲染
  setTimeout(() => {
    openForumPostDetail(postId);
  }, 100);
}

// 底部导航栏切换
function switchForumSection(section) {
  // 更新底部导航栏高亮
  document.querySelectorAll(".forum-nav-item").forEach((item) => {
    item.classList.remove("active");
  });
  event.currentTarget.classList.add("active");
  
  // TODO: 实现不同页面的切换逻辑
  if (section === 'home') {
    renderForumFeed();
  } else if (section === 'hot') {
    showToast("热点功能开发中...");
  } else if (section === 'profile') {
    showToast("个人主页开发中...");
  }
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
window.confirmAddParticipant = confirmAddParticipant;
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
window.switchForumSection = switchForumSection;
window.showRetweetMenu = showRetweetMenu;
window.retweetToChat = retweetToChat;
window.retweetToProfile = retweetToProfile;
window.showForumImageDesc = showForumImageDesc;
window.sendRetweetToChar = sendRetweetToChar;
window.renderRetweetCard = renderRetweetCard;
window.openForumPostFromCard = openForumPostFromCard;

// 页面加载时初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initForumApp);
} else {
  initForumApp();
}
