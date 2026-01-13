// ==================== 论坛App ====================

// 论坛数据
let forumSettings = {
  worldview: "", // 世界观设定
  forumName: "广场", // 论坛名称
  userIdentity: "", // 用户在论坛的身份
  userNickname: "", // 用户在论坛的昵称
  userHandle: "", // 用户的@ID
  userBio: "", // 个人介绍
  userBanner: "", // 背景图
  userFollowing: 0, // 关注数
  userFollowers: 0, // 粉丝数
  userJoinDate: "", // 加入时间
  aiParticipants: [], // AI参与者列表 [{ charId, identity, nickname, avatar, handle }]
  npcs: [], // NPC列表 [{ id, name, handle, avatar, identity, persona }]
  relationships: [], // 关系列表 [{ id, person1Type, person1Id, person2Type, person2Id, relationship, description }]
  worldbookIds: [], // 绑定的世界书ID列表
};

// 默认头像SVG（灰色背景+白色人形）
const DEFAULT_AVATAR_SVG = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" fill="#CFD9DE"/>
  <circle cx="24" cy="18" r="8" fill="white"/>
  <ellipse cx="24" cy="42" rx="14" ry="12" fill="white"/>
</svg>`;

// 获取默认头像的Data URL
function getDefaultAvatarDataUrl() {
  return 'data:image/svg+xml,' + encodeURIComponent(DEFAULT_AVATAR_SVG);
}

let forumPosts = []; // 帖子列表
let currentForumPostId = null; // 当前查看的帖子ID
let forumComposeAuthor = null; // 发帖时选择的作者
let forumReplyTarget = null; // 回复目标 { commentId, authorName }
let currentForumTab = 'recommend'; // 当前tab: 'recommend' 或 'following'

// ==================== 初始化 ====================

async function initForumApp() {
  // 强制移除forumPage的padding（覆盖style.css的.page样式）
  const forumPage = document.getElementById('forumPage');
  if (forumPage) {
    forumPage.style.cssText = 'padding: 0 !important; margin: 0 !important;';
  }
  
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
        <button class="forum-nav-back forum-back-btn" onclick="closePage('forumPage')">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        
        <div class="forum-tab forum-home-tab active" onclick="switchForumTab('recommend')">推荐</div>
        <div class="forum-tab forum-home-tab" onclick="switchForumTab('following')">关注</div>
        
        <div class="forum-hot-title" style="display:none;">热点</div>
        
        <button class="forum-nav-back forum-refresh-btn" onclick="handleForumRefresh()" style="margin-left:auto;" title="刷新内容">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
        </button>
        <button class="forum-nav-back forum-settings-btn" onclick="openForumSettings()" style="margin-right:0;" title="设置">
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

  // 确保顶栏和FAB显示（从个人主页返回时可能被隐藏）
  const tabs = document.querySelector('.forum-tabs');
  const fab = document.querySelector('.forum-fab');
  if (tabs) tabs.style.display = 'flex';
  if (fab) fab.style.display = 'flex';
  
  // 恢复safe area padding（从个人主页返回时）
  const forumContainer = document.querySelector('.forum-container');
  if (forumContainer) forumContainer.style.paddingTop = '';
  
  // 显示主页的返回按钮、tab和设置按钮，隐藏热点标题
  const backBtn = document.querySelector('.forum-back-btn');
  const homeTabs = document.querySelectorAll('.forum-home-tab');
  const hotTitle = document.querySelector('.forum-hot-title');
  const settingsBtn = document.querySelector('.forum-settings-btn');
  if (backBtn) backBtn.style.display = 'flex';
  homeTabs.forEach(tab => tab.style.display = 'flex');
  if (hotTitle) hotTitle.style.display = 'none';
  if (settingsBtn) settingsBtn.style.display = 'flex';
  
  // 更新当前section状态
  window.currentForumSection = 'home';

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

  // 过滤掉搜索结果帖子和他人主页生成的帖子，只显示主页帖子
  let filteredPosts = forumPosts.filter(p => !p.isSearchResult && !p.isProfileGenerated);
  
  // 根据当前tab进一步过滤
  if (currentForumTab === 'following') {
    // 关注页只显示AI角色的帖子
    filteredPosts = filteredPosts.filter(p => p.authorType === 'ai');
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
  
  // 渲染真实图片
  let imagesHtml = '';
  if (post.images && post.images.length > 0) {
    const imageCount = post.images.length;
    const gridClass = imageCount === 1 ? 'single' : imageCount === 2 ? 'double' : imageCount === 3 ? 'triple' : 'quad';
    imagesHtml = `
      <div class="forum-post-images ${gridClass}" onclick="event.stopPropagation();">
        ${post.images.map((img, idx) => `
          <div class="forum-post-image-item" onclick="showForumFullImage('${img.replace(/'/g, "\\'")}')">
            <img src="${img}" alt="">
          </div>
        `).join('')}
      </div>
    `;
  }
  
  // 如果是转发的帖子，显示原帖内容（不再显示转发标签）
  let originalPostHtml = '';
  if (post.isRetweet && post.originalPost) {
    // 渲染原帖卡片
    const orig = post.originalPost;
    const origAvatarContent = orig.authorAvatar
      ? `<img src="${orig.authorAvatar}" alt="">`
      : getAvatarEmoji(orig.authorName);
    const origHandle = orig.handle || generateEnglishHandle(orig.authorName);
    const origContentHtml = formatForumContent(orig.content);
    
    // 原帖图片
    let origImagesHtml = '';
    if (orig.images && orig.images.length > 0) {
      const origImageCount = orig.images.length;
      const origGridClass = origImageCount === 1 ? 'single' : origImageCount === 2 ? 'double' : 'quad';
      origImagesHtml = `
        <div class="forum-post-images ${origGridClass}" onclick="event.stopPropagation();">
          ${orig.images.slice(0, 4).map((img, idx) => `
            <div class="forum-post-image-item" onclick="showForumFullImage('${img.replace(/'/g, "\\'")}')">
              <img src="${img}" alt="">
            </div>
          `).join('')}
        </div>
      `;
    }
    
    originalPostHtml = `
      <div class="forum-quote-card" onclick="event.stopPropagation(); openForumPostDetail(${orig.id})">
        <div class="forum-quote-header">
          <div class="forum-quote-avatar">${origAvatarContent}</div>
          <span class="forum-quote-name">${escapeForumHtml(orig.authorName)}</span>
          <span class="forum-quote-handle">@${origHandle}</span>
        </div>
        <div class="forum-quote-content">${origContentHtml}</div>
        ${origImagesHtml}
      </div>
    `;
  }

  return `
    <div class="forum-post" onclick="openForumPostDetail(${post.id})">
      <div class="forum-post-left">
        <div class="forum-post-avatar" onclick="event.stopPropagation(); openOtherUserProfile('${post.authorType}', '${escapeForumHtml(post.authorName)}', '${post.authorId || ''}')">${avatarContent}</div>
      </div>
      
      <div class="forum-post-right">
        <div class="forum-post-header">
          <span class="forum-post-name" onclick="event.stopPropagation(); openOtherUserProfile('${post.authorType}', '${escapeForumHtml(post.authorName)}', '${post.authorId || ''}')">${escapeForumHtml(
            post.authorName
          )}</span>
          ${tagHtml}
          <div class="forum-post-meta">
            <span>@${handle}</span>
            <span>·</span>
            <span>${timeStr}</span>
          </div>
        </div>
        
        ${post.content ? `<div class="forum-post-content">${contentHtml}</div>` : ''}
        ${imagesHtml}
        ${originalPostHtml}

        <div class="forum-post-actions">
          <div class="forum-action">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            <span>${commentCount || ""}</span>
          </div>
          
          <div class="forum-action" onclick="event.stopPropagation(); openQuoteRetweet(${post.id})">
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

// 显示全屏图片
function showForumFullImage(imgSrc) {
  const modal = document.createElement('div');
  modal.className = 'forum-fullimage-modal';
  modal.innerHTML = `
    <div class="forum-fullimage-content">
      <img src="${imgSrc}" alt="">
    </div>
    <button class="forum-fullimage-close" onclick="this.parentElement.remove()">×</button>
  `;
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  document.body.appendChild(modal);
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

  // 处理转发帖子的原帖卡片
  let originalPostHtml = '';
  if (post.isRetweet && post.originalPost) {
    const orig = post.originalPost;
    const origAvatarContent = orig.authorAvatar
      ? `<img src="${orig.authorAvatar}" alt="">`
      : getAvatarEmoji(orig.authorName);
    const origHandle = orig.handle || generateEnglishHandle(orig.authorName);
    const origContentHtml = formatForumContent(orig.content);
    
    // 原帖图片
    let origImagesHtml = '';
    if (orig.images && orig.images.length > 0) {
      const origImageCount = orig.images.length;
      const origGridClass = origImageCount === 1 ? 'single' : origImageCount === 2 ? 'double' : 'quad';
      origImagesHtml = `
        <div class="forum-post-images ${origGridClass}">
          ${orig.images.slice(0, 4).map((img, idx) => `
            <div class="forum-post-image-item" onclick="showForumFullImage('${img.replace(/'/g, "\\'")}')">
              <img src="${img}" alt="">
            </div>
          `).join('')}
        </div>
      `;
    }
    
    originalPostHtml = `
      <div class="forum-quote-card" onclick="openForumPostDetail(${orig.id})" style="margin: 12px 0;">
        <div class="forum-quote-header">
          <div class="forum-quote-avatar">${origAvatarContent}</div>
          <span class="forum-quote-name">${escapeForumHtml(orig.authorName)}</span>
          <span class="forum-quote-handle">@${origHandle}</span>
        </div>
        <div class="forum-quote-content">${origContentHtml}</div>
        ${origImagesHtml}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="forum-detail-post">
      <div class="forum-detail-author">
        <div class="forum-detail-avatar" onclick="openOtherUserProfile('${post.authorType}', '${escapeForumHtml(post.authorName)}', '${post.authorId || ''}')" style="cursor:pointer;">${avatarContent}</div>
        <div class="forum-detail-author-info">
          <div class="forum-detail-name" onclick="openOtherUserProfile('${post.authorType}', '${escapeForumHtml(post.authorName)}', '${post.authorId || ''}')" style="cursor:pointer;">${escapeForumHtml(post.authorName)} ${tagHtml}</div>
          <div class="forum-detail-handle">@${handle}</div>
        </div>
      </div>
      
      <div class="forum-detail-text">${formatForumContent(post.content)}</div>
      ${renderDetailImages(post)}
      ${originalPostHtml}
      
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
        <div class="forum-detail-action" onclick="openQuoteRetweet(${post.id})">
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
        ${post.authorType === 'user' ? `
        <div class="forum-detail-action ${post.isPinned ? 'pinned' : ''}" onclick="togglePinPost(${post.id}); renderForumPostDetail();" title="${post.isPinned ? '取消置顶' : '置顶'}">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="${post.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5">
            <path d="M7 4.5C7 3.12 8.12 2 9.5 2h5C15.88 2 17 3.12 17 4.5v5.26L20.12 16H13v5l-1 2-1-2v-5H3.88L7 9.76V4.5z"/>
          </svg>
        </div>
        ` : ''}
        <div class="forum-detail-action" onclick="retweetToChat(${post.id})">
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
      const char = characters.find((c) => String(c.id) === String(p.charId));
      // 优先使用自定义头像，否则用角色头像
      const avatarContent = p.avatar 
        ? `<img src="${p.avatar}" alt="">`
        : (char?.avatar ? `<img src="${char.avatar}" alt="">` : "🤖");
      // 修复：优先使用nickname，否则用角色本名
      const displayName = p.nickname || char?.name || "未知角色";
      const handleText = p.handle || generateEnglishHandle(displayName);

      return `
      <div class="forum-participant" onclick="editForumParticipant(${index})">
        <div class="forum-participant-avatar">${avatarContent}</div>
        <div class="forum-participant-info">
          <div class="forum-participant-name">${escapeForumHtml(displayName)}</div>
          <div class="forum-participant-handle">@${escapeForumHtml(handleText)}</div>
          <div class="forum-participant-identity">${escapeForumHtml(
            p.identity || "未设置身份"
          )}</div>
        </div>
        <button class="forum-participant-remove" onclick="event.stopPropagation();removeForumParticipant(${index})">×</button>
      </div>
    `;
    })
    .join("");

  // NPC列表
  const npcsHtml = (forumSettings.npcs || [])
    .map((npc, index) => {
      const avatarContent = npc.avatar 
        ? `<img src="${npc.avatar}" alt="">`
        : (npc.name ? npc.name.charAt(0) : "👤");
      
      return `
      <div class="forum-participant" onclick="editForumNpc(${index})">
        <div class="forum-participant-avatar forum-npc-avatar">${avatarContent}</div>
        <div class="forum-participant-info">
          <div class="forum-participant-name">${escapeForumHtml(npc.name)}</div>
          <div class="forum-participant-handle">@${escapeForumHtml(npc.handle || '')}</div>
          <div class="forum-participant-identity">${escapeForumHtml(
            npc.identity || "未设置身份"
          )}</div>
        </div>
        <button class="forum-participant-remove" onclick="event.stopPropagation();removeForumNpc(${index})">×</button>
      </div>
    `;
    })
    .join("");

  // 关系列表
  const relationshipsHtml = (forumSettings.relationships || [])
    .map((rel, index) => {
      const person1Name = getForumPersonName(rel.person1Type, rel.person1Id);
      const person2Name = getForumPersonName(rel.person2Type, rel.person2Id);
      
      return `
      <div class="forum-relationship-item" onclick="editForumRelationship(${index})">
        <div class="forum-relationship-people">
          <span class="forum-relationship-person">${escapeForumHtml(person1Name)}</span>
          <span class="forum-relationship-arrow">↔</span>
          <span class="forum-relationship-person">${escapeForumHtml(person2Name)}</span>
        </div>
        <div class="forum-relationship-type">${escapeForumHtml(rel.relationship || '未设置')}</div>
        <button class="forum-participant-remove" onclick="event.stopPropagation();removeForumRelationship(${index})">×</button>
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
        <div class="forum-item">
          <div class="forum-label">绑定世界书 <span class="forum-section-hint">可选，提供更丰富的世界设定</span></div>
          <div class="forum-worldbook-list" id="forumWorldbookList">
            ${renderForumWorldbookBindings()}
          </div>
          <button class="forum-add-btn forum-add-worldbook-btn" onclick="openForumWorldbookSelector()">
            + 绑定世界书
          </button>
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
      <div class="forum-section-title">AI角色 <span class="forum-section-hint">点击可编辑</span></div>
      ${participantsHtml || '<div class="forum-empty-hint">还没有添加AI角色</div>'}
      <button class="forum-add-btn" onclick="openAddForumParticipant()">
        + 添加AI角色
      </button>
    </div>
    
    <div class="forum-section">
      <div class="forum-section-title">NPC角色 <span class="forum-section-hint">论坛中的路人网友</span></div>
      ${npcsHtml || '<div class="forum-empty-hint">还没有添加NPC</div>'}
      <button class="forum-add-btn" onclick="openAddForumNpc()">
        + 添加NPC
      </button>
    </div>
    
    <div class="forum-section">
      <div class="forum-section-title">人物关系 <span class="forum-section-hint">会在帖子互动中体现</span></div>
      ${relationshipsHtml || '<div class="forum-empty-hint">还没有设置关系</div>'}
      <button class="forum-add-btn" onclick="openAddForumRelationship()">
        + 添加关系
      </button>
    </div>
  `;
}

// 获取人物名称
function getForumPersonName(type, id) {
  if (type === 'ai') {
    const participant = forumSettings.aiParticipants.find(p => String(p.charId) === String(id));
    if (participant) {
      const char = characters.find(c => String(c.id) === String(id));
      return participant.nickname || char?.name || '未知AI';
    }
  } else if (type === 'npc') {
    const npc = (forumSettings.npcs || []).find(n => String(n.id) === String(id));
    return npc?.name || '未知NPC';
  } else if (type === 'user') {
    return forumSettings.userNickname || '用户';
  }
  return '未知';
}

async function saveForumSetting(key, value) {
  forumSettings[key] = value;
  await localforage.setItem("forumSettings", forumSettings);
  console.log("[论坛] 设置已保存:", key);
}

// ==================== 世界书绑定管理 ====================

// 渲染已绑定的世界书列表
function renderForumWorldbookBindings() {
  const worldbookIds = forumSettings.worldbookIds || [];
  if (worldbookIds.length === 0) {
    return '<div class="forum-empty-hint">未绑定任何世界书</div>';
  }
  
  return worldbookIds.map(wbId => {
    const wb = (window.worldbooks || []).find(w => w.id === wbId);
    if (!wb) return '';
    
    const entryCount = wb.entries?.length || 0;
    return `
      <div class="forum-worldbook-item">
        <div class="forum-worldbook-icon">📚</div>
        <div class="forum-worldbook-info">
          <div class="forum-worldbook-name">${escapeForumHtml(wb.name)}</div>
          <div class="forum-worldbook-count">${entryCount} 个条目</div>
        </div>
        <button class="forum-worldbook-remove" onclick="removeForumWorldbook('${wbId}')">×</button>
      </div>
    `;
  }).filter(Boolean).join('');
}

// 打开世界书选择器
function openForumWorldbookSelector() {
  const worldbooks = window.worldbooks || [];
  const boundIds = forumSettings.worldbookIds || [];
  
  // 过滤出未绑定的世界书
  const availableWorldbooks = worldbooks.filter(wb => !boundIds.includes(wb.id) && wb.enabled !== false);
  
  if (availableWorldbooks.length === 0) {
    if (worldbooks.length === 0) {
      showToast('还没有创建世界书，请先在世界书App中创建');
    } else {
      showToast('所有世界书都已绑定');
    }
    return;
  }
  
  const html = availableWorldbooks.map(wb => {
    const entryCount = wb.entries?.length || 0;
    return `
      <div class="forum-char-select-item" onclick="addForumWorldbook('${wb.id}')">
        <div class="forum-char-select-avatar forum-worldbook-select-icon">📚</div>
        <div class="forum-char-select-name">
          ${escapeForumHtml(wb.name)}
          <span style="font-size:12px;color:#536471;margin-left:8px;">${entryCount}条目</span>
        </div>
        <svg class="forum-char-select-arrow" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>
    `;
  }).join('');
  
  const modal = document.createElement('div');
  modal.id = 'forumWorldbookSelectorModal';
  modal.className = 'forum-modal-overlay';
  modal.innerHTML = `
    <div class="forum-modal-content">
      <div class="forum-modal-header">
        <span class="forum-modal-title">选择世界书</span>
        <button class="forum-modal-close" onclick="closeForumWorldbookSelector()">
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
    if (e.target === modal) closeForumWorldbookSelector();
  };
  document.body.appendChild(modal);
}

// 关闭世界书选择器
function closeForumWorldbookSelector() {
  const modal = document.getElementById('forumWorldbookSelectorModal');
  if (modal) modal.remove();
}

// 添加世界书绑定
async function addForumWorldbook(worldbookId) {
  closeForumWorldbookSelector();
  
  if (!forumSettings.worldbookIds) {
    forumSettings.worldbookIds = [];
  }
  
  if (!forumSettings.worldbookIds.includes(worldbookId)) {
    forumSettings.worldbookIds.push(worldbookId);
    await localforage.setItem('forumSettings', forumSettings);
    
    // 刷新显示
    const listEl = document.getElementById('forumWorldbookList');
    if (listEl) {
      listEl.innerHTML = renderForumWorldbookBindings();
    }
    
    showToast('世界书已绑定');
  }
}

// 移除世界书绑定
async function removeForumWorldbook(worldbookId) {
  if (!forumSettings.worldbookIds) return;
  
  forumSettings.worldbookIds = forumSettings.worldbookIds.filter(id => id !== worldbookId);
  await localforage.setItem('forumSettings', forumSettings);
  
  // 刷新显示
  const listEl = document.getElementById('forumWorldbookList');
  if (listEl) {
    listEl.innerHTML = renderForumWorldbookBindings();
  }
  
  showToast('已移除世界书绑定');
}

// 获取论坛绑定的世界书内容
function getForumWorldbookContent(contextText = '') {
  const worldbookIds = forumSettings.worldbookIds || [];
  if (worldbookIds.length === 0) return '';
  
  // 使用全局的getWorldbookContentForAI函数（如果存在）
  if (typeof window.getWorldbookContentForAI === 'function') {
    return window.getWorldbookContentForAI(worldbookIds, contextText);
  }
  
  // 备用实现
  const contentParts = [];
  worldbookIds.forEach(wbId => {
    const wb = (window.worldbooks || []).find(w => w.id === wbId && w.enabled !== false);
    if (!wb || !wb.entries) return;
    
    wb.entries.forEach(entry => {
      if (entry.enabled === false) return;
      
      // 检查关键词匹配
      if (entry.keywords && entry.keywords.trim() && contextText) {
        const keywords = entry.keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
        const contextLower = contextText.toLowerCase();
        const matched = keywords.some(kw => contextLower.includes(kw));
        if (!matched) return;
      }
      
      if (entry.content) {
        contentParts.push(entry.content);
      }
    });
  });
  
  if (contentParts.length === 0) return '';
  return `\n[世界书/背景设定]:\n${contentParts.join('\n\n')}\n`;
}

// 获取角色的完整人设（聊天人设 + 论坛自定义设定）
function getCharacterFullPersona(participant) {
  const charId = participant.charId;
  const char = characters.find(c => String(c.id) === String(charId));
  if (!char) return participant.identity || '';
  
  // 获取聊天设置中的人设
  const settings = chatSettings[charId] || {};
  
  // 合并人设：聊天人设 + 角色描述 + 论坛自定义身份
  const parts = [];
  
  // 1. 角色原始描述/人设
  const originalPersona = settings.persona || char.description || char.persona || '';
  if (originalPersona) {
    parts.push(`【角色基础人设】${originalPersona}`);
  }
  
  // 2. 角色的系统提示词（如果有）
  const systemPrompt = settings.systemPrompt || char.systemPrompt || '';
  if (systemPrompt && systemPrompt !== originalPersona) {
    parts.push(`【角色性格特点】${systemPrompt.substring(0, 200)}`);
  }
  
  // 3. 论坛自定义身份设定
  if (participant.identity) {
    parts.push(`【在论坛中的身份】${participant.identity}`);
  }
  
  // 4. 论坛自定义简介
  if (participant.bio) {
    parts.push(`【个人简介】${participant.bio}`);
  }
  
  return parts.join('\n');
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
  
  showParticipantEditModal(charId, char, null); // null表示新增
}

// 编辑已有的AI参与者
function editForumParticipant(index) {
  const participant = forumSettings.aiParticipants[index];
  if (!participant) return;
  
  const char = characters.find((c) => String(c.id) === String(participant.charId));
  showParticipantEditModal(participant.charId, char, index);
}

// 显示AI参与者编辑弹窗
function showParticipantEditModal(charId, char, editIndex) {
  const isEdit = editIndex !== null;
  const participant = isEdit ? forumSettings.aiParticipants[editIndex] : {};
  const defaultHandle = generateEnglishHandle(participant.nickname || char?.name || '');
  
  // 当前头像：优先自定义头像，否则角色头像
  const currentAvatar = participant.avatar || char?.avatar || '';
  const avatarPreview = currentAvatar 
    ? `<img src="${currentAvatar}" alt="">` 
    : (char?.name ? char.name.charAt(0) : '🤖');
  
  // 背景图
  const currentBanner = participant.banner || '';
  const bannerPreview = currentBanner
    ? `<img src="${currentBanner}" alt="">`
    : '<div class="forum-profile-banner-placeholder"></div>';
  
  const modal = document.createElement("div");
  modal.id = "forumSetIdentityModal";
  modal.className = "forum-modal-overlay";
  modal.innerHTML = `
    <div class="forum-modal-content forum-modal-large">
      <div class="forum-modal-header">
        <span class="forum-modal-title">${isEdit ? '编辑' : '设置'}角色信息</span>
        <button class="forum-modal-close" onclick="document.getElementById('forumSetIdentityModal').remove()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="forum-modal-body" style="padding:16px;max-height:70vh;overflow-y:auto;">
        <!-- 背景图 -->
        <div class="forum-participant-banner-edit" onclick="document.getElementById('forumParticipantBannerInput').click()">
          ${bannerPreview}
          <div class="forum-participant-banner-overlay">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M9.697 3H11v2h-.697l-2 2H5c-.276 0-.5.224-.5.5v11c0 .276.224.5.5.5h14c.276 0 .5-.224.5-.5V10h2v8.5c0 1.381-1.119 2.5-2.5 2.5H5c-1.381 0-2.5-1.119-2.5-2.5v-11C2.5 6.119 3.619 5 5 5h1.697l2-2z"/></svg>
            <span>更换背景</span>
          </div>
        </div>
        <input type="file" id="forumParticipantBannerInput" accept="image/*" style="display:none" onchange="previewForumParticipantBanner(this)">
        <input type="hidden" id="forumParticipantBannerData" value="${currentBanner}">
        
        <div class="forum-identity-char">
          <div class="forum-identity-avatar" id="forumParticipantAvatarPreview" onclick="document.getElementById('forumParticipantAvatarInput').click()">
            ${avatarPreview}
            <div class="forum-avatar-edit-hint">点击更换</div>
          </div>
          <input type="file" id="forumParticipantAvatarInput" accept="image/*" style="display:none" onchange="previewForumParticipantAvatar(this)">
          <input type="hidden" id="forumParticipantAvatarData" value="${currentAvatar}">
          <div class="forum-identity-name">${escapeForumHtml(char?.name || '角色')}</div>
          <div class="forum-identity-hint">原角色名（论坛中可使用不同昵称）</div>
        </div>
        
        <div class="forum-item" style="padding:0;border:none;margin-bottom:16px;">
          <div class="forum-label">论坛昵称</div>
          <input type="text" class="forum-input" id="forumParticipantNickname" 
            value="${escapeForumHtml(participant.nickname || '')}"
            placeholder="留空则使用角色原名：${char?.name || ''}">
        </div>
        
        <div class="forum-item" style="padding:0;border:none;margin-bottom:16px;">
          <div class="forum-label">用户名 (Handle)</div>
          <div class="forum-input-with-prefix">
            <span class="forum-input-prefix">@</span>
            <input type="text" class="forum-input forum-input-handle" id="forumParticipantHandle" 
              value="${escapeForumHtml(participant.handle || '')}"
              placeholder="${defaultHandle}">
          </div>
        </div>
        
        <div class="forum-item" style="padding:0;border:none;margin-bottom:16px;">
          <div class="forum-label">个人简介</div>
          <textarea class="forum-input" id="forumParticipantBio" rows="2"
            placeholder="个性签名或简介">${escapeForumHtml(participant.bio || '')}</textarea>
        </div>
        
        <div class="forum-item" style="padding:0;border:none;margin-bottom:16px;">
          <div class="forum-label">身份设定</div>
          <textarea class="forum-input" id="forumParticipantIdentity" rows="3"
            placeholder="该角色在论坛的身份，如：资深摸鱼达人、某领域专家...">${escapeForumHtml(participant.identity || '')}</textarea>
        </div>
        
        <div class="forum-profile-editor-field-row">
          <div class="forum-profile-editor-field forum-profile-editor-field-half">
            <label>正在关注</label>
            <input type="text" class="forum-input" id="forumParticipantFollowing" 
              value="${participant.following || ''}" placeholder="如: 32, 1.2K">
          </div>
          <div class="forum-profile-editor-field forum-profile-editor-field-half">
            <label>关注者</label>
            <input type="text" class="forum-input" id="forumParticipantFollowers" 
              value="${participant.followers || ''}" placeholder="如: 96, 10K">
          </div>
        </div>
        
        <div class="forum-item" style="padding:0;border:none;margin-bottom:16px;">
          <div class="forum-label">加入时间</div>
          <input type="text" class="forum-input" id="forumParticipantJoinDate" 
            value="${escapeForumHtml(participant.joinDate || '')}"
            placeholder="如: 2024年1月">
        </div>
        
        <button class="forum-identity-submit" onclick="confirmAddParticipant('${charId}', ${editIndex})">
          ${isEdit ? '保存修改' : '添加角色'}
        </button>
      </div>
    </div>
  `;
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  document.body.appendChild(modal);
}

// 预览背景图
function previewForumParticipantBanner(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const container = document.querySelector('.forum-participant-banner-edit');
      if (container) {
        const img = container.querySelector('img') || document.createElement('img');
        img.src = e.target.result;
        if (!container.querySelector('img')) {
          container.insertBefore(img, container.firstChild);
          const placeholder = container.querySelector('.forum-profile-banner-placeholder');
          if (placeholder) placeholder.remove();
        }
      }
      const dataInput = document.getElementById('forumParticipantBannerData');
      if (dataInput) {
        dataInput.value = e.target.result;
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// 预览头像
function previewForumParticipantAvatar(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('forumParticipantAvatarPreview');
      if (preview) {
        preview.innerHTML = `<img src="${e.target.result}" alt=""><div class="forum-avatar-edit-hint">点击更换</div>`;
      }
      const dataInput = document.getElementById('forumParticipantAvatarData');
      if (dataInput) {
        dataInput.value = e.target.result;
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function confirmAddParticipant(charId, editIndex) {
  const nickname = document.getElementById('forumParticipantNickname')?.value || '';
  const handle = document.getElementById('forumParticipantHandle')?.value || '';
  const identity = document.getElementById('forumParticipantIdentity')?.value || '';
  const avatar = document.getElementById('forumParticipantAvatarData')?.value || '';
  const banner = document.getElementById('forumParticipantBannerData')?.value || '';
  const bio = document.getElementById('forumParticipantBio')?.value || '';
  const following = document.getElementById('forumParticipantFollowing')?.value || '';
  const followers = document.getElementById('forumParticipantFollowers')?.value || '';
  const joinDate = document.getElementById('forumParticipantJoinDate')?.value || '';
  
  document.getElementById('forumSetIdentityModal')?.remove();
  
  const participantData = {
    charId,
    nickname: nickname,
    handle: handle,
    identity: identity,
    avatar: avatar,
    banner: banner,
    bio: bio,
    following: following,
    followers: followers,
    joinDate: joinDate,
  };
  
  if (editIndex !== null && editIndex >= 0) {
    // 编辑模式
    forumSettings.aiParticipants[editIndex] = participantData;
    showToast('已保存修改');
  } else {
    // 新增模式
    forumSettings.aiParticipants.push(participantData);
    showToast('角色已添加');
  }

  await localforage.setItem("forumSettings", forumSettings);
  renderForumSettings();
}

async function removeForumParticipant(index) {
  forumSettings.aiParticipants.splice(index, 1);
  await localforage.setItem("forumSettings", forumSettings);
  renderForumSettings();
}

// ==================== NPC管理 ====================

function openAddForumNpc() {
  showNpcEditModal(null);
}

function editForumNpc(index) {
  showNpcEditModal(index);
}

function showNpcEditModal(editIndex) {
  const isEdit = editIndex !== null;
  const npc = isEdit ? (forumSettings.npcs || [])[editIndex] : {};
  
  const avatarPreview = npc.avatar 
    ? `<img src="${npc.avatar}" alt="">` 
    : (npc.name ? npc.name.charAt(0) : '👤');
  
  const modal = document.createElement("div");
  modal.id = "forumNpcModal";
  modal.className = "forum-modal-overlay";
  modal.innerHTML = `
    <div class="forum-modal-content forum-modal-large">
      <div class="forum-modal-header">
        <span class="forum-modal-title">${isEdit ? '编辑' : '添加'}NPC</span>
        <button class="forum-modal-close" onclick="document.getElementById('forumNpcModal').remove()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="forum-modal-body" style="padding:16px;max-height:70vh;overflow-y:auto;">
        <!-- 背景图 -->
        <div class="forum-participant-banner-edit" onclick="document.getElementById('forumNpcBannerInput').click()">
          ${npc.banner ? `<img src="${npc.banner}" alt="">` : '<div class="forum-profile-banner-placeholder"></div>'}
          <div class="forum-participant-banner-overlay">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M9.697 3H11v2h-.697l-2 2H5c-.276 0-.5.224-.5.5v11c0 .276.224.5.5.5h14c.276 0 .5-.224.5-.5V10h2v8.5c0 1.381-1.119 2.5-2.5 2.5H5c-1.381 0-2.5-1.119-2.5-2.5v-11C2.5 6.119 3.619 5 5 5h1.697l2-2z"/></svg>
            <span>更换背景</span>
          </div>
        </div>
        <input type="file" id="forumNpcBannerInput" accept="image/*" style="display:none" onchange="previewForumNpcBanner(this)">
        <input type="hidden" id="forumNpcBannerData" value="${npc.banner || ''}">
        
        <div class="forum-identity-char">
          <div class="forum-identity-avatar forum-npc-avatar" id="forumNpcAvatarPreview" onclick="document.getElementById('forumNpcAvatarInput').click()">
            ${avatarPreview}
            <div class="forum-avatar-edit-hint">点击上传</div>
          </div>
          <input type="file" id="forumNpcAvatarInput" accept="image/*" style="display:none" onchange="previewForumNpcAvatar(this)">
          <input type="hidden" id="forumNpcAvatarData" value="${npc.avatar || ''}">
        </div>
        
        <div class="forum-item" style="padding:0;border:none;margin-bottom:16px;">
          <div class="forum-label">NPC昵称 <span class="forum-required">*</span></div>
          <input type="text" class="forum-input" id="forumNpcName" 
            value="${escapeForumHtml(npc.name || '')}"
            placeholder="如：路人甲、热心市民、吃瓜群众...">
        </div>
        
        <div class="forum-item" style="padding:0;border:none;margin-bottom:16px;">
          <div class="forum-label">用户名 (Handle)</div>
          <div class="forum-input-with-prefix">
            <span class="forum-input-prefix">@</span>
            <input type="text" class="forum-input forum-input-handle" id="forumNpcHandle" 
              value="${escapeForumHtml(npc.handle || '')}"
              placeholder="英文用户名，如 CuriousCat_99">
          </div>
        </div>
        
        <div class="forum-item" style="padding:0;border:none;margin-bottom:16px;">
          <div class="forum-label">个人简介</div>
          <textarea class="forum-input" id="forumNpcBio" rows="2"
            placeholder="个性签名或简介">${escapeForumHtml(npc.bio || '')}</textarea>
        </div>
        
        <div class="forum-item" style="padding:0;border:none;margin-bottom:16px;">
          <div class="forum-label">身份设定</div>
          <textarea class="forum-input" id="forumNpcIdentity" rows="2"
            placeholder="这个NPC的背景身份">${escapeForumHtml(npc.identity || '')}</textarea>
        </div>
        
        <div class="forum-item" style="padding:0;border:none;margin-bottom:16px;">
          <div class="forum-label">性格特点</div>
          <textarea class="forum-input" id="forumNpcPersona" rows="2"
            placeholder="这个NPC的性格和说话风格">${escapeForumHtml(npc.persona || '')}</textarea>
        </div>
        
        <div class="forum-profile-editor-field-row">
          <div class="forum-profile-editor-field forum-profile-editor-field-half">
            <label>正在关注</label>
            <input type="text" class="forum-input" id="forumNpcFollowing" 
              value="${npc.following || ''}" placeholder="如: 32, 1.2K">
          </div>
          <div class="forum-profile-editor-field forum-profile-editor-field-half">
            <label>关注者</label>
            <input type="text" class="forum-input" id="forumNpcFollowers" 
              value="${npc.followers || ''}" placeholder="如: 96, 10K">
          </div>
        </div>
        
        <div class="forum-item" style="padding:0;border:none;margin-bottom:16px;">
          <div class="forum-label">加入时间</div>
          <input type="text" class="forum-input" id="forumNpcJoinDate" 
            value="${escapeForumHtml(npc.joinDate || '')}"
            placeholder="如: 2024年1月">
        </div>
        
        <button class="forum-identity-submit" onclick="confirmSaveNpc(${editIndex})">
          ${isEdit ? '保存修改' : '添加NPC'}
        </button>
      </div>
    </div>
  `;
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  document.body.appendChild(modal);
}

function previewForumNpcAvatar(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('forumNpcAvatarPreview');
      if (preview) {
        preview.innerHTML = `<img src="${e.target.result}" alt=""><div class="forum-avatar-edit-hint">点击更换</div>`;
      }
      const dataInput = document.getElementById('forumNpcAvatarData');
      if (dataInput) {
        dataInput.value = e.target.result;
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function previewForumNpcBanner(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const container = document.querySelector('#forumNpcModal .forum-participant-banner-edit');
      if (container) {
        const img = container.querySelector('img') || document.createElement('img');
        img.src = e.target.result;
        if (!container.querySelector('img')) {
          container.insertBefore(img, container.firstChild);
          const placeholder = container.querySelector('.forum-profile-banner-placeholder');
          if (placeholder) placeholder.remove();
        }
      }
      const dataInput = document.getElementById('forumNpcBannerData');
      if (dataInput) {
        dataInput.value = e.target.result;
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function confirmSaveNpc(editIndex) {
  const name = document.getElementById('forumNpcName')?.value?.trim() || '';
  const handle = document.getElementById('forumNpcHandle')?.value?.trim() || '';
  const identity = document.getElementById('forumNpcIdentity')?.value || '';
  const persona = document.getElementById('forumNpcPersona')?.value || '';
  const avatar = document.getElementById('forumNpcAvatarData')?.value || '';
  const banner = document.getElementById('forumNpcBannerData')?.value || '';
  const bio = document.getElementById('forumNpcBio')?.value || '';
  const following = document.getElementById('forumNpcFollowing')?.value || '';
  const followers = document.getElementById('forumNpcFollowers')?.value || '';
  const joinDate = document.getElementById('forumNpcJoinDate')?.value || '';
  
  if (!name) {
    showToast('请输入NPC昵称');
    return;
  }
  
  document.getElementById('forumNpcModal')?.remove();
  
  if (!forumSettings.npcs) forumSettings.npcs = [];
  
  const npcData = {
    id: editIndex !== null ? forumSettings.npcs[editIndex].id : Date.now(),
    name,
    handle: handle || generateEnglishHandle(name),
    identity,
    persona,
    avatar,
    banner,
    bio,
    following,
    followers,
    joinDate,
  };
  
  if (editIndex !== null && editIndex >= 0) {
    forumSettings.npcs[editIndex] = npcData;
    showToast('已保存修改');
  } else {
    forumSettings.npcs.push(npcData);
    showToast('NPC已添加');
  }

  await localforage.setItem("forumSettings", forumSettings);
  renderForumSettings();
}

async function removeForumNpc(index) {
  if (!forumSettings.npcs) return;
  forumSettings.npcs.splice(index, 1);
  await localforage.setItem("forumSettings", forumSettings);
  renderForumSettings();
}

// ==================== 关系管理 ====================

function openAddForumRelationship() {
  showRelationshipEditModal(null);
}

function editForumRelationship(index) {
  showRelationshipEditModal(index);
}

function showRelationshipEditModal(editIndex) {
  const isEdit = editIndex !== null;
  const rel = isEdit ? (forumSettings.relationships || [])[editIndex] : {};
  
  // 构建人物选项
  const personOptions = getForumPersonOptions();
  
  const person1Value = isEdit ? `${rel.person1Type}:${rel.person1Id}` : '';
  const person2Value = isEdit ? `${rel.person2Type}:${rel.person2Id}` : '';
  
  const modal = document.createElement("div");
  modal.id = "forumRelationshipModal";
  modal.className = "forum-modal-overlay";
  modal.innerHTML = `
    <div class="forum-modal-content">
      <div class="forum-modal-header">
        <span class="forum-modal-title">${isEdit ? '编辑' : '添加'}关系</span>
        <button class="forum-modal-close" onclick="document.getElementById('forumRelationshipModal').remove()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="forum-modal-body" style="padding:16px;">
        <div class="forum-relationship-form">
          <div class="forum-item" style="padding:0;border:none;margin-bottom:16px;">
            <div class="forum-label">人物1</div>
            <select class="forum-input forum-select" id="forumRelPerson1">
              <option value="">请选择...</option>
              ${personOptions}
            </select>
          </div>
          
          <div class="forum-relationship-connector">
            <div class="forum-relationship-line"></div>
            <div class="forum-relationship-icon">↔</div>
            <div class="forum-relationship-line"></div>
          </div>
          
          <div class="forum-item" style="padding:0;border:none;margin-bottom:16px;">
            <div class="forum-label">人物2</div>
            <select class="forum-input forum-select" id="forumRelPerson2">
              <option value="">请选择...</option>
              ${personOptions}
            </select>
          </div>
        </div>
        
        <div class="forum-item" style="padding:0;border:none;margin-bottom:16px;">
          <div class="forum-label">关系类型</div>
          <input type="text" class="forum-input" id="forumRelType" 
            value="${escapeForumHtml(rel.relationship || '')}"
            placeholder="如：好友、情侣、死对头、师徒、暗恋...">
        </div>
        
        <div class="forum-item" style="padding:0;border:none;margin-bottom:16px;">
          <div class="forum-label">关系描述</div>
          <textarea class="forum-input" id="forumRelDesc" rows="3"
            placeholder="详细描述这段关系，会影响他们在论坛中的互动方式...">${escapeForumHtml(rel.description || '')}</textarea>
        </div>
        
        <button class="forum-identity-submit" onclick="confirmSaveRelationship(${editIndex})">
          ${isEdit ? '保存修改' : '添加关系'}
        </button>
      </div>
    </div>
  `;
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  document.body.appendChild(modal);
  
  // 设置默认值
  if (isEdit) {
    setTimeout(() => {
      const select1 = document.getElementById('forumRelPerson1');
      const select2 = document.getElementById('forumRelPerson2');
      if (select1) select1.value = person1Value;
      if (select2) select2.value = person2Value;
    }, 0);
  }
}

function getForumPersonOptions() {
  let options = '';
  
  // 用户
  const userName = forumSettings.userNickname || '用户(我)';
  options += `<option value="user:user">👤 ${escapeForumHtml(userName)}</option>`;
  
  // AI角色
  if (forumSettings.aiParticipants.length > 0) {
    options += '<optgroup label="AI角色">';
    forumSettings.aiParticipants.forEach(p => {
      const char = characters.find(c => String(c.id) === String(p.charId));
      const name = p.nickname || char?.name || '未知';
      options += `<option value="ai:${p.charId}">🤖 ${escapeForumHtml(name)}</option>`;
    });
    options += '</optgroup>';
  }
  
  // NPC
  if (forumSettings.npcs && forumSettings.npcs.length > 0) {
    options += '<optgroup label="NPC">';
    forumSettings.npcs.forEach(npc => {
      options += `<option value="npc:${npc.id}">👥 ${escapeForumHtml(npc.name)}</option>`;
    });
    options += '</optgroup>';
  }
  
  return options;
}

async function confirmSaveRelationship(editIndex) {
  const person1 = document.getElementById('forumRelPerson1')?.value || '';
  const person2 = document.getElementById('forumRelPerson2')?.value || '';
  const relType = document.getElementById('forumRelType')?.value?.trim() || '';
  const relDesc = document.getElementById('forumRelDesc')?.value || '';
  
  if (!person1 || !person2) {
    showToast('请选择两个人物');
    return;
  }
  
  if (person1 === person2) {
    showToast('不能选择同一个人物');
    return;
  }
  
  if (!relType) {
    showToast('请输入关系类型');
    return;
  }
  
  document.getElementById('forumRelationshipModal')?.remove();
  
  const [type1, id1] = person1.split(':');
  const [type2, id2] = person2.split(':');
  
  if (!forumSettings.relationships) forumSettings.relationships = [];
  
  const relData = {
    id: editIndex !== null ? forumSettings.relationships[editIndex].id : Date.now(),
    person1Type: type1,
    person1Id: id1,
    person2Type: type2,
    person2Id: id2,
    relationship: relType,
    description: relDesc,
  };
  
  if (editIndex !== null && editIndex >= 0) {
    forumSettings.relationships[editIndex] = relData;
    showToast('已保存修改');
  } else {
    forumSettings.relationships.push(relData);
    showToast('关系已添加');
  }

  await localforage.setItem("forumSettings", forumSettings);
  renderForumSettings();
}

async function removeForumRelationship(index) {
  if (!forumSettings.relationships) return;
  forumSettings.relationships.splice(index, 1);
  await localforage.setItem("forumSettings", forumSettings);
  renderForumSettings();
}

// ==================== 发帖 ====================

// 发帖时的图片数据
let forumComposeImages = [];

function openForumCompose() {
  forumComposeImages = []; // 重置图片
  const overlay = document.getElementById("forumComposeOverlay");
  if (overlay) {
    overlay.classList.add("active");
    // 兼容旧版HTML（有forumComposeAuthor元素）和新版HTML（有forumComposeUserInfo元素）
    if (document.getElementById("forumComposeAuthor")) {
      renderForumComposeAuthor();
    } else if (document.getElementById("forumComposeUserInfo")) {
      renderForumComposeUserInfo();
    }
    renderComposeImages();
    const textarea = document.getElementById("forumComposeTextarea");
    if (textarea) {
      textarea.value = "";
      textarea.focus();
    }
  }
}

function closeForumCompose() {
  const overlay = document.getElementById("forumComposeOverlay");
  if (overlay) {
    overlay.classList.remove("active");
  }
  forumComposeImages = [];
}

// 旧版：渲染发帖作者选择器（兼容旧HTML）
function renderForumComposeAuthor() {
  const container = document.getElementById("forumComposeAuthor");
  if (!container) return;

  const globalAvatar = localStorage.getItem("avatarImg");
  const avatarHtml = globalAvatar ? `<img src="${globalAvatar}" alt="">` : getDefaultAvatar();
  const userName = forumSettings.userNickname || "我";

  container.innerHTML = `
    <div class="forum-compose-avatar">${avatarHtml}</div>
    <div class="forum-compose-name">${escapeForumHtml(userName)}</div>
  `;
  // 移除点击事件（不再支持选择发帖人）
  container.onclick = null;
  container.style.cursor = 'default';
}

// 新版：渲染用户信息（不可点击）
function renderForumComposeUserInfo() {
  const container = document.getElementById("forumComposeUserInfo");
  if (!container) return;

  const globalAvatar = localStorage.getItem("avatarImg");
  const avatarHtml = globalAvatar ? `<img src="${globalAvatar}" alt="">` : getDefaultAvatar();
  const userName = forumSettings.userNickname || "我";
  const userHandle = forumSettings.userHandle || generateEnglishHandle(userName);

  container.innerHTML = `
    <div class="forum-compose-avatar">${avatarHtml}</div>
    <div class="forum-compose-user-text">
      <div class="forum-compose-name">${escapeForumHtml(userName)}</div>
      <div class="forum-compose-handle">@${escapeForumHtml(userHandle)}</div>
    </div>
  `;
}

// 处理图片上传
function handleComposeImageUpload(input) {
  if (!input || !input.files || input.files.length === 0) return;
  
  Array.from(input.files).forEach(file => {
    if (forumComposeImages.length >= 4) {
      showToast('最多只能添加4张图片');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      forumComposeImages.push({
        type: 'real',
        data: e.target.result
      });
      renderComposeImages();
    };
    reader.readAsDataURL(file);
  });
  
  input.value = ''; // 重置input
}

// 插入图片描述占位符
function insertImagePlaceholder() {
  const textarea = document.getElementById("forumComposeTextarea");
  if (!textarea) return;
  
  const placeholder = "[图片:在这里描述图片内容]";
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  
  textarea.value = text.substring(0, start) + placeholder + text.substring(end);
  textarea.focus();
  // 选中描述部分方便用户修改
  textarea.setSelectionRange(start + 4, start + placeholder.length - 1);
}

// 渲染已添加的图片
function renderComposeImages() {
  const container = document.getElementById("forumComposeImages");
  if (!container) return;
  
  if (forumComposeImages.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = forumComposeImages.map((img, idx) => `
    <div class="forum-compose-image-item">
      <img src="${img.data}" alt="">
      <button class="forum-compose-image-remove" onclick="removeComposeImage(${idx})">×</button>
    </div>
  `).join('');
}

// 移除图片
function removeComposeImage(index) {
  forumComposeImages.splice(index, 1);
  renderComposeImages();
}

function showForumAuthorPicker() {
  const globalAvatar = localStorage.getItem("avatarImg");
  const options = [{ 
    type: "user", 
    name: forumSettings.userNickname || "我",
    avatar: globalAvatar || null
  }];

  forumSettings.aiParticipants.forEach((p) => {
    const char = characters.find((c) => String(c.id) === String(p.charId));
    options.push({
      type: "ai",
      charId: p.charId,
      name: p.nickname || char?.name || "角色",
      avatar: p.avatar || char?.avatar || null
    });
  });

  const html = options
    .map(
      (opt, i) => {
        const avatarHtml = opt.avatar 
          ? `<img src="${opt.avatar}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">` 
          : (opt.type === 'user' ? '👤' : '🤖');
        const isSelected = forumComposeAuthor.type === opt.type && 
          (opt.type === 'user' || String(forumComposeAuthor.charId) === String(opt.charId));
        return `
    <div class="forum-author-option" onclick="selectForumComposeAuthor(${i})">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;overflow:hidden;">${avatarHtml}</div>
        <span>${escapeForumHtml(opt.name)}</span>
      </div>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f48fb1" stroke-width="2" style="opacity:${isSelected ? '1' : '0'}">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  `;
      }
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
  // 旧函数已移除，这里不再需要调用
}

async function submitForumPost() {
  const textarea = document.getElementById("forumComposeTextarea");
  const content = textarea?.value?.trim();

  if (!content && forumComposeImages.length === 0) {
    showToast("请输入内容或添加图片");
    return;
  }

  // 用户发帖
  const authorType = "user";
  const authorName = forumSettings.userNickname || "我";
  const authorAvatar = localStorage.getItem("avatarImg") || "";
  const authorIdentity = forumSettings.userIdentity || "";
  const userHandle = forumSettings.userHandle || generateEnglishHandle(authorName);

  // 构建帖子内容（包含图片）
  let fullContent = content || "";
  
  // 添加真实图片数据
  const images = forumComposeImages.map(img => img.data);

  const newPost = {
    id: Date.now(),
    authorType,
    authorId: null,
    authorName,
    authorAvatar,
    authorIdentity,
    handle: userHandle,
    content: fullContent,
    images: images, // 真实图片数组
    timestamp: Date.now(),
    likes: 0,
    liked: false,
    retweets: 0,
    views: 0,
    comments: [],
  };

  forumPosts.unshift(newPost);
  await localforage.setItem("forumPosts", forumPosts);

  closeForumCompose();
  renderForumFeed();
  showToast("发布成功");
  
  // 更新粉丝数量
  await updateUserFollowers('post');
  
  // 自动生成评论和互动数据
  generateInteractionsForNewPost(newPost.id);
}

// 为新帖子生成互动数据（评论、点赞、转发、浏览量）
async function generateInteractionsForNewPost(postId) {
  const post = forumPosts.find((p) => p.id === postId);
  if (!post) return;

  const apiConfig = getActiveApiConfig();
  if (!apiConfig || !apiConfig.url || !apiConfig.key) {
    // 没有API配置，使用默认随机数据
    post.views = Math.floor(Math.random() * 500) + 50;
    post.likes = Math.floor(Math.random() * 30) + 5;
    post.retweets = Math.floor(Math.random() * 10);
    await localforage.setItem("forumPosts", forumPosts);
    renderForumFeed();
    return;
  }

  try {
    // 收集AI参与者
    const participants = forumSettings.aiParticipants.map((p) => {
      const char = characters.find((c) => String(c.id) === String(p.charId));
      const settings = chatSettings[p.charId] || {};
      return {
        name: p.nickname || settings.charName || char?.name || "角色",
        handle: p.handle || generateEnglishHandle(p.nickname || char?.name || ''),
        identity: p.identity || "",
        persona: settings.persona || char?.persona || "",
      };
    });

    // 收集NPC信息
    const npcs = (forumSettings.npcs || []).map(npc => ({
      name: npc.name,
      handle: npc.handle || generateEnglishHandle(npc.name),
      identity: npc.identity || "",
      persona: npc.persona || "",
    }));

    // 收集关系信息
    const relationships = (forumSettings.relationships || []).map(rel => {
      const person1 = getForumPersonName(rel.person1Type, rel.person1Id);
      const person2 = getForumPersonName(rel.person2Type, rel.person2Id);
      return `${person1} 和 ${person2} 的关系：${rel.relationship}${rel.description ? '（' + rel.description + '）' : ''}`;
    });

    // 构建图片描述（如果有真实图片）
    let imageDesc = "";
    if (post.images && post.images.length > 0) {
      imageDesc = `\n【帖子包含${post.images.length}张图片】`;
    }
    
    // 处理转发帖子
    let retweetInfo = "";
    if (post.isRetweet && post.originalPost) {
      const orig = post.originalPost;
      retweetInfo = `\n【这是一条转发帖】
原帖作者：${orig.authorName}
原帖内容：${orig.content || '无文字内容'}
${orig.images && orig.images.length > 0 ? `原帖包含${orig.images.length}张图片` : ''}
用户转发时说：${post.content || '（未添加评论）'}`;
    }

    let systemPrompt = `你是一个论坛互动生成器。请根据以下设定为帖子生成评论和互动数据。

【世界观】
${forumSettings.worldview}

【用户信息】
- 昵称：${post.authorName}
- 身份：${forumSettings.userIdentity || "普通用户"}

【帖子内容】${post.content}${imageDesc}${retweetInfo}

【AI角色】可以使用这些角色评论
${participants.length > 0 
  ? participants.map((p, i) => 
      `${i + 1}. ${p.name}（@${p.handle}）：${p.identity || '未设置身份'}${p.persona ? '，性格：' + p.persona.substring(0, 50) : ''}`
    ).join("\n")
  : "无"}`;

    if (npcs.length > 0) {
      systemPrompt += `

【固定NPC】可以使用这些NPC评论
${npcs.map((n, i) => 
  `${i + 1}. ${n.name}（@${n.handle}）：${n.identity || '普通网友'}`
).join("\n")}`;
    }

    if (relationships.length > 0) {
      systemPrompt += `

【人物关系】评论时体现这些关系
${relationships.join("\n")}`;
    }

    // 构建消息数组，支持识图
    const messages = [{ role: "system", content: systemPrompt }];
    
    // 构建用户消息内容
    let userContent = [];
    
    // 如果有图片且模型支持识图，添加图片
    if (post.images && post.images.length > 0) {
      post.images.forEach(imgData => {
        userContent.push({
          type: "image_url",
          image_url: { url: imgData }
        });
      });
    }
    
    userContent.push({
      type: "text",
      text: `请为这条帖子生成互动数据，返回纯JSON对象：
{
  "views": 浏览量(根据用户身份和帖子内容，范围100-5000),
  "likes": 点赞数(范围10-200),
  "retweets": 转发数(范围0-50),
  "comments": [
    {"authorType":"ai或npc","authorName":"昵称","handle":"英文用户名","content":"评论内容","likes":点赞数0-20},
    {"authorType":"npc","authorName":"昵称","handle":"英文用户名","content":"回复评论","likes":0,"replyTo":1,"replyToName":"被回复者昵称"}
  ]
}

要求：
1. 根据用户的身份地位合理生成互动数据（身份越高，互动越多）
2. 如果帖子有图片，评论者应该能看到并评论图片内容
3. 生成5-10条评论
4. authorType只能是"ai"或"npc"
5. 评论要自然、符合世界观和角色性格
6. AI角色和NPC的昵称要与设定一致
7. 禁止使用[爱心][笑哭][开心]等方括号表情格式，必须直接使用emoji如❤️😂😊等
8. 如果是转发帖，评论应该针对原帖内容或用户的转发评论`
    });

    messages.push({ role: "user", content: userContent });

    const response = await fetch(`${apiConfig.url}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiConfig.key}`,
      },
      body: JSON.stringify({
        model: apiConfig.model || "gpt-3.5-turbo",
        messages: messages,
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
    
    // 尝试匹配JSON对象
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      
      // 更新互动数据
      post.views = result.views || Math.floor(Math.random() * 500) + 50;
      post.likes = result.likes || Math.floor(Math.random() * 30) + 5;
      post.retweets = result.retweets || Math.floor(Math.random() * 10);
      
      // 处理评论
      if (result.comments && Array.isArray(result.comments)) {
        result.comments.forEach((c, idx) => {
          if (c.authorType === "user") return;
          
          let commentAvatar = "";
          const commentName = c.authorName || "网友";
          
          for (const participant of forumSettings.aiParticipants) {
            const char = characters.find(ch => String(ch.id) === String(participant.charId));
            const participantName = participant.nickname || char?.name || '';
            if (participantName && commentName.includes(participantName)) {
              commentAvatar = participant.avatar || char?.avatar || '';
              break;
            }
          }
          
          if (!commentAvatar && forumSettings.npcs) {
            for (const npc of forumSettings.npcs) {
              if (npc.name && commentName.includes(npc.name)) {
                commentAvatar = npc.avatar || '';
                break;
              }
            }
          }
          
          post.comments.push({
            id: idx + 1,
            authorType: c.authorType || "npc",
            authorName: commentName,
            authorAvatar: commentAvatar,
            handle: c.handle || generateEnglishHandle(commentName),
            content: c.content || "",
            replyTo: c.replyTo || null,
            replyToName: c.replyToName || null,
            timestamp: Date.now() + idx * 1000,
            likes: c.likes || Math.floor(Math.random() * 10),
            liked: false,
          });
        });
      }

      await localforage.setItem("forumPosts", forumPosts);
      renderForumFeed();
    }
  } catch (e) {
    console.error("[论坛] 生成互动失败:", e);
    // 失败时使用默认数据
    post.views = Math.floor(Math.random() * 500) + 50;
    post.likes = Math.floor(Math.random() * 30) + 5;
    post.retweets = Math.floor(Math.random() * 10);
    await localforage.setItem("forumPosts", forumPosts);
    renderForumFeed();
  }
}

// 保留旧函数名兼容
async function generateCommentsForNewPost(postId) {
  return generateInteractionsForNewPost(postId);
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
  
  // 更新粉丝数量
  await updateUserFollowers('comment');

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
    // 获取世界书内容
    const worldbookContent = getForumWorldbookContent(forumSettings.worldview);
    
    // 构建AI参与者信息（使用完整人设）
    const participants = forumSettings.aiParticipants.map((p) => {
      const char = characters.find((c) => String(c.id) === String(p.charId));
      const settings = chatSettings[p.charId] || {};
      return {
        name: p.nickname || settings.charName || char?.name || "角色",
        handle: p.handle || generateEnglishHandle(p.nickname || char?.name || ''),
        identity: p.identity || "",
        // 使用完整人设：原始人设 + 论坛自定义设定
        fullPersona: getCharacterFullPersona(p),
      };
    });

    // 构建NPC信息
    const npcs = (forumSettings.npcs || []).map(npc => ({
      name: npc.name,
      handle: npc.handle || generateEnglishHandle(npc.name),
      identity: npc.identity || "",
      persona: npc.persona || "",
    }));

    // 构建关系信息
    const relationships = (forumSettings.relationships || []).map(rel => {
      const person1 = getForumPersonName(rel.person1Type, rel.person1Id);
      const person2 = getForumPersonName(rel.person2Type, rel.person2Id);
      return `${person1} 和 ${person2} 的关系：${rel.relationship}${rel.description ? '（' + rel.description + '）' : ''}`;
    });

    // 构建system prompt
    let systemPrompt = `你是一个论坛内容生成器。请根据以下设定生成论坛帖子。

【世界观】
${forumSettings.worldview}
${worldbookContent ? '\n【世界书/详细设定】\n' + worldbookContent : ''}

【论坛名称】
${forumSettings.forumName}

【用户信息（仅供参考，不要生成用户的帖子或评论）】
- 昵称：${forumSettings.userNickname || "用户"}
- 身份：${forumSettings.userIdentity || "普通成员"}

【AI角色】必须使用这些角色发帖和评论！角色说话要符合他们的人设！
${
  participants.length > 0 
    ? participants.map((p, i) => 
        `${i + 1}. ${p.name}（@${p.handle}）\n${p.fullPersona || p.identity || '未设置人设'}`
      ).join("\n\n")
    : "无"
}`;

    // 添加NPC信息
    if (npcs.length > 0) {
      systemPrompt += `

【固定NPC】必须使用这些NPC发帖和评论！
${npcs.map((n, i) => 
  `${i + 1}. ${n.name}（@${n.handle}）：${n.identity || '普通网友'}${n.persona ? '，性格：' + n.persona : ''}`
).join("\n")}`;
    }

    // 添加关系信息
    if (relationships.length > 0) {
      systemPrompt += `

【人物关系】非常重要！必须在帖子互动中体现这些关系！
${relationships.join("\n")}

注意：有关系的人物之间应该有符合关系设定的互动，比如：
- 情侣/暗恋：会互相关注对方的帖子，评论时有暧昧/关心的语气
- 好友：会互相调侃、支持
- 死对头：会互相怼、抬杠
- 师徒：会有尊敬/教导的互动`;
    }

    systemPrompt += `

【要求】
1. 生成10-15条论坛帖子
2. 帖子作者只能是AI角色、固定NPC或随机路人，绝对不要生成用户的帖子
3. ${npcs.length > 0 ? '优先使用固定NPC，也可以生成一些随机路人' : '随机路人要有符合世界观的昵称'}
4. 内容要符合世界观设定，有趣且有互动感
5. 每条帖子必须有10-15条评论，评论者也只能是AI/NPC/路人，不能是用户
6. ${relationships.length > 0 ? '【重要】有关系的人物之间必须有符合关系设定的互动！' : '评论之间可以互相回复'}
7. 部分帖子可以包含图片，用[图片:图片描述]格式
8. 返回JSON数组格式
9. 禁止使用[爱心][笑哭][开心]等方括号表情格式，必须直接使用emoji如❤️😂😊🎉👍等
10. 可以有1-2条转发帖（isRetweet为true），转发内容originalPost要完整`;

    // 获取一些现有帖子供转发参考
    const existingPostsForRetweet = forumPosts
      .filter(p => !p.isRetweet && !p.isSearchResult && !p.isProfileGenerated && p.content)
      .slice(0, 5)
      .map(p => ({ id: p.id, authorName: p.authorName, content: p.content?.substring(0, 100) }));

    const userPrompt = `请生成论坛帖子，返回纯JSON数组（不要markdown代码块）：
[
  {
    "authorType": "ai或npc",
    "authorName": "中文昵称",
    "handle": "英文用户名(不含@符号)",
    "content": "帖子内容，如果要发图片用[图片:图片描述]格式",
    "likes": 点赞数,
    "retweets": 转发数(0-50),
    "views": 浏览量(100-5000的随机数),
    "comments": [
      {"id":1,"authorType":"npc","authorName":"昵称","handle":"英文用户名","content":"评论","likes":0},
      {"id":2,"authorType":"ai","authorName":"昵称","handle":"英文用户名","content":"回复评论","likes":0,"replyTo":1,"replyToName":"被回复者昵称"}
    ]
  },
  {
    "authorType": "ai或npc",
    "authorName": "转发者昵称",
    "handle": "转发者handle",
    "content": "转发时的评论（可为空）",
    "isRetweet": true,
    "originalPost": {
      "authorName": "原作者",
      "handle": "原作者handle",
      "content": "原帖内容"
    },
    "likes": 点赞数,
    "comments": []
  }
]
注意：
1. authorType只能是"ai"或"npc"，不要生成"user"
2. AI角色的昵称和handle必须与上面设定的一致！
3. ${npcs.length > 0 ? '固定NPC的昵称和handle也必须与设定一致！' : ''}
4. ${relationships.length > 0 ? '【最重要】有关系的人物必须互动！比如A发帖B评论，或者A评论B的评论等' : ''}
5. 每个普通帖子必须有10-15条评论！
6. 如果是回复某条评论，用replyTo指定被回复评论的id
7. 禁止使用[爱心]等方括号表情，必须用emoji❤️😂😊
8. 可以生成1-2条转发帖${existingPostsForRetweet.length > 0 ? '，可以转发这些现有帖子：' + JSON.stringify(existingPostsForRetweet) : ''}`;

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
      const newPosts = posts.map((p, idx) => {
        // 尝试匹配AI参与者或NPC的头像
        let authorAvatar = "";
        const authorName = p.authorName || "匿名";
        
        // 检查是否是AI参与者
        for (const participant of forumSettings.aiParticipants) {
          const char = characters.find(c => String(c.id) === String(participant.charId));
          const participantName = participant.nickname || char?.name || '';
          if (participantName && authorName.includes(participantName)) {
            authorAvatar = participant.avatar || char?.avatar || '';
            break;
          }
        }
        
        // 如果没有匹配到AI，检查NPC
        if (!authorAvatar && forumSettings.npcs) {
          for (const npc of forumSettings.npcs) {
            if (npc.name && authorName.includes(npc.name)) {
              authorAvatar = npc.avatar || '';
              break;
            }
          }
        }
        
        return {
          id: Math.floor(Date.now() + idx * 1000 + Math.random() * 100),
          authorType: p.authorType === "user" ? "npc" : p.authorType || "npc", // 强制不允许user
          authorId: null,
          authorName: authorName,
          authorAvatar: authorAvatar,
          handle: p.handle || generateEnglishHandle(p.authorName),
          content: p.content || "",
          timestamp: Date.now() - Math.random() * 7200000,
          likes: p.likes || Math.floor(Math.random() * 50),
          liked: false,
          retweets: p.retweets || Math.floor(Math.random() * 30),
          views: p.views || Math.floor(Math.random() * 4900) + 100,
          isRetweet: p.isRetweet || false,
          originalPost: p.originalPost ? {
            id: p.originalPost.id || Date.now() + Math.random() * 10000,
            authorName: p.originalPost.authorName || '原作者',
            handle: p.originalPost.handle || generateEnglishHandle(p.originalPost.authorName || ''),
            content: p.originalPost.content || '',
            authorAvatar: '',
          } : null,
          comments: (p.comments || []).map((c, cidx) => {
            // 评论也尝试匹配头像
            let commentAvatar = "";
            const commentName = c.authorName || "网友";
            
            for (const participant of forumSettings.aiParticipants) {
              const char = characters.find(ch => String(ch.id) === String(participant.charId));
              const participantName = participant.nickname || char?.name || '';
              if (participantName && commentName.includes(participantName)) {
                commentAvatar = participant.avatar || char?.avatar || '';
                break;
              }
            }
            
            if (!commentAvatar && forumSettings.npcs) {
              for (const npc of forumSettings.npcs) {
                if (npc.name && commentName.includes(npc.name)) {
                  commentAvatar = npc.avatar || '';
                  break;
                }
              }
            }
            
            return {
              id: c.id || cidx + 1,
              authorType: c.authorType === "user" ? "npc" : c.authorType || "npc",
              authorName: commentName,
              authorAvatar: commentAvatar,
              content: c.content || "",
              replyTo: c.replyTo || null,
              replyToName: c.replyToName || null,
              timestamp: Date.now() - Math.random() * 3600000,
              likes: c.likes || Math.floor(Math.random() * 10),
              liked: false,
            };
          }),
        };
      });

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

  // 获取世界书内容
  const contextText = `${forumSettings.worldview}\n${post.content}\n${commentsContext}\n${userComment.content}`;
  const worldbookContent = getForumWorldbookContent(contextText);
  
  // 决定由谁来回复（AI角色或路人）
  let replier = null;
  let replierPersona = '';
  
  // 40%概率由AI角色回复
  if (forumSettings.aiParticipants.length > 0 && Math.random() < 0.4) {
    const randomParticipant = forumSettings.aiParticipants[Math.floor(Math.random() * forumSettings.aiParticipants.length)];
    const char = characters.find(c => String(c.id) === String(randomParticipant.charId));
    replier = {
      name: randomParticipant.nickname || char?.name || '角色',
      avatar: randomParticipant.avatar || char?.avatar || '',
      type: 'ai'
    };
    replierPersona = getCharacterFullPersona(randomParticipant);
  }

  try {
    const prompt = `世界观：${forumSettings.worldview}
${worldbookContent ? '\n世界书设定：\n' + worldbookContent : ''}
帖子：${post.content}
已有评论：
${commentsContext}

用户 "${userComment.authorName}" 刚发了评论：${userComment.content}

${replier ? `请你扮演「${replier.name}」回复这条评论。\n角色人设：${replierPersona}\n要求：符合角色人设和性格特点` : '请你扮演一个网友回复这条评论'}
要求：
1. 符合世界观设定
2. 一句简短的话
3. 只输出回复内容，不要其他
4. 禁止使用[表情]格式，用emoji代替`;

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
        authorType: replier ? replier.type : "npc",
        authorName: replier ? replier.name : npcNames[Math.floor(Math.random() * npcNames.length)],
        authorAvatar: replier ? replier.avatar : "",
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
  
  // 显示提示
  showToast("一大波网友正在赶来...");

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

  // 收集AI参与者（带完整人设）
  const participantsInfo = forumSettings.aiParticipants.map((p) => {
    const char = characters.find((c) => String(c.id) === String(p.charId));
    return {
      name: p.nickname || char?.name || "角色",
      fullPersona: getCharacterFullPersona(p)
    };
  });
  
  // 获取世界书内容
  const contextText = `${forumSettings.worldview}\n${post.content}\n${existingComments.map(c => c.content).join('\n')}`;
  const worldbookContent = getForumWorldbookContent(contextText);

  try {
    // 处理转发帖子
    let retweetInfo = "";
    if (post.isRetweet && post.originalPost) {
      const orig = post.originalPost;
      retweetInfo = `
【这是一条转发帖】原帖作者：${orig.authorName}，原帖内容：${orig.content || '无'}`;
    }
    
    const prompt = `你是一个论坛评论生成器。

【世界观】${forumSettings.worldview}
${worldbookContent ? '\n【世界书/详细设定】\n' + worldbookContent : ''}

【帖子内容】${post.content}${retweetInfo}

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

【AI角色（请按人设说话）】
${participantsInfo.length > 0 
  ? participantsInfo.map((p, i) => `${i + 1}. ${p.name}\n人设：${p.fullPersona || '未设置'}`).join('\n\n')
  : "无"}

请生成2-4条新评论，要求：
1. 只生成NPC或AI参与者的评论，绝对不要生成用户的评论
2. AI角色的评论必须符合其人设和性格特点！
3. 可以回复用户的评论（楼中楼互动）
4. 可以回复其他NPC的评论
5. 也可以是对帖子的新评论
6. NPC要有符合世界观的随机昵称
7. 返回纯JSON数组格式
8. 禁止使用[爱心][笑哭]等方括号表情，必须用emoji❤️😂😊
9. 如果是转发帖，评论要针对原帖内容或转发评论

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
// 渲染帖子详情页的图片
function renderDetailImages(post) {
  if (!post.images || post.images.length === 0) return '';
  
  const imageCount = post.images.length;
  const gridClass = imageCount === 1 ? 'single' : imageCount === 2 ? 'double' : imageCount === 3 ? 'triple' : 'quad';
  
  return `
    <div class="forum-post-images ${gridClass}" style="margin: 12px 0;">
      ${post.images.map((img, idx) => `
        <div class="forum-post-image-item" onclick="showForumFullImage('${img.replace(/'/g, "\\'")}')">
          <img src="${img}" alt="">
        </div>
      `).join('')}
    </div>
  `;
}

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

// 获取默认头像（灰色背景+白色人形轮廓的SVG）
function getDefaultAvatar() {
  return `<img src="${getDefaultAvatarDataUrl()}" alt="" class="default-avatar">`;
}

// 保留旧函数名兼容，但改为返回默认头像
function getAvatarEmoji(name) {
  return getDefaultAvatar();
}

function switchForumTab(tab) {
  currentForumTab = tab;
  document
    .querySelectorAll(".forum-tab")
    .forEach((t) => t.classList.remove("active"));
  event.target.classList.add("active");
  renderForumFeed();
}

// 打开引用转发界面（推特风格）
function openQuoteRetweet(postId) {
  const post = forumPosts.find(p => Number(p.id) === Number(postId));
  if (!post) return;
  
  // 获取用户信息
  const globalAvatar = localStorage.getItem("avatarImg");
  const userAvatar = globalAvatar || getDefaultAvatarDataUrl();
  const userName = forumSettings.userNickname || "我";
  const userHandle = forumSettings.userHandle || generateEnglishHandle(userName);
  
  // 获取原帖信息
  const origAvatar = post.authorAvatar || getDefaultAvatarDataUrl();
  const origName = post.authorName || "用户";
  const origHandle = post.handle || generateEnglishHandle(origName);
  const origContent = post.content || "";
  
  // 原帖图片预览
  let origImagesHtml = '';
  if (post.images && post.images.length > 0) {
    origImagesHtml = `
      <div class="forum-quote-preview-images">
        ${post.images.slice(0, 2).map(img => `<img src="${img}" alt="">`).join('')}
        ${post.images.length > 2 ? `<span class="forum-quote-more-images">+${post.images.length - 2}</span>` : ''}
      </div>
    `;
  }
  
  const modal = document.createElement('div');
  modal.id = 'forumQuoteRetweetModal';
  modal.className = 'forum-compose-overlay active';
  modal.innerHTML = `
    <div class="forum-compose-header">
      <button class="forum-compose-cancel" onclick="closeQuoteRetweet()">取消</button>
      <div class="forum-compose-title">引用</div>
      <button class="forum-compose-submit" onclick="submitQuoteRetweet(${postId})">发布</button>
    </div>
    <div class="forum-compose-body forum-quote-body">
      <div class="forum-compose-user-info">
        <div class="forum-compose-avatar"><img src="${userAvatar}" alt=""></div>
        <div class="forum-compose-user-text">
          <div class="forum-compose-name">${escapeForumHtml(userName)}</div>
          <div class="forum-compose-handle">@${escapeForumHtml(userHandle)}</div>
        </div>
      </div>
      <textarea 
        class="forum-compose-textarea forum-quote-textarea" 
        id="forumQuoteTextarea" 
        placeholder="添加评论..."
      ></textarea>
      
      <!-- 引用的原帖卡片 -->
      <div class="forum-quote-preview">
        <div class="forum-quote-preview-header">
          <img class="forum-quote-preview-avatar" src="${origAvatar}" alt="">
          <span class="forum-quote-preview-name">${escapeForumHtml(origName)}</span>
          <span class="forum-quote-preview-handle">@${origHandle}</span>
        </div>
        <div class="forum-quote-preview-content">${escapeForumHtml(origContent)}</div>
        ${origImagesHtml}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 自动聚焦输入框
  setTimeout(() => {
    document.getElementById('forumQuoteTextarea')?.focus();
  }, 100);
}

// 关闭引用转发界面
function closeQuoteRetweet() {
  document.getElementById('forumQuoteRetweetModal')?.remove();
}

// 提交引用转发
async function submitQuoteRetweet(postId) {
  const originalPost = forumPosts.find(p => Number(p.id) === Number(postId));
  if (!originalPost) {
    showToast('帖子不存在');
    return;
  }
  
  const content = document.getElementById('forumQuoteTextarea')?.value?.trim() || '';
  
  // 获取用户信息
  const userName = forumSettings.userNickname || "我";
  const userAvatar = localStorage.getItem("avatarImg") || "";
  const userHandle = forumSettings.userHandle || generateEnglishHandle(userName);
  
  // 创建引用转发帖子
  const retweetPost = {
    id: Date.now(),
    authorType: "user",
    authorId: null,
    authorName: userName,
    authorAvatar: userAvatar,
    handle: userHandle,
    content: content, // 用户的评论
    timestamp: Date.now(),
    likes: 0,
    liked: false,
    retweets: 0,
    views: 0,
    comments: [],
    isRetweet: true,
    originalPostId: originalPost.id,
    originalPost: {
      id: originalPost.id,
      authorName: originalPost.authorName,
      authorAvatar: originalPost.authorAvatar,
      handle: originalPost.handle || generateEnglishHandle(originalPost.authorName),
      content: originalPost.content,
      images: originalPost.images,
      timestamp: originalPost.timestamp,
    }
  };
  
  // 增加原帖的转发数
  originalPost.retweets = (originalPost.retweets || 0) + 1;
  
  // 添加到帖子列表
  forumPosts.unshift(retweetPost);
  await localforage.setItem("forumPosts", forumPosts);
  
  closeQuoteRetweet();
  closeForumPostDetail();
  showToast('转发成功');
  renderForumFeed();
  
  // 自动生成互动数据
  generateInteractionsForNewPost(retweetPost.id);
}

// 保留旧函数名兼容（不再使用选择菜单）
function showRetweetMenu(postId) {
  openQuoteRetweet(postId);
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

// 转发到个人主页（旧函数名兼容，重定向到引用转发）
function retweetToProfile(postId) {
  openQuoteRetweet(postId);
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
  
  // 记录当前section
  window.currentForumSection = section;
  
  if (section === 'home') {
    renderForumFeed();
  } else if (section === 'hot') {
    renderForumHot();
  } else if (section === 'profile') {
    renderForumProfile();
  }
}

// 统一的刷新处理函数
function handleForumRefresh() {
  const currentSection = window.currentForumSection || 'home';
  
  if (currentSection === 'hot') {
    // 如果在搜索结果页面，刷新搜索结果
    if (currentHotView === 'search_results' && currentSearchQuery) {
      refreshSearchResults(currentSearchQuery);
    } else {
      // 刷新热点主页（重新渲染即可，因为热门帖子会根据主页数据更新）
      const refreshBtn = document.querySelector(".forum-refresh-btn");
      if (refreshBtn) refreshBtn.classList.add("spinning");
      
      // 先生成新的主页帖子
      generateForumPosts().then(() => {
        // 完成后重新渲染热点页面
        renderForumHot();
      });
    }
  } else {
    // 主页或其他页面，正常生成帖子
    generateForumPosts();
  }
}

// ==================== 热点页面 ====================

// 当前热点页面状态
let currentHotView = 'main'; // 'main' 或 'search_results'
let currentSearchQuery = ''; // 当前搜索词

function renderForumHot() {
  const feed = document.getElementById("forumFeed");
  if (!feed) return;
  
  currentHotView = 'main';
  
  // 显示顶栏和FAB
  const tabs = document.querySelector('.forum-tabs');
  const fab = document.querySelector('.forum-fab');
  if (tabs) tabs.style.display = 'flex';
  if (fab) fab.style.display = 'flex';
  
  // 恢复safe area padding（从个人主页返回时）
  const forumContainer = document.querySelector('.forum-container');
  if (forumContainer) forumContainer.style.paddingTop = '';
  
  // 隐藏主页的返回按钮、tab和设置按钮，显示热点标题
  const backBtn = document.querySelector('.forum-back-btn');
  const homeTabs = document.querySelectorAll('.forum-home-tab');
  const hotTitle = document.querySelector('.forum-hot-title');
  const settingsBtn = document.querySelector('.forum-settings-btn');
  if (backBtn) backBtn.style.display = 'none';
  homeTabs.forEach(tab => tab.style.display = 'none');
  if (hotTitle) hotTitle.style.display = 'block';
  if (settingsBtn) settingsBtn.style.display = 'none';
  
  // 生成热点话题数据
  const hotTopics = generateHotTopics();
  const trendingPosts = getTrendingPosts();
  
  // 获取世界观相关的热搜关键词
  const worldviewKeywords = extractWorldviewKeywords();
  
  feed.innerHTML = `
    <div class="forum-hot-container">
      <!-- 搜索栏 -->
      <div class="forum-hot-search">
        <div class="forum-hot-search-box" onclick="focusHotSearch()">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#536471" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="forumHotSearchInput" placeholder="搜索" 
            onkeydown="handleHotSearchKeydown(event)"
            oninput="handleHotSearchInput(event)">
          <button class="forum-hot-search-btn" onclick="executeHotSearch()" style="display:none;">
            搜索
          </button>
        </div>
      </div>
      
      <!-- 热门话题区域 -->
      <div class="forum-hot-section">
        <div class="forum-hot-section-header">
          <span class="forum-hot-section-title">热门话题</span>
        </div>
        <div class="forum-hot-topics">
          ${hotTopics.map((topic, idx) => `
            <div class="forum-hot-topic-item" onclick="searchForumTopic('${escapeForumHtml(topic.tag)}')">
              <div class="forum-hot-topic-rank">${idx + 1}</div>
              <div class="forum-hot-topic-content">
                <div class="forum-hot-topic-category">${escapeForumHtml(topic.category)}</div>
                <div class="forum-hot-topic-tag">#${escapeForumHtml(topic.tag)}</div>
                <div class="forum-hot-topic-count">${topic.count} 条帖子</div>
              </div>
              <div class="forum-hot-topic-trend ${topic.trend}">
                ${topic.trend === 'up' ? '↑' : topic.trend === 'down' ? '↓' : '—'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- 热门帖子区域 -->
      <div class="forum-hot-section">
        <div class="forum-hot-section-header">
          <span class="forum-hot-section-title">热门帖子</span>
        </div>
        <div class="forum-hot-posts">
          ${trendingPosts.length > 0 
            ? trendingPosts.map(post => renderForumPostItem(post)).join('')
            : '<div class="forum-hot-empty">暂无热门帖子<br><span style="font-size:13px;color:#9ca3af;">点击上方刷新按钮生成内容</span></div>'
          }
        </div>
      </div>
      
      <!-- 猜你想搜 -->
      <div class="forum-hot-section">
        <div class="forum-hot-section-header">
          <span class="forum-hot-section-title">猜你想搜</span>
        </div>
        <div class="forum-hot-keywords">
          ${worldviewKeywords.map(kw => `
            <span class="forum-hot-keyword" onclick="searchForumTopic('${escapeForumHtml(kw)}')">${escapeForumHtml(kw)}</span>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// 聚焦搜索框
function focusHotSearch() {
  const input = document.getElementById('forumHotSearchInput');
  if (input) input.focus();
}

// 处理搜索输入
function handleHotSearchInput(event) {
  const btn = document.querySelector('.forum-hot-search-btn');
  if (btn) {
    btn.style.display = event.target.value.trim() ? 'block' : 'none';
  }
}

// 处理搜索键盘事件
function handleHotSearchKeydown(event) {
  if (event.key === 'Enter') {
    executeHotSearch();
  }
}

// 执行搜索
function executeHotSearch() {
  const input = document.getElementById('forumHotSearchInput');
  const query = input?.value?.trim();
  if (query) {
    searchForumTopic(query);
  }
}

// 搜索/点击话题 - 生成相关帖子
async function searchForumTopic(topic) {
  if (!topic) return;
  
  currentSearchQuery = topic;
  currentHotView = 'search_results';
  
  const feed = document.getElementById("forumFeed");
  if (!feed) return;
  
  // 隐藏顶栏（搜索结果页有自己的header）
  const tabs = document.querySelector('.forum-tabs');
  if (tabs) tabs.style.display = 'none';
  
  // 移除safe area padding（搜索结果header有自己的safe area处理）
  const forumContainer = document.querySelector('.forum-container');
  if (forumContainer) forumContainer.style.paddingTop = '0';
  
  // 显示搜索结果页面（带loading）
  feed.innerHTML = `
    <div class="forum-hot-container">
      <!-- 搜索结果头部 -->
      <div class="forum-search-header">
        <button class="forum-search-back" onclick="renderForumHot()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div class="forum-search-title">#${escapeForumHtml(topic)}</div>
        <button class="forum-search-refresh" onclick="refreshSearchResults('${escapeForumHtml(topic)}')" title="刷新">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </div>
      
      <!-- Loading状态 -->
      <div class="forum-search-loading" id="forumSearchLoading">
        <div class="forum-search-spinner"></div>
        <div class="forum-search-loading-text">正在搜索「${escapeForumHtml(topic)}」相关内容...</div>
      </div>
      
      <!-- 搜索结果 -->
      <div class="forum-search-results" id="forumSearchResults"></div>
    </div>
  `;
  
  // 调用API生成相关帖子
  await generateTopicPosts(topic);
}

// 刷新搜索结果
async function refreshSearchResults(topic) {
  const refreshBtn = document.querySelector('.forum-search-refresh');
  if (refreshBtn) refreshBtn.classList.add('spinning');
  
  // 显示loading
  const loading = document.getElementById('forumSearchLoading');
  const results = document.getElementById('forumSearchResults');
  if (loading) loading.style.display = 'flex';
  if (results) results.innerHTML = '';
  
  await generateTopicPosts(topic);
  
  if (refreshBtn) refreshBtn.classList.remove('spinning');
}

// 生成话题相关帖子
async function generateTopicPosts(topic) {
  const apiConfig = getActiveApiConfig();
  if (!apiConfig || !apiConfig.url || !apiConfig.key) {
    showSearchError("请先配置API");
    return;
  }
  
  try {
    // 获取世界书内容
    const worldbookContent = getForumWorldbookContent(`${forumSettings.worldview}\n${topic}`);
    
    // 构建AI参与者信息（使用完整人设）
    const participants = forumSettings.aiParticipants.map((p) => {
      const char = characters.find((c) => String(c.id) === String(p.charId));
      const settings = chatSettings[p.charId] || {};
      return {
        name: p.nickname || settings.charName || char?.name || "角色",
        handle: p.handle || generateEnglishHandle(p.nickname || char?.name || ''),
        identity: p.identity || "",
        fullPersona: getCharacterFullPersona(p),
      };
    });

    // 构建NPC信息
    const npcs = (forumSettings.npcs || []).map(npc => ({
      name: npc.name,
      handle: npc.handle || generateEnglishHandle(npc.name),
      identity: npc.identity || "",
      persona: npc.persona || "",
    }));

    // 构建关系信息
    const relationships = (forumSettings.relationships || []).map(rel => {
      const person1 = getForumPersonName(rel.person1Type, rel.person1Id);
      const person2 = getForumPersonName(rel.person2Type, rel.person2Id);
      return `${person1} 和 ${person2} 的关系：${rel.relationship}${rel.description ? '（' + rel.description + '）' : ''}`;
    });

    // 构建system prompt
    let systemPrompt = `你是一个论坛内容生成器。请根据以下设定生成与「${topic}」相关的论坛帖子。

【世界观】
${forumSettings.worldview || '现代都市'}
${worldbookContent ? '\n【世界书/详细设定】\n' + worldbookContent : ''}

【论坛名称】
${forumSettings.forumName || '广场'}

【搜索话题】
${topic}

【用户信息（仅供参考，不要生成用户的帖子或评论）】
- 昵称：${forumSettings.userNickname || "用户"}
- 身份：${forumSettings.userIdentity || "普通成员"}

【AI角色】可以使用这些角色发帖和评论，必须符合人设！
${participants.length > 0 
  ? participants.map((p, i) => 
      `${i + 1}. ${p.name}（@${p.handle}）\n${p.fullPersona || p.identity || '未设置人设'}`
    ).join("\n\n")
  : "无"}`;

    if (npcs.length > 0) {
      systemPrompt += `

【固定NPC】可以使用这些NPC发帖和评论
${npcs.map((n, i) => 
  `${i + 1}. ${n.name}（@${n.handle}）：${n.identity || '普通网友'}${n.persona ? '，性格：' + n.persona : ''}`
).join("\n")}`;
    }

    if (relationships.length > 0) {
      systemPrompt += `

【人物关系】在帖子互动中体现这些关系
${relationships.join("\n")}`;
    }

    systemPrompt += `

【要求】
1. 生成10-15条与「${topic}」话题相关的论坛帖子
2. 帖子内容必须围绕「${topic}」展开，可以是讨论、分享、吐槽、求助等
3. 帖子作者只能是AI角色、固定NPC或随机路人，绝对不要生成用户的帖子
4. 内容要符合世界观设定，有趣且有互动感
5. 每条帖子必须有10-15条评论
6. 部分帖子可以包含图片，用[图片:图片描述]格式
7. 返回JSON数组格式
8. 禁止使用[爱心][笑哭]等方括号表情格式，必须直接使用emoji如❤️😂😊等`;

    const userPrompt = `请生成与「${topic}」相关的论坛帖子，返回纯JSON数组（不要markdown代码块）：
[
  {
    "authorType": "ai或npc",
    "authorName": "中文昵称",
    "handle": "英文用户名(不含@符号)",
    "content": "与${topic}相关的帖子内容",
    "likes": 点赞数,
    "retweets": 转发数(0-50),
    "views": 浏览量(100-5000),
    "comments": [
      {"id":1,"authorType":"npc","authorName":"昵称","handle":"英文用户名","content":"评论","likes":0},
      {"id":2,"authorType":"ai","authorName":"昵称","handle":"英文用户名","content":"回复评论","likes":0,"replyTo":1,"replyToName":"被回复者昵称"}
    ]
  }
]
注意：
1. 所有帖子都必须与「${topic}」话题相关！
2. authorType只能是"ai"或"npc"，不要生成"user"
3. 每个帖子必须有10-15条评论！
4. 禁止使用[表情]格式，用emoji❤️😂代替`;

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
      const searchPosts = posts.map((p, idx) => {
        // 尝试匹配AI参与者或NPC的头像
        let authorAvatar = "";
        const authorName = p.authorName || "匿名";
        
        for (const participant of forumSettings.aiParticipants) {
          const char = characters.find(c => String(c.id) === String(participant.charId));
          const participantName = participant.nickname || char?.name || '';
          if (participantName && authorName.includes(participantName)) {
            authorAvatar = participant.avatar || char?.avatar || '';
            break;
          }
        }
        
        if (!authorAvatar && forumSettings.npcs) {
          for (const npc of forumSettings.npcs) {
            if (npc.name && authorName.includes(npc.name)) {
              authorAvatar = npc.avatar || '';
              break;
            }
          }
        }
        
        return {
          id: Math.floor(Date.now() + idx * 1000 + Math.random() * 100),
          authorType: p.authorType === "user" ? "npc" : p.authorType || "npc",
          authorId: null,
          authorName: authorName,
          authorAvatar: authorAvatar,
          handle: p.handle || generateEnglishHandle(p.authorName),
          content: p.content || "",
          timestamp: Date.now() - Math.random() * 7200000,
          likes: p.likes || Math.floor(Math.random() * 50),
          liked: false,
          retweets: p.retweets || Math.floor(Math.random() * 30),
          views: p.views || Math.floor(Math.random() * 4900) + 100,
          isSearchResult: true, // 标记为搜索结果
          searchTopic: topic,
          comments: (p.comments || []).map((c, cidx) => {
            let commentAvatar = "";
            const commentName = c.authorName || "网友";
            
            for (const participant of forumSettings.aiParticipants) {
              const char = characters.find(ch => String(ch.id) === String(participant.charId));
              const participantName = participant.nickname || char?.name || '';
              if (participantName && commentName.includes(participantName)) {
                commentAvatar = participant.avatar || char?.avatar || '';
                break;
              }
            }
            
            if (!commentAvatar && forumSettings.npcs) {
              for (const npc of forumSettings.npcs) {
                if (npc.name && commentName.includes(npc.name)) {
                  commentAvatar = npc.avatar || '';
                  break;
                }
              }
            }
            
            return {
              id: c.id || cidx + 1,
              authorType: c.authorType === "user" ? "npc" : c.authorType || "npc",
              authorName: commentName,
              authorAvatar: commentAvatar,
              content: c.content || "",
              replyTo: c.replyTo || null,
              replyToName: c.replyToName || null,
              timestamp: Date.now() - Math.random() * 3600000,
              likes: c.likes || Math.floor(Math.random() * 10),
              liked: false,
            };
          }),
        };
      });

      // 将搜索结果添加到帖子列表（保留原有帖子）
      // 先移除之前的同话题搜索结果
      forumPosts = forumPosts.filter(p => !(p.isSearchResult && p.searchTopic === topic));
      // 添加新的搜索结果
      forumPosts = [...searchPosts, ...forumPosts];
      await localforage.setItem("forumPosts", forumPosts);
      
      // 显示搜索结果
      showSearchResults(searchPosts, topic);
    } else {
      showSearchError("生成内容解析失败");
    }
  } catch (e) {
    console.error("[论坛] 搜索生成失败:", e);
    showSearchError("生成失败: " + e.message);
  }
}

// 显示搜索结果
function showSearchResults(posts, topic) {
  const loading = document.getElementById('forumSearchLoading');
  const results = document.getElementById('forumSearchResults');
  
  if (loading) loading.style.display = 'none';
  
  if (results) {
    if (posts.length > 0) {
      results.innerHTML = `
        <div class="forum-search-stats">
          找到 ${posts.length} 条与「${escapeForumHtml(topic)}」相关的帖子
        </div>
        ${posts.map(post => renderForumPostItem(post)).join('')}
      `;
    } else {
      results.innerHTML = `
        <div class="forum-search-empty">
          <div class="forum-search-empty-icon">🔍</div>
          <div class="forum-search-empty-text">没有找到与「${escapeForumHtml(topic)}」相关的内容</div>
          <button class="forum-empty-btn" onclick="refreshSearchResults('${escapeForumHtml(topic)}')">重新搜索</button>
        </div>
      `;
    }
  }
}

// 显示搜索错误
function showSearchError(message) {
  const loading = document.getElementById('forumSearchLoading');
  const results = document.getElementById('forumSearchResults');
  
  if (loading) loading.style.display = 'none';
  
  if (results) {
    results.innerHTML = `
      <div class="forum-search-empty">
        <div class="forum-search-empty-icon">😅</div>
        <div class="forum-search-empty-text">${escapeForumHtml(message)}</div>
        <button class="forum-empty-btn" onclick="renderForumHot()">返回热点</button>
      </div>
    `;
  }
}

// 生成热门话题
function generateHotTopics() {
  const worldview = forumSettings.worldview || '';
  const forumName = forumSettings.forumName || '广场';
  
  // 基础话题模板
  const baseTopics = [
    { category: '热搜', tag: '今日讨论', count: Math.floor(Math.random() * 500) + 100, trend: 'up' },
    { category: '热搜', tag: '新鲜事', count: Math.floor(Math.random() * 300) + 80, trend: 'up' },
    { category: '娱乐', tag: '日常分享', count: Math.floor(Math.random() * 200) + 50, trend: 'stable' },
  ];
  
  // 根据世界观生成相关话题
  if (worldview) {
    // 提取世界观中的关键词
    const keywords = worldview.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
    const uniqueKeywords = [...new Set(keywords)].slice(0, 5);
    
    uniqueKeywords.forEach((kw, idx) => {
      baseTopics.push({
        category: forumName,
        tag: kw,
        count: Math.floor(Math.random() * 400) + 50,
        trend: ['up', 'stable', 'down'][Math.floor(Math.random() * 3)]
      });
    });
  }
  
  // 根据AI角色生成话题
  forumSettings.aiParticipants.forEach(p => {
    const char = characters?.find(c => String(c.id) === String(p.charId));
    const name = p.nickname || char?.name;
    if (name) {
      baseTopics.push({
        category: '角色',
        tag: name + '相关',
        count: Math.floor(Math.random() * 150) + 30,
        trend: 'up'
      });
    }
  });
  
  // 排序并返回前10个
  return baseTopics
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// 获取热门帖子（按互动量排序）
function getTrendingPosts() {
  if (forumPosts.length === 0) return [];
  
  // 过滤掉搜索结果帖子，只显示主页帖子
  const mainPosts = forumPosts.filter(p => !p.isSearchResult);
  
  // 计算每个帖子的热度分数
  const postsWithScore = mainPosts.map(post => {
    const commentCount = post.comments?.length || 0;
    const likes = post.likes || 0;
    const retweets = post.retweets || 0;
    const views = post.views || 0;
    
    // 热度公式：评论*10 + 点赞*5 + 转发*8 + 浏览*0.1
    const score = commentCount * 10 + likes * 5 + retweets * 8 + views * 0.1;
    
    return { ...post, hotScore: score };
  });
  
  // 按热度排序，取前5条
  return postsWithScore
    .sort((a, b) => b.hotScore - a.hotScore)
    .slice(0, 5);
}

// 提取世界观关键词
function extractWorldviewKeywords() {
  const worldview = forumSettings.worldview || '';
  const userIdentity = forumSettings.userIdentity || '';
  const combined = worldview + ' ' + userIdentity;
  
  // 提取2-4字的中文词汇
  const keywords = combined.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
  const uniqueKeywords = [...new Set(keywords)];
  
  // 添加一些通用关键词
  const defaultKeywords = ['日常', '分享', '讨论', '求助', '推荐'];
  
  return [...uniqueKeywords.slice(0, 6), ...defaultKeywords].slice(0, 8);
}

// ==================== 个人主页 ====================

// 当前个人主页选中的tab
let currentProfileTab = 'posts';

function renderForumProfile(tab = 'posts') {
  currentProfileTab = tab;
  const feed = document.getElementById("forumFeed");
  if (!feed) return;
  
  // 获取用户数据
  const globalAvatar = localStorage.getItem("avatarImg");
  const userAvatar = globalAvatar || getDefaultAvatarDataUrl();
  const userName = forumSettings.userNickname || "用户";
  const userHandle = forumSettings.userHandle || generateEnglishHandle(userName);
  const userBio = forumSettings.userBio || "";
  const userBanner = forumSettings.userBanner || "";
  const followingStr = forumSettings.userFollowingStr || formatFollowCount(forumSettings.userFollowing || 0);
  const followersStr = forumSettings.userFollowersStr || formatFollowCount(forumSettings.userFollowers || 0);
  const joinDate = forumSettings.userJoinDate || formatJoinDate(Date.now());
  
  // 获取用户发布的帖子（包括转发）
  const userPosts = forumPosts.filter(p => p.authorType === 'user');
  
  // 获取用户点赞的帖子
  const likedPosts = forumPosts.filter(p => p.liked);
  
  // 获取用户评论过的帖子
  const repliedPosts = forumPosts.filter(p => 
    p.comments && p.comments.some(c => c.authorType === 'user')
  );
  
  // 根据当前tab渲染内容
  let contentHtml = '';
  if (tab === 'posts') {
    if (userPosts.length > 0) {
      // 分离置顶帖子和普通帖子
      const pinnedPosts = userPosts.filter(p => p.isPinned);
      const regularPosts = userPosts.filter(p => !p.isPinned);
      
      // 渲染置顶帖子
      let postsHtml = '';
      pinnedPosts.forEach(post => {
        postsHtml += `
          <div class="forum-pinned-indicator">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M7 4.5C7 3.12 8.12 2 9.5 2h5C15.88 2 17 3.12 17 4.5v5.26L20.12 16H13v5l-1 2-1-2v-5H3.88L7 9.76V4.5z"/>
            </svg>
            <span>置顶</span>
          </div>
          ${renderForumPostItem(post)}
        `;
      });
      
      // 渲染普通帖子
      postsHtml += regularPosts.map(post => renderForumPostItem(post)).join("");
      contentHtml = postsHtml;
    } else {
      contentHtml = '<div class="forum-profile-no-posts">还没有发布任何帖子</div>';
    }
  } else if (tab === 'replies') {
    contentHtml = repliedPosts.length > 0 
      ? repliedPosts.map(post => renderProfileReplyItem(post)).join("")
      : '<div class="forum-profile-no-posts">还没有回复任何帖子</div>';
  } else if (tab === 'likes') {
    contentHtml = likedPosts.length > 0 
      ? likedPosts.map(post => renderForumPostItem(post)).join("")
      : '<div class="forum-profile-no-posts">还没有喜欢任何帖子</div>';
  }
  
  feed.innerHTML = `
    <div class="forum-profile forum-profile-immersive">
      <!-- 背景图直接覆盖到顶端 -->
      <div class="forum-profile-banner-full" onclick="changeProfileBanner()">
        ${userBanner 
          ? `<img src="${userBanner}" alt="">` 
          : '<div class="forum-profile-banner-placeholder"></div>'}
        <div class="forum-profile-banner-hint">点击更换背景</div>
      </div>
      
      <!-- 头像和编辑按钮 -->
      <div class="forum-profile-avatar-row">
        <div class="forum-profile-avatar" onclick="changeProfileAvatar()">
          <img src="${userAvatar}" alt="">
          <div class="forum-profile-avatar-hint">更换</div>
        </div>
        <div class="forum-profile-actions-row">
          <button class="forum-profile-dm-btn" onclick="openDirectMessages()">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </button>
          <button class="forum-profile-edit-btn" onclick="openProfileEditor()">编辑个人资料</button>
        </div>
      </div>
      
      <!-- 用户信息 -->
      <div class="forum-profile-info">
        <div class="forum-profile-name">${escapeForumHtml(userName)}</div>
        <div class="forum-profile-handle">@${escapeForumHtml(userHandle)}</div>
        ${userBio ? `<div class="forum-profile-bio">${escapeForumHtml(userBio)}</div>` : ''}
        <div class="forum-profile-meta">
          <span class="forum-profile-join">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M7 4V3h2v1h6V3h2v1h1.5C19.89 4 21 5.12 21 6.5v12c0 1.38-1.11 2.5-2.5 2.5h-13C4.12 21 3 19.88 3 18.5v-12C3 5.12 4.12 4 5.5 4H7zm0 2H5.5c-.27 0-.5.22-.5.5v12c0 .28.23.5.5.5h13c.28 0 .5-.22.5-.5v-12c0-.28-.22-.5-.5-.5H17v1h-2V6H9v1H7V6zm0 6h2v-2H7v2zm0 4h2v-2H7v2zm4-4h2v-2h-2v2zm0 4h2v-2h-2v2zm4-4h2v-2h-2v2z"/>
            </svg>
            ${joinDate} 加入
          </span>
        </div>
        <div class="forum-profile-stats">
          <span class="forum-profile-stat">
            <strong>${followingStr}</strong> 正在关注
          </span>
          <span class="forum-profile-stat">
            <strong>${followersStr}</strong> 关注者
          </span>
        </div>
      </div>
      
      <!-- 标签页 -->
      <div class="forum-profile-tabs">
        <div class="forum-profile-tab ${tab === 'posts' ? 'active' : ''}" onclick="renderForumProfile('posts')">帖子</div>
        <div class="forum-profile-tab ${tab === 'replies' ? 'active' : ''}" onclick="renderForumProfile('replies')">回复</div>
        <div class="forum-profile-tab ${tab === 'likes' ? 'active' : ''}" onclick="renderForumProfile('likes')">喜欢</div>
      </div>
      
      <!-- 内容列表 -->
      <div class="forum-profile-posts">
        ${contentHtml}
      </div>
    </div>
  `;
  
  // 隐藏顶栏和FAB
  const tabs = document.querySelector('.forum-tabs');
  const fab = document.querySelector('.forum-fab');
  if (tabs) tabs.style.display = 'none';
  if (fab) fab.style.display = 'none';
  
  // 移除safe area padding，让背景图延伸到顶部
  const forumContainer = document.querySelector('.forum-container');
  if (forumContainer) forumContainer.style.paddingTop = '0';
}

// 渲染回复过的帖子（显示用户的回复）
function renderProfileReplyItem(post) {
  // 找到用户的评论
  const userComments = post.comments.filter(c => c.authorType === 'user');
  if (userComments.length === 0) return '';
  
  const lastComment = userComments[userComments.length - 1];
  
  // 获取用户头像
  const globalAvatar = localStorage.getItem("avatarImg");
  const userAvatar = globalAvatar || getDefaultAvatarDataUrl();
  const userName = forumSettings.userNickname || "我";
  const userHandle = forumSettings.userHandle || generateEnglishHandle(userName);
  
  // 确定回复的对象
  let replyTargetName = '';
  let replyTargetContent = '';
  let replyTargetAvatar = '';
  
  if (lastComment.replyToName) {
    // 用户回复的是某条评论
    replyTargetName = lastComment.replyToName;
    // 找到被回复的评论
    const targetComment = post.comments.find(c => c.id === lastComment.replyTo);
    if (targetComment) {
      replyTargetContent = targetComment.content?.substring(0, 50) + (targetComment.content?.length > 50 ? '...' : '');
      replyTargetAvatar = targetComment.authorAvatar
        ? `<img src="${targetComment.authorAvatar}" alt="">`
        : getAvatarEmoji(targetComment.authorName);
    }
  } else {
    // 用户回复的是帖子本身
    replyTargetName = post.authorName;
    replyTargetContent = post.content?.substring(0, 50) + (post.content?.length > 50 ? '...' : '');
    replyTargetAvatar = post.authorAvatar
      ? `<img src="${post.authorAvatar}" alt="">`
      : getAvatarEmoji(post.authorName);
  }
  
  const contextText = lastComment.replyToName 
    ? `回复 @${escapeForumHtml(lastComment.replyToName)} 的评论`
    : `回复 @${escapeForumHtml(post.authorName)} 的帖子`;
  
  return `
    <div class="forum-reply-item" onclick="openForumPostDetail(${post.id})">
      <div class="forum-reply-context">
        <span class="forum-reply-context-icon">↩</span>
        ${contextText}
      </div>
      <div class="forum-post">
        <div class="forum-post-left">
          <div class="forum-post-avatar">
            <img src="${userAvatar}" alt="">
          </div>
        </div>
        <div class="forum-post-right">
          <div class="forum-post-header">
            <span class="forum-post-name">${escapeForumHtml(userName)}</span>
            <span class="forum-author-tag user">我</span>
            <div class="forum-post-meta">
              <span>@${userHandle}</span>
              <span>·</span>
              <span>${formatForumTime(lastComment.timestamp)}</span>
            </div>
          </div>
          <div class="forum-post-content">${escapeForumHtml(lastComment.content)}</div>
        </div>
      </div>
      <div class="forum-reply-original">
        <div class="forum-reply-original-avatar">${replyTargetAvatar}</div>
        <div class="forum-reply-original-content">
          <span class="forum-reply-original-name">${escapeForumHtml(replyTargetName)}</span>
          <span class="forum-reply-original-text">${escapeForumHtml(replyTargetContent)}</span>
        </div>
      </div>
    </div>
  `;
}

// ==================== 查看他人主页 ====================

// 当前查看的其他用户信息
let currentViewingUser = null;

// 打开其他用户的主页
async function openOtherUserProfile(authorType, authorName, authorId) {
  // 如果是用户自己，打开自己的主页
  if (authorType === 'user') {
    switchForumSection('profile');
    return;
  }
  
  const feed = document.getElementById("forumFeed");
  if (!feed) return;
  
  // 查找用户信息
  let userInfo = null;
  
  if (authorType === 'ai') {
    // AI角色 - 先通过ID查找，再通过名字查找
    let participant = null;
    let char = null;
    
    if (authorId) {
      participant = forumSettings.aiParticipants.find(p => String(p.charId) === String(authorId));
      char = characters.find(c => String(c.id) === String(authorId));
    }
    
    // 如果通过ID找不到，尝试通过名字查找
    if (!participant) {
      for (const p of forumSettings.aiParticipants) {
        const c = characters.find(ch => String(ch.id) === String(p.charId));
        const pName = p.nickname || c?.name || '';
        if (pName === authorName) {
          participant = p;
          char = c;
          break;
        }
      }
    }
    
    if (participant) {
      userInfo = {
        type: 'ai',
        id: participant.charId,
        name: participant.nickname || char?.name || authorName,
        handle: participant.handle || generateEnglishHandle(authorName),
        avatar: participant.avatar || char?.avatar || '',
        banner: participant.banner || '',
        bio: participant.bio || '',
        identity: participant.identity || '',
        following: participant.following || '',
        followers: participant.followers || '',
        joinDate: participant.joinDate || '',
      };
    }
  } else if (authorType === 'npc') {
    // NPC角色 - 通过ID或名字查找
    const npc = (forumSettings.npcs || []).find(n => 
      n.name === authorName || String(n.id) === String(authorId)
    );
    if (npc) {
      userInfo = {
        type: 'npc',
        id: npc.id,
        name: npc.name,
        handle: npc.handle || generateEnglishHandle(npc.name),
        avatar: npc.avatar || '',
        banner: npc.banner || '',
        bio: npc.bio || '',
        identity: npc.identity || '',
        persona: npc.persona || '',
        following: npc.following || '',
        followers: npc.followers || '',
        joinDate: npc.joinDate || '',
      };
    }
  }
  
  // 如果找不到预设信息，创建随机信息
  if (!userInfo) {
    userInfo = {
      type: 'random',
      name: authorName,
      handle: generateEnglishHandle(authorName),
      avatar: '',
      banner: '',
      bio: '',
      identity: '',
      following: '',
      followers: '',
      joinDate: '',
    };
  }
  
  currentViewingUser = userInfo;
  
  // 隐藏顶栏
  const tabs = document.querySelector('.forum-tabs');
  const fab = document.querySelector('.forum-fab');
  if (tabs) tabs.style.display = 'none';
  if (fab) fab.style.display = 'none';
  
  // 移除safe area padding
  const forumContainer = document.querySelector('.forum-container');
  if (forumContainer) forumContainer.style.paddingTop = '0';
  
  // 获取该用户已有的帖子
  const existingPosts = forumPosts.filter(p => 
    p.authorName === userInfo.name && p.authorType !== 'user'
  );
  
  // 渲染主页（带loading状态）
  renderOtherUserProfile(userInfo, existingPosts, true);
  
  // 如果帖子少于3条，调用API生成更多
  if (existingPosts.length < 3) {
    await generateUserProfilePosts(userInfo);
  }
}

// 渲染其他用户主页
function renderOtherUserProfile(userInfo, posts, isLoading = false) {
  const feed = document.getElementById("forumFeed");
  if (!feed) return;
  
  const avatarContent = userInfo.avatar 
    ? `<img src="${userInfo.avatar}" alt="">` 
    : getAvatarEmoji(userInfo.name);
  
  const bannerHtml = userInfo.banner
    ? `<img src="${userInfo.banner}" alt="">`
    : '<div class="forum-profile-banner-placeholder"></div>';
  
  // 默认值
  const following = userInfo.following || Math.floor(Math.random() * 500 + 50);
  const followers = userInfo.followers || Math.floor(Math.random() * 2000 + 100);
  const joinDate = userInfo.joinDate || formatJoinDate(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 2);
  
  // 找出置顶帖子
  const pinnedPost = posts.find(p => p.isPinned);
  const regularPosts = posts.filter(p => !p.isPinned);
  
  // 帖子HTML
  let postsHtml = '';
  if (pinnedPost) {
    postsHtml += `
      <div class="forum-pinned-indicator">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M7 4.5C7 3.12 8.12 2 9.5 2h5C15.88 2 17 3.12 17 4.5v5.26L20.12 16H13v5l-1 2-1-2v-5H3.88L7 9.76V4.5z"/>
        </svg>
        <span>置顶</span>
      </div>
      ${renderForumPostItem(pinnedPost)}
    `;
  }
  postsHtml += regularPosts.map(p => renderForumPostItem(p)).join('');
  
  if (isLoading && posts.length === 0) {
    postsHtml = `
      <div class="forum-search-loading">
        <div class="forum-search-spinner"></div>
        <div class="forum-search-loading-text">正在加载主页内容...</div>
      </div>
    `;
  } else if (posts.length === 0) {
    postsHtml = '<div class="forum-profile-no-posts">还没有发布任何帖子</div>';
  }
  
  feed.innerHTML = `
    <div class="forum-profile forum-profile-immersive forum-other-profile">
      <!-- 返回按钮（悬浮） -->
      <button class="forum-other-profile-back" onclick="closeOtherUserProfile()">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>
      
      <!-- 背景图 -->
      <div class="forum-profile-banner-full">
        ${bannerHtml}
      </div>
      
      <!-- 头像和关注按钮 -->
      <div class="forum-profile-avatar-row">
        <div class="forum-profile-avatar">
          ${avatarContent}
        </div>
        <button class="forum-profile-follow-btn" onclick="showToast('已关注 ${escapeForumHtml(userInfo.name)}')">关注</button>
      </div>
      
      <!-- 用户信息 -->
      <div class="forum-profile-info">
        <div class="forum-profile-name">${escapeForumHtml(userInfo.name)}</div>
        <div class="forum-profile-handle">@${escapeForumHtml(userInfo.handle)}</div>
        ${userInfo.bio ? `<div class="forum-profile-bio">${escapeForumHtml(userInfo.bio)}</div>` : ''}
        <div class="forum-profile-meta">
          <span class="forum-profile-join">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M7 4V3h2v1h6V3h2v1h1.5C19.89 4 21 5.12 21 6.5v12c0 1.38-1.11 2.5-2.5 2.5h-13C4.12 21 3 19.88 3 18.5v-12C3 5.12 4.12 4 5.5 4H7zm0 2H5.5c-.27 0-.5.22-.5.5v12c0 .28.23.5.5.5h13c.28 0 .5-.22.5-.5v-12c0-.28-.22-.5-.5-.5H17v1h-2V6H9v1H7V6zm0 6h2v-2H7v2zm0 4h2v-2H7v2zm4-4h2v-2h-2v2zm0 4h2v-2h-2v2zm4-4h2v-2h-2v2z"/>
            </svg>
            ${joinDate} 加入
          </span>
        </div>
        <div class="forum-profile-stats">
          <span class="forum-profile-stat">
            <strong>${following}</strong> 正在关注
          </span>
          <span class="forum-profile-stat">
            <strong>${followers}</strong> 关注者
          </span>
        </div>
      </div>
      
      <!-- 标签页 -->
      <div class="forum-profile-tabs">
        <div class="forum-profile-tab active">帖子</div>
      </div>
      
      <!-- 内容列表 -->
      <div class="forum-profile-posts">
        ${postsHtml}
      </div>
      
      <!-- 生成更多帖子按钮 -->
      <div class="forum-generate-more-posts">
        <button onclick="generateUserProfilePosts(currentViewingUser)" class="forum-generate-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          生成更多帖子
        </button>
      </div>
    </div>
  `;
}

// 关闭其他用户主页
function closeOtherUserProfile() {
  currentViewingUser = null;
  
  // 恢复顶栏
  const tabs = document.querySelector('.forum-tabs');
  const fab = document.querySelector('.forum-fab');
  if (tabs) tabs.style.display = 'flex';
  if (fab) fab.style.display = 'flex';
  
  // 恢复safe area
  const forumContainer = document.querySelector('.forum-container');
  if (forumContainer) forumContainer.style.paddingTop = '';
  
  renderForumFeed();
}

// 生成用户主页帖子
async function generateUserProfilePosts(userInfo) {
  if (!userInfo) return;
  
  const apiConfig = getActiveApiConfig();
  if (!apiConfig || !apiConfig.url || !apiConfig.key) {
    showToast("请先配置API");
    return;
  }
  
  showToast("正在生成帖子...");
  
  // 构建prompt
  const identityInfo = userInfo.identity || userInfo.persona || '';
  const bioInfo = userInfo.bio || '';
  
  try {
    const prompt = `你是一个论坛帖子生成器。请为以下用户生成5-8条帖子。

【世界观】${forumSettings.worldview || '现代都市'}

【用户信息】
- 昵称：${userInfo.name}
- 身份：${identityInfo || '普通网友'}
- 简介：${bioInfo || '无'}

【要求】
1. 帖子内容要符合世界观和用户身份
2. 可以是日常分享、想法、吐槽等
3. 第一条帖子可以是置顶帖（精华内容或自我介绍）
4. 帖子要有真实感，像真人发的
5. 可以用emoji表情符号😊❤️，但不要过多
6. 返回纯JSON数组格式
7. 禁止使用[爱心][笑哭]等方括号表情格式

JSON格式：
[
  {
    "content": "帖子内容",
    "isPinned": true/false,
    "likes": 随机数,
    "retweets": 随机数,
    "views": 随机数
  }
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
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const newPosts = JSON.parse(jsonMatch[0]);
      
      newPosts.forEach((postData, idx) => {
        const newPost = {
          id: Date.now() + idx,
          authorType: userInfo.type === 'ai' ? 'ai' : 'npc',
          authorId: userInfo.id || null,
          authorName: userInfo.name,
          authorAvatar: userInfo.avatar || '',
          handle: userInfo.handle,
          content: postData.content,
          timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // 最近7天内
          likes: postData.likes || Math.floor(Math.random() * 100),
          liked: false,
          retweets: postData.retweets || Math.floor(Math.random() * 30),
          views: postData.views || Math.floor(Math.random() * 1000),
          comments: [],
          isPinned: postData.isPinned || false,
          isProfileGenerated: true, // 标记为主页生成的帖子
        };
        
        forumPosts.unshift(newPost);
      });

      await localforage.setItem("forumPosts", forumPosts);
      
      // 重新渲染主页
      const userPosts = forumPosts.filter(p => 
        p.authorName === userInfo.name && p.authorType !== 'user'
      );
      renderOtherUserProfile(userInfo, userPosts, false);
      
      showToast(`已生成 ${newPosts.length} 条帖子`);
    }
  } catch (e) {
    console.error("[论坛] 生成用户帖子失败:", e);
    showToast("生成失败: " + e.message);
  }
}

// ==================== 置顶帖子功能 ====================

// 切换帖子置顶状态
async function togglePinPost(postId) {
  const post = forumPosts.find(p => p.id === postId);
  if (!post) return;
  
  // 只能置顶自己的帖子
  if (post.authorType !== 'user') {
    showToast('只能置顶自己的帖子');
    return;
  }
  
  // 如果要置顶，先取消其他置顶
  if (!post.isPinned) {
    forumPosts.forEach(p => {
      if (p.authorType === 'user' && p.isPinned) {
        p.isPinned = false;
      }
    });
  }
  
  post.isPinned = !post.isPinned;
  await localforage.setItem("forumPosts", forumPosts);
  
  showToast(post.isPinned ? '已置顶' : '已取消置顶');
  
  // 如果在个人主页，刷新显示
  if (window.currentForumSection === 'profile') {
    renderForumProfile();
  }
}

// ==================== 粉丝数量动态变化 ====================

// 更新用户粉丝数量
async function updateUserFollowers(action) {
  // 获取当前粉丝数
  let currentFollowers = forumSettings.userFollowers || 0;
  
  // 根据行为计算变化
  let change = 0;
  if (action === 'post') {
    // 发帖：+1到+10，偶尔-1到-3
    change = Math.random() > 0.15 
      ? Math.floor(Math.random() * 10) + 1  // 85%概率涨粉
      : -Math.floor(Math.random() * 3) - 1; // 15%概率掉粉
  } else if (action === 'comment') {
    // 评论：+0到+5，偶尔-1
    change = Math.random() > 0.2
      ? Math.floor(Math.random() * 6)       // 80%概率涨粉
      : -1;                                  // 20%概率掉1个粉
  }
  
  // 确保粉丝数不会变成负数
  currentFollowers = Math.max(0, currentFollowers + change);
  
  // 保存更新
  forumSettings.userFollowers = currentFollowers;
  forumSettings.userFollowersStr = formatFollowCount(currentFollowers);
  await localforage.setItem("forumSettings", forumSettings);
  
  // 如果粉丝变化明显，显示提示
  if (change > 3) {
    showToast(`粉丝 +${change} 🎉`);
  } else if (change < -1) {
    showToast(`粉丝 ${change} 😢`);
  }
}

// ==================== 私信功能 ====================

// 私信数据
let forumDirectMessages = [];

// 初始化私信数据
async function initDirectMessages() {
  forumDirectMessages = await localforage.getItem("forumDirectMessages") || [];
}

// 打开私信页面
async function openDirectMessages() {
  await initDirectMessages();
  
  const feed = document.getElementById("forumFeed");
  if (!feed) return;
  
  // 隐藏顶栏和底栏
  const tabs = document.querySelector('.forum-tabs');
  const fab = document.querySelector('.forum-fab');
  const bottomNav = document.querySelector('.forum-bottom-nav');
  if (tabs) tabs.style.display = 'none';
  if (fab) fab.style.display = 'none';
  if (bottomNav) bottomNav.style.display = 'none';
  
  // 渲染私信列表
  renderDirectMessagesList();
}

// 渲染私信列表
function renderDirectMessagesList() {
  const feed = document.getElementById("forumFeed");
  if (!feed) return;
  
  // 按最后消息时间排序
  const sortedConversations = [...forumDirectMessages].sort((a, b) => 
    (b.lastMessageTime || 0) - (a.lastMessageTime || 0)
  );
  
  const conversationsHtml = sortedConversations.length > 0 
    ? sortedConversations.map(conv => {
        const avatarContent = conv.avatar 
          ? `<img src="${conv.avatar}" alt="">` 
          : getAvatarEmoji(conv.name);
        const unreadBadge = conv.unread > 0 
          ? `<span class="forum-dm-unread">${conv.unread}</span>` 
          : '';
        const timeStr = conv.lastMessageTime ? formatForumTime(conv.lastMessageTime) : '';
        
        return `
          <div class="forum-dm-item" onclick="openDirectMessageChat('${conv.id}')">
            <div class="forum-dm-avatar">${avatarContent}</div>
            <div class="forum-dm-content">
              <div class="forum-dm-header">
                <span class="forum-dm-name">${escapeForumHtml(conv.name)}</span>
                <span class="forum-dm-time">${timeStr}</span>
              </div>
              <div class="forum-dm-preview">${escapeForumHtml(conv.lastMessage || '暂无消息')}</div>
            </div>
            ${unreadBadge}
          </div>
        `;
      }).join('')
    : '<div class="forum-dm-empty">暂无私信</div>';
  
  feed.innerHTML = `
    <div class="forum-dm-page">
      <div class="forum-dm-header-bar">
        <button class="forum-dm-back" onclick="closeDirectMessages()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <span class="forum-dm-title">私信</span>
        <button class="forum-dm-generate" onclick="generateNewDirectMessages()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </button>
      </div>
      <div class="forum-dm-list">
        ${conversationsHtml}
      </div>
    </div>
  `;
}

// 关闭私信页面
function closeDirectMessages() {
  const tabs = document.querySelector('.forum-tabs');
  const fab = document.querySelector('.forum-fab');
  const bottomNav = document.querySelector('.forum-bottom-nav');
  if (tabs) tabs.style.display = 'flex';
  if (fab) fab.style.display = 'flex';
  if (bottomNav) bottomNav.style.display = 'flex';
  
  renderForumProfile();
}

// 生成新的私信
async function generateNewDirectMessages() {
  const apiConfig = getActiveApiConfig();
  if (!apiConfig || !apiConfig.url || !apiConfig.key) {
    showToast("请先配置API");
    return;
  }
  
  showToast("正在生成私信...");
  
  // 收集已知的人（AI角色和NPC）
  const knownPeople = [];
  
  // AI角色（带完整人设）
  forumSettings.aiParticipants.forEach(p => {
    const char = characters.find(c => String(c.id) === String(p.charId));
    knownPeople.push({
      id: `ai_${p.charId}`,
      name: p.nickname || char?.name || '角色',
      avatar: p.avatar || char?.avatar || '',
      identity: p.identity || '',
      fullPersona: getCharacterFullPersona(p), // 使用完整人设
      type: 'ai',
    });
  });
  
  // NPC
  (forumSettings.npcs || []).forEach(npc => {
    knownPeople.push({
      id: `npc_${npc.id}`,
      name: npc.name,
      avatar: npc.avatar || '',
      identity: npc.identity || '',
      persona: npc.persona || '',
      type: 'npc',
    });
  });
  
  // 获取用户最近的帖子
  const userPosts = forumPosts
    .filter(p => p.authorType === 'user')
    .slice(0, 3)
    .map(p => p.content?.substring(0, 50));
  
  // 获取世界书内容
  const contextText = `${forumSettings.worldview}\n${userPosts.join('\n')}`;
  const worldbookContent = getForumWorldbookContent(contextText);
  
  try {
    const prompt = `你是一个私信生成器。请生成3-5条来自不同人的私信。

【世界观】${forumSettings.worldview || '现代都市'}
${worldbookContent ? '\n【世界书/详细设定】\n' + worldbookContent : ''}

【用户信息】
- 昵称：${forumSettings.userNickname || '用户'}
- 身份：${forumSettings.userIdentity || '普通用户'}
- 最近发帖：${userPosts.join('; ') || '无'}

【已知的人物（请按人设发私信）】
${knownPeople.length > 0 
  ? knownPeople.map((s, i) => `${i + 1}. ${s.name}\n人设：${s.fullPersona || s.identity || '普通用户'}`).join('\n\n')
  : '无'}

【人物关系】
${(forumSettings.relationships || []).map(rel => {
  const p1 = getForumPersonName(rel.person1Type, rel.person1Id);
  const p2 = getForumPersonName(rel.person2Type, rel.person2Id);
  return `${p1} 和 ${p2}：${rel.relationship}`;
}).join('\n') || '无特殊关系'}

请生成私信，返回纯JSON数组：
[
  {
    "senderName": "发送者昵称（可以是已知人物或随机网友）",
    "senderType": "known/random",
    "knownIndex": 如果是已知人物填序号(从0开始)否则填null,
    "content": "私信内容（必须符合该角色的人设和性格）"
  }
]

要求：
1. 生成3-5条来自【不同的人】的私信！每条私信来自不同的人
2. 已知人物发的私信必须符合其人设和性格特点！
3. 随机网友要有符合世界观的昵称，如"吃瓜小能手"、"路人甲"等
4. 私信内容可以是：问候、对用户帖子的私下评论、请教问题、分享趣事、搭讪等
5. 禁止使用[表情]格式，直接用emoji😊❤️
6. 只返回JSON`;

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
    
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const newMessages = JSON.parse(jsonMatch[0]);
      let addedCount = 0;
      const processedSenders = new Set(); // 跟踪本次已处理的发送者
      
      // 获取已有会话的已知人物ID
      const existingKnownIds = new Set(
        forumDirectMessages
          .filter(c => c.id.startsWith('ai_') || c.id.startsWith('npc_'))
          .map(c => c.id)
      );
      
      newMessages.forEach(msg => {
        let senderId, senderName, senderAvatar;
        
        if (msg.senderType === 'known' && msg.knownIndex !== null && knownPeople[msg.knownIndex]) {
          // 已知人物
          const known = knownPeople[msg.knownIndex];
          senderId = known.id;
          senderName = known.name;
          senderAvatar = known.avatar;
          
          // 如果这个已知人物已经有会话了，跳过不再发新私信
          if (existingKnownIds.has(senderId)) {
            return;
          }
        } else {
          // 随机网友
          senderId = `random_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          senderName = msg.senderName || '神秘网友';
          senderAvatar = '';
        }
        
        // 如果本次已经处理过这个发送者，跳过
        if (processedSenders.has(senderId)) {
          return;
        }
        processedSenders.add(senderId);
        
        // 创建新会话
        const conversation = {
          id: senderId,
          name: senderName,
          avatar: senderAvatar,
          messages: [{
            id: Date.now() + Math.random() * 1000,
            sender: 'other',
            content: msg.content,
            timestamp: Date.now(),
          }],
          unread: 1,
          lastMessage: msg.content,
          lastMessageTime: Date.now(),
        };
        forumDirectMessages.push(conversation);
        addedCount++;
      });
      
      await localforage.setItem("forumDirectMessages", forumDirectMessages);
      renderDirectMessagesList();
      if (addedCount > 0) {
        showToast(`收到 ${addedCount} 条新私信`);
      } else {
        showToast('暂无新私信');
      }
    }
  } catch (e) {
    console.error("[论坛] 生成私信失败:", e);
    showToast("生成失败: " + e.message);
  }
}

// 当前私信会话ID
let currentDMConversationId = null;

// 打开私信聊天
function openDirectMessageChat(conversationId) {
  const conversation = forumDirectMessages.find(c => c.id === conversationId);
  if (!conversation) return;
  
  currentDMConversationId = conversationId;
  
  // 标记为已读
  conversation.unread = 0;
  localforage.setItem("forumDirectMessages", forumDirectMessages);
  
  renderDirectMessageChat(conversation);
}

// 渲染私信聊天界面
function renderDirectMessageChat(conversation) {
  const feed = document.getElementById("forumFeed");
  if (!feed) return;
  
  const avatarContent = conversation.avatar 
    ? `<img src="${conversation.avatar}" alt="">` 
    : getAvatarEmoji(conversation.name);
  
  const messagesHtml = (conversation.messages || []).map(msg => {
    const isMine = msg.sender === 'user';
    return `
      <div class="forum-dm-message ${isMine ? 'mine' : 'other'}">
        ${!isMine ? `<div class="forum-dm-msg-avatar">${avatarContent}</div>` : ''}
        <div class="forum-dm-msg-bubble">${escapeForumHtml(msg.content)}</div>
      </div>
    `;
  }).join('');
  
  feed.innerHTML = `
    <div class="forum-dm-chat">
      <div class="forum-dm-chat-header">
        <button class="forum-dm-back" onclick="renderDirectMessagesList()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div class="forum-dm-chat-user">
          <div class="forum-dm-chat-avatar">${avatarContent}</div>
          <span class="forum-dm-chat-name">${escapeForumHtml(conversation.name)}</span>
        </div>
        <div style="width:36px;"></div>
      </div>
      
      <div class="forum-dm-messages" id="dmMessagesContainer">
        ${messagesHtml || '<div class="forum-dm-empty">开始聊天吧</div>'}
      </div>
      
      <div class="forum-dm-input-area">
        <input type="text" class="forum-dm-input" id="dmInput" placeholder="发送私信..." onkeypress="if(event.key==='Enter')sendDirectMessage()">
        <button class="forum-dm-generate-icon" onclick="generateDMReply()" title="生成回复">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </button>
        <button class="forum-dm-send" onclick="sendDirectMessage()">发送</button>
      </div>
    </div>
  `;
  
  // 滚动到底部
  setTimeout(() => {
    const container = document.getElementById('dmMessagesContainer');
    if (container) container.scrollTop = container.scrollHeight;
  }, 100);
}

// 发送私信
async function sendDirectMessage() {
  const input = document.getElementById('dmInput');
  const content = input?.value?.trim();
  if (!content || !currentDMConversationId) return;
  
  const conversation = forumDirectMessages.find(c => c.id === currentDMConversationId);
  if (!conversation) return;
  
  // 添加用户消息
  conversation.messages.push({
    id: Date.now(),
    sender: 'user',
    content: content,
    timestamp: Date.now(),
  });
  
  conversation.lastMessage = content;
  conversation.lastMessageTime = Date.now();
  
  await localforage.setItem("forumDirectMessages", forumDirectMessages);
  
  input.value = '';
  renderDirectMessageChat(conversation);
}

// 生成对方回复
async function generateDMReply() {
  if (!currentDMConversationId) return;
  
  const conversation = forumDirectMessages.find(c => c.id === currentDMConversationId);
  if (!conversation) return;
  
  const apiConfig = getActiveApiConfig();
  if (!apiConfig || !apiConfig.url || !apiConfig.key) {
    showToast("请先配置API");
    return;
  }
  
  showToast("正在生成回复...");
  
  // 获取对方信息（使用完整人设）
  let senderInfo = { name: conversation.name, identity: '', fullPersona: '' };
  
  // 检查是AI还是NPC
  if (conversation.id.startsWith('ai_')) {
    const charId = conversation.id.replace('ai_', '');
    const participant = forumSettings.aiParticipants.find(p => String(p.charId) === charId);
    if (participant) {
      senderInfo.identity = participant.identity || '';
      senderInfo.fullPersona = getCharacterFullPersona(participant); // 使用完整人设
    }
  } else if (conversation.id.startsWith('npc_')) {
    const npcId = conversation.id.replace('npc_', '');
    const npc = (forumSettings.npcs || []).find(n => String(n.id) === npcId);
    if (npc) {
      senderInfo.identity = npc.identity || '';
      senderInfo.fullPersona = npc.persona || '';
    }
  }
  
  // 获取最近的对话
  const recentMessages = conversation.messages.slice(-6).map(m => 
    `${m.sender === 'user' ? forumSettings.userNickname || '用户' : conversation.name}：${m.content}`
  ).join('\n');
  
  // 获取世界书内容
  const contextText = `${forumSettings.worldview}\n${recentMessages}`;
  const worldbookContent = getForumWorldbookContent(contextText);
  
  try {
    const prompt = `你正在扮演 ${conversation.name} 与用户私信聊天。

【世界观】${forumSettings.worldview}
${worldbookContent ? '\n【世界书/详细设定】\n' + worldbookContent : ''}

【${conversation.name}的完整人设】
${senderInfo.fullPersona || senderInfo.identity || '普通用户'}

【用户信息】
- 昵称：${forumSettings.userNickname || '用户'}
- 身份：${forumSettings.userIdentity || '普通用户'}

【最近对话】
${recentMessages}

请以${conversation.name}的身份回复最后一条消息。要求：
1. 必须符合角色的人设和性格特点！
2. 自然、简短
3. 禁止使用[表情]格式，用emoji代替
4. 只输出回复内容`;

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
    const reply = data.choices[0]?.message?.content?.trim() || "";
    
    if (reply) {
      conversation.messages.push({
        id: Date.now(),
        sender: 'other',
        content: reply,
        timestamp: Date.now(),
      });
      
      conversation.lastMessage = reply;
      conversation.lastMessageTime = Date.now();
      
      await localforage.setItem("forumDirectMessages", forumDirectMessages);
      renderDirectMessageChat(conversation);
    }
  } catch (e) {
    console.error("[论坛] 生成回复失败:", e);
    showToast("生成失败: " + e.message);
  }
}

function switchToHome() {
  // 显示顶栏和FAB
  const tabs = document.querySelector('.forum-tabs');
  const fab = document.querySelector('.forum-fab');
  if (tabs) tabs.style.display = 'flex';
  if (fab) fab.style.display = 'flex';
  
  // 更新底部导航
  document.querySelectorAll(".forum-nav-item").forEach((item, index) => {
    item.classList.toggle("active", index === 0);
  });
  
  renderForumFeed();
}

function formatJoinDate(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}年${month}月`;
}

// 更换头像
function changeProfileAvatar() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        localStorage.setItem("avatarImg", ev.target.result);
        renderForumProfile();
        showToast('头像已更新');
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

// 更换背景图
function changeProfileBanner() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        forumSettings.userBanner = ev.target.result;
        await localforage.setItem("forumSettings", forumSettings);
        renderForumProfile();
        showToast('背景已更新');
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

// 打开编辑个人资料弹窗
function openProfileEditor() {
  const globalAvatar = localStorage.getItem("avatarImg");
  const userAvatar = globalAvatar || getDefaultAvatarDataUrl();
  const userName = forumSettings.userNickname || "";
  const userHandle = forumSettings.userHandle || "";
  const userBio = forumSettings.userBio || "";
  const userBanner = forumSettings.userBanner || "";
  const userFollowing = forumSettings.userFollowing || 0;
  const userFollowers = forumSettings.userFollowers || 0;
  const userJoinDate = forumSettings.userJoinDate || formatJoinDate(Date.now());
  
  const modal = document.createElement('div');
  modal.id = 'forumProfileEditorModal';
  modal.className = 'forum-modal-overlay';
  modal.innerHTML = `
    <div class="forum-profile-editor">
      <div class="forum-profile-editor-header">
        <button class="forum-profile-editor-close" onclick="closeProfileEditor()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z"/>
          </svg>
        </button>
        <span class="forum-profile-editor-title">编辑个人资料</span>
        <button class="forum-profile-editor-save" onclick="saveProfileChanges()">保存</button>
      </div>
      
      <div class="forum-profile-editor-content">
        <!-- 背景图 -->
        <div class="forum-profile-editor-banner" onclick="document.getElementById('profileBannerInput').click()">
          ${userBanner 
            ? `<img src="${userBanner}" alt="">` 
            : '<div class="forum-profile-banner-placeholder"></div>'}
          <div class="forum-profile-editor-banner-overlay">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
              <path d="M9.697 3H11v2h-.697l-2 2H5c-.276 0-.5.224-.5.5v11c0 .276.224.5.5.5h14c.276 0 .5-.224.5-.5V10h2v8.5c0 1.381-1.119 2.5-2.5 2.5H5c-1.381 0-2.5-1.119-2.5-2.5v-11C2.5 6.119 3.619 5 5 5h1.697l2-2zM12 10.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5zm0-2c2.485 0 4.5 2.015 4.5 4.5s-2.015 4.5-4.5 4.5-4.5-2.015-4.5-4.5 2.015-4.5 4.5-4.5zM17 2c0 1.657-1.343 3-3 3v1c1.657 0 3 1.343 3 3h1c0-1.657 1.343-3 3-3V5c-1.657 0-3-1.343-3-3h-1z"/>
            </svg>
          </div>
          <input type="file" id="profileBannerInput" accept="image/*" style="display:none" onchange="previewProfileBanner(this)">
        </div>
        
        <!-- 头像 -->
        <div class="forum-profile-editor-avatar" onclick="document.getElementById('profileAvatarInput').click()">
          <img src="${userAvatar}" alt="" id="profileAvatarPreview">
          <div class="forum-profile-editor-avatar-overlay">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
              <path d="M9.697 3H11v2h-.697l-2 2H5c-.276 0-.5.224-.5.5v11c0 .276.224.5.5.5h14c.276 0 .5-.224.5-.5V10h2v8.5c0 1.381-1.119 2.5-2.5 2.5H5c-1.381 0-2.5-1.119-2.5-2.5v-11C2.5 6.119 3.619 5 5 5h1.697l2-2zM12 10.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5zm0-2c2.485 0 4.5 2.015 4.5 4.5s-2.015 4.5-4.5 4.5-4.5-2.015-4.5-4.5 2.015-4.5 4.5-4.5z"/>
            </svg>
          </div>
          <input type="file" id="profileAvatarInput" accept="image/*" style="display:none" onchange="previewProfileAvatar(this)">
        </div>
        
        <!-- 表单 -->
        <div class="forum-profile-editor-form">
          <div class="forum-profile-editor-field">
            <label>昵称</label>
            <input type="text" id="profileNameInput" value="${escapeForumHtml(userName)}" placeholder="你的昵称" maxlength="30">
          </div>
          
          <div class="forum-profile-editor-field">
            <label>用户名</label>
            <div class="forum-input-with-prefix" style="background:#fff;border:1px solid #cfd9de;">
              <span class="forum-input-prefix">@</span>
              <input type="text" id="profileHandleInput" value="${escapeForumHtml(userHandle)}" placeholder="your_handle" class="forum-input-handle" style="background:transparent;">
            </div>
          </div>
          
          <div class="forum-profile-editor-field">
            <label>个人简介</label>
            <textarea id="profileBioInput" placeholder="介绍一下你自己" maxlength="160" rows="3">${escapeForumHtml(userBio)}</textarea>
          </div>
          
          <div class="forum-profile-editor-field">
            <label>加入时间</label>
            <input type="text" id="profileJoinDateInput" value="${escapeForumHtml(userJoinDate)}" placeholder="如: 2024年1月">
          </div>
          
          <div class="forum-profile-editor-field-row">
            <div class="forum-profile-editor-field forum-profile-editor-field-half">
              <label>正在关注</label>
              <input type="text" id="profileFollowingInput" value="${formatFollowCount(userFollowing)}" placeholder="如: 32, 1.2K, 5M">
            </div>
            <div class="forum-profile-editor-field forum-profile-editor-field-half">
              <label>关注者</label>
              <input type="text" id="profileFollowersInput" value="${formatFollowCount(userFollowers)}" placeholder="如: 96, 10K, 1M">
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  modal.onclick = (e) => {
    if (e.target === modal) closeProfileEditor();
  };
  document.body.appendChild(modal);
}

function closeProfileEditor() {
  const modal = document.getElementById('forumProfileEditorModal');
  if (modal) modal.remove();
}

function previewProfileAvatar(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('profileAvatarPreview');
      if (preview) preview.src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function previewProfileBanner(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const container = input.closest('.forum-profile-editor-banner');
      if (container) {
        const img = container.querySelector('img') || document.createElement('img');
        img.src = e.target.result;
        if (!container.querySelector('img')) {
          container.insertBefore(img, container.firstChild);
          const placeholder = container.querySelector('.forum-profile-banner-placeholder');
          if (placeholder) placeholder.remove();
        }
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function saveProfileChanges() {
  const name = document.getElementById('profileNameInput')?.value?.trim() || '';
  const handle = document.getElementById('profileHandleInput')?.value?.trim() || '';
  const bio = document.getElementById('profileBioInput')?.value || '';
  const joinDate = document.getElementById('profileJoinDateInput')?.value?.trim() || '';
  const avatarPreview = document.getElementById('profileAvatarPreview')?.src || '';
  const bannerContainer = document.querySelector('.forum-profile-editor-banner img');
  const banner = bannerContainer?.src || '';
  const followingStr = document.getElementById('profileFollowingInput')?.value?.trim() || '0';
  const followersStr = document.getElementById('profileFollowersInput')?.value?.trim() || '0';
  
  // 解析关注数（支持K、M单位）
  const following = parseFollowCount(followingStr);
  const followers = parseFollowCount(followersStr);
  
  // 保存头像到localStorage
  if (avatarPreview && !avatarPreview.includes('data:image/svg+xml')) {
    localStorage.setItem("avatarImg", avatarPreview);
  }
  
  // 保存其他信息到forumSettings
  forumSettings.userNickname = name;
  forumSettings.userHandle = handle;
  forumSettings.userBio = bio;
  forumSettings.userJoinDate = joinDate || formatJoinDate(Date.now());
  forumSettings.userFollowing = following;
  forumSettings.userFollowers = followers;
  forumSettings.userFollowingStr = followingStr; // 保存原始字符串用于显示
  forumSettings.userFollowersStr = followersStr;
  if (banner && !banner.includes('forum-profile-banner-placeholder')) {
    forumSettings.userBanner = banner;
  }
  
  await localforage.setItem("forumSettings", forumSettings);
  
  closeProfileEditor();
  renderForumProfile();
  showToast('个人资料已更新');
}

// 解析关注数（支持K、M、B单位）
function parseFollowCount(str) {
  if (!str) return 0;
  str = str.toString().trim().toUpperCase();
  
  // 如果是纯数字
  if (/^\d+$/.test(str)) {
    return parseInt(str);
  }
  
  // 匹配带单位的数字，如 1.2K, 5M, 1B
  const match = str.match(/^([\d.]+)\s*([KMB])?$/i);
  if (match) {
    let num = parseFloat(match[1]);
    const unit = match[2]?.toUpperCase();
    
    if (unit === 'K') num *= 1000;
    else if (unit === 'M') num *= 1000000;
    else if (unit === 'B') num *= 1000000000;
    
    return Math.round(num);
  }
  
  return 0;
}

// 格式化关注数为带单位的字符串
function formatFollowCount(num) {
  if (!num || num === 0) return '0';
  num = parseInt(num);
  
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (num >= 10000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else {
    return num.toString();
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
window.editForumParticipant = editForumParticipant;
window.previewForumParticipantAvatar = previewForumParticipantAvatar;
window.removeForumParticipant = removeForumParticipant;
window.openAddForumNpc = openAddForumNpc;
window.editForumNpc = editForumNpc;
window.previewForumNpcAvatar = previewForumNpcAvatar;
window.confirmSaveNpc = confirmSaveNpc;
window.removeForumNpc = removeForumNpc;
window.openAddForumRelationship = openAddForumRelationship;
window.editForumRelationship = editForumRelationship;
window.confirmSaveRelationship = confirmSaveRelationship;
window.removeForumRelationship = removeForumRelationship;
window.openForumCompose = openForumCompose;
window.closeForumCompose = closeForumCompose;
window.submitForumPost = submitForumPost;
window.submitForumComment = submitForumComment;
window.replyToForumComment = replyToForumComment;
window.cancelForumReply = cancelForumReply;
window.updateForumCommentInput = updateForumCommentInput;
window.toggleForumPostLike = toggleForumPostLike;
window.toggleForumCommentLike = toggleForumCommentLike;
window.generateForumPosts = generateForumPosts;
window.generateMoreComments = generateMoreComments;
window.generateCommentsForNewPost = generateCommentsForNewPost;
window.generateInteractionsForNewPost = generateInteractionsForNewPost;
window.switchForumTab = switchForumTab;
window.switchForumSection = switchForumSection;
window.switchToHome = switchToHome;
window.renderForumProfile = renderForumProfile;
window.renderProfileReplyItem = renderProfileReplyItem;
window.changeProfileAvatar = changeProfileAvatar;
window.changeProfileBanner = changeProfileBanner;
window.openProfileEditor = openProfileEditor;
window.closeProfileEditor = closeProfileEditor;
window.previewProfileAvatar = previewProfileAvatar;
window.previewProfileBanner = previewProfileBanner;
window.saveProfileChanges = saveProfileChanges;
window.showRetweetMenu = showRetweetMenu;
window.openQuoteRetweet = openQuoteRetweet;
window.closeQuoteRetweet = closeQuoteRetweet;
window.submitQuoteRetweet = submitQuoteRetweet;
window.retweetToChat = retweetToChat;
window.retweetToProfile = retweetToProfile;
window.showForumImageDesc = showForumImageDesc;
window.showForumFullImage = showForumFullImage;
window.sendRetweetToChar = sendRetweetToChar;
window.renderRetweetCard = renderRetweetCard;
window.openForumPostFromCard = openForumPostFromCard;
window.handleComposeImageUpload = handleComposeImageUpload;
window.insertImagePlaceholder = insertImagePlaceholder;
window.renderComposeImages = renderComposeImages;
window.removeComposeImage = removeComposeImage;
window.renderForumComposeUserInfo = renderForumComposeUserInfo;
window.parseFollowCount = parseFollowCount;
window.formatFollowCount = formatFollowCount;
window.renderForumHot = renderForumHot;
window.searchForumTopic = searchForumTopic;
window.focusHotSearch = focusHotSearch;
window.handleHotSearchInput = handleHotSearchInput;
window.handleHotSearchKeydown = handleHotSearchKeydown;
window.executeHotSearch = executeHotSearch;
window.refreshSearchResults = refreshSearchResults;
window.generateTopicPosts = generateTopicPosts;
window.showSearchResults = showSearchResults;
window.showSearchError = showSearchError;
window.handleForumRefresh = handleForumRefresh;
window.renderDetailImages = renderDetailImages;
window.openOtherUserProfile = openOtherUserProfile;
window.renderOtherUserProfile = renderOtherUserProfile;
window.closeOtherUserProfile = closeOtherUserProfile;
window.generateUserProfilePosts = generateUserProfilePosts;
window.togglePinPost = togglePinPost;
window.currentViewingUser = currentViewingUser;
window.previewForumParticipantBanner = previewForumParticipantBanner;
window.previewForumNpcBanner = previewForumNpcBanner;
window.updateUserFollowers = updateUserFollowers;
window.openDirectMessages = openDirectMessages;
window.closeDirectMessages = closeDirectMessages;
window.renderDirectMessagesList = renderDirectMessagesList;
window.generateNewDirectMessages = generateNewDirectMessages;
window.openDirectMessageChat = openDirectMessageChat;
window.renderDirectMessageChat = renderDirectMessageChat;
window.sendDirectMessage = sendDirectMessage;
window.generateDMReply = generateDMReply;
// 世界书绑定相关
window.renderForumWorldbookBindings = renderForumWorldbookBindings;
window.openForumWorldbookSelector = openForumWorldbookSelector;
window.closeForumWorldbookSelector = closeForumWorldbookSelector;
window.addForumWorldbook = addForumWorldbook;
window.removeForumWorldbook = removeForumWorldbook;
window.getForumWorldbookContent = getForumWorldbookContent;
window.getCharacterFullPersona = getCharacterFullPersona;

// 页面加载时初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initForumApp);
} else {
  initForumApp();
}
