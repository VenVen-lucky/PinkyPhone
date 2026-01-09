// ==================== 【新】全局变量集中声明与初始化 ====================
// 1. 先把所有变量定义在 window 上，初始为空
window.fontPresets = [];
window.activeFontId = "system";
window.readTogetherData = {};
window.characters = []; // 以前散落在 1827 行
window.apiPresets = []; // 以前散落在 1898 行
window.chatHistories = {}; // 以前散落在 2095 行
window.chatSettings = {}; // 以前散落在 2445 行
window.userPersonaPresets = []; // 以前散落在 2660 行
window.bookshelfData = []; // 以前散落在 3175 行
window.voiceConfig = {}; // 以前散落在 2980 行

// 世界书系统变量
window.worldbooks = []; // 世界书列表
window.worldbookGroups = []; // 世界书分组
window.worldbookBatchMode = false; // 批量操作模式
window.worldbookSelectedIds = new Set(); // 批量选中的世界书ID
window.currentWorldbookFilter = "all"; // 当前筛选分组
window.editingWorldbookId = null; // 正在编辑的世界书ID
window.editingEntryIndex = null; // 正在编辑的条目索引
window.tempWorldbookEntries = []; // 临时条目列表

// 全局安全读取函数，处理数据损坏情况
async function safeLocalforageGet(key) {
  try {
    return await localforage.getItem(key);
  } catch (e) {
    console.warn(`读取 ${key} 失败:`, e.message);
    return null;
  }
}

// 2. 创建一个异步启动函数
async function initApp() {
  try {
    console.log("正在通过 localforage 加载数据...");

    // 使用全局安全读取函数
    const safeGet = safeLocalforageGet;

    // 并行读取所有数据，速度更快
    const values = await Promise.all([
      safeGet("fontPresets"),
      safeGet("activeFontId"),
      safeGet("readTogetherData"),
      safeGet("characters"),
      safeGet("apiPresets"),
      safeGet("chatHistories"),
      safeGet("chatSettings"),
      safeGet("userPersonaPresets"),
      safeGet("bookshelfData"),
      safeGet("voiceConfig"),
      safeGet("avatarImg"),
      safeGet("activePresetId"),
      safeGet("worldbooks"),
      safeGet("worldbookGroups"),
      safeGet("groupChats"), // 添加群聊数据加载
    ]);

    // 赋值（如果读取为 null，就用默认值）
    window.fontPresets = values[0] || [];
    window.activeFontId = values[1] || "system";
    window.readTogetherData = values[2] || {};

    // 刷新页面时自动关闭所有角色的读书模式
    Object.keys(window.readTogetherData).forEach((charId) => {
      if (window.readTogetherData[charId]) {
        window.readTogetherData[charId].active = false;
      }
    });
    // 保存关闭状态
    localforage.setItem("readTogetherData", window.readTogetherData);

    window.characters = values[3] || [];
    window.apiPresets = values[4] || [];
    window.chatHistories = values[5] || {};
    window.chatSettings = values[6] || {};
    window.userPersonaPresets = values[7] || [];
    window.bookshelfData = values[8] || [];
    window.voiceConfig = values[9] || {};

    const avatarImg = values[10];

    // 保存到全局变量，供后面API预设模块使用
    window.savedActivePresetId = values[11] || null;

    // 世界书数据
    window.worldbooks = values[12] || [];
    window.worldbookGroups = values[13] || [];

    // 群聊数据
    groupChats = values[14] || [];

    // 【✓ 关键修复开始】
    // 必须手动更新 activePresetId 变量，否则界面渲染时不知道刚才读到了什么
    if (window.savedActivePresetId) {
      activePresetId = window.savedActivePresetId;
    }
    // 【✓ 关键修复结束】
    // 加载头像
    if (avatarImg) {
      const img = document.getElementById("avatarImg");
      const ph = document.getElementById("avatarPlaceholder");
      if (img && ph) {
        img.src = avatarImg;
        img.style.display = "block";
        ph.style.display = "none";
      }
    }

    // 加载个人资料 (Profile)
    const fields = ["name", "handle", "bio", "location"];
    const elementMap = {
      name: "profileName",
      handle: "profileHandle",
      bio: "profileBio",
      location: "profileLocation",
    };
    for (const field of fields) {
      const val = await safeGet("profile_" + field);
      if (val) {
        const el = document.getElementById(elementMap[field]);
        if (el) {
          if (field === "handle") el.textContent = "@" + val.replace("@", "");
          else el.textContent = val;
        }
      }
    }

    console.log("数据加载完成，开始渲染界面...");

    // 数据到位了，再调用原来的渲染函数
    // 注意：这里替换了原来的 window.onload 或 DOMContentLoaded 里的逻辑
    renderCharacters();
    renderApiPresets();
    updateActiveConfigDisplay(); // 更新当前激活的API配置显示
    loadVoiceSettings();
    initUserPersonaPresets();
    initPresetSystem(); // 初始化预设系统
    loadSavedData(); // 加载名片、标签、小组件数据

    // 如果有自定义字体，应用它
    if (window.activeFontId !== "system") {
      const font = window.fontPresets.find((f) => f.id == window.activeFontId);
      if (font) injectGlobalFont(font.source);
    }
  } catch (err) {
    console.error("初始化失败:", err);

    // 使用默认值初始化，不清除数据
    console.warn("部分数据加载失败，使用默认值继续...");

    window.fontPresets = window.fontPresets || [];
    window.activeFontId = window.activeFontId || "system";
    window.readTogetherData = window.readTogetherData || {};
    window.characters = window.characters || [];
    window.apiPresets = window.apiPresets || [];
    window.chatHistories = window.chatHistories || {};
    window.chatSettings = window.chatSettings || {};
    window.userPersonaPresets = window.userPersonaPresets || [];
    window.bookshelfData = window.bookshelfData || [];
    window.voiceConfig = window.voiceConfig || {};
    window.savedActivePresetId = window.savedActivePresetId || null;
    window.worldbooks = window.worldbooks || [];
    window.worldbookGroups = window.worldbookGroups || [];

    // 尝试渲染界面
    try {
      renderCharacters();
      renderApiPresets();
      updateActiveConfigDisplay();
      loadVoiceSettings();
      initUserPersonaPresets();
      initPresetSystem();
      loadSavedData(); // 加载名片、标签、小组件数据
    } catch (renderErr) {
      console.error("渲染失败:", renderErr);
    }
  }
}

// 3. 启动！
document.addEventListener("DOMContentLoaded", initApp);

// ==================== 预设系统 ====================
window.presets = [];
window.presetBatchMode = false;
window.selectedPresetIds = [];
window.editingPresetId = null;
window.currentPresetFilter = "all";
window.currentPresetEntries = [];

// 初始化预设系统
async function initPresetSystem() {
  try {
    let savedPresets = null;
    try {
      savedPresets = await safeLocalforageGet("userPresets");
    } catch (e) {
      console.warn("读取预设数据失败:", e.message);
    }
    window.presets = savedPresets || [];
    console.log("✓ 预设系统初始化完成，共", window.presets.length, "个预设");
  } catch (e) {
    console.error("预设加载失败:", e);
    window.presets = [];
  }
}

// 渲染预设列表
function renderPresets() {
  const list = document.getElementById("presetList");
  if (!list) return;

  let filteredPresets = window.presets;
  if (window.currentPresetFilter !== "all") {
    filteredPresets = window.presets.filter(
      (p) => p.category === window.currentPresetFilter
    );
  }

  if (filteredPresets.length === 0) {
    list.innerHTML = `
      <div class="preset-empty">
        <div class="preset-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></div>
        <div class="preset-empty-text">还没有预设哦~</div>
        <button class="preset-empty-btn" onclick="openPresetModal()">创建第一个预设</button>
      </div>
    `;
    return;
  }

  list.innerHTML = filteredPresets
    .map((preset) => {
      const isSelected = window.selectedPresetIds.includes(preset.id);
      const batchClass = window.presetBatchMode ? "batch-mode" : "";
      const checkedClass = isSelected ? "checked" : "";

      const categoryLabels = {
        character: "角色",
        style: "文风",
        scene: "场景",
      };

      const entryCount = preset.entries ? preset.entries.length : 0;
      const enabledCount = preset.entries
        ? preset.entries.filter((e) => e.enabled).length
        : 0;

      return `
      <div class="preset-item ${batchClass}" onclick="handlePresetClick('${
        preset.id
      }')" oncontextmenu="startPresetBatchMode(event, '${preset.id}')">
        <div class="preset-item-header">
          <div class="preset-item-icon">${preset.icon || "○"}</div>
          <div class="preset-item-info">
            <div class="preset-item-name">${preset.name}</div>
            <div class="preset-item-desc">${
              preset.description || "暂无描述"
            }</div>
          </div>
          <div class="preset-item-checkbox ${checkedClass}" onclick="event.stopPropagation(); togglePresetSelect('${
        preset.id
      }')">
            ${isSelected ? "✓" : ""}
          </div>
        </div>
        <div class="preset-item-tags">
          <span class="preset-item-tag">${
            categoryLabels[preset.category] || "📌 其他"
          }</span>
          <span class="preset-item-tag">≡ ${enabledCount}/${entryCount} 条目</span>
        </div>
        ${
          !window.presetBatchMode
            ? `
        <div class="preset-item-actions">
          <button class="preset-action-btn edit" onclick="event.stopPropagation(); editPreset('${preset.id}')">✏️ 编辑</button>
          <button class="preset-action-btn export" onclick="event.stopPropagation(); exportPreset('${preset.id}')">↑ 导出</button>
          <button class="preset-action-btn delete" onclick="event.stopPropagation(); deleteSinglePreset('${preset.id}')">✕ 删除</button>
        </div>
        `
            : ""
        }
      </div>
    `;
    })
    .join("");
}

// 切换预设标签页
function switchPresetTab(tab) {
  window.currentPresetFilter = tab;
  document
    .querySelectorAll(".preset-tab")
    .forEach((t) => t.classList.remove("active"));
  event.target.classList.add("active");
  renderPresets();
}

// 当前编辑中的预设条目
window.currentPresetEntries = [];

// 打开预设编辑弹窗
function openPresetModal(presetId = null) {
  window.editingPresetId = presetId;
  const modal = document.getElementById("stylePresetModal");
  const title = document.getElementById("stylePresetModalTitle");

  if (presetId) {
    title.textContent = "编辑预设";
    const preset = window.presets.find((p) => p.id === presetId);
    console.log("编辑预设:", preset);
    console.log("预设entries:", preset?.entries);

    if (preset) {
      document.getElementById("stylePresetName").value = preset.name || "";
      document.getElementById("stylePresetCategory").value =
        preset.category || "character";
      document.getElementById("stylePresetIcon").value = preset.icon || "";
      document.getElementById("stylePresetDesc").value =
        preset.description || "";
      // 加载条目 - 兼容旧格式
      if (
        preset.entries &&
        Array.isArray(preset.entries) &&
        preset.entries.length > 0
      ) {
        window.currentPresetEntries = JSON.parse(
          JSON.stringify(preset.entries)
        );
        console.log("加载了entries:", window.currentPresetEntries.length, "个");
      } else if (preset.content) {
        // 旧格式：把content转换为单个条目
        window.currentPresetEntries = [
          {
            id: "entry_" + Date.now(),
            name: "主要内容",
            keywords: "",
            content: preset.content,
            enabled: true,
          },
        ];
        console.log("从content转换为条目");
      } else {
        window.currentPresetEntries = [];
        console.log("没有找到entries或content");
      }
    }
  } else {
    title.textContent = "创建预设";
    document.getElementById("stylePresetName").value = "";
    document.getElementById("stylePresetCategory").value = "character";
    document.getElementById("stylePresetIcon").value = "";
    document.getElementById("stylePresetDesc").value = "";
    window.currentPresetEntries = [];
  }

  console.log("准备渲染，currentPresetEntries:", window.currentPresetEntries);
  window.presetEntryDisplayLimit = 20; // 重置显示限制
  renderPresetEntries();
  modal.classList.add("active");
}

// 当前显示的条目数量限制
window.presetEntryDisplayLimit = 20;

// 渲染预设条目列表
function renderPresetEntries() {
  const list = document.getElementById("presetEntriesList");
  if (!list) {
    console.error("找不到presetEntriesList元素");
    return;
  }

  console.log(
    "渲染条目，数量:",
    window.currentPresetEntries ? window.currentPresetEntries.length : 0
  );

  if (
    !window.currentPresetEntries ||
    window.currentPresetEntries.length === 0
  ) {
    list.innerHTML =
      '<div style="text-align:center;color:#999;padding:30px;background:rgba(255,255,255,0.8);border-radius:12px;">暂无条目，点击下方按钮添加</div>';
    return;
  }

  // 限制显示数量
  const displayEntries = window.currentPresetEntries.slice(
    0,
    window.presetEntryDisplayLimit
  );
  const hasMore =
    window.currentPresetEntries.length > window.presetEntryDisplayLimit;

  try {
    let html = displayEntries
      .map((entry, index) => {
        const escapedName = presetEscapeHtml(entry.name || "");
        const escapedKeywords = presetEscapeHtml(entry.keywords || "");
        const escapedContent = presetEscapeHtml(entry.content || "");

        return `
      <div data-index="${index}" style="background:#faf8f5 !important;border:1.5px solid rgba(255,182,193,0.5) !important;border-radius:12px !important;margin-bottom:12px !important;overflow:visible !important;display:block !important;visibility:visible !important;opacity:1 !important;height:auto !important;">
        <div style="display:flex !important;align-items:center !important;padding:12px !important;gap:10px !important;background:rgba(255,255,255,0.7) !important;border-bottom:1px solid rgba(255,182,193,0.3) !important;visibility:visible !important;opacity:1 !important;height:auto !important;">
          <div onclick="togglePresetEntry(${index})" style="width:44px !important;height:24px !important;min-width:44px !important;min-height:24px !important;background:${
          entry.enabled ? "linear-gradient(135deg,#f48fb1,#f06292)" : "#ddd"
        } !important;border-radius:12px !important;position:relative !important;cursor:pointer !important;flex-shrink:0 !important;display:block !important;">
            <div style="position:absolute !important;top:2px !important;${
              entry.enabled ? "left:22px" : "left:2px"
            } !important;width:20px !important;height:20px !important;background:white !important;border-radius:50% !important;box-shadow:0 1px 3px rgba(0,0,0,0.2) !important;"></div>
          </div>
          <input type="text" value="${escapedName}" placeholder="备注 (可选)" onchange="updatePresetEntry(${index}, 'name', this.value)"
            style="flex:1 !important;padding:10px 12px !important;border:1.5px solid #e5ddd3 !important;border-radius:8px !important;font-size:0.95rem !important;outline:none !important;background:white !important;display:block !important;visibility:visible !important;height:auto !important;">
          <button onclick="deletePresetEntry(${index})" style="width:32px !important;height:32px !important;min-width:32px !important;min-height:32px !important;border:none !important;background:rgba(255,100,100,0.15) !important;color:#e57373 !important;border-radius:8px !important;cursor:pointer !important;font-size:18px !important;display:flex !important;align-items:center !important;justify-content:center !important;flex-shrink:0 !important;">✕</button>
        </div>
        <div style="padding:12px !important;background:#faf8f5 !important;display:block !important;visibility:visible !important;opacity:1 !important;height:auto !important;">
          <div style="margin-bottom:10px !important;display:block !important;visibility:visible !important;">
            <div style="font-size:0.8rem !important;color:#8a6a7f !important;margin-bottom:4px !important;display:block !important;">关键词 (用英文逗号,分隔)</div>
            <input type="text" value="${escapedKeywords}" placeholder="例如: key1, key2" onchange="updatePresetEntry(${index}, 'keywords', this.value)"
              style="width:100% !important;padding:10px 12px !important;border:1.5px solid #e5ddd3 !important;border-radius:8px !important;font-size:0.9rem !important;outline:none !important;background:white !important;box-sizing:border-box !important;display:block !important;">
          </div>
          <div style="display:flex !important;align-items:center !important;justify-content:space-between !important;visibility:visible !important;">
            <span style="font-size:0.8rem !important;color:#8a6a7f !important;display:inline !important;">内容 (点击右侧展开)</span>
            <button onclick="toggleEntryContent(${index})" style="padding:6px 12px !important;border:none !important;background:rgba(244,143,177,0.2) !important;color:#c2185b !important;border-radius:6px !important;font-size:0.85rem !important;cursor:pointer !important;display:inline-block !important;">展开</button>
          </div>
        </div>
        <div id="entryContent_${index}" style="display:none;padding:0 12px 12px 12px !important;background:#faf8f5 !important;">
          <textarea placeholder="输入预设内容..." onchange="updatePresetEntry(${index}, 'content', this.value)"
            style="width:100% !important;min-height:100px !important;padding:10px 12px !important;border:1.5px solid #e5ddd3 !important;border-radius:8px !important;font-size:0.9rem !important;outline:none !important;background:white !important;box-sizing:border-box !important;resize:vertical !important;font-family:inherit !important;line-height:1.5 !important;">${escapedContent}</textarea>
        </div>
      </div>
    `;
      })
      .join("");

    // 如果还有更多条目，显示加载更多按钮
    if (hasMore) {
      const remaining =
        window.currentPresetEntries.length - window.presetEntryDisplayLimit;
      html += `
        <div style="text-align:center;padding:15px;">
          <button onclick="loadMorePresetEntries()" style="padding:10px 20px;background:linear-gradient(135deg,#f48fb1,#f06292);color:white;border:none;border-radius:20px;font-size:0.9rem;cursor:pointer;">
            加载更多 (还有 ${remaining} 个条目)
          </button>
        </div>
      `;
    }

    // 显示条目统计
    const enabledCount = window.currentPresetEntries.filter(
      (e) => e.enabled
    ).length;
    html =
      `<div style="text-align:center;padding:8px;color:#8a6a7f;font-size:0.85rem;background:rgba(255,255,255,0.6);border-radius:8px;margin-bottom:10px;">
      共 ${window.currentPresetEntries.length} 个条目，已启用 ${enabledCount} 个
    </div>` + html;

    console.log("生成的HTML长度:", html.length);
    list.innerHTML = html;
    console.log("渲染完成，list子元素数量:", list.children.length);
  } catch (err) {
    console.error("渲染条目出错:", err);
    list.innerHTML =
      '<div style="color:red;padding:20px;">渲染出错: ' +
      err.message +
      "</div>";
  }
}

// 加载更多条目
function loadMorePresetEntries() {
  window.presetEntryDisplayLimit += 20;
  renderPresetEntries();
}

// HTML转义函数
function presetEscapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// 添加新条目
function addPresetEntry() {
  console.log("添加新条目，当前数量:", window.currentPresetEntries.length);
  window.currentPresetEntries.push({
    id: "entry_" + Date.now(),
    name: "",
    keywords: "",
    content: "",
    enabled: true,
  });
  // 增加显示限制以确保新条目可见
  window.presetEntryDisplayLimit = Math.max(
    window.presetEntryDisplayLimit,
    window.currentPresetEntries.length
  );
  renderPresetEntries();
  // 滚动到底部显示新条目
  setTimeout(() => {
    const list = document.getElementById("presetEntriesList");
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, 100);
  console.log("添加后数量:", window.currentPresetEntries.length);
}

// 切换条目开关
function togglePresetEntry(index) {
  if (window.currentPresetEntries[index]) {
    window.currentPresetEntries[index].enabled =
      !window.currentPresetEntries[index].enabled;
    renderPresetEntries();
  }
}

// 更新条目字段
function updatePresetEntry(index, field, value) {
  if (window.currentPresetEntries[index]) {
    window.currentPresetEntries[index][field] = value;
  }
}

// 删除条目
function deletePresetEntry(index) {
  window.currentPresetEntries.splice(index, 1);
  renderPresetEntries();
}

// 展开/收起条目内容
function toggleEntryContent(index) {
  const wrapper = document.getElementById(`entryContent_${index}`);
  if (wrapper) {
    const isHidden =
      wrapper.style.display === "none" || wrapper.style.display === "";
    wrapper.style.display = isHidden ? "block" : "none";

    // 找到对应的按钮并更新文字
    const card = wrapper.parentElement;
    if (card) {
      const btn = card.querySelector('button[onclick*="toggleEntryContent"]');
      if (btn) {
        btn.textContent = isHidden ? "收起" : "展开";
      }
    }
  }
}

// 关闭预设编辑弹窗
function closePresetModal() {
  document.getElementById("stylePresetModal").classList.remove("active");
  window.editingPresetId = null;
  window.currentPresetEntries = [];
}

// 保存预设
async function savePreset() {
  const name = document.getElementById("stylePresetName").value.trim();
  const category = document.getElementById("stylePresetCategory").value;
  const icon = document.getElementById("stylePresetIcon").value.trim() || "○";
  const description = document.getElementById("stylePresetDesc").value.trim();

  if (!name) {
    showToast("请输入预设名称");
    return;
  }
  if (window.currentPresetEntries.length === 0) {
    showToast("请至少添加一个条目");
    return;
  }

  const preset = {
    id: window.editingPresetId || "preset_" + Date.now(),
    name,
    category,
    icon,
    description,
    entries: window.currentPresetEntries,
    createdAt: window.editingPresetId
      ? window.presets.find((p) => p.id === window.editingPresetId)
          ?.createdAt || Date.now()
      : Date.now(),
    updatedAt: Date.now(),
  };

  if (window.editingPresetId) {
    const index = window.presets.findIndex(
      (p) => p.id === window.editingPresetId
    );
    if (index !== -1) {
      window.presets[index] = preset;
    }
  } else {
    window.presets.push(preset);
  }

  await localforage.setItem("userPresets", window.presets);
  closePresetModal();
  renderPresets();
  updateOfflinePresetDropdown();
  showToast(window.editingPresetId ? "预设已更新" : "预设已创建");
}

// 编辑预设
function editPreset(presetId) {
  openPresetModal(presetId);
}

// 删除单个预设
async function deleteSinglePreset(presetId) {
  if (!confirm("确定要删除这个预设吗？")) return;

  window.presets = window.presets.filter((p) => p.id !== presetId);
  await localforage.setItem("userPresets", window.presets);
  renderPresets();
  updateOfflinePresetDropdown();
  showToast("预设已删除");
}

// 导出预设
function exportPreset(presetId) {
  const preset = window.presets.find((p) => p.id === presetId);
  if (!preset) return;

  // 转换为Silly Tavern兼容格式
  const exportData = {
    name: preset.name,
    description: preset.description,
    content: preset.content,
    category: preset.category,
    icon: preset.icon,
    minWords: preset.minWords,
    maxWords: preset.maxWords,
    // 兼容Silly Tavern的字段
    prompt: preset.content,
    system_prompt: preset.content,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `preset_${preset.name}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("预设已导出");
}

// 处理预设点击
function handlePresetClick(presetId) {
  if (window.presetBatchMode) {
    togglePresetSelect(presetId);
  } else {
    // 可以在这里添加预览功能
  }
}

// 开始批量模式
function startPresetBatchMode(e, presetId) {
  e.preventDefault();
  window.presetBatchMode = true;
  window.selectedPresetIds = [presetId];
  document.getElementById("presetBatchBar").classList.add("active");
  renderPresets();
}

// 切换选中状态
function togglePresetSelect(presetId) {
  const index = window.selectedPresetIds.indexOf(presetId);
  if (index === -1) {
    window.selectedPresetIds.push(presetId);
  } else {
    window.selectedPresetIds.splice(index, 1);
  }
  renderPresets();
}

// 取消批量模式
function cancelPresetBatch() {
  window.presetBatchMode = false;
  window.selectedPresetIds = [];
  document.getElementById("presetBatchBar").classList.remove("active");
  renderPresets();
}

// 删除选中的预设
async function deleteSelectedPresets() {
  if (window.selectedPresetIds.length === 0) {
    showToast("请先选择要删除的预设");
    return;
  }

  if (
    !confirm(`确定要删除选中的 ${window.selectedPresetIds.length} 个预设吗？`)
  )
    return;

  window.presets = window.presets.filter(
    (p) => !window.selectedPresetIds.includes(p.id)
  );
  await localforage.setItem("userPresets", window.presets);
  cancelPresetBatch();
  updateOfflinePresetDropdown();
  showToast("已删除选中的预设");
}

// 打开导入弹窗
function openPresetImportModal() {
  document.getElementById("presetImportModal").classList.add("active");
}

// 关闭导入弹窗
function closePresetImportModal() {
  document.getElementById("presetImportModal").classList.remove("active");
}

// 从文件导入
function importPresetFromFile() {
  closePresetImportModal();
  document.getElementById("presetFileInput").click();
}

// 处理文件导入
async function handlePresetFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await importPresetData(data);
  } catch (e) {
    console.error("导入失败:", e);
    showToast("导入失败，请检查文件格式");
  }

  event.target.value = "";
}

// 从剪贴板导入
async function importPresetFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(text);
    await importPresetData(data);
    closePresetImportModal();
  } catch (e) {
    console.error("导入失败:", e);
    showToast("导入失败，请检查剪贴板内容");
  }
}

// 导入预设数据
async function importPresetData(data) {
  console.log("开始导入预设数据:", data);
  let entries = [];
  let presetName = data.name || "导入的预设";

  // Silly Tavern格式：内容在prompts数组里
  if (data.prompts && Array.isArray(data.prompts)) {
    console.log("检测到prompts数组，共", data.prompts.length, "个");

    // 获取prompt_order来确定enabled状态
    // Silly Tavern格式: prompt_order是数组，每项有character_id和order
    // order才是包含{identifier, enabled}的数组
    let enabledMap = {};
    if (data.prompt_order && Array.isArray(data.prompt_order)) {
      data.prompt_order.forEach((orderItem) => {
        // Silly Tavern格式：{character_id: xxx, order: [...]}
        if (orderItem && orderItem.order && Array.isArray(orderItem.order)) {
          orderItem.order.forEach((item) => {
            if (item && item.identifier) {
              enabledMap[item.identifier] = item.enabled === true;
            }
          });
        }
        // 兼容其他格式
        else if (Array.isArray(orderItem)) {
          orderItem.forEach((item) => {
            if (item && item.identifier) {
              enabledMap[item.identifier] = item.enabled === true;
            }
          });
        } else if (orderItem && orderItem.identifier) {
          enabledMap[orderItem.identifier] = orderItem.enabled === true;
        }
      });
    }

    console.log("解析到的enabledMap:", enabledMap);

    // 提取所有prompt并转换为条目（排除marker）
    const baseTime = Date.now();
    entries = data.prompts
      .filter((p) => p.content && typeof p.content === "string" && !p.marker)
      .map((p, index) => {
        // 优先使用prompt_order中的enabled状态
        let isEnabled = false; // 默认关闭
        if (p.identifier && enabledMap.hasOwnProperty(p.identifier)) {
          isEnabled = enabledMap[p.identifier];
          console.log(
            `条目 ${
              p.name || p.identifier
            }: enabled=${isEnabled} (from prompt_order)`
          );
        } else if (p.hasOwnProperty("enabled")) {
          isEnabled = p.enabled === true;
          console.log(
            `条目 ${
              p.name || p.identifier
            }: enabled=${isEnabled} (from prompt.enabled)`
          );
        }

        return {
          id: "entry_" + baseTime + "_" + index,
          name: p.name || "",
          keywords: "",
          content: p.content,
          enabled: isEnabled,
        };
      });

    const enabledCount = entries.filter((e) => e.enabled).length;
    console.log(
      `过滤后得到 ${entries.length} 个条目，其中 ${enabledCount} 个已启用`
    );

    const firstWithContent = data.prompts.find((p) => p.content && p.name);
    if (firstWithContent) {
      presetName = firstWithContent.name;
    }
  }

  // 如果prompts里没有找到，尝试其他字段作为单个条目
  if (entries.length === 0) {
    const content = data.content || data.prompt || data.system_prompt || "";
    if (content) {
      entries.push({
        id: "entry_" + Date.now(),
        name: data.name || "主要内容",
        keywords: "",
        content: content,
        enabled: true,
      });
    }
  }

  if (entries.length === 0) {
    showToast("预设内容为空，无法导入");
    return;
  }

  const preset = {
    id: "preset_" + Date.now(),
    name: presetName,
    category: data.category || "style",
    icon: data.icon || "↓",
    description: data.description || "从Silly Tavern导入的预设",
    entries: entries,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  console.log("创建预设对象:", preset);
  const enabledCount = entries.filter((e) => e.enabled).length;

  window.presets.push(preset);
  await localforage.setItem("userPresets", window.presets);
  renderPresets();
  updateOfflinePresetDropdown();
  showToast(
    `预设导入成功！共 ${entries.length} 个条目，${enabledCount} 个已启用`
  );
}

// ==================== 线下模式设置 ====================

// 切换线下模式设置面板显示
function toggleOfflineSettings() {
  const checkbox = document.getElementById("settingsOnlineDating");
  const settingsPanel = document.getElementById("offlineWordSettings");

  if (checkbox.checked) {
    settingsPanel.classList.add("active");
    updateOfflinePresetDropdown();
  } else {
    settingsPanel.classList.remove("active");
  }
}

// 更新线下模式预设下拉列表
function updateOfflinePresetDropdown() {
  const select = document.getElementById("offlinePresetSelect");
  if (!select) return;

  const currentValue = select.value;

  select.innerHTML = '<option value="">-- 不使用预设 --</option>';

  window.presets.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = `${preset.icon || "○"} ${preset.name}`;
    select.appendChild(option);
  });

  // 恢复之前的选择
  if (currentValue && window.presets.find((p) => p.id === currentValue)) {
    select.value = currentValue;
  }
}

// 预设选择变化时更新字数范围
function onOfflinePresetChange() {
  const select = document.getElementById("offlinePresetSelect");
  const presetId = select.value;

  if (presetId) {
    const preset = window.presets.find((p) => p.id === presetId);
    if (preset) {
      document.getElementById("offlineMinWords").value = preset.minWords || 100;
      document.getElementById("offlineMaxWords").value = preset.maxWords || 500;
    }
  }
}

// 页面打开时的处理
function openPage(pageId) {
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add("active");

    // 预设页面特殊处理
    if (pageId === "presetPage") {
      renderPresets();
    }
  }
}

function closePage(pageId) {
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.remove("active");

    // 预设页面关闭时取消批量模式
    if (pageId === "presetPage") {
      cancelPresetBatch();
    }

    // 聊天页面关闭时退出多选模式
    if (pageId === "chatPage" && typeof exitSelectionMode === "function") {
      exitSelectionMode();
    }
  }
}

// 必须用 var 定义，防止报错
var isSelectionMode = false;
var activeMsgIndex = -1;
var selectedIndices = new Set();
var forwardMode = "merge"; // 转发模式：merge(合并) 或 single(逐条)
var longPressTimer = null;
var touchStartX = 0;
var touchStartY = 0;
var voiceTouchStartTime = 0;
// ==================== 注入聊天头像样式 ====================
const avatarStyle = document.createElement("style");
avatarStyle.innerHTML = `
    /* ========== 修复核心：气泡布局 ========== */
    .msg-wrapper {
  display: flex;
  width: 100%;
  margin-bottom: 16px;
  gap: 10px;
  padding: 0 4px;
    }

    /* 用户消息：头像在右，气泡在左（反向排列） */
    .msg-wrapper.user {
  flex-direction: row-reverse;
    }

    /* AI消息：头像在左，气泡在右 */
    .msg-wrapper.ai {
  flex-direction: row;
    }

    /* 头像样式 */
    .chat-avatar-small {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fce4ec, #e8f5e9);
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  margin-top: 0px; 
    }
    .chat-avatar-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
    }

    /* 包裹气泡的列容器 */
    .msg-content-container {
  max-width: 72%;
  display: flex;
  flex-direction: column;
    }

    /* 覆盖 msg-row，让它作为 Flex 列 */
    .msg-wrapper .msg-row {
  display: flex;
  flex-direction: column;
  max-width: 100%;
  margin: 0;
    }

    /* 【关键修复】强制气泡不拉伸！ */
    /* 用户气泡：靠右对齐 */
    .msg-wrapper.user .msg-content-container,
    .msg-wrapper.user .msg-row {
  align-items: flex-end !important; 
    }

    /* AI气泡：靠左对齐 */
    .msg-wrapper.ai .msg-content-container,
    .msg-wrapper.ai .msg-row {
  align-items: flex-start !important;
    }

    /* 确保气泡本身的宽度是适应内容的 */
    .msg-bubble {
  width: fit-content !important;
  max-width: 100% !important;
  word-wrap: break-word;
  word-break: break-word;
    }

    /* 时间微调 */
    .msg-time-wrapper {
  font-size: 0.7rem;
  color: var(--text-hint);
  margin-top: 4px;
  padding: 0 2px;
    }
`;
document.head.appendChild(avatarStyle);
var currentEditField = "";
// ==================== 图片压缩工具 ====================
// file: 上传的文件对象
// maxWidth: 图片最大宽度 (头像建议300，背景建议800)
// quality: 压缩质量 (0-1，建议0.7)
function compressImage(file, maxWidth, quality) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        // 计算压缩后的尺寸
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }

        // 使用 Canvas 绘图并压缩
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // 导出为压缩后的 Base64
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
    };
  });
}
// 修改后的个人主页头像上传（带压缩）
async function handleAvatarUpload(input) {
  const file = input.files[0];
  if (file) {
    try {
      // 头像压缩到 300px 宽，质量 0.7
      const compressedData = await compressImage(file, 300, 0.7);

      const img = document.getElementById("avatarImg");
      const placeholder = document.getElementById("avatarPlaceholder");
      img.src = compressedData;
      img.style.display = "block";
      placeholder.style.display = "none";
      localforage.setItem("avatarImg", compressedData);
    } catch (e) {
      alert("图片处理失败，请重试");
    }
  }
}

// Edit modal
function openEditModal(field) {
  currentEditField = field;
  const modal = document.getElementById("editModal");
  const title = document.getElementById("editModalTitle");
  const input = document.getElementById("editInput");

  const titles = {
    name: "编辑用户名",
    handle: "编辑ID",
    bio: "编辑个性签名",
    location: "编辑位置",
  };

  const placeholders = {
    name: "请输入用户名",
    handle: "请输入@ID",
    bio: "请输入个性签名",
    location: "请输入位置",
  };

  title.textContent = titles[field];
  input.placeholder = placeholders[field];
  input.value = localStorage.getItem("profile_" + field) || "";
  modal.classList.add("active");
  input.focus();
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("active");
}

function saveEdit() {
  const input = document.getElementById("editInput");
  const value = input.value.trim();

  if (value) {
    localforage.setItem("profile_" + currentEditField, value);

    const elementMap = {
      name: "profileName",
      handle: "profileHandle",
      bio: "profileBio",
      location: "profileLocation",
    };

    const element = document.getElementById(elementMap[currentEditField]);
    if (currentEditField === "handle") {
      element.textContent = "@" + value.replace("@", "");
    } else {
      element.textContent = value;
    }
  }

  closeEditModal();
}

// 标签编辑功能
let currentTagPosition = null;

function openTagEditModal(position) {
  currentTagPosition = position;
  const modal = document.getElementById("tagEditModal");
  const title = document.getElementById("tagEditTitle");
  const input = document.getElementById("tagEditInput");

  const positionNames = {
    leftTop: "左上标签",
    leftBottom: "左下标签",
    rightTop: "右上标签",
    rightBottom: "右下标签",
  };

  title.textContent = "编辑" + positionNames[position];

  // 加载已保存的数据
  const savedText = localStorage.getItem("tag_" + position + "_text") || "";
  input.value = savedText;

  modal.classList.add("active");
  input.focus();
}

function closeTagEditModal() {
  document.getElementById("tagEditModal").classList.remove("active");
}

function saveTagEdit() {
  const input = document.getElementById("tagEditInput");
  const value = input.value.trim();

  localStorage.setItem("tag_" + currentTagPosition + "_text", value);

  // 更新界面
  const elementMap = {
    leftTop: "tagLeftTop",
    leftBottom: "tagLeftBottom",
    rightTop: "tagRightTop",
    rightBottom: "tagRightBottom",
  };
  const textElement = document.getElementById(elementMap[currentTagPosition]);
  if (textElement) {
    textElement.textContent = value;
  }

  closeTagEditModal();
}

function loadTagsData() {
  const positions = ["leftTop", "leftBottom", "rightTop", "rightBottom"];
  const elementMap = {
    leftTop: "tagLeftTop",
    leftBottom: "tagLeftBottom",
    rightTop: "tagRightTop",
    rightBottom: "tagRightBottom",
  };

  positions.forEach((position) => {
    const savedText = localStorage.getItem("tag_" + position + "_text") || "";
    const textElement = document.getElementById(elementMap[position]);
    if (textElement) {
      textElement.textContent = savedText;
    }
  });
}

// ==================== 恋爱纪念组件功能 ====================
let currentLoveEditField = null;

function openLoveEditModal(field) {
  currentLoveEditField = field;
  const modal = document.getElementById("loveEditModal");
  const title = document.getElementById("loveEditTitle");
  const input = document.getElementById("loveEditInput");

  if (field === "title") {
    title.textContent = "编辑标题";
    input.placeholder = "请输入标题文字";
    input.type = "text";
    input.value = localStorage.getItem("love_title") || "恋爱纪念";
  } else if (field === "startDate") {
    title.textContent = "设置开始日期";
    input.placeholder = "格式：2024.01.01";
    input.type = "text";
    input.value = localStorage.getItem("love_start_date") || "";
  }

  modal.classList.add("active");
  input.focus();
}

function closeLoveEditModal() {
  document.getElementById("loveEditModal").classList.remove("active");
}

function saveLoveEdit() {
  const input = document.getElementById("loveEditInput");
  const value = input.value.trim();

  if (currentLoveEditField === "title" && value) {
    localStorage.setItem("love_title", value);
    document.getElementById("loveTitleText").textContent = value;
  } else if (currentLoveEditField === "startDate" && value) {
    localStorage.setItem("love_start_date", value);
    document.getElementById("loveDateText").textContent = value;
    updateLoveDays();
  }

  closeLoveEditModal();
}

function updateLoveDays() {
  const dateStr = localStorage.getItem("love_start_date");
  if (dateStr) {
    // 解析日期格式 2024.01.01 或 2024-01-01
    const parts = dateStr.replace(/\./g, "-").split("-");
    if (parts.length === 3) {
      const startDate = new Date(parts[0], parts[1] - 1, parts[2]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      const diffTime = today - startDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      document.getElementById("loveDaysNumber").textContent =
        diffDays >= 0 ? diffDays : 0;
    }
  }
}

async function handleLoveAvatarUpload(index, input) {
  const file = input.files[0];
  if (file) {
    try {
      const compressedData = await compressImage(file, 300, 0.7);
      const img = document.getElementById("loveAvatar" + index + "Img");
      const placeholder = document.getElementById(
        "loveAvatar" + index + "Placeholder"
      );
      img.src = compressedData;
      img.style.display = "block";
      placeholder.style.display = "none";
      localStorage.setItem("love_avatar_" + index, compressedData);
    } catch (e) {
      alert("图片处理失败，请重试");
    }
  }
}

function loadLoveWidgetData() {
  // 加载头像
  for (let i = 1; i <= 2; i++) {
    const avatarData = localStorage.getItem("love_avatar_" + i);
    if (avatarData) {
      const img = document.getElementById("loveAvatar" + i + "Img");
      const placeholder = document.getElementById(
        "loveAvatar" + i + "Placeholder"
      );
      img.src = avatarData;
      img.style.display = "block";
      placeholder.style.display = "none";
    }
  }

  // 加载标题
  const title = localStorage.getItem("love_title");
  if (title) {
    document.getElementById("loveTitleText").textContent = title;
  }

  // 加载日期并计算天数
  const dateStr = localStorage.getItem("love_start_date");
  if (dateStr) {
    document.getElementById("loveDateText").textContent = dateStr;
    updateLoveDays();
  }

  // 加载背景图
  const bgData = localStorage.getItem("love_widget_bg");
  if (bgData) {
    document.getElementById("loveWidgetBg").style.backgroundImage =
      "url(" + bgData + ")";
  }

  // 加载字体颜色
  const textColor = localStorage.getItem("love_widget_text_color");
  if (textColor === "light") {
    document.getElementById("loveWidget").classList.add("text-light");
  }
}

// 点击小组件空白区域打开选项
function handleLoveWidgetClick(event) {
  // 如果点击的是小组件本身或背景层，打开选项弹窗
  if (event.target.id === "loveWidget" || event.target.id === "loveWidgetBg") {
    document.getElementById("loveWidgetOptionsModal").classList.add("active");
  }
}

function closeLoveWidgetOptionsModal() {
  document.getElementById("loveWidgetOptionsModal").classList.remove("active");
}

function triggerLoveWidgetBgUpload() {
  closeLoveWidgetOptionsModal();
  document.getElementById("loveWidgetBgInput").click();
}

function setLoveWidgetTextColor(mode) {
  const widget = document.getElementById("loveWidget");
  if (mode === "light") {
    widget.classList.add("text-light");
    localStorage.setItem("love_widget_text_color", "light");
  } else {
    widget.classList.remove("text-light");
    localStorage.setItem("love_widget_text_color", "dark");
  }
  closeLoveWidgetOptionsModal();
}

// 处理背景图上传
async function handleLoveWidgetBgUpload(input) {
  const file = input.files[0];
  if (file) {
    try {
      const compressedData = await compressImage(file, 500, 0.8);
      document.getElementById("loveWidgetBg").style.backgroundImage =
        "url(" + compressedData + ")";
      localStorage.setItem("love_widget_bg", compressedData);
    } catch (e) {
      alert("图片处理失败，请重试");
    }
  }
}

// Page navigation
// Load saved data
function loadSavedData() {
  // Avatar
  const avatarData = localStorage.getItem("avatarImg");
  if (avatarData) {
    const img = document.getElementById("avatarImg");
    const placeholder = document.getElementById("avatarPlaceholder");
    img.src = avatarData;
    img.style.display = "block";
    placeholder.style.display = "none";
  }

  // Profile fields
  const fields = ["name", "handle", "bio", "location"];
  const elementMap = {
    name: "profileName",
    handle: "profileHandle",
    bio: "profileBio",
    location: "profileLocation",
  };

  fields.forEach((field) => {
    const saved = localStorage.getItem("profile_" + field);
    if (saved) {
      const element = document.getElementById(elementMap[field]);
      if (field === "handle") {
        element.textContent = "@" + saved.replace("@", "");
      } else {
        element.textContent = saved;
      }
    }
  });

  // 加载名片标签数据
  loadTagsData();

  // 加载恋爱纪念组件数据
  loadLoveWidgetData();
}

// Close modal on outside click
document.getElementById("editModal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeEditModal();
  }
});

// 标签编辑弹窗点击外部关闭
document.getElementById("tagEditModal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeTagEditModal();
  }
});

// Enter key to save
document.getElementById("editInput").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    saveEdit();
  }
});

// 标签编辑弹窗回车保存
document
  .getElementById("tagEditInput")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      saveTagEdit();
    }
  });

// 恋爱纪念弹窗点击外部关闭
document
  .getElementById("loveEditModal")
  .addEventListener("click", function (e) {
    if (e.target === this) {
      closeLoveEditModal();
    }
  });

// 恋爱纪念弹窗回车保存
document
  .getElementById("loveEditInput")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      saveLoveEdit();
    }
  });

// 小组件选项弹窗点击外部关闭
document
  .getElementById("loveWidgetOptionsModal")
  .addEventListener("click", function (e) {
    if (e.target === this) {
      closeLoveWidgetOptionsModal();
    }
  });

// Chat App Tab Switching
function switchChatTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll(".chat-tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Remove active from all tabs
  document.querySelectorAll(".chat-tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Show selected tab content
  document.getElementById(tabName + "Tab").classList.add("active");

  // Set active tab
  const tabs = document.querySelectorAll(".chat-tab");
  const tabIndex = { messages: 0, moments: 1, todo: 2, profile: 3 };
  tabs[tabIndex[tabName]].classList.add("active");

  // Update header title
  const titles = {
    messages: "Message",
    moments: "Moment",
    todo: "To Do",
    profile: "Me",
  };
  document.getElementById("chatAppTitle").textContent = titles[tabName];

  // Update header button (todo用设置按钮)
  const buttons = {
    messages: "+",
    moments: "📷",
    todo: "○",
    profile: "○",
  };
  document.getElementById("chatHeaderBtn").textContent = buttons[tabName];

  // 控制创建群聊按钮显示（只在messages标签页显示）
  const createGroupBtn = document.getElementById("createGroupBtn");
  if (createGroupBtn) {
    createGroupBtn.style.display = tabName === "messages" ? "" : "none";
  }

  // 控制顶栏显示（Moment和Me页面隐藏顶栏）
  const chatHeader = document.querySelector(".chat-app > .chat-header");
  if (chatHeader) {
    chatHeader.style.display =
      tabName === "moments" || tabName === "profile" ? "none" : "";
  }

  // 切换到moments时清除朋友圈小红点
  if (tabName === "moments") {
    if (typeof clearUnreadMoments === "function") clearUnreadMoments();
  }

  // 背景和滚动控制
  const chatApp = document.querySelector(".chat-app");
  const tabBar = document.querySelector(".chat-tab-bar");
  const chatContent = document.querySelector(".chat-content");

  if (tabName === "messages") {
    // messages页面保留波点背景
    chatApp.style.background = "#fdf5f7";
    chatApp.style.backgroundImage =
      "radial-gradient(circle, rgba(244,143,177,0.15) 2px, transparent 2px)";
    chatApp.style.backgroundSize = "20px 20px";
    chatContent.style.background = "transparent";
    tabBar.style.background = "rgba(255, 255, 255, 0.7)";
    tabBar.style.backdropFilter = "blur(25px) saturate(180%)";
    tabBar.style.webkitBackdropFilter = "blur(25px) saturate(180%)";
    chatContent.style.overflowY = "auto";
  } else if (tabName === "moments") {
    chatApp.style.backgroundImage = "none";
    chatApp.style.background = "#fff";
    chatContent.style.background = "#fff";
    tabBar.style.background = "rgba(255, 255, 255, 0.9)";
    tabBar.style.backdropFilter = "blur(30px) saturate(180%)";
    tabBar.style.webkitBackdropFilter = "blur(30px) saturate(180%)";
    chatContent.style.overflowY = "auto";
  } else if (tabName === "todo") {
    chatApp.style.backgroundImage = "none";
    chatApp.style.background = "#fffafa";
    chatContent.style.background = "#fffafa";
    tabBar.style.background = "rgba(255, 255, 255, 0.25)";
    tabBar.style.backdropFilter = "blur(30px) saturate(180%)";
    tabBar.style.webkitBackdropFilter = "blur(30px) saturate(180%)";
    chatContent.style.overflowY = "auto";
  } else {
    // profile页面
    chatApp.style.backgroundImage = "none";
    chatApp.style.background = "#f5f5f5";
    chatContent.style.background = "#f5f5f5";
    tabBar.style.background = "rgba(255, 255, 255, 0.25)";
    tabBar.style.backdropFilter = "blur(30px) saturate(180%)";
    tabBar.style.webkitBackdropFilter = "blur(30px) saturate(180%)";
    chatContent.style.overflowY = "hidden";
  }

  // 切换到待办标签时刷新AI角色列表和日期
  if (tabName === "todo") {
    if (typeof renderTodoAiCharList === "function") renderTodoAiCharList();
    if (typeof updateTodoDate === "function") updateTodoDate();
    if (typeof updateTodoStats === "function") updateTodoStats();
  }
}

// 旧的todo点击事件已废弃，使用新的待办系统

// Character data storage
var tempCharAvatar = null;

// Header button handler
function handleHeaderBtn() {
  const currentTab = document.querySelector(
    ".chat-tab.active .tab-label"
  ).textContent;
  if (currentTab === "Message") {
    openCreateCharModal();
  } else if (currentTab === "To Do") {
    openTodoSettingsModal();
  }
}

// Open create character modal
function openCreateCharModal() {
  document.getElementById("createCharModal").classList.add("active");
  document.getElementById("charNameInput").value = "";
  document.getElementById("charNoteInput").value = "";
  document.getElementById("charAvatarPreview").style.display = "none";
  document.getElementById("charAvatarPlaceholder").style.display = "block";
  document.querySelector(".create-avatar").classList.remove("has-image");
  tempCharAvatar = null;
}

// Close create character modal
function closeCreateCharModal() {
  document.getElementById("createCharModal").classList.remove("active");
}

// 修改后的创建角色头像预览（带压缩）
async function previewCharAvatar(input) {
  const file = input.files[0];
  if (file) {
    // 头像压缩到 300px
    const compressedData = await compressImage(file, 300, 0.7);

    const preview = document.getElementById("charAvatarPreview");
    const placeholder = document.getElementById("charAvatarPlaceholder");
    preview.src = compressedData;
    preview.style.display = "block";
    placeholder.style.display = "none";
    document.querySelector(".create-avatar").classList.add("has-image");
    tempCharAvatar = compressedData; // 存入临时变量的是压缩后的数据
  }
}

// Create character
function createCharacter() {
  const name = document.getElementById("charNameInput").value.trim();
  const note = document.getElementById("charNoteInput").value.trim();

  if (!name) {
    alert("请输入角色名称");
    return;
  }

  const character = {
    id: Date.now(),
    name: name,
    note: note,
    avatar: tempCharAvatar,
    lastMessage: "",
    lastTime: "刚刚",
    unread: 0,
  };

  characters.push(character);
  localforage.setItem("characters", characters);

  renderCharacters();
  closeCreateCharModal();
}

// ==================== 群聊功能 ====================
var groupChats = []; // 群聊列表
var tempGroupAvatar = null; // 临时群头像
var selectedGroupMembers = []; // 选中的群成员
var currentGroupId = null; // 当前群聊ID
var tempAddMembers = []; // 临时添加成员

// 打开创建群聊弹窗
function openCreateGroupModal() {
  if (characters.length < 2) {
    alert("请先创建至少2个AI角色才能建群哦～");
    return;
  }
  document.getElementById("createGroupModal").classList.add("active");
  document.getElementById("groupNameInput").value = "";
  document.getElementById("groupAvatarImg").style.display = "none";
  document.getElementById("groupAvatarPlaceholder").style.display = "block";
  tempGroupAvatar = null;
  selectedGroupMembers = [];
  renderGroupMembersList();
  checkGroupCreateValid();
}

// 关闭创建群聊弹窗
function closeCreateGroupModal() {
  document.getElementById("createGroupModal").classList.remove("active");
  selectedGroupMembers = [];
  tempGroupAvatar = null;
}

// 预览群头像
async function previewGroupAvatar(input) {
  const file = input.files[0];
  if (file) {
    const compressedData = await compressImage(file, 300, 0.7);
    const img = document.getElementById("groupAvatarImg");
    const placeholder = document.getElementById("groupAvatarPlaceholder");
    img.src = compressedData;
    img.style.display = "block";
    placeholder.style.display = "none";
    tempGroupAvatar = compressedData;
  }
}

// 渲染群成员选择列表
function renderGroupMembersList() {
  const container = document.getElementById("groupMembersList");
  if (characters.length === 0) {
    container.innerHTML = `
      <div class="create-group-empty">
        <div class="create-group-empty-icon">😢</div>
        <div>还没有可添加的角色</div>
      </div>
    `;
    return;
  }

  container.innerHTML = characters
    .map((char) => {
      const isSelected = selectedGroupMembers.includes(char.id);
      const displayName = char.note || char.name;
      return `
      <div class="create-group-member-item ${
        isSelected ? "selected" : ""
      }" onclick="toggleGroupMember(${char.id})">
        <div class="create-group-member-avatar">
          ${
            char.avatar
              ? `<img src="${char.avatar}" alt="${char.name}">`
              : char.name.charAt(0)
          }
        </div>
        <div class="create-group-member-info">
          <div class="create-group-member-name">${displayName}</div>
          ${
            char.note && char.note !== char.name
              ? `<div class="create-group-member-note">真名: ${char.name}</div>`
              : ""
          }
        </div>
        <div class="create-group-member-check"></div>
      </div>
    `;
    })
    .join("");
}

// 切换成员选中状态
function toggleGroupMember(charId) {
  const index = selectedGroupMembers.indexOf(charId);
  if (index > -1) {
    selectedGroupMembers.splice(index, 1);
  } else {
    selectedGroupMembers.push(charId);
  }
  renderGroupMembersList();
  checkGroupCreateValid();
}

// 检查是否可以创建群聊
function checkGroupCreateValid() {
  const name = document.getElementById("groupNameInput").value.trim();
  const btn = document.getElementById("createGroupConfirmBtn");
  const countEl = document.getElementById("selectedMembersCount");

  countEl.textContent = `已选 ${selectedGroupMembers.length} 人`;

  if (name && selectedGroupMembers.length >= 2) {
    btn.disabled = false;
  } else {
    btn.disabled = true;
  }
}

// 创建群聊
async function createGroupChat() {
  const name = document.getElementById("groupNameInput").value.trim();
  if (!name || selectedGroupMembers.length < 2) {
    alert("请输入群名称并选择至少2个成员");
    return;
  }

  const groupChat = {
    id: Date.now(),
    isGroup: true,
    name: name,
    avatar: tempGroupAvatar,
    members: selectedGroupMembers,
    lastMessage: "群聊已创建",
    lastTime: "刚刚",
    unread: 0,
    createdAt: new Date().toISOString(),
  };

  groupChats.push(groupChat);
  await localforage.setItem("groupChats", groupChats);

  showToast(`群聊「${name}」创建成功！`);
  closeCreateGroupModal();
  renderCharacters();
}

// 生成群聊头像（多人头像堆叠）
function renderGroupAvatarStack(group) {
  const members = group.members.slice(0, 3);
  let avatarsHtml = members
    .map((memberId) => {
      const char = characters.find((c) => c.id === memberId);
      if (!char) return '<div class="avatar-mini">?</div>';
      return `<div class="avatar-mini">${
        char.avatar ? `<img src="${char.avatar}">` : char.name.charAt(0)
      }</div>`;
    })
    .join("");

  if (group.members.length > 3) {
    avatarsHtml += `<div class="avatar-mini more">+${
      group.members.length - 3
    }</div>`;
  }

  return `<div class="group-avatar-stack">${avatarsHtml}</div>`;
}

// 打开群聊对话
function openGroupConversation(groupId) {
  currentGroupId = groupId;
  currentChatCharId = null; // 清除单聊ID
  currentGroupQuote = null; // 清除引用
  currentAtMentions = []; // 清除@列表

  const group = groupChats.find((g) => g.id === groupId);
  if (!group) return;

  // 重置回复按钮状态（避免切换对话后按钮仍然禁用）
  const replyBtn = document.getElementById("replyBtn");
  if (replyBtn) {
    replyBtn.disabled = false;
    replyBtn.classList.remove("loading");
    replyBtn.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"></path><path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z"></path><path d="M18 14l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z"></path></svg>';
  }

  document.getElementById("chatConversationPage").classList.add("active");
  document.getElementById("convName").textContent = group.name;

  // 设置群头像
  const avatarEl = document.getElementById("convAvatar");
  if (group.avatar) {
    avatarEl.innerHTML = `<img src="${group.avatar}" style="width:100%;height:100%;object-fit:cover;">`;
  } else {
    avatarEl.innerHTML = "👥";
  }

  // 显示群公告栏
  toggleGroupAnnouncementBar(true);
  const announcement = group.settings?.announcement || "";
  updateGroupAnnouncementBar(announcement);

  // 隐藏心声按钮（群聊不显示心声功能）
  const heartVoiceBtn = document.getElementById("heartVoiceBtn");
  if (heartVoiceBtn) heartVoiceBtn.style.display = "none";

  // 隐藏单聊引用预览，显示群聊引用预览区域
  document.getElementById("quotePreview").style.display = "none";
  cancelGroupQuote();

  // 加载群聊消息
  loadGroupMessages(groupId);

  // 应用群聊背景设置
  const convPage = document.getElementById("chatConversationPage");
  const groupSettings = group.settings || {};
  if (groupSettings.background) {
    convPage.style.backgroundImage = `url(${groupSettings.background})`;
    convPage.style.backgroundSize = "cover";
    convPage.style.backgroundPosition = "center";
    convPage.style.backgroundAttachment = "fixed";
  } else {
    convPage.style.backgroundImage = "";
    convPage.style.background = "#f5f5f5";
  }

  // 隐藏创建群聊按钮（只在消息列表页显示）
  const createGroupBtn = document.getElementById("createGroupBtn");
  if (createGroupBtn) createGroupBtn.style.display = "none";

  // 为输入框添加@监听
  const convInput = document.getElementById("convInput");
  if (convInput) {
    convInput.removeEventListener("input", checkAtTrigger);
    convInput.addEventListener("input", checkAtTrigger);
  }
}

// 加载群聊消息
async function loadGroupMessages(groupId) {
  const messagesKey = `group_messages_${groupId}`;
  const messages = (await localforage.getItem(messagesKey)) || [];
  const container = document.getElementById("convMessages");

  if (messages.length === 0) {
    container.innerHTML = `
      <div class="conv-empty">
        <div class="conv-empty-icon">👥</div>
        <div class="conv-empty-text">群聊已创建，开始聊天吧～</div>
      </div>
    `;
    return;
  }

  // 获取用户头像
  const globalUserAvatar = localStorage.getItem("avatarImg");
  const group = groupChats.find((g) => g.id === groupId);
  const groupSettings = group?.settings || {};
  const userAvatar = groupSettings.myAvatar || globalUserAvatar || "";

  container.innerHTML = messages
    .map((msg, originalIndex) => ({ ...msg, _originalIndex: originalIndex })) // 保存原始索引
    .filter((msg) => !msg.isHidden) // 过滤掉隐藏消息
    .map((msg) => {
      const index = msg._originalIndex; // 使用原始索引
      if (msg.role === "user") {
        // 检查是否是语音消息
        if (msg.isVoice) {
          const voiceText = msg.voiceText || msg.content || "";
          const duration = msg.duration || Math.ceil(voiceText.length / 10);
          const textVisible = msg.voiceTextVisible ? "visible" : "";
          return `
        <div class="msg-row user group-msg" 
             data-index="${index}"
             ontouchstart="handleGroupTouchStart(event, ${index})"
             ontouchmove="handleGroupTouchMove(event)"
             ontouchend="handleGroupTouchEnd(event)"
             onmousedown="handleGroupMouseDown(event, ${index})"
             onmouseup="handleGroupMouseUp(event)">
          <div class="user-voice-message-bubble"
               data-index="${index}"
               data-voice-text="${escapeHtml(voiceText)}">
            <div class="user-voice-message">
              <div class="user-voice-bar" onclick="playGroupUserVoiceBar(event, ${index})">
                <span class="user-voice-duration">${duration}"</span>
                <div class="user-voice-waves">
                  <span></span><span></span><span></span><span></span><span></span>
                </div>
              </div>
              <div class="user-voice-text ${textVisible}" id="groupUserVoiceText-${index}">${escapeHtml(
            voiceText
          )}</div>
              <div class="user-voice-to-text-btn" onclick="toggleGroupUserVoiceText(event, ${index})">
                ${msg.voiceTextVisible ? "收起文字" : "转文字"}
              </div>
            </div>
          </div>
          <div class="msg-time">${msg.time || ""}</div>
          <div class="msg-user-avatar">
            ${userAvatar ? `<img src="${userAvatar}">` : "我"}
          </div>
        </div>
          `;
        }
        // 检查是否是图片消息
        if (msg.type === "image" && msg.imageType === "placeholder") {
          const imageDesc = msg.imageDesc || "图片";
          return `
          <div class="msg-row user group-msg" 
               data-index="${index}"
               ontouchstart="handleGroupTouchStart(event, ${index})"
               ontouchmove="handleGroupTouchMove(event)"
               ontouchend="handleGroupTouchEnd(event)"
               onmousedown="handleGroupMouseDown(event, ${index})"
               onmouseup="handleGroupMouseUp(event)">
            <div class="msg-bubble image-message-bubble">
              <div class="msg-image-placeholder" onclick="viewImageDescription('${escapeHtml(
                imageDesc
              ).replace(/'/g, "\\'")}', false)">
                <div class="msg-image-placeholder-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </div>
                <div class="msg-image-placeholder-text">点击查看图片描述</div>
              </div>
            </div>
            <div class="msg-time">${msg.time || ""}</div>
            <div class="msg-user-avatar">
              ${userAvatar ? `<img src="${userAvatar}">` : "我"}
            </div>
          </div>
          `;
        }
        // 检查是否是真实图片消息
        if (msg.type === "image" && msg.imageType === "real" && msg.imageData) {
          return `
          <div class="msg-row user group-msg" 
               data-index="${index}"
               ontouchstart="handleGroupTouchStart(event, ${index})"
               ontouchmove="handleGroupTouchMove(event)"
               ontouchend="handleGroupTouchEnd(event)"
               onmousedown="handleGroupMouseDown(event, ${index})"
               onmouseup="handleGroupMouseUp(event)">
            <div class="msg-bubble" style="padding:4px;">
              <img src="${
                msg.imageData
              }" class="msg-img" onclick="showFullImage(this.src)" style="max-width:200px;border-radius:8px;cursor:pointer;">
            </div>
            <div class="msg-time">${msg.time || ""}</div>
            <div class="msg-user-avatar">
              ${userAvatar ? `<img src="${userAvatar}">` : "我"}
            </div>
          </div>
          `;
        }
        // 检查是否是HTML消息（如表情包）
        const isHtmlMsg = msg.isHtml === true;
        let contentHtml = isHtmlMsg
          ? msg.content
          : processAtMentions(escapeHtml(msg.content));
        // 检测是否是表情包消息
        const isSticker =
          isHtmlMsg &&
          (msg.content.includes('class="sticker-img"') ||
            /^\[(sticker|表情|表情包)[：:][^\]]+\]$/i.test(msg.content.trim()));

        // 生成引用HTML
        let quoteHtml = "";
        if (msg.quote) {
          const quoteSender = msg.quote.sender || "消息";
          const quoteText = (
            msg.quote.displayContent ||
            msg.quote.content ||
            ""
          ).substring(0, 50);
          quoteHtml = `
            <div class="group-msg-quote">
              <div class="group-msg-quote-sender">${escapeHtml(
                quoteSender
              )}</div>
              <div class="group-msg-quote-text">${escapeHtml(quoteText)}</div>
            </div>
          `;
        }

        return `
        <div class="msg-row user group-msg" 
             data-index="${index}"
             ontouchstart="handleGroupTouchStart(event, ${index})"
             ontouchmove="handleGroupTouchMove(event)"
             ontouchend="handleGroupTouchEnd(event)"
             onmousedown="handleGroupMouseDown(event, ${index})"
             onmouseup="handleGroupMouseUp(event)">
          <div class="msg-bubble${
            isSticker ? " sticker-bubble" : ""
          }">${quoteHtml}${contentHtml}</div>
          <div class="msg-time">${msg.time || ""}</div>
          <div class="msg-user-avatar">
            ${userAvatar ? `<img src="${userAvatar}">` : "我"}
          </div>
        </div>
      `;
      } else if (msg.role === "system") {
        // 系统消息 - 检查是否是HTML（如通话卡片）
        const isHtmlMsg = msg.isHtml === true;
        const contentHtml = isHtmlMsg ? msg.content : escapeHtml(msg.content);
        return `
        <div class="msg-row system" style="text-align:center;margin:8px 0;">
          <div style="display:inline-block;${
            isHtmlMsg
              ? ""
              : "padding:4px 12px;background:rgba(0,0,0,0.05);border-radius:12px;font-size:0.75rem;color:#999;"
          }">
            ${contentHtml}
          </div>
        </div>
      `;
      } else {
        // AI消息显示发送者名字
        const char = characters.find((c) => c.id === msg.charId);
        const charName = char ? char.note || char.name : "成员";
        const charAvatar = char?.avatar;

        // 检测是否是语音消息
        const voiceMatch =
          msg.content && msg.content.match(/^\[voice[：:]\s*(.+)\]$/i);
        if (voiceMatch) {
          const voiceText = voiceMatch[1];
          const duration = Math.max(2, Math.ceil(voiceText.length / 8));
          const charId = msg.charId || "";
          return `
        <div class="msg-row ai group-msg"
             data-index="${index}"
             ontouchstart="handleGroupTouchStart(event, ${index})"
             ontouchmove="handleGroupTouchMove(event)"
             ontouchend="handleGroupTouchEnd(event)"
             onmousedown="handleGroupMouseDown(event, ${index})"
             onmouseup="handleGroupMouseUp(event)">
          <div class="msg-sender-avatar">
            ${charAvatar ? `<img src="${charAvatar}">` : charName.charAt(0)}
          </div>
          <div class="msg-sender-name">${charName}</div>
          <div class="ai-voice-bubble" data-voice-text="${escapeHtml(
            voiceText
          )}" data-index="${index}" data-char-id="${charId}">
            <div class="ai-voice-bar" onclick="playGroupAIVoice(event, '${charId}', '${escapeHtml(
            voiceText
          ).replace(/'/g, "\\'")}')">
              <div class="ai-voice-waves"><span></span><span></span><span></span><span></span><span></span></div>
              <span class="ai-voice-duration">${duration}"</span>
            </div>
            <div class="ai-voice-text" id="groupAIVoiceText-${index}" style="display:none;">${escapeHtml(
            voiceText
          )}</div>
            <div class="ai-voice-to-text-btn" onclick="toggleGroupAIVoiceText(event, ${index})">转文字</div>
          </div>
          <div class="msg-time">${msg.time || ""}</div>
        </div>
          `;
        }
        // 检查AI发送的图片标签 [图片:内容] 或 [photo:内容]
        let imageContent = null;
        // 格式1: [图片:xxx] 或 [图片：xxx] 或 [photo:xxx]
        let imageTagMatch =
          msg.content &&
          msg.content.match(/^\[(图片|photo|照片|image)[:：]([^\]]+)\]$/i);
        if (imageTagMatch) {
          imageContent = imageTagMatch[2].trim();
        } else {
          // 格式2: [图片]-xxx 或 [图片] xxx 或 [photo]-xxx
          imageTagMatch =
            msg.content &&
            msg.content.match(/^\[(图片|photo|照片|image)\][-\s]+(.+)$/i);
          if (imageTagMatch) {
            imageContent = imageTagMatch[2].trim();
          }
        }

        if (imageContent) {
          // 检测是否为URL
          const isUrl = /^https?:\/\//i.test(imageContent);

          if (isUrl) {
            // 如果是URL，直接显示图片
            return `
            <div class="msg-row ai group-msg"
                 data-index="${index}"
                 ontouchstart="handleGroupTouchStart(event, ${index})"
                 ontouchmove="handleGroupTouchMove(event)"
                 ontouchend="handleGroupTouchEnd(event)"
                 onmousedown="handleGroupMouseDown(event, ${index})"
                 onmouseup="handleGroupMouseUp(event)">
              <div class="msg-sender-avatar">
                ${charAvatar ? `<img src="${charAvatar}">` : charName.charAt(0)}
              </div>
              <div class="msg-sender-name">${charName}</div>
              <div class="msg-bubble image-message-bubble">
                <div class="msg-real-image" onclick="viewRealImage('${imageContent}')">
                  <img src="${imageContent}" alt="图片" onerror="this.parentElement.innerHTML='<div style=\\'padding:20px;color:#999;\\'>图片加载失败</div>'"/>
                </div>
              </div>
              <div class="msg-time">${msg.time || ""}</div>
            </div>
            `;
          } else {
            // 如果是描述文字，显示占位图
            return `
            <div class="msg-row ai group-msg"
                 data-index="${index}"
                 ontouchstart="handleGroupTouchStart(event, ${index})"
                 ontouchmove="handleGroupTouchMove(event)"
                 ontouchend="handleGroupTouchEnd(event)"
                 onmousedown="handleGroupMouseDown(event, ${index})"
                 onmouseup="handleGroupMouseUp(event)">
              <div class="msg-sender-avatar">
                ${charAvatar ? `<img src="${charAvatar}">` : charName.charAt(0)}
              </div>
              <div class="msg-sender-name">${charName}</div>
              <div class="msg-bubble image-message-bubble">
                <div class="msg-image-placeholder" style="background:linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);" onclick="viewImageDescription('${escapeHtml(
                  imageContent
                ).replace(/'/g, "\\'")}', true)">
                  <div class="msg-image-placeholder-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#66bb6a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                  </div>
                  <div class="msg-image-placeholder-text" style="color:#66bb6a;">点击查看图片描述</div>
                </div>
              </div>
              <div class="msg-time">${msg.time || ""}</div>
            </div>
            `;
          }
        }

        // 处理表情包标签 - 使用该角色绑定的表情包
        let contentHtml = escapeHtml(msg.content);
        if (msg.content) {
          contentHtml = processGroupStickerTags(msg.content, msg.charId);

          // 处理@提醒
          contentHtml = processAtMentions(contentHtml);

          // 处理位置标签 [位置:地点名] 或 [位置:地点名:详细地址]
          contentHtml = contentHtml.replace(
            /\[(位置|location)[:：]([^\]:：]+)(?:[:：]([^\]]*))?\]/gi,
            (match, tag, name, address) => {
              return `<div class="location-card">
                <div class="location-card-map">
                  <div class="location-card-map-bg"></div>
                  <div class="location-card-map-icon">📍</div>
                </div>
                <div class="location-card-info">
                  <div class="location-card-name">${escapeHtml(name)}</div>
                  <div class="location-card-address">${
                    address ? escapeHtml(address) : ""
                  }</div>
                </div>
              </div>`;
            }
          );

          // 处理转账标签 [转账:金额] - 只匹配AI给用户转账的格式
          // 不匹配 [转账 xx元 已收款] 这种错误格式
          contentHtml = contentHtml.replace(
            /\[(转账|transfer)[:：](\d+(?:\.\d+)?)\]/gi,
            (match, tag, amount) => {
              return `<div class="transfer-card">
                <div class="transfer-card-header">
                  <div class="transfer-card-icon">¥</div>
                  <div class="transfer-card-info">
                    <div class="transfer-card-title">转账给你</div>
                    <div class="transfer-card-amount">${parseFloat(
                      amount
                    ).toFixed(2)}</div>
                  </div>
                </div>
                <div class="transfer-card-footer">
                  <span>微信转账</span>
                  <span class="transfer-card-status accepted">已收款</span>
                </div>
              </div>`;
            }
          );

          // 处理红包标签 [红包:金额]
          contentHtml = contentHtml.replace(
            /\[(红包|redpacket)[:：](\d+(?:\.\d+)?)\]/gi,
            (match, tag, amount) => {
              return `<div class="transfer-card">
                <div class="transfer-card-header">
                  <div class="transfer-card-icon">🧧</div>
                  <div class="transfer-card-info">
                    <div class="transfer-card-title">恭喜发财</div>
                    <div class="transfer-card-amount">${parseFloat(
                      amount
                    ).toFixed(2)}</div>
                  </div>
                </div>
                <div class="transfer-card-footer">
                  <span>微信红包</span>
                  <span class="transfer-card-status accepted">已领取</span>
                </div>
              </div>`;
            }
          );
        }

        // 检测是否是表情包消息
        const isSticker =
          /^\[(sticker|表情|表情包)[：:][^\]]+\]$/i.test(msg.content.trim()) ||
          contentHtml.includes('class="sticker-img"');
        // 检测是否为特殊卡片消息
        const isSpecialCard =
          contentHtml.includes("transfer-card") ||
          contentHtml.includes("location-card");
        const specialBubbleStyle = isSpecialCard
          ? 'style="background:transparent!important;box-shadow:none!important;padding:0!important;"'
          : "";
        // 生成引用HTML
        let quoteHtml = "";
        if (msg.quote) {
          const quoteSender = msg.quote.sender || "消息";
          const quoteText = (
            msg.quote.displayContent ||
            msg.quote.content ||
            ""
          ).substring(0, 50);
          quoteHtml = `
            <div class="group-msg-quote">
              <div class="group-msg-quote-sender">${escapeHtml(
                quoteSender
              )}</div>
              <div class="group-msg-quote-text">${escapeHtml(quoteText)}</div>
            </div>
          `;
        }

        return `
        <div class="msg-row ai group-msg"
             data-index="${index}"
             ontouchstart="handleGroupTouchStart(event, ${index})"
             ontouchmove="handleGroupTouchMove(event)"
             ontouchend="handleGroupTouchEnd(event)"
             onmousedown="handleGroupMouseDown(event, ${index})"
             onmouseup="handleGroupMouseUp(event)">
          <div class="msg-sender-avatar">
            ${charAvatar ? `<img src="${charAvatar}">` : charName.charAt(0)}
          </div>
          <div class="msg-sender-name">${charName}</div>
          <div class="msg-bubble${
            isSticker ? " sticker-bubble" : ""
          }" ${specialBubbleStyle}>${quoteHtml}${contentHtml}</div>
          <div class="msg-time">${msg.time || ""}</div>
        </div>
      `;
      }
    })
    .join("");

  container.scrollTop = container.scrollHeight;

  // 应用群聊样式
  if (typeof applyGroupChatStyle === "function") {
    applyGroupChatStyle();
  }
}

// 处理群聊中的表情包标签（使用角色绑定的表情包）
function processGroupStickerTags(text, charId) {
  if (!text) return escapeHtml(text);

  // 匹配 [sticker:xxx] 或 [表情:xxx] 或 [表情包:xxx] 格式
  const stickerPattern = /\[(sticker|表情|表情包)[：:]\s*([^\]]+)\]/gi;

  // 检查是否有表情包
  if (!stickerPattern.test(text)) {
    return escapeHtml(text);
  }

  // 提取纯文字（移除所有表情包标签）
  const pureText = text
    .replace(/\[(sticker|表情|表情包)[：:]\s*([^\]]+)\]/gi, "")
    .trim();

  // 处理表情包 - 使用新的正则实例
  const processedStickers = [];
  const stickerRegex = /\[(sticker|表情|表情包)[：:]\s*([^\]]+)\]/gi;
  let match;
  while ((match = stickerRegex.exec(text)) !== null) {
    const keyword = match[2];

    // 获取该角色绑定的表情包
    const charIdStr = charId ? String(charId) : "__global__";
    const boundCategories = window.aiStickerBindings
      ? window.aiStickerBindings[charIdStr] || []
      : [];

    let charStickers = [];
    if (boundCategories.length > 0 && window.customStickers) {
      charStickers = window.customStickers.filter((stk) =>
        boundCategories.includes(stk.category)
      );
    }

    if (
      charStickers.length === 0 &&
      window.customStickers &&
      window.customStickers.length > 0
    ) {
      charStickers = window.customStickers;
    }

    if (charStickers.length > 0) {
      const keywordTrim = keyword.trim().toLowerCase();
      let sticker = charStickers.find(
        (s) => s.desc && s.desc.toLowerCase() === keywordTrim
      );
      if (!sticker) {
        sticker = charStickers.find(
          (s) => s.desc && s.desc.toLowerCase().includes(keywordTrim)
        );
      }
      // 只有找到匹配的表情包才显示，不再随机选择
      if (sticker) {
        processedStickers.push(
          `<img src="${sticker.src}" class="sticker-img" alt="${
            sticker.desc || "表情"
          }" onclick="showFullImage('${sticker.src}')">`
        );
      } else {
        // 未找到匹配的表情包，保留原始文本标签
        processedStickers.push(
          `<span class="sticker-not-found">[表情:${keyword}]</span>`
        );
      }
    }
  }

  // 组合输出
  let result = "";
  if (pureText && processedStickers.length > 0) {
    // 有文字也有表情包：文字在上，表情包在下（分开显示）
    result = `<div style="margin-bottom:8px;">${escapeHtml(
      pureText
    )}</div>${processedStickers.join("")}`;
  } else if (pureText) {
    // 只有文字
    result = escapeHtml(pureText);
  } else if (processedStickers.length > 0) {
    // 只有表情包
    result = processedStickers.join("");
  } else {
    result = escapeHtml(text);
  }

  return result;
}

// ==================== 群聊长按菜单功能 ====================
var groupLongPressTimer = null;
var groupTouchStartX = 0;
var groupTouchStartY = 0;
var activeGroupMsgIndex = null;

function handleGroupTouchStart(e, index) {
  groupTouchStartX = e.touches[0].clientX;
  groupTouchStartY = e.touches[0].clientY;
  groupLongPressTimer = setTimeout(() => {
    showGroupContextMenu(e.touches[0].clientX, e.touches[0].clientY, index);
  }, 500);
}

function handleGroupTouchMove(e) {
  if (!groupLongPressTimer) return;
  let moveX = e.touches[0].clientX;
  let moveY = e.touches[0].clientY;
  if (
    Math.abs(moveX - groupTouchStartX) > 10 ||
    Math.abs(moveY - groupTouchStartY) > 10
  ) {
    clearTimeout(groupLongPressTimer);
    groupLongPressTimer = null;
  }
}

function handleGroupTouchEnd(e) {
  if (groupLongPressTimer) {
    clearTimeout(groupLongPressTimer);
    groupLongPressTimer = null;
  }
}

function handleGroupMouseDown(e, index) {
  groupLongPressTimer = setTimeout(() => {
    showGroupContextMenu(e.clientX, e.clientY, index);
  }, 500);
}

function handleGroupMouseUp(e) {
  if (groupLongPressTimer) {
    clearTimeout(groupLongPressTimer);
    groupLongPressTimer = null;
  }
}

async function showGroupContextMenu(x, y, index) {
  if (navigator.vibrate) navigator.vibrate(50);

  activeGroupMsgIndex = index;
  const overlay = document.getElementById("contextMenuOverlay");
  const menu = document.getElementById("contextMenu");

  // 获取群聊消息
  const messagesKey = `group_messages_${currentGroupId}`;
  const messages = (await localforage.getItem(messagesKey)) || [];
  const msg = messages[index];
  if (!msg) return;

  const isUser = msg.role === "user";

  // 构建菜单内容
  let menuHtml = `
    <div class="menu-item" onclick="handleGroupCopyMsg()">复制</div>
    <div class="menu-item" onclick="setGroupQuote(${index}); hideContextMenu();">引用</div>
  `;

  if (isUser) {
    menuHtml += `<div class="menu-item" onclick="handleGroupRecallMsg()">撤回</div>`;
  }

  menuHtml += `
    <div class="menu-item" onclick="handleGroupEditMsg()">编辑</div>
    <div class="menu-item" onclick="handleGroupMultiSelect()">多选</div>
    <div class="menu-item danger" onclick="handleGroupDeleteMsg()">删除</div>
  `;

  menu.innerHTML = menuHtml;
  menu.style.left = "";
  menu.style.top = "";
  menu.classList.remove("arrow-top");

  overlay.classList.add("active");
  setTimeout(() => menu.classList.add("show"), 10);
}

// 群聊复制消息
async function handleGroupCopyMsg() {
  const messagesKey = `group_messages_${currentGroupId}`;
  const messages = (await localforage.getItem(messagesKey)) || [];
  const msg = messages[activeGroupMsgIndex];
  if (!msg) return;

  let textToCopy = msg.content;
  // 移除HTML标签
  textToCopy = textToCopy.replace(/<[^>]*>/g, "").trim();

  if (navigator.clipboard) {
    navigator.clipboard.writeText(textToCopy);
    showToast("已复制");
  }
  hideContextMenu();
}

// 群聊撤回消息
async function handleGroupRecallMsg() {
  const messagesKey = `group_messages_${currentGroupId}`;
  const messages = (await localforage.getItem(messagesKey)) || [];
  const msg = messages[activeGroupMsgIndex];
  if (!msg || msg.role !== "user") return;

  // 替换为撤回提示
  messages[activeGroupMsgIndex] = {
    role: "system",
    content: "你撤回了一条消息",
    time: msg.time,
  };

  await localforage.setItem(messagesKey, messages);
  loadGroupMessages(currentGroupId);
  hideContextMenu();
  showToast("消息已撤回");
}

// 群聊编辑消息
async function handleGroupEditMsg() {
  const messagesKey = `group_messages_${currentGroupId}`;
  const messages = (await localforage.getItem(messagesKey)) || [];
  const msg = messages[activeGroupMsgIndex];
  if (!msg) return;

  let content = msg.content;
  // 如果是HTML，提取文本
  if (msg.isHtml) {
    content = content.replace(/<[^>]*>/g, "").trim();
  }

  const newContent = prompt("编辑消息：", content);
  if (newContent === null) {
    hideContextMenu();
    return;
  }

  messages[activeGroupMsgIndex].content = newContent;
  messages[activeGroupMsgIndex].isHtml = false;

  await localforage.setItem(messagesKey, messages);
  loadGroupMessages(currentGroupId);
  hideContextMenu();
  showToast("消息已编辑");
}

// 群聊删除消息
async function handleGroupDeleteMsg() {
  if (!confirm("确定删除这条消息？")) {
    hideContextMenu();
    return;
  }

  const messagesKey = `group_messages_${currentGroupId}`;
  const messages = (await localforage.getItem(messagesKey)) || [];
  messages.splice(activeGroupMsgIndex, 1);

  await localforage.setItem(messagesKey, messages);
  loadGroupMessages(currentGroupId);
  hideContextMenu();
  showToast("消息已删除");
}

// ==================== 群聊多选功能 ====================
var isGroupSelectionMode = false;
var groupSelectedIndices = new Set();

function handleGroupMultiSelect() {
  hideContextMenu();
  isGroupSelectionMode = true;
  groupSelectedIndices.clear();
  groupSelectedIndices.add(activeGroupMsgIndex);

  // 隐藏输入框，显示选择工具栏
  document.querySelector(".conv-input-area").style.display = "none";
  showGroupSelectionToolbar();

  renderGroupSelectionMode();
}

async function renderGroupSelectionMode() {
  const messagesKey = `group_messages_${currentGroupId}`;
  const messages = (await localforage.getItem(messagesKey)) || [];
  const container = document.getElementById("convMessages");

  const globalUserAvatar = localStorage.getItem("avatarImg");
  const group = groupChats.find((g) => g.id === currentGroupId);
  const groupSettings = group?.settings || {};
  const userAvatar = groupSettings.myAvatar || globalUserAvatar || "";

  // 保存当前滚动位置
  const scrollTop = container.scrollTop;

  container.innerHTML = messages
    .map((msg, originalIndex) => ({ ...msg, _originalIndex: originalIndex })) // 保存原始索引
    .filter((msg) => !msg.isHidden)
    .map((msg) => {
      const index = msg._originalIndex; // 使用原始索引
      if (msg.role === "system") {
        return `
        <div class="msg-row system" style="text-align:center;margin:8px 0;">
          <div style="display:inline-block;padding:4px 12px;background:rgba(0,0,0,0.05);border-radius:12px;font-size:0.75rem;color:#999;">
            ${msg.isHtml ? msg.content : escapeHtml(msg.content)}
          </div>
        </div>
      `;
      }

      const isSelected = groupSelectedIndices.has(index);
      const isUser = msg.role === "user";
      const isHtmlMsg = msg.isHtml === true;
      let contentHtml = isHtmlMsg ? msg.content : escapeHtml(msg.content);
      const isSticker =
        isHtmlMsg && msg.content.includes('class="sticker-img"');

      // 选择器HTML
      const selectorHtml = `
      <div class="bubble-selector ${isSelected ? "selected" : ""}">
        <div class="bubble-selector-inner">
          ${
            isSelected
              ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>'
              : ""
          }
        </div>
      </div>
    `;

      if (isUser) {
        // 用户消息：选择框在气泡左边
        return `
        <div class="msg-row user group-msg" data-index="${index}" onclick="toggleGroupMessageSelection(${index})">
          <div class="bubble-with-selector user">
            ${selectorHtml}
            <div class="msg-bubble${isSticker ? " sticker-bubble" : ""}${
          isSelected ? " selected" : ""
        }">
              ${contentHtml}
            </div>
          </div>
          <div class="msg-time">${msg.time || ""}</div>
          <div class="msg-user-avatar">
            ${userAvatar ? `<img src="${userAvatar}">` : "我"}
          </div>
        </div>
      `;
      } else {
        // AI消息
        const char = characters.find((c) => c.id === msg.charId);
        const charName = char ? char.note || char.name : "成员";
        const charAvatar = char?.avatar;

        if (msg.content) {
          contentHtml = processGroupStickerTags(msg.content, msg.charId);
        }
        const aiIsSticker =
          /^\[(sticker|表情|表情包)[：:][^\]]+\]$/i.test(
            msg.content?.trim() || ""
          ) || contentHtml.includes('class="sticker-img"');

        // AI消息：选择框在气泡右边
        return `
        <div class="msg-row ai group-msg" data-index="${index}" onclick="toggleGroupMessageSelection(${index})">
          <div class="msg-sender-avatar">
            ${charAvatar ? `<img src="${charAvatar}">` : charName.charAt(0)}
          </div>
          <div class="msg-sender-name">${charName}</div>
          <div class="bubble-with-selector ai">
            ${selectorHtml}
            <div class="msg-bubble${aiIsSticker ? " sticker-bubble" : ""}${
          isSelected ? " selected" : ""
        }">
              ${contentHtml}
            </div>
          </div>
          <div class="msg-time">${msg.time || ""}</div>
        </div>
      `;
      }
    })
    .join("");

  updateGroupSelectionUI();

  // 恢复滚动位置
  container.scrollTop = scrollTop;
}

function toggleGroupMessageSelection(index) {
  if (!isGroupSelectionMode) return;

  if (groupSelectedIndices.has(index)) {
    groupSelectedIndices.delete(index);
  } else {
    groupSelectedIndices.add(index);
  }

  // 只更新当前行的选中状态，不重新渲染整个列表
  const row = document.querySelector(
    `.msg-row.group-msg[data-index="${index}"]`
  );
  if (row) {
    const selector = row.querySelector(".bubble-selector");
    const bubble = row.querySelector(".msg-bubble");
    const isNowSelected = groupSelectedIndices.has(index);

    if (isNowSelected) {
      selector?.classList.add("selected");
      if (selector) {
        selector.querySelector(".bubble-selector-inner").innerHTML =
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      }
      bubble?.classList.add("selected");
    } else {
      selector?.classList.remove("selected");
      if (selector) {
        selector.querySelector(".bubble-selector-inner").innerHTML = "";
      }
      bubble?.classList.remove("selected");
    }
  }

  updateGroupSelectionUI();
}

function showGroupSelectionToolbar() {
  let toolbar = document.getElementById("groupSelectionToolbar");
  if (!toolbar) {
    toolbar = document.createElement("div");
    toolbar.id = "groupSelectionToolbar";
    toolbar.className = "selection-footer";
    document.body.appendChild(toolbar);
  }

  toolbar.innerHTML = `
    <button class="selection-btn cancel" onclick="exitGroupSelectionMode()">
      取消
    </button>
    <span style="font-size:0.9rem;font-weight:600;color:#333" id="groupSelectionCount">已选 0 条</span>
    <button class="selection-btn forward" onclick="showGroupForwardModal()" style="background:linear-gradient(135deg,#81d4fa,#4fc3f7);color:#fff;padding:8px 12px;border-radius:8px;font-size:0.85rem;">
      ➤ 转发
    </button>
    <button class="selection-btn favorite" onclick="favoriteGroupSelectedMessages()" style="background:linear-gradient(135deg,#f48fb1,#ec407a);color:#fff;padding:8px 12px;border-radius:8px;font-size:0.85rem;">
      ★ 收藏
    </button>
    <button class="selection-btn delete active" onclick="deleteGroupSelectedMessages()" style="padding:8px 12px;font-size:0.85rem;">
      ✕ 删除
    </button>
  `;
  toolbar.classList.add("active");
}

function updateGroupSelectionUI() {
  const countEl = document.getElementById("groupSelectionCount");
  if (countEl) {
    countEl.textContent = `已选 ${groupSelectedIndices.size} 条`;
  }
}

function exitGroupSelectionMode() {
  isGroupSelectionMode = false;
  groupSelectedIndices.clear();

  const toolbar = document.getElementById("groupSelectionToolbar");
  if (toolbar) toolbar.classList.remove("active");

  document.querySelector(".conv-input-area").style.display = "block";
  loadGroupMessages(currentGroupId);
}

async function deleteGroupSelectedMessages() {
  if (groupSelectedIndices.size === 0) {
    showToast("请选择要删除的消息");
    return;
  }

  if (!confirm(`确定删除选中的 ${groupSelectedIndices.size} 条消息？`)) return;

  const messagesKey = `group_messages_${currentGroupId}`;
  const messages = (await localforage.getItem(messagesKey)) || [];

  // 从后往前删除，避免索引变化
  const sortedIndices = Array.from(groupSelectedIndices).sort((a, b) => b - a);
  sortedIndices.forEach((idx) => {
    messages.splice(idx, 1);
  });

  await localforage.setItem(messagesKey, messages);
  showToast(`已删除 ${groupSelectedIndices.size} 条消息`);
  exitGroupSelectionMode();
}
// 群聊收藏选中消息
async function favoriteGroupSelectedMessages() {
  if (groupSelectedIndices.size === 0) {
    showToast("请先选择消息");
    return;
  }

  const group = groupChats.find((g) => g.id === currentGroupId);
  const messagesKey = `group_messages_${currentGroupId}`;
  const allMessages = (await localforage.getItem(messagesKey)) || [];

  const messages = [];
  const sortedIndices = Array.from(groupSelectedIndices).sort((a, b) => a - b);

  sortedIndices.forEach((idx) => {
    const msg = allMessages[idx];
    if (msg && msg.role !== "system") {
      const char = characters.find((c) => c.id === msg.charId);
      messages.push({
        role: msg.role,
        content: msg.content,
        senderName:
          msg.role === "user"
            ? group?.settings?.myNickname ||
              window.momentsData?.userProfile?.name ||
              "我"
            : char?.note || char?.name || "成员",
        senderAvatar:
          msg.role === "user"
            ? group?.settings?.myAvatar ||
              window.momentsData?.userProfile?.avatarImg
            : char?.avatar,
      });
    }
  });

  if (messages.length === 0) {
    showToast("没有可收藏的消息");
    return;
  }

  pendingFavoriteData = {
    type: "message",
    messages: messages,
    source: `来自群聊「${group?.name || "群聊"}」`,
    groupId: currentGroupId,
    timestamp: Date.now(),
  };

  exitGroupSelectionMode();
  openFavoriteGroupModal();
}

// 群聊转发弹窗
function showGroupForwardModal() {
  if (groupSelectedIndices.size === 0) {
    showToast("请先选择消息");
    return;
  }

  const overlay = document.getElementById("forwardModalOverlay");
  const content = document.getElementById("forwardModalContent");

  // 转发方式选择器
  let html = `
    <div class="forward-mode-selector">
      <div class="forward-mode-option ${
        forwardMode === "merge" ? "active" : ""
      }" onclick="setForwardMode('merge')">
        <div class="forward-mode-icon">📦</div>
        <div class="forward-mode-text">合并转发</div>
      </div>
      <div class="forward-mode-option ${
        forwardMode === "single" ? "active" : ""
      }" onclick="setForwardMode('single')">
        <div class="forward-mode-icon">📝</div>
        <div class="forward-mode-text">逐条转发</div>
      </div>
    </div>
    <div class="forward-chat-list">
  `;

  // 添加私聊角色
  characters.forEach((char) => {
    html += `
      <div class="forward-chat-item" onclick="forwardGroupMsgToChat('${
        char.id
      }', 'private')">
        <img class="forward-chat-avatar" src="${
          char.avatar ||
          "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐰</text></svg>"
        }" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐰</text></svg>'">
        <div class="forward-chat-info">
          <div class="forward-chat-name">${
            char.note || char.name || "未命名角色"
          }</div>
          <div class="forward-chat-type">私聊</div>
        </div>
      </div>
    `;
  });

  // 添加其他群聊
  groupChats.forEach((group) => {
    if (group.id === currentGroupId) return;
    html += `
      <div class="forward-chat-item" onclick="forwardGroupMsgToChat('${
        group.id
      }', 'group')">
        <img class="forward-chat-avatar" src="${
          group.avatar ||
          "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👥</text></svg>"
        }" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👥</text></svg>'">
        <div class="forward-chat-info">
          <div class="forward-chat-name">${group.name || "未命名群聊"}</div>
          <div class="forward-chat-type">群聊</div>
        </div>
      </div>
    `;
  });

  html += "</div>";

  if (!html.includes("forward-chat-item")) {
    html =
      '<div style="padding:20px;text-align:center;color:#999;">暂无可转发的对象</div>';
  }

  content.innerHTML = html;
  overlay.classList.add("active");
}

// 执行群聊消息转发
async function forwardGroupMsgToChat(targetId, type) {
  const messagesKey = `group_messages_${currentGroupId}`;
  const allMessages = (await localforage.getItem(messagesKey)) || [];
  const group = groupChats.find((g) => g.id === currentGroupId);
  const sourceName = group?.name || "群聊";

  const sortedIndices = Array.from(groupSelectedIndices).sort((a, b) => a - b);

  // 构建转发消息
  let forwardedMessages = [];
  sortedIndices.forEach((idx) => {
    const msg = allMessages[idx];
    if (msg && msg.role !== "system") {
      const char = characters.find((c) => c.id === msg.charId);
      const senderName =
        msg.role === "user"
          ? group?.settings?.myNickname || "我"
          : char?.note || char?.name || "成员";
      forwardedMessages.push({
        senderName: senderName,
        content: msg.content?.replace(/<[^>]+>/g, "") || "",
        isHtml: msg.isHtml,
      });
    }
  });

  if (forwardedMessages.length === 0) {
    showToast("没有可转发的消息");
    return;
  }

  if (forwardMode === "single") {
    // 逐条转发
    await forwardGroupSingleMessages(
      targetId,
      type,
      forwardedMessages,
      sourceName
    );
  } else {
    // 合并转发
    await forwardGroupMergedMessages(
      targetId,
      type,
      forwardedMessages,
      sourceName
    );
  }

  hideForwardModal();
  exitGroupSelectionMode();
}

// 群聊合并转发
async function forwardGroupMergedMessages(
  targetId,
  type,
  forwardedMessages,
  sourceName
) {
  const forwardId = "fwd_" + Date.now();
  const previewCount = Math.min(3, forwardedMessages.length);
  const hasMore = forwardedMessages.length > 3;

  const previewHtml = forwardedMessages
    .slice(0, previewCount)
    .map((m) => {
      const shortContent =
        m.content.length > 20 ? m.content.substring(0, 20) + "..." : m.content;
      return `<div class="forwarded-msg-preview-item"><span class="sender">${
        m.senderName
      }:</span>${shortContent
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</div>`;
    })
    .join("");

  if (!window.forwardedMsgData) window.forwardedMsgData = {};
  window.forwardedMsgData[forwardId] = {
    source: sourceName,
    messages: forwardedMessages,
  };
  localforage.setItem("forwardedMsgData", window.forwardedMsgData);

  const forwardHtml = `<div class="forwarded-msg-card" onclick="showForwardDetail('${forwardId}')">
    <div class="forwarded-msg-header">📨 转发的聊天记录</div>
    <div class="forwarded-msg-preview">
      ${previewHtml}
    </div>
    ${
      hasMore
        ? `<div class="forwarded-msg-more">查看${forwardedMessages.length}条消息 ›</div>`
        : ""
    }
  </div>`;

  const msgObj = {
    role: "user",
    content: forwardHtml,
    isHtml: true,
    isForwarded: true,
    forwardSource: sourceName,
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  if (type === "private") {
    if (!chatHistories[targetId]) chatHistories[targetId] = [];
    chatHistories[targetId].push(msgObj);
    await localforage.setItem("chatHistories", chatHistories);
    const char = characters.find((c) => c.id == targetId);
    updateCharacterLastMessage(targetId, "[转发消息]");
    showToast(`已转发到 ${char?.note || char?.name || "聊天"}`);
  } else {
    const targetMsgKey = `group_messages_${targetId}`;
    const targetMessages = (await localforage.getItem(targetMsgKey)) || [];
    targetMessages.push(msgObj);
    await localforage.setItem(targetMsgKey, targetMessages);
    const targetGroup = groupChats.find((g) => g.id == targetId);
    if (targetGroup) {
      targetGroup.lastMessage = "[转发消息]";
      targetGroup.lastTime = "刚刚";
      await localforage.setItem("groupChats", groupChats);
    }
    showToast(`已转发到群聊 ${targetGroup?.name || ""}`);
  }
}

// 群聊逐条转发
async function forwardGroupSingleMessages(
  targetId,
  type,
  forwardedMessages,
  sourceName
) {
  const timestamp = Date.now();
  const time = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (type === "private") {
    if (!chatHistories[targetId]) chatHistories[targetId] = [];

    forwardedMessages.forEach((msg, index) => {
      const displayContent = msg.content;
      chatHistories[targetId].push({
        role: "user",
        content: displayContent,
        isForwarded: true,
        forwardSource: sourceName,
        timestamp: timestamp + index,
        time: time,
      });
    });

    await localforage.setItem("chatHistories", chatHistories);
    const char = characters.find((c) => c.id == targetId);
    updateCharacterLastMessage(targetId, "[转发消息]");
    showToast(`已逐条转发 ${forwardedMessages.length} 条消息`);
  } else {
    const targetMsgKey = `group_messages_${targetId}`;
    const targetMessages = (await localforage.getItem(targetMsgKey)) || [];

    forwardedMessages.forEach((msg, index) => {
      const displayContent = msg.content;
      targetMessages.push({
        role: "user",
        content: displayContent,
        isForwarded: true,
        forwardSource: sourceName,
        timestamp: timestamp + index,
        time: time,
      });
    });

    await localforage.setItem(targetMsgKey, targetMessages);

    const targetGroup = groupChats.find((g) => g.id == targetId);
    if (targetGroup) {
      targetGroup.lastMessage = "[转发消息]";
      targetGroup.lastTime = "刚刚";
      await localforage.setItem("groupChats", groupChats);
    }
    showToast(`已逐条转发 ${forwardedMessages.length} 条消息`);
  }
}
// 群聊发送消息
async function sendGroupMessage(content, autoReply = false) {
  if (!currentGroupId) return;

  // 如果不是自动回复模式，需要有内容
  if (!autoReply && !content.trim()) return;

  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  const messagesKey = `group_messages_${currentGroupId}`;
  const messages = (await localforage.getItem(messagesKey)) || [];

  // 如果有用户消息内容，添加用户消息
  if (content && content.trim()) {
    const userMsg = {
      role: "user",
      content: content.trim(),
      time: new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      timestamp: Date.now(),
    };

    // 如果有引用，添加引用信息
    if (currentGroupQuote) {
      userMsg.quote = {
        sender: currentGroupQuote.sender,
        senderRole: currentGroupQuote.senderRole,
        content: currentGroupQuote.content,
        displayContent: currentGroupQuote.displayContent,
      };
    }

    messages.push(userMsg);
    await localforage.setItem(messagesKey, messages);

    // 清除引用
    cancelGroupQuote();
    // 清除@列表
    currentAtMentions = [];

    // 重新渲染
    loadGroupMessages(currentGroupId);

    // 更新群聊最后消息
    group.lastMessage = content.trim().substring(0, 30);
    group.lastTime = "刚刚";
    await localforage.setItem("groupChats", groupChats);
    renderCharacters();
  }

  // 如果是自动回复模式（通话结束后），触发AI回复
  if (autoReply) {
    await requestGroupAIReply("(请根据刚才的通话内容自然地继续对话)");
  }

  // 不再自动触发AI回复，需要用户手动点击生成回复按钮
}

// 群聊AI回复（让AI一次性扮演所有角色）
async function requestGroupAIReply(userMessage) {
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group || group.members.length === 0) return;

  const preset = apiPresets.find((p) => p.id == activePresetId);
  if (!preset || !preset.url || !preset.key) {
    showToast("请先配置API预设");
    return;
  }

  // 显示正在输入指示器
  const container = document.getElementById("convMessages");
  const typingHtml = `
    <div class="msg-row ai" id="groupTypingIndicator">
      <div class="msg-bubble">
        <div class="msg-typing"><span></span><span></span><span></span></div>
      </div>
    </div>`;
  container.insertAdjacentHTML("beforeend", typingHtml);
  container.scrollTop = container.scrollHeight;

  try {
    // 获取群聊设置
    const groupSettings = group.settings || {};
    const userNickname = groupSettings.myNickname || "我";
    const userPersona = groupSettings.myPersona || "";

    // 增强的时间感知
    const now = new Date();
    const currentTime = now.toLocaleString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

    // 计算距离上次对话过了多久
    let timeSinceLastChat = "";
    const messagesKeyForTime = `group_messages_${group.id}`;
    const allMsgsForTime =
      (await localforage.getItem(messagesKeyForTime)) || [];
    const userMessagesForTime = allMsgsForTime.filter((m) => m.role === "user");
    // 取倒数第二条用户消息（因为最后一条是刚发的）
    const previousUserMsg =
      userMessagesForTime.length >= 2
        ? userMessagesForTime[userMessagesForTime.length - 2]
        : null;

    if (previousUserMsg) {
      let lastTime = null;
      if (previousUserMsg.timestamp) {
        lastTime = new Date(previousUserMsg.timestamp);
      } else if (previousUserMsg.time) {
        const [hours, mins] = previousUserMsg.time.split(":").map(Number);
        lastTime = new Date();
        lastTime.setHours(hours, mins, 0, 0);
        if (lastTime > now) {
          lastTime.setDate(lastTime.getDate() - 1);
        }
      }

      if (lastTime) {
        const diffMs = now - lastTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
          timeSinceLastChat = `（用户${diffDays}天${
            diffHours % 24
          }小时没在群里说话了，刚回来）`;
        } else if (diffHours > 0) {
          timeSinceLastChat = `（用户${diffHours}小时${
            diffMins % 60
          }分钟没在群里说话了，刚回来）`;
        } else if (diffMins > 5) {
          timeSinceLastChat = `（用户${diffMins}分钟没在群里说话了）`;
        }
      }
    }

    // 构建群成员列表及人设
    const memberInfos = group.members
      .map((id) => {
        const c = characters.find((ch) => ch.id === id);
        if (!c) return null;
        const s = chatSettings[c.id] || {};
        // 获取该角色绑定的表情包
        const charIdStr = String(c.id);
        const boundCategories = window.aiStickerBindings
          ? window.aiStickerBindings[charIdStr] || []
          : [];
        let charStickers = [];
        if (boundCategories.length > 0 && window.customStickers) {
          charStickers = window.customStickers
            .filter((stk) => boundCategories.includes(stk.category))
            .map((stk) => stk.desc || "表情");
        }
        return {
          id: c.id,
          name: s.charName || c.name,
          displayName: c.note || c.name,
          persona: s.persona || c.description || "暂无人设",
          stickers: charStickers,
        };
      })
      .filter(Boolean);

    const membersList = memberInfos
      .map((m) => `- **${m.displayName}**: ${m.persona}`)
      .join("\n");

    // 构建表情包提示（每个角色可用的表情包）
    let stickerPrompt = "";
    const membersWithStickers = memberInfos.filter(
      (m) => m.stickers && m.stickers.length > 0
    );
    if (membersWithStickers.length > 0) {
      stickerPrompt = `\n\n# 【表情包功能】
每个角色【只能】使用自己绑定的表情包来表达情绪。使用格式：[sticker:表情名称]
各角色可用的表情包（只能使用以下列出的表情包名称）：
${membersWithStickers
  .map(
    (m) =>
      `- **${m.displayName}**: ${m.stickers.slice(0, 10).join("、")}${
        m.stickers.length > 10 ? "等" : ""
      }`
  )
  .join("\n")}

注意：
- 表情包是独立的消息，不要和文字混在同一条content里
- 要发表情包时，content字段只填表情包标签，如：{"name": "角色A", "content": "[sticker:开心]"}
- 【重要】只能使用上面列出的表情包名称，不要使用未列出的表情包
- 不要过度使用表情包，适当点缀即可`;
    }

    // 获取群公告
    const announcement = groupSettings.announcement || "";
    let announcementPrompt = "";
    if (announcement) {
      announcementPrompt = `\n\n# 【群公告】
${announcement}
（群成员可以自然地提及或讨论群公告内容）`;
    }

    // 构建群聊系统提示
    let systemPrompt = `你是群聊AI，扮演除用户外的所有角色。

# 规则
1. 用户是【${userNickname}】，你不能扮演用户
2. 只扮演下方列表中的角色，不能杜撰其他角色
3. 保持每个角色的性格和说话风格
4. 现在是 ${currentTime}${timeSinceLastChat}

# 群成员（共${memberInfos.length}人）
${membersList}

# 用户信息
${userNickname}: ${userPersona || "群主"}
${stickerPrompt}${announcementPrompt}

# 【【【输出格式铁律】】】
直接输出JSON数组，以[开头以]结尾，格式：
[{"name":"角色名","content":"内容"},{"name":"角色名","content":"内容"}]

【必须遵守】：
- content写在一行内，不要换行
- 引号用中文「」不用英文双引号
- 每条消息简短自然
- 确保JSON完整，必须以]结尾

# 语音消息
{"name":"角色名","content":"[voice:语音内容]"}

# 位置分享
位置标签格式：[位置:地点名称]
位置只写地点名称，对话内容单独发一条消息。
正确示例：先发 {"name":"角色A","content":"[位置:公司]"}，再发 {"name":"角色A","content":"我在公司加班呢~"}
错误示例：{"name":"角色A","content":"[位置] 我在公司加班呢"} ← 这是错的！

# 图片分享
图片标签格式：[photo:图片描述]
图片只写简短描述，对话内容单独发一条消息。
正确示例：先发 {"name":"角色A","content":"[photo:自拍照]"}，再发 {"name":"角色A","content":"看看我今天的穿搭~"}
错误示例：{"name":"角色A","content":"[photo:一张在办公室比心的自拍]看看我~"} ← 这是错的！

# 转账/红包
【AI发送转账给用户】格式：[转账:金额]，如 [转账:52.00]
示例：{"name":"角色A","content":"[转账:52.00]"}，再发 {"name":"角色A","content":"宝宝拿去买好吃的！"}

【用户发送转账给AI时】历史消息会显示为 [转账:金额元给角色名，状态]
- 状态为"待确认"时：被转账的角色应该用 [收款] 收款或 [退款] 退款
- 收款示例：{"name":"角色A","content":"[收款]"}，然后 {"name":"角色A","content":"谢谢宝宝的转账~"}
- 退款示例：{"name":"角色A","content":"[退款]"}，然后 {"name":"角色A","content":"不用给我钱啦~"}
- 注意：[收款] 和 [退款] 是独立消息，会更新用户的转账卡片，不会显示出来

# 要求
- 每个角色都要发言至少1次
- 生成6-12条消息
- 角色之间要互动，回复顺序可以交叉`;

    // 获取群聊历史消息作为上下文
    const messagesKey = `group_messages_${group.id}`;
    let groupHistory = (await localforage.getItem(messagesKey)) || [];
    const contextCount = groupSettings.contextCount || 20;
    // 过滤掉隐藏消息和通话卡片，只保留正常对话
    groupHistory = groupHistory
      .filter((msg) => !msg.isHidden && !msg.isCallCard)
      .slice(-contextCount);

    // 构建对话历史文本
    let historyText = "";
    groupHistory.forEach((msg) => {
      if (msg.role === "user") {
        // 检查是否是转账消息
        if (msg.transferId && msg.transferTargetId) {
          const targetChar = characters.find(
            (c) => c.id === msg.transferTargetId
          );
          const targetName = targetChar
            ? targetChar.note || targetChar.name
            : "成员";
          const status =
            msg.transferStatus === "pending"
              ? "待确认"
              : msg.transferStatus === "accepted"
              ? "已收款"
              : "已退回";
          historyText += `[${userNickname}]: [转账:${msg.transferAmount}元给${targetName}，${status}]\n`;
        } else if (!msg.isHtml) {
          historyText += `[${userNickname}]: ${msg.content}\n`;
        }
      } else if (msg.role === "assistant") {
        const sender = characters.find((c) => c.id === msg.charId);
        const senderName = sender ? sender.note || sender.name : "成员";
        historyText += `[${senderName}]: ${msg.content}\n`;
      }
    });

    // 处理记忆互通（支持单聊和其他群聊）
    const memoryLinkCount = groupSettings.memoryLinkCount || 5;
    const linkedIds =
      groupSettings.memoryLinks ||
      (groupSettings.memoryLink ? [parseInt(groupSettings.memoryLink)] : []);

    let memoryLinkContent = "";
    if (linkedIds.length > 0 && memoryLinkCount > 0) {
      let allLinkedContent = [];
      for (const linkId of linkedIds) {
        // 判断是其他群聊还是单聊
        if (typeof linkId === "string" && linkId.startsWith("group_")) {
          // 其他群聊
          const otherGroupId = parseInt(linkId.replace("group_", ""));
          const otherGroup = groupChats.find((g) => g.id === otherGroupId);
          if (otherGroup) {
            try {
              const otherMessagesKey = `group_messages_${otherGroupId}`;
              const otherMessages =
                (await localforage.getItem(otherMessagesKey)) || [];
              const recentMessages = otherMessages
                .filter((m) => !m.isHidden && !m.isCallCard)
                .slice(-memoryLinkCount);

              if (recentMessages.length > 0) {
                const otherSettings = otherGroup.settings || {};
                const otherUserNickname = otherSettings.myNickname || "用户";

                let singleLinkContent = `群聊「${
                  otherGroup.name || "群聊"
                }」的对话：\n`;
                recentMessages.forEach((msg) => {
                  if (msg.role === "user") {
                    singleLinkContent += `${otherUserNickname}: ${(
                      msg.content || ""
                    ).replace(/<[^>]*>/g, "")}\n`;
                  } else {
                    const msgChar = characters.find((c) => c.id === msg.charId);
                    const msgCharName = msgChar
                      ? msgChar.note || msgChar.name
                      : "成员";
                    singleLinkContent += `${msgCharName}: ${(
                      msg.content || ""
                    ).replace(/<[^>]*>/g, "")}\n`;
                  }
                });
                allLinkedContent.push(singleLinkContent);
              }
            } catch (e) {
              console.warn("读取其他群聊消息失败:", e);
            }
          }
        } else {
          // 单聊
          const linkedCharId = linkId;
          if (linkedCharId && chatHistories[linkedCharId]) {
            const linkedHistory = chatHistories[linkedCharId].slice(
              -memoryLinkCount
            );
            const linkedChar = characters.find((c) => c.id === linkedCharId);
            const linkedCharName = linkedChar
              ? linkedChar.note || linkedChar.name
              : "角色";
            if (linkedHistory.length > 0) {
              let singleLinkContent = `与「${linkedCharName}」的聊天：\n`;
              linkedHistory.forEach((msg) => {
                if (msg.role === "user") {
                  singleLinkContent += `${userNickname}: ${msg.content}\n`;
                } else if (msg.role === "assistant") {
                  singleLinkContent += `${linkedCharName}: ${msg.content}\n`;
                }
              });
              allLinkedContent.push(singleLinkContent);
            }
          }
        }
      }
      if (allLinkedContent.length > 0) {
        memoryLinkContent = `\n# 记忆互通（用户的其他聊天记录）\n${allLinkedContent.join(
          "\n"
        )}\n`;
      }
    }

    if (memoryLinkContent) {
      systemPrompt += memoryLinkContent;
    }

    // 处理世界书
    const worldbookIds = groupSettings.worldbook
      ? groupSettings.worldbook.split(",").filter((s) => s)
      : [];
    if (worldbookIds.length > 0) {
      // 将完整对话历史和用户消息合并用于关键词匹配
      const fullContext = historyText + " " + userMessage;
      const worldbookContent = getWorldbookContentForAI(
        worldbookIds,
        fullContext
      );
      if (worldbookContent) {
        systemPrompt += `\n# 世界书设定（重要背景知识）\n${worldbookContent}\n`;
      }
    }

    // 构建消息数组
    const messages = [{ role: "system", content: systemPrompt }];

    if (historyText) {
      messages.push({
        role: "system",
        content: `# 群聊历史记录\n${historyText}`,
      });
    }

    messages.push({
      role: "user",
      content: `[${userNickname}]: ${userMessage}\n\n请以JSON数组格式回复，让群成员们对这条消息做出反应和互动：`,
    });

    // 调用API
    let apiUrl = preset.url.replace(/\/$/, "");
    if (!apiUrl.endsWith("/chat/completions")) {
      if (apiUrl.endsWith("/v1")) {
        apiUrl += "/chat/completions";
      } else if (!apiUrl.includes("/chat/completions")) {
        apiUrl += "/v1/chat/completions";
      }
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${preset.key}`,
      },
      body: JSON.stringify({
        model: preset.model || "gpt-3.5-turbo",
        messages: messages,
        temperature:
          preset.temperature !== undefined ? Number(preset.temperature) : 0.9,
      }),
    });

    if (!response.ok) {
      // 尝试获取详细错误信息
      let errorDetail = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorDetail =
            errorData.error.message ||
            errorData.error.code ||
            JSON.stringify(errorData.error);
        } else if (errorData.message) {
          errorDetail = errorData.message;
        }
      } catch (e) {
        // 无法解析JSON，使用状态码
      }
      throw new Error(errorDetail);
    }

    const data = await response.json();

    // 移除输入指示器
    const typingIndicator = document.getElementById("groupTypingIndicator");
    if (typingIndicator) typingIndicator.remove();

    if (data.choices && data.choices[0]) {
      let replyText = data.choices[0].message.content.trim();

      // 首先过滤思维链（必须在JSON解析之前）
      replyText = filterThinkingTags(replyText);

      console.log("原始AI回复:", replyText.substring(0, 500));

      // 移除markdown代码块标记
      replyText = replyText.replace(/```json\s*/gi, "").replace(/```\s*/g, "");

      // 尝试提取JSON数组部分
      let jsonMatch = replyText.match(/\[[\s\S]*$/);
      if (jsonMatch) {
        replyText = jsonMatch[0];
      }

      // 【核心修复】彻底清理所有换行和多余空白
      replyText = replyText.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ");

      // 修复常见的JSON问题
      replyText = replyText.replace(/\[语音[：:]\s*/g, "[voice:");

      let repliesArray = [];

      // 尝试直接解析
      try {
        repliesArray = JSON.parse(replyText);
        console.log("JSON直接解析成功");
      } catch (firstError) {
        console.log("JSON需要修复:", firstError.message);

        // 【统一方案】直接用正则提取所有消息，不管JSON是否完整
        // 匹配所有 name-content 对（支持完整和不完整的）
        const allMessagesPattern =
          /"name"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"([^"]*)/g;
        let match;
        const seen = new Set();

        while ((match = allMessagesPattern.exec(replyText)) !== null) {
          const name = match[1];
          let content = match[2];

          // 清理content末尾可能的残留字符
          content = content.replace(/"\s*\}?\s*,?\s*$/, "").replace(/\s*$/, "");

          // 去重
          const key = `${name}:${content}`;
          if (!seen.has(key) && name && content) {
            seen.add(key);
            repliesArray.push({ name, content });
          }
        }

        console.log("正则提取结果:", repliesArray.length, "条消息");
      }

      if (Array.isArray(repliesArray) && repliesArray.length > 0) {
        let currentMessages = (await localforage.getItem(messagesKey)) || [];
        let lastCharName = "";
        let lastContent = "";
        let hasValidMessage = false;

        for (let i = 0; i < repliesArray.length; i++) {
          const reply = repliesArray[i];

          // 兼容多种字段名：content, message, text
          const replyContent =
            reply.content || reply.message || reply.text || "";
          const replyName = reply.name || reply.sender || reply.character || "";

          if (!replyName || !replyContent) {
            console.warn("跳过无效消息:", reply);
            continue;
          }

          // 查找对应的角色（更宽松的匹配）
          const matchedMember = memberInfos.find(
            (m) =>
              m.displayName === replyName ||
              m.name === replyName ||
              m.displayName.includes(replyName) ||
              replyName.includes(m.displayName)
          );

          if (!matchedMember) {
            console.warn(`未找到角色: ${replyName}，尝试使用第一个成员`);
            // 如果找不到匹配的成员，使用第一个成员
            const fallbackMember = memberInfos[0];
            if (fallbackMember && replyContent.trim()) {
              currentMessages.push({
                role: "assistant",
                charId: fallbackMember.id,
                content: replyContent.trim(),
                time: new Date().toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              });
              lastCharName = fallbackMember.displayName;
              lastContent = replyContent.trim();
              hasValidMessage = true;

              // 保存并渲染
              await localforage.setItem(messagesKey, currentMessages);
              loadGroupMessages(currentGroupId);

              // 延迟显示下一条
              if (i < repliesArray.length - 1) {
                await new Promise((r) =>
                  setTimeout(r, 800 + Math.random() * 1200)
                );
              }
            }
            continue;
          }

          // 检查是否是收款标签
          const isAcceptTag = /^\[收款\]$/i.test(replyContent.trim());
          if (isAcceptTag) {
            await updateGroupUserTransferStatus(matchedMember.id, true);
            // 重新读取消息，因为 updateGroupUserTransferStatus 修改了数据
            currentMessages = (await localforage.getItem(messagesKey)) || [];
            continue;
          }

          // 检查是否是退款标签
          const isRejectTag = /^\[退款\]$/i.test(replyContent.trim());
          if (isRejectTag) {
            await updateGroupUserTransferStatus(matchedMember.id, false);
            // 重新读取消息
            currentMessages = (await localforage.getItem(messagesKey)) || [];
            continue;
          }

          // 添加消息
          currentMessages.push({
            role: "assistant",
            charId: matchedMember.id,
            content: replyContent.trim(),
            time: new Date().toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          });

          lastCharName = matchedMember.displayName;
          lastContent = replyContent.trim();
          hasValidMessage = true;

          // 保存并渲染
          await localforage.setItem(messagesKey, currentMessages);
          loadGroupMessages(currentGroupId);

          // 延迟显示下一条，模拟真实聊天
          if (i < repliesArray.length - 1) {
            await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));
          }
        }

        // 更新群聊最后消息
        if (hasValidMessage && lastCharName && lastContent) {
          group.lastMessage = `${lastCharName}: ${lastContent.substring(
            0,
            20
          )}`;
          group.lastTime = "刚刚";
          await localforage.setItem("groupChats", groupChats);
          renderCharacters();
        }
      } else {
        // 回退处理：如果解析失败或数组为空
        console.warn("群聊回复解析失败或为空，尝试回退处理");
        const firstMember = memberInfos[0];
        if (firstMember && replyText && replyText.trim()) {
          const currentMessages =
            (await localforage.getItem(messagesKey)) || [];

          // 尝试手动解析JSON对象（更宽松的模式）
          const msgPattern =
            /"name"\s*:\s*"([^"]+)"[^}]*"content"\s*:\s*"([^"]*)/g;
          let msgMatch;
          const extractedMessages = [];

          while ((msgMatch = msgPattern.exec(replyText)) !== null) {
            const msgName = msgMatch[1];
            let msgContent = msgMatch[2];
            // 清理content
            msgContent = msgContent
              .replace(/"\s*\}?\s*,?\s*\{?\s*$/, "")
              .replace(/\\"/g, '"')
              .replace(/\\n/g, "\n");

            if (msgName && msgContent) {
              // 查找匹配的成员
              const matchedMember =
                memberInfos.find(
                  (m) =>
                    m.displayName === msgName ||
                    m.name === msgName ||
                    m.displayName.includes(msgName) ||
                    msgName.includes(m.displayName)
                ) || firstMember;

              extractedMessages.push({
                role: "assistant",
                charId: matchedMember.id,
                content: msgContent.trim(),
                time: new Date().toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              });
            }
          }

          if (extractedMessages.length > 0) {
            // 逐条显示消息
            for (let i = 0; i < extractedMessages.length; i++) {
              currentMessages.push(extractedMessages[i]);
              await localforage.setItem(messagesKey, currentMessages);
              loadGroupMessages(currentGroupId);

              if (i < extractedMessages.length - 1) {
                await new Promise((r) =>
                  setTimeout(r, 800 + Math.random() * 1200)
                );
              }
            }

            const lastMsg = extractedMessages[extractedMessages.length - 1];
            const lastChar = characters.find((c) => c.id === lastMsg.charId);
            group.lastMessage = `${
              lastChar?.note || lastChar?.name || "成员"
            }: ${lastMsg.content.substring(0, 20)}`;
            group.lastTime = "刚刚";
            await localforage.setItem("groupChats", groupChats);
            renderCharacters();
          } else {
            console.error("无法解析任何消息");
            showToast("AI回复格式异常");
          }
        }
      }
    } else {
      console.error("API返回无效响应:", data);
      showToast("AI返回了空响应");
    }
  } catch (e) {
    console.error("群聊AI回复失败:", e);
    showToast("AI回复失败: " + (e.message || "请检查API配置"));
    const typingIndicator = document.getElementById("groupTypingIndicator");
    if (typingIndicator) typingIndicator.remove();
  }
}

// 获取群成员的AI回复（保留用于兼容）
async function getGroupMemberReply(char, userMessage, group) {
  const preset = apiPresets.find((p) => p.id == activePresetId);
  if (!preset || !preset.url || !preset.key) {
    return `[${char.note || char.name}]：API未配置，无法回复`;
  }

  // 获取该角色的个人设置（人设等）
  const charSettings = chatSettings[char.id] || {};
  const charName = charSettings.charName || char.name;
  const charPersona = charSettings.persona || char.description || "";

  // 获取群聊设置
  const groupSettings = group.settings || {};
  const userNickname = groupSettings.myNickname || "用户";
  const userPersona = groupSettings.myPersona || "";

  // 获取所有群成员信息
  const memberInfos = group.members
    .map((id) => {
      const c = characters.find((ch) => ch.id === id);
      if (!c) return null;
      const s = chatSettings[c.id] || {};
      return {
        id: c.id,
        name: s.charName || c.name,
        displayName: c.note || c.name,
        persona: s.persona || c.description || "",
      };
    })
    .filter(Boolean);

  const memberNames = memberInfos.map((m) => m.displayName).join("、");

  // 构建群聊系统提示 - 严格遵循人设
  let systemPrompt = `【角色设定】
你是「${charName}」，正在一个群聊中参与对话。

【你的人设 - 必须严格遵守】
${charPersona || `你是${charName}，性格友好，说话自然。`}

【群聊信息】
- 群名：${group.name}
- 群成员：${memberNames}

【用户信息】
- 用户昵称：${userNickname}
${userPersona ? `- 用户人设：${userPersona}` : ""}

【其他群成员的人设参考】
${memberInfos
  .filter((m) => m.id !== char.id)
  .map((m) => `- ${m.displayName}：${m.persona || "暂无人设"}`)
  .join("\n")}

【回复规则 - 必须遵守】
1. 你必须始终以「${charName}」的身份和人设回复，不可偏离角色
2. 保持你的性格特点、说话风格、口头禅等
3. 回复要简短自然，像真实群聊一样（通常1-3句话）
4. 可以与其他成员互动，也可以只回复用户
5. 不要使用过于正式的语言，保持轻松的群聊氛围
6. 不要在回复中标注自己的名字或身份`;

  // 加入时间感知
  if (groupSettings.timeAware !== false) {
    systemPrompt += `\n\n【当前时间】${new Date().toLocaleString("zh-CN")}`;
  }

  // 获取群聊历史消息作为上下文
  const messagesKey = `group_messages_${group.id}`;
  let groupHistory = (await localforage.getItem(messagesKey)) || [];
  const contextCount = groupSettings.contextCount || 20;
  groupHistory = groupHistory.slice(-contextCount);

  // 构建对话历史
  const conversationHistory = groupHistory
    .map((msg) => {
      if (msg.role === "user") {
        return {
          role: "user",
          content: `[${userNickname}]: ${msg.content}`,
        };
      } else if (msg.role === "assistant") {
        const sender = characters.find((c) => c.id === msg.charId);
        const senderName = sender ? sender.note || sender.name : "成员";
        return {
          role: "assistant",
          content: `[${senderName}]: ${msg.content}`,
        };
      } else if (msg.role === "system") {
        return { role: "system", content: msg.content };
      }
      return null;
    })
    .filter(Boolean);

  // 处理记忆互通（支持多选，包括单聊和其他群聊）
  let memoryLinkContent = "";
  const memoryLinkCount = groupSettings.memoryLinkCount || 5;

  // 优先使用新的多选数组，兼容旧的单选
  const linkedIds =
    groupSettings.memoryLinks ||
    (groupSettings.memoryLink ? [parseInt(groupSettings.memoryLink)] : []);

  if (linkedIds.length > 0 && memoryLinkCount > 0) {
    let allLinkedContent = [];

    for (const linkId of linkedIds) {
      // 判断是其他群聊还是单聊
      if (typeof linkId === "string" && linkId.startsWith("group_")) {
        // 其他群聊
        const otherGroupId = parseInt(linkId.replace("group_", ""));
        const otherGroup = groupChats.find((g) => g.id === otherGroupId);
        if (otherGroup) {
          try {
            const otherMessagesKey = `group_messages_${otherGroupId}`;
            const otherMessages =
              (await localforage.getItem(otherMessagesKey)) || [];
            const recentMessages = otherMessages
              .filter((m) => !m.isHidden && !m.isCallCard)
              .slice(-memoryLinkCount);

            if (recentMessages.length > 0) {
              const otherSettings = otherGroup.settings || {};
              const otherUserNickname = otherSettings.myNickname || "用户";

              let singleLinkContent = `【群聊「${
                otherGroup.name || "群聊"
              }」的聊天记录】\n`;
              recentMessages.forEach((msg) => {
                if (msg.role === "user") {
                  singleLinkContent += `${otherUserNickname}: ${(
                    msg.content || ""
                  ).replace(/<[^>]*>/g, "")}\n`;
                } else {
                  const msgChar = characters.find((c) => c.id === msg.charId);
                  const msgCharName = msgChar
                    ? msgChar.note || msgChar.name
                    : "成员";
                  singleLinkContent += `${msgCharName}: ${(
                    msg.content || ""
                  ).replace(/<[^>]*>/g, "")}\n`;
                }
              });
              allLinkedContent.push(singleLinkContent);
            }
          } catch (e) {
            console.warn("读取其他群聊消息失败:", e);
          }
        }
      } else {
        // 单聊
        const linkedCharId = linkId;
        if (linkedCharId && chatHistories[linkedCharId]) {
          const linkedHistory = chatHistories[linkedCharId].slice(
            -memoryLinkCount
          );
          const linkedChar = characters.find((c) => c.id === linkedCharId);
          const linkedCharName = linkedChar
            ? linkedChar.note || linkedChar.name
            : "角色";

          if (linkedHistory.length > 0) {
            let singleLinkContent = `【与「${linkedCharName}」的聊天记录】\n`;
            linkedHistory.forEach((msg) => {
              if (msg.role === "user") {
                singleLinkContent += `${userNickname}: ${msg.content}\n`;
              } else if (msg.role === "assistant") {
                singleLinkContent += `${linkedCharName}: ${msg.content}\n`;
              }
            });
            allLinkedContent.push(singleLinkContent);
          }
        }
      }
    }

    if (allLinkedContent.length > 0) {
      memoryLinkContent = `\n\n【记忆互通 - 共${allLinkedContent.length}个聊天记录】\n以下是用户的其他聊天记录，供你参考了解用户的近况：\n\n`;
      memoryLinkContent += allLinkedContent.join("\n");
      memoryLinkContent += `\n【记忆互通结束】\n`;
    }
  }

  if (memoryLinkContent) {
    systemPrompt += memoryLinkContent;
  }

  // 构建最终的消息数组
  const messages = [{ role: "system", content: systemPrompt }];

  // 添加历史对话
  if (conversationHistory.length > 0) {
    // 将历史消息合并为一条系统消息，提供上下文
    const historyText = conversationHistory.map((m) => m.content).join("\n");
    messages.push({
      role: "system",
      content: `【群聊历史记录】\n${historyText}\n【历史记录结束】`,
    });
  }

  // 添加当前用户消息
  messages.push({
    role: "user",
    content: `[${userNickname}]: ${userMessage}\n\n请以「${charName}」的身份回复（直接输出回复内容，不要带角色名前缀）：`,
  });

  try {
    // 确保URL格式正确
    let apiUrl = preset.url.replace(/\/$/, "");
    if (!apiUrl.endsWith("/chat/completions")) {
      if (apiUrl.endsWith("/v1")) {
        apiUrl += "/chat/completions";
      } else if (!apiUrl.includes("/chat/completions")) {
        apiUrl += "/v1/chat/completions";
      }
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${preset.key}`,
      },
      body: JSON.stringify({
        model: preset.model || "gpt-3.5-turbo",
        messages: messages,
        max_tokens: 300,
        temperature:
          preset.temperature !== undefined ? Number(preset.temperature) : 0.8,
      }),
    });

    const data = await response.json();
    if (data.choices && data.choices[0]) {
      let reply = data.choices[0].message.content;
      // 过滤思维链
      reply = filterThinkingTags(reply);
      // 清理可能的角色名前缀
      reply = reply.replace(/^\[.*?\]:\s*/g, "").trim();
      reply = reply.replace(new RegExp(`^${charName}[：:]\s*`, "g"), "").trim();
      return reply;
    }
  } catch (e) {
    console.error("群聊AI请求失败:", e);
  }
  return null;
}

// 打开添加群成员弹窗
function openAddGroupMemberModal() {
  if (!currentGroupId) return;
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  tempAddMembers = [];
  document.getElementById("addGroupMemberModal").classList.add("active");
  renderAddMembersList(group);
}

// 关闭添加群成员弹窗
function closeAddGroupMemberModal() {
  document.getElementById("addGroupMemberModal").classList.remove("active");
  tempAddMembers = [];
}

// 渲染可添加的成员列表
function renderAddMembersList(group) {
  const container = document.getElementById("addMembersList");
  const availableChars = characters.filter(
    (c) => !group.members.includes(c.id)
  );

  if (availableChars.length === 0) {
    container.innerHTML = `
      <div class="create-group-empty">
        <div class="create-group-empty-icon">🎉</div>
        <div>所有角色都已在群里啦</div>
      </div>
    `;
    return;
  }

  container.innerHTML = availableChars
    .map((char) => {
      const isSelected = tempAddMembers.includes(char.id);
      const displayName = char.note || char.name;
      return `
      <div class="create-group-member-item ${
        isSelected ? "selected" : ""
      }" onclick="toggleAddMember(${char.id})">
        <div class="create-group-member-avatar">
          ${char.avatar ? `<img src="${char.avatar}">` : char.name.charAt(0)}
        </div>
        <div class="create-group-member-info">
          <div class="create-group-member-name">${displayName}</div>
        </div>
        <div class="create-group-member-check"></div>
      </div>
    `;
    })
    .join("");
}

// 切换添加成员选中状态
function toggleAddMember(charId) {
  const index = tempAddMembers.indexOf(charId);
  if (index > -1) {
    tempAddMembers.splice(index, 1);
  } else {
    tempAddMembers.push(charId);
  }

  const group = groupChats.find((g) => g.id === currentGroupId);
  if (group) renderAddMembersList(group);

  document.getElementById(
    "addMembersCount"
  ).textContent = `已选 ${tempAddMembers.length} 人`;
  document.getElementById("addMemberConfirmBtn").disabled =
    tempAddMembers.length === 0;
}

// 确认添加群成员
async function confirmAddGroupMembers() {
  if (tempAddMembers.length === 0 || !currentGroupId) return;

  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  group.members = [...group.members, ...tempAddMembers];
  await localforage.setItem("groupChats", groupChats);

  // 添加系统消息
  const messagesKey = `group_messages_${currentGroupId}`;
  const messages = (await localforage.getItem(messagesKey)) || [];
  const addedNames = tempAddMembers
    .map((id) => {
      const char = characters.find((c) => c.id === id);
      return char ? char.note || char.name : "成员";
    })
    .join("、");

  messages.push({
    role: "system",
    content: `${addedNames} 加入了群聊`,
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
  await localforage.setItem(messagesKey, messages);

  showToast(`已添加 ${tempAddMembers.length} 位成员`);
  closeAddGroupMemberModal();
  loadGroupMessages(currentGroupId);
  renderGroupSettingsMembers();
}

// 从群聊中移除成员
async function removeGroupMember(charId) {
  if (!currentGroupId) return;
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  if (group.members.length <= 2) {
    alert("群聊至少需要2个成员");
    return;
  }

  const char = characters.find((c) => c.id === charId);
  const charName = char ? char.note || char.name : "成员";

  if (!confirm(`确定要将「${charName}」移出群聊吗？`)) return;

  group.members = group.members.filter((id) => id !== charId);
  await localforage.setItem("groupChats", groupChats);

  // 添加系统消息
  const messagesKey = `group_messages_${currentGroupId}`;
  const messages = (await localforage.getItem(messagesKey)) || [];
  messages.push({
    role: "system",
    content: `${charName} 离开了群聊`,
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
  await localforage.setItem(messagesKey, messages);

  showToast(`已移除 ${charName}`);
  loadGroupMessages(currentGroupId);
  renderGroupSettingsMembers();
}

// 解散群聊
window.dissolveGroup = async function () {
  if (!currentGroupId) return;
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  if (!confirm(`确定要解散群聊「${group.name}」吗？聊天记录将被删除。`)) return;

  // 删除聊天记录
  await localforage.removeItem(`group_messages_${currentGroupId}`);

  // 删除群聊
  groupChats = groupChats.filter((g) => g.id !== currentGroupId);
  await localforage.setItem("groupChats", groupChats);

  showToast("群聊已解散");
  closeGroupChatSettings();
  closeConversation();
  renderCharacters();
};

// 导出群聊聊天记录
window.exportGroupChat = async function () {
  if (!currentGroupId) return;
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  const messagesKey = `group_messages_${currentGroupId}`;
  const messages = (await localforage.getItem(messagesKey)) || [];

  if (messages.length === 0) {
    showToast("没有聊天记录可导出");
    return;
  }

  // 导出包含群聊信息和消息
  const exportData = {
    type: "pinky_group_chat_export",
    version: 1,
    groupInfo: {
      name: group.name,
      avatar: group.avatar,
      members: group.members,
      settings: group.settings,
    },
    messages: messages,
    exportTime: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `group-chat-${group.name || "export"}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("聊天记录已导出");
};

// 导入群聊聊天记录
window.importGroupChat = function () {
  if (!currentGroupId) return;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      let messages = [];

      // 支持两种格式：完整导出格式和纯消息数组
      if (
        data.type === "pinky_group_chat_export" &&
        Array.isArray(data.messages)
      ) {
        messages = data.messages;
      } else if (Array.isArray(data)) {
        messages = data;
      } else {
        throw new Error("无效的聊天记录格式");
      }

      // 询问用户是覆盖还是追加
      const choice = confirm(
        "点击「确定」覆盖现有记录，点击「取消」追加到现有记录末尾"
      );

      const messagesKey = `group_messages_${currentGroupId}`;

      if (choice) {
        // 覆盖
        await localforage.setItem(messagesKey, messages);
      } else {
        // 追加
        const existingMessages = (await localforage.getItem(messagesKey)) || [];
        await localforage.setItem(messagesKey, [
          ...existingMessages,
          ...messages,
        ]);
      }

      loadGroupMessages(currentGroupId);
      showToast(`成功导入 ${messages.length} 条消息`);

      // 更新消息计数
      const newMessages = (await localforage.getItem(messagesKey)) || [];
      const countEl = document.getElementById("groupMsgCount");
      if (countEl) countEl.textContent = newMessages.length;
    } catch (err) {
      alert("导入失败：" + err.message);
    }
  };
  input.click();
};

// 清空群聊聊天记录
window.clearGroupChat = async function () {
  if (!currentGroupId) return;
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  if (
    !confirm(
      `确定要清空群聊「${group.name}」的所有聊天记录吗？此操作不可撤销！`
    )
  )
    return;

  const messagesKey = `group_messages_${currentGroupId}`;
  await localforage.setItem(messagesKey, []);

  loadGroupMessages(currentGroupId);
  showToast("聊天记录已清空");

  // 更新消息计数
  const countEl = document.getElementById("groupMsgCount");
  if (countEl) countEl.textContent = "0";
};

// ==================== 群聊引用功能 ====================
var currentGroupQuote = null;

// 设置群聊引用
function setGroupQuote(msgIndex) {
  if (!currentGroupId) return;

  localforage.getItem(`group_messages_${currentGroupId}`).then((messages) => {
    if (!messages || !messages[msgIndex]) return;

    const msg = messages[msgIndex];
    let senderName = "未知";

    if (msg.role === "user") {
      const group = groupChats.find((g) => g.id === currentGroupId);
      senderName = group?.settings?.myNickname || "我";
    } else if (msg.role === "assistant") {
      const char = characters.find((c) => c.id === msg.charId);
      senderName = char ? char.note || char.name : "成员";
    }

    let content = msg.content || "";
    content = content.replace(/<[^>]+>/g, "").trim();
    if (content.length > 50) content = content.substring(0, 50) + "...";

    currentGroupQuote = {
      msgIndex: msgIndex,
      sender: senderName,
      senderRole: msg.role,
      charId: msg.charId,
      content: msg.content,
      displayContent: content,
    };

    // 显示引用预览
    const preview = document.getElementById("groupQuotePreview");
    preview.classList.add("active");
    document.getElementById("groupQuotePreviewSender").textContent = senderName;
    document.getElementById("groupQuotePreviewText").textContent = content;

    // 聚焦输入框
    document.getElementById("convInput").focus();

    showToast("已引用消息");
    hideContextMenu();
  });
}

// 取消群聊引用
function cancelGroupQuote() {
  currentGroupQuote = null;
  const preview = document.getElementById("groupQuotePreview");
  if (preview) preview.classList.remove("active");
}

// ==================== @功能 ====================
var currentAtMentions = []; // 当前@的成员列表

// 监听输入框@符号
function checkAtTrigger(e) {
  if (!currentGroupId) return;

  const input = e.target;
  const value = input.value;
  const cursorPos = input.selectionStart;

  // 检查光标前是否有@符号
  const beforeCursor = value.substring(0, cursorPos);
  const atMatch = beforeCursor.match(/@([^@\s]*)$/);

  if (atMatch) {
    showAtSelector(atMatch[1], cursorPos - atMatch[0].length);
  } else {
    hideAtSelector();
  }
}

// 显示@选择器
function showAtSelector(searchText, atPosition) {
  const popup = document.getElementById("atSelectorPopup");
  if (!popup) return;

  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  const groupSettings = group.settings || {};
  const myNickname = groupSettings.myNickname || "我";

  // 获取所有可@的成员（包括自己和所有群成员）
  let members = [{ id: "all", name: "所有人", avatar: null, isAll: true }];

  group.members.forEach((id) => {
    const char = characters.find((c) => c.id === id);
    if (char) {
      members.push({
        id: char.id,
        name: char.note || char.name,
        avatar: char.avatar,
      });
    }
  });

  // 添加用户自己
  members.push({
    id: "user",
    name: myNickname,
    avatar: groupSettings.myAvatar || null,
    isUser: true,
  });

  // 搜索过滤
  if (searchText) {
    const search = searchText.toLowerCase();
    members = members.filter((m) => m.name.toLowerCase().includes(search));
  }

  if (members.length === 0) {
    hideAtSelector();
    return;
  }

  popup.innerHTML = members
    .map(
      (m) => `
    <div class="at-selector-item" onclick="selectAtMember('${m.id}', '${
        m.name
      }', ${m.isAll || false})">
      <div class="at-selector-avatar">
        ${
          m.isAll
            ? "👥"
            : m.avatar
            ? `<img src="${m.avatar}">`
            : m.name.charAt(0)
        }
      </div>
      <div class="at-selector-name">${m.name}</div>
    </div>
  `
    )
    .join("");

  popup.classList.add("active");
  popup.dataset.atPosition = atPosition;
}

// 隐藏@选择器
function hideAtSelector() {
  const popup = document.getElementById("atSelectorPopup");
  if (popup) popup.classList.remove("active");
}

// 选择@成员
function selectAtMember(id, name, isAll) {
  const input = document.getElementById("convInput");
  const popup = document.getElementById("atSelectorPopup");
  if (!input || !popup) return;

  const atPosition = parseInt(popup.dataset.atPosition) || 0;
  const value = input.value;

  // 替换@及后面的搜索文本为@成员名
  const beforeAt = value.substring(0, atPosition);
  const afterCursor = value.substring(input.selectionStart);

  const newValue = beforeAt + "@" + name + " " + afterCursor;
  input.value = newValue;

  // 设置光标位置
  const newCursorPos = atPosition + name.length + 2;
  input.setSelectionRange(newCursorPos, newCursorPos);

  // 记录@成员
  if (!currentAtMentions.find((m) => m.id === id)) {
    currentAtMentions.push({ id, name, isAll });
  }

  hideAtSelector();
  input.focus();
}

// 处理消息中的@标记
function processAtMentions(text) {
  if (!text) return text;
  // 将@某人 替换为带样式的@标记
  return text.replace(/@(\S+)/g, '<span class="at-mention">@$1</span>');
}

// ==================== 群公告功能 ====================

// 打开群公告弹窗
function openGroupAnnouncementModal() {
  if (!currentGroupId) return;

  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  const announcement = group.settings?.announcement || "";
  document.getElementById("groupAnnouncementInput").value = announcement;
  document.getElementById("groupAnnouncementModal").classList.add("active");
}

// 关闭群公告弹窗
function closeGroupAnnouncementModal() {
  document.getElementById("groupAnnouncementModal").classList.remove("active");
}

// 保存群公告
async function saveGroupAnnouncement() {
  if (!currentGroupId) return;

  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  const announcement = document
    .getElementById("groupAnnouncementInput")
    .value.trim();

  group.settings = group.settings || {};
  group.settings.announcement = announcement;

  await localforage.setItem("groupChats", groupChats);

  // 更新显示
  updateGroupAnnouncementBar(announcement);

  closeGroupAnnouncementModal();
  showToast("群公告已保存");
}

// 更新群公告栏显示
function updateGroupAnnouncementBar(announcement) {
  const bar = document.getElementById("groupAnnouncementBar");
  const text = document.getElementById("groupAnnouncementText");

  if (bar && text) {
    if (announcement) {
      text.textContent =
        announcement.length > 30
          ? announcement.substring(0, 30) + "..."
          : announcement;
    } else {
      text.textContent = "点击设置群公告";
    }
  }
}

// 显示/隐藏群公告栏
function toggleGroupAnnouncementBar(show) {
  const bar = document.getElementById("groupAnnouncementBar");
  if (bar) {
    bar.style.display = show ? "flex" : "none";
  }
}

// 删除联系人（完全删除角色及其所有数据）
window.deleteCharacterCompletely = async function () {
  if (!currentChatCharId) return;
  const char = characters.find((c) => c.id === currentChatCharId);
  if (!char) return;

  const charName = char.note || char.name;

  if (
    !confirm(
      `⚠️ 警告：确定要删除联系人「${charName}」吗？\n\n这将删除：\n• 角色卡片和所有设置\n• 全部聊天记录\n• 记忆总结数据\n\n此操作不可撤销！`
    )
  )
    return;

  // 再次确认
  if (!confirm(`最后确认：真的要永久删除「${charName}」吗？`)) return;

  const charId = currentChatCharId;

  // 1. 删除聊天记录
  delete chatHistories[charId];
  await localforage.setItem("chatHistories", chatHistories);

  // 2. 删除聊天设置
  delete chatSettings[charId];
  await localforage.setItem("chatSettings", chatSettings);

  // 3. 删除记忆总结
  if (window.memorySummaries) {
    delete window.memorySummaries[charId];
    await localforage.setItem("memorySummaries", window.memorySummaries);
  }

  // 4. 从群聊中移除该角色
  for (const group of groupChats) {
    if (group.members && group.members.includes(charId)) {
      group.members = group.members.filter((id) => id !== charId);
    }
    // 清除记忆互通中的引用
    if (group.settings && group.settings.memoryLinks) {
      group.settings.memoryLinks = group.settings.memoryLinks.filter(
        (id) => id !== charId
      );
    }
  }
  await localforage.setItem("groupChats", groupChats);

  // 5. 清除其他角色对此角色的记忆互通引用
  for (const key in chatSettings) {
    if (chatSettings[key].memoryLinks) {
      chatSettings[key].memoryLinks = chatSettings[key].memoryLinks.filter(
        (id) => id !== charId
      );
    }
    if (chatSettings[key].memoryLink == charId) {
      chatSettings[key].memoryLink = "";
    }
  }
  await localforage.setItem("chatSettings", chatSettings);

  // 6. 清除表情包绑定
  if (window.aiStickerBindings) {
    delete window.aiStickerBindings[String(charId)];
    await localforage.setItem("aiStickerBindings", window.aiStickerBindings);
  }

  // 7. 删除角色本身
  characters = characters.filter((c) => c.id !== charId);
  await localforage.setItem("characters", characters);

  showToast(`已删除联系人「${charName}」`);
  closeChatSettings();
  closeConversation();
  renderCharacters();
};

// 渲染群聊设置中的成员列表
function renderGroupSettingsMembers() {
  if (!currentGroupId) return;
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  // 更新旧的群成员网格（如果存在）
  const container = document.getElementById("groupMembersGrid");
  if (container) {
    let html = group.members
      .map((memberId) => {
        const char = characters.find((c) => c.id === memberId);
        if (!char) return "";
        const displayName = char.note || char.name;
        return `
        <div class="group-member-card">
          <div class="group-member-card-avatar">
            ${char.avatar ? `<img src="${char.avatar}">` : char.name.charAt(0)}
            <div class="remove-btn" onclick="removeGroupMember(${
              char.id
            })">✕</div>
          </div>
          <div class="group-member-card-name">${displayName}</div>
        </div>
      `;
      })
      .join("");

    // 添加"添加成员"按钮
    html += `
      <div class="group-member-card">
        <div class="group-add-member-card" onclick="openAddGroupMemberModal()">+</div>
        <div class="group-member-card-name">添加</div>
      </div>
    `;

    container.innerHTML = html;
  }

  // 更新新的群聊设置页面成员列表（如果存在）
  const newContainer = document.getElementById("groupSettingsMembersList");
  if (newContainer) {
    const members = group.members
      .map((id) => characters.find((c) => c.id === id))
      .filter(Boolean);
    newContainer.innerHTML = members
      .map(
        (m) => `
      <div class="group-settings-member-item">
        <div class="group-settings-member-avatar">
          ${m.avatar ? `<img src="${m.avatar}" alt="">` : m.name.charAt(0)}
        </div>
        <div class="group-settings-member-name">${m.name}</div>
      </div>
    `
      )
      .join("");
  }
}

// 初始化加载群聊数据
async function loadGroupChats() {
  try {
    groupChats = (await localforage.getItem("groupChats")) || [];
  } catch (e) {
    groupChats = [];
  }
}

function renderCharacters() {
  const container = document.getElementById("messageList");

  // 检查是否既没有角色也没有群聊
  if (characters.length === 0 && (!groupChats || groupChats.length === 0)) {
    container.innerHTML = `
                              <div class="empty-state" id="emptyMessages">
                                  <div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>
                                  <div class="empty-text">还没有消息哦</div>
                                  <div class="empty-hint">添加AI角色开始聊天吧～</div>
                              </div>
                          `;
    return;
  }

  // 分离置顶和普通角色
  const pinnedChars = [];
  const normalChars = [];
  const groupedChars = {};

  characters.forEach((char) => {
    const settings = chatSettings[char.id] || {};
    if (settings.pinned) {
      pinnedChars.push(char);
    } else if (settings.group && settings.group !== "none") {
      if (!groupedChars[settings.group]) {
        groupedChars[settings.group] = [];
      }
      groupedChars[settings.group].push(char);
    } else {
      normalChars.push(char);
    }
  });

  // 生成角色卡片HTML的函数
  const renderCharCard = (char, isPinned = false) => {
    const displayName = char.note || char.name;
    let sparkHtml = "";
    if (char.flameData && char.flameData.active) {
      sparkHtml = `<span class="spark-badge">${char.flameData.icon} ${char.flameData.days}</span>`;
    }
    // 获取未读消息数
    const unreadCount =
      (typeof unreadMessages !== "undefined" && unreadMessages[char.id]) ||
      char.unread ||
      0;
    return `
      <div class="message-item ${isPinned ? "pinned" : ""}" data-id="${
      char.id
    }">
        <div class="message-avatar">
          ${
            char.avatar ? `<img src="${char.avatar}" alt="${char.name}">` : "AI"
          }
        </div>
        <div class="message-info">
          <div class="message-top">
            <span class="message-name">${displayName} ${sparkHtml}</span>
            <span class="message-time">${char.lastTime || ""}</span>
          </div>
          <div class="message-preview">${
            char.lastMessage || "点击开始聊天～"
          }</div>
        </div>
        ${
          unreadCount > 0
            ? `<div class="message-badge">${unreadCount}</div>`
            : ""
        }
      </div>
    `;
  };

  // 生成群聊卡片HTML的函数
  const renderGroupCard = (group) => {
    const memberCount = group.members ? group.members.length : 0;
    let avatarHtml = "";

    if (group.avatar) {
      avatarHtml = `<img src="${group.avatar}" alt="${group.name}">`;
    } else if (group.members && group.members.length > 0) {
      // 生成成员头像堆叠
      const members = group.members.slice(0, 3);
      let stackHtml = members
        .map((memberId) => {
          const char = characters.find((c) => c.id === memberId);
          if (!char) return '<div class="avatar-mini">?</div>';
          return `<div class="avatar-mini">${
            char.avatar ? `<img src="${char.avatar}">` : char.name.charAt(0)
          }</div>`;
        })
        .join("");
      if (group.members.length > 3) {
        stackHtml += `<div class="avatar-mini more">+${
          group.members.length - 3
        }</div>`;
      }
      avatarHtml = `<div class="group-avatar-stack">${stackHtml}</div>`;
    } else {
      avatarHtml = "👥";
    }

    return `
      <div class="message-item group-chat" data-group-id="${group.id}">
        <div class="message-avatar">
          ${avatarHtml}
        </div>
        <div class="message-info">
          <div class="message-top">
            <span class="message-name">${
              group.name
            } <span style="font-size:0.7rem;color:#999;">(${memberCount}人)</span></span>
            <span class="message-time">${group.lastTime || ""}</span>
          </div>
          <div class="message-preview">${
            group.lastMessage || "点击开始群聊～"
          }</div>
        </div>
        ${
          group.unread > 0
            ? `<div class="message-badge">${group.unread}</div>`
            : ""
        }
      </div>
    `;
  };

  let html = "";

  // 获取角色最后消息时间戳的函数
  const getLastMessageTime = (char) => {
    // 优先使用角色自身保存的时间戳
    if (char.lastTimestamp) {
      return char.lastTimestamp;
    }
    // 否则从聊天记录获取
    const history = chatHistories[char.id];
    if (history && history.length > 0) {
      const lastMsg = history[history.length - 1];
      return lastMsg.timestamp || 0;
    }
    return 0;
  };

  // 对非置顶角色按最后消息时间排序（新消息在前）
  normalChars.sort((a, b) => {
    const timeA = getLastMessageTime(a);
    const timeB = getLastMessageTime(b);
    return timeB - timeA;
  });

  // 对分组内的角色也排序
  Object.keys(groupedChars).forEach((groupName) => {
    groupedChars[groupName].sort((a, b) => {
      const timeA = getLastMessageTime(a);
      const timeB = getLastMessageTime(b);
      return timeB - timeA;
    });
  });

  // 对群聊也按时间排序
  if (groupChats && groupChats.length > 0) {
    groupChats.sort((a, b) => {
      const timeA = a.lastTimestamp || 0;
      const timeB = b.lastTimestamp || 0;
      return timeB - timeA;
    });
  }

  // 先渲染群聊
  if (groupChats && groupChats.length > 0) {
    html += groupChats.map((group) => renderGroupCard(group)).join("");
  }

  // 置顶的角色
  if (pinnedChars.length > 0) {
    html += pinnedChars.map((char) => renderCharCard(char, true)).join("");
  }

  // 分组的角色
  Object.keys(groupedChars).forEach((groupName) => {
    const chars = groupedChars[groupName];
    html += `
      <div class="message-group" id="group_${groupName}">
        <div class="message-group-header" onclick="toggleGroup('${groupName}')">
          <span class="message-group-title">
            <span class="message-group-arrow">▼</span>
            ${groupName} (${chars.length})
          </span>
        </div>
        <div class="message-group-content">
          ${chars.map((char) => renderCharCard(char)).join("")}
        </div>
      </div>
    `;
  });

  // 未分组的角色
  if (normalChars.length > 0) {
    html += normalChars.map((char) => renderCharCard(char)).join("");
  }

  container.innerHTML = html;

  // 绑定单聊点击事件
  document
    .querySelectorAll(".message-item:not(.group-chat)")
    .forEach((item) => {
      item.onclick = function () {
        const charId = parseInt(this.dataset.id);
        openConversation(charId);
      };
    });

  // 绑定群聊点击事件
  document.querySelectorAll(".message-item.group-chat").forEach((item) => {
    item.onclick = function () {
      const groupId = parseInt(this.dataset.groupId);
      openGroupConversation(groupId);
    };
  });
}

// 切换分组展开/收起
function toggleGroup(groupName) {
  const group = document.getElementById(`group_${groupName}`);
  if (group) {
    group.classList.toggle("collapsed");
  }
}

// Close modal on outside click
document
  .getElementById("createCharModal")
  .addEventListener("click", function (e) {
    if (e.target === this) {
      closeCreateCharModal();
    }
  });

// ==================== API PRESETS MANAGEMENT ====================
// 使用从localforage加载的值，如果没有则尝试localStorage（兼容旧数据）
var activePresetId =
  window.savedActivePresetId || localStorage.getItem("activePresetId") || null;
var editingPresetId = null;
var tempModelList = [];

// Render API presets list
function renderApiPresets() {
  const container = document.getElementById("apiPresetList");

  if (apiPresets.length === 0) {
    container.innerHTML = `
                                      <div class="empty-state" id="emptyPresets">
                                          <div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg></div>
                                          <div class="empty-text">还没有API预设</div>
                                          <div class="empty-hint">点击右上角 + 创建预设</div>
                                      </div>
                                  `;
    return;
  }

  container.innerHTML = apiPresets
    .map(
      (preset) => `
                                  <div class="api-preset-item ${
                                    activePresetId == preset.id ? "active" : ""
                                  }" onclick="selectApiPreset(${preset.id})">
                                      <div class="preset-radio"></div>
                                      <div class="preset-info">
                                          <div class="preset-name">${escapeHtml(
                                            preset.name
                                          )}</div>
                                          <div class="preset-detail">${
                                            preset.model || "未选择模型"
                                          }</div>
                                      </div>
                                      <button class="preset-edit-btn" onclick="event.stopPropagation(); editApiPreset(${
                                        preset.id
                                      })">✏️</button>
                                  </div>
                              `
    )
    .join("");
}

// Select API preset as active
function selectApiPreset(presetId) {
  activePresetId = presetId;
  localforage.setItem("activePresetId", presetId); // 这里其实已经自动保存了
  renderApiPresets();
  updateActiveConfigDisplay();

  // 【✓ 新增：给个提示，让你知道保存成功了】
  const preset = apiPresets.find((p) => p.id == presetId);
  if (preset) {
    showToast(`已切换并保存预设：${preset.name}`);
  }
}

// Update active config display
function updateActiveConfigDisplay() {
  const section = document.getElementById("activeConfigSection");
  if (!activePresetId) {
    section.style.display = "none";
    return;
  }

  const preset = apiPresets.find((p) => p.id == activePresetId);
  if (!preset) {
    section.style.display = "none";
    return;
  }

  document.getElementById("activePresetName").textContent = preset.name;
  document.getElementById("activeModelName").textContent =
    preset.model || "未选择";
  section.style.display = "block";
}

// Close API preset modal
function closeApiPresetModal() {
  document.getElementById("apiPresetModal").classList.remove("active");
  editingPresetId = null;
}

// Toggle API key visibility in modal
function togglePresetKeyVisibility() {
  const input = document.getElementById("presetKeyInput");
  const btn = document.querySelector(".key-toggle-btn");
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "○";
  } else {
    input.type = "password";
    btn.textContent = "○";
  }
}

// Fetch models for preset
async function fetchPresetModels() {
  const url = document.getElementById("presetUrlInput").value.trim();
  const key = document.getElementById("presetKeyInput").value.trim();

  if (!url || !key) {
    alert("请先填写反代地址和 API Key");
    return;
  }

  const btn = document.querySelector(".model-fetch-btn");
  btn.textContent = "拉取中...";
  btn.classList.add("loading");

  try {
    // Ensure URL is properly formatted
    let baseUrl = url.replace(/\/+$/, "");
    if (!baseUrl.includes("/v1")) {
      baseUrl += "/v1";
    }

    const response = await fetch(`${baseUrl}/models`, {
      method: "GET",
      mode: "cors",
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    tempModelList = data.data || [];

    if (tempModelList.length === 0) {
      alert("没有获取到可用模型");
      return;
    }

    // Render model dropdown
    renderModelDropdown();
    document.getElementById("modelDropdown").classList.add("active");
  } catch (error) {
    console.error("Fetch models error:", error);
    // 如果是CORS错误，提示用户手动输入
    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("NetworkError") ||
      error.message.includes("CORS")
    ) {
      alert(
        "拉取失败（可能是跨域限制）\n\n您可以直接在模型输入框中手动输入模型名称，例如:\n• gpt-4o\n• gpt-4-turbo\n• claude-3-opus-20240229\n• claude-3-sonnet-20240229"
      );
      // 启用手动输入
      document.getElementById("presetModelInput").removeAttribute("readonly");
      document.getElementById("presetModelInput").placeholder =
        "手动输入模型名称";
    } else {
      alert("拉取模型失败: " + error.message);
    }
  } finally {
    btn.textContent = "拉取";
    btn.classList.remove("loading");
  }
}

// Render model dropdown
function renderModelDropdown() {
  const container = document.getElementById("modelDropdown");
  const currentModel = document.getElementById("presetModelInput").value;

  container.innerHTML = tempModelList
    .map(
      (model) => `
                                  <div class="model-option ${
                                    model.id === currentModel ? "selected" : ""
                                  }" onclick="selectPresetModel('${model.id}')">
                                      ${model.id}
                                  </div>
                              `
    )
    .join("");
}

// Select model for preset
function selectPresetModel(modelId) {
  document.getElementById("presetModelInput").value = modelId;
  document.getElementById("modelDropdown").classList.remove("active");
}
// 打开新建窗口：重置所有滑块为默认值
function openApiPresetModal() {
  editingPresetId = null;
  document.getElementById("apiModalTitle").textContent = "创建 API 预设";
  document.getElementById("presetNameInput").value = "";
  document.getElementById("presetUrlInput").value = "";
  document.getElementById("presetKeyInput").value = "";
  document.getElementById("presetModelInput").value = "";
  document.getElementById("presetKeyInput").type = "password";
  document.getElementById("modelDropdown").classList.remove("active");
  document.getElementById("presetDeleteBtn").style.display = "none";

  // --- 新增：重置参数滑块 ---
  document.getElementById("presetTempInput").value = "1.0";
  document.getElementById("valTemp").textContent = "1.0";

  document.getElementById("presetFreqInput").value = "0.0";
  document.getElementById("valFreq").textContent = "0.0";

  document.getElementById("presetPresInput").value = "0.0";
  document.getElementById("valPres").textContent = "0.0";
  // ------------------------

  tempModelList = [];
  document.getElementById("apiPresetModal").classList.add("active");
}

// 打开编辑窗口：回显保存的参数
function editApiPreset(presetId) {
  const preset = apiPresets.find((p) => p.id === presetId);
  if (!preset) return;

  editingPresetId = presetId;
  document.getElementById("apiModalTitle").textContent = "编辑 API 预设";
  document.getElementById("presetNameInput").value = preset.name;
  document.getElementById("presetUrlInput").value = preset.url;
  document.getElementById("presetKeyInput").value = preset.key;
  document.getElementById("presetModelInput").value = preset.model || "";
  document.getElementById("modelDropdown").classList.remove("active");
  document.getElementById("presetDeleteBtn").style.display = "block";

  // --- 新增：回显参数滑块 (如果没有值则使用默认) ---
  const temp = preset.temperature !== undefined ? preset.temperature : 1.0;
  const freq =
    preset.frequency_penalty !== undefined ? preset.frequency_penalty : 0.0;
  const pres =
    preset.presence_penalty !== undefined ? preset.presence_penalty : 0.0;

  document.getElementById("presetTempInput").value = temp;
  document.getElementById("valTemp").textContent = temp;

  document.getElementById("presetFreqInput").value = freq;
  document.getElementById("valFreq").textContent = freq;

  document.getElementById("presetPresInput").value = pres;
  document.getElementById("valPres").textContent = pres;
  // ------------------------

  tempModelList = [];
  document.getElementById("apiPresetModal").classList.add("active");
}

// 保存逻辑：将滑块的值存入预设对象
function saveApiPreset() {
  const name = document.getElementById("presetNameInput").value.trim();
  const url = document.getElementById("presetUrlInput").value.trim();
  const key = document.getElementById("presetKeyInput").value.trim();
  const model = document.getElementById("presetModelInput").value.trim();

  // --- 新增：获取参数值 ---
  const temperature = parseFloat(
    document.getElementById("presetTempInput").value
  );
  const frequency_penalty = parseFloat(
    document.getElementById("presetFreqInput").value
  );
  const presence_penalty = parseFloat(
    document.getElementById("presetPresInput").value
  );
  // ---------------------

  if (!name) {
    alert("请输入预设名称");
    return;
  }
  if (!url) {
    alert("请输入反代地址");
    return;
  }
  if (!key) {
    alert("请输入 API Key");
    return;
  }

  let baseUrl = url.replace(/\/+$/, "");
  if (!baseUrl.includes("/v1")) {
    baseUrl += "/v1";
  }

  // 构建新的数据对象
  const presetData = {
    name,
    url: baseUrl,
    key,
    model,
    // 保存新参数
    temperature,
    frequency_penalty,
    presence_penalty,
  };

  if (editingPresetId) {
    const index = apiPresets.findIndex((p) => p.id === editingPresetId);
    if (index !== -1) {
      // 合并数据，保留 id
      apiPresets[index] = { ...apiPresets[index], ...presetData };
    }
  } else {
    const newPreset = {
      id: Date.now(),
      ...presetData,
    };
    apiPresets.push(newPreset);
    if (apiPresets.length === 1) {
      activePresetId = newPreset.id;
      localforage.setItem("activePresetId", activePresetId);
    }
  }

  localforage.setItem("apiPresets", apiPresets);
  renderApiPresets();
  updateActiveConfigDisplay();
  closeApiPresetModal();
}
// Delete API preset
function deleteApiPreset() {
  if (!editingPresetId) return;

  if (confirm("确定要删除这个预设吗？")) {
    apiPresets = apiPresets.filter((p) => p.id !== editingPresetId);
    localforage.setItem("apiPresets", apiPresets);

    // Clear active if deleted
    if (activePresetId == editingPresetId) {
      activePresetId = apiPresets.length > 0 ? apiPresets[0].id : null;
      localforage.setItem("activePresetId", activePresetId || "");
    }

    renderApiPresets();
    updateActiveConfigDisplay();
    closeApiPresetModal();
  }
}

// Get current active API config
function getActiveApiConfig() {
  if (!activePresetId) return null;
  return apiPresets.find((p) => p.id == activePresetId) || null;
}

// Close dropdown when clicking outside
document.addEventListener("click", function (e) {
  const dropdown = document.getElementById("modelDropdown");
  const modelInput = document.getElementById("presetModelInput");
  const fetchBtn = document.querySelector(".model-fetch-btn");

  if (
    dropdown &&
    !dropdown.contains(e.target) &&
    e.target !== modelInput &&
    e.target !== fetchBtn
  ) {
    dropdown.classList.remove("active");
  }
});

// ==================== CHAT CONVERSATION ====================
var currentChatCharId = null;

// Open conversation
async function openConversation(charId) {
  // 设置标题栏 (带火花)
  const settings = chatSettings[charId] || {};
  currentChatCharId = charId;
  currentGroupId = null; // 确保清除群聊ID
  const char = characters.find((c) => c.id === charId);
  if (!char) return;

  // 重置回复按钮状态（避免切换对话后按钮仍然禁用）
  const replyBtn = document.getElementById("replyBtn");
  if (replyBtn) {
    replyBtn.disabled = false;
    replyBtn.classList.remove("loading");
    replyBtn.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"></path><path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z"></path><path d="M18 14l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z"></path></svg>';
  }

  // 隐藏群公告栏（单聊不显示）
  toggleGroupAnnouncementBar(false);
  cancelGroupQuote(); // 清除群聊引用

  // 显示心声按钮（单聊显示心声功能）
  const heartVoiceBtn = document.getElementById("heartVoiceBtn");
  if (heartVoiceBtn) heartVoiceBtn.style.display = "";

  // 清除该角色的未读消息
  if (typeof clearUnreadForChar === "function") {
    clearUnreadForChar(charId);
  }

  // Set header info
  document.getElementById("convName").textContent = char.name;
  const avatarEl = document.getElementById("convAvatar");
  if (char.avatar) {
    avatarEl.innerHTML = `<img src="${char.avatar}" alt="${char.name}">`;
  } else {
    avatarEl.innerHTML = "🤖";
  }

  // 确保chatHistories是最新的 - 从localforage重新读取
  try {
    const savedHistories = await safeLocalforageGet("chatHistories");
    if (savedHistories && typeof savedHistories === "object") {
      // 合并而不是完全替换，保护已有数据
      for (const key in savedHistories) {
        if (savedHistories[key] && Array.isArray(savedHistories[key])) {
          chatHistories[key] = savedHistories[key];
        }
      }
    }
  } catch (e) {
    console.warn("读取聊天记录失败:", e.message);
    // 使用内存中的数据继续
  }

  // Load chat history
  renderConversation();

  // 应用头像可见性设置
  applyAvatarVisibility(
    settings.showAiAvatar !== false,
    settings.showUserAvatar !== false
  );

  // 应用头像大小设置
  const avatarSize = char.avatarSize || 40;
  applyAvatarSize(avatarSize);

  // 应用气泡间距设置
  const bubbleGap = char.bubbleGap || 6;
  applyBubbleGap(bubbleGap);

  // 生成火花 HTML
  let sparkHtml = "";
  // 注意：这里读取的是 chatSettings 里的 flameData，或者 characters 里的
  const fData = settings.flameData || char.flameData;
  if (fData && fData.active) {
    sparkHtml = `<span class="spark-badge">${fData.icon} ${fData.days}</span>`;
  }
  const displayTitle = settings.charNote || settings.charName || char.name;
  document.getElementById("convName").innerHTML = displayTitle + sparkHtml;

  // 应用聊天气泡背景样式
  const userBubbleBg = settings.chatUserBubbleBg || "#f8bbd9";
  const userBubbleOpacity = settings.chatUserBubbleOpacity || 100;
  const userTextColor = settings.chatUserTextColor || "#c2185b";
  const aiBubbleBg = settings.chatAiBubbleBg || "#ffffff";
  const aiBubbleOpacity = settings.chatAiBubbleOpacity || 100;
  const aiTextColor = settings.chatAiTextColor || "#333333";
  applyChatBubbleStyle(
    userBubbleBg,
    userBubbleOpacity,
    userTextColor,
    aiBubbleBg,
    aiBubbleOpacity,
    aiTextColor
  );

  // 控制读书悬浮球显示 - 只在对应角色聊天时显示
  const readingData = window.readTogetherData[charId];
  if (readingData && readingData.active) {
    showFloatingBtn();
  } else {
    hideFloatingBtn();
  }

  // Show page
  document.getElementById("chatConversationPage").classList.add("active");

  // 应用该角色的自定义样式（包括背景壁纸）
  applyCustomStyles(settings);

  // 隐藏创建群聊按钮（只在消息列表页显示）
  const createGroupBtn = document.getElementById("createGroupBtn");
  if (createGroupBtn) createGroupBtn.style.display = "none";
}

// Close conversation
function closeConversation() {
  document.getElementById("chatConversationPage").classList.remove("active");
  document.getElementById("convMenu").classList.remove("active");
  currentChatCharId = null;
  currentGroupId = null; // 清除群聊ID

  // 隐藏读书悬浮球（离开聊天页面时隐藏）
  hideFloatingBtn();

  // 刷新表情面板的绑定状态显示
  if (typeof renderCategoryBar === "function") {
    renderCategoryBar();
  }

  // 显示创建群聊按钮（返回消息列表页）
  const createGroupBtn = document.getElementById("createGroupBtn");
  if (createGroupBtn) createGroupBtn.style.display = "";
}

// Toggle conversation menu
function toggleConvMenu() {
  document.getElementById("convMenu").classList.toggle("active");
}

// ==================== 修复：完整的 renderMessageGroup 函数 ====================
// ==================== 修复：完整的消息渲染函数 ====================
window.renderMessageGroup = function (
  messages,
  role,
  aiAvatarSrc,
  userAvatarSrc
) {
  const isUser = role === "user";

  const bubbles = messages
    .map((m) => {
      // 1. 多选状态判断
      // 注意：isSelecting 是“是否处于多选模式”
      const isSelecting =
        typeof isSelectionMode !== "undefined" && isSelectionMode;

      // 2. 单条选中判断
      // 注意：isSelected 是“这条消息是否被勾选”
      const isSelected =
        isSelecting &&
        typeof selectedIndices !== "undefined" &&
        selectedIndices.has(m.originalIndex);

      // 3. 核心修复：检测是否为表情包
      const rawContent = m.content || "";
      // 检测已渲染的表情包图片，或者原始的表情包标签
      const isSticker =
        rawContent.includes('class="sticker-img"') ||
        /^\[(sticker|表情|表情包)[：:][^\]]+\]$/i.test(rawContent.trim());

      // 4. 生成气泡样式
      // 如果是表情包，加上 sticker-bubble 类；如果是选中状态，加上 selected 类
      const bubbleClass = `msg-bubble ${isSelected ? "selected" : ""} ${
        isSticker ? "sticker-bubble" : ""
      }`;

      // 5. 语音消息处理
      const voiceMatch =
        rawContent.match && rawContent.match(/^\[语音[ :：〃\s]*(.+)\]$/);

      // 5.1 用户语音消息处理（isVoice标记）
      if (m.isVoice && isUser) {
        const voiceText = m.voiceText || m.content || "";
        const duration = m.duration || Math.ceil(voiceText.length / 10);
        const textVisible = m.voiceTextVisible ? "visible" : "";

        // 多选模式下的选择器
        const userVoiceSelectorHtml = isSelecting
          ? `
          <div class="bubble-selector ${
            isSelected ? "selected" : ""
          }" onclick="event.stopPropagation();toggleMessageSelection(${
              m.originalIndex
            })">
            <div class="bubble-selector-inner">
              ${
                isSelected
                  ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                  : ""
              }
            </div>
          </div>
        `
          : "";

        const userVoiceBubbleHtml = `
      <div class="${bubbleClass} user-voice-message-bubble"
              data-index="${m.originalIndex}"
              data-voice-text="${escapeHtml(voiceText)}"
              oncontextmenu="return false;"
              ontouchstart="handleTouchStart(event, ${m.originalIndex})"
              ontouchend="handleTouchEnd()"
              ontouchmove="handleTouchMove(event)"
              onmousedown="handleMouseDown(event, ${m.originalIndex})"
              onmouseup="handleMouseUp()"
      >
          <div class="user-voice-message">
              <div class="user-voice-bar" onclick="playUserVoiceBar(event, ${
                m.originalIndex
              })">
                  <span class="user-voice-duration">${duration}"</span>
                  <div class="user-voice-waves">
                      <span></span><span></span><span></span><span></span><span></span>
                  </div>
              </div>
              <div class="user-voice-text ${textVisible}" id="userVoiceText-${
          m.originalIndex
        }">${escapeHtml(voiceText)}</div>
              <div class="user-voice-to-text-btn" onclick="toggleUserVoiceText(event, ${
                m.originalIndex
              })">
                  ${m.voiceTextVisible ? "收起文字" : "转文字"}
              </div>
          </div>
      </div>`;

        if (isSelecting) {
          return `<div class="bubble-with-selector user">${userVoiceBubbleHtml}${userVoiceSelectorHtml}</div>`;
        }
        return userVoiceBubbleHtml;
      }

      if (voiceMatch && !isUser) {
        const voiceText = voiceMatch[1];
        const hasAudio = m.audioUrl ? "has-audio" : "";
        const duration =
          m.audioDuration || Math.ceil(voiceText.length / 5) + '"';
        const textVisible = m.voiceTextVisible ? "visible" : "";

        // 多选模式下的选择器
        const voiceSelectorHtml = isSelecting
          ? `
          <div class="bubble-selector ${
            isSelected ? "selected" : ""
          }" onclick="event.stopPropagation();toggleMessageSelection(${
              m.originalIndex
            })">
            <div class="bubble-selector-inner">
              ${
                isSelected
                  ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                  : ""
              }
            </div>
          </div>
        `
          : "";

        const voiceBubbleHtml = `
      <div class="${bubbleClass} voice-message-bubble"
              data-index="${m.originalIndex}"
              data-voice-text="${escapeHtml(voiceText)}"
              oncontextmenu="return false;"
              ontouchstart="handleVoiceBubbleTouchStart(event, ${
                m.originalIndex
              })"
              ontouchend="handleVoiceBubbleTouchEnd(event, ${m.originalIndex})"
              ontouchmove="handleTouchMove(event)"
              onmousedown="handleMouseDown(event, ${m.originalIndex})"
              onmouseup="handleMouseUp()"
      >
          <div class="voice-message">
              <div class="voice-bar ${hasAudio}" data-audio-url="${
          m.audioUrl || ""
        }" onclick="playVoiceMessage(event, ${m.originalIndex})">
                  <div class="voice-waves">
                      <span></span><span></span><span></span><span></span><span></span>
                  </div>
                  <span class="voice-duration">${duration}</span>
              </div>
              <div class="voice-text ${textVisible}" id="voiceText-${
          m.originalIndex
        }">${escapeHtml(voiceText)}</div>
              <div class="voice-to-text-btn" onclick="toggleVoiceText(event, ${
                m.originalIndex
              })">
                  ${m.voiceTextVisible ? "收起文字" : "转文字"}
              </div>
          </div>
      </div>`;

        if (isSelecting) {
          return `<div class="bubble-with-selector ai">${voiceSelectorHtml}${voiceBubbleHtml}</div>`;
        }
        return voiceBubbleHtml;
      }

      // 5.5 图片消息处理
      if (m.type === "image") {
        const isAi = m.role === "assistant";

        // 多选模式下的选择器
        const imgSelectorHtml = isSelecting
          ? `
          <div class="bubble-selector ${
            isSelected ? "selected" : ""
          }" onclick="event.stopPropagation();toggleMessageSelection(${
              m.originalIndex
            })">
            <div class="bubble-selector-inner">
              ${
                isSelected
                  ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                  : ""
              }
            </div>
          </div>
        `
          : "";

        if (m.imageType === "real" && m.imageData) {
          // 真实图片
          const realImgHtml = `
      <div class="${bubbleClass} image-message-bubble"
              data-index="${m.originalIndex}"
              oncontextmenu="return false;"
              ontouchstart="handleTouchStart(event, ${m.originalIndex})"
              ontouchend="handleTouchEnd()"
              ontouchmove="handleTouchMove(event)"
              onmousedown="handleMouseDown(event, ${m.originalIndex})"
              onmouseup="handleMouseUp()"
      >
          <div class="msg-real-image" onclick="viewRealImage('${m.imageData}')">
              <img src="${m.imageData}" alt="图片"/>
          </div>
      </div>`;
          if (isSelecting) {
            return `<div class="bubble-with-selector ${
              isUser ? "user" : "ai"
            }">${imgSelectorHtml}${realImgHtml}</div>`;
          }
          return realImgHtml;
        } else if (m.imageType === "placeholder" && m.imageDesc) {
          // 占位图
          const iconColor = isAi ? "#66bb6a" : "#fff";
          const bgGradient = isAi
            ? "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)"
            : "linear-gradient(135deg, #f48fb1 0%, #ec407a 100%)";
          const placeholderHtml = `
      <div class="${bubbleClass} image-message-bubble"
              data-index="${m.originalIndex}"
              oncontextmenu="return false;"
              ontouchstart="handleTouchStart(event, ${m.originalIndex})"
              ontouchend="handleTouchEnd()"
              ontouchmove="handleTouchMove(event)"
              onmousedown="handleMouseDown(event, ${m.originalIndex})"
              onmouseup="handleMouseUp()"
      >
          <div class="msg-image-placeholder" style="background:${bgGradient};" onclick="viewImageDescription('${escapeHtml(
            m.imageDesc
          ).replace(/'/g, "\\'")}', ${isAi})">
              <div class="msg-image-placeholder-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
              </div>
              <div class="msg-image-placeholder-text" style="color:${iconColor};">点击查看图片描述</div>
          </div>
      </div>`;
          if (isSelecting) {
            return `<div class="bubble-with-selector ${
              isUser ? "user" : "ai"
            }">${imgSelectorHtml}${placeholderHtml}</div>`;
          }
          return placeholderHtml;
        }
      }

      // 5.6 检查AI发送的图片标签 [图片:内容] 或 [图片]-内容
      let imageContent = null;
      // 格式1: [图片:xxx] 或 [图片：xxx]
      let imageTagMatch =
        rawContent.match && rawContent.match(/^\[图片[:：]([^\]]+)\]$/);
      if (imageTagMatch) {
        imageContent = imageTagMatch[1].trim();
      } else {
        // 格式2: [图片]-xxx 或 [图片] xxx
        imageTagMatch =
          rawContent.match && rawContent.match(/^\[图片\][-\s]+(.+)$/);
        if (imageTagMatch) {
          imageContent = imageTagMatch[1].trim();
        }
      }

      if (imageContent && !isUser) {
        // 检测是否为URL
        const isUrl = /^https?:\/\//i.test(imageContent);

        // 多选模式下的选择器
        const aiImgSelectorHtml = isSelecting
          ? `
          <div class="bubble-selector ${
            isSelected ? "selected" : ""
          }" onclick="event.stopPropagation();toggleMessageSelection(${
              m.originalIndex
            })">
            <div class="bubble-selector-inner">
              ${
                isSelected
                  ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                  : ""
              }
            </div>
          </div>
        `
          : "";

        if (isUrl) {
          // 如果是URL，直接显示图片
          const urlImgHtml = `
      <div class="${bubbleClass} image-message-bubble"
              data-index="${m.originalIndex}"
              oncontextmenu="return false;"
              ontouchstart="handleTouchStart(event, ${m.originalIndex})"
              ontouchend="handleTouchEnd()"
              ontouchmove="handleTouchMove(event)"
              onmousedown="handleMouseDown(event, ${m.originalIndex})"
              onmouseup="handleMouseUp()"
      >
          <div class="msg-real-image" onclick="viewRealImage('${imageContent}')">
              <img src="${imageContent}" alt="图片" onerror="this.parentElement.innerHTML='<div style=\\'padding:20px;color:#999;\\'>图片加载失败</div>'"/>
          </div>
      </div>`;
          if (isSelecting) {
            return `<div class="bubble-with-selector ai">${aiImgSelectorHtml}${urlImgHtml}</div>`;
          }
          return urlImgHtml;
        } else {
          // 如果是描述文字，显示占位图
          const descImgHtml = `
      <div class="${bubbleClass} image-message-bubble"
              data-index="${m.originalIndex}"
              oncontextmenu="return false;"
              ontouchstart="handleTouchStart(event, ${m.originalIndex})"
              ontouchend="handleTouchEnd()"
              ontouchmove="handleTouchMove(event)"
              onmousedown="handleMouseDown(event, ${m.originalIndex})"
              onmouseup="handleMouseUp()"
      >
          <div class="msg-image-placeholder" style="background:linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);" onclick="viewImageDescription('${escapeHtml(
            imageContent
          ).replace(/'/g, "\\'")}', true)">
              <div class="msg-image-placeholder-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#66bb6a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
              </div>
              <div class="msg-image-placeholder-text" style="color:#66bb6a;">点击查看图片描述</div>
          </div>
      </div>`;
          if (isSelecting) {
            return `<div class="bubble-with-selector ai">${aiImgSelectorHtml}${descImgHtml}</div>`;
          }
          return descImgHtml;
        }
      }

      // 6. 普通/富文本消息处理
      let contentHtml;
      if (
        m.isHtml ||
        rawContent.includes("<img") ||
        rawContent.includes("location-card")
      ) {
        // 如果是转账卡片HTML，需要根据状态更新显示
        if (rawContent.includes("transfer-card") && m.transferStatus) {
          const status = m.transferStatus;
          if (status === "accepted" || status === "rejected") {
            const statusText = status === "accepted" ? "已收款" : "已退回";
            // 替换状态显示
            contentHtml = rawContent
              .replace(
                /class="transfer-card-status[^"]*">[^<]*</g,
                `class="transfer-card-status ${status}">${statusText}<`
              )
              .replace(/data-status="[^"]*"/g, `data-status="${status}"`);
          } else {
            contentHtml = rawContent;
          }
        } else {
          contentHtml = rawContent;
        }
      } else if (rawContent.includes("transfer-card")) {
        // AI发的转账卡片（存储为HTML格式）
        contentHtml = rawContent;
      } else {
        // 检查是否包含特殊标签
        const hasTransfer = /\[转账[:：]/.test(rawContent);
        const hasRedpacket = /\[红包[:：]/.test(rawContent);
        const hasLocation = /\[位置[:：]/.test(rawContent);

        if (hasTransfer || hasRedpacket || hasLocation) {
          // 处理特殊标签，生成卡片
          let processed = rawContent;
          const msgIdx = m.originalIndex; // 使用消息索引作为唯一标识

          // 检查消息是否已被处理过（有状态）
          const msgStatus = m.transferStatus || "pending";
          const isProcessed = msgStatus !== "pending";

          // 处理转账标签
          processed = processed.replace(
            /\[转账[:：](\d+(?:\.\d+)?)(?:[:：]([^\]]*))?\]/g,
            (match, amount, note) => {
              const footerContent = isProcessed
                ? `<span class="transfer-card-status ${msgStatus}">${
                    msgStatus === "accepted" ? "已收款" : "已退回"
                  }</span>`
                : `<div class="transfer-card-btns">
                    <button class="transfer-card-btn reject" onclick="event.stopPropagation();rejectAITransfer(${msgIdx},this)">退回</button>
                    <button class="transfer-card-btn accept" onclick="event.stopPropagation();acceptAITransfer(${msgIdx},${amount},this)">收款</button>
                  </div>`;
              return `<div class="transfer-card" data-msg-idx="${msgIdx}" data-amount="${amount}">
                <div class="transfer-card-header">
                  <div class="transfer-card-icon">¥</div>
                  <div class="transfer-card-info">
                    <div class="transfer-card-title">${note || "转账给你"}</div>
                    <div class="transfer-card-amount">${parseFloat(
                      amount
                    ).toFixed(2)}</div>
                  </div>
                </div>
                <div class="transfer-card-footer">
                  <span>微信转账</span>
                  ${footerContent}
                </div>
              </div>`;
            }
          );

          // 处理红包标签
          processed = processed.replace(
            /\[红包[:：](\d+(?:\.\d+)?)(?:[:：]([^\]]*))?\]/g,
            (match, amount, note) => {
              const footerContent = isProcessed
                ? `<span class="transfer-card-status ${msgStatus}">${
                    msgStatus === "accepted" ? "已领取" : "已退回"
                  }</span>`
                : `<div class="transfer-card-btns">
                    <button class="transfer-card-btn reject" onclick="event.stopPropagation();rejectAITransfer(${msgIdx},this)">退回</button>
                    <button class="transfer-card-btn accept" onclick="event.stopPropagation();acceptAITransfer(${msgIdx},${amount},this)">领取</button>
                  </div>`;
              return `<div class="transfer-card" data-msg-idx="${msgIdx}" data-amount="${amount}">
                <div class="transfer-card-header">
                  <div class="transfer-card-icon">🧧</div>
                  <div class="transfer-card-info">
                    <div class="transfer-card-title">${note || "恭喜发财"}</div>
                    <div class="transfer-card-amount">${parseFloat(
                      amount
                    ).toFixed(2)}</div>
                  </div>
                </div>
                <div class="transfer-card-footer">
                  <span>微信红包</span>
                  ${footerContent}
                </div>
              </div>`;
            }
          );

          // 处理位置标签
          processed = processed.replace(
            /\[位置[:：]([^\]:：]+)(?:[:：]([^\]]*))?\]/g,
            (match, name, address) => {
              return `<div class="location-card">
                <div class="location-card-map">
                  <div class="location-card-map-bg"></div>
                  <div class="location-card-map-icon">📍</div>
                </div>
                <div class="location-card-info">
                  <div class="location-card-name">${name}</div>
                  <div class="location-card-address">${
                    address || "点击查看详情"
                  }</div>
                </div>
              </div>`;
            }
          );

          contentHtml = processed;
        } else {
          // 普通消息
          let processed = rawContent;

          // 处理嵌入的语音标签 [语音:xxx] - 转换为可点击的语音提示（仅AI消息）
          if (!isUser) {
            processed = processed.replace(
              /\[语音[:：]([^\]]+)\]/g,
              (match, text) =>
                `<span class="inline-voice-tag" onclick="playInlineVoice(this, '${escapeHtml(
                  text
                ).replace(/'/g, "\\'")}')">♪ ${
                  text.length > 20 ? text.substring(0, 20) + "..." : text
                }</span>`
            );

            // 处理AI表情包标签 [sticker:xxx]
            contentHtml = processAiStickerTags(processed);
            // 再处理其他格式化
            if (
              !contentHtml.includes('class="sticker-img"') &&
              !contentHtml.includes("inline-voice-tag")
            ) {
              contentHtml = formatNovelMessage(contentHtml);
            }
          } else {
            // 用户消息：不处理表情包标签，只做HTML转义和基本格式化
            contentHtml = escapeHtml(processed);
          }
        }
      }

      // 检测是否为特殊卡片消息，决定气泡样式
      const isSpecialCard =
        contentHtml.includes("transfer-card") ||
        contentHtml.includes("location-card");
      const specialBubbleStyle = isSpecialCard
        ? 'style="background:transparent!important;box-shadow:none!important;padding:0!important;"'
        : "";

      // 生成引用显示HTML
      let quoteHtml = "";
      if (m.quote) {
        const quoteSender =
          m.quote.sender || (m.quote.senderRole === "user" ? "我" : "TA");
        const quoteText =
          m.quote.displayContent ||
          (m.quote.content || "").replace(/<[^>]+>/g, "").substring(0, 50);
        quoteHtml = `
          <div class="msg-quote">
            <div class="msg-quote-sender">${quoteSender}</div>
            <div class="msg-quote-text">${escapeHtml(quoteText)}</div>
          </div>
        `;
      }

      // 多选模式下为每个气泡生成选择器
      const bubbleSelectorHtml = isSelecting
        ? `
        <div class="bubble-selector ${
          isSelected ? "selected" : ""
        }" onclick="event.stopPropagation();toggleMessageSelection(${
            m.originalIndex
          })">
          <div class="bubble-selector-inner">
            ${
              isSelected
                ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                : ""
            }
          </div>
        </div>
      `
        : "";

      // 普通气泡 HTML - 多选模式时包裹选择器
      if (isSelecting) {
        return `
  <div class="bubble-with-selector ${isUser ? "user" : "ai"}">
      ${bubbleSelectorHtml}
      <div class="${bubbleClass}"
              data-index="${m.originalIndex}"
              ${specialBubbleStyle}
              oncontextmenu="return false;"
              ontouchstart="handleTouchStart(event, ${m.originalIndex})"
              ontouchend="handleTouchEnd()"
              ontouchmove="handleTouchMove(event)"
              onmousedown="handleMouseDown(event, ${m.originalIndex})"
              onmouseup="handleMouseUp()"
              onclick="handleBubbleClick(event, ${m.originalIndex})"
      >
          ${quoteHtml}${contentHtml}
      </div>
  </div>`;
      }

      // 普通模式气泡 HTML
      return `
  <div class="${bubbleClass}"
          data-index="${m.originalIndex}"
          ${specialBubbleStyle}
          oncontextmenu="return false;"
          ontouchstart="handleTouchStart(event, ${m.originalIndex})"
          ontouchend="handleTouchEnd()"
          ontouchmove="handleTouchMove(event)"
          onmousedown="handleMouseDown(event, ${m.originalIndex})"
          onmouseup="handleMouseUp()"
          onclick="handleBubbleClick(event, ${m.originalIndex})"
  >
      ${quoteHtml}${contentHtml}
  </div>`;
    })
    .join("");

  // 7. 头像与时间
  const time = messages[messages.length - 1].time || "";
  const avatarUrl = isUser ? userAvatarSrc : aiAvatarSrc;
  const defaultEmoji = isUser ? "我" : "AI";
  const avatarHtml = avatarUrl
    ? `<img src="${avatarUrl}" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;">${defaultEmoji}</div>`;

  // 8. 组合最终 HTML
  // 在多选模式下，整行可点击，但需要精确定位到具体消息
  const isSelecting = typeof isSelectionMode !== "undefined" && isSelectionMode;
  const wrapperFirstMsgIdx = messages[0]?.originalIndex;
  // 收集该wrapper中所有消息的index
  const allMsgIndices = messages.map((m) => m.originalIndex).join(",");
  const wrapperClickHandler = isSelecting
    ? `onclick="handleWrapperClick(event, [${allMsgIndices}])"`
    : "";

  return `
    <div class="msg-wrapper ${isUser ? "user" : "ai"} ${
    isSelecting ? "selecting" : ""
  }" ${wrapperClickHandler}>
  <div class="chat-avatar-small">
      ${avatarHtml}
  </div>
  <div class="msg-content-container">
      <div class="msg-row ${isUser ? "user" : "ai"}">
          ${bubbles}
      </div>
      <div class="msg-time-wrapper">${time}</div>
  </div>
    </div>
    `;
};
// Escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// 过滤AI回复中的思维链标签
function filterThinkingTags(text) {
  if (!text) return text;

  let result = text
    // 闭合标签
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .replace(/<reflect>[\s\S]*?<\/reflect>/gi, "")
    .replace(/<inner_thoughts>[\s\S]*?<\/inner_thoughts>/gi, "")
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/【思考】[\s\S]*?【\/思考】/gi, "")
    .replace(/【分析】[\s\S]*?【\/分析】/gi, "")
    .replace(/\[思考\][\s\S]*?\[\/思考\]/gi, "")
    .replace(/\[thinking\][\s\S]*?\[\/thinking\]/gi, "");

  // 处理未闭合的标签
  const unclosedTags = [
    "<think>",
    "<thinking>",
    "<reasoning>",
    "<reflect>",
    "【思考】",
    "[思考]",
  ];
  for (const tag of unclosedTags) {
    const tagIndex = result.toLowerCase().indexOf(tag.toLowerCase());
    if (tagIndex !== -1) {
      const afterTag = result.substring(tagIndex);
      const normalContentMatch = afterTag.match(/\n{2,}([^<\[【][\s\S]+)/);
      if (normalContentMatch) {
        result = result.substring(0, tagIndex) + normalContentMatch[1];
      } else if (tagIndex > 50) {
        result = result.substring(0, tagIndex);
      }
    }
  }

  return result.trim();
}
window.filterThinkingTags = filterThinkingTags;

// Auto resize textarea
function autoResizeTextarea(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 100) + "px";
}

function sendUserMessage() {
  const input = document.getElementById("convInput");
  const text = input.value.trim();
  if (!text) return;

  // 检查是否是群聊
  if (currentGroupId) {
    sendGroupMessage(text);
    input.value = "";
    input.style.height = "auto";
    return;
  }

  if (!chatHistories[currentChatCharId]) {
    chatHistories[currentChatCharId] = [];
  }

  // 构建消息对象，包含引用信息
  const msgObj = {
    role: "user",
    content: text,
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    timestamp: Date.now(),
  };

  // 如果有引用，添加引用信息
  if (currentQuote) {
    msgObj.quote = {
      sender: currentQuote.sender,
      senderRole: currentQuote.senderRole,
      content: currentQuote.content,
      displayContent: currentQuote.displayContent,
    };
    // 清除引用
    cancelQuote();
  }

  chatHistories[currentChatCharId].push(msgObj);

  // Save and render
  localforage.setItem("chatHistories", chatHistories);
  renderConversation();

  // 【新增】更新列表预览
  updateCharacterLastMessage(currentChatCharId, text);

  // Clear input
  input.value = "";
  input.style.height = "auto";
}

async function requestAIReply() {
  // 检查是否是群聊
  if (currentGroupId) {
    const input = document.getElementById("convInput");
    const text = input.value.trim();
    if (text) {
      // 有输入内容，先发送消息再等待AI回复
      sendGroupMessage(text);
      input.value = "";
      input.style.height = "auto";
    } else {
      // 没有输入内容，检查最后一条消息
      const group = groupChats.find((g) => g.id === currentGroupId);
      if (group && group.members.length > 0) {
        // 获取最近一条消息，检查是否是用户消息
        const messagesKey = `group_messages_${currentGroupId}`;
        const messages = (await localforage.getItem(messagesKey)) || [];
        const lastMsg = messages
          .filter((m) => m.role !== "system")
          .slice(-1)[0];

        // 如果没有消息或最后一条不是用户消息，提示用户
        if (!lastMsg || lastMsg.role !== "user") {
          showToast("请先发送一条消息");
          return;
        }

        const contextMsg = lastMsg.content;
        requestGroupAIReply(contextMsg);
      } else {
        showToast("群里没有成员可以回复");
      }
    }
    return;
  }

  const apiConfig = getActiveApiConfig();
  if (!apiConfig || !apiConfig.url || !apiConfig.key) {
    showToast("请先配置并选择 API 预设");
    return;
  }

  // 【修复】保存当前聊天角色ID，防止用户在API请求期间返回导致currentChatCharId变为null
  const savedCharId = currentChatCharId;
  if (!savedCharId) {
    showToast("请先打开一个对话");
    return;
  }

  // 确保chatHistories中有该角色的记录
  if (!chatHistories[savedCharId]) {
    chatHistories[savedCharId] = [];
  }

  const history = chatHistories[savedCharId] || [];
  if (history.length === 0) {
    showToast("请先发送一条消息");
    return;
  }

  // 检查最后一条非系统消息是否是用户消息，如果不是则不回复
  const lastNonSystemMsg = history
    .filter((m) => m.role !== "system")
    .slice(-1)[0];
  if (!lastNonSystemMsg || lastNonSystemMsg.role !== "user") {
    showToast("请先发送一条消息");
    return;
  }

  const settings = chatSettings[savedCharId] || {};
  const char = characters.find((c) => c.id === savedCharId);

  // UI 状态
  const btn = document.getElementById("replyBtn");
  btn.disabled = true;
  btn.classList.add("loading");

  const container = document.getElementById("convMessages");
  const typingHtml = `
                          <div class="msg-row ai" id="typingIndicator">
                              <div class="msg-bubble">
                                  <div class="msg-typing"><span></span><span></span><span></span></div>
                              </div>
                          </div>`;
  container.insertAdjacentHTML("beforeend", typingHtml);
  container.scrollTop = container.scrollHeight;

  try {
    const contextLimit = settings.contextCount || 150;
    const shortTermMemory = history.slice(-contextLimit);

    let systemContent = `Instruction:\nName: ${
      settings.charName || char.name
    }\n`;
    systemContent += `Character Persona:\n${
      settings.persona || "你是一个友好的聊天伴侣。"
    }\n\n`;
    systemContent += `User Info / User Persona:\n${
      settings.myPersona || "用户"
    }\n\n`;

    if (settings.summaries && settings.summaries.length > 0) {
      systemContent += `[Long-term Memory]:\n${settings.summaries.join(
        "\n"
      )}\n\n`;
    }

    // 世界书内容注入
    if (settings.worldbook) {
      const worldbookIds = settings.worldbook.split(",").filter((s) => s);
      // 将最近的聊天内容拼接起来用于关键词匹配
      const recentChat = shortTermMemory
        .slice(-10)
        .map((m) => m.content)
        .join(" ");
      const worldbookContent = getWorldbookContentForAI(
        worldbookIds,
        recentChat
      );
      if (worldbookContent) {
        systemContent += worldbookContent;
      }
    }

    // 处理记忆互通（支持多选，包括单聊和群聊）
    const memoryLinkCount = settings.memoryCount || 5;
    const linkedIds =
      settings.memoryLinks ||
      (settings.memoryLink ? [parseInt(settings.memoryLink)] : []);

    if (linkedIds.length > 0 && memoryLinkCount > 0) {
      let allLinkedContent = [];
      for (const linkId of linkedIds) {
        // 判断是群聊还是单聊
        if (typeof linkId === "string" && linkId.startsWith("group_")) {
          // 群聊记忆互通
          const groupId = parseInt(linkId.replace("group_", ""));
          const group = groupChats.find((g) => g.id === groupId);
          if (group) {
            try {
              const messagesKey = `group_messages_${groupId}`;
              const groupMessages =
                (await localforage.getItem(messagesKey)) || [];
              const recentMessages = groupMessages
                .filter((m) => !m.isHidden && !m.isCallCard)
                .slice(-memoryLinkCount);

              if (recentMessages.length > 0) {
                const groupSettings = group.settings || {};
                const userNickname = groupSettings.myNickname || "用户";

                const linkedContent = recentMessages
                  .map((m) => {
                    if (m.role === "user") {
                      return `${userNickname}: ${(m.content || "").replace(
                        /<[^>]*>/g,
                        ""
                      )}`;
                    } else {
                      const msgChar = characters.find((c) => c.id === m.charId);
                      const msgCharName = msgChar
                        ? msgChar.note || msgChar.name
                        : "成员";
                      return `${msgCharName}: ${(m.content || "").replace(
                        /<[^>]*>/g,
                        ""
                      )}`;
                    }
                  })
                  .join("\n");

                if (linkedContent) {
                  allLinkedContent.push(
                    `## 群聊「${
                      group.name || "群聊"
                    }」的近期对话：\n${linkedContent}`
                  );
                }
              }
            } catch (e) {
              console.warn("读取群聊消息失败:", e);
            }
          }
        } else {
          // 单聊记忆互通
          const linkedCharId = linkId;
          if (
            chatHistories[linkedCharId] &&
            chatHistories[linkedCharId].length > 0
          ) {
            const linkedChar = characters.find((c) => c.id === linkedCharId);
            const linkedSettings = chatSettings[linkedCharId] || {};
            const linkedName =
              linkedSettings.charName || linkedChar?.name || "某人";
            const linkedHistory = chatHistories[linkedCharId]
              .filter((m) => !m.isHidden)
              .slice(-memoryLinkCount);

            const linkedContent = linkedHistory
              .map((m) => {
                const speaker =
                  m.role === "user"
                    ? settings.userNickname || "用户"
                    : linkedName;
                return `${speaker}: ${m.content}`;
              })
              .join("\n");

            if (linkedContent) {
              allLinkedContent.push(
                `## 用户与「${linkedName}」的近期对话：\n${linkedContent}`
              );
            }
          }
        }
      }

      if (allLinkedContent.length > 0) {
        systemContent += `\n【记忆互通 - 共${allLinkedContent.length}个聊天记录】\n以下是用户的其他聊天记录，供你参考了解用户的近况：\n\n`;
        systemContent += allLinkedContent.join("\n\n");
        systemContent += `\n\n【记忆互通结束】\n`;
      }
    }

    if (settings.timeAware) {
      const now = new Date();
      const currentTimeStr = now.toLocaleString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
      });

      // 计算距离上次对话过了多久
      let timeSinceLastChat = "";
      const userMessages = history.filter((m) => m.role === "user");

      // 找最后一条有timestamp的用户消息（不是刚发的那条）
      // 从后往前找，跳过最后一条（因为那是刚发的）
      let lastTimestamp = null;
      for (let i = userMessages.length - 2; i >= 0; i--) {
        if (userMessages[i].timestamp) {
          lastTimestamp = userMessages[i].timestamp;
          break;
        }
      }

      if (lastTimestamp) {
        const diffMs = now.getTime() - lastTimestamp;
        if (diffMs > 0) {
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMins / 60);
          const diffDays = Math.floor(diffHours / 24);

          if (diffDays > 0) {
            timeSinceLastChat = `距离你们上一次对话已经过去了约${diffDays}天${
              diffHours % 24
            }小时`;
          } else if (diffHours > 0) {
            timeSinceLastChat = `距离你们上一次对话已经过去了约${diffHours}小时${
              diffMins % 60
            }分钟`;
          } else if (diffMins > 5) {
            timeSinceLastChat = `距离你们上一次对话已经过去了约${diffMins}分钟`;
          }
        }
      }

      systemContent += `\n【⚠️ 重要：时间感知】\n`;
      systemContent += `当前真实时间：${currentTimeStr}\n`;
      systemContent += `【时间标记说明】聊天记录中每条消息前面都有时间标记，格式如 [今天 14:30]、[昨天 09:15]、[1月3日 20:00] 等。\n`;
      systemContent += `【重要】你必须正确理解这些时间标记！标记为[昨天]的消息是昨天发生的事，不是今天的事。请根据时间标记来正确回应，不要把昨天的事当成今天的事来说。\n`;
      if (timeSinceLastChat) {
        systemContent += `【时间流逝】${timeSinceLastChat}！用户刚刚回来找你聊天。\n`;
        systemContent += `你可以在回复中体现出时间的流逝，但要注意区分"之前聊过的内容"和"现在正在聊的内容"。\n`;
      }
      systemContent += `【指令】回复时请【禁止】在开头输出时间标记（如 [今天 xx:xx]），直接输出回复内容即可。\n`;
      systemContent += `\n`;
    }

    // 一起读书功能 - 将书籍内容注入到系统提示词
    const readingContent = getCurrentReadingContent();
    if (readingContent && readingContent.currentSection) {
      // 限制书籍内容长度，避免超出token限制
      let bookContent = readingContent.currentSection;
      if (bookContent.length > 2000) {
        bookContent = bookContent.substring(0, 2000) + "...（内容已截断）";
      }
      systemContent += `\n【一起读书模式】\n`;
      systemContent += `当前正在和用户一起阅读《${readingContent.bookName}》\n`;
      systemContent += `阅读进度：第 ${readingContent.sectionIndex} 页 / 共 ${readingContent.totalSections} 页\n`;
      systemContent += `当前页内容：\n---\n${bookContent}\n---\n`;
      systemContent += `请基于以上书籍内容与用户互动讨论，但回复时不要复述整段内容，自然地聊天即可。\n\n`;
    }
    const musicContext = getMusicContextForAI();
    if (settings.onlineDating) {
      // 线下模式基础提示词
      systemContent += `\n【模式：沉浸式角色扮演】\n1. 以小说笔触回复。\n2. **必须严格遵守以下格式规范**：\n   - **环境/动作/神态描写**：直接书写，不加任何符号。\n   - **心理活动/内心独白**：必须用一对星号包裹，例如 *她看起来真可爱*。\n   - **语言对话**：必须用直角引号包裹，例如 「早安，亲爱的。」\n3. **禁止**拆分消息，请输出一段完整流畅的文本。\n4. **禁止**发送表情包（[sticker:xxx]格式）。\n5. **禁止**发送语音消息（[语音:xxx]格式）。\n`;

      // 添加字数要求
      const minWords = settings.offlineMinWords || 100;
      const maxWords = settings.offlineMaxWords || 500;
      systemContent += `6. **字数要求**：回复字数必须在 ${minWords} 到 ${maxWords} 字之间。请务必遵守此限制。\n`;

      // 如果选择了预设，添加预设内容
      if (settings.offlinePresetId && window.presets) {
        const selectedPreset = window.presets.find(
          (p) => p.id === settings.offlinePresetId
        );
        if (selectedPreset) {
          let presetContent = "";

          // 新格式：从entries数组获取启用的条目
          if (selectedPreset.entries && Array.isArray(selectedPreset.entries)) {
            const enabledEntries = selectedPreset.entries.filter(
              (e) => e.enabled
            );
            if (enabledEntries.length > 0) {
              presetContent = enabledEntries
                .map((e) => {
                  if (e.name) {
                    return `【${e.name}】\n${e.content}`;
                  }
                  return e.content;
                })
                .join("\n\n");
            }
          }
          // 兼容旧格式：直接使用content字段
          else if (selectedPreset.content) {
            presetContent = selectedPreset.content;
          }

          if (presetContent) {
            systemContent += `\n【预设风格指令】\n${presetContent}\n`;
          }
        }
      }
    } else {
      systemContent += `\n【模式：即时通讯】
1. 像真人一样口语化聊天，**禁止使用括号()包裹任何内容**，直接说话即可。
2. **必须**拆分为多条短消息，使用 ||| 分隔。每条消息简短口语化。
3. **语音消息**：格式为 [语音:要说的内容]
   - 适合撒娇、安慰等场景，约20-30%概率使用
   - **重要：语音标签必须独立成一条消息，前后用|||分隔！**
   - ✓正确：宝贝 ||| [语音:想你了呢~] ||| 记得早点休息
   - ✗错误：[语音:想你了]记得早点休息（标签和文字不能连在一起！）
4. **转账**：格式为 [转账:金额:说明]
   - **重要：转账标签必须独立成一条消息！**
   - ✓正确：生日快乐！ ||| [转账:88.88:生日红包~] ||| 希望你喜欢
5. **收款/退款**：[收款] 或 [退款]，必须独立成一条
6. **位置**：格式为 [位置:地点名称:详细地址]
   - **重要：位置标签必须独立成一条消息！**
   - ✓正确：我到啦！ ||| [位置:星巴克:南京路店] ||| 你快来
7. **撤回**：[撤回]，必须独立成一条
8. **引用回复**：[引用:原文内容]回复内容
9. **打电话**：[打电话:语音] 或 [打电话:视频]，必须独立成一条
10. **图片**：格式为 [图片:图片描述]
   - **重要：图片标签必须独立成一条消息！**
   - ✓正确：看看这个！ ||| [图片:一只可爱的猫咪] ||| 好可爱吧
11. **发动态**：格式为 [发动态:动态内容]
   - 当用户让你发朋友圈/发动态时，使用此格式
   - **重要：必须用方括号包裹，内容写在冒号后面！**
   - **禁止使用#话题标签、@提及，像真人发朋友圈一样自然**
   - 如果想配图，在内容末尾加 [图片:描述]
   - ✓正确：好的！ ||| [发动态:今天天气真好，和宝贝一起看日落🌅 [图片:夕阳西下的美景]]
   - ✗错误：使用#话题 或 @某人

**核心规则：所有方括号[]格式的特殊标签，都必须用|||与普通文字分开，不能连在一起写！**
`;
    }

    // 添加AI表情包功能提示（仅在非线下模式时启用）
    if (!settings.onlineDating) {
      const aiStickerPrompt = generateAiStickerPrompt();
      if (aiStickerPrompt) {
        systemContent += aiStickerPrompt;
      }
    }

    // 添加待办监督提示词（仅对绑定了待办的角色生效）
    if (typeof generateTodoPromptForAi === "function") {
      const todoPrompt = generateTodoPromptForAi(currentChatCharId);
      if (todoPrompt) {
        systemContent += todoPrompt;
      }
    }

    // 添加经期关心提示词（所有角色都能看到）
    if (typeof generatePeriodPromptForAi === "function") {
      const periodPrompt = generatePeriodPromptForAi();
      if (periodPrompt) {
        systemContent += periodPrompt;
      }
    }

    // 添加用户动态提示词（让AI知道用户最近分享了什么）
    if (typeof generateMomentsPromptForAi === "function") {
      const momentsPrompt = generateMomentsPromptForAi(savedCharId);
      if (momentsPrompt) {
        systemContent += momentsPrompt;
      }
    }
    // 一起听歌功能 - 将当前歌词注入到系统提示词
    if (typeof getMusicContextForAI === "function") {
      const musicContext = getMusicContextForAI();
      if (musicContext) {
        systemContent += musicContext;
      }
    }
    // 辅助函数：格式化消息时间
    function formatMsgTime(timestamp) {
      if (!timestamp) return "";
      const msgDate = new Date(timestamp);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const msgDay = new Date(
        msgDate.getFullYear(),
        msgDate.getMonth(),
        msgDate.getDate()
      );

      const timeStr = msgDate.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (msgDay.getTime() === today.getTime()) {
        return `[今天 ${timeStr}]`;
      } else if (msgDay.getTime() === yesterday.getTime()) {
        return `[昨天 ${timeStr}]`;
      } else {
        const month = msgDate.getMonth() + 1;
        const day = msgDate.getDate();
        return `[${month}月${day}日 ${timeStr}]`;
      }
    }

    const messages = [
      { role: "system", content: systemContent },
      ...shortTermMemory
        .map((m) => {
          // 获取消息时间标记
          const timeTag = formatMsgTime(m.timestamp);

          // 处理隐藏的系统消息（如通话记录）
          if (m.role === "system" && m.isHidden) {
            return { role: "system", content: m.content };
          }

          // 处理图片消息 - 支持多模态
          if (m.type === "image" && m.imageType === "real" && m.imageData) {
            // 用户发送的真实图片，构建多模态消息
            return {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    timeTag +
                    " " +
                    (m.content || "用户发送了一张图片，请描述或回应这张图片。"),
                },
                {
                  type: "image_url",
                  image_url: {
                    url: m.imageData,
                    detail: "auto",
                  },
                },
              ],
            };
          }

          // 处理带引用的消息
          let msgContent = m.content;
          if (m.quote && m.quote.content) {
            // 告诉AI用户引用了什么消息
            const quoteSender =
              m.quote.senderRole === "user"
                ? "自己"
                : settings.charName || char.name;
            msgContent = `[用户引用了${quoteSender}之前说的："${
              m.quote.displayContent || m.quote.content
            }"]
${m.content}`;
          }

          // 普通消息 - 添加时间标记
          return {
            role: m.role === "user" ? "user" : "assistant",
            content: timeTag ? `${timeTag} ${msgContent}` : msgContent,
          };
        })
        .filter((m) => m.content), // 过滤空消息
    ];

    const reqTemperature =
      apiConfig.temperature !== undefined ? Number(apiConfig.temperature) : 1.0;
    const reqFreqPenalty =
      apiConfig.frequency_penalty !== undefined
        ? Number(apiConfig.frequency_penalty)
        : 0.0;
    const reqPresPenalty =
      apiConfig.presence_penalty !== undefined
        ? Number(apiConfig.presence_penalty)
        : 0.0;

    const response = await fetch(`${apiConfig.url}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiConfig.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: messages,
        temperature: reqTemperature,
        frequency_penalty: reqFreqPenalty,
        presence_penalty: reqPresPenalty,
      }),
    });

    if (!response.ok) {
      // 尝试获取详细错误信息
      let errorDetail = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorDetail =
            errorData.error.message ||
            errorData.error.code ||
            JSON.stringify(errorData.error);
        } else if (errorData.message) {
          errorDetail = errorData.message;
        }
      } catch (e) {
        // 无法解析JSON，使用状态码
      }
      throw new Error(errorDetail);
    }
    const data = await response.json();
    let aiReply = data.choices[0]?.message?.content || "";

    // 过滤思维链标签（某些模型如DeepSeek会输出这些）
    aiReply = filterThinkingTags(aiReply);

    // 如果AI没有返回内容，静默处理不显示消息
    if (!aiReply || aiReply.trim() === "") {
      document.getElementById("typingIndicator")?.remove();
      console.warn("AI返回空内容");
      return;
    }

    document.getElementById("typingIndicator")?.remove();

    let textToRead = ""; // 记录需要朗读的文本

    if (settings.onlineDating) {
      const msgObj = {
        role: "assistant",
        content: aiReply,
        time: new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        audioUrl: null, // 预留音频字段
      };
      // 提取对话内容用于朗读 (只读 「...」 里的内容)
      const matches = aiReply.match(/「([^」]+)」/g);
      textToRead = matches
        ? matches.map((s) => s.slice(1, -1)).join("，")
        : aiReply;

      chatHistories[savedCharId].push(msgObj);
      saveAndRenderForChar(savedCharId);
      // 【新增】更新列表预览
      updateCharacterLastMessage(savedCharId, aiReply);

      // 【修复】检查聊天对话页面是否打开，如果没打开则显示通知弹窗和红点
      const convPage = document.getElementById("chatConversationPage");
      const isConvPageActive =
        convPage && convPage.classList.contains("active");
      if (!isConvPageActive || currentChatCharId !== savedCharId) {
        showMessageNotification(savedCharId, char.name, char.avatar, aiReply);
        addUnreadMessage(savedCharId);
      }

      // === 触发语音 ===
      triggerVoiceForChar(savedCharId, msgObj, textToRead, settings);
    } else {
      // 先用 ||| 分割
      let replyParts = aiReply
        .split("|||")
        .map((s) => s.trim())
        .filter((s) => s && s !== "...");

      // 如果分割后没有有效内容，使用原始回复
      if (replyParts.length === 0) {
        replyParts = [aiReply.trim() || "嗯～"];
      }

      // 进一步分割：把特殊标签分离成单独的消息
      replyParts = replyParts.flatMap((part) => {
        // 匹配所有特殊标签：表情包、转账、红包、位置、语音、撤回、收款、退款、打电话、图片、发动态
        // 图片和发动态标签内容可能包含其他标签，需要特殊处理
        const specialTagRegex =
          /(\[(sticker|表情|表情包|转账|红包|位置|语音|打电话)[：:][^\]]+\]|\[(图片|发动态)[：:].+?\](?=\s|$|[^\]]||||)|\[撤回\]|\[收款\]|\[退款\])/gi;

        // 先找出所有特殊标签的位置
        const tags = [];
        let match;

        // 单独处理图片和发动态标签（它们的内容可能更复杂）
        const imgRegex =
          /\[(图片|发动态)[：:]([^\]]*(?:\[[^\]]*\][^\]]*)*)\]/gi;
        while ((match = imgRegex.exec(part)) !== null) {
          tags.push({
            tag: match[0],
            start: match.index,
            end: match.index + match[0].length,
          });
        }

        // 处理其他简单标签
        const simpleTagRegex =
          /(\[(sticker|表情|表情包|转账|红包|位置|语音|打电话)[：:][^\]]+\]|\[撤回\]|\[收款\]|\[退款\])/gi;
        while ((match = simpleTagRegex.exec(part)) !== null) {
          // 检查是否和已有标签重叠
          const overlaps = tags.some(
            (t) =>
              (match.index >= t.start && match.index < t.end) ||
              (match.index + match[0].length > t.start &&
                match.index + match[0].length <= t.end)
          );
          if (!overlaps) {
            tags.push({
              tag: match[0],
              start: match.index,
              end: match.index + match[0].length,
            });
          }
        }

        // 按位置排序
        tags.sort((a, b) => a.start - b.start);

        // 如果没有特殊标签，直接返回原内容
        if (tags.length === 0) {
          return [part.trim()].filter((s) => s);
        }

        // 分割文本和标签
        const segments = [];
        let lastEnd = 0;

        for (const tag of tags) {
          // 添加标签前的文本
          if (tag.start > lastEnd) {
            const text = part.slice(lastEnd, tag.start).trim();
            if (text && text !== "]") segments.push(text);
          }
          // 添加标签本身
          segments.push(tag.tag);
          lastEnd = tag.end;
        }

        // 添加最后一个标签后的文本
        if (lastEnd < part.length) {
          const text = part.slice(lastEnd).trim();
          if (text && text !== "]") segments.push(text);
        }

        return segments;
      });

      // 只朗读文字消息
      textToRead = replyParts
        .filter(
          (p) =>
            !p.match(
              /^\[(sticker|表情|表情包|转账|红包|位置|语音|撤回|收款|退款|打电话|发动态)[：:]?/i
            )
        )
        .join("，");

      // 过滤掉单独的方括号或空内容
      replyParts = replyParts.filter(
        (p) => p && p.trim() !== "]" && p.trim() !== "[" && p.trim().length > 0
      );

      for (let i = 0; i < replyParts.length; i++) {
        await new Promise((resolve) =>
          setTimeout(resolve, i === 0 ? 0 : 800 + Math.random() * 500)
        );

        const partContent = replyParts[i];

        // 检查是否是打电话标签
        const callMatch = partContent.match(/^\[打电话[:：](语音|视频)\]$/i);
        if (callMatch) {
          const callType = callMatch[1] === "视频" ? "video" : "voice";
          // 延迟一下再发起来电
          setTimeout(() => {
            aiInitiateCall(savedCharId, callType);
          }, 1000);
          continue; // 不保存打电话标签本身
        }

        // 检查是否是发动态标签
        // 只支持标准格式: [发动态:内容]
        const postMomentMatch = partContent.match(
          /^\[发动态[:：]([\s\S]+)\]$/i
        );
        if (postMomentMatch) {
          const momentContent = postMomentMatch[1].trim();
          setTimeout(async () => {
            await createAiMomentPost(savedCharId, momentContent);
          }, 500);
          continue; // 不保存发动态标签本身
        }

        // 检查AI是否输出了HTML格式的动态卡片（需要提取内容并真正发动态）
        if (
          partContent.includes("shared-post-card") ||
          partContent.includes('class="shared-post')
        ) {
          // 尝试提取动态内容
          const contentMatch = partContent.match(
            /shared-post-content[^>]*>([^<]+)</
          );
          if (contentMatch) {
            const extractedContent = contentMatch[1].trim();
            setTimeout(async () => {
              await createAiMomentPost(savedCharId, extractedContent);
            }, 500);
          }
          continue; // 不保存HTML卡片
        }

        // 检查是否是撤回标签
        const isRecallTag = /^\[撤回\]$/i.test(partContent.trim());
        if (isRecallTag) {
          // 撤回上一条AI消息
          const history = chatHistories[savedCharId];
          if (history && history.length > 0) {
            // 找到最后一条AI消息并标记为撤回
            for (let j = history.length - 1; j >= 0; j--) {
              if (history[j].role === "assistant" && !history[j].isRecalled) {
                history[j].isRecalled = true;
                break;
              }
            }
            saveAndRenderForChar(savedCharId);
          }
          continue; // 不保存撤回标签本身
        }

        // 检查是否是收款标签
        const isAcceptTag = /^\[收款\]$/i.test(partContent.trim());
        if (isAcceptTag) {
          // 找到最近一条用户发的待处理转账并接收
          const history = chatHistories[savedCharId];
          if (history) {
            for (let j = history.length - 1; j >= 0; j--) {
              if (
                history[j].role === "user" &&
                history[j].transferId &&
                history[j].transferStatus === "pending"
              ) {
                updateUserTransferStatus(history[j].transferId, true);
                break;
              }
            }
          }
          continue; // 不保存收款标签本身
        }

        // 检查是否是退款标签
        const isRejectTag = /^\[退款\]$/i.test(partContent.trim());
        if (isRejectTag) {
          // 找到最近一条用户发的待处理转账并退回
          const history = chatHistories[savedCharId];
          if (history) {
            for (let j = history.length - 1; j >= 0; j--) {
              if (
                history[j].role === "user" &&
                history[j].transferId &&
                history[j].transferStatus === "pending"
              ) {
                updateUserTransferStatus(history[j].transferId, false);
                break;
              }
            }
          }
          continue; // 不保存退款标签本身
        }

        const isVoiceMsg = /^\[语音[:：](.+)\]$/.test(partContent);
        const isStickerMsg = /^\[(sticker|表情|表情包)[：:]/i.test(partContent);

        // 检查是否包含引用标签 [引用:xxx]内容
        let quoteInfo = null;
        let actualContent = partContent;
        const quoteMatch = partContent.match(/^\[引用[:：]([^\]]+)\](.*)$/s);
        if (quoteMatch) {
          quoteInfo = {
            sender: "我", // AI引用的是用户说的话
            senderRole: "user",
            content: quoteMatch[1],
            displayContent:
              quoteMatch[1].length > 50
                ? quoteMatch[1].substring(0, 50) + "..."
                : quoteMatch[1],
          };
          actualContent = quoteMatch[2].trim() || partContent; // 如果没有回复内容，保留原始
        }

        const msgObj = {
          role: "assistant",
          content: actualContent,
          time: new Date().toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          audioUrl: null,
        };

        // 添加引用信息
        if (quoteInfo) {
          msgObj.quote = quoteInfo;
        }

        chatHistories[savedCharId].push(msgObj);
        saveAndRenderForChar(savedCharId);
        // 【新增】更新列表预览 (每次循环都更新，这样可以看到对方正在一句句发)
        updateCharacterLastMessage(savedCharId, actualContent);
        // ==================== 插入开始：后台弹窗通知 (最终版) ====================
        if (document.visibilityState === "hidden") {
          console.log("App在后台，尝试发送通知...");

          // --- 获取名字：优先用备注 (note)，没有则用原名 ---
          // char 对象在 requestAIReply 函数开头通常已经获取了
          let notifyName = char.note || char.name || "AI伴侣";
          // ----------------------------------------

          if (
            "serviceWorker" in navigator &&
            navigator.serviceWorker.controller
          ) {
            navigator.serviceWorker.ready
              .then((registration) => {
                registration.showNotification(notifyName, {
                  body: actualContent,
                  icon:
                    char.avatar || "https://i.postimg.cc/8kmQwCr0/IMG-2897.jpg",
                  tag: "chat-msg-" + Date.now(),
                  renotify: true,
                  vibrate: [200, 100, 200],
                });
              })
              .catch((e) => console.error("通知发送失败:", e));
          }
        }
        // ==================== 插入结束 ====================
        // 【修复】检查聊天对话页面是否打开，如果没打开则增加未读数（每条消息都增加）
        const convPage = document.getElementById("chatConversationPage");
        const isConvPageActive =
          convPage && convPage.classList.contains("active");
        if (!isConvPageActive || currentChatCharId !== savedCharId) {
          // 每条消息都增加未读数
          addUnreadMessage(savedCharId);
          // 只在最后一条消息时显示通知弹窗
          if (i === replyParts.length - 1) {
            showMessageNotification(
              savedCharId,
              char.name,
              char.avatar,
              partContent
            );
          }
        }

        // 如果是语音消息，自动生成音频
        if (isVoiceMsg && settings.voiceId) {
          const voiceText = partContent.match(/^\[语音[:：](.+)\]$/)[1];
          const msgIndex = chatHistories[savedCharId].length - 1;

          // 异步生成语音，不阻塞后续消息
          generateVoiceForMessageForChar(
            savedCharId,
            msgIndex,
            voiceText,
            settings
          );
        } else if (i === replyParts.length - 1 && !isVoiceMsg) {
          // 如果最后一条不是语音消息，且开启了自动朗读，触发TTS
          triggerVoiceForChar(savedCharId, msgObj, textToRead, settings);
        }
      }
    }

    if (typeof checkAndTriggerSummary === "function") {
      checkAndTriggerSummary(settings);
    }

    // 生成心声（异步执行，不阻塞主流程）
    if (typeof generateHeartVoice === "function") {
      // 获取用户最后一条消息
      const userMessages =
        chatHistories[savedCharId]?.filter((m) => m.role === "user") || [];
      const lastUserMsg = userMessages[userMessages.length - 1]?.content || "";
      // 异步生成心声
      generateHeartVoice(savedCharId, aiReply, lastUserMsg).catch((e) => {
        console.error("心声生成错误:", e);
      });
    }

    // 自动推进阅读进度（如果开启了一起读书功能）
    advanceReadingProgress();
  } catch (error) {
    document.getElementById("typingIndicator")?.remove();
    alert("AI回复失败: " + error.message);
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.innerHTML = "<span>★</span>";
  }
}

function saveAndRender() {
  // localforage 不需要 JSON.stringify
  localforage.setItem("chatHistories", chatHistories);
  renderConversation();
}

// 【新增】支持指定charId的保存和渲染函数
function saveAndRenderForChar(charId) {
  localforage.setItem("chatHistories", chatHistories);
  // 只有当前打开的对话才需要渲染
  if (currentChatCharId === charId) {
    renderConversation();
  }
}

// 辅助函数：触发语音生成
async function triggerVoice(msgObj, text, settings) {
  // 如果用户配置了音色
  if (settings.voiceId) {
    // 找到消息在数组中的索引 (也就是最后一个)
    const history = chatHistories[currentChatCharId];
    const msgIndex = history.length - 1;

    // 异步生成，不阻塞界面（静默生成，不显示提示）
    const audioUrl = await generateSpeech(text, currentChatCharId);

    if (audioUrl) {
      history[msgIndex].audioUrl = audioUrl;
      saveAndRender(); // 重新渲染以显示播放条
    }
  }
}

// 【新增】支持指定charId的语音触发函数
async function triggerVoiceForChar(charId, msgObj, text, settings) {
  if (settings.voiceId) {
    const history = chatHistories[charId];
    if (!history) return;
    const msgIndex = history.length - 1;

    const audioUrl = await generateSpeech(text, charId);

    if (audioUrl && history[msgIndex]) {
      history[msgIndex].audioUrl = audioUrl;
      saveAndRenderForChar(charId);
    }
  }
}

// 辅助函数：为语音消息自动生成音频
async function generateVoiceForMessage(msgIndex, voiceText, settings) {
  if (!settings.voiceId) return;

  const history = chatHistories[currentChatCharId];
  if (!history || !history[msgIndex]) return;

  try {
    const audioUrl = await generateSpeech(voiceText, currentChatCharId);

    if (audioUrl && history[msgIndex]) {
      history[msgIndex].audioUrl = audioUrl;
      // 计算语音时长（估算）
      history[msgIndex].audioDuration = Math.ceil(voiceText.length / 5) + '"';
      saveAndRender();
    }
  } catch (e) {
    console.error("Auto voice generation error:", e);
  }
}

// 【新增】支持指定charId的语音消息生成函数
async function generateVoiceForMessageForChar(
  charId,
  msgIndex,
  voiceText,
  settings
) {
  if (!settings.voiceId) return;

  const history = chatHistories[charId];
  if (!history || !history[msgIndex]) return;

  try {
    const audioUrl = await generateSpeech(voiceText, charId);

    if (audioUrl && history[msgIndex]) {
      history[msgIndex].audioUrl = audioUrl;
      history[msgIndex].audioDuration = Math.ceil(voiceText.length / 5) + '"';
      saveAndRenderForChar(charId);
    }
  } catch (e) {
    console.error("Auto voice generation error:", e);
  }
}

// Update character's last message preview
function updateCharacterLastMessage(charId, message) {
  const char = characters.find((c) => c.id === charId);
  if (char) {
    char.lastMessage = message;
    char.lastTime = new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    char.lastTimestamp = Date.now(); // 添加时间戳用于排序
    localforage.setItem("characters", characters);
    renderCharacters();
  }
}

// Clear chat history
function clearChatHistory() {
  if (confirm("确定要清空聊天记录吗？")) {
    chatHistories[currentChatCharId] = [];
    localforage.setItem("chatHistories", chatHistories);
    renderConversation();
    toggleConvMenu();
  }
}

// Delete character
function deleteCharacter() {
  if (confirm("确定要删除这个角色吗？聊天记录也会被删除。")) {
    characters = characters.filter((c) => c.id !== currentChatCharId);
    delete chatHistories[currentChatCharId];
    localforage.setItem("characters", characters);
    localforage.setItem("chatHistories", chatHistories);
    closeConversation();
    renderCharacters();
  }
}

// Close click outside conversation menu
document.addEventListener("click", function (e) {
  const menu = document.getElementById("convMenu");
  const menuBtn = document.querySelector(".conv-menu-btn");
  if (
    menu &&
    menu.classList.contains("active") &&
    !menu.contains(e.target) &&
    e.target !== menuBtn
  ) {
    menu.classList.remove("active");
  }
});

// ==================== CHAT SETTINGS ====================
var tempSettingsData = {};

// Open chat settings
function openChatSettings() {
  // 检查是否是群聊设置
  if (currentGroupId) {
    openGroupChatSettings();
    return;
  }

  if (!currentChatCharId) return;

  const char = characters.find((c) => c.id === currentChatCharId);
  if (!char) return;

  // Initialize settings for this character if not exists
  if (!chatSettings[currentChatCharId]) {
    chatSettings[currentChatCharId] = {
      charName: char.name || "",
      charNote: char.note || "",
      group: "none",
      otherAvatar: char.avatar || "",
      myAvatar: "",
      persona: "",
      myPersona: "",
      worldbook: "",
      memoryLink: "",
      memoryCount: 5,
      contextCount: 150,
      onlineDating: false,
      longMemory: true,
      summaryMode: "manual",
      triggerCount: 500,
      summaryPrompt:
        "请你以第三人称的视角，客观、冷静、不带任何感情色彩地总结以下对话的核心事件和信息。禁止进行任何角色扮演或添加主观评论。",
      flame: false,
      timeAware: true,
      background: "",
      fontSize: 14,
      bubbleStyle: "none",
      customCSS: "",
    };
  }

  // Load settings into form
  loadSettingsToForm(chatSettings[currentChatCharId], char);

  // Update memory link dropdown
  updateMemoryLinkDropdown();

  // Show settings page
  document.getElementById("chatSettingsPage").classList.add("active");
}

// 打开群聊设置
function openGroupChatSettings() {
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  // 初始化群聊设置
  if (!group.settings) {
    group.settings = {
      myNickname: "我",
      myPersona: "",
      backgroundActivity: false,
      timeAware: true,
      background: "",
      memoryLink: "",
      memoryLinks: [],
      memoryLinkCount: 5,
      contextCount: 20,
    };
  }
  // 确保新字段存在
  if (group.settings.memoryLink === undefined) group.settings.memoryLink = "";
  if (group.settings.memoryLinks === undefined)
    group.settings.memoryLinks = group.settings.memoryLink
      ? [parseInt(group.settings.memoryLink)]
      : [];
  if (group.settings.memoryLinkCount === undefined)
    group.settings.memoryLinkCount = 5;
  if (group.settings.contextCount === undefined)
    group.settings.contextCount = 20;

  const settingsPage = document.getElementById("groupChatSettingsPage");
  const content = document.getElementById("groupSettingsContent");

  // 获取群成员信息
  const members = group.members
    .map((id) => characters.find((c) => c.id === id))
    .filter(Boolean);

  // 获取群聊消息数
  const messagesKey = "group_messages_" + currentGroupId;
  localforage.getItem(messagesKey).then((msgs) => {
    const msgCount = (msgs || []).length;
    document.getElementById("groupMsgCount").textContent = msgCount;
  });

  // 生成成员显示HTML
  const membersHtml = members
    .map(
      (m) => `
    <div class="group-settings-member-item">
      <div class="group-settings-member-avatar">
        ${m.avatar ? `<img src="${m.avatar}" alt="">` : m.name.charAt(0)}
      </div>
      <div class="group-settings-member-name">${m.name}</div>
    </div>
  `
    )
    .join("");

  // 生成实时预览HTML
  const firstMember = members[0];
  const previewHtml = `
    <div class="chat-preview-group-name">${group.name}</div>
    <div class="chat-preview-msg">
      <div class="chat-preview-avatar">
        ${
          firstMember?.avatar
            ? `<img src="${firstMember.avatar}" alt="">`
            : firstMember?.name?.charAt(0) || "?"
        }
      </div>
      <div class="chat-preview-content">
        <div class="chat-preview-name">${firstMember?.name || "成员"}</div>
        <div class="chat-preview-bubble">对方消息预览</div>
        <div class="chat-preview-time">10:00</div>
      </div>
    </div>
    <div class="chat-preview-msg user">
      <div class="chat-preview-avatar">
        ${
          group.settings.myAvatar
            ? `<img src="${group.settings.myAvatar}" alt="">`
            : "👤"
        }
      </div>
      <div class="chat-preview-content">
        <div class="chat-preview-name"><span class="chat-preview-owner-badge">群主</span>${
          group.settings.myNickname || "我"
        }</div>
        <div class="chat-preview-bubble">我的消息预览</div>
        <div class="chat-preview-time">10:00</div>
      </div>
    </div>
  `;

  content.innerHTML = `
    <!-- 基础资料 -->
    <div class="settings-section">
      <div class="section-header">
        <div class="section-icon" style="background:linear-gradient(135deg, #fff3e0, #ffe0b2);">📝</div>
        <span class="section-title">基础资料</span>
      </div>
      <div class="section-body">
        <div class="form-group">
          <label class="form-label">群聊名称 <span class="form-hint">(AI只认这个，修改会影响记忆)</span></label>
          <input type="text" class="form-input" id="groupSettingsName" value="${
            group.name || ""
          }" placeholder="输入群聊名称...">
        </div>
        <div class="form-group">
          <label class="form-label">我的群昵称</label>
          <input type="text" class="form-input" id="groupSettingsMyNickname" value="${
            group.settings.myNickname || "我"
          }" placeholder="输入我的群昵称...">
        </div>
        <div class="avatar-upload-row">
          <div class="avatar-upload-col">
            <div class="avatar-upload-label">群头像</div>
            <div class="avatar-preview" id="groupAvatarPreview" onclick="document.getElementById('groupSettingsAvatarInput').click()">
              ${
                group.avatar
                  ? `<img src="${group.avatar}" style="width:100%;height:100%;object-fit:cover;display:block;">`
                  : '<span style="font-size:24px;">👥</span>'
              }
            </div>
            <input type="file" id="groupSettingsAvatarInput" class="hidden-input" accept="image/*" onchange="previewGroupSettingsAvatar(this)">
            <div class="avatar-actions">
              <button class="avatar-action-btn" onclick="document.getElementById('groupSettingsAvatarInput').click()">上传</button>
            </div>
          </div>
          <div class="avatar-upload-col">
            <div class="avatar-upload-label">我的头像</div>
            <div class="avatar-preview" id="groupMyAvatarPreview" onclick="document.getElementById('groupSettingsMyAvatarInput').click()">
              ${
                group.settings.myAvatar
                  ? `<img src="${group.settings.myAvatar}" style="width:100%;height:100%;object-fit:cover;display:block;">`
                  : '<span style="font-size:24px;">👤</span>'
              }
            </div>
            <input type="file" id="groupSettingsMyAvatarInput" class="hidden-input" accept="image/*" onchange="previewGroupSettingsMyAvatar(this)">
            <div class="avatar-actions">
              <button class="avatar-action-btn" onclick="document.getElementById('groupSettingsMyAvatarInput').click()">上传</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- AI大脑与设定 -->
    <div class="settings-section">
      <div class="section-header">
        <div class="section-icon" style="background:linear-gradient(135deg, #fce4ec, #f8bbd0);">🧠</div>
        <span class="section-title">AI大脑与设定</span>
      </div>
      <div class="section-body">
        <div class="form-group">
          <label class="form-label">我的人设 (My Persona)</label>
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <select class="form-select" id="groupPersonaPresetSelect" onchange="loadGroupPersonaPreset(this.value)" style="flex:1;">
              <option value="">-- 选择预设 --</option>
            </select>
            <button class="avatar-action-btn" onclick="saveGroupPersonaPreset()" style="white-space:nowrap;">保存预设</button>
          </div>
          <textarea class="form-input form-textarea" id="groupSettingsMyPersona" placeholder="描述你在群聊中的身份和设定...">${
            group.settings.myPersona || ""
          }</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">群成员设定</label>
          <div class="group-settings-member-display">
            <div class="group-settings-member-row" id="groupSettingsMembersList">
              ${membersHtml}
            </div>
          </div>
          <button class="group-manage-btn" onclick="openGroupMemberManager()">
            👥 管理群成员
          </button>
        </div>
        <div class="form-group">
          <label class="form-label">记忆互通 <span class="form-hint">(可多选)</span></label>
          <div class="memory-link-dropdown" id="groupMemoryLinkDropdown">
            <div class="memory-link-select" onclick="toggleGroupMemoryLinkDropdown()">
              <span class="memory-link-text" id="groupMemoryLinkText">${
                (group.settings.memoryLinks || []).length > 0
                  ? "已选择 " +
                    (group.settings.memoryLinks || []).length +
                    " 个聊天"
                  : "点击选择要互通的聊天..."
              }</span>
              <span class="memory-link-arrow">▼</span>
            </div>
            <div class="memory-link-options" id="groupMemoryLinkOptions">
              ${(function () {
                let html = "";
                // 单聊角色
                if (characters.length > 0) {
                  html += '<div class="memory-link-section-title">单聊</div>';
                  html += characters
                    .map((c) => {
                      const isLinked = (
                        group.settings.memoryLinks || []
                      ).includes(c.id);
                      const displayName = c.note || c.name;
                      const isInGroup = group.members.includes(c.id);
                      return (
                        '<div class="memory-link-option ' +
                        (isLinked ? "selected" : "") +
                        '" onclick="toggleGroupMemoryLinkOption(' +
                        c.id +
                        ', this)" data-type="char" data-id="' +
                        c.id +
                        '">' +
                        '<input type="checkbox" ' +
                        (isLinked ? "checked" : "") +
                        ' onclick="event.stopPropagation()">' +
                        '<div class="memory-link-option-avatar">' +
                        (c.avatar
                          ? '<img src="' + c.avatar + '">'
                          : displayName.charAt(0)) +
                        "</div>" +
                        '<span class="memory-link-option-name">' +
                        displayName +
                        (isInGroup
                          ? ' <span style="font-size:10px;color:#999;">(群成员)</span>'
                          : "") +
                        "</span>" +
                        "</div>"
                      );
                    })
                    .join("");
                }
                // 其他群聊
                const otherGroups = groupChats.filter((g) => g.id !== group.id);
                if (otherGroups.length > 0) {
                  html += '<div class="memory-link-section-title">群聊</div>';
                  html += otherGroups
                    .map((g) => {
                      const groupLinkId = "group_" + g.id;
                      const isLinked = (
                        group.settings.memoryLinks || []
                      ).includes(groupLinkId);
                      return (
                        '<div class="memory-link-option ' +
                        (isLinked ? "selected" : "") +
                        '" onclick="toggleGroupMemoryLinkOption(' +
                        "'" +
                        groupLinkId +
                        "'" +
                        ', this)" data-type="group" data-id="' +
                        groupLinkId +
                        '">' +
                        '<input type="checkbox" ' +
                        (isLinked ? "checked" : "") +
                        ' onclick="event.stopPropagation()">' +
                        '<div class="memory-link-option-avatar">' +
                        (g.avatar ? '<img src="' + g.avatar + '">' : "👥") +
                        "</div>" +
                        '<span class="memory-link-option-name">' +
                        (g.name || "群聊") +
                        "</span>" +
                        "</div>"
                      );
                    })
                    .join("");
                }
                return (
                  html ||
                  '<div class="memory-link-empty">暂无可互通的聊天</div>'
                );
              })()}
            </div>
          </div>
          <div class="memory-link-tags" id="groupMemoryLinkTags">
            ${(group.settings.memoryLinks || [])
              .map((linkId) => {
                if (typeof linkId === "string" && linkId.startsWith("group_")) {
                  const gId = parseInt(linkId.replace("group_", ""));
                  const g = groupChats.find((x) => x.id === gId);
                  if (!g) return "";
                  return (
                    '<span class="memory-link-tag">👥 ' +
                    (g.name || "群聊") +
                    '<span class="memory-link-tag-remove" onclick="removeGroupMemoryLinkTag(' +
                    "'" +
                    linkId +
                    "'" +
                    ')">×</span></span>'
                  );
                } else {
                  const char = characters.find((c) => c.id === linkId);
                  if (!char) return "";
                  const displayName = char.note || char.name;
                  return (
                    '<span class="memory-link-tag">' +
                    displayName +
                    '<span class="memory-link-tag-remove" onclick="removeGroupMemoryLinkTag(' +
                    linkId +
                    ')">×</span></span>'
                  );
                }
              })
              .join("")}
          </div>
          <div class="form-hint" style="margin-top:6px;font-size:0.75rem;color:#999;">
            选中后，群里的AI可以了解你与这些聊天的内容
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">互通条数</label>
          <div class="number-input-row">
            <input type="number" class="number-input" id="groupSettingsMemoryLinkCount" 
              value="${group.settings.memoryLinkCount || 5}" min="1" max="50" 
              onchange="updateGroupMemoryLinkCount()">
            <span class="form-hint">条最近消息</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">上下文记忆条数</label>
          <div class="number-input-row">
            <input type="number" class="number-input" id="groupSettingsContextCount" 
              value="${group.settings.contextCount || 20}" min="5" max="100"
              onchange="updateGroupContextCount()">
            <span class="form-hint">条群聊历史消息</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">世界书 <span class="form-hint">(可多选)</span></label>
          <div class="worldbook-select-list" id="groupWorldbookSelectList">
            <!-- 世界书列表将动态生成 -->
          </div>
          <div class="form-hint" style="margin-top:6px;">选中的世界书内容会作为背景知识提供给AI</div>
          <input type="hidden" id="groupSettingsWorldbook" value="${
            group.settings.worldbook || ""
          }">
        </div>
      </div>
    </div>

    <!-- 玩法与模式 -->
    <div class="settings-section">
      <div class="section-header">
        <div class="section-icon" style="background:linear-gradient(135deg, #e3f2fd, #bbdefb);">🎮</div>
        <span class="section-title">玩法与模式</span>
      </div>
      <div class="section-body">
        <div class="toggle-row">
          <div>
            <div class="toggle-label">实时时间感知</div>
            <div class="toggle-sublabel">AI感知当前时间</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="groupSettingsTimeAware" ${
              group.settings.timeAware !== false ? "checked" : ""
            }>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- 视觉美化 -->
    <div class="settings-section">
      <div class="section-header">
        <div class="section-icon" style="background:linear-gradient(135deg, #f3e5f5, #e1bee7);">🎨</div>
        <span class="section-title">视觉美化</span>
      </div>
      <div class="section-body">
        <div class="chat-preview-container">
          <div class="chat-preview-title">实时预览</div>
          <div class="chat-preview-box" id="groupChatPreviewBox">
            ${previewHtml}
          </div>
        </div>
        
        <!-- 聊天背景 -->
        <div class="form-group" style="margin-top:16px;">
          <label class="form-label">聊天背景</label>
          <div class="avatar-upload-row" style="justify-content:flex-start;">
            <div class="avatar-upload-col">
              <div class="avatar-preview" id="groupBgPreview" onclick="document.getElementById('groupSettingsBgInput').click()" style="width:80px;height:140px;border-radius:12px;">
                ${
                  group.settings.background
                    ? `<img src="${group.settings.background}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:12px;">`
                    : '<span style="font-size:12px;color:#ccc;">无背景</span>'
                }
              </div>
              <input type="file" id="groupSettingsBgInput" class="hidden-input" accept="image/*" onchange="previewGroupSettingsBackground(this)">
              <div class="avatar-actions">
                <button class="avatar-action-btn" onclick="document.getElementById('groupSettingsBgInput').click()">上传</button>
                <button class="avatar-action-btn" onclick="clearGroupSettingsBackground()">清除</button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 视频通话背景 -->
        <div class="form-group" style="margin-top:16px;padding-top:16px;border-top:1px dashed #f0f0f0;">
          <label class="form-label">视频通话背景</label>
          <div class="avatar-upload-row" style="justify-content:flex-start;gap:16px;">
            <div class="avatar-upload-col">
              <div class="avatar-upload-label">对方画面</div>
              <div class="avatar-preview" id="groupVideoPartnerPreview" onclick="document.getElementById('groupVideoPartnerInput').click()" style="width:80px;height:140px;border-radius:12px;">
                ${
                  group.settings.videoCallPartnerImage
                    ? `<img src="${group.settings.videoCallPartnerImage}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:12px;">`
                    : '<span style="font-size:12px;color:#ccc;">无背景</span>'
                }
              </div>
              <input type="file" id="groupVideoPartnerInput" class="hidden-input" accept="image/*" onchange="previewGroupVideoPartner(this)">
              <div class="avatar-actions">
                <button class="avatar-action-btn" onclick="document.getElementById('groupVideoPartnerInput').click()">上传</button>
                <button class="avatar-action-btn" onclick="clearGroupVideoPartner()">清除</button>
              </div>
            </div>
            <div class="avatar-upload-col">
              <div class="avatar-upload-label">我的画面</div>
              <div class="avatar-preview" id="groupVideoSelfPreview" onclick="document.getElementById('groupVideoSelfInput').click()" style="width:80px;height:140px;border-radius:12px;">
                ${
                  group.settings.videoCallSelfImage
                    ? `<img src="${group.settings.videoCallSelfImage}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:12px;">`
                    : '<span style="font-size:12px;color:#ccc;">无背景</span>'
                }
              </div>
              <input type="file" id="groupVideoSelfInput" class="hidden-input" accept="image/*" onchange="previewGroupVideoSelf(this)">
              <div class="avatar-actions">
                <button class="avatar-action-btn" onclick="document.getElementById('groupVideoSelfInput').click()">上传</button>
                <button class="avatar-action-btn" onclick="clearGroupVideoSelf()">清除</button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 气泡颜色设置 -->
        <div class="form-group" style="margin-top:16px;padding-top:16px;border-top:1px dashed #f0f0f0;">
          <label class="form-label">💬 气泡样式</label>
          <div class="form-hint" style="margin-bottom:10px;">自定义消息气泡的颜色和透明度</div>
          
          <!-- 我的气泡 -->
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
            <span style="font-size:0.8rem;color:#666;width:70px;">我的气泡</span>
            <input type="color" id="groupUserBubbleColor" 
              value="${group.settings.userBubbleColor || "#f48fb1"}"
              style="width:36px;height:28px;border:none;border-radius:4px;cursor:pointer;"
              onchange="updateGroupChatStyle()">
            <input type="range" id="groupUserBubbleOpacity" 
              min="30" max="100" value="${
                group.settings.userBubbleOpacity || 85
              }"
              style="flex:1;"
              oninput="updateGroupChatStyle(); document.getElementById('groupUserOpacityLabel').textContent=this.value+'%'">
            <span id="groupUserOpacityLabel" style="font-size:0.75rem;color:#999;width:35px;">${
              group.settings.userBubbleOpacity || 85
            }%</span>
          </div>
          
          <!-- AI气泡 -->
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:0.8rem;color:#666;width:70px;">TA的气泡</span>
            <input type="color" id="groupAiBubbleColor" 
              value="${group.settings.aiBubbleColor || "#ffffff"}"
              style="width:36px;height:28px;border:none;border-radius:4px;cursor:pointer;"
              onchange="updateGroupChatStyle()">
            <input type="range" id="groupAiBubbleOpacity" 
              min="30" max="100" value="${group.settings.aiBubbleOpacity || 85}"
              style="flex:1;"
              oninput="updateGroupChatStyle(); document.getElementById('groupAiOpacityLabel').textContent=this.value+'%'">
            <span id="groupAiOpacityLabel" style="font-size:0.75rem;color:#999;width:35px;">${
              group.settings.aiBubbleOpacity || 85
            }%</span>
          </div>
        </div>
        
        <!-- 字体颜色设置 -->
        <div class="form-group" style="margin-top:16px;">
          <label class="form-label">🎨 字体颜色</label>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <span style="font-size:0.8rem;color:#666;width:70px;">我的文字</span>
            <input type="color" id="groupUserFontColor" 
              value="${group.settings.userFontColor || "#ffffff"}"
              style="width:36px;height:28px;border:none;border-radius:4px;cursor:pointer;"
              onchange="updateGroupChatStyle()">
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:0.8rem;color:#666;width:70px;">TA的文字</span>
            <input type="color" id="groupAiFontColor" 
              value="${group.settings.aiFontColor || "#37474f"}"
              style="width:36px;height:28px;border:none;border-radius:4px;cursor:pointer;"
              onchange="updateGroupChatStyle()">
          </div>
        </div>
        
        <!-- 气泡间距设置 -->
        <div class="form-group" style="margin-top:16px;">
          <label class="form-label">📏 气泡间距</label>
          <div style="display:flex;align-items:center;gap:10px;">
            <input type="range" id="groupBubbleSpacing" 
              min="4" max="24" value="${group.settings.bubbleSpacing || 12}"
              style="flex:1;"
              oninput="updateGroupChatStyle(); document.getElementById('groupSpacingLabel').textContent=this.value+'px'">
            <span id="groupSpacingLabel" style="font-size:0.75rem;color:#999;width:40px;">${
              group.settings.bubbleSpacing || 12
            }px</span>
          </div>
        </div>
        
        <!-- 头像大小设置 -->
        <div class="form-group" style="margin-top:16px;">
          <label class="form-label">👤 群成员头像大小</label>
          <div style="display:flex;align-items:center;gap:10px;">
            <input type="range" id="groupAvatarSize" 
              min="24" max="48" value="${group.settings.avatarSize || 32}"
              style="flex:1;"
              oninput="updateGroupChatStyle(); document.getElementById('groupAvatarSizeLabel').textContent=this.value+'px'">
            <span id="groupAvatarSizeLabel" style="font-size:0.75rem;color:#999;width:40px;">${
              group.settings.avatarSize || 32
            }px</span>
          </div>
        </div>
        
        <!-- 重置样式按钮 -->
        <div style="margin-top:16px;text-align:center;">
          <button class="avatar-action-btn" onclick="resetGroupChatStyle()" style="background:#f5f5f5;">恢复默认样式</button>
        </div>
      </div>
    </div>

    <!-- 数据与操作 -->
    <div class="settings-section">
      <div class="section-header">
        <div class="section-icon" style="background:linear-gradient(135deg, #e8f5e9, #c8e6c9);">💾</div>
        <span class="section-title">数据与操作</span>
      </div>
      <div class="section-body">
        <div style="display:flex;gap:16px;margin-bottom:16px;">
          <div style="flex:1;text-align:center;padding:12px;background:#f5f5f5;border-radius:12px;">
            <div style="font-size:0.75rem;color:#999;">总消息</div>
            <div style="font-size:1.2rem;font-weight:600;color:#666;" id="groupMsgCount">0</div>
          </div>
          <div style="flex:1;text-align:center;padding:12px;background:#f5f5f5;border-radius:12px;">
            <div style="font-size:0.75rem;color:#999;">群成员</div>
            <div style="font-size:1.2rem;font-weight:600;color:#666;">${
              members.length
            }</div>
          </div>
        </div>
        <div class="data-actions-grid">
          <button class="data-action-btn" onclick="importGroupChat()">📥 导入聊天记录</button>
          <button class="data-action-btn" onclick="exportGroupChat()">📤 导出聊天记录</button>
          <button class="data-action-btn full-width" onclick="clearGroupChat()">🧹 清空聊天记录</button>
          <button class="data-action-btn full-width danger" onclick="dissolveGroup()">⚠️ 解散群聊</button>
        </div>
      </div>
    </div>
  `;

  settingsPage.classList.add("active");

  // 初始化人设预设下拉框和世界书列表
  setTimeout(() => {
    initGroupPersonaPresets();
    applyGroupChatStyle();
    // 初始化群聊世界书选择列表
    const worldbookIds = group.settings.worldbook
      ? group.settings.worldbook.split(",").filter((s) => s)
      : [];
    renderGroupWorldbookSelectList(worldbookIds);
  }, 100);
}

// 关闭群聊设置
window.closeGroupChatSettings = function () {
  // 保存设置
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (group) {
    const nameInput = document.getElementById("groupSettingsName");
    const nicknameInput = document.getElementById("groupSettingsMyNickname");
    const personaInput = document.getElementById("groupSettingsMyPersona");
    const timeAwareInput = document.getElementById("groupSettingsTimeAware");
    const memoryLinkCountInput = document.getElementById(
      "groupSettingsMemoryLinkCount"
    );
    const contextCountInput = document.getElementById(
      "groupSettingsContextCount"
    );
    const worldbookInput = document.getElementById("groupSettingsWorldbook");

    if (nameInput) group.name = nameInput.value || group.name;

    group.settings = group.settings || {};
    if (nicknameInput) group.settings.myNickname = nicknameInput.value || "我";
    if (personaInput) group.settings.myPersona = personaInput.value || "";
    if (timeAwareInput) group.settings.timeAware = timeAwareInput.checked;
    if (worldbookInput) group.settings.worldbook = worldbookInput.value || "";

    // 记忆互通已通过下拉框实时保存，这里不需要再处理

    if (memoryLinkCountInput)
      group.settings.memoryLinkCount =
        parseInt(memoryLinkCountInput.value) || 5;
    if (contextCountInput)
      group.settings.contextCount = parseInt(contextCountInput.value) || 20;

    // 保存样式设置
    const userBubbleColor = document.getElementById("groupUserBubbleColor");
    const userBubbleOpacity = document.getElementById("groupUserBubbleOpacity");
    const aiBubbleColor = document.getElementById("groupAiBubbleColor");
    const aiBubbleOpacity = document.getElementById("groupAiBubbleOpacity");
    const userFontColor = document.getElementById("groupUserFontColor");
    const aiFontColor = document.getElementById("groupAiFontColor");
    const bubbleSpacing = document.getElementById("groupBubbleSpacing");
    const avatarSize = document.getElementById("groupAvatarSize");

    if (userBubbleColor) group.settings.userBubbleColor = userBubbleColor.value;
    if (userBubbleOpacity)
      group.settings.userBubbleOpacity = parseInt(userBubbleOpacity.value);
    if (aiBubbleColor) group.settings.aiBubbleColor = aiBubbleColor.value;
    if (aiBubbleOpacity)
      group.settings.aiBubbleOpacity = parseInt(aiBubbleOpacity.value);
    if (userFontColor) group.settings.userFontColor = userFontColor.value;
    if (aiFontColor) group.settings.aiFontColor = aiFontColor.value;
    if (bubbleSpacing)
      group.settings.bubbleSpacing = parseInt(bubbleSpacing.value);
    if (avatarSize) group.settings.avatarSize = parseInt(avatarSize.value);

    localforage.setItem("groupChats", groupChats);

    // 应用样式到聊天界面
    applyGroupChatStyle();
  }

  const settingsPage = document.getElementById("groupChatSettingsPage");
  if (settingsPage) {
    settingsPage.classList.remove("active");
  }
};

// 保存并关闭群聊设置
window.saveGroupChatSettingsAndClose = function () {
  closeGroupChatSettings();
  showToast("设置已保存");
};

// 群聊记忆互通 - 当前选中的角色ID列表
window.selectedGroupMemoryLinks = [];

// 切换群聊记忆互通下拉框
window.toggleGroupMemoryLinkDropdown = function () {
  const dropdown = document.getElementById("groupMemoryLinkDropdown");
  dropdown.classList.toggle("open");

  if (dropdown.classList.contains("open")) {
    setTimeout(() => {
      document.addEventListener(
        "click",
        closeGroupMemoryLinkDropdownOnClickOutside
      );
    }, 0);
  }
};

// 点击外部关闭群聊记忆互通下拉框
function closeGroupMemoryLinkDropdownOnClickOutside(e) {
  const dropdown = document.getElementById("groupMemoryLinkDropdown");
  if (dropdown && !dropdown.contains(e.target)) {
    dropdown.classList.remove("open");
    document.removeEventListener(
      "click",
      closeGroupMemoryLinkDropdownOnClickOutside
    );
  }
}

// 切换群聊记忆互通选项（支持角色ID和群聊ID）
window.toggleGroupMemoryLinkOption = function (linkId, element) {
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  group.settings = group.settings || {};
  if (!group.settings.memoryLinks) group.settings.memoryLinks = [];

  const checkbox = element.querySelector('input[type="checkbox"]');
  const index = group.settings.memoryLinks.indexOf(linkId);

  if (index > -1) {
    group.settings.memoryLinks.splice(index, 1);
    element.classList.remove("selected");
    checkbox.checked = false;
  } else {
    group.settings.memoryLinks.push(linkId);
    element.classList.add("selected");
    checkbox.checked = true;
  }

  // 兼容旧版（仅对数字ID）
  const numericLinks = group.settings.memoryLinks.filter(
    (id) => typeof id === "number"
  );
  group.settings.memoryLink =
    numericLinks.length > 0 ? numericLinks[0].toString() : "";

  updateGroupMemoryLinkDisplay();
  localforage.setItem("groupChats", groupChats);
};

// 移除群聊记忆互通标签（支持角色ID和群聊ID）
window.removeGroupMemoryLinkTag = function (linkId) {
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group || !group.settings || !group.settings.memoryLinks) return;

  const index = group.settings.memoryLinks.indexOf(linkId);
  if (index > -1) {
    group.settings.memoryLinks.splice(index, 1);
  }

  // 更新下拉列表中的选中状态
  const options = document.querySelectorAll(
    "#groupMemoryLinkOptions .memory-link-option"
  );
  options.forEach((opt) => {
    const optId = opt.dataset.id;
    if (optId == linkId || parseInt(optId) === linkId) {
      opt.classList.remove("selected");
      const checkbox = opt.querySelector('input[type="checkbox"]');
      if (checkbox) checkbox.checked = false;
    }
  });

  // 兼容旧版
  const numericLinks = group.settings.memoryLinks.filter(
    (id) => typeof id === "number"
  );
  group.settings.memoryLink =
    numericLinks.length > 0 ? numericLinks[0].toString() : "";

  updateGroupMemoryLinkDisplay();
  localforage.setItem("groupChats", groupChats);
};

// 更新群聊记忆互通显示（支持角色和群聊）
function updateGroupMemoryLinkDisplay() {
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  const memoryLinks = group.settings?.memoryLinks || [];
  const textEl = document.getElementById("groupMemoryLinkText");
  const tagsEl = document.getElementById("groupMemoryLinkTags");

  if (!textEl || !tagsEl) return;

  if (memoryLinks.length === 0) {
    textEl.textContent = "点击选择要互通的聊天...";
    textEl.style.color = "#999";
    tagsEl.innerHTML = "";
  } else {
    textEl.textContent = `已选择 ${memoryLinks.length} 个聊天`;
    textEl.style.color = "#333";

    // 生成标签
    tagsEl.innerHTML = memoryLinks
      .map((linkId) => {
        if (typeof linkId === "string" && linkId.startsWith("group_")) {
          const gId = parseInt(linkId.replace("group_", ""));
          const g = groupChats.find((x) => x.id === gId);
          if (!g) return "";
          return `
          <span class="memory-link-tag">
            👥 ${g.name || "群聊"}
            <span class="memory-link-tag-remove" onclick="removeGroupMemoryLinkTag('${linkId}')">×</span>
          </span>
        `;
        } else {
          const char = characters.find((c) => c.id === linkId);
          if (!char) return "";
          const displayName = char.note || char.name;
          return `
          <span class="memory-link-tag">
            ${displayName}
            <span class="memory-link-tag-remove" onclick="removeGroupMemoryLinkTag(${linkId})">×</span>
          </span>
        `;
        }
      })
      .join("");
  }
}

// 更新群聊记忆互通设置（兼容旧版）
window.updateGroupMemoryLinks = function () {
  // 新版使用下拉框，这个函数保留兼容
};

// 更新群聊记忆互通设置
window.updateGroupMemoryLink = function () {
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;
  group.settings = group.settings || {};
  group.settings.memoryLink =
    document.getElementById("groupSettingsMemoryLink")?.value || "";
  localforage.setItem("groupChats", groupChats);
};

window.updateGroupMemoryLinkCount = function () {
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;
  group.settings = group.settings || {};
  group.settings.memoryLinkCount =
    parseInt(document.getElementById("groupSettingsMemoryLinkCount").value) ||
    5;
  localforage.setItem("groupChats", groupChats);
};

window.updateGroupContextCount = function () {
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;
  group.settings = group.settings || {};
  group.settings.contextCount =
    parseInt(document.getElementById("groupSettingsContextCount").value) || 20;
  localforage.setItem("groupChats", groupChats);
};

// 保存群聊设置
function saveGroupSettings() {
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  group.name = document.getElementById("groupSettingsName").value || group.name;
  group.settings = group.settings || {};
  group.settings.myNickname =
    document.getElementById("groupSettingsMyNickname").value || "我";
  group.settings.myPersona =
    document.getElementById("groupSettingsMyPersona").value || "";
  group.settings.timeAware = document.getElementById(
    "groupSettingsTimeAware"
  ).checked;

  // 保存世界书设置
  const worldbookInput = document.getElementById("groupSettingsWorldbook");
  if (worldbookInput) {
    group.settings.worldbook = worldbookInput.value || "";
  }

  // 记忆互通设置
  const memoryLinkInput = document.getElementById("groupSettingsMemoryLink");
  const memoryLinkCountInput = document.getElementById(
    "groupSettingsMemoryLinkCount"
  );
  const contextCountInput = document.getElementById(
    "groupSettingsContextCount"
  );
  if (memoryLinkInput) group.settings.memoryLink = memoryLinkInput.value || "";
  if (memoryLinkCountInput)
    group.settings.memoryLinkCount = parseInt(memoryLinkCountInput.value) || 5;
  if (contextCountInput)
    group.settings.contextCount = parseInt(contextCountInput.value) || 20;

  localforage.setItem("groupChats", groupChats);
  showToast("群聊设置已保存");
}

// 预览群设置中的群头像
window.previewGroupSettingsAvatar = function (input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById("groupAvatarPreview");
      preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;display:block;">`;

      const group = groupChats.find((g) => g.id === currentGroupId);
      if (group) {
        group.avatar = e.target.result;
        localforage.setItem("groupChats", groupChats);
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
};

// 预览群设置中我的头像
window.previewGroupSettingsMyAvatar = function (input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById("groupMyAvatarPreview");
      preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;display:block;">`;

      const group = groupChats.find((g) => g.id === currentGroupId);
      if (group) {
        group.settings = group.settings || {};
        group.settings.myAvatar = e.target.result;
        localforage.setItem("groupChats", groupChats);
        updateGroupChatPreview();
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
};

// 预览群聊背景
window.previewGroupSettingsBackground = function (input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById("groupBgPreview");
      preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:12px;">`;

      const group = groupChats.find((g) => g.id === currentGroupId);
      if (group) {
        group.settings = group.settings || {};
        group.settings.background = e.target.result;
        localforage.setItem("groupChats", groupChats);
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
};

// 清除群聊背景
window.clearGroupSettingsBackground = function () {
  const preview = document.getElementById("groupBgPreview");
  preview.innerHTML = '<span style="font-size:12px;color:#ccc;">无背景</span>';

  const group = groupChats.find((g) => g.id === currentGroupId);
  if (group && group.settings) {
    group.settings.background = "";
    localforage.setItem("groupChats", groupChats);
  }
};

// 群聊视频通话背景 - 对方画面
window.previewGroupVideoPartner = function (input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById("groupVideoPartnerPreview");
      preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:12px;">`;

      const group = groupChats.find((g) => g.id === currentGroupId);
      if (group) {
        group.settings = group.settings || {};
        group.settings.videoCallPartnerImage = e.target.result;
        localforage.setItem("groupChats", groupChats);
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
};

window.clearGroupVideoPartner = function () {
  const preview = document.getElementById("groupVideoPartnerPreview");
  preview.innerHTML = '<span style="font-size:12px;color:#ccc;">无背景</span>';

  const group = groupChats.find((g) => g.id === currentGroupId);
  if (group && group.settings) {
    group.settings.videoCallPartnerImage = "";
    localforage.setItem("groupChats", groupChats);
  }
};

// 群聊视频通话背景 - 我的画面
window.previewGroupVideoSelf = function (input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById("groupVideoSelfPreview");
      preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:12px;">`;

      const group = groupChats.find((g) => g.id === currentGroupId);
      if (group) {
        group.settings = group.settings || {};
        group.settings.videoCallSelfImage = e.target.result;
        localforage.setItem("groupChats", groupChats);
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
};

window.clearGroupVideoSelf = function () {
  const preview = document.getElementById("groupVideoSelfPreview");
  preview.innerHTML = '<span style="font-size:12px;color:#ccc;">无背景</span>';

  const group = groupChats.find((g) => g.id === currentGroupId);
  if (group && group.settings) {
    group.settings.videoCallSelfImage = "";
    localforage.setItem("groupChats", groupChats);
  }
};

// ==================== 群聊样式设置函数 ====================

// 更新群聊样式（实时预览和保存）
window.updateGroupChatStyle = function () {
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  group.settings = group.settings || {};

  // 读取当前设置值
  const userBubbleColor =
    document.getElementById("groupUserBubbleColor")?.value || "#f48fb1";
  const userBubbleOpacity =
    parseInt(document.getElementById("groupUserBubbleOpacity")?.value) || 85;
  const aiBubbleColor =
    document.getElementById("groupAiBubbleColor")?.value || "#ffffff";
  const aiBubbleOpacity =
    parseInt(document.getElementById("groupAiBubbleOpacity")?.value) || 85;
  const userFontColor =
    document.getElementById("groupUserFontColor")?.value || "#ffffff";
  const aiFontColor =
    document.getElementById("groupAiFontColor")?.value || "#37474f";
  const bubbleSpacing =
    parseInt(document.getElementById("groupBubbleSpacing")?.value) || 12;
  const avatarSize =
    parseInt(document.getElementById("groupAvatarSize")?.value) || 32;

  // 保存设置
  group.settings.userBubbleColor = userBubbleColor;
  group.settings.userBubbleOpacity = userBubbleOpacity;
  group.settings.aiBubbleColor = aiBubbleColor;
  group.settings.aiBubbleOpacity = aiBubbleOpacity;
  group.settings.userFontColor = userFontColor;
  group.settings.aiFontColor = aiFontColor;
  group.settings.bubbleSpacing = bubbleSpacing;
  group.settings.avatarSize = avatarSize;

  localforage.setItem("groupChats", groupChats);

  // 更新预览
  updateGroupChatPreviewStyle();

  // 应用到聊天界面
  applyGroupChatStyle();
};

// 更新设置页面中的预览样式
function updateGroupChatPreviewStyle() {
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group || !group.settings) return;

  const previewBox = document.getElementById("groupChatPreviewBox");
  if (!previewBox) return;

  const userBubbles = previewBox.querySelectorAll(
    ".chat-preview-msg.user .chat-preview-bubble"
  );
  const aiBubbles = previewBox.querySelectorAll(
    ".chat-preview-msg:not(.user) .chat-preview-bubble"
  );

  const userBubbleColor = group.settings.userBubbleColor || "#f48fb1";
  const userBubbleOpacity = (group.settings.userBubbleOpacity || 85) / 100;
  const aiBubbleColor = group.settings.aiBubbleColor || "#ffffff";
  const aiBubbleOpacity = (group.settings.aiBubbleOpacity || 85) / 100;

  userBubbles.forEach((bubble) => {
    bubble.style.background = hexToRgba(userBubbleColor, userBubbleOpacity);
    bubble.style.color = group.settings.userFontColor || "#ffffff";
  });

  aiBubbles.forEach((bubble) => {
    bubble.style.background = hexToRgba(aiBubbleColor, aiBubbleOpacity);
    bubble.style.color = group.settings.aiFontColor || "#37474f";
  });
}

// 应用群聊样式到聊天界面
function applyGroupChatStyle() {
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group || !group.settings) return;

  // 移除旧样式
  const existingStyle = document.getElementById("groupChatStyle");
  if (existingStyle) existingStyle.remove();

  const userBubbleColor = group.settings.userBubbleColor || "#f48fb1";
  const userBubbleOpacity = (group.settings.userBubbleOpacity || 85) / 100;
  const aiBubbleColor = group.settings.aiBubbleColor || "#ffffff";
  const aiBubbleOpacity = (group.settings.aiBubbleOpacity || 85) / 100;
  const userFontColor = group.settings.userFontColor || "#ffffff";
  const aiFontColor = group.settings.aiFontColor || "#37474f";
  const bubbleSpacing = group.settings.bubbleSpacing || 12;
  const avatarSize = group.settings.avatarSize || 32;

  const styleSheet = document.createElement("style");
  styleSheet.id = "groupChatStyle";
  styleSheet.textContent = `
    /* 群聊用户气泡（排除表情包） */
    .msg-row.user .msg-bubble:not(.sticker-bubble) {
      background: ${hexToRgba(userBubbleColor, userBubbleOpacity)} !important;
      color: ${userFontColor} !important;
    }
    /* 群聊AI气泡（排除表情包） */
    .msg-row.ai.group-msg .msg-bubble:not(.sticker-bubble) {
      background: ${hexToRgba(aiBubbleColor, aiBubbleOpacity)} !important;
      color: ${aiFontColor} !important;
    }
    /* 气泡间距 */
    .msg-row {
      margin-bottom: ${bubbleSpacing}px !important;
    }
    /* 群成员头像大小 */
    .msg-row.ai.group-msg .msg-sender-avatar {
      width: ${avatarSize}px !important;
      height: ${avatarSize}px !important;
    }
    .msg-row.ai.group-msg {
      padding-left: ${avatarSize + 8}px !important;
    }
  `;
  document.head.appendChild(styleSheet);
}

// 重置群聊样式
window.resetGroupChatStyle = function () {
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  group.settings = group.settings || {};
  group.settings.userBubbleColor = "#f48fb1";
  group.settings.userBubbleOpacity = 85;
  group.settings.aiBubbleColor = "#ffffff";
  group.settings.aiBubbleOpacity = 85;
  group.settings.userFontColor = "#ffffff";
  group.settings.aiFontColor = "#37474f";
  group.settings.bubbleSpacing = 12;
  group.settings.avatarSize = 32;

  // 更新界面控件
  const userBubbleColor = document.getElementById("groupUserBubbleColor");
  const userBubbleOpacity = document.getElementById("groupUserBubbleOpacity");
  const aiBubbleColor = document.getElementById("groupAiBubbleColor");
  const aiBubbleOpacity = document.getElementById("groupAiBubbleOpacity");
  const userFontColor = document.getElementById("groupUserFontColor");
  const aiFontColor = document.getElementById("groupAiFontColor");
  const bubbleSpacing = document.getElementById("groupBubbleSpacing");
  const avatarSize = document.getElementById("groupAvatarSize");

  if (userBubbleColor) userBubbleColor.value = "#f48fb1";
  if (userBubbleOpacity) userBubbleOpacity.value = 85;
  if (aiBubbleColor) aiBubbleColor.value = "#ffffff";
  if (aiBubbleOpacity) aiBubbleOpacity.value = 85;
  if (userFontColor) userFontColor.value = "#ffffff";
  if (aiFontColor) aiFontColor.value = "#37474f";
  if (bubbleSpacing) bubbleSpacing.value = 12;
  if (avatarSize) avatarSize.value = 32;

  // 更新标签
  const userOpacityLabel = document.getElementById("groupUserOpacityLabel");
  const aiOpacityLabel = document.getElementById("groupAiOpacityLabel");
  const spacingLabel = document.getElementById("groupSpacingLabel");
  const avatarSizeLabel = document.getElementById("groupAvatarSizeLabel");

  if (userOpacityLabel) userOpacityLabel.textContent = "85%";
  if (aiOpacityLabel) aiOpacityLabel.textContent = "85%";
  if (spacingLabel) spacingLabel.textContent = "12px";
  if (avatarSizeLabel) avatarSizeLabel.textContent = "32px";

  localforage.setItem("groupChats", groupChats);
  updateGroupChatPreviewStyle();
  applyGroupChatStyle();

  showToast("样式已重置 ★");
};

// 辅助函数：十六进制颜色转RGBA
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ==================== 群聊人设预设函数 ====================

// 初始化群聊人设预设下拉菜单（与单人聊天共享预设）
function initGroupPersonaPresets() {
  const select = document.getElementById("groupPersonaPresetSelect");
  if (!select) return;

  // 保留第一个默认选项，清除其他的
  while (select.options.length > 1) {
    select.remove(1);
  }

  // 使用与单人聊天相同的预设列表
  if (userPersonaPresets && userPersonaPresets.length > 0) {
    userPersonaPresets.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.name;
      select.appendChild(option);
    });
  }
}

// 加载群聊人设预设
window.loadGroupPersonaPreset = function (presetId) {
  if (!presetId) return;

  const preset = userPersonaPresets.find((p) => p.id === presetId);
  if (!preset) return;

  // 填入人设文本
  const personaInput = document.getElementById("groupSettingsMyPersona");
  if (personaInput) {
    personaInput.value = preset.persona;
  }

  // 如果预设里有头像，也一起加载
  if (preset.avatar && preset.avatar.startsWith("data:")) {
    const group = groupChats.find((g) => g.id === currentGroupId);
    if (group) {
      group.settings = group.settings || {};
      group.settings.myAvatar = preset.avatar;

      const preview = document.getElementById("groupMyAvatarPreview");
      if (preview) {
        preview.innerHTML = `<img src="${preset.avatar}" style="width:100%;height:100%;object-fit:cover;display:block;">`;
      }

      localforage.setItem("groupChats", groupChats);
      updateGroupChatPreview();
    }
  }

  showToast(`已切换至：${preset.name}`);
};

// 保存当前群聊配置为新预设（与单人聊天预设共享）
window.saveGroupPersonaPreset = function () {
  const personaInput = document.getElementById("groupSettingsMyPersona");
  const currentPersona = personaInput?.value?.trim() || "";

  if (!currentPersona) {
    alert("请先填写人设内容再保存预设！");
    return;
  }

  const name = prompt("请为当前人设取个名字（例如：高冷霸总、撒娇小猫）：");
  if (!name) return;

  const group = groupChats.find((g) => g.id === currentGroupId);
  const currentAvatar = group?.settings?.myAvatar || "";

  const newPreset = {
    id: Date.now().toString(),
    name: name,
    persona: currentPersona,
    avatar: currentAvatar,
  };

  userPersonaPresets.push(newPreset);
  localforage.setItem("userPersonaPresets", userPersonaPresets);

  showToast("预设已保存 ★");
  initGroupPersonaPresets(); // 刷新下拉框
};

// 更新群聊预览
function updateGroupChatPreview() {
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  const members = group.members
    .map((id) => characters.find((c) => c.id === id))
    .filter(Boolean);
  const firstMember = members[0];

  const previewBox = document.getElementById("groupChatPreviewBox");
  if (previewBox) {
    previewBox.innerHTML = `
      <div class="chat-preview-group-name">${group.name}</div>
      <div class="chat-preview-msg">
        <div class="chat-preview-avatar">
          ${
            firstMember?.avatar
              ? `<img src="${firstMember.avatar}" alt="">`
              : firstMember?.name?.charAt(0) || "?"
          }
        </div>
        <div class="chat-preview-content">
          <div class="chat-preview-name">${firstMember?.name || "成员"}</div>
          <div class="chat-preview-bubble">对方消息预览</div>
          <div class="chat-preview-time">10:00</div>
        </div>
      </div>
      <div class="chat-preview-msg user">
        <div class="chat-preview-avatar">
          ${
            group.settings?.myAvatar
              ? `<img src="${group.settings.myAvatar}" alt="">`
              : "👤"
          }
        </div>
        <div class="chat-preview-content">
          <div class="chat-preview-name"><span class="chat-preview-owner-badge">群主</span>${
            group.settings?.myNickname || "我"
          }</div>
          <div class="chat-preview-bubble">我的消息预览</div>
          <div class="chat-preview-time">10:00</div>
        </div>
      </div>
    `;
  }
}

// 打开群成员管理
window.openGroupMemberManager = function () {
  if (!currentGroupId) return;
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  // 不关闭设置页面，直接在上层显示管理弹窗
  renderManageMembersList(group);
  document.getElementById("groupMemberManagerModal").classList.add("active");
};

// 关闭群成员管理弹窗
window.closeGroupMemberManager = function () {
  document.getElementById("groupMemberManagerModal").classList.remove("active");
  // 刷新群聊设置页面中的成员显示
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (group) {
    renderGroupSettingsMembers();
  }
};

// 渲染群成员管理列表
function renderManageMembersList(group) {
  const container = document.getElementById("manageMembersList");
  const members = group.members
    .map((id) => characters.find((c) => c.id === id))
    .filter(Boolean);

  document.getElementById(
    "manageMembersCount"
  ).textContent = `共 ${members.length} 人`;

  if (members.length === 0) {
    container.innerHTML = `
      <div class="create-group-empty">
        <div class="create-group-empty-icon">😅</div>
        <div>群里还没有成员</div>
      </div>
    `;
    return;
  }

  container.innerHTML = members
    .map((char) => {
      const displayName = char.note || char.name;
      return `
      <div class="create-group-member-item" style="cursor: default;">
        <div class="create-group-member-avatar">
          ${char.avatar ? `<img src="${char.avatar}">` : char.name.charAt(0)}
        </div>
        <div class="create-group-member-info" style="flex: 1;">
          <div class="create-group-member-name">${displayName}</div>
        </div>
        <button class="group-member-remove-btn" onclick="event.stopPropagation();removeGroupMemberFromManager(${
          char.id
        })" 
          style="background: linear-gradient(135deg, #ff6b6b, #ee5a5a); color: white; border: none; 
            border-radius: 16px; padding: 6px 14px; font-size: 12px; cursor: pointer;
            box-shadow: 0 2px 8px rgba(255,107,107,0.3);">
          移出
        </button>
      </div>
    `;
    })
    .join("");
}

// 从管理界面移除群成员
async function removeGroupMemberFromManager(charId) {
  if (!currentGroupId) return;
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  // 至少保留2个AI成员（加上用户共3人）
  if (group.members.length <= 2) {
    showToast("群聊至少需要3个人哦");
    return;
  }

  const char = characters.find((c) => c.id === charId);
  const charName = char ? char.note || char.name : "成员";

  if (!confirm(`确定要将「${charName}」移出群聊吗？`)) return;

  group.members = group.members.filter((id) => id !== charId);
  await localforage.setItem("groupChats", groupChats);

  // 添加系统消息
  const messagesKey = `group_messages_${currentGroupId}`;
  const messages = (await localforage.getItem(messagesKey)) || [];
  messages.push({
    role: "system",
    content: `${charName} 离开了群聊`,
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
  await localforage.setItem(messagesKey, messages);

  showToast(`已移除 ${charName}`);
  renderManageMembersList(group);
  loadGroupMessages(currentGroupId);
}

// 导出群聊记录
window.exportGroupChat = function () {
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  const messagesKey = "group_messages_" + currentGroupId;
  localforage.getItem(messagesKey).then((messages) => {
    if (!messages || messages.length === 0) {
      showToast("没有聊天记录可导出");
      return;
    }

    const members = group.members
      .map((id) => characters.find((c) => c.id === id))
      .filter(Boolean);
    let text = `群聊: ${group.name}\n成员: ${members
      .map((m) => m.name)
      .join(", ")}\n导出时间: ${new Date().toLocaleString()}\n\n`;

    messages.forEach((msg) => {
      if (msg.role === "user") {
        text += `[${msg.time || ""}] ${group.settings?.myNickname || "我"}: ${
          msg.content
        }\n`;
      } else if (msg.role === "assistant") {
        const member = characters.find((c) => c.id === msg.charId);
        text += `[${msg.time || ""}] ${member?.name || "成员"}: ${
          msg.content
        }\n`;
      } else if (msg.role === "system") {
        text += `--- ${msg.content} ---\n`;
      }
    });

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `群聊_${group.name}_${new Date()
      .toISOString()
      .slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("导出成功");
  });
};

// 清空群聊记录
window.clearGroupChat = function () {
  if (!currentGroupId) {
    showToast("没有选中的群聊");
    return;
  }
  if (!confirm("确定要清空所有群聊记录吗？此操作不可恢复！")) return;

  const messagesKey = "group_messages_" + currentGroupId;
  localforage.setItem(messagesKey, []).then(() => {
    showToast("聊天记录已清空");
    const msgCountEl = document.getElementById("groupMsgCount");
    if (msgCountEl) msgCountEl.textContent = "0";

    // 刷新群聊消息显示
    loadGroupMessages(currentGroupId);

    // 更新群聊列表的最后消息
    const group = groupChats.find((g) => g.id === currentGroupId);
    if (group) {
      group.lastMessage = "";
      group.lastTime = "";
      localforage.setItem("groupChats", groupChats);
      renderCharacters();
    }
  });
};

// Load settings data into form
function loadSettingsToForm(settings, char) {
  // Basic info
  document.getElementById("settingsCharName").value =
    settings.charName || char.name || "";
  document.getElementById("settingsCharNote").value =
    settings.charNote || char.note || "";
  document.getElementById("settingsGroup").value = settings.group || "none";

  // Avatars
  loadAvatarPreview("other", settings.otherAvatar || char.avatar);
  loadAvatarPreview("my", settings.myAvatar);

  // 头像显示开关
  document.getElementById("showAiAvatar").checked =
    settings.showAiAvatar !== false;
  document.getElementById("showUserAvatar").checked =
    settings.showUserAvatar !== false;

  // 头像大小
  const avatarSize = char.avatarSize || 40;
  document.getElementById("avatarSizeSlider").value = avatarSize;
  document.getElementById("avatarSizeValue").textContent = avatarSize + "px";
  applyAvatarSize(avatarSize);

  // 气泡间距
  const bubbleGap = char.bubbleGap || 6;
  document.getElementById("bubbleGapSlider").value = bubbleGap;
  document.getElementById("bubbleGapValue").textContent = bubbleGap + "px";
  applyBubbleGap(bubbleGap);

  // 置顶设置
  document.getElementById("settingsPinned").checked = settings.pinned || false;

  // AI Brain
  document.getElementById("settingsPersona").value = settings.persona || "";
  document.getElementById("settingsMyPersona").value = settings.myPersona || "";

  // 世界书（支持多选）
  const worldbookIds = settings.worldbook
    ? settings.worldbook.split(",").filter((s) => s)
    : [];
  document.getElementById("settingsWorldbook").value = settings.worldbook || "";
  renderWorldbookSelectList(worldbookIds);

  // Memory
  document.getElementById("settingsMemoryCount").value =
    settings.memoryCount || 5;
  document.getElementById("settingsContextCount").value =
    settings.contextCount || 150;

  // Update message count
  const history = chatHistories[currentChatCharId] || [];
  document.getElementById("settingsTotalMsg").textContent = history.length;
  document.getElementById("settingsTokenCount").textContent =
    estimateTokens(history);

  // Play mode
  document.getElementById("settingsOnlineDating").checked =
    settings.onlineDating || false;
  document.getElementById("settingsLongMemory").checked =
    settings.longMemory !== false;
  document.getElementById("settingsTriggerCount").value =
    settings.triggerCount || 500;
  document.getElementById("settingsSummaryPrompt").value =
    settings.summaryPrompt || "";
  document.getElementById("settingsFlame").checked = settings.flame || false;
  document.getElementById("settingsTimeAware").checked =
    settings.timeAware !== false;

  // Summary mode radio
  const summaryMode = settings.summaryMode || "manual";
  document.getElementById("settingsSummaryMode").value = summaryMode;
  document.querySelectorAll(".radio-option").forEach((opt) => {
    opt.classList.toggle("active", opt.dataset.value === summaryMode);
  });

  // Visual
  loadBackgroundPreview(settings.background);
  document.getElementById("settingsFontSize").value = settings.fontSize || 14;
  document.getElementById("fontSizeValue").textContent =
    (settings.fontSize || 14) + "px";
  document.getElementById("settingsBubbleStyle").value =
    settings.bubbleStyle || "none";
  document.getElementById("settingsCustomCSS").value = settings.customCSS || "";

  // Update preview avatars
  updateChatPreview(settings, char);
  // ... 之前的代码 ...

  // 【新增】初始化火花设置 UI 和数据回显
  initFlameSettingsUI(); // 先注入 UI

  // 稍微延迟一点点赋值，确保 DOM 已经生成
  setTimeout(() => {
    if (document.getElementById("settingsFlameIcon")) {
      const fData = settings.flameData || { icon: "♨", days: 1 };
      document.getElementById("settingsFlameIcon").value = fData.icon || "♨";
      document.getElementById("settingsFlameDays").value = fData.days || 1;

      // 触发一次显示/隐藏逻辑
      const area = document.getElementById("flameSettingsArea");
      if (area)
        area.style.display = document.getElementById("settingsFlame").checked
          ? "block"
          : "none";
    }
  }, 0);
  // ✓ 加在这里 (loadSettingsToForm 函数内部的末尾)：
  document.getElementById("settingsVoiceId").value = settings.voiceId || "";

  // 通话设置加载
  const callVoiceCheckbox = document.getElementById("settingsCallVoiceEnabled");
  const aiCallCheckbox = document.getElementById("settingsAiCallEnabled");
  if (callVoiceCheckbox) {
    callVoiceCheckbox.checked = settings.callVoiceEnabled || false;
  }
  if (aiCallCheckbox) {
    aiCallCheckbox.checked = settings.aiCallEnabled || false;
  }

  // 视频通话画面加载
  const partnerImg = document.getElementById("videoCallPartnerImg");
  const partnerPlaceholder = document.getElementById(
    "videoCallPartnerPlaceholder"
  );
  const selfImg = document.getElementById("videoCallSelfImg");
  const selfPlaceholder = document.getElementById("videoCallSelfPlaceholder");

  if (settings.videoCallPartnerImage && partnerImg) {
    partnerImg.src = settings.videoCallPartnerImage;
    partnerImg.style.display = "block";
    if (partnerPlaceholder) partnerPlaceholder.style.display = "none";
  } else if (partnerImg) {
    partnerImg.style.display = "none";
    if (partnerPlaceholder) partnerPlaceholder.style.display = "flex";
  }

  if (settings.videoCallSelfImage && selfImg) {
    selfImg.src = settings.videoCallSelfImage;
    selfImg.style.display = "block";
    if (selfPlaceholder) selfPlaceholder.style.display = "none";
  } else if (selfImg) {
    selfImg.style.display = "none";
    if (selfPlaceholder) selfPlaceholder.style.display = "flex";
  }

  // 通话气泡颜色加载
  const callUserColorInput = document.getElementById(
    "settingsCallUserBubbleColor"
  );
  const callUserOpacityInput = document.getElementById(
    "settingsCallUserBubbleOpacity"
  );
  const callAiColorInput = document.getElementById("settingsCallAiBubbleColor");
  const callAiOpacityInput = document.getElementById(
    "settingsCallAiBubbleOpacity"
  );

  if (callUserColorInput) {
    callUserColorInput.value = settings.callUserBubbleColor || "#f48fb1";
  }
  if (callUserOpacityInput) {
    callUserOpacityInput.value = settings.callUserBubbleOpacity || 85;
    const label = document.getElementById("callUserOpacityLabel");
    if (label) label.textContent = (settings.callUserBubbleOpacity || 85) + "%";
  }
  if (callAiColorInput) {
    callAiColorInput.value = settings.callAiBubbleColor || "#ffffff";
  }
  if (callAiOpacityInput) {
    callAiOpacityInput.value = settings.callAiBubbleOpacity || 85;
    const label = document.getElementById("callAiOpacityLabel");
    if (label) label.textContent = (settings.callAiBubbleOpacity || 85) + "%";
  }

  // 聊天气泡背景样式加载
  const chatUserBgInput = document.getElementById("settingsChatUserBubbleBg");
  const chatUserOpacityInput = document.getElementById(
    "settingsChatUserBubbleOpacity"
  );
  const chatUserTextInput = document.getElementById(
    "settingsChatUserTextColor"
  );
  const chatAiBgInput = document.getElementById("settingsChatAiBubbleBg");
  const chatAiOpacityInput = document.getElementById(
    "settingsChatAiBubbleOpacity"
  );
  const chatAiTextInput = document.getElementById("settingsChatAiTextColor");

  if (chatUserBgInput) {
    chatUserBgInput.value = settings.chatUserBubbleBg || "#f8bbd9";
  }
  if (chatUserOpacityInput) {
    chatUserOpacityInput.value = settings.chatUserBubbleOpacity || 100;
    const label = document.getElementById("chatUserOpacityLabel");
    if (label)
      label.textContent = (settings.chatUserBubbleOpacity || 100) + "%";
  }
  if (chatUserTextInput) {
    chatUserTextInput.value = settings.chatUserTextColor || "#c2185b";
  }
  if (chatAiBgInput) {
    chatAiBgInput.value = settings.chatAiBubbleBg || "#ffffff";
  }
  if (chatAiOpacityInput) {
    chatAiOpacityInput.value = settings.chatAiBubbleOpacity || 100;
    const label = document.getElementById("chatAiOpacityLabel");
    if (label) label.textContent = (settings.chatAiBubbleOpacity || 100) + "%";
  }
  if (chatAiTextInput) {
    chatAiTextInput.value = settings.chatAiTextColor || "#333333";
  }

  // 线下模式设置初始化
  const offlineWordSettings = document.getElementById("offlineWordSettings");
  if (offlineWordSettings) {
    if (settings.onlineDating) {
      offlineWordSettings.classList.add("active");
    } else {
      offlineWordSettings.classList.remove("active");
    }
  }

  // 设置字数范围
  if (document.getElementById("offlineMinWords")) {
    document.getElementById("offlineMinWords").value =
      settings.offlineMinWords || 100;
  }
  if (document.getElementById("offlineMaxWords")) {
    document.getElementById("offlineMaxWords").value =
      settings.offlineMaxWords || 500;
  }

  // 更新并设置预设下拉框
  updateOfflinePresetDropdown();
  if (document.getElementById("offlinePresetSelect")) {
    document.getElementById("offlinePresetSelect").value =
      settings.offlinePresetId || "";
  }
}

// Load avatar preview
function loadAvatarPreview(type, src) {
  const placeholder = document.getElementById(type + "AvatarPlaceholder");
  const img = document.getElementById(type + "AvatarImg");
  const container = document.getElementById(
    "settings" + (type === "other" ? "Other" : "My") + "Avatar"
  );

  if (src) {
    img.src = src;
    img.style.display = "block";
    placeholder.style.display = "none";
    container.classList.add("has-image");
  } else {
    img.style.display = "none";
    placeholder.style.display = "block";
    container.classList.remove("has-image");
  }
}

// 修改后的设置页头像预览（带压缩）
async function previewSettingsAvatar(input, type) {
  const file = input.files[0];
  if (file) {
    // 头像压缩到 300px
    const compressedData = await compressImage(file, 300, 0.7);

    loadAvatarPreview(type, compressedData);
    // 更新预览显示
    if (type === "other") {
      document.getElementById(
        "previewOtherAvatar"
      ).innerHTML = `<img src="${compressedData}">`;
    } else {
      document.getElementById(
        "previewMyAvatar"
      ).innerHTML = `<img src="${compressedData}">`;
    }
  }
}

// Clear settings avatar
function clearSettingsAvatar(type) {
  loadAvatarPreview(type, "");
  if (type === "other") {
    document.getElementById("previewOtherAvatar").innerHTML = "🤖";
    document.getElementById("otherAvatarInput").value = "";
  } else {
    document.getElementById("previewMyAvatar").innerHTML = "我";
    document.getElementById("myAvatarInput").value = "";
  }
}

// Load background preview
function loadBackgroundPreview(src) {
  const placeholder = document.getElementById("bgPreviewPlaceholder");
  const img = document.getElementById("bgPreviewImg");

  if (src) {
    img.src = src;
    img.style.display = "block";
    placeholder.style.display = "none";
  } else {
    img.style.display = "none";
    placeholder.style.display = "block";
  }
}

// 修改后的背景图预览（带压缩）
async function previewBackground(input) {
  const file = input.files[0];
  if (file) {
    // 背景图宽一点，设为 800px，质量 0.6 足够了
    const compressedData = await compressImage(file, 800, 0.6);
    loadBackgroundPreview(compressedData);
  }
}

// Update font size preview
function updateFontSizePreview(value) {
  document.getElementById("fontSizeValue").textContent = value + "px";
  document.getElementById("previewOtherBubble").style.fontSize = value + "px";
  document.getElementById("previewMyBubble").style.fontSize = value + "px";
}

// Select radio option
function selectRadio(element, groupName) {
  const group = element.parentElement;
  group
    .querySelectorAll(".radio-option")
    .forEach((opt) => opt.classList.remove("active"));
  element.classList.add("active");
  document.getElementById(
    "settings" + groupName.charAt(0).toUpperCase() + groupName.slice(1)
  ).value = element.dataset.value;
}

// Update memory link dropdown
function updateMemoryLinkDropdown() {
  // 新版多选下拉框
  initMemoryLinkMultiSelect();
}

// 单聊记忆互通 - 当前选中的ID列表（角色ID或群聊ID如"group_1"）
window.selectedMemoryLinks = [];

// 初始化记忆互通多选下拉框
function initMemoryLinkMultiSelect() {
  const optionsContainer = document.getElementById("memoryLinkOptions");
  if (!optionsContainer) return;

  // 获取当前设置中已选中的
  const settings = chatSettings[currentChatCharId] || {};
  window.selectedMemoryLinks = settings.memoryLinks || [];
  // 兼容旧版单选
  if (window.selectedMemoryLinks.length === 0 && settings.memoryLink) {
    window.selectedMemoryLinks = [parseInt(settings.memoryLink)];
  }

  // 过滤掉当前角色的单聊
  const availableChars = characters.filter((c) => c.id !== currentChatCharId);

  // 获取群聊列表
  const availableGroups = groupChats || [];

  let optionsHtml = "";

  // 先显示单聊角色
  if (availableChars.length > 0) {
    optionsHtml += '<div class="memory-link-section-title">单聊</div>';
    optionsHtml += availableChars
      .map((char) => {
        const isSelected = window.selectedMemoryLinks.includes(char.id);
        const displayName = char.note || char.name;
        return `
        <div class="memory-link-option ${
          isSelected ? "selected" : ""
        }" onclick="toggleMemoryLinkOption(${
          char.id
        }, this)" data-type="char" data-id="${char.id}">
          <input type="checkbox" ${
            isSelected ? "checked" : ""
          } onclick="event.stopPropagation()">
          <div class="memory-link-option-avatar">
            ${
              char.avatar ? `<img src="${char.avatar}">` : displayName.charAt(0)
            }
          </div>
          <span class="memory-link-option-name">${displayName}</span>
        </div>
      `;
      })
      .join("");
  }

  // 再显示群聊
  if (availableGroups.length > 0) {
    optionsHtml += '<div class="memory-link-section-title">群聊</div>';
    optionsHtml += availableGroups
      .map((group) => {
        const groupLinkId = "group_" + group.id;
        const isSelected = window.selectedMemoryLinks.includes(groupLinkId);
        return `
        <div class="memory-link-option ${
          isSelected ? "selected" : ""
        }" onclick="toggleMemoryLinkOption('${groupLinkId}', this)" data-type="group" data-id="${groupLinkId}">
          <input type="checkbox" ${
            isSelected ? "checked" : ""
          } onclick="event.stopPropagation()">
          <div class="memory-link-option-avatar">
            ${group.avatar ? `<img src="${group.avatar}">` : "👥"}
          </div>
          <span class="memory-link-option-name">${group.name || "群聊"}</span>
        </div>
      `;
      })
      .join("");
  }

  if (!optionsHtml) {
    optionsContainer.innerHTML =
      '<div class="memory-link-empty">暂无可互通的聊天</div>';
  } else {
    optionsContainer.innerHTML = optionsHtml;
  }

  updateMemoryLinkDisplay();
}

// 切换下拉框展开/收起
function toggleMemoryLinkDropdown() {
  const dropdown = document.getElementById("memoryLinkDropdown");
  dropdown.classList.toggle("open");

  // 点击外部关闭
  if (dropdown.classList.contains("open")) {
    setTimeout(() => {
      document.addEventListener("click", closeMemoryLinkDropdownOnClickOutside);
    }, 0);
  }
}

// 点击外部关闭下拉框
function closeMemoryLinkDropdownOnClickOutside(e) {
  const dropdown = document.getElementById("memoryLinkDropdown");
  if (dropdown && !dropdown.contains(e.target)) {
    dropdown.classList.remove("open");
    document.removeEventListener(
      "click",
      closeMemoryLinkDropdownOnClickOutside
    );
  }
}

// 切换选项（支持角色ID和群聊ID）
function toggleMemoryLinkOption(linkId, element) {
  const checkbox = element.querySelector('input[type="checkbox"]');
  const index = window.selectedMemoryLinks.indexOf(linkId);

  if (index > -1) {
    window.selectedMemoryLinks.splice(index, 1);
    element.classList.remove("selected");
    checkbox.checked = false;
  } else {
    window.selectedMemoryLinks.push(linkId);
    element.classList.add("selected");
    checkbox.checked = true;
  }

  updateMemoryLinkDisplay();
  saveMemoryLinksToSettings();
}

// 移除已选标签（支持角色ID和群聊ID）
function removeMemoryLinkTag(linkId) {
  const index = window.selectedMemoryLinks.indexOf(linkId);
  if (index > -1) {
    window.selectedMemoryLinks.splice(index, 1);
  }

  // 更新下拉列表中的选中状态
  const options = document.querySelectorAll(
    "#memoryLinkOptions .memory-link-option"
  );
  options.forEach((opt) => {
    const optId = opt.dataset.id;
    // 比较时统一转换
    if (optId == linkId || parseInt(optId) === linkId) {
      opt.classList.remove("selected");
      const checkbox = opt.querySelector('input[type="checkbox"]');
      if (checkbox) checkbox.checked = false;
    }
  });

  updateMemoryLinkDisplay();
  saveMemoryLinksToSettings();
}

// 更新显示（支持角色和群聊）
function updateMemoryLinkDisplay() {
  const textEl = document.getElementById("memoryLinkText");
  const tagsEl = document.getElementById("memoryLinkTags");

  if (window.selectedMemoryLinks.length === 0) {
    textEl.textContent = "点击选择要互通的聊天...";
    textEl.style.color = "#999";
    tagsEl.innerHTML = "";
  } else {
    textEl.textContent = `已选择 ${window.selectedMemoryLinks.length} 个聊天`;
    textEl.style.color = "#333";

    // 生成标签
    tagsEl.innerHTML = window.selectedMemoryLinks
      .map((linkId) => {
        // 判断是群聊还是单聊
        if (typeof linkId === "string" && linkId.startsWith("group_")) {
          const groupId = parseInt(linkId.replace("group_", ""));
          const group = groupChats.find((g) => g.id === groupId);
          if (!group) return "";
          return `
          <span class="memory-link-tag">
            👥 ${group.name || "群聊"}
            <span class="memory-link-tag-remove" onclick="removeMemoryLinkTag('${linkId}')">×</span>
          </span>
        `;
        } else {
          const char = characters.find((c) => c.id === linkId);
          if (!char) return "";
          const displayName = char.note || char.name;
          return `
          <span class="memory-link-tag">
            ${displayName}
            <span class="memory-link-tag-remove" onclick="removeMemoryLinkTag(${linkId})">×</span>
          </span>
        `;
        }
      })
      .join("");
  }
}

// 保存到设置
function saveMemoryLinksToSettings() {
  if (!currentChatCharId) return;

  if (!chatSettings[currentChatCharId]) {
    chatSettings[currentChatCharId] = {};
  }

  chatSettings[currentChatCharId].memoryLinks = [...window.selectedMemoryLinks];
  // 兼容旧版
  chatSettings[currentChatCharId].memoryLink =
    window.selectedMemoryLinks.length > 0
      ? window.selectedMemoryLinks[0].toString()
      : "";

  localforage.setItem("chatSettings", chatSettings);
}

// Estimate tokens
function estimateTokens(history) {
  if (!history || history.length === 0) return 0;
  const text = history.map((m) => m.content).join("");
  // Rough estimate: ~1.5 tokens per Chinese character, ~0.75 per English word
  return Math.round(text.length * 1.2);
}

// Update chat preview
function updateChatPreview(settings, char) {
  const otherAvatar = settings.otherAvatar || char.avatar;
  const myAvatar = settings.myAvatar;

  document.getElementById("previewOtherAvatar").innerHTML = otherAvatar
    ? `<img src="${otherAvatar}">`
    : "AI";
  document.getElementById("previewMyAvatar").innerHTML = myAvatar
    ? `<img src="${myAvatar}">`
    : "我";
}

// 切换头像显示
function toggleAvatarDisplay() {
  const showAi = document.getElementById("showAiAvatar").checked;
  const showUser = document.getElementById("showUserAvatar").checked;

  // 应用到当前聊天界面
  applyAvatarVisibility(showAi, showUser);

  // 即时保存设置
  if (currentChatCharId && chatSettings[currentChatCharId]) {
    chatSettings[currentChatCharId].showAiAvatar = showAi;
    chatSettings[currentChatCharId].showUserAvatar = showUser;
    localforage.setItem("chatSettings", chatSettings);
  }
}

// 更新头像大小预览
function updateAvatarSizePreview(size) {
  document.getElementById("avatarSizeValue").textContent = size + "px";
  applyAvatarSize(size);
}

// 保存头像大小设置
async function saveAvatarSize(size) {
  if (!currentChatCharId) return;

  const char = window.characters.find((c) => c.id === currentChatCharId);
  if (char) {
    char.avatarSize = parseInt(size);
    await localforage.setItem("characters", window.characters);
  }
}

// 应用头像大小
function applyAvatarSize(size) {
  const style =
    document.getElementById("avatarSizeStyle") ||
    document.createElement("style");
  style.id = "avatarSizeStyle";

  const sizeNum = parseInt(size);
  style.textContent = `
    .chat-avatar-small {
      width: ${sizeNum}px !important;
      height: ${sizeNum}px !important;
      min-width: ${sizeNum}px !important;
      min-height: ${sizeNum}px !important;
    }
  `;

  if (!document.getElementById("avatarSizeStyle")) {
    document.head.appendChild(style);
  }
}

// 更新气泡间距预览
function updateBubbleGapPreview(gap) {
  document.getElementById("bubbleGapValue").textContent = gap + "px";
  applyBubbleGap(gap);
}

// 保存气泡间距设置
async function saveBubbleGap(gap) {
  if (!currentChatCharId) return;

  const char = window.characters.find((c) => c.id === currentChatCharId);
  if (char) {
    char.bubbleGap = parseInt(gap);
    await localforage.setItem("characters", window.characters);
  }
}

// 应用气泡间距
function applyBubbleGap(gap) {
  const style =
    document.getElementById("bubbleGapStyle") ||
    document.createElement("style");
  style.id = "bubbleGapStyle";

  const gapNum = parseInt(gap);
  style.textContent = `
    .msg-wrapper {
      margin-bottom: ${gapNum}px !important;
    }
    .msg-row {
      gap: ${gapNum}px !important;
    }
  `;

  if (!document.getElementById("bubbleGapStyle")) {
    document.head.appendChild(style);
  }
}

// 应用头像可见性
function applyAvatarVisibility(showAi, showUser) {
  const style =
    document.getElementById("avatarVisibilityStyle") ||
    document.createElement("style");
  style.id = "avatarVisibilityStyle";

  let css = "";
  if (!showAi) {
    css += ".msg-wrapper.ai .chat-avatar-small { display: none !important; }";
  }
  if (!showUser) {
    css += ".msg-wrapper.user .chat-avatar-small { display: none !important; }";
  }

  style.textContent = css;
  if (!document.getElementById("avatarVisibilityStyle")) {
    document.head.appendChild(style);
  }
}

// Close chat settings
function closeChatSettings() {
  document.getElementById("chatSettingsPage").classList.remove("active");
  // 隐藏群成员设置区域（如果存在）
  const membersSection = document.getElementById("groupMembersSection");
  if (membersSection) {
    membersSection.style.display = "none";
  }
}

// 保存并关闭聊天设置
function saveChatSettingsAndClose() {
  saveChatSettings();
  showToast("设置已保存");
  closeChatSettings();
}

function saveChatSettings() {
  if (!currentChatCharId) return;

  // 1. 获取基础数据
  const charName = document.getElementById("settingsCharName").value.trim();
  const charNote = document.getElementById("settingsCharNote").value.trim();
  const otherAvatarSrc = document.getElementById("otherAvatarImg").src;
  const myAvatarSrc = document.getElementById("myAvatarImg").src;
  const bgSrc = document.getElementById("bgPreviewImg").src;

  const safeOtherAvatar =
    otherAvatarSrc && otherAvatarSrc.startsWith("data:") ? otherAvatarSrc : "";
  const safeMyAvatar =
    myAvatarSrc && myAvatarSrc.startsWith("data:") ? myAvatarSrc : "";
  const safeBg = bgSrc && bgSrc.startsWith("data:") ? bgSrc : "";

  // 2. 获取火花数据 (新增部分)
  const isFlameActive = document.getElementById("settingsFlame").checked;
  const flameIcon = document.getElementById("settingsFlameIcon")
    ? document.getElementById("settingsFlameIcon").value
    : "♨";
  const flameDays = document.getElementById("settingsFlameDays")
    ? parseInt(document.getElementById("settingsFlameDays").value)
    : 1;

  // 3. 构建设置对象
  const settings = {
    charName: charName,
    charNote: charNote,
    group: document.getElementById("settingsGroup").value,
    pinned: document.getElementById("settingsPinned").checked,
    otherAvatar: safeOtherAvatar,
    myAvatar: safeMyAvatar,
    showAiAvatar: document.getElementById("showAiAvatar").checked,
    showUserAvatar: document.getElementById("showUserAvatar").checked,
    persona: document.getElementById("settingsPersona").value.trim(),
    myPersona: document.getElementById("settingsMyPersona").value.trim(),
    worldbook: document.getElementById("settingsWorldbook").value,
    // 记忆互通 - 新版多选
    memoryLinks: window.selectedMemoryLinks || [],
    memoryLink:
      window.selectedMemoryLinks && window.selectedMemoryLinks.length > 0
        ? window.selectedMemoryLinks[0].toString()
        : "",
    memoryCount:
      parseInt(document.getElementById("settingsMemoryCount").value) || 5,
    contextCount:
      parseInt(document.getElementById("settingsContextCount").value) || 150,
    onlineDating: document.getElementById("settingsOnlineDating").checked,
    longMemory: document.getElementById("settingsLongMemory").checked,
    summaryMode: document.getElementById("settingsSummaryMode").value,
    triggerCount:
      parseInt(document.getElementById("settingsTriggerCount").value) || 500,
    summaryPrompt: document
      .getElementById("settingsSummaryPrompt")
      .value.trim(),
    // 在 saveChatSettings 构建 settings 对象时添加：
    voiceId: document.getElementById("settingsVoiceId").value.trim(),

    // 通话设置
    callVoiceEnabled:
      document.getElementById("settingsCallVoiceEnabled")?.checked || false,
    aiCallEnabled:
      document.getElementById("settingsAiCallEnabled")?.checked || false,

    // 通话气泡颜色设置
    callUserBubbleColor:
      document.getElementById("settingsCallUserBubbleColor")?.value ||
      "#f48fb1",
    callUserBubbleOpacity:
      parseInt(
        document.getElementById("settingsCallUserBubbleOpacity")?.value
      ) || 85,
    callAiBubbleColor:
      document.getElementById("settingsCallAiBubbleColor")?.value || "#ffffff",
    callAiBubbleOpacity:
      parseInt(document.getElementById("settingsCallAiBubbleOpacity")?.value) ||
      85,

    // 聊天气泡背景设置
    chatUserBubbleBg:
      document.getElementById("settingsChatUserBubbleBg")?.value || "#f8bbd9",
    chatUserBubbleOpacity:
      parseInt(
        document.getElementById("settingsChatUserBubbleOpacity")?.value
      ) || 100,
    chatUserTextColor:
      document.getElementById("settingsChatUserTextColor")?.value || "#c2185b",
    chatAiBubbleBg:
      document.getElementById("settingsChatAiBubbleBg")?.value || "#ffffff",
    chatAiBubbleOpacity:
      parseInt(document.getElementById("settingsChatAiBubbleOpacity")?.value) ||
      100,
    chatAiTextColor:
      document.getElementById("settingsChatAiTextColor")?.value || "#333333",

    // 线下模式设置
    offlineMinWords:
      parseInt(document.getElementById("offlineMinWords")?.value) || 100,
    offlineMaxWords:
      parseInt(document.getElementById("offlineMaxWords")?.value) || 500,
    offlinePresetId:
      document.getElementById("offlinePresetSelect")?.value || "",

    // 火花字段更新
    flame: isFlameActive,
    flameData: {
      active: isFlameActive,
      icon: flameIcon || "♨",
      days: flameDays || 1,
    },

    timeAware: document.getElementById("settingsTimeAware").checked,
    background: safeBg,
    fontSize: parseInt(document.getElementById("settingsFontSize").value) || 14,
    bubbleStyle: document.getElementById("settingsBubbleStyle").value,
    customCSS: document.getElementById("settingsCustomCSS").value.trim(),

    // 保持记忆总结不被覆盖
    summaries: chatSettings[currentChatCharId]?.summaries || [],
    summarizedCount: chatSettings[currentChatCharId]?.summarizedCount || 0,

    // 保持视频通话图片不被覆盖
    videoCallPartnerImage:
      chatSettings[currentChatCharId]?.videoCallPartnerImage || null,
    videoCallSelfImage:
      chatSettings[currentChatCharId]?.videoCallSelfImage || null,
  };

  // 4. 保存
  chatSettings[currentChatCharId] = settings;
  localforage.setItem("chatSettings", chatSettings);

  // 5. 更新全局角色列表数据
  const charIndex = characters.findIndex((c) => c.id === currentChatCharId);
  if (charIndex !== -1) {
    if (settings.charName) characters[charIndex].name = settings.charName;
    characters[charIndex].note = settings.charNote;
    if (settings.otherAvatar)
      characters[charIndex].avatar = settings.otherAvatar;

    // 同步火花数据到列表，这样列表页也能显示
    characters[charIndex].flameData = settings.flameData;

    localforage.setItem("characters", characters);
  }

  // 6. 实时更新界面 (UI Update)

  // 生成火花 HTML
  let sparkHtml = "";
  if (settings.flameData && settings.flameData.active) {
    sparkHtml = `<span class="spark-badge">${settings.flameData.icon} ${settings.flameData.days}</span>`;
  }

  // 更新标题 (名字 + 火花)
  const displayTitle =
    settings.charNote ||
    settings.charName ||
    (charIndex !== -1 ? characters[charIndex].name : "角色");
  document.getElementById("convName").innerHTML = displayTitle + sparkHtml;

  if (settings.otherAvatar) {
    document.getElementById(
      "convAvatar"
    ).innerHTML = `<img src="${settings.otherAvatar}" alt="">`;
  }

  // 刷新列表和样式
  renderCharacters();
  renderConversation();
  applyCustomStyles(settings);

  // 应用头像可见性设置
  applyAvatarVisibility(
    settings.showAiAvatar !== false,
    settings.showUserAvatar !== false
  );

  closeChatSettings();
  // 判断一下：只有开启了火花，才提示“续火花”
  if (isFlameActive) {
    showToast("设置已保存，火花已续上 ♨");
  } else {
    showToast("设置已保存");
  }
}

// Apply custom styles
function applyCustomStyles(settings) {
  // Remove existing custom style
  const existingStyle = document.getElementById("chatCustomStyle");
  if (existingStyle) existingStyle.remove();

  // Remove existing bubble color style
  const existingBubbleStyle = document.getElementById("bubbleColorStyle");
  if (existingBubbleStyle) existingBubbleStyle.remove();

  // Apply background to the entire conversation page
  const convPage = document.getElementById("chatConversationPage");
  const convMessages = document.getElementById("convMessages");

  if (settings.background) {
    convPage.style.backgroundImage = `url(${settings.background})`;
    convPage.style.backgroundSize = "cover";
    convPage.style.backgroundPosition = "center";
    convPage.style.backgroundAttachment = "fixed";
    convMessages.style.backgroundImage = "";
  } else {
    convPage.style.backgroundImage = "";
    convPage.style.background = "#f5f5f5";
    convMessages.style.backgroundImage = "";
  }

  // Apply font size
  const bubbles = document.querySelectorAll(".msg-bubble");
  bubbles.forEach((b) => (b.style.fontSize = settings.fontSize + "px"));

  // Apply bubble text colors
  const userColor = settings.userBubbleColor || "#c2185b";
  const aiColor = settings.aiBubbleColor || "#37474f";
  const bubbleColorStyle = document.createElement("style");
  bubbleColorStyle.id = "bubbleColorStyle";
  bubbleColorStyle.textContent = `
    .msg-row.user .msg-bubble { color: ${userColor} !important; }
    .msg-row.ai .msg-bubble { color: ${aiColor} !important; }
  `;
  document.head.appendChild(bubbleColorStyle);

  // Apply custom CSS - 使用 !important 确保用户样式优先级最高
  if (settings.customCSS) {
    const style = document.createElement("style");
    style.id = "chatCustomStyle";
    // 用户自定义CSS放在最后，优先级最高
    style.textContent = `/* 用户自定义样式 - 优先级最高 */\n${settings.customCSS}`;
    document.head.appendChild(style);
  }
}

// Show toast message
function showToast(message) {
  // Create toast element
  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.textContent = message;
  toast.style.cssText = `
                            position: fixed;
                            bottom: 120px;
                            left: 50%;
                            transform: translateX(-50%);
                            background: rgba(0,0,0,0.75);
                            color: white;
                            padding: 12px 24px;
                            border-radius: 24px;
                            font-size: 0.9rem;
                            z-index: var(--z-max);
                            animation: fadeInUp 0.3s ease-out;
                          `;
  document.body.appendChild(toast);

  // Remove after delay
  setTimeout(() => {
    toast.style.animation = "fadeOut 0.3s ease-out";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Add toast animations
const toastStyle = document.createElement("style");
toastStyle.textContent = `
                          @keyframes fadeInUp {
                            from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                            to { opacity: 1; transform: translateX(-50%) translateY(0); }
                          }
                          @keyframes fadeOut {
                            from { opacity: 1; }
                            to { opacity: 0; }
                          }
                        `;
document.head.appendChild(toastStyle);

// ========== 新消息通知系统 ==========
var unreadMessages = {}; // { charId: count }
var unreadMoments = 0;
var notificationTimeout = null;
var pendingNotificationCharId = null;

// 显示新消息通知弹窗
function showMessageNotification(charId, charName, charAvatar, messageText) {
  const notification = document.getElementById("messageNotification");
  const avatarEl = document.getElementById("notificationAvatar");
  const nameEl = document.getElementById("notificationName");
  const textEl = document.getElementById("notificationText");
  const timeEl = document.getElementById("notificationTime");

  // 设置内容
  if (charAvatar) {
    avatarEl.innerHTML = `<img src="${charAvatar}" alt="">`;
  } else {
    avatarEl.innerHTML = charName ? charName.charAt(0) : "AI";
  }
  nameEl.textContent = charName || "未知";
  textEl.textContent = messageText || "发来一条消息";
  timeEl.textContent = "刚刚";

  pendingNotificationCharId = charId;

  // 显示通知
  notification.classList.add("show");

  // 清除之前的定时器
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }

  // 4秒后自动隐藏
  notificationTimeout = setTimeout(() => {
    notification.classList.remove("show");
  }, 4000);
}

// 点击通知跳转到对应聊天或动态页面
function handleNotificationClick() {
  const notification = document.getElementById("messageNotification");
  notification.classList.remove("show");

  // 检查是否是动态通知
  if (notification.dataset.type === "moment") {
    notification.dataset.type = ""; // 清除标记
    // 先关闭当前可能打开的聊天页面
    const convPage = document.getElementById("chatConversationPage");
    if (convPage && convPage.classList.contains("active")) {
      convPage.classList.remove("active");
    }
    // 跳转到动态页面
    switchChatTab("moments");
    return;
  }

  // 消息通知
  if (pendingNotificationCharId) {
    const charIdToOpen = pendingNotificationCharId;
    pendingNotificationCharId = null;

    // 先关闭当前可能打开的聊天页面
    const convPage = document.getElementById("chatConversationPage");
    if (convPage && convPage.classList.contains("active")) {
      convPage.classList.remove("active");
    }

    // 切换到消息tab
    switchChatTab("messages");

    // 延迟打开对应聊天，确保UI已更新
    setTimeout(() => {
      openConversation(charIdToOpen);
      // 清除该角色的未读
      clearUnreadForChar(charIdToOpen);
    }, 150);
  }
}

// 增加未读消息计数
function addUnreadMessage(charId) {
  unreadMessages[charId] = (unreadMessages[charId] || 0) + 1;
  updateMessagesBadge();
  // 刷新消息列表显示红点
  if (typeof renderCharacters === "function") {
    renderCharacters();
  }
}

// 清除某个角色的未读消息
function clearUnreadForChar(charId) {
  if (unreadMessages[charId]) {
    delete unreadMessages[charId];
    updateMessagesBadge();
    // 刷新消息列表移除红点
    if (typeof renderCharacters === "function") {
      renderCharacters();
    }
  }
}

// 更新消息tab的小红点
function updateMessagesBadge() {
  const badge = document.getElementById("messagesBadge");
  const total = Object.values(unreadMessages).reduce((a, b) => a + b, 0);

  if (total > 0) {
    badge.textContent = total > 99 ? "99+" : total;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

// 增加朋友圈未读
function addUnreadMoment() {
  unreadMoments++;
  updateMomentsBadge();
}

// 清除朋友圈未读
function clearUnreadMoments() {
  unreadMoments = 0;
  updateMomentsBadge();
}

// 更新朋友圈tab的小红点
function updateMomentsBadge() {
  const badge = document.getElementById("momentsBadge");

  if (unreadMoments > 0) {
    badge.textContent = unreadMoments > 99 ? "99+" : unreadMoments;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

// Placeholder functions for settings actions
function manageFriendGroups() {
  alert("好友分组管理功能开发中...");
}

function triggerManualSummary() {
  const history = chatHistories[currentChatCharId] || [];
  if (history.length < 10) {
    alert("聊天记录太少，无法生成总结");
    return;
  }
  alert("正在生成总结...\n\n此功能需要配合API使用");
}

function manageBubbleStyles() {
  alert("气泡样式管理功能开发中...");
}

function exportBubbleStyle() {
  const css = document.getElementById("settingsCustomCSS").value;
  if (!css) {
    alert("没有自定义样式可导出");
    return;
  }
  const blob = new Blob([css], { type: "text/css" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chat-style.css";
  a.click();
  URL.revokeObjectURL(url);
}

function importBubbleStyle() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".css,.txt";
  input.onchange = function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById("settingsCustomCSS").value = e.target.result;
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

function resetCustomCSS() {
  if (confirm("确定要重置自定义CSS吗？")) {
    document.getElementById("settingsCustomCSS").value = "";
  }
}

function importChatHistory() {
  if (!currentChatCharId) return;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      let messages = [];

      // 支持两种格式：完整导出格式和纯消息数组
      if (data.type === "pinky_chat_export" && Array.isArray(data.messages)) {
        messages = data.messages;
      } else if (Array.isArray(data)) {
        messages = data;
      } else {
        throw new Error("无效的聊天记录格式");
      }

      // 询问用户是覆盖还是追加
      const choice = confirm(
        "点击「确定」覆盖现有记录，点击「取消」追加到现有记录末尾"
      );

      if (choice) {
        // 覆盖
        chatHistories[currentChatCharId] = messages;
      } else {
        // 追加
        const existing = chatHistories[currentChatCharId] || [];
        chatHistories[currentChatCharId] = [...existing, ...messages];
      }

      await localforage.setItem("chatHistories", chatHistories);
      renderConversation();
      showToast(`成功导入 ${messages.length} 条消息`);
    } catch (err) {
      alert("导入失败：" + err.message);
    }
  };
  input.click();
}

function exportChatHistory() {
  if (!currentChatCharId) return;

  const history = chatHistories[currentChatCharId] || [];
  if (history.length === 0) {
    showToast("没有聊天记录可导出");
    return;
  }

  const char = characters.find((c) => c.id === currentChatCharId);
  const settings = chatSettings[currentChatCharId] || {};

  // 导出包含角色信息和消息
  const exportData = {
    type: "pinky_chat_export",
    version: 1,
    charInfo: {
      name: char?.name,
      note: char?.note,
      avatar: char?.avatar,
    },
    settings: {
      charName: settings.charName,
      userNickname: settings.userNickname,
    },
    messages: history,
    exportTime: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat-${char?.name || "export"}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("聊天记录已导出");
}

function clearChatHistoryFromSettings() {
  if (confirm("确定要清空所有聊天记录吗？此操作不可撤销！")) {
    chatHistories[currentChatCharId] = [];
    localforage.setItem("chatHistories", chatHistories);
    document.getElementById("settingsTotalMsg").textContent = "0";
    document.getElementById("settingsTokenCount").textContent = "0";
    renderConversation();
    showToast("聊天记录已清空");
  }
}

function blockCharacter() {
  if (confirm("确定要拉黑此角色吗？拉黑后将无法收发消息。")) {
    const char = characters.find((c) => c.id === currentChatCharId);
    if (char) {
      char.blocked = true;
      localforage.setItem("characters", characters);
      showToast("已拉黑 " + char.name);
      closeChatSettings();
      closeConversation();
    }
  }
}

// Load settings when opening conversation
const originalOpenConversation = openConversation;
openConversation = function (charId) {
  originalOpenConversation(charId);

  // Apply saved settings if exist
  if (chatSettings[charId]) {
    applyCustomStyles(chatSettings[charId]);
  }

  // 刷新表情面板的绑定状态显示（因为不同角色有不同的绑定）
  if (typeof renderCategoryBar === "function") {
    renderCategoryBar();
  }
};
// ==================== 用户人设预设逻辑 ====================
var userPersonaPresets;
try {
  userPersonaPresets = JSON.parse(
    localStorage.getItem("userPersonaPresets") || "[]"
  );
  if (!Array.isArray(userPersonaPresets)) userPersonaPresets = [];
} catch (e) {
  console.error("userPersonaPresets解析失败", e);
  userPersonaPresets = [];
}

// 初始化预设下拉菜单
function initUserPersonaPresets() {
  const select = document.getElementById("userPersonaPresetSelect");
  // 保留第一个默认选项，清除其他的
  while (select.options.length > 1) {
    select.remove(1);
  }

  userPersonaPresets.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    select.appendChild(option);
  });

  // 绑定 change 事件
  select.onchange = function () {
    if (this.value) {
      loadUserPersonaPreset(this.value);
    }
  };
}

// 保存当前配置为新预设
function saveUserPersonaPreset() {
  const currentPersona = document
    .getElementById("settingsMyPersona")
    .value.trim();
  const currentAvatar = document.getElementById("myAvatarImg").src;

  if (!currentPersona) {
    alert("请先填写人设内容再保存预设！");
    return;
  }

  const name = prompt("请为当前人设取个名字（例如：高冷霸总、撒娇小猫）：");
  if (!name) return;

  const newPreset = {
    id: Date.now().toString(),
    name: name,
    persona: currentPersona,
    avatar: currentAvatar, // 连同头像一起保存
  };

  userPersonaPresets.push(newPreset);
  localforage.setItem("userPersonaPresets", userPersonaPresets);

  showToast("预设已保存 ★");
  initUserPersonaPresets(); // 刷新下拉框
}

// 加载预设
function loadUserPersonaPreset(presetId) {
  const preset = userPersonaPresets.find((p) => p.id === presetId);
  if (!preset) return;

  // 1. 填入人设文本
  document.getElementById("settingsMyPersona").value = preset.persona;

  // 2. 如果预设里有头像，也一起加载
  if (preset.avatar && preset.avatar.startsWith("data:")) {
    loadAvatarPreview("my", preset.avatar);
    document.getElementById(
      "previewMyAvatar"
    ).innerHTML = `<img src="${preset.avatar}">`;
  }

  showToast(`已切换至：${preset.name}`);
}

// 在页面加载完成时初始化
document.addEventListener("DOMContentLoaded", function () {
  // ... 原有的初始化代码 ...
  initUserPersonaPresets(); // 添加这一行
});
// ==================== 长期记忆总结系统 ====================

// 1. 检查是否达到触发条件
function checkAndTriggerSummary(settings) {
  if (!settings.longMemory) return; // 如果开关没开，直接退出

  const history = chatHistories[currentChatCharId] || [];
  const totalMsg = history.length;
  // 默认已总结条数为0
  const summarizedCount = settings.summarizedCount || 0;
  // 获取触发阈值
  const triggerCount = settings.triggerCount || 500;

  // 计算新增的、未总结的消息数
  const newMsgCount = totalMsg - summarizedCount;

  if (newMsgCount >= triggerCount) {
    if (settings.summaryMode === "auto") {
      // 自动模式：直接开始总结
      performSummary(settings, history, summarizedCount, totalMsg);
    } else {
      // 手动模式：提示用户
      showToast(`📬 新消息已达 ${newMsgCount} 条，建议进行总结`);
      // 这里可以加一个小红点逻辑，或者弹窗，目前用Toast提示
    }
  }
}

// 2. 执行总结 (调用 AI)
async function performSummary(
  settings,
  history,
  startIndex,
  endIndex,
  isManual = false
) {
  const apiConfig = getActiveApiConfig();
  if (!apiConfig) {
    if (isManual) alert("API未配置，无法总结");
    return;
  }

  // 截取需要总结的片段
  const messagesToSummarize = history.slice(startIndex, endIndex);
  if (messagesToSummarize.length === 0) return;

  // 将聊天记录转换为文本
  const chatText = messagesToSummarize
    .map(
      (m) =>
        `${m.role === "user" ? "用户" : settings.charName || "AI"}: ${
          m.content
        }`
    )
    .join("\n");

  const summaryPrompt = settings.summaryPrompt || "请总结以下对话的核心事件。";

  // 显示正在处理的提示
  if (isManual) showToast("正在生成记忆总结...");

  try {
    const response = await fetch(`${apiConfig.url}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiConfig.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: [
          { role: "system", content: summaryPrompt },
          { role: "user", content: chatText },
        ],
        temperature: 0.5, // 总结需要准确，温度调低
      }),
    });

    const data = await response.json();
    const summaryText = data.choices[0]?.message?.content;

    if (summaryText) {
      // 保存总结
      if (!settings.summaries) settings.summaries = [];

      // 添加带日期的总结
      const dateStr = new Date().toLocaleDateString();
      settings.summaries.push(`[${dateStr}] ${summaryText}`);

      // 更新已总结的计数指针
      settings.summarizedCount = endIndex;

      // 保存到 LocalStorage
      chatSettings[currentChatCharId] = settings;
      localforage.setItem("chatSettings", chatSettings);

      showToast("✓ 长期记忆已更新");
    }
  } catch (e) {
    console.error(e);
    if (isManual) alert("总结失败: " + e.message);
  }
}

// 3. 手动触发按钮逻辑 (对应设置页的按钮)
function triggerManualSummary() {
  if (!currentChatCharId) return;
  const settings = chatSettings[currentChatCharId];
  const history = chatHistories[currentChatCharId] || [];

  const summarizedCount = settings.summarizedCount || 0;
  const totalMsg = history.length;

  if (totalMsg <= summarizedCount) {
    alert("当前没有新的消息需要总结。");
    return;
  }

  if (
    confirm(
      `有 ${totalMsg - summarizedCount} 条新消息未总结，确定现在生成总结吗？`
    )
  ) {
    performSummary(settings, history, summarizedCount, totalMsg, true);
  }
}
// ==================== 查看/管理总结 UI (升级版：支持编辑) ====================
function viewSummaries() {
  if (!currentChatCharId) return;
  const settings = chatSettings[currentChatCharId];
  const summaries = settings.summaries || [];

  // 1. 创建遮罩层 (如果有旧的先移除，防止重复)
  const oldModal = document.getElementById("summaryManagerModal");
  if (oldModal) oldModal.remove();

  const overlay = document.createElement("div");
  overlay.className = "api-modal active";
  overlay.id = "summaryManagerModal";

  // 2. 构建内容 HTML
  let listHtml = "";
  if (summaries.length === 0) {
    listHtml = `<div class="empty-state" style="padding:20px;">
                              <div class="empty-text">暂无长期记忆</div>
                              <div class="empty-hint">AI 还没有生成过总结哦</div>
                          </div>`;
  } else {
    summaries.forEach((sum, index) => {
      // 这里使用了行内编辑的布局
      // 默认显示：summary-view (文字 + 按钮)
      // 编辑状态：summary-edit (输入框 + 保存/取消) -> 默认隐藏
      listHtml += `
                                  <div id="summary-item-${index}" style="background:#f5f5f5; padding:12px; border-radius:12px; margin-bottom:10px; position:relative; transition: all 0.2s;">

                                      <div id="summary-view-${index}">
                                          <div style="font-size:0.9rem; color:#333; line-height:1.5; padding-right:60px; word-break: break-word;">${escapeHtml(
                                            sum
                                          )}</div>

                                          <div style="position:absolute; top:8px; right:8px; display:flex; gap:4px;">
                                              <button onclick="startEditSummary(${index})" style="border:none; background:white; width:28px; height:28px; border-radius:6px; box-shadow:0 1px 3px rgba(0,0,0,0.1); color:#5d4e37; cursor:pointer; display:flex; align-items:center; justify-content:center;">✏️</button>
                                              <button onclick="deleteSummary(${index})" style="border:none; background:white; width:28px; height:28px; border-radius:6px; box-shadow:0 1px 3px rgba(0,0,0,0.1); color:#ff6b6b; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
                                          </div>
                                      </div>

                                      <div id="summary-edit-${index}" style="display:none;">
                                          <textarea id="summary-input-${index}" class="edit-input" style="width:100%; height:80px; resize:vertical; margin-bottom:8px; background:white;">${sum}</textarea>
                                          <div style="display:flex; gap:8px; justify-content:flex-end;">
                                              <button onclick="cancelEditSummary(${index})" class="form-btn-small" style="padding:6px 12px; background:#eee;">取消</button>
                                              <button onclick="saveSummaryEdit(${index})" class="form-btn-small" style="padding:6px 12px; background:var(--accent-pink); color:white; border:none; box-shadow:0 2px 8px rgba(244, 143, 177, 0.4);">保存</button>
                                          </div>
                                      </div>

                                  </div>
                              `;
    });
  }

  overlay.innerHTML = `
                          <div class="api-modal-content" style="height: var(--vh-70);">
                              <div class="api-modal-header">
                                  <h2 class="api-modal-title">长期记忆管理 (${summaries.length})</h2>
                                  <button class="api-modal-close" onclick="closeSummaryModal()">✕</button>
                              </div>
                              <div class="api-modal-body" id="summaryListContainer" style="padding-bottom: 40px;">
                                  ${listHtml}
                              </div>
                              <div class="api-modal-footer">
                                  <button class="api-modal-btn btn-cancel" style="width:100%" onclick="closeSummaryModal()">关闭</button>
                              </div>
                          </div>
                      `;

  document.body.appendChild(overlay);
}
// 开始编辑：切换显示状态
function startEditSummary(index) {
  document.getElementById(`summary-view-${index}`).style.display = "none";
  document.getElementById(`summary-edit-${index}`).style.display = "block";

  // 自动聚焦并把光标移到最后
  const textarea = document.getElementById(`summary-input-${index}`);
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

// 取消编辑：还原显示状态
function cancelEditSummary(index) {
  document.getElementById(`summary-view-${index}`).style.display = "block";
  document.getElementById(`summary-edit-${index}`).style.display = "none";

  // 还原文本（防止用户修改了一半没保存）
  const settings = chatSettings[currentChatCharId];
  document.getElementById(`summary-input-${index}`).value =
    settings.summaries[index];
}

// 保存编辑
function saveSummaryEdit(index) {
  const newVal = document.getElementById(`summary-input-${index}`).value.trim();
  if (!newVal) {
    alert("记忆内容不能为空");
    return;
  }

  // 更新数据
  const settings = chatSettings[currentChatCharId];
  settings.summaries[index] = newVal;

  // 保存到本地存储
  chatSettings[currentChatCharId] = settings;
  localforage.setItem("chatSettings", chatSettings);

  showToast("记忆已修正 ★");

  // 重新渲染列表（最简单的方法，确保UI同步）
  viewSummaries();
}

// 删除总结（保持原来的逻辑，稍微优化一下UI刷新）
window.deleteSummary = function (index) {
  if (confirm("确定要遗忘这段记忆吗？")) {
    const settings = chatSettings[currentChatCharId];
    settings.summaries.splice(index, 1);

    localforage.setItem("chatSettings", chatSettings);

    viewSummaries(); // 重新渲染
    showToast("已删除该条记忆");
  }
};

// 关闭总结弹窗
function closeSummaryModal() {
  const modal = document.getElementById("summaryManagerModal");
  if (modal) {
    modal.classList.remove("active"); // 播放退出动画（如果有）
    setTimeout(() => modal.remove(), 300);
  }
}

// 删除单条总结
window.deleteSummary = function (index) {
  if (confirm("确定要遗忘这段记忆吗？")) {
    const settings = chatSettings[currentChatCharId];
    settings.summaries.splice(index, 1);

    // 保存
    localforage.setItem("chatSettings", chatSettings);

    // 刷新列表（简单粗暴：关闭再重开，或者重新生成HTML）
    closeSummaryModal();
    setTimeout(viewSummaries, 100); // 稍微延迟一下重新打开
    showToast("已删除该条记忆");
  }
};
// ==================== 快捷键：回车发送 ====================
document.getElementById("convInput").addEventListener("keydown", function (e) {
  // 判断：如果是 Enter 键，并且没有按住 Shift 键
  // (!e.isComposing 用于防止在输入中文拼音时按下回车误发送)
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault(); // 阻止默认的“换行”行为
    sendUserMessage(); // 执行发送函数
  }
});
// ==================== 火花样式 ====================
const flameStyle = document.createElement("style");
flameStyle.innerHTML = `
                      /* 火花小徽章容器 */
                      .spark-badge {
                          display: inline-flex;
                          align-items: center;
                          gap: 2px;
                          padding: 2px 6px;
                          background: #fff0f6; /* 浅粉背景 */
                          border: 1px solid #ffadd2; /* 深粉描边 */
                          border-radius: 12px;
                          color: #eb2f96;
                          font-size: 0.75rem;
                          font-weight: 600;
                          margin-left: 6px;
                          vertical-align: middle;
                          transform: translateY(-1px);
                          box-shadow: 0 1px 2px rgba(235, 47, 150, 0.1);
                      }

                      /* 列表里的火花（稍微小一点） */
                      .message-name .spark-badge {
                          font-size: 0.7rem;
                          padding: 1px 5px;
                      }

                      /* 设置页里的火花配置区域 */
                      #flameSettingsArea {
                          background: #fafafa;
                          padding: 12px;
                          border-radius: 12px;
                          margin-top: 10px;
                          border: 1px solid #eee;
                          animation: slideDown 0.2s ease-out;
                      }

                      @keyframes slideDown {
                          from { opacity: 0; transform: translateY(-10px); }
                          to { opacity: 1; transform: translateY(0); }
                      }
                  `;
document.head.appendChild(flameStyle);
// ==================== 续火花设置逻辑 (UI注入) ====================
function initFlameSettingsUI() {
  const toggleSwitch = document.getElementById("settingsFlame");
  const toggleRow = toggleSwitch.closest(".toggle-row");

  // 1. 如果配置区域还没创建，就创建它
  if (!document.getElementById("flameSettingsArea")) {
    const area = document.createElement("div");
    area.id = "flameSettingsArea";
    area.style.display = "none"; // 默认隐藏

    area.innerHTML = `
                              <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                                  <div style="flex: 1;">
                                      <label class="form-label" style="font-size: 0.75rem;">火花样式</label>
                                      <input type="text" id="settingsFlameIcon" class="form-input" style="text-align:center;" placeholder="♨" value="♨">
                                  </div>
                                  <div style="flex: 2;">
                                      <label class="form-label" style="font-size: 0.75rem;">已续天数</label>
                                      <input type="number" id="settingsFlameDays" class="form-input" value="1" min="1">
                                  </div>
                              </div>
                              <div style="font-size: 0.7rem; color: #999;">★ 每天聊天会自动 +1 哦</div>
                          `;

    // 插入到开关行的后面
    toggleRow.parentNode.insertBefore(area, toggleRow.nextSibling);
  }

  // 2. 绑定开关事件：开关打开时显示配置区
  const area = document.getElementById("flameSettingsArea");

  function toggleArea() {
    area.style.display = toggleSwitch.checked ? "block" : "none";
  }

  // 监听变化
  toggleSwitch.onchange = toggleArea;

  // 初始化状态
  toggleArea();
}
// ==================== UI 美化：毛玻璃 & 按钮布局优化 ====================

// 1. 注入样式 (隐藏头像、毛玻璃、圆形按钮)
const uiUpgradeStyle = document.createElement("style");
uiUpgradeStyle.innerHTML = `
                      /* --- 1. 隐藏聊天顶部标题栏的那个小头像 --- */
                      .conv-title-section .conv-avatar {
                          display: none !important;
                      }
                      /* 调整名字的位置，因为头像没了，名字要居中显示 */
                      .conv-title-section {
                          margin: 0 !important;
                          justify-content: center;
                      }

                      /* --- 2. iOS风格透明模糊效果 --- */
                      /* 顶部栏 */
                      .conv-header {
                          background: transparent !important;
                          border: none !important;
                          box-shadow: none !important;
                          padding-bottom: 25px !important;
                      }
                      
                      /* 顶部模糊遮罩 */
                      .conv-header::before {
                          content: "";
                          position: absolute;
                          top: 0;
                          left: 0;
                          right: 0;
                          bottom: 0;
                          backdrop-filter: blur(20px) saturate(180%);
                          -webkit-backdrop-filter: blur(20px) saturate(180%);
                          mask-image: linear-gradient(to bottom, 
                            rgba(0,0,0,1) 0%, 
                            rgba(0,0,0,0.8) 50%,
                            rgba(0,0,0,0) 100%);
                          -webkit-mask-image: linear-gradient(to bottom, 
                            rgba(0,0,0,1) 0%, 
                            rgba(0,0,0,0.8) 50%,
                            rgba(0,0,0,0) 100%);
                          z-index: -1;
                          pointer-events: none;
                      }

                      /* 底部输入栏 */
                      .conv-input-area {
                          background: transparent !important;
                          border: none !important;
                          padding-top: 25px !important;
                      }
                      
                      /* 底部模糊遮罩 */
                      .conv-input-area::before {
                          content: "";
                          position: absolute;
                          top: 0;
                          left: 0;
                          right: 0;
                          bottom: 0;
                          backdrop-filter: blur(20px) saturate(180%);
                          -webkit-backdrop-filter: blur(20px) saturate(180%);
                          mask-image: linear-gradient(to top, 
                            rgba(0,0,0,1) 0%, 
                            rgba(0,0,0,0.8) 60%,
                            rgba(0,0,0,0) 100%);
                          -webkit-mask-image: linear-gradient(to top, 
                            rgba(0,0,0,1) 0%, 
                            rgba(0,0,0,0.8) 60%,
                            rgba(0,0,0,0) 100%);
                          z-index: -1;
                          pointer-events: none;
                      }

                      /* --- 3. 改造 AI 按钮 (液态玻璃感) --- */
                      #replyBtn {
                          width: 36px !important;
                          height: 36px !important;
                          min-height: unset !important;
                          border-radius: 50% !important;
                          padding: 0 !important;

                          /* 液态玻璃效果 */
                          background: rgba(255, 255, 255, 0.4) !important;
                          backdrop-filter: blur(12px) saturate(180%) !important;
                          -webkit-backdrop-filter: blur(12px) saturate(180%) !important;
                          color: #e91e63 !important;
                          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255,255,255,0.5) !important;

                          /* 布局 */
                          display: flex !important;
                          align-items: center !important;
                          justify-content: center !important;
                          margin-bottom: 2px !important;
                          flex-shrink: 0 !important;
                          align-self: flex-end !important;
                      }
                      
                      #replyBtn svg {
                          stroke: #e91e63;
                          stroke-width: 2;
                          fill: none;
                          width: 20px;
                          height: 20px;
                      }
                      
                      #replyBtn:active {
                          transform: scale(0.92);
                          background: rgba(255, 255, 255, 0.5) !important;
                      }

                      /* 正常状态下：隐藏文字，只显示我设定的图标 */
                      #replyBtn span { display: none; } /* 如果有 span */

                      /* 加载状态处理 (当变为"思考中..."时) */
                      #replyBtn.loading {
                          opacity: 0.6 !important;
                          pointer-events: none;
                      }
                      #replyBtn.loading svg {
                          display: none;
                      }
                      #replyBtn.loading::after {
                          content: "⏳";
                          font-size: 16px !important;
                          animation: spin 1s infinite linear;
                      }

                      @keyframes spin { 100% { transform: rotate(360deg); } }
                  `;
document.head.appendChild(uiUpgradeStyle);

// 2. JS 逻辑：把 AI 按钮"搬运"到输入框里面去（延迟执行）
document.addEventListener("DOMContentLoaded", function () {
  const wrapper = document.querySelector(".conv-input-wrapper");
  const replyBtn = document.getElementById("replyBtn");
  const sendBtn = document.querySelector(".conv-send-btn");
  if (
    wrapper &&
    replyBtn &&
    sendBtn &&
    sendBtn.parentNode === wrapper &&
    replyBtn.parentNode !== wrapper
  ) {
    replyBtn.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"></path><path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z"></path><path d="M18 14l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z"></path></svg>';
    wrapper.insertBefore(replyBtn, sendBtn);
    const input = document.getElementById("convInput");
    if (input) input.style.marginRight = "4px";
  }
});
const simpleBtnStyle = document.createElement("style");
simpleBtnStyle.innerHTML = `
                      /* 覆盖之前的样式，液态玻璃感按钮 */
                      #replyBtn {
                          width: 36px !important;
                          height: 36px !important;
                          border-radius: 50% !important;
                          border: none !important;
                          padding: 0 !important;

                          /* 液态玻璃效果 */
                          background: rgba(255, 255, 255, 0.4) !important;
                          backdrop-filter: blur(12px) saturate(180%) !important;
                          -webkit-backdrop-filter: blur(12px) saturate(180%) !important;
                          color: #e91e63 !important;

                          display: flex !important;
                          align-items: center !important;
                          justify-content: center !important;

                          cursor: pointer !important;
                          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255,255,255,0.5) !important;
                          margin-bottom: 2px !important;
                          transition: transform 0.15s, background 0.15s !important;
                          align-self: flex-end !important;
                      }
                      
                      #replyBtn svg {
                          stroke: #e91e63;
                          stroke-width: 2;
                          fill: none;
                          width: 20px;
                          height: 20px;
                      }

                      /* 点击时的效果 */
                      #replyBtn:active {
                          transform: scale(0.92);
                          background: rgba(255, 255, 255, 0.5) !important;
                      }

                      /* 加载时的效果 */
                      #replyBtn.loading {
                          opacity: 0.6 !important;
                          cursor: not-allowed !important;
                      }
                      
                      #replyBtn.loading svg {
                          display: none;
                      }

                      /* 强制隐藏之前可能存在的伪元素动画 */
                      #replyBtn.loading::after {
                          display: none !important;
                      }
                  `;
document.head.appendChild(simpleBtnStyle);
// ==================== 字体管理系统 ====================
// 变量已在script开头初始化

// 初始化
document.addEventListener("DOMContentLoaded", function () {
  renderFontPresets();
  // 如果有激活的字体，应用它
  if (window.activeFontId !== "system") {
    const font = window.fontPresets.find((f) => f.id == window.activeFontId);
    if (font) injectGlobalFont(font.source);
  }
});

// 切换来源 Tab (URL / 本地文件)
function switchFontSource(type) {
  document
    .querySelectorAll("#fontPage .radio-option")
    .forEach((el) => el.classList.remove("active"));
  if (type === "url") {
    document.getElementById("tabFontUrl").classList.add("active");
    document.getElementById("fontSourceUrl").style.display = "block";
    document.getElementById("fontSourceFile").style.display = "none";
    window.tempFontData = null;
  } else {
    document.getElementById("tabFontFile").classList.add("active");
    document.getElementById("fontSourceUrl").style.display = "none";
    document.getElementById("fontSourceFile").style.display = "block";
  }
}

// 处理文件上传 (转 Base64)
function handleFontFileUpload(input) {
  const file = input.files[0];
  if (!file) return;

  document.getElementById("fontFileName").textContent = file.name;

  const reader = new FileReader();
  reader.onload = function (e) {
    window.tempFontData = e.target.result; // Base64 字符串
    showToast("文件已读取，请点击预览");
  };
  reader.readAsDataURL(file);
}

// 预览字体
function previewCustomFont() {
  let source = "";
  // 判断当前是 URL 模式还是文件模式
  if (document.getElementById("tabFontUrl").classList.contains("active")) {
    source = `url('${document.getElementById("fontUrlInput").value.trim()}')`;
  } else {
    if (!window.tempFontData) {
      alert("请先上传字体文件");
      return;
    }
    source = `url('${window.tempFontData}')`;
  }

  if (!source || source === "url('')") {
    alert("请输入 URL 或上传文件");
    return;
  }

  // 创建临时 Style 注入预览
  const previewId = "temp-preview-font";
  let style = document.getElementById(previewId);
  if (style) style.remove();

  style = document.createElement("style");
  style.id = previewId;
  style.innerHTML = `
                              @font-face {
                                  font-family: 'PreviewFont';
                                  src: ${source};
                              }
                            `;
  document.head.appendChild(style);

  // 应用到预览框
  const box = document.getElementById("fontPreviewBox");
  box.style.fontFamily = "'PreviewFont', sans-serif";
  showToast("预览已应用");
}

// 保存并应用字体
function saveFontPreset() {
  // 确保fontPresets已初始化
  if (!window.fontPresets) window.fontPresets = [];

  const name = document.getElementById("fontNameInput").value.trim();
  let source = "";

  if (document.getElementById("tabFontUrl").classList.contains("active")) {
    const url = document.getElementById("fontUrlInput").value.trim();
    if (!url) {
      alert("请输入字体 URL");
      return;
    }
    source = `url('${url}')`;
  } else {
    if (!window.tempFontData) {
      alert("请先上传字体文件");
      return;
    }
    source = `url('${window.tempFontData}')`;
  }

  if (!name) {
    alert("请给字体起个名字");
    return;
  }

  const newPreset = {
    id: Date.now(),
    name: name,
    source: source,
  };

  window.fontPresets.push(newPreset);
  localforage.setItem("fontPresets", window.fontPresets);

  // 立即应用
  activateFont(newPreset.id);
  renderFontPresets();

  // 清空输入
  document.getElementById("fontNameInput").value = "";
  document.getElementById("fontUrlInput").value = "";
  document.getElementById("fontFileInput").value = "";
  document.getElementById("fontFileName").textContent = "未选择文件";
  window.tempFontData = null;

  showToast("字体保存并应用成功 ★");
}

// 渲染字体列表
function renderFontPresets() {
  // 确保变量已初始化
  if (!window.fontPresets) window.fontPresets = [];
  if (!window.activeFontId) window.activeFontId = "system";

  const container = document.getElementById("fontPresetList");

  // 保留第一个系统默认
  let html = `
                               <div class="api-preset-item ${
                                 window.activeFontId === "system"
                                   ? "active"
                                   : ""
                               }" onclick="applySystemFont()">
                                  <div class="preset-radio" id="radio-system"></div>
                                  <div class="preset-info">
                                     <div class="preset-name">系统默认</div>
                                     <div class="preset-detail">System Default</div>
                                  </div>
                               </div>
                            `;

  window.fontPresets.forEach((preset) => {
    const isActive = window.activeFontId == preset.id;
    html += `
                                  <div class="api-preset-item ${
                                    isActive ? "active" : ""
                                  }" onclick="activateFont(${preset.id})">
                                      <div class="preset-radio"></div>
                                      <div class="preset-info">
                                          <div class="preset-name" style="${
                                            isActive
                                              ? "font-family: CustomGlobalFont;"
                                              : ""
                                          }">${escapeHtml(preset.name)}</div>
                                          <div class="preset-detail">自定义字体</div>
                                      </div>
                                      <button class="preset-edit-btn" style="color:#ff6b6b;" onclick="event.stopPropagation(); deleteFontPreset(${
                                        preset.id
                                      })">✕</button>
                                  </div>
                                `;
  });

  container.innerHTML = html;
}

// 激活自定义字体
function activateFont(id) {
  if (!window.fontPresets) window.fontPresets = [];
  const preset = window.fontPresets.find((p) => p.id == id);
  if (!preset) return;

  window.activeFontId = id;
  localforage.setItem("activeFontId", id);

  injectGlobalFont(preset.source);
  renderFontPresets();
}

// 恢复系统默认字体
function applySystemFont() {
  window.activeFontId = "system";
  localforage.setItem("activeFontId", "system");

  // 移除全局样式
  const style = document.getElementById("global-custom-font");
  if (style) style.remove();

  renderFontPresets();
  showToast("已恢复默认字体");
}

// 核心：注入全局 CSS
function injectGlobalFont(sourceStr) {
  const styleId = "global-custom-font";
  let style = document.getElementById(styleId);
  if (style) style.remove();

  style = document.createElement("style");
  style.id = styleId;
  style.innerHTML = `
                              @font-face {
                                  font-family: 'CustomGlobalFont';
                                  src: ${sourceStr};
                                  font-display: swap;
                              }
                              /* 强制覆盖所有元素的字体 */
                              body, button, input, textarea, select, .chat-title, .message-preview, .msg-bubble {
                                  font-family: 'CustomGlobalFont', "Noto Sans SC", sans-serif !important;
                              }
                            `;
  document.head.appendChild(style);
}

// 删除字体
function deleteFontPreset(id) {
  if (!window.fontPresets) window.fontPresets = [];
  if (confirm("确定要删除这个字体预设吗？")) {
    window.fontPresets = window.fontPresets.filter((p) => p.id != id);
    localforage.setItem("fontPresets", window.fontPresets);

    if (window.activeFontId == id) {
      applySystemFont();
    } else {
      renderFontPresets();
    }
  }
}

// ==================== 修复：聊天自动滚动到底部 ====================
function renderConversation() {
  const container = document.getElementById("convMessages");
  const history = chatHistories[currentChatCharId] || [];

  if (history.length === 0) {
    container.innerHTML = `
      <div class="conv-empty">
          <div class="conv-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>
          <div class="conv-empty-text">开始和TA聊天吧～</div>
      </div>`;
    return;
  }

  const settings = chatSettings[currentChatCharId] || {};
  const char = characters.find((c) => c.id === currentChatCharId);

  // 头像逻辑
  const aiAvatarSrc = settings.otherAvatar || (char ? char.avatar : "") || "";
  const globalUserAvatar = localStorage.getItem("avatarImg");
  const userAvatarSrc = settings.myAvatar || globalUserAvatar || "";

  let html = "";
  let lastRole = null;
  let currentGroup = [];

  // 遍历生成 HTML (逻辑保持不变)
  history.forEach((msg, index) => {
    // 跳过隐藏的系统消息（如通话记录）
    if (msg.isHidden) {
      return;
    }

    const isRecalled = msg.isRecalled === true;

    if (isRecalled) {
      if (currentGroup.length > 0) {
        html += renderMessageGroup(
          currentGroup,
          lastRole,
          aiAvatarSrc,
          userAvatarSrc
        );
        currentGroup = [];
      }

      // 区分用户撤回和AI撤回
      if (msg.role === "user") {
        html += `<div class="msg-system-tip">你撤回了一条消息</div>`;
      } else {
        // AI撤回，用户可以点击查看原内容
        const recalledContent = (msg.content || "")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .substring(0, 50);
        html += `<div class="msg-system-tip msg-recalled-ai" onclick="showRecalledContent(${index})">
          对方撤回了一条消息 <span style="color:#f48fb1;font-size:0.75rem;">[点击查看]</span>
        </div>`;
      }
      lastRole = null;
      return;
    }

    // 处理系统卡片
    if (msg.type === "system-card") {
      if (currentGroup.length > 0) {
        html += renderMessageGroup(
          currentGroup,
          lastRole,
          aiAvatarSrc,
          userAvatarSrc
        );
        currentGroup = [];
      }
      html += `<div class="msg-system-card">
        <div class="system-card">
          <div class="system-card-icon">${msg.cardIcon || "•"}</div>
          <div class="system-card-title">${msg.cardTitle || "系统消息"}</div>
          <div class="system-card-desc">${msg.cardDesc || ""}</div>
        </div>
      </div>`;
      lastRole = null;
      return;
    }

    // 处理陪伴卡片
    if (msg.isCompanionCard && msg.companionData) {
      if (currentGroup.length > 0) {
        html += renderMessageGroup(
          currentGroup,
          lastRole,
          aiAvatarSrc,
          userAvatarSrc
        );
        currentGroup = [];
      }
      const cd = msg.companionData;
      const cardClass = cd.completed
        ? "companion-result-card complete"
        : "companion-result-card quit";
      const icon = cd.completed ? "🎉" : "💪";
      const title = cd.completed ? "陪伴完成！" : "陪伴中断";
      const desc = cd.completed
        ? `完成了「${cd.task}」${cd.duration}分钟`
        : `「${cd.task}」${cd.duration}分钟`;
      html += `<div class="msg-companion-card-wrap">
        <div class="${cardClass}">
          <div class="companion-card-icon">${icon}</div>
          <div class="companion-card-content">
            <div class="companion-card-title">${title}</div>
            <div class="companion-card-desc">${desc}</div>
          </div>
        </div>
      </div>`;
      lastRole = null;
      return;
    }

    if (msg.role !== lastRole && currentGroup.length > 0) {
      html += renderMessageGroup(
        currentGroup,
        lastRole,
        aiAvatarSrc,
        userAvatarSrc
      );
      currentGroup = [];
    }

    currentGroup.push({ ...msg, originalIndex: index });
    lastRole = msg.role;

    if (index === history.length - 1) {
      html += renderMessageGroup(
        currentGroup,
        lastRole,
        aiAvatarSrc,
        userAvatarSrc
      );
    }
  });

  container.innerHTML = html;

  // 【关键修改】如果不是在多选模式，强制滚动到底部
  // 使用 setTimeout 确保 DOM 渲染完成后再滚动
  if (typeof isSelectionMode === "undefined" || !isSelectionMode) {
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 0);
  }
}

// 3. 长按处理逻辑
function handleTouchStart(e, index) {
  if (isSelectionMode) return; // 多选模式下不触发长按
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;

  longPressTimer = setTimeout(() => {
    showContextMenu(e.touches[0].clientX, e.touches[0].clientY, index);
  }, 500); // 500ms 长按触发
}

function handleTouchMove(e) {
  if (!longPressTimer) return;
  // 如果移动超过一定距离，取消长按
  let moveX = e.touches[0].clientX;
  let moveY = e.touches[0].clientY;
  if (
    Math.abs(moveX - touchStartX) > 10 ||
    Math.abs(moveY - touchStartY) > 10
  ) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function handleTouchEnd() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

// 鼠标兼容 (PC端调试用)
function handleMouseDown(e, index) {
  if (isSelectionMode) return;
  longPressTimer = setTimeout(() => {
    showContextMenu(e.clientX, e.clientY, index);
  }, 500);
}
function handleMouseUp() {
  if (longPressTimer) clearTimeout(longPressTimer);
}

// ==================== 简化版：显示居中菜单 ====================
// ==================== 最终定稿：屏幕居中逻辑 ====================

function showContextMenu(x, y, index) {
  if (navigator.vibrate) navigator.vibrate(50);

  activeMsgIndex = index;
  const overlay = document.getElementById("contextMenuOverlay");
  const menu = document.getElementById("contextMenu");

  // 获取当前消息角色
  const history = chatHistories[currentChatCharId];
  const msg = history[index];
  const isUser = msg.role === "user";

  // 构建菜单内容
  let menuHtml = `<div class="menu-item" onclick="handleCopyMsg()">复制</div>`;
  menuHtml += `<div class="menu-item" onclick="handleQuoteMsg()">引用</div>`;
  menuHtml += `<div class="menu-item" onclick="handleFavoriteMsg()">收藏</div>`;

  if (isUser) {
    menuHtml += `<div class="menu-item" onclick="handleRecallMsg()">撤回</div>`;
  }

  menuHtml += `
                          <div class="menu-item" onclick="handleEditMsg()">编辑</div>
                          <div class="menu-item" onclick="handleMultiSelect()">多选</div>
                          <div class="menu-item danger" onclick="handleDeleteMsg()">删除</div>
                      `;

  menu.innerHTML = menuHtml;

  // 清除可能残留的内联样式
  menu.style.left = "";
  menu.style.top = "";
  menu.classList.remove("arrow-top");

  // 显示
  overlay.classList.add("active");
  setTimeout(() => menu.classList.add("show"), 10);
}
// ==================== 最终版：锚定气泡的菜单逻辑 ====================

function hideContextMenu() {
  const overlay = document.getElementById("contextMenuOverlay");
  const menu = document.getElementById("contextMenu");
  menu.classList.remove("show");
  setTimeout(() => overlay.classList.remove("active"), 200);
}

// 气泡点击处理（多选模式下切换选中状态）
function handleBubbleClick(event, index) {
  if (isSelectionMode) {
    event.stopPropagation();
    if (selectedIndices.has(index)) {
      selectedIndices.delete(index);
    } else {
      selectedIndices.add(index);
    }
    updateSelectionUI();
    renderConversation();
  }
}

// 选择器点击切换选中状态
function toggleMessageSelection(index) {
  if (!isSelectionMode) return;
  if (selectedIndices.has(index)) {
    selectedIndices.delete(index);
  } else {
    selectedIndices.add(index);
  }
  updateSelectionUI();
  renderConversation();
}

// 整行点击处理（多选模式下）- 精确定位到具体消息
function handleWrapperClick(event, indices) {
  if (!isSelectionMode || !indices || indices.length === 0) return;
  event.stopPropagation();

  // 如果只有一条消息，直接选中
  if (indices.length === 1) {
    const index = indices[0];
    if (selectedIndices.has(index)) {
      selectedIndices.delete(index);
    } else {
      selectedIndices.add(index);
    }
    updateSelectionUI();
    renderConversation();
    return;
  }

  // 多条消息时，根据点击位置找到最接近的消息
  const clickY = event.clientY;
  let closestIndex = indices[0];
  let closestDistance = Infinity;

  // 遍历所有气泡，找到最接近点击位置的那个
  for (const idx of indices) {
    const bubble = document.querySelector(`[data-index="${idx}"]`);
    if (bubble) {
      const rect = bubble.getBoundingClientRect();
      const bubbleCenter = rect.top + rect.height / 2;
      const distance = Math.abs(clickY - bubbleCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = idx;
      }
    }
  }

  if (selectedIndices.has(closestIndex)) {
    selectedIndices.delete(closestIndex);
  } else {
    selectedIndices.add(closestIndex);
  }
  updateSelectionUI();
  renderConversation();
}

// 5. 菜单功能实现

// 当前引用的消息
var currentQuote = null;

// ==================== 收藏功能 ====================
window.favoritesData = {
  groups: [{ id: "default", name: "默认分组" }],
  items: [],
};
var pendingFavoriteData = null; // 待收藏的数据
var selectedFavoriteGroup = "default"; // 选中的分组
var currentFavoritesGroup = "all"; // 当前查看的分组

// 初始化收藏数据
async function initFavoritesData() {
  const saved = await safeLocalforageGet("favoritesData");
  if (saved) {
    window.favoritesData = saved;
    // 确保有默认分组
    if (!saved.groups || saved.groups.length === 0) {
      window.favoritesData.groups = [{ id: "default", name: "默认分组" }];
    }
    if (!saved.items) {
      window.favoritesData.items = [];
    }
  }
}

// 保存收藏数据
async function saveFavoritesData() {
  await localforage.setItem("favoritesData", window.favoritesData);
}

// 长按消息收藏单条
function handleFavoriteMsg() {
  hideContextMenu();
  const msg = chatHistories[currentChatCharId][activeMsgIndex];
  const char = characters.find((c) => c.id === currentChatCharId);

  pendingFavoriteData = {
    type: "message",
    messages: [
      {
        role: msg.role,
        content: msg.content,
        senderName:
          msg.role === "user"
            ? window.momentsData?.userProfile?.name || "我"
            : char?.note || char?.name || "AI",
        senderAvatar:
          msg.role === "user"
            ? window.momentsData?.userProfile?.avatarImg
            : char?.avatar,
      },
    ],
    source: `来自与 ${char?.note || char?.name || "未知"} 的聊天`,
    charId: currentChatCharId,
    timestamp: Date.now(),
  };

  openFavoriteGroupModal();
}

// 多选收藏
function favoriteSelectedMessages() {
  if (selectedIndices.size === 0) {
    showToast("请先选择消息");
    return;
  }

  const char = characters.find((c) => c.id === currentChatCharId);
  const messages = [];

  // 按顺序获取选中的消息
  const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
  sortedIndices.forEach((idx) => {
    const msg = chatHistories[currentChatCharId][idx];
    if (msg) {
      messages.push({
        role: msg.role,
        content: msg.content,
        senderName:
          msg.role === "user"
            ? window.momentsData?.userProfile?.name || "我"
            : char?.note || char?.name || "AI",
        senderAvatar:
          msg.role === "user"
            ? window.momentsData?.userProfile?.avatarImg
            : char?.avatar,
      });
    }
  });

  pendingFavoriteData = {
    type: "message",
    messages: messages,
    source: `来自与 ${char?.note || char?.name || "未知"} 的聊天`,
    charId: currentChatCharId,
    timestamp: Date.now(),
  };

  exitSelectionMode();
  openFavoriteGroupModal();
}

// ==================== 转发功能 ====================
function showForwardModal() {
  if (selectedIndices.size === 0) {
    showToast("请先选择消息");
    return;
  }

  const overlay = document.getElementById("forwardModalOverlay");
  const content = document.getElementById("forwardModalContent");

  // 转发方式选择器
  let html = `
    <div class="forward-mode-selector">
      <div class="forward-mode-option ${
        forwardMode === "merge" ? "active" : ""
      }" onclick="setForwardMode('merge')">
        <div class="forward-mode-icon">📦</div>
        <div class="forward-mode-text">合并转发</div>
      </div>
      <div class="forward-mode-option ${
        forwardMode === "single" ? "active" : ""
      }" onclick="setForwardMode('single')">
        <div class="forward-mode-icon">📝</div>
        <div class="forward-mode-text">逐条转发</div>
      </div>
    </div>
    <div class="forward-chat-list">
  `;

  // 添加私聊角色
  characters.forEach((char) => {
    if (char.id === currentChatCharId) return;

    html += `
      <div class="forward-chat-item" onclick="forwardToChat('${
        char.id
      }', 'private')">
        <img class="forward-chat-avatar" src="${
          char.avatar ||
          "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐰</text></svg>"
        }" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐰</text></svg>'">
        <div class="forward-chat-info">
          <div class="forward-chat-name">${
            char.note || char.name || "未命名角色"
          }</div>
          <div class="forward-chat-type">私聊</div>
        </div>
      </div>
    `;
  });

  // 添加群聊
  if (window.groupChats && window.groupChats.length > 0) {
    window.groupChats.forEach((group) => {
      html += `
        <div class="forward-chat-item" onclick="forwardToChat('${
          group.id
        }', 'group')">
          <img class="forward-chat-avatar" src="${
            group.avatar ||
            "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👥</text></svg>"
          }" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👥</text></svg>'">
          <div class="forward-chat-info">
            <div class="forward-chat-name">${group.name || "未命名群聊"}</div>
            <div class="forward-chat-type">群聊 · ${
              group.members?.length || 0
            }人</div>
          </div>
        </div>
      `;
    });
  }

  html += "</div>";

  if (
    characters.length <= 1 &&
    (!window.groupChats || window.groupChats.length === 0)
  ) {
    html =
      '<div style="padding: 40px; text-align: center; color: #999;">暂无可转发的聊天</div>';
  }

  content.innerHTML = html;
  overlay.classList.add("active");
}

function setForwardMode(mode) {
  forwardMode = mode;
  document.querySelectorAll(".forward-mode-option").forEach((el) => {
    el.classList.toggle("active", el.onclick.toString().includes(`'${mode}'`));
  });
}

function hideForwardModal() {
  document.getElementById("forwardModalOverlay").classList.remove("active");
}

function forwardToChat(targetId, chatType) {
  const currentChar = characters.find((c) => c.id === currentChatCharId);
  const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
  const sourceName = currentChar?.note || currentChar?.name || "未知";

  // 构建转发消息内容
  let forwardedMessages = [];
  sortedIndices.forEach((idx) => {
    const msg = chatHistories[currentChatCharId][idx];
    if (msg) {
      forwardedMessages.push({
        senderName:
          msg.role === "user"
            ? window.momentsData?.userProfile?.name || "我"
            : currentChar?.note || currentChar?.name || "AI",
        content: msg.content,
        isHtml: msg.isHtml,
      });
    }
  });

  if (forwardMode === "single") {
    // 逐条转发
    forwardSingleMessages(targetId, chatType, forwardedMessages, sourceName);
  } else {
    // 合并转发
    forwardMergedMessages(targetId, chatType, forwardedMessages, sourceName);
  }

  hideForwardModal();
  exitSelectionMode();
}

// 合并转发
function forwardMergedMessages(
  targetId,
  chatType,
  forwardedMessages,
  sourceName
) {
  const previewCount = Math.min(3, forwardedMessages.length);
  const hasMore = forwardedMessages.length > 3;
  const forwardId = "fwd_" + Date.now();

  const previewHtml = forwardedMessages
    .slice(0, previewCount)
    .map((m) => {
      const plainContent = m.content.replace(/<[^>]+>/g, "");
      const shortContent =
        plainContent.length > 20
          ? plainContent.substring(0, 20) + "..."
          : plainContent;
      return `<div class="forwarded-msg-preview-item"><span class="sender">${
        m.senderName
      }:</span>${shortContent
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</div>`;
    })
    .join("");

  if (!window.forwardedMsgData) window.forwardedMsgData = {};
  window.forwardedMsgData[forwardId] = {
    source: sourceName,
    messages: forwardedMessages,
  };
  localforage.setItem("forwardedMsgData", window.forwardedMsgData);

  const forwardHtml = `<div class="forwarded-msg-card" onclick="showForwardDetail('${forwardId}')">
    <div class="forwarded-msg-header">📨 转发的聊天记录</div>
    <div class="forwarded-msg-preview">
      ${previewHtml}
    </div>
    ${
      hasMore
        ? `<div class="forwarded-msg-more">查看${forwardedMessages.length}条消息 ›</div>`
        : ""
    }
  </div>`;

  if (chatType === "private") {
    if (!chatHistories[targetId]) chatHistories[targetId] = [];
    chatHistories[targetId].push({
      role: "user",
      content: forwardHtml,
      isHtml: true,
      isForwarded: true,
      forwardSource: sourceName,
      timestamp: Date.now(),
    });
    localforage.setItem("chatHistories", chatHistories);
    const targetChar = characters.find((c) => c.id === targetId);
    showToast(`已转发到 ${targetChar?.note || targetChar?.name || "聊天"}`);
  } else if (chatType === "group") {
    const group = window.groupChats?.find((g) => g.id === targetId);
    if (group) {
      if (!group.messages) group.messages = [];
      group.messages.push({
        id: Date.now(),
        senderId: "user",
        senderName: window.momentsData?.userProfile?.name || "我",
        senderAvatar: window.momentsData?.userProfile?.avatarImg,
        content: forwardHtml,
        isHtml: true,
        isForwarded: true,
        forwardSource: sourceName,
        timestamp: Date.now(),
      });
      localforage.setItem("groupChats", window.groupChats);
      showToast(`已转发到群聊 ${group.name || "未命名群聊"}`);
    }
  }
}

// 逐条转发
async function forwardSingleMessages(
  targetId,
  chatType,
  forwardedMessages,
  sourceName
) {
  const timestamp = Date.now();

  if (chatType === "private") {
    if (!chatHistories[targetId]) chatHistories[targetId] = [];

    forwardedMessages.forEach((msg, index) => {
      // 提取纯文本内容
      const plainContent = msg.isHtml
        ? msg.content.replace(/<[^>]+>/g, "")
        : msg.content;
      const displayContent = msg.content;

      chatHistories[targetId].push({
        role: "user",
        content: displayContent,
        isForwarded: true,
        forwardSource: sourceName,
        timestamp: timestamp + index,
        time: new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    });

    await localforage.setItem("chatHistories", chatHistories);
    const targetChar = characters.find((c) => c.id === targetId);
    showToast(`已逐条转发 ${forwardedMessages.length} 条消息`);
  } else if (chatType === "group") {
    const messagesKey = `group_messages_${targetId}`;
    const groupMessages = (await localforage.getItem(messagesKey)) || [];

    forwardedMessages.forEach((msg, index) => {
      const plainContent = msg.isHtml
        ? msg.content.replace(/<[^>]+>/g, "")
        : msg.content;
      const displayContent = msg.content;

      groupMessages.push({
        role: "user",
        content: displayContent,
        isForwarded: true,
        forwardSource: sourceName,
        timestamp: timestamp + index,
        time: new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    });

    await localforage.setItem(messagesKey, groupMessages);

    const group = window.groupChats?.find((g) => g.id === targetId);
    if (group) {
      group.lastMessage = `[转发消息]`;
      group.lastTime = "刚刚";
      await localforage.setItem("groupChats", window.groupChats);
    }
    showToast(`已逐条转发 ${forwardedMessages.length} 条消息`);
  }
}

// 收藏动态
function favoritePost(postId) {
  const post = window.momentsData?.posts?.find(
    (p) => String(p.id) === String(postId)
  );
  if (!post) return;

  const profile = window.momentsData.userProfile;
  let authorName, authorAvatar;

  if (post.isUser) {
    authorName = profile.name;
    authorAvatar = profile.avatarImg;
  } else {
    const char = window.characters?.find((c) => String(c.id) === post.authorId);
    authorName = char ? char.note || char.name : "未知用户";
    authorAvatar = char?.avatar;
  }

  pendingFavoriteData = {
    type: "moment",
    content: post.content || "",
    image: post.image || post.textImage || "",
    authorName: authorName,
    authorAvatar: authorAvatar,
    source: "来自动态",
    postId: postId,
    timestamp: Date.now(),
  };

  openFavoriteGroupModal();
}

// 打开分组选择弹窗
function openFavoriteGroupModal() {
  selectedFavoriteGroup = "default";
  renderFavoriteGroupList();
  document.getElementById("favoriteGroupModal").classList.add("active");
}

// 关闭分组选择弹窗
function closeFavoriteGroupModal() {
  document.getElementById("favoriteGroupModal").classList.remove("active");
  pendingFavoriteData = null;
}

// 渲染分组列表
function renderFavoriteGroupList() {
  const container = document.getElementById("favoriteGroupList");
  container.innerHTML = window.favoritesData.groups
    .map(
      (group) => `
    <div class="favorite-group-item ${
      selectedFavoriteGroup === group.id ? "selected" : ""
    }" onclick="selectFavoriteGroup('${group.id}')">
      <span class="group-name">${group.name}</span>
      ${
        selectedFavoriteGroup === group.id
          ? '<span class="group-check">✓</span>'
          : ""
      }
    </div>
  `
    )
    .join("");
}

// 选择分组
function selectFavoriteGroup(groupId) {
  selectedFavoriteGroup = groupId;
  renderFavoriteGroupList();
}

// 在弹窗中新建分组
function addNewGroupInModal() {
  const name = prompt("请输入分组名称：");
  if (name && name.trim()) {
    const newGroup = {
      id: "group_" + Date.now(),
      name: name.trim(),
    };
    window.favoritesData.groups.push(newGroup);
    saveFavoritesData();
    selectedFavoriteGroup = newGroup.id;
    renderFavoriteGroupList();
    showToast("分组已创建");
  }
}

// 确认收藏
async function confirmFavorite() {
  if (!pendingFavoriteData) {
    closeFavoriteGroupModal();
    return;
  }

  const newItem = {
    id: "fav_" + Date.now(),
    groupId: selectedFavoriteGroup,
    ...pendingFavoriteData,
  };

  window.favoritesData.items.push(newItem);
  await saveFavoritesData();

  closeFavoriteGroupModal();
  showToast("★ 已收藏");
}

// 打开收藏页面
function openFavoritesPage() {
  currentFavoritesGroup = "all";
  renderFavoritesTabs();
  renderFavoritesList();
  document.getElementById("favoritesPage").classList.add("active");
}

// 关闭收藏页面
function closeFavoritesPage() {
  document.getElementById("favoritesPage").classList.remove("active");
}

// 渲染分组标签
function renderFavoritesTabs() {
  const container = document.getElementById("favoritesTabs");
  const allCount = window.favoritesData.items.length;

  let html = `<button class="favorites-tab ${
    currentFavoritesGroup === "all" ? "active" : ""
  }" onclick="switchFavoritesGroup('all')">全部<span class="tab-count">${allCount}</span></button>`;

  window.favoritesData.groups.forEach((group) => {
    const count = window.favoritesData.items.filter(
      (item) => item.groupId === group.id
    ).length;
    html += `<button class="favorites-tab ${
      currentFavoritesGroup === group.id ? "active" : ""
    }" onclick="switchFavoritesGroup('${group.id}')">${
      group.name
    }<span class="tab-count">${count}</span></button>`;
  });

  container.innerHTML = html;
}

// 切换分组
function switchFavoritesGroup(groupId) {
  currentFavoritesGroup = groupId;
  renderFavoritesTabs();
  renderFavoritesList();
}

// 渲染收藏列表
function renderFavoritesList() {
  const container = document.getElementById("favoritesList");
  let items = window.favoritesData.items;

  if (currentFavoritesGroup !== "all") {
    items = items.filter((item) => item.groupId === currentFavoritesGroup);
  }

  // 按时间倒序
  items = items.sort((a, b) => b.timestamp - a.timestamp);

  if (items.length === 0) {
    container.innerHTML = `
      <div class="favorites-empty">
        <div class="favorites-empty-icon">★</div>
        <div>还没有收藏内容</div>
        <div style="font-size:0.8rem;margin-top:8px;color:#bbb;">长按消息或点击动态收藏按钮添加</div>
      </div>
    `;
    return;
  }

  container.innerHTML = items
    .map((item) => {
      const timeStr = formatFavoriteTime(item.timestamp);

      if (item.type === "message") {
        // 聊天消息
        const messagesHtml = item.messages
          .map(
            (msg) => `
        <div style="margin-bottom:6px;">
          <span style="color:#ec407a;font-weight:600;">${
            msg.senderName
          }：</span>
          <span>${escapeHtml(msg.content).replace(/\n/g, "<br>")}</span>
        </div>
      `
          )
          .join("");

        return `
        <div class="favorite-item">
          <div class="favorite-item-header">
            <div class="favorite-item-avatar">
              ${
                item.messages[0]?.senderAvatar
                  ? `<img src="${item.messages[0].senderAvatar}">`
                  : "💬"
              }
            </div>
            <div class="favorite-item-info">
              <div class="favorite-item-name">聊天记录</div>
              <div class="favorite-item-time">${timeStr}</div>
            </div>
            <button class="favorite-item-delete" onclick="deleteFavoriteItem('${
              item.id
            }')">✕</button>
          </div>
          <div class="favorite-item-content">${messagesHtml}</div>
          <div class="favorite-item-source">${item.source}</div>
        </div>
      `;
      } else if (item.type === "moment") {
        // 动态
        return `
        <div class="favorite-item">
          <div class="favorite-item-header">
            <div class="favorite-item-avatar">
              ${item.authorAvatar ? `<img src="${item.authorAvatar}">` : "📷"}
            </div>
            <div class="favorite-item-info">
              <div class="favorite-item-name">${item.authorName}</div>
              <div class="favorite-item-time">${timeStr}</div>
            </div>
            <button class="favorite-item-delete" onclick="deleteFavoriteItem('${
              item.id
            }')">✕</button>
          </div>
          <div class="favorite-item-content moment-type">
            ${item.content ? `<div>${escapeHtml(item.content)}</div>` : ""}
            ${
              item.image
                ? `<div style="color:#999;font-size:0.8rem;margin-top:4px;">[图片] ${item.image.substring(
                    0,
                    30
                  )}...</div>`
                : ""
            }
          </div>
          <div class="favorite-item-source">${item.source}</div>
        </div>
      `;
      }
      return "";
    })
    .join("");
}

// 格式化收藏时间
function formatFavoriteTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return Math.floor(diff / 60000) + "分钟前";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "小时前";

  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (date.getFullYear() === now.getFullYear()) {
    return `${month}月${day}日`;
  }
  return `${date.getFullYear()}年${month}月${day}日`;
}

// 删除收藏项
async function deleteFavoriteItem(itemId) {
  if (!confirm("确定删除这条收藏吗？")) return;

  window.favoritesData.items = window.favoritesData.items.filter(
    (item) => item.id !== itemId
  );
  await saveFavoritesData();
  renderFavoritesTabs();
  renderFavoritesList();
  showToast("已删除");
}

// 添加新分组（从收藏页面）
function addFavoriteGroup() {
  const name = prompt("请输入分组名称：");
  if (name && name.trim()) {
    const newGroup = {
      id: "group_" + Date.now(),
      name: name.trim(),
    };
    window.favoritesData.groups.push(newGroup);
    saveFavoritesData();
    renderFavoritesTabs();
    showToast("分组已创建");
  }
}

// 复制
function handleCopyMsg() {
  const msg = chatHistories[currentChatCharId][activeMsgIndex];
  navigator.clipboard.writeText(msg.content).then(() => {
    showToast("已复制");
  });
  hideContextMenu();
}

// 引用消息
function handleQuoteMsg() {
  const msg = chatHistories[currentChatCharId][activeMsgIndex];
  const char = characters.find((c) => c.id === currentChatCharId);

  // 获取发送者名称
  const senderName =
    msg.role === "user" ? "我" : char?.note || char?.name || "TA";

  // 清理消息内容用于显示（去掉HTML标签）
  let content = msg.content || "";
  content = content.replace(/<[^>]+>/g, "").trim();
  if (content.length > 50) content = content.substring(0, 50) + "...";

  // 保存引用信息
  currentQuote = {
    msgIndex: activeMsgIndex,
    sender: senderName,
    senderRole: msg.role,
    content: msg.content,
    displayContent: content,
  };

  // 显示引用预览
  document.getElementById("quotePreview").style.display = "flex";
  document.getElementById("quotePreviewSender").textContent = senderName;
  document.getElementById("quotePreviewText").textContent = content;

  // 聚焦输入框
  document.getElementById("convInput").focus();

  hideContextMenu();
  showToast("已引用消息");
}

// 取消引用
function cancelQuote() {
  currentQuote = null;
  document.getElementById("quotePreview").style.display = "none";
}

// 撤回 (核心功能：AI可见，用户不可见)
function handleRecallMsg() {
  if (!confirm("确定撤回这条消息吗？(AI仍会记得此内容)")) return;

  // 标记为已撤回，不删除
  chatHistories[currentChatCharId][activeMsgIndex].isRecalled = true;
  localforage.setItem("chatHistories", chatHistories);

  renderConversation();
  showToast("消息已撤回");
  hideContextMenu();
}

// 查看AI撤回的消息内容
function showRecalledContent(msgIndex) {
  const msg = chatHistories[currentChatCharId][msgIndex];
  if (!msg) return;

  let content = msg.content || "";
  // 清理HTML标签用于显示
  content = content.replace(/<[^>]+>/g, "").substring(0, 200);
  if (content.length >= 200) content += "...";

  alert(`对方撤回的内容：\n\n${content}`);
}

// 删除 (核心功能：AI失忆)
function handleDeleteMsg() {
  if (!confirm("确定删除？(AI将忘记这条消息)")) return;

  // 彻底从数组移除
  chatHistories[currentChatCharId].splice(activeMsgIndex, 1);
  localforage.setItem("chatHistories", chatHistories);

  // 更新设置页的统计
  document.getElementById("settingsTotalMsg").textContent =
    chatHistories[currentChatCharId].length;

  renderConversation();
  showToast("消息已删除");
}

// 编辑 (核心功能：AI记忆更新)
function handleEditMsg() {
  const msg = chatHistories[currentChatCharId][activeMsgIndex];

  // 弹出一个 prompt 或者使用之前的 editModal (为了简单这里用 prompt，你可以改用 editModal)
  // 使用多行输入框效果更好
  const newContent = prompt("编辑消息 (AI记忆将更新):", msg.content);

  if (newContent !== null && newContent.trim() !== "") {
    chatHistories[currentChatCharId][activeMsgIndex].content =
      newContent.trim();
    localforage.setItem("chatHistories", chatHistories);

    renderConversation();
    showToast("消息已编辑");
  }
}

// 多选模式入口
function handleMultiSelect() {
  isSelectionMode = true;
  selectedIndices.clear();

  // 默认选中触发长按的那一条
  selectedIndices.add(activeMsgIndex);

  // 更新 UI 状态
  document.getElementById("convInput").blur(); // 收起键盘
  document.querySelector(".conv-input-area").style.display = "none"; // 隐藏输入框
  document.getElementById("selectionFooter").classList.add("active"); // 显示删除栏

  renderConversation(); // 重新渲染以显示 checkbox
  updateSelectionUI();
}

// 6. 多选模式逻辑

// 点击消息 (在多选模式下)
function handleClickMsg(index) {
  if (!isSelectionMode) return;
  // 这里因为我们在 render 时是按组渲染 onclick，所以这个函数可能被组点击覆盖
  // 但如果直接点气泡，事件冒泡，可以在这里处理
}

// 切换一组消息的选中状态
function toggleSelectionGroup(indices) {
  // 检查这组是否全选了，如果是，则反选；否则全选
  const allSelected = indices.every((i) => selectedIndices.has(i));

  if (allSelected) {
    indices.forEach((i) => selectedIndices.delete(i));
  } else {
    indices.forEach((i) => selectedIndices.add(i));
  }

  // 强制更新 UI (不完全重绘，只切换 class)
  const firstIdx = indices[0];
  const wrapper = document.getElementById(`msg-wrapper-${firstIdx}`);
  if (wrapper) {
    if (!allSelected) wrapper.classList.add("selected");
    else wrapper.classList.remove("selected");
  }

  updateSelectionUI();
}

function exitSelectionMode() {
  isSelectionMode = false;
  selectedIndices.clear();

  document.querySelector(".conv-input-area").style.display = "block";
  document.getElementById("selectionFooter").classList.remove("active");

  renderConversation();
}
// ==================== 消息格式解析器 ====================
function formatNovelMessage(text) {
  // 1. 先进行 HTML 转义，防止 XSS
  let safeText = escapeHtml(text);

  // 2. 处理心理活动：把 *内容* 替换为 <i>内容</i>
  // 使用正则：\* 匹配星号，([^*]+) 捕获中间非星号的内容
  safeText = safeText.replace(/\*([^*]+)\*/g, "<i>*$1*</i>");

  // 3. 处理换行：把 \n 替换为 <br>
  safeText = safeText.replace(/\n/g, "<br>");

  return safeText;
}

// ==================== 语音条播放功能 ====================
let currentPlayingAudio = null;
let currentPlayingBar = null;
// voiceTouchStartTime 已在文件开头用var声明

// 语音气泡的touchstart处理 - 记录开始时间
function handleVoiceBubbleTouchStart(event, msgIndex) {
  voiceTouchStartTime = Date.now();
  // 调用原来的长按处理
  handleTouchStart(event, msgIndex);
}

// 语音气泡的touchend处理 - 判断是短按还是长按
function handleVoiceBubbleTouchEnd(event, msgIndex) {
  const touchDuration = Date.now() - voiceTouchStartTime;

  // 如果触摸时间小于450ms，且longPressTimer还存在（说明长按还没触发）
  // 则视为点击，播放语音
  if (touchDuration < 450 && longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;

    // 播放语音
    const voiceBar = event.currentTarget.querySelector(".voice-bar");
    if (voiceBar) {
      playVoiceMessageByIndex(msgIndex, voiceBar);
    }
  } else if (longPressTimer) {
    // 超过450ms但菜单还没显示，清除计时器
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  // 如果longPressTimer已经是null，说明长按菜单已经显示了，不需要做任何事
}

// 通过索引播放语音
function playVoiceMessageByIndex(msgIndex, voiceBar) {
  const history = chatHistories[currentChatCharId] || [];
  const msg = history[msgIndex];
  if (!msg) return;

  // 如果正在播放，停止
  if (currentPlayingAudio && currentPlayingBar === voiceBar) {
    currentPlayingAudio.pause();
    currentPlayingAudio.currentTime = 0;
    currentPlayingAudio = null;
    voiceBar.classList.remove("playing");
    currentPlayingBar = null;
    return;
  }

  // 停止之前的播放
  if (currentPlayingAudio) {
    currentPlayingAudio.pause();
    currentPlayingAudio.currentTime = 0;
    if (currentPlayingBar) {
      currentPlayingBar.classList.remove("playing");
    }
  }

  // 如果已经有音频URL，直接播放
  if (msg.audioUrl) {
    playAudioFromUrl(msg.audioUrl, voiceBar);
    return;
  }

  // 否则，生成语音
  generateAndPlayVoice(msg, msgIndex, voiceBar);
}

// 生成并播放语音
async function generateAndPlayVoice(msg, msgIndex, voiceBar) {
  const settings = chatSettings[currentChatCharId] || {};

  // 如果没有配置语音ID，直接显示文字而不是弹出提示
  if (!settings.voiceId) {
    // 自动展开文字
    msg.voiceTextVisible = true;
    localforage.setItem("chatHistories", chatHistories);

    // 更新UI显示文字
    const textEl = document.getElementById(`voiceText-${msgIndex}`);
    if (textEl) {
      textEl.classList.add("visible");
    }

    // 更新按钮文字
    const voiceMessage = voiceBar.closest(".voice-message");
    if (voiceMessage) {
      const btn = voiceMessage.querySelector(".voice-to-text-btn");
      if (btn) btn.textContent = "收起文字";
    }
    return;
  }

  // 获取语音文本
  const voiceMatch = msg.content.match(/^\[语音[ :：〃\s]*(.+)\]$/);
  if (!voiceMatch) return;

  const voiceText = voiceMatch[1];

  // 显示加载状态（静默生成，不显示Toast提示）
  voiceBar.classList.add("loading");

  try {
    const audioUrl = await generateSpeech(voiceText, currentChatCharId);

    if (audioUrl) {
      // 保存到消息中
      const history = chatHistories[currentChatCharId];
      if (history && history[msgIndex]) {
        history[msgIndex].audioUrl = audioUrl;
        localforage.setItem("chatHistories", chatHistories);
      }

      voiceBar.classList.remove("loading");
      voiceBar.classList.add("has-audio");
      voiceBar.dataset.audioUrl = audioUrl;

      // 播放
      playAudioFromUrl(audioUrl, voiceBar);
    } else {
      voiceBar.classList.remove("loading");
      showToast("语音生成失败");
    }
  } catch (e) {
    console.error("Voice generation error:", e);
    voiceBar.classList.remove("loading");
    showToast("语音生成出错");
  }
}

// 播放语音消息 (onclick用，PC端)
async function playVoiceMessage(event, msgIndex) {
  event.stopPropagation();
  const voiceBar = event.currentTarget;
  playVoiceMessageByIndex(msgIndex, voiceBar);
}

// 播放音频
function playAudioFromUrl(url, voiceBar) {
  console.log("[Voice] Playing audio from URL:", url);
  const audio = new Audio(url);
  currentPlayingAudio = audio;
  currentPlayingBar = voiceBar;

  voiceBar.classList.add("playing");

  audio.oncanplaythrough = () => {
    console.log("[Voice] Audio can play through");
  };

  audio.onended = () => {
    console.log("[Voice] Audio ended");
    voiceBar.classList.remove("playing");
    currentPlayingAudio = null;
    currentPlayingBar = null;
  };

  audio.onerror = (e) => {
    console.error("[Voice] Audio error:", audio.error);
    voiceBar.classList.remove("playing");
    currentPlayingAudio = null;
    currentPlayingBar = null;
    showToast("音频播放失败: " + (audio.error?.message || "未知错误"));
  };

  audio
    .play()
    .then(() => {
      console.log("[Voice] Audio playing...");
    })
    .catch((e) => {
      console.error("[Voice] Audio play error:", e);
      voiceBar.classList.remove("playing");
      currentPlayingAudio = null;
      currentPlayingBar = null;
      showToast("播放失败: " + e.message);
    });
}

// 切换语音文字显示
function toggleVoiceText(event, msgIndex) {
  event.stopPropagation();

  const history = chatHistories[currentChatCharId] || [];
  const msg = history[msgIndex];
  if (!msg) return;

  // 切换状态
  msg.voiceTextVisible = !msg.voiceTextVisible;
  localforage.setItem("chatHistories", chatHistories);

  // 更新UI
  const textEl = document.getElementById(`voiceText-${msgIndex}`);
  const btn = event.currentTarget;

  if (msg.voiceTextVisible) {
    textEl.classList.add("visible");
    btn.textContent = "收起文字";
  } else {
    textEl.classList.remove("visible");
    btn.textContent = "转文字";
  }
}

// ==================== 语音功能 (MiniMax TTS 完整最终版) ====================

// 1. 全局变量voiceConfig已在初始化时从localforage加载到window.voiceConfig
// 这里不需要重新定义

// 2. 切换线路 UI
function switchVoiceUrl(type) {
  const cnBtn = document.getElementById("voiceUrlCN");
  const intlBtn = document.getElementById("voiceUrlIntl");

  if (!cnBtn || !intlBtn) return; // 防止找不到元素报错

  cnBtn.classList.remove("active");
  intlBtn.classList.remove("active");

  if (type === "cn") {
    cnBtn.classList.add("active");
  } else {
    intlBtn.classList.add("active");
  }
}

// 3. 初始化加载配置到界面
function loadVoiceSettings() {
  // voiceConfig已经在初始化时加载到window.voiceConfig
  const config = window.voiceConfig || {};

  if (config.groupId) {
    const groupIdEl = document.getElementById("voiceGroupId");
    if (groupIdEl) groupIdEl.value = config.groupId;
  }
  if (config.apiKey) {
    const apiKeyEl = document.getElementById("voiceApiKey");
    if (apiKeyEl) apiKeyEl.value = config.apiKey;
  }
  if (config.model) {
    const modelEl = document.getElementById("voiceModelSelect");
    if (modelEl) modelEl.value = config.model;
  }

  // 加载线路选择 (默认国内)
  const baseUrl = config.baseUrl || "https://api.minimax.chat";
  if (baseUrl.includes("minimaxi.chat")) {
    switchVoiceUrl("intl");
  } else {
    switchVoiceUrl("cn");
  }

  console.log("语音配置已加载:", {
    groupId: config.groupId ? "已设置" : "未设置",
    model: config.model,
  });
}
// 监听加载 - 延迟执行确保数据已从localforage加载
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(loadVoiceSettings, 500);
});

// 4. 保存配置
function saveVoiceConfig() {
  const groupId = document.getElementById("voiceGroupId").value.trim();
  const apiKey = document.getElementById("voiceApiKey").value.trim();
  const model = document.getElementById("voiceModelSelect").value;

  // 获取当前选中的线路
  const intlBtn = document.getElementById("voiceUrlIntl");
  const isIntl = intlBtn && intlBtn.classList.contains("active");
  const baseUrl = isIntl
    ? "https://api.minimaxi.chat"
    : "https://api.minimax.chat";

  if (!groupId || !apiKey) {
    alert("请填写完整的 Group ID 和 API Key");
    return;
  }

  window.voiceConfig = { groupId, apiKey, model, baseUrl };
  localforage.setItem("voiceConfig", window.voiceConfig);
  showToast("语音配置已保存 🎙️");
}

// 播放嵌入式语音标签
async function playInlineVoice(el, text) {
  if (!text) return;

  // 检查是否有语音配置
  const settings = chatSettings[currentChatCharId] || {};
  if (!settings.voiceId) {
    showToast("此角色未配置语音");
    return;
  }

  el.innerHTML = "▶ 播放中...";
  el.style.pointerEvents = "none";

  try {
    const audioUrl = await generateSpeech(text, currentChatCharId);
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => {
        el.innerHTML = `♪ ${
          text.length > 20 ? text.substring(0, 20) + "..." : text
        }`;
        el.style.pointerEvents = "auto";
      };
    } else {
      el.innerHTML = `♪ ${
        text.length > 20 ? text.substring(0, 20) + "..." : text
      }`;
      el.style.pointerEvents = "auto";
    }
  } catch (e) {
    console.error("语音播放失败", e);
    el.innerHTML = `♪ ${
      text.length > 20 ? text.substring(0, 20) + "..." : text
    }`;
    el.style.pointerEvents = "auto";
  }
}

// ==================== 优化版：generateSpeech (更自然的断句) ====================
async function generateSpeech(text, charId) {
  // 1. 获取 ID 和 Key
  let currentGroupId =
    (window.voiceConfig && window.voiceConfig.groupId) ||
    document.getElementById("voiceGroupId")?.value;
  let currentApiKey =
    (window.voiceConfig && window.voiceConfig.apiKey) ||
    document.getElementById("voiceApiKey")?.value;

  if (!currentGroupId || !currentApiKey) {
    alert("请先在 API 设置页填写 MiniMax Group ID 和 API Key！");
    return null;
  }

  // 2. 获取 Voice ID
  const settings = chatSettings[charId];
  let voiceId = settings?.voiceId;
  if (charId === "temp_test") {
    voiceId = document.getElementById("settingsVoiceId").value.trim();
  }

  if (!voiceId) {
    alert("请先填写 Voice ID！");
    return null;
  }

  // ========== 核心优化：文本清洗 (Prompt 也就是在这里调整) ==========
  let cleanText = text;

  // 1. 去除动作描写和心理活动 (括号或星号里的内容不读)
  cleanText = cleanText
    .replace(/[\(（][^\)）]*[\)）]/g, "")
    .replace(/\*[^\*]+\*/g, "");

  // 2. 【关键】处理换行符：把换行变成逗号，防止由于排版导致的奇怪长停顿
  cleanText = cleanText.replace(/\n/g, "，");

  // 3. 处理可能导致卡顿的特殊符号
  cleanText = cleanText
    .replace(/……/g, "，") // 省略号太长会卡，改成逗号
    .replace(/…/g, "，")
    .replace(/—/g, "，") // 破折号改成逗号
    .replace(/~/g, "阿") // 【小技巧】波浪号如果是语气词(如:好哒~)，改成"阿"或"耶"会更自然，或者直接去掉
    .replace(/["]/g, ""); // 去掉双引号，防止语调奇怪

  // 4. 最后只保留中文、英文、数字和基本标点 (空格保留，用于英文分词)
  cleanText = cleanText.replace(/[^\u4e00-\u9fa5a-zA-Z0-9，。！？,.?! ]/g, "");

  // 如果洗完没词了（比如只发了个表情），就不生成
  if (cleanText.trim().length < 1) return null;

  // =============================================================

  // 辅助函数：Blob 转 Base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const tryFetch = async (baseUrl) => {
    const url = `${baseUrl}/v1/t2a_v2?GroupId=${currentGroupId}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${currentApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // 【建议】如果你觉得 Turbo 模型太卡，可以在 API 设置里选 speech-02-hd
        model: window.voiceConfig.model || "speech-01-turbo",
        text: cleanText,
        stream: false,
        voice_setting: {
          voice_id: voiceId,
          speed: 1.0,
          vol: 1.0,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: "mp3",
          channel: 1,
        },
      }),
    });
    return response;
  };

  try {
    const activeIntlBtn = document.getElementById("voiceUrlIntl");
    const isIntlSelected =
      activeIntlBtn && activeIntlBtn.classList.contains("active");
    let firstUrl = isIntlSelected
      ? "https://api.minimaxi.chat"
      : "https://api.minimax.chat";
    let secondUrl = isIntlSelected
      ? "https://api.minimax.chat"
      : "https://api.minimaxi.chat";

    let response = await tryFetch(firstUrl);
    if (response.status === 404) response = await tryFetch(secondUrl);

    if (!response.ok) throw new Error(`API Error ${response.status}`);
    const result = await response.json();

    if (result.base_resp && result.base_resp.status_code !== 0) {
      throw new Error(result.base_resp.status_msg);
    }

    const audioHex = result.data?.audio || result.audio;
    if (audioHex) {
      const bytes = new Uint8Array(audioHex.length / 2);
      for (let i = 0; i < audioHex.length; i += 2) {
        bytes[i / 2] = parseInt(audioHex.substr(i, 2), 16);
      }
      const blob = new Blob([bytes.buffer], { type: "audio/mp3" });
      return await blobToBase64(blob);
    }

    // 备用：URL处理
    const audioUrl = result.data?.audio_url || result.audio_url;
    if (audioUrl) {
      try {
        const urlResp = await fetch(audioUrl);
        const urlBlob = await urlResp.blob();
        return await blobToBase64(urlBlob);
      } catch (e) {
        return audioUrl;
      }
    }
    return null;
  } catch (e) {
    console.error(e);
    // 静默失败，不打扰用户聊天体验
    return null;
  }
}
// 6. 试听功能
async function testCharacterVoice() {
  const voiceId = document.getElementById("settingsVoiceId").value.trim();
  if (!voiceId) {
    alert("请先填写 Voice ID");
    return;
  }

  const btn = document.querySelector('button[onclick="testCharacterVoice()"]');
  const originalText = btn.textContent;
  btn.textContent = "生成中...";
  btn.disabled = true;

  try {
    const tempCharId = "temp_test";
    // 临时存入设置，以便 generateSpeech 读取
    if (!chatSettings[tempCharId]) chatSettings[tempCharId] = {};
    chatSettings[tempCharId].voiceId = voiceId;

    const audioUrl = await generateSpeech(
      "你好，我是你的专属AI伴侣，这是我的声音。",
      tempCharId
    );

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
      btn.textContent = "播放中...";
      audio.onended = () => {
        btn.textContent = originalText;
        btn.disabled = false;
      };
    } else {
      btn.textContent = originalText;
      btn.disabled = false;
    }
    delete chatSettings[tempCharId];
  } catch (e) {
    alert("试听失败");
    btn.textContent = originalText;
    btn.disabled = false;
  }
}
/* ==================== 修复：缺失的多选逻辑函数 ==================== */

// 1. 更新底部多选栏 UI (修复显示 0 条的问题)
function updateSelectionUI() {
  const count = selectedIndices.size;
  const countEl = document.getElementById("selectionCount");
  const deleteBtn = document.getElementById("multiDeleteBtn");

  // 更新文字
  if (countEl) {
    countEl.textContent = `已选 ${count} 条`;
  }

  // 更新删除按钮状态 (有选中时变红，无选中时变灰)
  if (deleteBtn) {
    if (count > 0) {
      deleteBtn.classList.add("active"); // 这里的 active 类在 CSS 里控制透明度和点击
      deleteBtn.style.opacity = "1";
      deleteBtn.style.pointerEvents = "auto";
    } else {
      deleteBtn.classList.remove("active");
      deleteBtn.style.opacity = "0.3";
      deleteBtn.style.pointerEvents = "none";
    }
  }
}

// 2. 执行删除选中的消息 (修复删除按钮无反应)
function deleteSelectedMessages() {
  if (selectedIndices.size === 0) return;

  if (confirm(`确定要删除这 ${selectedIndices.size} 条消息吗？`)) {
    const history = chatHistories[currentChatCharId] || [];

    // 核心逻辑：过滤掉 index 在 selectedIndices 里的消息
    // 注意：这里利用 filter 产生新数组，非常安全
    const newHistory = history.filter(
      (_, index) => !selectedIndices.has(index)
    );

    // 更新数据
    chatHistories[currentChatCharId] = newHistory;
    localforage.setItem("chatHistories", chatHistories);

    // 更新统计数据
    const totalMsgEl = document.getElementById("settingsTotalMsg");
    if (totalMsgEl) totalMsgEl.textContent = newHistory.length;

    // 退出多选模式并刷新
    exitSelectionMode();
    showToast("删除成功");
  }
}

// 3. 补丁：确保 handleMultiSelect 能正确初始化第一条选中
// (将原来的 handleMultiSelect 替换或覆盖为这个增强版)
window.handleMultiSelect = function () {
  isSelectionMode = true;
  selectedIndices.clear();

  // 默认选中长按的那一条
  if (activeMsgIndex !== -1) {
    selectedIndices.add(activeMsgIndex);
  }

  // 隐藏输入框，显示删除栏
  const inputArea = document.querySelector(".conv-input-area");
  const footer = document.getElementById("selectionFooter");

  if (inputArea) inputArea.style.display = "none";
  if (footer) {
    footer.style.display = "flex"; // 强制显示
    // 稍微延迟加 active class 以触发动画（如果有）
    setTimeout(() => footer.classList.add("active"), 10);
  }

  // 隐藏长按菜单
  hideContextMenu();

  // 刷新 UI
  updateSelectionUI(); // 立即更新一次文字
  renderConversation(); // 重新渲染气泡以显示勾选状态
};

// 4. 补丁：确保退出多选时 UI 复原
window.exitSelectionMode = function () {
  isSelectionMode = false;
  selectedIndices.clear();

  // 恢复输入框
  const inputArea = document.querySelector(".conv-input-area");
  if (inputArea) inputArea.style.display = "block";

  // 隐藏底部栏
  const footer = document.getElementById("selectionFooter");
  if (footer) {
    footer.classList.remove("active");
    setTimeout(() => (footer.style.display = "none"), 300); // 等动画播完再隐藏
  }

  renderConversation();
};

// 导出转发功能到全局
window.showForwardModal = showForwardModal;
window.hideForwardModal = hideForwardModal;
window.forwardToChat = forwardToChat;
window.setForwardMode = setForwardMode;
window.forwardMergedMessages = forwardMergedMessages;
window.forwardSingleMessages = forwardSingleMessages;
window.forwardGroupMergedMessages = forwardGroupMergedMessages;
window.forwardGroupSingleMessages = forwardGroupSingleMessages;
window.setForwardMode = setForwardMode;
window.forwardMergedMessages = forwardMergedMessages;
window.forwardSingleMessages = forwardSingleMessages;

// 显示转发详情弹窗
window.showForwardDetail = function (forwardId) {
  event && event.stopPropagation();

  const data = window.forwardedMsgData?.[forwardId];
  if (!data) {
    showToast("消息数据不存在");
    return;
  }

  const overlay = document.getElementById("forwardDetailOverlay");
  const title = document.getElementById("forwardDetailTitle");
  const content = document.getElementById("forwardDetailContent");

  title.textContent = `来自与 ${data.source} 的聊天`;

  content.innerHTML = data.messages
    .map(
      (m) => `
    <div class="forward-detail-item">
      <div class="forward-detail-sender">${m.senderName}</div>
      <div class="forward-detail-text">${m.content
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</div>
    </div>
  `
    )
    .join("");

  overlay.classList.add("active");
};

window.hideForwardDetail = function () {
  document.getElementById("forwardDetailOverlay").classList.remove("active");
};

// 加载已保存的转发消息数据
localforage.getItem("forwardedMsgData").then((data) => {
  if (data) window.forwardedMsgData = data;
});

// ==================== 心声功能 ====================
// 心声数据存储
window.heartVoiceData = {};

// 加载心声数据
localforage.getItem("heartVoiceData").then((data) => {
  if (data) window.heartVoiceData = data;
});

// 显示心声弹窗
window.showHeartVoice = function () {
  const overlay = document.getElementById("heartVoiceOverlay");
  overlay.classList.add("active");
  switchHeartTab("current");
};

// 隐藏心声弹窗
window.hideHeartVoice = function () {
  document.getElementById("heartVoiceOverlay").classList.remove("active");
};

// 切换心声标签
window.switchHeartTab = function (tab) {
  const tabs = document.querySelectorAll(".heart-voice-tab");
  tabs.forEach((t) => t.classList.remove("active"));
  event.target.classList.add("active");

  const content = document.getElementById("heartVoiceContent");
  const charId = currentChatCharId;

  if (tab === "current") {
    renderCurrentHeartVoice(content, charId);
  } else {
    renderHeartHistory(content, charId);
  }
};

// 渲染当前心声
function renderCurrentHeartVoice(container, charId) {
  const charData = window.heartVoiceData[charId];
  const current = charData?.current;

  if (!current) {
    container.innerHTML = `
      <div class="heart-card-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        <div style="color:#999;font-style:italic;">心事尚未落笔</div>
        <div style="font-size:0.75rem;margin-top:6px;color:#ccc;">待你们的故事展开，便会有了</div>
      </div>
    `;
    return;
  }

  const time = new Date(current.timestamp).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  container.innerHTML = `
    <div class="heart-card">
      <div class="heart-card-section">
        <div class="heart-card-label">此刻的姿态</div>
        <div class="heart-card-value">${current.action || "..."}</div>
      </div>
      <div class="heart-card-section">
        <div class="heart-card-label">今日的装扮</div>
        <div class="heart-card-value">${current.outfit || "..."}</div>
      </div>
      <div class="heart-card-section">
        <div class="heart-card-label">当前心绪</div>
        <div class="heart-card-value">${current.mood || "..."}</div>
      </div>
      <div class="heart-card-section">
        <div class="heart-card-label">未说出口的话</div>
        <div class="heart-card-value heart-card-secret">${
          current.secret || "..."
        }</div>
      </div>
      <div class="heart-card-time">${time}</div>
    </div>
  `;
}

// 渲染心声历史
function renderHeartHistory(container, charId) {
  const charData = window.heartVoiceData[charId];
  const history = charData?.history || [];

  if (history.length === 0) {
    container.innerHTML = `
      <div class="heart-history-empty" style="font-style:italic;color:#bbb;">往昔的心绪，尚无痕迹</div>
    `;
    return;
  }

  container.innerHTML = history
    .slice()
    .reverse()
    .map((item, idx) => {
      const time = new Date(item.timestamp).toLocaleString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      // 显示秘密的前40个字作为预览
      const preview = item.secret
        ? item.secret.length > 40
          ? item.secret.substring(0, 40) + "..."
          : item.secret
        : item.mood;
      const realIndex = history.length - 1 - idx;
      return `
      <div class="heart-history-item">
        <div class="heart-history-main" onclick="viewHeartDetail(${realIndex})">
          <div class="heart-history-preview">
            "${preview}"
          </div>
          <div class="heart-history-time">${time}</div>
        </div>
        <button class="heart-history-delete" onclick="event.stopPropagation();deleteHeartVoice(${realIndex})">✕</button>
      </div>
    `;
    })
    .join("");
}

// 删除心声历史
window.deleteHeartVoice = async function (index) {
  const charId = currentChatCharId;
  if (!window.heartVoiceData[charId]?.history) return;

  // 删除指定索引的心声
  window.heartVoiceData[charId].history.splice(index, 1);

  // 保存到本地
  await localforage.setItem("heartVoiceData", window.heartVoiceData);

  // 重新渲染历史列表
  const content = document.getElementById("heartVoiceContent");
  renderHeartHistory(content, charId);

  showToast("已删除");
};

// 查看历史心声详情
window.viewHeartDetail = function (index) {
  const charId = currentChatCharId;
  const charData = window.heartVoiceData[charId];
  const item = charData?.history?.[index];

  if (!item) return;

  const content = document.getElementById("heartVoiceContent");
  const time = new Date(item.timestamp).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  content.innerHTML = `
    <div style="margin-bottom:12px;">
      <button onclick="switchHeartTab('history')" style="background:none;border:none;color:#f48fb1;font-size:0.85rem;cursor:pointer;">← 返回列表</button>
    </div>
    <div class="heart-card">
      <div class="heart-card-section">
        <div class="heart-card-label">此刻的姿态</div>
        <div class="heart-card-value">${item.action || "..."}</div>
      </div>
      <div class="heart-card-section">
        <div class="heart-card-label">今日的装扮</div>
        <div class="heart-card-value">${item.outfit || "..."}</div>
      </div>
      <div class="heart-card-section">
        <div class="heart-card-label">当前心绪</div>
        <div class="heart-card-value">${item.mood || "..."}</div>
      </div>
      <div class="heart-card-section">
        <div class="heart-card-label">未说出口的话</div>
        <div class="heart-card-value heart-card-secret">${
          item.secret || "..."
        }</div>
      </div>
      <div class="heart-card-time">${time}</div>
    </div>
  `;
};

// 生成心声（在AI回复后调用）
async function generateHeartVoice(charId, aiResponse, userMessage) {
  try {
    const char = characters.find((c) => c.id === charId);
    if (!char) return;

    const charSettings = chatSettings[charId] || {};
    const persona = charSettings.persona || char.description || "";
    const charName = char.note || char.name || "AI";

    // 获取API配置
    let apiConfigToUse = null;
    if (charSettings.apiPreset) {
      apiConfigToUse = apiPresets.find((p) => p.id === charSettings.apiPreset);
    }
    if (!apiConfigToUse) {
      apiConfigToUse = apiPresets.find((p) => p.id === activePresetId);
    }
    if (!apiConfigToUse && apiPresets.length > 0) {
      apiConfigToUse = apiPresets[0];
    }

    if (!apiConfigToUse || !apiConfigToUse.key) {
      console.log("没有可用的API配置，跳过心声生成");
      return;
    }

    const systemPrompt = `你是一位细腻的文学作家，专门书写${charName}内心独白。你的任务是用散文般的笔触，描绘角色此刻最真实、最隐秘的内心世界。

【角色人设】
${persona || "(无特定人设)"}

【创作要求】
1. 必须完全代入角色，以角色的视角和心理来写作，绝不能脱离人设
2. 文字要细腻、有质感，像小说中的心理描写一样耐人寻味
3. 禁止使用任何emoji或颜文字
4. 每一段都要有画面感，让读者能够想象出场景
5. 语言风格要符合角色的性格和背景

【输出格式】
必须以JSON格式输出，包含以下4个字段：
{
  "action": "此刻的姿态（30-50字，用细腻的文字描绘角色此刻的动作、姿态、小习惯，要有画面感）",
  "outfit": "今日的装扮（30-50字，描写角色的穿着打扮，包括衣物的材质、颜色、细节，以及整体给人的感觉）",
  "mood": "当前心绪（用2-4个简洁的词语描述情绪，如：欣喜、害羞、忐忑、心动、失落、期待、紧张、安心、甜蜜、担忧等。不要写长句，不要用emoji）",
  "secret": "未说出口的话（50-80字，写出角色内心最想说却没有说出口的话，要符合角色性格，有情感张力，像是日记里的私语）"
}

只输出JSON，不要有任何其他内容。`;

    const userPrompt = `【对话场景】
用户对${charName}说："${userMessage}"

${charName}的回应："${aiResponse.substring(0, 300)}${
      aiResponse.length > 300 ? "..." : ""
    }"

请以${charName}的视角，用散文般的笔触，写出此刻的内心世界：`;

    // 确保URL格式正确
    let apiUrl = apiConfigToUse.url.replace(/\/$/, "");
    if (!apiUrl.endsWith("/chat/completions")) {
      if (apiUrl.endsWith("/v1")) {
        apiUrl += "/chat/completions";
      } else if (!apiUrl.includes("/chat/completions")) {
        apiUrl += "/v1/chat/completions";
      }
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiConfigToUse.key}`,
      },
      body: JSON.stringify({
        model: apiConfigToUse.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error("心声API请求失败:", response.status);
      return;
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim();

    if (!content) return;

    // 清理可能的markdown代码块
    content = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // 解析JSON
    let heartData;
    try {
      heartData = JSON.parse(content);
    } catch (e) {
      console.error("心声JSON解析失败:", content);
      return;
    }

    const heartVoice = {
      action: heartData.action || "",
      outfit: heartData.outfit || "",
      mood: heartData.mood || "",
      secret: heartData.secret || "",
      timestamp: Date.now(),
    };

    // 保存心声数据
    if (!window.heartVoiceData[charId]) {
      window.heartVoiceData[charId] = { current: null, history: [] };
    }

    // 如果有当前心声，移到历史
    if (window.heartVoiceData[charId].current) {
      window.heartVoiceData[charId].history.push(
        window.heartVoiceData[charId].current
      );
      // 只保留最近20条历史
      if (window.heartVoiceData[charId].history.length > 20) {
        window.heartVoiceData[charId].history.shift();
      }
    }

    window.heartVoiceData[charId].current = heartVoice;

    // 保存到本地
    await localforage.setItem("heartVoiceData", window.heartVoiceData);

    // 显示新心声提示
    const heartBtn = document.getElementById("heartVoiceBtn");
    if (heartBtn) {
      heartBtn.classList.add("has-new");
      // 3秒后移除提示
      setTimeout(() => heartBtn.classList.remove("has-new"), 3000);
    }

    console.log("心声生成成功:", heartVoice);
  } catch (error) {
    console.error("生成心声失败:", error);
  }
}

// 导出函数
window.generateHeartVoice = generateHeartVoice;

/* ==================== 修复：语音条无法多选的问题 ==================== */

// 1. 覆盖原有的 playVoiceMessage 函数
window.playVoiceMessage = async function (event, msgIndex) {
  // 【关键修复】检测是否处于多选模式
  if (typeof isSelectionMode !== "undefined" && isSelectionMode) {
    // 如果是多选模式：
    event.stopPropagation(); // 阻止事件扩散
    event.preventDefault(); // 阻止默认行为

    // 手动调用选中逻辑 (假装我们点击了气泡)
    if (typeof handleBubbleClick === "function") {
      handleBubbleClick(event, msgIndex);
    }
    return; // 直接退出，【不播放】音频
  }

  // --- 以下是原有的播放逻辑 ---
  event.stopPropagation();
  const voiceBar = event.currentTarget;
  playVoiceMessageByIndex(msgIndex, voiceBar);
};

// 2. 覆盖原有的 toggleVoiceText 函数 (防止点击"转文字"按钮也选中不了)
window.toggleVoiceText = function (event, msgIndex) {
  // 【关键修复】检测是否处于多选模式
  if (typeof isSelectionMode !== "undefined" && isSelectionMode) {
    event.stopPropagation();
    if (typeof handleBubbleClick === "function") {
      handleBubbleClick(event, msgIndex);
    }
    return; // 直接退出，不切换文字显示
  }

  // --- 以下是原有的转文字逻辑 ---
  event.stopPropagation();

  const history = chatHistories[currentChatCharId] || [];
  const msg = history[msgIndex];
  if (!msg) return;

  // 切换状态
  msg.voiceTextVisible = !msg.voiceTextVisible;
  localforage.setItem("chatHistories", chatHistories);

  // 更新UI
  const textEl = document.getElementById(`voiceText-${msgIndex}`);
  const btn = event.currentTarget;

  if (msg.voiceTextVisible) {
    textEl.classList.add("visible");
    btn.textContent = "收起文字";
  } else {
    textEl.classList.remove("visible");
    btn.textContent = "转文字";
  }
};
// ==================== 新增：更新列表预览文字 ====================
function updateCharacterLastMessage(charId, rawContent) {
  const charIndex = characters.findIndex((c) => c.id === charId);
  if (charIndex === -1) return;

  let previewText = rawContent;

  // 1. 判断是不是语音消息
  if (rawContent.match(/^\[语音[:：](.+)\]$/)) {
    previewText = "[语音]"; // 或者显示 "[语音] 文本内容"
  } else {
    // 2. 清洗 HTML 标签 (把 <i>心理</i> 变成纯文本)
    // 这一步很重要，否则列表会显示 <i>...</i>
    previewText = rawContent.replace(/<[^>]+>/g, "");

    // 3. 处理小说模式的标记 (把 *动作* 变成纯文本)
    previewText = previewText.replace(/\*/g, "");
  }

  // 更新数据
  characters[charIndex].lastMessage = previewText;
  characters[charIndex].lastTime = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  characters[charIndex].lastTimestamp = Date.now(); // 添加时间戳用于排序

  localforage.setItem("characters", characters);
  renderCharacters(); // 刷新列表界面
}
/* ==================== 底部菜单与表情功能 ==================== */
/* ==================== 全新：自定义表情包功能 (Pro Max版) ==================== */

// 全局变量
window.customStickers = []; // 存具体表情对象 {id, src, desc, category}
window.stickerCategories = []; // 存分类列表 ["默认", "开心", ...]
window.currentCategory = "默认";
window.aiStickerBindings = {}; // 每个角色绑定的分类 {charId: ["分类1", "分类2", ...]} // 当前选中的分类

// 1. 初始化加载
async function initStickerPanel() {
  try {
    // 读取数据
    const savedStickers = await safeLocalforageGet("customStickers");
    const savedCategories = await safeLocalforageGet("stickerCategories");

    // === 数据迁移逻辑 (防止旧用户报错) ===
    if (Array.isArray(savedStickers) && savedStickers.length > 0) {
      // 检查是不是旧的字符串格式
      if (typeof savedStickers[0] === "string") {
        console.log("正在迁移旧版表情包数据...");
        window.customStickers = savedStickers.map((src) => ({
          id: Date.now() + Math.random(),
          src: src,
          desc: "表情包", // 旧数据默认描述
          category: "默认",
        }));
      } else {
        window.customStickers = savedStickers;
      }
    } else {
      window.customStickers = [];
    }

    // 初始化分类
    window.stickerCategories = savedCategories || ["默认"];

    // 确保“默认”分类永远存在
    if (!window.stickerCategories.includes("默认")) {
      window.stickerCategories.unshift("默认");
    }

    // 编辑模式标记
    window.stickerEditMode = false;
    // 选中的表情包ID列表
    window.selectedStickerIds = [];
    // 搜索关键词
    window.stickerSearchKeyword = "";
    // AI绑定的分类（从本地存储读取）
    const savedAiCat = await safeLocalforageGet("aiStickerCategory");
    // AI绑定数据（新版：每个角色可绑定多个分类）
    const savedBindings = await safeLocalforageGet("aiStickerBindings");
    window.aiStickerBindings = savedBindings || {};

    // 迁移旧版单一绑定数据
    const oldSingleBinding = await safeLocalforageGet("aiStickerCategory");
    if (
      oldSingleBinding &&
      Object.keys(window.aiStickerBindings).length === 0
    ) {
      window.aiStickerBindings["__global__"] = [oldSingleBinding];
      await localforage.setItem("aiStickerBindings", window.aiStickerBindings);
      await localforage.removeItem("aiStickerCategory");
      console.log("已迁移旧版AI绑定数据");
    }
  } catch (e) {
    console.error("表情包加载失败", e);
    window.customStickers = [];
    window.stickerCategories = ["默认"];
    window.aiStickerBindings = {};
  }

  renderStickerPanel();
}

// 页面加载时启动
document.addEventListener("DOMContentLoaded", initStickerPanel);

// 2. 渲染整个面板 (分类栏 + 网格)
function renderStickerPanel() {
  renderCategoryBar();
  renderStickerGrid();
}

// 2.1 渲染分类栏
function renderCategoryBar() {
  const bar = document.getElementById("stickerCategoryBar");
  if (!bar) return;

  let html = "";
  const isEdit = window.stickerEditMode;
  const isSearching =
    window.stickerSearchKeyword && window.stickerSearchKeyword.trim() !== "";

  if (isEdit) {
    // 编辑模式：显示全选和删除按钮
    const currentStickers = window.customStickers.filter(
      (s) => s.category === window.currentCategory
    );
    const currentIds = currentStickers.map((s) => s.id);
    const selectedIds = window.selectedStickerIds || [];
    const allSelected =
      currentIds.length > 0 &&
      currentIds.every((id) => selectedIds.includes(id));

    html += `<button class="edit-action-btn select-all" onclick="toggleSelectAll()">${
      allSelected ? "取消全选" : "全选"
    }</button>`;
    html += `<button class="edit-action-btn delete-btn" id="batchDeleteBtn" onclick="deleteSelectedStickers()" ${
      selectedIds.length === 0 ? "disabled" : ""
    }>删除${
      selectedIds.length > 0 ? " (" + selectedIds.length + ")" : ""
    }</button>`;
    html += `<span class="edit-spacer"></span>`;
  }

  // 搜索模式下显示返回按钮
  if (isSearching && !isEdit) {
    html += `<button class="edit-action-btn" onclick="clearStickerSearch()" style="background:#fff3e0;color:#f57c00;">← 返回</button>`;
  }

  // 获取当前角色的绑定分类（确保使用字符串类型的charId）
  const charId = currentChatCharId ? String(currentChatCharId) : "__global__";
  const boundCategories = window.aiStickerBindings[charId] || [];

  // 渲染所有分类标签
  window.stickerCategories.forEach((cat) => {
    const activeClass = cat === window.currentCategory ? "active" : "";
    const aiClass = boundCategories.includes(cat) ? "ai-bound" : "";

    if (isEdit && cat !== "默认") {
      // 编辑模式：显示删除按钮
      html += `<div class="category-tab ${activeClass} ${aiClass} editing">
        <span onclick="switchCategory('${cat}')">${cat}</span>
        <span class="cat-delete-btn" onclick="event.stopPropagation();deleteCategory('${cat}')">✕</span>
      </div>`;
    } else if (isEdit && cat === "默认") {
      html += `<div class="category-tab ${activeClass} ${aiClass}" onclick="switchCategory('${cat}')">${cat}</div>`;
    } else {
      html += `<div class="category-tab ${activeClass} ${aiClass}" onclick="switchCategory('${cat}')">${cat}</div>`;
    }
  });

  // 非编辑模式显示添加分类按钮和AI绑定按钮（群聊中不显示AI绑定按钮）
  if (!isEdit && !isSearching) {
    html += `<button class="category-add-btn" onclick="addCategory()">＋</button>`;
    // AI绑定按钮（简洁风格）- 群聊中不显示
    if (!currentGroupId) {
      const hasBindings = boundCategories.length > 0;
      html += `<button class="ai-bind-btn ${
        hasBindings ? "has-bindings" : ""
      }" onclick="openAiBindModal()">
        ⊕ ${hasBindings ? boundCategories.length : ""}
      </button>`;
    }
  }

  // 编辑按钮
  if (!isSearching) {
    const editBtnText = isEdit ? "完成" : "编辑";
    html += `<button class="category-edit-btn" onclick="toggleStickerEditMode()">${editBtnText}</button>`;
  }

  bar.innerHTML = html;
}

// 2.2 渲染表情网格
function renderStickerGrid() {
  const grid = document.getElementById("stickerGrid");
  if (!grid) return;

  const isEdit = window.stickerEditMode;
  const selectedIds = window.selectedStickerIds || [];
  const keyword = (window.stickerSearchKeyword || "").trim().toLowerCase();
  const isSearching = keyword !== "";

  let stickersToShow;

  if (isSearching) {
    // 搜索模式：搜索所有分类
    stickersToShow = window.customStickers.filter((s) =>
      (s.desc || "").toLowerCase().includes(keyword)
    );
  } else {
    // 正常模式：只显示当前分类
    stickersToShow = window.customStickers.filter(
      (s) => s.category === window.currentCategory
    );
  }

  let html = "";

  // 非编辑模式且非搜索模式才显示导入按钮
  if (!isEdit && !isSearching) {
    // 按钮：导入
    html += `
    <div class="sticker-item" onclick="document.getElementById('stickerInput').click()">
        <div class="sticker-add-btn">
            <div class="sticker-add-icon">📂</div>
            <div class="sticker-add-text">导入</div>
        </div>
        <div class="sticker-desc">支持相册/TXT</div>
    </div>
`;

    // 按钮：粘贴链接
    html += `
    <div class="sticker-item" onclick="importStickersFromUrl()">
        <div class="sticker-add-btn">
            <div class="sticker-add-icon">⊕</div>
            <div class="sticker-add-text">链接</div>
        </div>
        <div class="sticker-desc">网络图片</div>
    </div>
`;
  }

  // 搜索结果为空提示
  if (isSearching && stickersToShow.length === 0) {
    html += `<div class="sticker-empty-hint">没有找到"${keyword}"相关的表情包</div>`;
  }

  // 渲染表情列表 (倒序，新的在前)
  stickersToShow
    .slice()
    .reverse()
    .forEach((sticker) => {
      if (isEdit) {
        // 编辑模式：显示选择框
        const isSelected = selectedIds.includes(sticker.id);
        const selectedClass = isSelected ? "selected" : "";
        html += `
        <div class="sticker-item editing ${selectedClass}" onclick="toggleStickerSelect('${
          sticker.id
        }')">
            <div class="sticker-img-box">
                <img src="${sticker.src}" loading="lazy">
                <div class="sticker-select-mark">${isSelected ? "✓" : ""}</div>
            </div>
            <div class="sticker-desc">${sticker.desc || "表情"}</div>
        </div>
    `;
      } else {
        // 正常模式
        html += `
        <div class="sticker-item" 
             onclick="sendSticker('${sticker.id}')">
            <div class="sticker-img-box">
                <img src="${sticker.src}" loading="lazy">
            </div>
            <div class="sticker-desc">${sticker.desc || "表情"}</div>
        </div>
    `;
      }
    });

  grid.innerHTML = html;
}

// 3. 切换分类
function switchCategory(cat) {
  window.currentCategory = cat;
  renderStickerPanel();
}

// 4. 添加新分类
async function addCategory() {
  const name = prompt("请输入新分类名称（如：猫猫头）：");
  if (!name) return;

  if (window.stickerCategories.includes(name)) {
    alert("这个分类已经有了！");
    return;
  }

  window.stickerCategories.push(name);
  await localforage.setItem("stickerCategories", window.stickerCategories);

  // 自动切换到新分类
  switchCategory(name);
}

// 5. 删除分类
async function deleteCategory(cat) {
  if (cat === "默认") return;

  if (
    confirm(
      `确定要删除分类"${cat}"吗？
该分类下的表情包会移动到"默认"分类。`
    )
  ) {
    // 把该分类下的表情移动到默认
    window.customStickers.forEach((s) => {
      if (s.category === cat) s.category = "默认";
    });

    // 移除分类
    window.stickerCategories = window.stickerCategories.filter(
      (c) => c !== cat
    );

    // 保存
    await Promise.all([
      localforage.setItem("customStickers", window.customStickers),
      localforage.setItem("stickerCategories", window.stickerCategories),
    ]);

    // 切换回默认
    switchCategory("默认");
    showToast("分类已删除");
  }
}

// 切换编辑模式
function toggleStickerEditMode() {
  window.stickerEditMode = !window.stickerEditMode;
  // 退出编辑模式时清空选中
  if (!window.stickerEditMode) {
    window.selectedStickerIds = [];
  }
  renderStickerPanel();
}

// 切换选中状态
function toggleStickerSelect(id) {
  const numId = Number(id);
  if (!window.selectedStickerIds) {
    window.selectedStickerIds = [];
  }
  const idx = window.selectedStickerIds.indexOf(numId);
  if (idx === -1) {
    window.selectedStickerIds.push(numId);
  } else {
    window.selectedStickerIds.splice(idx, 1);
  }
  renderStickerGrid();
  updateDeleteBtnState();
}

// 全选/取消全选当前分类的表情
function toggleSelectAll() {
  const currentStickers = window.customStickers.filter(
    (s) => s.category === window.currentCategory
  );
  const currentIds = currentStickers.map((s) => s.id);

  // 检查是否已全选
  const allSelected = currentIds.every(
    (id) => window.selectedStickerIds && window.selectedStickerIds.includes(id)
  );

  if (allSelected) {
    // 取消全选：移除当前分类的所有id
    window.selectedStickerIds = (window.selectedStickerIds || []).filter(
      (id) => !currentIds.includes(id)
    );
  } else {
    // 全选：添加当前分类的所有id
    if (!window.selectedStickerIds) window.selectedStickerIds = [];
    currentIds.forEach((id) => {
      if (!window.selectedStickerIds.includes(id)) {
        window.selectedStickerIds.push(id);
      }
    });
  }
  renderStickerGrid();
  updateDeleteBtnState();
}

// 更新删除按钮状态
function updateDeleteBtnState() {
  const btn = document.getElementById("batchDeleteBtn");
  const count = (window.selectedStickerIds || []).length;
  if (btn) {
    btn.textContent = count > 0 ? `删除 (${count})` : "删除";
    btn.disabled = count === 0;
  }
}

// 批量删除选中的表情包
async function deleteSelectedStickers() {
  const count = (window.selectedStickerIds || []).length;
  if (count === 0) {
    showToast("请先选择表情包");
    return;
  }

  if (!confirm(`确定要删除选中的 ${count} 个表情包吗？`)) return;

  window.customStickers = window.customStickers.filter(
    (s) => !window.selectedStickerIds.includes(s.id)
  );
  await localforage.setItem("customStickers", window.customStickers);
  window.selectedStickerIds = [];
  renderStickerGrid();
  updateDeleteBtnState();
  showToast(`已删除 ${count} 个表情包`);
}

// 删除单个表情包（保留兼容）
async function deleteStickerById(id) {
  // 转换为数字类型进行比较（因为id是Date.now()+Math.random()生成的数字）
  const numId = Number(id);
  window.customStickers = window.customStickers.filter((s) => s.id !== numId);
  await localforage.setItem("customStickers", window.customStickers);
  // 同时从选中列表移除
  if (window.selectedStickerIds) {
    window.selectedStickerIds = window.selectedStickerIds.filter(
      (id) => id !== numId
    );
  }
  renderStickerGrid();
  showToast("已删除");
}

// ==================== 搜索功能 ====================
function handleStickerSearch(value) {
  window.stickerSearchKeyword = value;
  // 显示/隐藏清除按钮
  const clearBtn = document.getElementById("stickerSearchClear");
  if (clearBtn) {
    clearBtn.classList.toggle("show", value.trim() !== "");
  }
  renderStickerPanel();
}

function clearStickerSearch() {
  window.stickerSearchKeyword = "";
  const input = document.getElementById("stickerSearchInput");
  if (input) input.value = "";
  const clearBtn = document.getElementById("stickerSearchClear");
  if (clearBtn) clearBtn.classList.remove("show");
  renderStickerPanel();
}

// ==================== AI表情包绑定功能（新版：多分类+每角色）====================

// 打开AI绑定弹窗
function openAiBindModal() {
  // 检查是否在对话中（确保使用字符串类型的charId）
  const charId = currentChatCharId ? String(currentChatCharId) : null;
  const charName = charId
    ? characters.find((c) => String(c.id) === charId)?.name || "当前角色"
    : null;

  // 获取当前角色的绑定（注意：要深拷贝，避免引用问题）
  const currentBindings = window.aiStickerBindings[charId] || [];
  const boundCategories = [...currentBindings]; // 深拷贝

  // 保存当前正在编辑的角色ID和初始选中状态
  window._tempAiBindCharId = charId;
  window._tempAiBindCategories = [...boundCategories];

  console.log("打开绑定弹窗 - 角色ID:", charId, "当前绑定:", boundCategories);

  // 创建弹窗HTML
  let modalHtml = `
    <div class="ai-bind-modal-overlay" id="aiBindModalOverlay" onclick="if(event.target===this)closeAiBindModal()">
      <div class="ai-bind-modal">
        <div class="ai-bind-modal-header">
          <div>
            <div class="ai-bind-modal-title">⊕ 绑定表情包</div>
            <div class="ai-bind-modal-subtitle">${
              charName ? `为「${charName}」选择表情包` : "请先打开一个对话"
            }</div>
          </div>
          <button class="ai-bind-modal-close" onclick="closeAiBindModal()">✕</button>
        </div>
        <div class="ai-bind-modal-body">
  `;

  if (!charId) {
    modalHtml += `<div class="ai-bind-empty-hint">💡 请先进入一个角色的对话，<br>然后再来绑定表情包</div>`;
  } else if (window.stickerCategories.length === 0) {
    modalHtml += `<div class="ai-bind-empty-hint">暂无表情分类<br>请先添加一些表情包</div>`;
  } else {
    modalHtml += `<div class="ai-bind-char-hint">💡 每个角色可以绑定不同的表情包分类</div>`;

    window.stickerCategories.forEach((cat) => {
      const count = window.customStickers.filter(
        (s) => s.category === cat
      ).length;
      const isSelected = boundCategories.includes(cat);
      modalHtml += `
        <div class="ai-bind-category-item ${
          isSelected ? "selected" : ""
        }" onclick="toggleAiBindCategory('${cat}')">
          <div class="ai-bind-category-checkbox">${isSelected ? "✓" : ""}</div>
          <div class="ai-bind-category-info">
            <div class="ai-bind-category-name">${cat}</div>
            <div class="ai-bind-category-count">${count} 个表情</div>
          </div>
        </div>
      `;
    });
  }

  modalHtml += `
        </div>
        <div class="ai-bind-modal-footer">
          <button class="ai-bind-modal-btn cancel" onclick="closeAiBindModal()">取消</button>
          <button class="ai-bind-modal-btn confirm" onclick="saveAiBindings()" ${
            !charId ? "disabled" : ""
          }>确定</button>
        </div>
      </div>
    </div>
  `;

  // 移除旧弹窗（如果存在）
  const oldModal = document.getElementById("aiBindModalOverlay");
  if (oldModal) oldModal.remove();

  // 插入弹窗
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  // 显示弹窗
  setTimeout(() => {
    document.getElementById("aiBindModalOverlay").classList.add("active");
  }, 10);
}

// 关闭AI绑定弹窗
function closeAiBindModal() {
  const modal = document.getElementById("aiBindModalOverlay");
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => modal.remove(), 200);
  }
  // 清理所有临时变量
  window._tempAiBindCategories = null;
  window._tempAiBindCharId = null;
}

// 切换分类选中状态
function toggleAiBindCategory(cat) {
  if (!window._tempAiBindCategories) window._tempAiBindCategories = [];

  const index = window._tempAiBindCategories.indexOf(cat);
  if (index > -1) {
    window._tempAiBindCategories.splice(index, 1);
  } else {
    window._tempAiBindCategories.push(cat);
  }

  // 更新UI
  const items = document.querySelectorAll(".ai-bind-category-item");
  items.forEach((item) => {
    const name = item.querySelector(".ai-bind-category-name").textContent;
    const isSelected = window._tempAiBindCategories.includes(name);
    item.classList.toggle("selected", isSelected);
    item.querySelector(".ai-bind-category-checkbox").textContent = isSelected
      ? "✓"
      : "";
  });
}

// 保存绑定
async function saveAiBindings() {
  // 使用打开弹窗时保存的角色ID，而不是当前可能已改变的角色ID
  const charId = window._tempAiBindCharId;
  if (!charId) {
    showToast("请先打开一个对话");
    return;
  }

  const selectedCategories = window._tempAiBindCategories || [];

  console.log("保存绑定 - 角色ID:", charId, "选中分类:", selectedCategories);
  console.log("保存前的绑定数据:", JSON.stringify(window.aiStickerBindings));

  // 更新绑定（使用字符串charId作为键，深拷贝数组）
  if (selectedCategories.length > 0) {
    window.aiStickerBindings[charId] = [...selectedCategories];
  } else {
    delete window.aiStickerBindings[charId];
  }

  console.log("保存后的绑定数据:", JSON.stringify(window.aiStickerBindings));

  // 保存到本地存储
  await localforage.setItem("aiStickerBindings", window.aiStickerBindings);

  // 统计表情数量
  const totalCount = selectedCategories.reduce((sum, cat) => {
    return sum + window.customStickers.filter((s) => s.category === cat).length;
  }, 0);

  if (selectedCategories.length > 0) {
    showToast(
      `已绑定 ${selectedCategories.length} 个分类（${totalCount} 个表情）`
    );
  } else {
    showToast("已清除表情包绑定");
  }

  closeAiBindModal();
  renderCategoryBar();
}

// 获取AI可用的表情包列表（供AI调用）- 新版支持多分类
function getAiStickers() {
  // 确保使用字符串类型的charId
  const charId = currentChatCharId ? String(currentChatCharId) : "__global__";
  const boundCategories = window.aiStickerBindings[charId] || [];

  if (boundCategories.length === 0) return [];

  return window.customStickers.filter((s) =>
    boundCategories.includes(s.category)
  );
}

// AI发送表情包（根据描述匹配）
function getAiStickerByKeyword(keyword) {
  const stickers = getAiStickers();
  if (stickers.length === 0) return null;

  // 优先精确匹配
  let match = stickers.find(
    (s) => s.desc && s.desc.toLowerCase() === keyword.toLowerCase()
  );
  if (match) return match;

  // 模糊匹配
  match = stickers.find(
    (s) => s.desc && s.desc.toLowerCase().includes(keyword.toLowerCase())
  );
  if (match) return match;

  // 随机返回一个
  return stickers[Math.floor(Math.random() * stickers.length)];
}

// 处理AI回复中的表情包标签 [sticker:xxx]
function processAiStickerTags(text) {
  if (!text) return text;

  // 匹配 [sticker:xxx] 或 [表情:xxx] 或 [表情包:xxx] 格式
  const stickerRegex = /\[(sticker|表情|表情包)[：:]\s*([^\]]+)\]/gi;

  return text.replace(stickerRegex, (match, type, keyword) => {
    const sticker = getAiStickerByKeyword(keyword.trim());
    if (sticker) {
      return `<img src="${sticker.src}" class="sticker-img" alt="${
        sticker.desc || "表情"
      }" onclick="showFullImage('${sticker.src}')">`;
    }
    // 如果找不到匹配的表情包，返回原文本
    return match;
  });
}

// 生成AI表情包提示词（用于发送给AI的system prompt）
function generateAiStickerPrompt() {
  const stickers = getAiStickers();
  if (stickers.length === 0) return "";

  const stickerList = stickers.map((s) => s.desc || "表情").join("、");
  return `\n\n【表情包功能】你可以在回复中使用表情包来表达情绪！使用格式：[sticker:表情名称]
可用的表情包有：${stickerList}
例如：[sticker:开心] 或 [sticker:害羞]
请根据对话情境自然地使用表情包，但不要过度使用。`;
}

// 6. 导入逻辑 (升级版：支持自动识别 TXT 描述)
async function handleStickerImport(input) {
  const files = Array.from(input.files);
  if (files.length === 0) return;

  // 默认描述（仅作为兜底）
  let fallbackDesc = null;

  let addedCount = 0;
  showToast("正在处理...");

  for (const file of files) {
    let newStickers = [];

    // === 情况A: TXT文件 (智能解析) ===
    if (file.name.endsWith(".txt") || file.type === "text/plain") {
      const text = await readFileAsText(file);
      // 使用新写的解析函数
      const parsedItems = parseStickersFromText(text);

      // 检查是否需要兜底描述（如果解析出来的 desc 都是空的）
      const needFallback = parsedItems.some((item) => !item.desc);
      if (needFallback && !fallbackDesc) {
        fallbackDesc =
          prompt(`部分图片未识别到名称，请输入默认描述：`, "表情包") ||
          "表情包";
      }

      newStickers = parsedItems.map((item) => ({
        id: Date.now() + Math.random(),
        src: item.src,
        desc: item.desc || fallbackDesc, // 优先用文件里的，没有则用兜底
        category: window.currentCategory,
      }));
    }
    // === 情况B: 图片文件 (相册上传) ===
    else if (file.type.startsWith("image/")) {
      // 图片肯定没有描述，必须问一次
      if (!fallbackDesc) {
        fallbackDesc =
          prompt(
            `正在导入到【${window.currentCategory}】分类。\n请输入这些表情的意思：`,
            "表情包"
          ) || "表情包";
      }
      try {
        const compressedData = await compressImage(file, 200, 0.7);
        newStickers.push({
          id: Date.now() + Math.random(),
          src: compressedData,
          desc: fallbackDesc,
          category: window.currentCategory,
        });
      } catch (e) {
        console.error(e);
      }
    }

    if (newStickers.length > 0) {
      window.customStickers.push(...newStickers);
      addedCount += newStickers.length;
    }
  }

  if (addedCount > 0) {
    await localforage.setItem("customStickers", window.customStickers);
    renderStickerGrid();
    showToast(`成功导入 ${addedCount} 个表情！`);
  } else {
    showToast("未找到有效内容");
  }

  input.value = "";
}

// 7. 粘贴链接导入 (升级版：支持 关键词：URL 格式)
function importStickersFromUrl() {
  const text = prompt("请粘贴内容（支持 '关键词：URL' 格式，一行一个）：");
  if (!text) return;

  // 1. 智能解析
  const parsedItems = parseStickersFromText(text);

  if (parsedItems.length === 0) {
    showToast("未检测到有效链接");
    return;
  }

  // 2. 检查是否有缺失描述的项
  let fallbackDesc = null;
  const needFallback = parsedItems.some((item) => !item.desc);

  if (needFallback) {
    fallbackDesc =
      prompt("部分链接没有写描述，请输入默认意思：", "表情包") || "表情包";
  }

  // 3. 构建数据
  const newStickers = parsedItems.map((item) => ({
    id: Date.now() + Math.random(),
    src: item.src,
    desc: item.desc || fallbackDesc,
    category: window.currentCategory,
  }));

  window.customStickers.push(...newStickers);
  localforage.setItem("customStickers", window.customStickers);
  renderStickerGrid();
  showToast(`成功添加 ${newStickers.length} 个表情`);
}

// 8. 发送表情 (微信风格版)
async function sendSticker(stickerId) {
  const sticker = window.customStickers.find((s) => s.id == stickerId);
  if (!sticker) return;

  // 检查是否在群聊中
  if (currentGroupId) {
    // 群聊发送表情包
    await sendGroupSticker(sticker);
    closeChatPanel();
    return;
  }

  // 单聊发送表情包
  // 构造 HTML：加上 class="sticker-img"
  const hiddenDesc = `<span style="display:none">[表情包：${sticker.desc}]</span>`;
  const imgHtml = `<img src="${sticker.src}" class="sticker-img" onclick="showFullImage(this.src)">`;
  const finalContent = `${hiddenDesc}${imgHtml}`;

  // 发送（等待完成）
  await sendRichMessage(finalContent, `[表情包] ${sticker.desc}`);

  // 发送后关闭面板 (可选)
  closeChatPanel();
}

// 群聊发送表情包
async function sendGroupSticker(sticker) {
  if (!currentGroupId) return;

  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  const messagesKey = `group_messages_${currentGroupId}`;
  const messages = (await localforage.getItem(messagesKey)) || [];

  // 构造表情包HTML
  const hiddenDesc = `<span style="display:none">[表情包：${sticker.desc}]</span>`;
  const imgHtml = `<img src="${sticker.src}" class="sticker-img" onclick="showFullImage(this.src)">`;
  const finalContent = `${hiddenDesc}${imgHtml}`;

  // 添加用户消息
  const userMsg = {
    role: "user",
    content: finalContent,
    isHtml: true,
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
  messages.push(userMsg);
  await localforage.setItem(messagesKey, messages);

  // 重新渲染
  loadGroupMessages(currentGroupId);

  // 更新群聊最后消息
  group.lastMessage = `[表情包] ${sticker.desc}`;
  group.lastTime = "刚刚";
  await localforage.setItem("groupChats", groupChats);
  renderCharacters();
}

// 9. 编辑/删除表情 (右键或长按)
async function editSticker(event, stickerId) {
  event.preventDefault();
  const stickerIndex = window.customStickers.findIndex(
    (s) => s.id == stickerId
  );
  if (stickerIndex === -1) return;

  const action = prompt(
    "请输入新的描述（清空则删除该表情）：",
    window.customStickers[stickerIndex].desc
  );

  if (action === null) return; // 取消

  if (action.trim() === "") {
    // 删除
    window.customStickers.splice(stickerIndex, 1);
    showToast("表情已删除");
  } else {
    // 修改描述
    window.customStickers[stickerIndex].desc = action.trim();
    showToast("描述已更新");
  }

  await localforage.setItem("customStickers", window.customStickers);
  renderStickerGrid();
}

// 🆕 新增：通用的富文本发送函数 (替代 sendMediaMessage 的部分功能)
async function sendRichMessage(htmlContent, previewText) {
  if (!currentChatCharId) {
    console.warn("sendRichMessage: currentChatCharId is null");
    return;
  }

  if (!chatHistories[currentChatCharId]) chatHistories[currentChatCharId] = [];

  const msgObj = {
    role: "user",
    content: htmlContent, // 这里面包含了 <span style="display:none">描述</span>
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    isHtml: true,
  };

  chatHistories[currentChatCharId].push(msgObj);

  // 等待保存完成再渲染
  await localforage.setItem("chatHistories", chatHistories);

  renderConversation();
  updateCharacterLastMessage(currentChatCharId, previewText);
}

// 复用辅助函数
function readFileAsText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsText(file);
  });
}
function extractUrlsFromText(text) {
  const regex = /(https?:\/\/[^\s"']+)/g;
  const matches = text.match(regex);
  return matches ? [...new Set(matches)].filter((u) => u.length > 10) : [];
}
/* ==================== 补回：面板切换逻辑 ==================== */
/* ==================== 修复版：面板切换逻辑 ==================== */

// 1. 切换面板 (加号面板 vs 表情面板)
function toggleChatPanel(type) {
  const plusPanel = document.getElementById("plusPanel");
  const emojiPanel = document.getElementById("emojiPanel");
  const inputArea = document.getElementById("convInput");

  // 只要点了按钮，就先收起键盘
  if (inputArea) inputArea.blur();

  if (type === "plus") {
    // 如果加号面板已经开了 -> 关闭它
    if (plusPanel.classList.contains("open")) {
      closeChatPanel();
    }
    // 如果没开 -> 打开它，并关闭表情面板
    else {
      plusPanel.classList.add("open");
      emojiPanel.classList.remove("open");
      setTimeout(scrollToBottom, 300);
    }
  } else if (type === "emoji") {
    // 如果表情面板已经开了 -> 关闭它
    if (emojiPanel.classList.contains("open")) {
      closeChatPanel();
    }
    // 如果没开 -> 打开它，并关闭加号面板
    else {
      emojiPanel.classList.add("open");
      plusPanel.classList.remove("open");
      // 重新渲染分类栏（确保群聊中不显示绑定按钮）
      renderCategoryBar();
      setTimeout(scrollToBottom, 300);
    }
  }
}

// 2. 关闭所有面板 (点击空白处调用)
function closeChatPanel() {
  const plusPanel = document.getElementById("plusPanel");
  const emojiPanel = document.getElementById("emojiPanel");

  let isClosed = true;

  if (plusPanel && plusPanel.classList.contains("open")) {
    plusPanel.classList.remove("open");
    isClosed = false;
  }
  if (emojiPanel && emojiPanel.classList.contains("open")) {
    emojiPanel.classList.remove("open");
    isClosed = false;
  }

  // 如果本来就是关着的，就不需要做额外操作
  if (!isClosed) {
    // 可以加一些其他的复位逻辑
  }
}
// 3. 辅助：滚动到底部
function scrollToBottom() {
  const container = document.getElementById("convMessages");
  if (container) container.scrollTop = container.scrollHeight;
}
// 4. 发送图片功能
async function handleChatImageUpload(input) {
  const file = input.files[0];
  if (!file) return;

  // 压缩图片
  const compressedData = await compressImage(file, 800, 0.8);

  // 发送图片消息
  sendMediaMessage(compressedData, "image");

  // 关闭面板
  closeChatPanel();
  // 清空 input 否则无法连续发同一张图
  input.value = "";
}

// 通用媒体消息发送函数
function sendMediaMessage(content, type) {
  if (!chatHistories[currentChatCharId]) chatHistories[currentChatCharId] = [];

  let msgContent = content;
  if (type === "image") {
    msgContent = `<img src="${content}" class="msg-img" onclick="showFullImage(this.src)">`;
  }

  const msgObj = {
    role: "user",
    content: msgContent,
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    // 标记这是一个富文本/HTML消息，可以特殊处理
    isHtml: true,
  };

  chatHistories[currentChatCharId].push(msgObj);
  localforage.setItem("chatHistories", chatHistories);

  renderConversation();
  updateCharacterLastMessage(
    currentChatCharId,
    type === "image" ? "[图片]" : "[消息]"
  );
}

// 查看大图 (简单的全屏预览)
function showFullImage(src) {
  // 多选模式下不放大图片
  if (typeof isSelectionMode !== "undefined" && isSelectionMode) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.style.cssText = `
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.9); z-index: var(--z-toast);
  display: flex; align-items: center; justify-content: center;
  animation: fadeIn 0.2s;
    `;
  overlay.onclick = () => overlay.remove();

  const img = document.createElement("img");
  img.src = src;
  img.style.cssText = `max-width: 100%; max-height: 100%; object-fit: contain;`;

  overlay.appendChild(img);
  document.body.appendChild(overlay);
}

// 5. 模拟功能：发红包
function sendRedPacket() {
  const amount = (Math.random() * 200).toFixed(2);
  const html = `
  <div style="background:#fa9d3b; padding:12px 16px; border-radius:10px; display:flex; align-items:center; gap:12px; min-width:200px; cursor:pointer;" onclick="alert('领取了 ${amount} 元！')">
      <div style="background:#fce6c5; width:36px; height:36px; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:20px;">🧧</div>
      <div style="color:white; font-size:0.95rem;">
          <div>恭喜发财，大吉大利</div>
          <div style="font-size:0.7rem; opacity:0.8; margin-top:2px;">微信红包</div>
      </div>
  </div>
    `;
  sendMediaMessage(html, "redpacket");
  closeChatPanel();
}

// 6. 模拟功能：拍一拍
function sendNudge() {
  closeChatPanel();
  // 拍一拍通常是系统提示，不作为一条普通消息
  const container = document.getElementById("convMessages");
  const html = `<div class="msg-system-tip">你拍了拍 "对方" 的脑袋</div>`;
  container.insertAdjacentHTML("beforeend", html);
  container.scrollTop = container.scrollHeight;

  // 如果你想让AI回应，可以伪造一条 AI 消息
  // setTimeout(() => { ... }, 1000);
}

// 7. 模拟功能：拍照/位置
function handleCameraAction() {
  alert("相机功能开发中... (可使用相册发图)");
}

/* ==================== 图片消息功能 ==================== */
// 打开发送图片选择弹窗
function openSendImageModal() {
  closeChatPanel();
  document.getElementById("sendImageModal").classList.add("active");
}

// 关闭发送图片选择弹窗
function closeSendImageModal() {
  document.getElementById("sendImageModal").classList.remove("active");
}

// 选择真实图片（支持相册、拍照、文件）
function selectRealImage() {
  closeSendImageModal();
  document.getElementById("realImageInput").click();
}

// 处理选择的图片
async function handleRealImageSelect(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    try {
      const compressedData = await compressImage(file, 600, 0.7);
      sendRealImage(compressedData);
    } catch (e) {
      // 压缩失败时直接读取
      const reader = new FileReader();
      reader.onload = function (e) {
        sendRealImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
    input.value = "";
  }
}

// 发送真实图片
async function sendRealImage(dataUrl) {
  // 检查是否在群聊中
  if (currentGroupId) {
    // 群聊发送真实图片
    const group = groupChats.find((g) => g.id === currentGroupId);
    if (!group) {
      showToast("群聊不存在");
      return;
    }

    const messagesKey = `group_messages_${currentGroupId}`;
    const messages = (await localforage.getItem(messagesKey)) || [];

    const msgObj = {
      role: "user",
      type: "image",
      imageType: "real",
      imageData: dataUrl,
      content: "[用户发送了一张图片]",
      time: new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    messages.push(msgObj);
    await localforage.setItem(messagesKey, messages);

    // 更新群聊最后消息
    group.lastMessage = "[图片]";
    group.lastTime = "刚刚";
    await localforage.setItem("groupChats", groupChats);

    loadGroupMessages(currentGroupId);
    renderCharacters();
    showToast("图片已发送");
    return;
  }

  // 单聊发送真实图片（原有逻辑）
  if (!currentChatCharId) {
    showToast("请先打开一个对话");
    return;
  }

  if (!chatHistories[currentChatCharId]) {
    chatHistories[currentChatCharId] = [];
  }

  const msgObj = {
    role: "user",
    type: "image",
    imageType: "real",
    imageData: dataUrl,
    content: "[用户发送了一张图片]",
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  chatHistories[currentChatCharId].push(msgObj);
  localforage.setItem("chatHistories", chatHistories);
  renderConversation();
  updateCharacterLastMessage(currentChatCharId, "[图片]");
  showToast("图片已发送");
}

// 打开描述图编辑弹窗
function openDescImageModal() {
  closeSendImageModal();
  const modal = document.getElementById("imageDescModal");
  const title = document.getElementById("imageDescTitle");
  const text = document.getElementById("imageDescText");
  const input = document.getElementById("imageDescInput");
  const footer = document.getElementById("imageDescFooter");
  const preview = document.getElementById("imageDescPreview");

  title.textContent = "发送描述图";
  text.style.display = "none";
  input.style.display = "block";
  input.value = "";
  footer.style.display = "flex";
  preview.style.display = "block"; // 编辑模式显示预览图标
  preview.innerHTML = `
    <div class="image-desc-preview-icon">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
      <span style="font-size:0.8rem;color:#66bb6a;">描述图片内容</span>
    </div>
  `;

  modal.classList.add("active");
  modal.dataset.mode = "edit";
}
// 确认发送描述图
async function confirmSendDescImage() {
  const input = document.getElementById("imageDescInput");
  const desc = input.value.trim();

  if (!desc) {
    showToast("请输入图片描述");
    return;
  }

  // 检查是否在群聊中
  if (currentGroupId) {
    // 群聊发送描述图
    const group = groupChats.find((g) => g.id === currentGroupId);
    if (!group) {
      showToast("群聊不存在");
      return;
    }

    const messagesKey = `group_messages_${currentGroupId}`;
    const messages = (await localforage.getItem(messagesKey)) || [];

    const msgObj = {
      role: "user",
      type: "image",
      imageType: "placeholder",
      imageDesc: desc,
      content: "[用户发送了一张图片: " + desc + "]",
      time: new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    messages.push(msgObj);
    await localforage.setItem(messagesKey, messages);

    // 更新群聊最后消息
    group.lastMessage = "[图片]";
    group.lastTime = "刚刚";
    await localforage.setItem("groupChats", groupChats);

    loadGroupMessages(currentGroupId);
    renderCharacters();

    closeImageDescModal();
    showToast("描述图已发送");
    return;
  }

  // 单聊发送描述图（原有逻辑保持不变）
  if (!currentChatCharId) {
    showToast("请先打开一个对话");
    return;
  }

  if (!chatHistories[currentChatCharId]) {
    chatHistories[currentChatCharId] = [];
  }

  const msgObj = {
    role: "user",
    type: "image",
    imageType: "placeholder",
    imageDesc: desc,
    content: "[用户发送了一张图片: " + desc + "]",
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  chatHistories[currentChatCharId].push(msgObj);
  localforage.setItem("chatHistories", chatHistories);
  renderConversation();
  updateCharacterLastMessage(currentChatCharId, "[图片]");

  closeImageDescModal();
  showToast("描述图已发送");
}

// 关闭图片描述弹窗
function closeImageDescModal() {
  document.getElementById("imageDescModal").classList.remove("active");
}

// 查看图片描述（点击占位图时调用）
function viewImageDescription(desc, isAi) {
  const modal = document.getElementById("imageDescModal");
  const title = document.getElementById("imageDescTitle");
  const text = document.getElementById("imageDescText");
  const input = document.getElementById("imageDescInput");
  const footer = document.getElementById("imageDescFooter");
  const preview = document.getElementById("imageDescPreview");

  title.textContent = isAi ? "AI发送的图片" : "你发送的图片";
  text.textContent = desc;
  text.style.display = "block";
  input.style.display = "none";
  footer.style.display = "none";
  preview.style.display = "none"; // 隐藏占位符

  modal.classList.add("active");
  modal.dataset.mode = "view";
}

// 查看Moment图片描述
function viewMomentImageDesc(desc) {
  const modal = document.getElementById("imageDescModal");
  const title = document.getElementById("imageDescTitle");
  const text = document.getElementById("imageDescText");
  const input = document.getElementById("imageDescInput");
  const footer = document.getElementById("imageDescFooter");
  const preview = document.getElementById("imageDescPreview");

  title.textContent = "图片描述";
  text.textContent = desc;
  text.style.display = "block";
  input.style.display = "none";
  footer.style.display = "none";
  preview.style.display = "none"; // 隐藏占位符

  modal.classList.add("active");
  modal.dataset.mode = "view";
}

// 查看真实图片
function viewRealImage(imageData) {
  const modal = document.getElementById("imageViewModal");
  const img = document.getElementById("imageViewImg");
  img.src = imageData;
  modal.classList.add("active");
}

// 关闭图片查看弹窗
function closeImageViewModal() {
  document.getElementById("imageViewModal").classList.remove("active");
}

/* ==================== 语音/视频通话功能 ==================== */
var callState = {
  active: false,
  type: "voice", // 'voice' or 'video'
  status: "idle", // 'idle', 'calling', 'incoming', 'connected'
  charId: null,
  startTime: null,
  timerInterval: null,
  isMuted: false,
  isSpeaker: true,
  currentAudio: null,
  conversationHistory: [],
  isAiSpeaking: false,
  videoSelfExpanded: false,
};

// 保存通话设置
function saveCallSettings() {
  if (!currentChatCharId) return;
  const settings = chatSettings[currentChatCharId] || {};
  settings.callVoiceEnabled =
    document.getElementById("settingsCallVoiceEnabled")?.checked || false;
  settings.aiCallEnabled =
    document.getElementById("settingsAiCallEnabled")?.checked || false;
  chatSettings[currentChatCharId] = settings;
  localforage.setItem("chatSettings", chatSettings);
}

// ==================== 聊天气泡背景样式 ====================
// 设置用户气泡背景颜色
function setChatUserBubbleBg(color) {
  document.getElementById("settingsChatUserBubbleBg").value = color;
  previewChatBubbleStyle();
}
// 设置用户字体颜色
function setChatUserTextColor(color) {
  document.getElementById("settingsChatUserTextColor").value = color;
  previewChatBubbleStyle();
}
// 设置AI气泡背景颜色
function setChatAiBubbleBg(color) {
  document.getElementById("settingsChatAiBubbleBg").value = color;
  previewChatBubbleStyle();
}
// 设置AI字体颜色
function setChatAiTextColor(color) {
  document.getElementById("settingsChatAiTextColor").value = color;
  previewChatBubbleStyle();
}

// 预览聊天气泡样式
function previewChatBubbleStyle() {
  const userBgColor =
    document.getElementById("settingsChatUserBubbleBg")?.value || "#f8bbd9";
  const userBgOpacity =
    parseInt(document.getElementById("settingsChatUserBubbleOpacity")?.value) ||
    100;
  const userTextColor =
    document.getElementById("settingsChatUserTextColor")?.value || "#c2185b";
  const aiBgColor =
    document.getElementById("settingsChatAiBubbleBg")?.value || "#ffffff";
  const aiBgOpacity =
    parseInt(document.getElementById("settingsChatAiBubbleOpacity")?.value) ||
    100;
  const aiTextColor =
    document.getElementById("settingsChatAiTextColor")?.value || "#333333";

  // 应用样式
  applyChatBubbleStyle(
    userBgColor,
    userBgOpacity,
    userTextColor,
    aiBgColor,
    aiBgOpacity,
    aiTextColor
  );
}

// 应用聊天气泡背景样式
function applyChatBubbleStyle(
  userBgColor,
  userBgOpacity,
  userTextColor,
  aiBgColor,
  aiBgOpacity,
  aiTextColor
) {
  // 转换颜色为RGBA
  const hexToRgba = (hex, opacity) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  };

  const userBg = hexToRgba(userBgColor, userBgOpacity);
  const aiBg = hexToRgba(aiBgColor, aiBgOpacity);

  // 移除旧样式
  const existingStyle = document.getElementById("chatBubbleBgStyle");
  if (existingStyle) existingStyle.remove();

  // 创建新样式
  const style = document.createElement("style");
  style.id = "chatBubbleBgStyle";
  style.textContent = `
    /* 普通消息气泡 - 排除语音消息和表情包 */
    .msg-row.user .msg-bubble:not(.user-voice-message-bubble):not(.sticker-bubble) {
      background: ${userBg} !important;
      color: ${userTextColor} !important;
    }
    .msg-row.ai .msg-bubble:not(.voice-message-bubble):not(.sticker-bubble) {
      background: ${aiBg} !important;
      color: ${aiTextColor} !important;
    }
    /* 表情包气泡保持透明 */
    .msg-bubble.sticker-bubble {
      background: transparent !important;
    }
    /* 用户语音条 */
    .user-voice-bar {
      background: ${userBg} !important;
    }
    .user-voice-duration {
      color: ${userTextColor} !important;
    }
    .user-voice-waves span {
      background: ${userTextColor} !important;
    }
    .user-voice-text {
      color: ${userTextColor} !important;
      background: ${hexToRgba(userBgColor, 30)} !important;
    }
    .user-voice-to-text-btn {
      color: ${userTextColor} !important;
      opacity: 0.7;
    }
    /* AI语音条 */
    .voice-bar {
      background: ${aiBg} !important;
    }
    .voice-duration {
      color: ${aiTextColor} !important;
    }
    .voice-waves span {
      background: ${aiTextColor} !important;
    }
    .voice-text {
      color: ${aiTextColor} !important;
    }
    .voice-to-text-btn {
      color: ${aiTextColor} !important;
      opacity: 0.7;
    }
  `;
  document.head.appendChild(style);
}

// 加载聊天气泡样式设置
function loadChatBubbleStyle(charId) {
  const settings = chatSettings[charId] || {};
  const userColor = settings.chatUserBubbleBg || "#f8bbd9";
  const userOpacity = settings.chatUserBubbleOpacity || 100;
  const aiColor = settings.chatAiBubbleBg || "#ffffff";
  const aiOpacity = settings.chatAiBubbleOpacity || 100;

  // 更新设置面板的值
  const userColorInput = document.getElementById("settingsChatUserBubbleBg");
  const userOpacityInput = document.getElementById(
    "settingsChatUserBubbleOpacity"
  );
  const aiColorInput = document.getElementById("settingsChatAiBubbleBg");
  const aiOpacityInput = document.getElementById("settingsChatAiBubbleOpacity");
  const userLabel = document.getElementById("chatUserOpacityLabel");
  const aiLabel = document.getElementById("chatAiOpacityLabel");

  if (userColorInput) userColorInput.value = userColor;
  if (userOpacityInput) userOpacityInput.value = userOpacity;
  if (aiColorInput) aiColorInput.value = aiColor;
  if (aiOpacityInput) aiOpacityInput.value = aiOpacity;
  if (userLabel) userLabel.textContent = userOpacity + "%";
  if (aiLabel) aiLabel.textContent = aiOpacity + "%";

  // 应用样式
  applyChatBubbleStyle(userColor, userOpacity, aiColor, aiOpacity);
}

// 预览通话气泡颜色
function previewCallBubbleColor() {
  const userColor =
    document.getElementById("settingsCallUserBubbleColor")?.value || "#f48fb1";
  const userOpacity =
    parseInt(document.getElementById("settingsCallUserBubbleOpacity")?.value) ||
    85;
  const aiColor =
    document.getElementById("settingsCallAiBubbleColor")?.value || "#ffffff";
  const aiOpacity =
    parseInt(document.getElementById("settingsCallAiBubbleOpacity")?.value) ||
    85;

  // 更新标签
  const userLabel = document.getElementById("callUserOpacityLabel");
  const aiLabel = document.getElementById("callAiOpacityLabel");
  if (userLabel) userLabel.textContent = userOpacity + "%";
  if (aiLabel) aiLabel.textContent = aiOpacity + "%";

  // 应用到CSS变量
  applyCallBubbleColors(userColor, userOpacity, aiColor, aiOpacity);
}

// 应用通话气泡颜色
function applyCallBubbleColors(userColor, userOpacity, aiColor, aiOpacity) {
  // 转换颜色为RGBA
  const hexToRgba = (hex, opacity) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  };

  const userBg = hexToRgba(userColor, userOpacity);
  const aiBg = hexToRgba(aiColor, aiOpacity);

  // 判断颜色深浅来决定文字颜色
  const isLight = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  };

  const userTextColor = isLight(userColor) ? "#333" : "white";
  const aiTextColor = isLight(aiColor) ? "#333" : "white";

  // 设置CSS变量
  document.documentElement.style.setProperty("--call-user-bubble-bg", userBg);
  document.documentElement.style.setProperty(
    "--call-user-bubble-color",
    userTextColor
  );
  document.documentElement.style.setProperty("--call-ai-bubble-bg", aiBg);
  document.documentElement.style.setProperty(
    "--call-ai-bubble-color",
    aiTextColor
  );
}

// 页面加载时应用保存的通话气泡颜色
function loadCallBubbleColors(charId) {
  const settings = chatSettings[charId] || {};
  const userColor = settings.callUserBubbleColor || "#f48fb1";
  const userOpacity = settings.callUserBubbleOpacity || 85;
  const aiColor = settings.callAiBubbleColor || "#ffffff";
  const aiOpacity = settings.callAiBubbleOpacity || 85;
  applyCallBubbleColors(userColor, userOpacity, aiColor, aiOpacity);
}

// 处理视频通话画面上传（带压缩）
function handleVideoCallImageUpload(input, type) {
  const file = input.files[0];
  if (!file) return;

  // 如果是图片，进行轻度压缩（保持高清）
  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        // 轻度压缩图片 - 保持高清
        const canvas = document.createElement("canvas");
        const maxSize = 1920; // 最大宽高（1080p级别）
        let width = img.width;
        let height = img.height;

        // 只有超过最大尺寸才缩放
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // 高质量JPEG（0.92质量）
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

        applyVideoCallImage(dataUrl, type);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  } else {
    // 视频文件直接使用（不压缩）
    const reader = new FileReader();
    reader.onload = function (e) {
      applyVideoCallImage(e.target.result, type);
    };
    reader.readAsDataURL(file);
  }
}

// 应用视频通话图片
function applyVideoCallImage(dataUrl, type) {
  if (type === "partner") {
    document.getElementById("videoCallPartnerImg").src = dataUrl;
    document.getElementById("videoCallPartnerImg").style.display = "block";
    document.getElementById("videoCallPartnerPlaceholder").style.display =
      "none";
  } else {
    document.getElementById("videoCallSelfImg").src = dataUrl;
    document.getElementById("videoCallSelfImg").style.display = "block";
    document.getElementById("videoCallSelfPlaceholder").style.display = "none";
  }

  // 保存到设置
  if (!currentChatCharId) return;
  const settings = chatSettings[currentChatCharId] || {};
  if (type === "partner") {
    settings.videoCallPartnerImage = dataUrl;
  } else {
    settings.videoCallSelfImage = dataUrl;
  }
  chatSettings[currentChatCharId] = settings;
  localforage
    .setItem("chatSettings", chatSettings)
    .then(() => {
      console.log("视频通话图片已保存", type);
    })
    .catch((err) => {
      console.error("保存视频通话图片失败:", err);
      showToast("图片太大，保存失败");
    });
}

// 清除视频画面
function clearVideoCallImage(type) {
  if (type === "partner") {
    document.getElementById("videoCallPartnerImg").src = "";
    document.getElementById("videoCallPartnerImg").style.display = "none";
    document.getElementById("videoCallPartnerPlaceholder").style.display =
      "flex";
  } else {
    document.getElementById("videoCallSelfImg").src = "";
    document.getElementById("videoCallSelfImg").style.display = "none";
    document.getElementById("videoCallSelfPlaceholder").style.display = "flex";
  }

  if (!currentChatCharId) return;
  const settings = chatSettings[currentChatCharId] || {};
  if (type === "partner") {
    delete settings.videoCallPartnerImage;
  } else {
    delete settings.videoCallSelfImage;
  }
  chatSettings[currentChatCharId] = settings;
  localforage.setItem("chatSettings", chatSettings);
}

// 发起语音通话
function startVoiceCall() {
  closeChatPanel();
  initiateCall("voice");
}

// 发起视频通话
function startVideoCall() {
  closeChatPanel();
  initiateCall("video");
}

// 发起通话
function initiateCall(type) {
  // 取消任何挂起的通话后AI回复
  if (window.pendingPostCallReply) {
    clearTimeout(window.pendingPostCallReply);
    window.pendingPostCallReply = null;
  }

  // 群聊通话 - 所有成员参与
  if (currentGroupId) {
    startGroupCall(type);
    return;
  }

  if (!currentChatCharId) {
    showToast("请先打开一个对话");
    return;
  }

  startCallWithChar(currentChatCharId, type);
}

// 群聊通话 - 所有成员参与
function startGroupCall(type) {
  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group || !group.members || group.members.length === 0) {
    showToast("群里没有成员");
    return;
  }

  // 获取所有成员信息
  const memberChars = group.members
    .map((id) => characters.find((c) => c.id === id))
    .filter(Boolean);
  if (memberChars.length === 0) {
    showToast("群成员信息获取失败");
    return;
  }

  // 设置群通话状态
  callState.active = true;
  callState.type = type;
  callState.status = "calling";
  callState.isGroupCall = true;
  callState.groupId = currentGroupId;
  callState.groupMembers = group.members;
  callState.currentSpeakerIndex = 0;
  callState.charId = null; // 群聊通话不设置charId，避免记录保存到单聊
  callState.conversationHistory = [];
  callState.videoSelfExpanded = false;

  // 设置界面
  const overlay = document.getElementById("callOverlay");
  overlay.className = `call-overlay ${type}-call active group-call`;
  overlay.classList.remove("in-call");

  // 显示群名和成员数
  const groupName = group.name || "群聊";
  document.getElementById("callTopName").textContent = `${groupName} (${
    memberChars.length + 1
  }人)`;
  document.getElementById("callTopTimer").textContent = "正在呼叫...";
  document.getElementById("callName").textContent = `${groupName}`;
  document.getElementById("callStatus").textContent = `正在呼叫 ${
    memberChars.length + 1
  } 人...`;

  // 设置群头像（而不是成员头像）
  const topAvatarImg = document.getElementById("callTopAvatarImg");
  const topAvatarPlaceholder = document.getElementById(
    "callTopAvatarPlaceholder"
  );
  if (group.avatar) {
    topAvatarImg.src = group.avatar;
    topAvatarImg.style.display = "block";
    topAvatarPlaceholder.style.display = "none";
  } else {
    topAvatarImg.style.display = "none";
    topAvatarPlaceholder.textContent = "👥";
    topAvatarPlaceholder.style.display = "block";
  }

  // 旧的头像设置（兼容）- 也用群头像
  const avatarImg = document.getElementById("callAvatarImg");
  const avatarPlaceholder = document.getElementById("callAvatarPlaceholder");
  if (group.avatar) {
    avatarImg.src = group.avatar;
    avatarImg.style.display = "block";
    avatarPlaceholder.style.display = "none";
  } else {
    avatarImg.style.display = "none";
    avatarPlaceholder.textContent = "👥";
    avatarPlaceholder.style.display = "block";
  }

  document.getElementById("callTimer").style.display = "none";
  document.getElementById("callMessagesWrapper").innerHTML = "";
  showCallTypingIndicator(false);

  // 显示呼叫按钮，隐藏通话中按钮
  document.getElementById("callCallingBtns").style.display = "flex";
  document.getElementById("callIncomingBtns").style.display = "none";
  document.getElementById("callInCallBtns").style.display = "none";

  // 视频通话设置 - 使用群聊设置的视频通话背景
  if (type === "video") {
    const groupSettings = group.settings || {};
    const videoPartnerImg = document.getElementById("videoPartnerImage");
    const videoPartnerPlaceholder = document.getElementById(
      "videoPartnerPlaceholder"
    );
    const videoSelfImg = document.getElementById("videoSelfImage");
    const videoSelfPlaceholder = document.getElementById(
      "videoSelfPlaceholder"
    );

    // 对方画面背景
    if (groupSettings.videoCallPartnerImage && videoPartnerImg) {
      videoPartnerImg.src = groupSettings.videoCallPartnerImage;
      videoPartnerImg.style.display = "block";
      if (videoPartnerPlaceholder)
        videoPartnerPlaceholder.style.display = "none";
    } else {
      if (videoPartnerImg) videoPartnerImg.style.display = "none";
      if (videoPartnerPlaceholder) {
        videoPartnerPlaceholder.style.display = "flex";
        // 显示群头像
        videoPartnerPlaceholder.innerHTML = group.avatar
          ? `<img src="${group.avatar}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">`
          : `<span style="font-size:48px;">👥</span>`;
      }
    }

    // 我的画面背景
    if (groupSettings.videoCallSelfImage && videoSelfImg) {
      videoSelfImg.src = groupSettings.videoCallSelfImage;
      videoSelfImg.style.display = "block";
      if (videoSelfPlaceholder) videoSelfPlaceholder.style.display = "none";
    } else {
      if (videoSelfImg) videoSelfImg.style.display = "none";
      if (videoSelfPlaceholder) videoSelfPlaceholder.style.display = "flex";
    }

    // 视频通话计时器
    const videoCallTimer = document.getElementById("videoCallTimer");
    if (videoCallTimer) videoCallTimer.textContent = "正在呼叫...";

    // 视频通话主名字
    const videoMainName = document.getElementById("videoMainName");
    if (videoMainName) videoMainName.textContent = groupName;
  }

  // 模拟接听（2-3秒后）
  setTimeout(() => {
    if (callState.active && callState.status === "calling") {
      answerGroupCall();
    }
  }, 2000 + Math.random() * 1000);
}

// 群聊接听
function answerGroupCall() {
  callState.status = "connected";
  callState.startTime = Date.now();

  const overlay = document.getElementById("callOverlay");
  overlay.classList.add("in-call");

  document.getElementById("callTopTimer").textContent = "00:00";

  // 更新状态显示
  const group = groupChats.find((g) => g.id === callState.groupId);
  // 人数 = AI角色数量 + 用户自己
  const memberCount = group ? group.members.length + 1 : 1;

  if (callState.type === "video") {
    const videoCallTimer = document.getElementById("videoCallTimer");
    if (videoCallTimer) videoCallTimer.textContent = "00:00";
    document.getElementById(
      "callStatus"
    ).textContent = `${memberCount}人视频通话中`;
  } else {
    document.getElementById(
      "callStatus"
    ).textContent = `${memberCount}人语音通话中`;
    document.getElementById("callTimer").style.display = "block";
    document.getElementById("callTimer").textContent = "00:00";
  }

  // 切换按钮显示
  document.getElementById("callCallingBtns").style.display = "none";
  document.getElementById("callInCallBtns").style.display = "flex";

  startCallTimer();

  // 群聊第一条消息 - 所有成员打招呼，结合群聊历史
  if (group && group.members.length > 0) {
    setTimeout(async () => {
      if (callState.active) {
        await requestGroupCallAIResponse(
          "通话刚接通，请根据之前群里聊的内容自然地打招呼或继续话题"
        );
      }
    }, 800);
  }
}

// 群聊通话AI回复（所有成员轮流发言）
async function requestGroupCallAIResponse(userMessage) {
  if (!callState.active || !callState.isGroupCall) {
    console.log("群聊通话：状态检查失败", callState);
    return;
  }

  const group = groupChats.find((g) => g.id === callState.groupId);
  if (!group || !group.members || group.members.length === 0) {
    console.log("群聊通话：找不到群组或成员", callState.groupId);
    return;
  }

  console.log("群聊通话：开始请求AI回复，成员数:", group.members.length);

  // 所有成员都会回复
  for (let i = 0; i < group.members.length; i++) {
    if (!callState.active) break; // 如果通话已结束则停止

    const charId = group.members[i];
    const char = characters.find((c) => c.id === charId);
    if (!char) {
      console.log("群聊通话：找不到角色", charId);
      continue;
    }

    console.log("群聊通话：请求角色回复", char.name);

    // 更新当前说话者头像
    updateGroupCallSpeaker(char);

    showCallTypingIndicator(true);

    // 请求AI回复
    let response = null;
    try {
      response = await getGroupCallAIMessage(charId, userMessage, i);
    } catch (e) {
      console.error("群聊通话：getGroupCallAIMessage异常", e);
    }

    showCallTypingIndicator(false);

    if (response && callState.active) {
      // 显示带角色名的消息
      addGroupCallMessage(response, charId);
      console.log(
        "群聊通话：成功添加消息",
        char.name,
        response.substring(0, 50)
      );

      // 间隔一下再让下一个人说话
      if (i < group.members.length - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 600 + Math.random() * 400)
        );
      }
    } else {
      console.log("群聊通话：AI回复为空或通话已结束", {
        response,
        active: callState.active,
      });
    }
  }
}

// 更新群聊通话中当前说话者
function updateGroupCallSpeaker(char) {
  const topAvatarImg = document.getElementById("callTopAvatarImg");
  const topAvatarPlaceholder = document.getElementById(
    "callTopAvatarPlaceholder"
  );

  if (char.avatar) {
    topAvatarImg.src = char.avatar;
    topAvatarImg.style.display = "block";
    topAvatarPlaceholder.style.display = "none";
  } else {
    topAvatarImg.style.display = "none";
    topAvatarPlaceholder.textContent = char.name.charAt(0);
    topAvatarPlaceholder.style.display = "block";
  }

  // 视频通话也更新头像
  if (callState.type === "video") {
    const videoPartnerPlaceholder = document.getElementById(
      "videoPartnerPlaceholder"
    );
    if (videoPartnerPlaceholder) {
      videoPartnerPlaceholder.innerHTML = char.avatar
        ? `<img src="${char.avatar}" style="width:100%;height:100%;object-fit:cover;">`
        : `<span style="font-size:48px;">${char.name.charAt(0)}</span>`;
    }
  }
}

// 获取群聊通话AI消息
async function getGroupCallAIMessage(charId, context, speakerIndex) {
  const char = characters.find((c) => c.id === charId);
  if (!char) {
    console.error("群聊通话：找不到角色", charId);
    return null;
  }

  // 使用和单聊通话一样的API配置获取方式
  const apiConfig = getActiveApiConfig();
  if (!apiConfig || !apiConfig.url || !apiConfig.key) {
    console.error("群聊通话：API配置缺失");
    return `你好呀～`;
  }

  const charName = char.note || char.name;
  const settings = chatSettings[charId] || {};
  // 完整读取人设
  const persona = settings.persona || char.prompt || char.description || "";

  // 获取群聊设置
  const group = groupChats.find((g) => g.id === callState.groupId);
  const groupSettings = group?.settings || {};
  const userNickname =
    groupSettings.myNickname || localStorage.getItem("userName") || "用户";
  const userPersona = groupSettings.myPersona || "";
  // 使用群聊设置中的历史消息条数
  const contextCount = groupSettings.contextCount || 20;

  // 获取群聊历史消息
  let groupChatHistory = "";
  try {
    const messagesKey = `group_messages_${callState.groupId}`;
    const groupMessages = (await localforage.getItem(messagesKey)) || [];

    // 按群聊设置的条数获取历史消息，过滤隐藏消息和通话卡片
    const recentGroupMessages = groupMessages
      .filter((m) => !m.isHidden && !m.isCallCard && !m.isHtml)
      .slice(-contextCount);

    if (recentGroupMessages.length > 0) {
      groupChatHistory = recentGroupMessages
        .map((m) => {
          const content = (m.content || "").replace(/<[^>]*>/g, "");
          if (m.role === "user") {
            return `[${userNickname}]: ${content}`;
          } else {
            const msgChar = characters.find((c) => c.id === m.charId);
            const msgCharName = msgChar ? msgChar.note || msgChar.name : "成员";
            return `[${msgCharName}]: ${content}`;
          }
        })
        .join("\n");
    }
  } catch (e) {
    console.error("群聊通话：读取群聊历史失败", e);
  }

  // 获取当前通话中的对话记录
  let callHistoryText = "";
  const recentCallHistory = callState.conversationHistory.slice(-10);
  if (recentCallHistory.length > 0) {
    callHistoryText = recentCallHistory
      .map((h) => {
        if (h.role === "user") return `[${userNickname}]: ${h.content}`;
        const speakerChar = characters.find((c) => c.id === h.charId);
        const speakerName = speakerChar
          ? speakerChar.note || speakerChar.name
          : "成员";
        return `[${speakerName}]: ${h.content}`;
      })
      .join("\n");
  }

  // 获取群里其他成员信息
  let otherMembersInfo = "";
  if (group && group.members) {
    const otherMembers = group.members
      .filter((id) => id !== charId)
      .map((id) => {
        const c = characters.find((ch) => ch.id === id);
        if (!c) return null;
        const s = chatSettings[id] || {};
        const name = c.note || c.name;
        const p = s.persona || c.prompt || c.description || "";
        return `- ${name}: ${p.substring(0, 100)}${
          p.length > 100 ? "..." : ""
        }`;
      })
      .filter(Boolean);
    if (otherMembers.length > 0) {
      otherMembersInfo = otherMembers.join("\n");
    }
  }

  const currentTime = new Date().toLocaleString("zh-CN");

  // 根据通话类型设置不同的格式要求
  let formatRequirement = "";
  if (callState.type === "video") {
    formatRequirement = `# 视频通话格式要求
这是视频通话，你们可以看到彼此。
用【】描述你的动作、表情、神态，穿插在对话中，让对话更生动。
示例：【看着屏幕笑了笑】你好呀～【歪头看着你】怎么突然想起给我打视频了？
示例：【揉了揉眼睛】嗯...刚睡醒【打了个哈欠】你找我有事吗？`;
  } else {
    formatRequirement = `# 语音通话格式要求
这是语音通话，只能听到声音，看不到对方。
直接用对话回复，不要描写动作，不要用【】或括号。
像真人打电话一样自然地说话。`;
  }

  // 完整的系统提示词
  const systemPrompt = `# 你的身份
你是【${charName}】，正在参与一个群聊${
    callState.type === "video" ? "视频" : "语音"
  }通话。

# 你的完整人设
${persona || "（暂无人设，请自由发挥）"}

# 用户信息
- 用户昵称：${userNickname}
- 用户人设：${userPersona || "普通用户"}

# 群里其他成员
${otherMembersInfo || "暂无其他成员信息"}

# 最近的群聊记录
${groupChatHistory || "（暂无聊天记录）"}

# 当前通话内容
${callHistoryText || "（通话刚刚开始）"}

# 当前时间
${currentTime}

${formatRequirement}

# 回复要求
1. 你必须完全按照【${charName}】的人设性格来说话，保持角色一致性
2. 参考之前的群聊记录，了解大家在聊什么，可以提及之前聊过的内容
3. 用简短口语化方式回应，像真人打电话一样自然，每次回复1-3句话
4. ${
    speakerIndex === 0
      ? "你是第一个说话的人，可以先打个招呼或者接着之前群里的话题继续聊"
      : "前面已经有人说过了，请自然地接话、回应或补充"
  }
5. 保持${charName}特有的语气、口癖和说话习惯
6. 只输出${charName}说的话，不要输出其他角色的对白`;

  console.log(
    "群聊通话：发送API请求",
    charName,
    "提示词长度:",
    systemPrompt.length
  );

  try {
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
          { role: "user", content: context || "请自然地说话" },
        ],
        temperature:
          apiConfig.temperature !== undefined
            ? Number(apiConfig.temperature)
            : 0.8,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("群聊通话：API响应错误", response.status, errText);
      return `嗯嗯～`;
    }

    const data = await response.json();
    console.log("群聊通话：API返回", data);

    // 尝试多种方式提取回复
    let reply = null;
    if (data.choices && data.choices[0]) {
      const choice = data.choices[0];
      if (choice.message && choice.message.content) {
        reply = choice.message.content;
      } else if (choice.text) {
        reply = choice.text;
      }
      // 检查是否被截断
      if (choice.finish_reason === "length") {
        console.warn("群聊通话：回复被截断");
      }
    }

    if (!reply || !reply.trim()) {
      console.error("群聊通话：AI返回空", data);
      return `好的～`;
    }

    // 过滤思维链
    reply = filterThinkingTags(reply);

    // 清理回复中可能的格式问题
    reply = reply.trim();
    // 移除可能的引号包裹
    if (
      (reply.startsWith('"') && reply.endsWith('"')) ||
      (reply.startsWith("'") && reply.endsWith("'"))
    ) {
      reply = reply.slice(1, -1);
    }

    console.log("群聊通话：最终回复", reply);
    return reply;
  } catch (e) {
    console.error("群聊通话：API请求异常", e);
    return `嗯嗯～`;
  }
}

// 添加群聊通话消息（带角色名）
function addGroupCallMessage(content, charId) {
  const char = characters.find((c) => c.id === charId);
  const charName = char ? char.note || char.name : "成员";
  const charAvatar = char?.avatar;

  const wrapper = document.getElementById("callMessagesWrapper");
  const msgDiv = document.createElement("div");
  msgDiv.className = "call-message ai group-call-msg";
  msgDiv.innerHTML = `
    <div class="group-call-msg-header">
      <div class="group-call-msg-avatar">
        ${charAvatar ? `<img src="${charAvatar}">` : charName.charAt(0)}
      </div>
      <span class="group-call-msg-name">${charName}</span>
    </div>
    <div class="call-message-content">${escapeHtml(content)}</div>
  `;
  wrapper.appendChild(msgDiv);
  wrapper.scrollTop = wrapper.scrollHeight;

  // 记录到历史
  callState.conversationHistory.push({
    role: "assistant",
    charId: charId,
    content: content,
  });
}

// 实际发起通话的函数（单聊）
function startCallWithChar(charId, type) {
  const char = characters.find((c) => c.id === charId);
  if (!char) return;

  // 取消之前挂断后的pending回复
  if (window.pendingPostCallReply) {
    clearTimeout(window.pendingPostCallReply);
    window.pendingPostCallReply = null;
    console.log("新通话开始，取消上一次通话的pending回复");
  }

  const settings = chatSettings[charId] || {};

  // 调试：检查视频通话图片
  console.log("发起通话，检查设置:", {
    type,
    hasPartnerImage: !!settings.videoCallPartnerImage,
    hasSelfImage: !!settings.videoCallSelfImage,
    partnerImageLength: settings.videoCallPartnerImage?.length,
    selfImageLength: settings.videoCallSelfImage?.length,
  });

  // 加载通话气泡颜色
  loadCallBubbleColors(charId);

  callState.active = true;
  callState.type = type;
  callState.status = "calling";
  callState.charId = charId;
  callState.isGroupCall = false;
  callState.groupId = null;
  callState.conversationHistory = [];
  callState.videoSelfExpanded = false;

  // 设置界面
  const overlay = document.getElementById("callOverlay");
  overlay.className = `call-overlay ${type}-call active`;
  overlay.classList.remove("in-call");

  const charName = settings.charNote || char.note || char.name;
  const charAvatar = settings.otherAvatar || char.avatar;

  // 设置新的顶部栏
  const topAvatarImg = document.getElementById("callTopAvatarImg");
  const topAvatarPlaceholder = document.getElementById(
    "callTopAvatarPlaceholder"
  );
  if (charAvatar) {
    topAvatarImg.src = charAvatar;
    topAvatarImg.style.display = "block";
    topAvatarPlaceholder.style.display = "none";
  } else {
    topAvatarImg.style.display = "none";
    topAvatarPlaceholder.style.display = "block";
    topAvatarPlaceholder.textContent = charName.charAt(0);
  }
  document.getElementById("callTopName").textContent = charName;
  document.getElementById("callTopTimer").textContent = "正在呼叫...";

  // 旧的头像设置（兼容）
  const avatarImg = document.getElementById("callAvatarImg");
  const avatarPlaceholder = document.getElementById("callAvatarPlaceholder");
  if (charAvatar) {
    avatarImg.src = charAvatar;
    avatarImg.style.display = "block";
    avatarPlaceholder.style.display = "none";
  } else {
    avatarImg.style.display = "none";
    avatarPlaceholder.style.display = "block";
    avatarPlaceholder.textContent = charName.charAt(0);
  }

  document.getElementById("callName").textContent = charName;
  document.getElementById("callStatus").textContent = "正在呼叫...";
  document.getElementById("callTimer").style.display = "none";
  // 清空消息但保留结构
  document.getElementById("callMessagesWrapper").innerHTML = "";
  showCallTypingIndicator(false);

  // 视频通话设置
  if (type === "video") {
    document.getElementById("videoCallName").textContent = charName;
    document.getElementById("videoCallTimer").textContent = "连接中...";

    // 设置对方画面
    const videoMainImg = document.getElementById("videoMainImg");
    const videoMainPlaceholder = document.getElementById(
      "videoMainPlaceholder"
    );
    if (settings.videoCallPartnerImage) {
      videoMainImg.src = settings.videoCallPartnerImage;
      videoMainImg.style.display = "block";
      videoMainPlaceholder.style.display = "none";
    } else {
      videoMainImg.style.display = "none";
      videoMainPlaceholder.style.display = "flex";
      // 设置占位头像
      const mainAvatarImg = document.getElementById("videoMainAvatarImg");
      const mainAvatarPlaceholder = document.getElementById(
        "videoMainAvatarPlaceholder"
      );
      if (charAvatar) {
        mainAvatarImg.src = charAvatar;
        mainAvatarImg.style.display = "block";
        mainAvatarPlaceholder.style.display = "none";
      } else {
        mainAvatarImg.style.display = "none";
        mainAvatarPlaceholder.style.display = "block";
        mainAvatarPlaceholder.textContent = charName.charAt(0);
      }
      document.getElementById("videoMainName").textContent = charName;
    }

    // 设置自己画面
    const videoSelfImg = document.getElementById("videoSelfImg");
    const videoSelfPlaceholder = document.getElementById(
      "videoSelfPlaceholder"
    );
    if (settings.videoCallSelfImage) {
      videoSelfImg.src = settings.videoCallSelfImage;
      videoSelfImg.style.display = "block";
      videoSelfPlaceholder.style.display = "none";
    } else {
      videoSelfImg.style.display = "none";
      videoSelfPlaceholder.style.display = "flex";
    }
    document.getElementById("videoSelf").classList.remove("expanded");
  }

  // 显示呼叫按钮
  document.getElementById("callCallingBtns").style.display = "flex";
  document.getElementById("callIncomingBtns").style.display = "none";
  document.getElementById("callInCallBtns").style.display = "none";

  // 模拟AI接听（2-4秒后）
  setTimeout(() => {
    if (callState.status === "calling") {
      aiAnswerCall();
    }
  }, 2000 + Math.random() * 2000);
}

// 切换视频画面位置（互换大小窗口）
function toggleVideoSelf() {
  const overlay = document.getElementById("callOverlay");
  callState.videoSelfExpanded = !callState.videoSelfExpanded;
  overlay.classList.toggle("swapped", callState.videoSelfExpanded);
}

// AI接听通话
async function aiAnswerCall() {
  const settings = chatSettings[callState.charId] || {};
  const char = characters.find((c) => c.id === callState.charId);

  // 简单模拟：大部分情况接听，小概率拒绝
  const willAnswer = Math.random() > 0.15;

  if (willAnswer) {
    callState.status = "connected";
    callState.startTime = Date.now();

    const overlay = document.getElementById("callOverlay");
    overlay.classList.add("in-call");

    // 更新顶部栏状态
    document.getElementById("callTopTimer").textContent = "00:00";

    if (callState.type === "video") {
      document.getElementById("videoCallTimer").textContent = "00:00";
    } else {
      document.getElementById("callStatus").textContent = "语音通话中";
      document.getElementById("callTimer").style.display = "block";
    }

    // 显示通话中按钮
    document.getElementById("callCallingBtns").style.display = "none";
    document.getElementById("callInCallBtns").style.display = "flex";

    // 开始计时
    startCallTimer();

    // AI开场白
    await generateCallResponse("通话刚接通，请自然地打招呼");
  } else {
    // AI拒绝接听
    document.getElementById("callStatus").textContent = "对方已拒绝";
    document.getElementById("callTopTimer").textContent = "对方已拒绝";
    if (callState.type === "video") {
      document.getElementById("videoMainName").textContent = "对方已拒绝";
    }
    setTimeout(() => {
      endCall();
      addCallRecord("refused");
    }, 1500);
  }
}

// 用户接听来电
function acceptCall() {
  if (callState.status !== "incoming") return;

  callState.status = "connected";
  callState.startTime = Date.now();

  const overlay = document.getElementById("callOverlay");
  overlay.classList.add("in-call");

  if (callState.type === "video") {
    document.getElementById("videoCallTimer").textContent = "00:00";
  } else {
    document.getElementById("callStatus").textContent = "语音通话中";
    document.getElementById("callTimer").style.display = "block";
  }

  // 显示通话中按钮
  document.getElementById("callIncomingBtns").style.display = "none";
  document.getElementById("callInCallBtns").style.display = "flex";

  // 开始计时
  startCallTimer();
}

// 用户拒绝来电
function declineCall() {
  document.getElementById("callStatus").textContent = "已拒绝";
  setTimeout(() => {
    endCall();
    addCallRecord("declined");
  }, 500);
}

// 结束通话
function endCall() {
  // 保存通话信息用于后续AI回复
  const savedCharId = callState.charId;
  const hadConversation = callState.conversationHistory.length > 0;
  const wasConnected = callState.status === "connected" && callState.startTime;
  const wasGroupCall = callState.isGroupCall;
  const savedGroupId = callState.groupId;
  const savedConversationHistory = [...callState.conversationHistory];
  const savedCallType = callState.type;
  const savedStartTime = callState.startTime;

  if (callState.timerInterval) {
    clearInterval(callState.timerInterval);
    callState.timerInterval = null;
  }

  // 停止当前播放的音频
  if (callState.currentAudio) {
    callState.currentAudio.pause();
    callState.currentAudio = null;
  }

  // 如果是正常通话结束，添加通话记录
  if (wasConnected) {
    if (wasGroupCall) {
      addGroupCallRecord(
        "completed",
        savedGroupId,
        savedConversationHistory,
        savedCallType,
        savedStartTime
      );
    } else {
      addCallRecord("completed");
    }
  }

  // 隐藏悬浮球
  document.getElementById("callFloatingBubble").classList.remove("active");

  // 重置状态
  callState.active = false;
  callState.status = "idle";
  callState.startTime = null;
  callState.conversationHistory = [];
  callState.videoSelfExpanded = false;
  callState.isGroupCall = false;
  callState.groupId = null;

  // 隐藏界面 - 移除所有相关类并强制隐藏
  const overlay = document.getElementById("callOverlay");
  overlay.classList.remove(
    "active",
    "in-call",
    "video-call",
    "voice-call",
    "swapped",
    "group-call"
  );
  overlay.style.display = "none";

  // 恢复默认类
  setTimeout(() => {
    overlay.style.display = "";
    overlay.className = "call-overlay voice-call";
  }, 100);

  // 【核心新增】挂断后自动触发AI回复
  if (wasConnected && hadConversation) {
    // 延迟一点再触发，确保界面已经切换回聊天
    // 使用全局变量跟踪，以便在开始新通话时取消
    window.pendingPostCallReply = setTimeout(() => {
      window.pendingPostCallReply = null;
      // 再次检查是否在通话中（防止快速切换通话）
      if (callState.active) {
        console.log("通话结束后AI回复: 新通话已开始，取消回复");
        return;
      }
      if (wasGroupCall && savedGroupId) {
        triggerGroupPostCallAiResponse(
          savedGroupId,
          savedConversationHistory,
          savedCallType
        );
      } else if (savedCharId) {
        triggerPostCallAiResponse(savedCharId);
      }
    }, 500);
  }
}

// 添加群聊通话记录（只显示挂断卡片，通话内容隐藏供AI参考）
async function addGroupCallRecord(
  result,
  groupId,
  conversationHistory,
  callType,
  startTime
) {
  if (!groupId) return;

  const group = groupChats.find((g) => g.id === groupId);
  if (!group) return;

  const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const mins = Math.floor(duration / 60)
    .toString()
    .padStart(2, "0");
  const secs = (duration % 60).toString().padStart(2, "0");

  let statusText = "";
  let icon = callType === "video" ? "▶" : "☎";

  switch (result) {
    case "completed":
      statusText = `通话时长 ${mins}:${secs}`;
      break;
    case "refused":
      statusText = "对方已拒绝";
      break;
    case "declined":
      statusText = "已拒绝";
      break;
    case "missed":
      statusText = "未接来电";
      break;
    default:
      statusText = "通话结束";
  }

  // 人数 = AI角色数量 + 用户自己
  const memberCount = (group.members ? group.members.length : 0) + 1;

  // 挂断卡片HTML - 居中显示
  const callHtml = `
    <div style="background:white; padding:10px 14px; border-radius:10px; display:inline-flex; align-items:center; gap:10px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:#f5f5f5; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:${
        callType === "video" ? "#4caf50" : "#ff9800"
      };">${icon}</div>
      <div>
        <div style="font-size:0.9rem;">${
          callType === "video" ? "视频通话" : "语音通话"
        } (${memberCount}人)</div>
        <div style="font-size:0.7rem; color:#999;">${statusText}</div>
      </div>
    </div>
  `;

  // 获取群聊消息
  const messagesKey = `group_messages_${groupId}`;
  let messages = (await localforage.getItem(messagesKey)) || [];

  // 添加可见的挂断卡片（作为用户消息显示在右侧）
  messages.push({
    role: "user",
    content: callHtml,
    isHtml: true,
    isCallCard: true,
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });

  // 如果有通话内容，添加隐藏的通话记录供AI参考（用户看不到）
  if (
    result === "completed" &&
    conversationHistory &&
    conversationHistory.length > 0
  ) {
    const groupSettings = group.settings || {};
    const userNickname =
      groupSettings.myNickname || localStorage.getItem("userName") || "用户";

    // 格式化通话记录
    const callTranscript = conversationHistory
      .map((msg) => {
        if (msg.role === "user") {
          const content = msg.content.replace(/【[^】]*】/g, "").trim();
          return `${userNickname}: ${content}`;
        } else {
          const char = characters.find((c) => c.id === msg.charId);
          const charName = char ? char.note || char.name : "成员";
          const content = msg.content.replace(/【[^】]*】/g, "").trim();
          return `${charName}: ${content}`;
        }
      })
      .join("\n");

    // 添加隐藏的系统消息，AI能看到但用户看不到
    messages.push({
      role: "system",
      content: `[群聊通话记录 - ${
        callType === "video" ? "视频" : "语音"
      }通话，时长${mins}:${secs}，${memberCount}人参与]\n${callTranscript}\n[通话结束]`,
      isHidden: true,
      time: new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }

  // 保存消息
  await localforage.setItem(messagesKey, messages);

  // 更新群聊列表预览
  const previewText = callType === "video" ? "[视频通话]" : "[语音通话]";
  group.lastMessage = previewText;
  group.lastTime = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  await localforage.setItem("groupChats", groupChats);

  // 刷新界面
  if (currentGroupId === groupId) {
    loadGroupMessages(groupId);
  }
  renderCharacters();
}

// 群聊通话结束后触发AI回复
async function triggerGroupPostCallAiResponse(
  groupId,
  conversationHistory,
  callType
) {
  if (!groupId) return;

  const group = groupChats.find((g) => g.id === groupId);
  if (!group || !group.members || group.members.length === 0) return;

  // 确保当前在群聊界面
  if (currentGroupId !== groupId) {
    console.log("群聊通话结束后AI回复: 当前不在该群聊界面");
    return;
  }

  // 直接触发群聊AI回复，让AI根据隐藏的通话记录续写
  await requestGroupAIReply("(通话刚刚结束，请根据通话内容自然地继续对话)");
}

// 挂断后触发AI回复
async function triggerPostCallAiResponse(charId) {
  if (!charId) return;

  const char = characters.find((c) => c.id === charId);
  if (!char) return;

  const settings = chatSettings[charId] || {};
  const apiConfig = getActiveApiConfig();
  if (!apiConfig || !apiConfig.url || !apiConfig.key) {
    console.log("通话结束后AI回复: API未配置");
    return;
  }

  // 确保当前在这个聊天界面
  if (currentChatCharId !== charId) {
    console.log("通话结束后AI回复: 当前不在该聊天界面");
    return;
  }

  // 直接调用AI回复
  requestAIReply();
}

// 最小化通话（显示悬浮球）
function minimizeCall() {
  if (!callState.active || callState.status !== "connected") return;

  const char = characters.find((c) => c.id === callState.charId);
  const bubble = document.getElementById("callFloatingBubble");
  const bubbleImg = document.getElementById("floatingBubbleImg");
  const bubbleAvatar = document.getElementById("floatingBubbleAvatar");

  // 设置悬浮球头像
  if (char && char.avatar) {
    bubbleImg.src = char.avatar;
    bubbleImg.style.display = "block";
    bubbleAvatar.style.display = "none";
  } else {
    bubbleImg.style.display = "none";
    bubbleAvatar.style.display = "block";
    bubbleAvatar.textContent = callState.type === "video" ? "▶" : "☎";
  }

  // 显示悬浮球
  bubble.classList.add("active");

  // 隐藏通话界面
  const overlay = document.getElementById("callOverlay");
  overlay.classList.remove("active");
}

// 恢复通话（从悬浮球点击）
function restoreCall() {
  if (!callState.active) return;

  // 隐藏悬浮球
  document.getElementById("callFloatingBubble").classList.remove("active");

  // 显示通话界面
  const overlay = document.getElementById("callOverlay");
  overlay.classList.add("active");
}

// 初始化悬浮球拖拽
function initCallBubbleDrag() {
  const bubble = document.getElementById("callFloatingBubble");
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;
  let hasMoved = false;

  const onStart = (e) => {
    isDragging = true;
    hasMoved = false;

    const clientX = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes("mouse") ? e.clientY : e.touches[0].clientY;

    startX = clientX;
    startY = clientY;

    const rect = bubble.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
  };

  const onMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();

    const clientX = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes("mouse") ? e.clientY : e.touches[0].clientY;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasMoved = true;
    }

    let newLeft = initialLeft + deltaX;
    let newTop = initialTop + deltaY;

    // 边界限制
    const maxLeft = window.innerWidth - bubble.offsetWidth;
    const maxTop = window.innerHeight - bubble.offsetHeight;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    bubble.style.left = `${newLeft}px`;
    bubble.style.top = `${newTop}px`;
    bubble.style.right = "auto";
  };

  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;

    // 如果没有移动，视为点击，恢复通话
    if (!hasMoved) {
      restoreCall();
    }
  };

  bubble.addEventListener("mousedown", onStart);
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onEnd);

  bubble.addEventListener("touchstart", onStart, { passive: false });
  document.addEventListener("touchmove", onMove, { passive: false });
  document.addEventListener("touchend", onEnd);
}

// 页面加载时初始化悬浮球拖拽
document.addEventListener("DOMContentLoaded", initCallBubbleDrag);

// 开始通话计时
function startCallTimer() {
  const voiceTimer = document.getElementById("callTimer");
  const videoTimer = document.getElementById("videoCallTimer");
  const topTimer = document.getElementById("callTopTimer");

  callState.timerInterval = setInterval(() => {
    if (!callState.startTime) return;
    const elapsed = Math.floor((Date.now() - callState.startTime) / 1000);
    const mins = Math.floor(elapsed / 60)
      .toString()
      .padStart(2, "0");
    const secs = (elapsed % 60).toString().padStart(2, "0");
    const timeStr = `${mins}:${secs}`;

    // 更新顶部栏时间
    topTimer.textContent = timeStr;

    if (callState.type === "video") {
      videoTimer.textContent = timeStr;
    } else {
      voiceTimer.textContent = timeStr;
    }
  }, 1000);
}

// 添加通话记录到聊天
function addCallRecord(result) {
  if (!callState.charId) return;

  const duration = callState.startTime
    ? Math.floor((Date.now() - callState.startTime) / 1000)
    : 0;
  const mins = Math.floor(duration / 60)
    .toString()
    .padStart(2, "0");
  const secs = (duration % 60).toString().padStart(2, "0");

  let statusText = "";
  let icon = callState.type === "video" ? "▶" : "☎";

  switch (result) {
    case "completed":
      statusText = `通话时长 ${mins}:${secs}`;
      break;
    case "refused":
      statusText = "对方已拒绝";
      break;
    case "declined":
      statusText = "已拒绝";
      break;
    case "missed":
      statusText = "未接来电";
      break;
    default:
      statusText = "通话结束";
  }

  const callHtml = `
    <div style="background:white; padding:10px 14px; border-radius:10px; display:flex; align-items:center; gap:10px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:#f5f5f5; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:${
        callState.type === "video" ? "#4caf50" : "#ff9800"
      };">${icon}</div>
      <div>
        <div style="font-size:0.9rem;">${
          callState.type === "video" ? "视频通话" : "语音通话"
        }</div>
        <div style="font-size:0.7rem; color:#999;">${statusText}</div>
      </div>
    </div>
  `;

  if (!chatHistories[callState.charId]) {
    chatHistories[callState.charId] = [];
  }

  // 添加可见的通话卡片
  chatHistories[callState.charId].push({
    role: "user",
    content: callHtml,
    isHtml: true,
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });

  // 如果有通话内容，添加隐藏的通话记录供AI参考
  if (result === "completed" && callState.conversationHistory.length > 0) {
    const settings = chatSettings[callState.charId] || {};
    const userNickname = settings.userNickname || "用户";
    const charName = settings.charName || "对方";

    // 格式化通话记录
    const callTranscript = callState.conversationHistory
      .map((msg) => {
        const speaker = msg.role === "user" ? userNickname : charName;
        // 移除【】中的动作描写，只保留对话内容用于记录
        const content = msg.content.replace(/【[^】]*】/g, "").trim();
        return `${speaker}: ${content}`;
      })
      .join("\n");

    // 添加隐藏的系统消息，AI能看到但用户看不到
    chatHistories[callState.charId].push({
      role: "system",
      content: `[通话记录 - ${
        callState.type === "video" ? "视频" : "语音"
      }通话，时长${mins}:${secs}]\n${callTranscript}\n[通话结束]`,
      isHidden: true,
      time: new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }

  // 更新聊天列表预览
  const previewText = callState.type === "video" ? "[视频通话]" : "[语音通话]";
  if (typeof updateCharacterLastMessage === "function") {
    updateCharacterLastMessage(callState.charId, previewText);
  }

  // 保存聊天记录并强制刷新界面
  const savedCharId = callState.charId;
  localforage.setItem("chatHistories", chatHistories).then(() => {
    // 等待 localforage 保存完成后再刷新界面
    requestAnimationFrame(() => {
      // 使用 == 而非 === 以避免类型不匹配的问题
      if (currentChatCharId && currentChatCharId == savedCharId) {
        renderConversation();
      }
      // 同时刷新聊天列表
      if (typeof renderCharacterList === "function") {
        renderCharacterList();
      }
    });
  });
}

// 切换静音
function toggleMute() {
  callState.isMuted = !callState.isMuted;
  const btn = document.getElementById("muteBtn");
  btn.classList.toggle("active", callState.isMuted);
  btn.textContent = callState.isMuted ? "○" : "♪";
}

// 切换扬声器
function toggleSpeaker() {
  callState.isSpeaker = !callState.isSpeaker;
  const btn = document.getElementById("speakerBtn");
  btn.classList.toggle("active", callState.isSpeaker);
  btn.textContent = callState.isSpeaker ? "◉" : "○";
}

// 用户发送通话消息
function sendCallMessage() {
  const input = document.getElementById("callInput");
  const text = input.value.trim();
  if (!text || callState.status !== "connected") return;

  input.value = "";

  // 显示用户消息
  addCallMessage(text, "user");

  // 保存到通话历史
  callState.conversationHistory.push({ role: "user", content: text });

  // AI回复 - 区分群聊和单聊
  if (callState.isGroupCall) {
    requestGroupCallAIResponse(text);
  } else {
    generateCallResponse(text);
  }
}

// 处理输入框回车
function handleCallInputKeydown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendCallMessage();
  }
}

// 生成通话中的AI回复
async function generateCallResponse(context) {
  if (!callState.active || callState.status !== "connected") return;

  const apiConfig = getActiveApiConfig();
  if (!apiConfig || !apiConfig.url || !apiConfig.key) {
    console.error("通话: API配置缺失");
    addCallMessage("(API未配置，请在设置中配置API)", "system");
    return;
  }

  const settings = chatSettings[callState.charId] || {};
  const char = characters.find((c) => c.id === callState.charId);
  if (!char) return;

  const charName = settings.charName || char.name || "对方";
  const persona = settings.persona || "";
  const userNickname = settings.userNickname || "用户";

  console.log("通话人设:", { charName, personaLength: persona.length });

  // 显示正在输入指示器
  showCallTypingIndicator(true);

  try {
    // 获取之前的聊天记录摘要
    const chatHistory = chatHistories[callState.charId] || [];
    let recentChatSummary = "";

    if (chatHistory.length > 0) {
      // 获取最近的聊天记录（最多20条非隐藏消息）
      const recentMessages = chatHistory
        .filter((msg) => !msg.isHidden && msg.role !== "system")
        .slice(-20);

      if (recentMessages.length > 0) {
        recentChatSummary = "\n【通话前的聊天记录摘要】\n";
        recentChatSummary +=
          "以下是你们最近的聊天内容，请记住这些对话，在通话中保持连贯性：\n";
        recentMessages.forEach((msg) => {
          const sender = msg.role === "user" ? userNickname : charName;
          // 简化消息内容，去掉过长的部分
          let content = msg.content || "";
          if (content.length > 100) {
            content = content.substring(0, 100) + "...";
          }
          recentChatSummary += `${sender}: ${content}\n`;
        });
        recentChatSummary += "---\n";
      }
    }

    // 构建系统提示词
    let inCallPrompt = "";

    // 人设放在最前面
    if (persona && persona.trim()) {
      inCallPrompt = persona.trim() + "\n\n";
    }

    // 添加聊天记录摘要
    if (recentChatSummary) {
      inCallPrompt += recentChatSummary + "\n";
    }

    // 通话场景说明
    inCallPrompt += `---\n【当前场景】\n`;
    inCallPrompt += `你正在和${userNickname}进行${
      callState.type === "video" ? "视频" : "语音"
    }通话。\n`;
    inCallPrompt += `请完全按照上面的人设来说话，保持角色的性格、语气和说话习惯。\n`;
    inCallPrompt += `重要：你要记住之前聊天的内容，不要表现得像失忆了一样！\n\n`;

    if (callState.type === "video") {
      inCallPrompt += `【视频通话格式】\n`;
      inCallPrompt += `用【】描述动作、表情、神态，穿插在对话中。\n`;
      inCallPrompt += `示例：【看着屏幕笑了笑】你好呀～【歪头看着你】怎么突然想起给我打视频了？\n`;
    } else {
      inCallPrompt += `【语音通话格式】\n`;
      inCallPrompt += `这是语音通话，只能听到声音。\n`;
      inCallPrompt += `直接用对话回复，不要描写动作，不要用【】或括号。\n`;
      inCallPrompt += `像真人打电话一样自然地说话。\n`;
    }

    const messages = [{ role: "system", content: inCallPrompt }];

    // 添加通话历史
    if (callState.conversationHistory.length > 0) {
      callState.conversationHistory.forEach((msg) => {
        messages.push({ role: msg.role, content: msg.content });
      });
    }

    // 添加当前触发
    if (callState.conversationHistory.length === 0) {
      messages.push({ role: "user", content: "(电话接通了)" });
    } else if (
      context &&
      !callState.conversationHistory.find((m) => m.content === context)
    ) {
      messages.push({ role: "user", content: context });
    }

    console.log("通话API请求:", {
      url: apiConfig.url,
      model: apiConfig.model,
      messagesCount: messages.length,
      systemPrompt: inCallPrompt.substring(0, 200),
    });

    const reqTemperature =
      apiConfig.temperature !== undefined ? Number(apiConfig.temperature) : 0.8;

    const response = await fetch(`${apiConfig.url}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiConfig.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: messages,
        temperature: reqTemperature,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("通话API错误:", response.status, errText);
      addCallMessage("(连接失败，请重试)", "system");
      return;
    }

    const data = await response.json();

    // 详细调试输出
    console.log("通话API完整响应:", data);
    console.log("choices[0]:", data.choices?.[0]);
    console.log("message:", data.choices?.[0]?.message);
    console.log("content:", data.choices?.[0]?.message?.content);
    console.log("finish_reason:", data.choices?.[0]?.finish_reason);

    let aiReply = "";

    // 尝试多种方式提取回复
    if (data.choices && data.choices[0]) {
      const choice = data.choices[0];
      if (choice.message && choice.message.content) {
        aiReply = choice.message.content;
      } else if (choice.text) {
        aiReply = choice.text;
      }
      // 检查是否被过滤
      if (choice.finish_reason === "content_filter") {
        console.warn("通话: 内容被过滤");
      }
    }

    // 过滤思维链
    aiReply = filterThinkingTags(aiReply);

    // 检查是否为空
    if (!aiReply || !aiReply.trim() || aiReply.trim().length < 2) {
      console.error("通话: AI回复为空", {
        aiReply,
        choicesLength: data.choices?.length,
        firstChoice: data.choices?.[0],
      });

      // 使用备用回复
      if (callState.conversationHistory.length === 0) {
        aiReply =
          callState.type === "video"
            ? `【看到屏幕亮起，脸上浮现出一丝笑意】接通了。怎么突然想起给我打视频？【微微歪头】是想我了？`
            : `喂？是你呀。怎么这个时候打电话过来？`;
      } else {
        aiReply =
          callState.type === "video"
            ? `【眨了眨眼看着你】嗯？你说什么？`
            : `嗯？你说什么？`;
      }
    }

    // 保存到通话历史
    callState.conversationHistory.push({
      role: "assistant",
      content: aiReply,
    });

    // 隐藏正在输入指示器
    showCallTypingIndicator(false);

    // 显示在通话界面（视频通话保留动作描写）
    addCallMessage(aiReply, "ai", callState.type === "video");

    // 如果开启了语音，朗读回复（只读对话部分，不读动作）
    if (settings.callVoiceEnabled && settings.voiceId && !callState.isMuted) {
      const textToSpeak = aiReply.replace(/【[^】]*】/g, "").trim();
      if (textToSpeak) {
        await speakInCall(textToSpeak, settings.voiceId);
      }
    }
  } catch (error) {
    console.error("通话AI回复失败:", error);
    showCallTypingIndicator(false);
    addCallMessage("(出错了，请重试)", "system");
  }
}

// 重回通话中AI的回复
async function rerollCallResponse() {
  if (!callState.active || callState.status !== "connected") return;
  if (callState.conversationHistory.length === 0) return;

  // 找到最后一条AI回复
  let lastAiIndex = -1;
  for (let i = callState.conversationHistory.length - 1; i >= 0; i--) {
    if (callState.conversationHistory[i].role === "assistant") {
      lastAiIndex = i;
      break;
    }
  }

  if (lastAiIndex === -1) return;

  // 删除最后一条AI回复
  callState.conversationHistory.splice(lastAiIndex, 1);

  // 删除界面上的最后一条AI消息
  const wrapper = document.getElementById("callMessagesWrapper");
  const messages = wrapper.querySelectorAll(".call-message.ai");
  if (messages.length > 0) {
    messages[messages.length - 1].remove();
  }

  // 停止当前播放的音频
  if (callState.currentAudio) {
    callState.currentAudio.pause();
    callState.currentAudio = null;
  }

  // 找到最后一条用户消息作为上下文
  let lastUserMsg = "";
  for (let i = callState.conversationHistory.length - 1; i >= 0; i--) {
    if (callState.conversationHistory[i].role === "user") {
      lastUserMsg = callState.conversationHistory[i].content;
      break;
    }
  }

  // 重新生成回复
  await generateCallResponse(lastUserMsg || "请继续对话");
}

// 添加通话消息到界面
function addCallMessage(text, sender, preserveActions = false) {
  const wrapper = document.getElementById("callMessagesWrapper");
  const msgDiv = document.createElement("div");
  msgDiv.className = `call-message ${sender}`;

  if (sender === "ai" && preserveActions) {
    // 视频通话：【】动作描写用不同样式
    const html = text.replace(
      /【([^】]*)】/g,
      '<span class="action-text">【$1】</span>'
    );
    msgDiv.innerHTML = html;
  } else {
    msgDiv.textContent = text;
  }

  wrapper.appendChild(msgDiv);

  // 滚动到底部
  const container = document.getElementById("callConversation");
  container.scrollTop = container.scrollHeight;
}

// 显示/隐藏AI正在输入指示器
function showCallTypingIndicator(show) {
  const indicator = document.getElementById("callTypingIndicator");
  if (indicator) {
    indicator.classList.toggle("active", show);
    if (show) {
      const container = document.getElementById("callConversation");
      container.scrollTop = container.scrollHeight;
    }
  }
}

// 在通话中朗读文字
async function speakInCall(text, voiceId) {
  if (callState.isAiSpeaking) return;
  callState.isAiSpeaking = true;

  // 使用和试听一样的配置来源
  const currentGroupId =
    (window.voiceConfig && window.voiceConfig.groupId) ||
    document.getElementById("voiceGroupId")?.value;
  const currentApiKey =
    (window.voiceConfig && window.voiceConfig.apiKey) ||
    document.getElementById("voiceApiKey")?.value;

  if (!currentGroupId || !currentApiKey) {
    console.error("通话语音: MiniMax配置缺失");
    callState.isAiSpeaking = false;
    return;
  }

  if (!voiceId) {
    console.error("通话语音: Voice ID缺失");
    callState.isAiSpeaking = false;
    return;
  }

  // 清洗文本 - 移除动作描写
  let cleanText = text;
  cleanText = cleanText
    .replace(/[\(（][^\)）]*[\)）]/g, "")
    .replace(/\*[^\*]+\*/g, "")
    .replace(/【[^】]*】/g, "");
  cleanText = cleanText.replace(/\n/g, "，");
  cleanText = cleanText
    .replace(/……/g, "，")
    .replace(/…/g, "，")
    .replace(/—/g, "，")
    .replace(/~/g, "")
    .replace(/["]/g, "");
  cleanText = cleanText.replace(/[^\u4e00-\u9fa5a-zA-Z0-9，。！？,.?! ]/g, "");

  if (cleanText.trim().length < 1) {
    callState.isAiSpeaking = false;
    return;
  }

  console.log("通话语音合成:", {
    voiceId,
    textLength: cleanText.length,
    text: cleanText.substring(0, 50),
  });

  try {
    // 检查是否使用国际线路
    const activeIntlBtn = document.getElementById("voiceUrlIntl");
    const isIntlSelected =
      activeIntlBtn && activeIntlBtn.classList.contains("active");
    const apiUrl = isIntlSelected
      ? "https://api.minimaxi.chat"
      : "https://api.minimax.chat";

    const response = await fetch(
      `${apiUrl}/v1/t2a_v2?GroupId=${currentGroupId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model:
            (window.voiceConfig && window.voiceConfig.model) ||
            "speech-01-turbo",
          text: cleanText,
          stream: false,
          voice_setting: {
            voice_id: voiceId,
            speed: 1.0,
            vol: 1.0,
            pitch: 0,
          },
          audio_setting: {
            sample_rate: 32000,
            bitrate: 128000,
            format: "mp3",
            channel: 1,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("通话语音API错误:", response.status);
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log("通话语音API响应:", result.base_resp);

    if (result.base_resp && result.base_resp.status_code !== 0) {
      throw new Error(result.base_resp.status_msg);
    }

    // 处理音频数据 - hex转bytes（和generateSpeech一样）
    const audioHex = result.data?.audio || result.audio;
    if (audioHex) {
      const bytes = new Uint8Array(audioHex.length / 2);
      for (let i = 0; i < audioHex.length; i += 2) {
        bytes[i / 2] = parseInt(audioHex.substr(i, 2), 16);
      }
      const blob = new Blob([bytes.buffer], { type: "audio/mp3" });
      const audioUrl = URL.createObjectURL(blob);

      const audio = new Audio(audioUrl);
      callState.currentAudio = audio;

      audio.onended = () => {
        callState.isAiSpeaking = false;
        callState.currentAudio = null;
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (e) => {
        console.error("通话语音播放错误:", e);
        callState.isAiSpeaking = false;
        callState.currentAudio = null;
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
      return;
    }

    // 备用：URL处理
    const audioUrl = result.data?.audio_url || result.audio_url;
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      callState.currentAudio = audio;

      audio.onended = () => {
        callState.isAiSpeaking = false;
        callState.currentAudio = null;
      };

      audio.onerror = (e) => {
        console.error("通话语音播放错误:", e);
        callState.isAiSpeaking = false;
        callState.currentAudio = null;
      };

      await audio.play();
      return;
    }

    console.error("通话语音: 无音频数据");
    callState.isAiSpeaking = false;
  } catch (error) {
    console.error("通话语音合成失败:", error);
    callState.isAiSpeaking = false;
  }
}

// AI主动来电
function aiInitiateCall(charId, type = "voice") {
  const settings = chatSettings[charId] || {};
  if (!settings.aiCallEnabled) return;

  const char = characters.find((c) => c.id === charId);
  if (!char) return;

  // 显示来电通知
  callState.charId = charId;
  callState.type = type;
  callState.status = "incoming";

  const overlay = document.getElementById("incomingCallOverlay");
  const avatarImg = document.getElementById("incomingCallAvatarImg");
  const avatarPlaceholder = document.getElementById(
    "incomingCallAvatarPlaceholder"
  );

  if (char.avatar) {
    avatarImg.src = char.avatar;
    avatarImg.style.display = "block";
    avatarPlaceholder.style.display = "none";
  } else {
    avatarImg.style.display = "none";
    avatarPlaceholder.style.display = "block";
  }

  document.getElementById("incomingCallName").textContent =
    settings.charNote || char.note || char.name;
  document.getElementById("incomingCallTypeIcon").textContent =
    type === "video" ? "▶" : "☎";
  document.getElementById("incomingCallTypeText").textContent =
    type === "video" ? "视频通话" : "语音通话";

  overlay.classList.add("active");

  // 30秒后自动取消
  setTimeout(() => {
    if (callState.status === "incoming") {
      declineIncomingCall();
      addCallRecord("missed");
    }
  }, 30000);
}

// 接听来电通知
function acceptIncomingCall() {
  document.getElementById("incomingCallOverlay").classList.remove("active");

  // 打开通话界面
  const char = characters.find((c) => c.id === callState.charId);
  if (!char) return;

  const settings = chatSettings[callState.charId] || {};

  callState.active = true;
  callState.conversationHistory = [];
  callState.videoSelfExpanded = false;

  const overlay = document.getElementById("callOverlay");
  overlay.className = `call-overlay ${callState.type}-call active`;

  const charName = settings.charNote || char.note || char.name;
  const charAvatar = settings.otherAvatar || char.avatar;

  const avatarImg = document.getElementById("callAvatarImg");
  const avatarPlaceholder = document.getElementById("callAvatarPlaceholder");
  if (charAvatar) {
    avatarImg.src = charAvatar;
    avatarImg.style.display = "block";
    avatarPlaceholder.style.display = "none";
  } else {
    avatarImg.style.display = "none";
    avatarPlaceholder.style.display = "block";
    avatarPlaceholder.textContent = charName.charAt(0);
  }

  document.getElementById("callName").textContent = charName;
  // 清空消息但保留结构
  document.getElementById("callMessagesWrapper").innerHTML = "";
  showCallTypingIndicator(false);

  // 视频通话设置
  if (callState.type === "video") {
    document.getElementById("videoCallName").textContent = charName;

    const videoMainImg = document.getElementById("videoMainImg");
    const videoMainPlaceholder = document.getElementById(
      "videoMainPlaceholder"
    );
    if (settings.videoCallPartnerImage) {
      videoMainImg.src = settings.videoCallPartnerImage;
      videoMainImg.style.display = "block";
      videoMainPlaceholder.style.display = "none";
    } else {
      videoMainImg.style.display = "none";
      videoMainPlaceholder.style.display = "flex";
      const mainAvatarImg = document.getElementById("videoMainAvatarImg");
      const mainAvatarPlaceholder = document.getElementById(
        "videoMainAvatarPlaceholder"
      );
      if (charAvatar) {
        mainAvatarImg.src = charAvatar;
        mainAvatarImg.style.display = "block";
        mainAvatarPlaceholder.style.display = "none";
      } else {
        mainAvatarPlaceholder.textContent = charName.charAt(0);
      }
      document.getElementById("videoMainName").textContent = charName;
    }

    const videoSelfImg = document.getElementById("videoSelfImg");
    const videoSelfPlaceholder = document.getElementById(
      "videoSelfPlaceholder"
    );
    if (settings.videoCallSelfImage) {
      videoSelfImg.src = settings.videoCallSelfImage;
      videoSelfImg.style.display = "block";
      videoSelfPlaceholder.style.display = "none";
    } else {
      videoSelfImg.style.display = "none";
      videoSelfPlaceholder.style.display = "flex";
    }
    document.getElementById("videoSelf").classList.remove("expanded");
  }

  // 显示来电按钮
  document.getElementById("callCallingBtns").style.display = "none";
  document.getElementById("callIncomingBtns").style.display = "flex";
  document.getElementById("callInCallBtns").style.display = "none";

  // 直接进入通话
  acceptCall();

  // AI说话
  generateCallResponse("用户接听了你的来电，自然地开始对话");
}

// 拒绝来电通知
function declineIncomingCall() {
  document.getElementById("incomingCallOverlay").classList.remove("active");
  callState.status = "idle";
  callState.charId = null;
}

function sendFakeLocation() {
  // 打开位置选择弹窗
  document.getElementById("locationModal").classList.add("active");
  document.getElementById("locationNameInput").value = "";
  document.getElementById("locationAddressInput").value = "";
  closeChatPanel();
}

// ==================== 语音消息功能 ====================
function openVoiceMessageModal() {
  document.getElementById("voiceMessageModal").classList.add("active");
  document.getElementById("voiceMessageInput").value = "";
  closeChatPanel();
}

function closeVoiceMessageModal() {
  document.getElementById("voiceMessageModal").classList.remove("active");
}

function sendVoiceMessage() {
  const text = document.getElementById("voiceMessageInput").value.trim();
  if (!text) {
    showToast("请输入语音内容");
    return;
  }

  // 计算模拟的语音时长（大约每10个字1秒，最少2秒，最多60秒）
  const duration = Math.max(2, Math.min(60, Math.ceil(text.length / 10)));

  // 发送语音消息
  sendVoiceAsUserMessage(text, duration);
  closeVoiceMessageModal();
}

// 发送语音消息给AI（AI会认为这是用户的语音）
async function sendVoiceAsUserMessage(voiceText, duration) {
  // 检查是否是群聊
  if (currentGroupId) {
    await sendGroupVoiceMessage(voiceText, duration);
    return;
  }

  if (!currentChatCharId) return;

  // 保存到聊天历史 - 使用特殊格式存储
  if (!chatHistories[currentChatCharId]) {
    chatHistories[currentChatCharId] = [];
  }

  const msgObj = {
    role: "user",
    content: voiceText, // 存储原始文字
    isVoice: true,
    voiceText: voiceText,
    duration: duration,
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    timestamp: Date.now(),
  };

  chatHistories[currentChatCharId].push(msgObj);
  await localforage.setItem("chatHistories", chatHistories);

  // 渲染消息
  renderConversation();

  // 滚动到底部
  const container = document.getElementById("convMessages");
  if (container) {
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 100);
  }

  // 触发AI回复
  await requestAIReplyForVoice(voiceText, duration);
}

// 群聊发送语音消息
async function sendGroupVoiceMessage(voiceText, duration) {
  if (!currentGroupId) return;

  const group = groupChats.find((g) => g.id === currentGroupId);
  if (!group) return;

  const messagesKey = `group_messages_${currentGroupId}`;
  const messages = (await localforage.getItem(messagesKey)) || [];

  // 添加用户语音消息
  const userMsg = {
    role: "user",
    content: voiceText,
    isVoice: true,
    voiceText: voiceText,
    duration: duration,
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    timestamp: Date.now(),
  };
  messages.push(userMsg);
  await localforage.setItem(messagesKey, messages);

  // 重新渲染
  loadGroupMessages(currentGroupId);

  // 更新群聊最后消息
  group.lastMessage = `[语音消息 ${duration}秒]`;
  group.lastTime = "刚刚";
  await localforage.setItem("groupChats", groupChats);
  renderCharacters();

  // 不自动触发AI回复，让用户自己决定
  // await requestGroupAIReply(`[语音消息 ${duration}秒] ${voiceText}`);
}

// 播放群聊用户语音条
function playGroupUserVoiceBar(event, msgIndex) {
  event.stopPropagation();
  const voiceBar = event.currentTarget;
  const duration =
    parseInt(voiceBar.querySelector(".user-voice-duration")?.textContent) || 3;

  // 如果已经在播放，停止
  if (voiceBar.classList.contains("playing")) {
    voiceBar.classList.remove("playing");
    return;
  }

  // 停止其他正在播放的
  document
    .querySelectorAll(".user-voice-bar.playing, .voice-bar.playing")
    .forEach((bar) => {
      bar.classList.remove("playing");
    });

  // 添加播放状态
  voiceBar.classList.add("playing");

  // 模拟播放时间后停止
  setTimeout(() => {
    voiceBar.classList.remove("playing");
  }, duration * 1000);
}

// 切换群聊用户语音文字显示
async function toggleGroupUserVoiceText(event, msgIndex) {
  event.stopPropagation();

  const textEl = document.getElementById(`groupUserVoiceText-${msgIndex}`);
  const btn = event.currentTarget;

  if (!textEl) return;

  const isVisible = textEl.classList.contains("visible");

  if (isVisible) {
    textEl.classList.remove("visible");
    btn.textContent = "转文字";
  } else {
    textEl.classList.add("visible");
    btn.textContent = "收起文字";
  }

  // 保存状态到群聊消息
  if (currentGroupId) {
    const messagesKey = `group_messages_${currentGroupId}`;
    const messages = (await localforage.getItem(messagesKey)) || [];
    if (messages[msgIndex]) {
      messages[msgIndex].voiceTextVisible = !isVisible;
      await localforage.setItem(messagesKey, messages);
    }
  }
}

// 播放群聊AI语音消息
async function playGroupAIVoice(event, charId, voiceText) {
  event.stopPropagation();
  const voiceBar = event.currentTarget;
  const duration = Math.max(2, Math.ceil(voiceText.length / 8));

  // 如果已经在播放，停止
  if (voiceBar.classList.contains("playing")) {
    voiceBar.classList.remove("playing");
    // 停止当前播放的音频
    if (window.currentGroupVoiceAudio) {
      window.currentGroupVoiceAudio.pause();
      window.currentGroupVoiceAudio = null;
    }
    return;
  }

  // 停止其他正在播放的
  document
    .querySelectorAll(
      ".ai-voice-bar.playing, .voice-bar.playing, .user-voice-bar.playing"
    )
    .forEach((bar) => {
      bar.classList.remove("playing");
    });
  if (window.currentGroupVoiceAudio) {
    window.currentGroupVoiceAudio.pause();
    window.currentGroupVoiceAudio = null;
  }

  // 添加播放状态
  voiceBar.classList.add("playing");

  // 获取角色的voiceId
  const charSettings = chatSettings[charId] || {};
  const voiceId = charSettings.voiceId;

  if (!voiceId) {
    console.warn("角色没有配置voiceId，仅显示动画");
    // 没有voiceId，仅模拟播放动画
    setTimeout(() => {
      voiceBar.classList.remove("playing");
    }, duration * 1000);
    return;
  }

  // 获取MiniMax配置
  const currentGroupId =
    window.voiceConfig?.groupId ||
    document.getElementById("voiceGroupId")?.value;
  const currentApiKey =
    window.voiceConfig?.apiKey || document.getElementById("voiceApiKey")?.value;

  if (!currentGroupId || !currentApiKey) {
    console.warn("MiniMax配置缺失，仅显示动画");
    setTimeout(() => {
      voiceBar.classList.remove("playing");
    }, duration * 1000);
    return;
  }

  try {
    // 清洗文本
    let cleanText = voiceText
      .replace(/[\(（][^\)）]*[\)）]/g, "")
      .replace(/\*[^\*]+\*/g, "")
      .replace(/【[^】]*】/g, "")
      .replace(/\n/g, "，")
      .replace(/……/g, "，")
      .replace(/…/g, "，")
      .replace(/~/g, "");

    if (cleanText.trim().length < 1) {
      voiceBar.classList.remove("playing");
      return;
    }

    // 检查是否使用国际线路
    const activeIntlBtn = document.getElementById("voiceUrlIntl");
    const isIntlSelected =
      activeIntlBtn && activeIntlBtn.classList.contains("active");
    const apiUrl = isIntlSelected
      ? "https://api.minimaxi.chat"
      : "https://api.minimax.chat";

    const response = await fetch(
      `${apiUrl}/v1/t2a_v2?GroupId=${currentGroupId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: window.voiceConfig?.model || "speech-01-turbo",
          text: cleanText,
          stream: false,
          voice_setting: {
            voice_id: voiceId,
            speed: 1.0,
            vol: 1.0,
            pitch: 0,
          },
          audio_setting: {
            sample_rate: 32000,
            format: "mp3",
          },
        }),
      }
    );

    const data = await response.json();

    if (data.data && data.data.audio) {
      const audioData = data.data.audio;
      const audioBlob = await fetch(`data:audio/mp3;base64,${audioData}`).then(
        (r) => r.blob()
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      window.currentGroupVoiceAudio = audio;

      audio.onended = () => {
        voiceBar.classList.remove("playing");
        URL.revokeObjectURL(audioUrl);
        window.currentGroupVoiceAudio = null;
      };

      audio.onerror = () => {
        voiceBar.classList.remove("playing");
        URL.revokeObjectURL(audioUrl);
        window.currentGroupVoiceAudio = null;
      };

      await audio.play();
    } else {
      console.error("TTS响应无效:", data);
      setTimeout(() => {
        voiceBar.classList.remove("playing");
      }, duration * 1000);
    }
  } catch (error) {
    console.error("TTS播放失败:", error);
    setTimeout(() => {
      voiceBar.classList.remove("playing");
    }, duration * 1000);
  }
}

// 切换群聊AI语音文字显示
function toggleGroupAIVoiceText(event, msgIndex) {
  event.stopPropagation();
  const textEl = document.getElementById(`groupAIVoiceText-${msgIndex}`);
  const btn = event.currentTarget;

  if (!textEl) return;

  const isVisible = textEl.style.display !== "none";

  if (isVisible) {
    textEl.style.display = "none";
    btn.textContent = "转文字";
  } else {
    textEl.style.display = "block";
    btn.textContent = "收起";
  }
}

// AI回复语音消息
async function requestAIReplyForVoice(voiceText, duration) {
  if (!currentChatCharId) return;

  const char = window.characters?.find(
    (c) => String(c.id) === String(currentChatCharId)
  );
  if (!char) return;

  // 获取API配置
  const charSettings = chatSettings[currentChatCharId] || {};
  let apiConfig = null;

  if (charSettings.apiPreset) {
    apiConfig = apiPresets.find((p) => p.id === charSettings.apiPreset);
  }
  if (!apiConfig && activePresetId) {
    apiConfig = apiPresets.find((p) => p.id === activePresetId);
  }
  if (!apiConfig && apiPresets.length > 0) {
    apiConfig = apiPresets[0];
  }

  if (!apiConfig || !apiConfig.url || !apiConfig.key) {
    showToast("请先配置API");
    return;
  }

  // 构建消息历史
  const history = chatHistories[currentChatCharId] || [];
  const messages = [];

  // 添加系统提示词
  const persona = charSettings.persona || char.description || "";
  if (persona) {
    messages.push({ role: "system", content: persona });
  }

  // 添加历史消息（最近20条）
  const recentHistory = history.slice(-20);
  for (const msg of recentHistory) {
    if (msg.role === "user") {
      // 如果是语音消息，告诉AI这是语音
      if (msg.isVoice && msg.voiceText) {
        messages.push({
          role: "user",
          content: `[语音消息 ${msg.duration}秒] ${msg.voiceText}`,
        });
      } else {
        messages.push({
          role: "user",
          content: msg.content?.replace(/<[^>]*>/g, "") || "",
        });
      }
    } else if (msg.role === "assistant") {
      messages.push({
        role: "assistant",
        content: msg.content?.replace(/<[^>]*>/g, "") || "",
      });
    }
  }

  try {
    const response = await fetch(`${apiConfig.url}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiConfig.key}`,
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: messages,
        temperature: parseFloat(charSettings.temperature) || 0.8,
      }),
    });

    if (!response.ok) {
      showToast("AI回复失败");
      return;
    }

    const data = await response.json();
    let aiReply = data.choices?.[0]?.message?.content?.trim();

    // 过滤思维链
    aiReply = filterThinkingTags(aiReply);

    if (aiReply) {
      // 保存AI回复
      const aiMsgObj = {
        role: "assistant",
        content: aiReply,
        time: new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestamp: Date.now(),
      };

      chatHistories[currentChatCharId].push(aiMsgObj);
      await localforage.setItem("chatHistories", chatHistories);

      // 更新最后消息
      if (typeof updateCharacterLastMessage === "function") {
        updateCharacterLastMessage(currentChatCharId, aiReply);
      }

      renderConversation();

      // 滚动到底部
      const container = document.getElementById("convMessages");
      if (container) {
        setTimeout(() => {
          container.scrollTop = container.scrollHeight;
        }, 100);
      }
    }
  } catch (error) {
    console.error("语音消息AI回复出错:", error);
    showToast("AI回复出错");
  }
}

// 播放用户语音条
function playUserVoiceBar(event, msgIndex) {
  event.stopPropagation();
  const voiceBar = event.currentTarget;
  const duration =
    parseInt(voiceBar.querySelector(".user-voice-duration")?.textContent) || 3;

  // 如果已经在播放，停止
  if (voiceBar.classList.contains("playing")) {
    voiceBar.classList.remove("playing");
    return;
  }

  // 停止其他正在播放的
  document
    .querySelectorAll(".user-voice-bar.playing, .voice-bar.playing")
    .forEach((bar) => {
      bar.classList.remove("playing");
    });

  // 添加播放状态
  voiceBar.classList.add("playing");

  // 模拟播放时间后停止
  setTimeout(() => {
    voiceBar.classList.remove("playing");
  }, duration * 1000);
}

// 切换用户语音文字显示
async function toggleUserVoiceText(event, msgIndex) {
  event.stopPropagation();

  const textEl = document.getElementById(`userVoiceText-${msgIndex}`);
  const btn = event.currentTarget;

  if (!textEl) return;

  const isVisible = textEl.classList.contains("visible");

  if (isVisible) {
    textEl.classList.remove("visible");
    btn.textContent = "转文字";
  } else {
    textEl.classList.add("visible");
    btn.textContent = "收起文字";
  }

  // 保存状态
  if (
    chatHistories[currentChatCharId] &&
    chatHistories[currentChatCharId][msgIndex]
  ) {
    chatHistories[currentChatCharId][msgIndex].voiceTextVisible = !isVisible;
    await localforage.setItem("chatHistories", chatHistories);
  }
}

// 播放用户语音消息（旧函数兼容）
function playUserVoiceMessage(element) {
  // 兼容旧版本
  if (element && element.getAttribute) {
    const text = element.getAttribute("data-voice-text");
    if (text) {
      showToast(
        `🎤 "${text.substring(0, 30)}${text.length > 30 ? "..." : ""}"`
      );
    }
  }
}

// 播放语音消息（旧函数兼容）
function playVoiceMessage(element) {
  if (element && element.getAttribute) {
    playUserVoiceMessage(element);
  }
}

function closeLocationModal() {
  document.getElementById("locationModal").classList.remove("active");
}
async function confirmSendLocation() {
  const name =
    document.getElementById("locationNameInput").value.trim() || "我的位置";
  const address =
    document.getElementById("locationAddressInput").value.trim() ||
    "点击查看详情";

  const locationHtml = `
    <div class="location-card">
      <div class="location-card-map">
        <div class="location-card-map-bg"></div>
        <div class="location-card-map-icon">📍</div>
      </div>
      <div class="location-card-info">
        <div class="location-card-name">${name}</div>
        <div class="location-card-address">${address}</div>
      </div>
    </div>
  `;

  // 检查是否在群聊中
  if (currentGroupId) {
    const group = groupChats.find((g) => g.id === currentGroupId);
    if (!group) {
      showToast("群聊不存在");
      return;
    }

    const messagesKey = `group_messages_${currentGroupId}`;
    const messages = (await localforage.getItem(messagesKey)) || [];

    const msgObj = {
      role: "user",
      content: locationHtml,
      isHtml: true,
      time: new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    messages.push(msgObj);
    await localforage.setItem(messagesKey, messages);

    group.lastMessage = "[位置]";
    group.lastTime = "刚刚";
    await localforage.setItem("groupChats", groupChats);

    loadGroupMessages(currentGroupId);
    renderCharacters();
    closeLocationModal();
    return;
  }

  // 单聊发送
  sendMediaMessage(locationHtml, "location");
  closeLocationModal();
}
// AI发送位置卡片 (保留兼容)
function aiSendLocation(name, address) {
  return `
    <div class="location-card">
      <div class="location-card-map">
        <div class="location-card-map-bg"></div>
        <div class="location-card-map-icon">📍</div>
      </div>
      <div class="location-card-info">
        <div class="location-card-name">${name || "TA的位置"}</div>
        <div class="location-card-address">${address || "点击查看详情"}</div>
      </div>
    </div>
  `;
}

/* ==================== 钱包系统 ==================== */
window.walletData = {
  balance: 0,
  history: [],
};

// 初始化钱包数据
async function initWalletData() {
  try {
    const saved = await safeLocalforageGet("walletData");
    if (saved) {
      window.walletData = saved;
    }
    updateWalletDisplay();
  } catch (e) {
    console.error("钱包数据加载失败", e);
  }
}

// 保存钱包数据
async function saveWalletData() {
  try {
    await localforage.setItem("walletData", window.walletData);
  } catch (e) {
    console.error("钱包数据保存失败", e);
  }
}

// 更新钱包显示
function updateWalletDisplay() {
  // 更新钱包页面的余额
  const balanceEl = document.getElementById("walletBalanceDisplay");
  if (balanceEl) {
    balanceEl.textContent = window.walletData.balance.toFixed(2);
  }
}

// 打开钱包页面
function openWalletPage() {
  document.getElementById("walletPage").classList.add("active");
  updateWalletDisplay();
  renderWalletHistoryPage();
}

// 关闭钱包页面
function closeWalletPage() {
  document.getElementById("walletPage").classList.remove("active");
}

// 渲染钱包历史记录
function renderWalletHistoryPage() {
  const list = document.getElementById("walletHistoryListPage");
  const history = window.walletData.history || [];

  if (history.length === 0) {
    list.innerHTML = '<div class="wallet-history-empty">暂无交易记录</div>';
    return;
  }

  let html = "";
  history.slice(0, 50).forEach((item, index) => {
    const isIncome = item.type === "recharge" || item.type === "receive";
    html += `
      <div class="wallet-history-item" onclick="openDeleteHistoryModal(${index})">
        <div class="wallet-history-icon ${isIncome ? "income" : "expense"}">
          ${
            item.type === "recharge"
              ? "💳"
              : item.type === "receive"
              ? "↓"
              : "↑"
          }
        </div>
        <div class="wallet-history-info">
          <div class="wallet-history-desc">${item.desc}</div>
          <div class="wallet-history-time">${item.time}</div>
        </div>
        <div class="wallet-history-amount ${isIncome ? "income" : "expense"}">
          ${isIncome ? "+" : "-"}¥${item.amount.toFixed(2)}
        </div>
        <div class="wallet-history-delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>
    `;
  });

  list.innerHTML = html;
}
// 删除交易记录相关
var pendingDeleteIndex = null;

function openDeleteHistoryModal(index) {
  const history = window.walletData.history || [];
  if (index < 0 || index >= history.length) return;

  pendingDeleteIndex = index;
  const item = history[index];
  const isIncome = item.type === "recharge" || item.type === "receive";

  const infoEl = document.getElementById("deleteHistoryInfo");
  infoEl.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span style="color: #666;">${item.desc}</span>
      <span style="font-weight: 600; color: ${
        isIncome ? "#4caf50" : "#f44336"
      };">
        ${isIncome ? "+" : "-"}¥${item.amount.toFixed(2)}
      </span>
    </div>
    <div style="font-size: 0.8rem; color: #999;">${item.time}</div>
  `;

  // 默认不勾选调整余额
  document.getElementById("deleteAdjustBalance").checked = false;
  document.getElementById("deleteHistoryModal").classList.add("active");
}

function closeDeleteHistoryModal() {
  document.getElementById("deleteHistoryModal").classList.remove("active");
  pendingDeleteIndex = null;
}

function confirmDeleteHistory() {
  if (pendingDeleteIndex === null) return;

  const history = window.walletData.history || [];
  if (pendingDeleteIndex < 0 || pendingDeleteIndex >= history.length) {
    closeDeleteHistoryModal();
    return;
  }

  const item = history[pendingDeleteIndex];
  const adjustBalance = document.getElementById("deleteAdjustBalance").checked;

  // 如果需要调整余额
  if (adjustBalance) {
    const isIncome = item.type === "recharge" || item.type === "receive";
    if (isIncome) {
      // 收入记录删除时，余额减少
      window.walletData.balance -= item.amount;
    } else {
      // 支出记录删除时，余额增加
      window.walletData.balance += item.amount;
    }
    // 确保余额不为负数
    if (window.walletData.balance < 0) {
      window.walletData.balance = 0;
    }
  }

  // 删除记录
  window.walletData.history.splice(pendingDeleteIndex, 1);

  // 保存并刷新
  saveWalletData();
  updateWalletDisplay();
  renderWalletHistoryPage();
  closeDeleteHistoryModal();

  showToast(adjustBalance ? "已删除并调整余额" : "已删除记录");
}
// 打开充值弹窗
function openRechargeModal() {
  document.getElementById("rechargeModal").classList.add("active");
  document.getElementById("rechargeCustomAmount").value = "";
  // 清除选中状态
  document.querySelectorAll(".recharge-amount-btn").forEach((btn) => {
    btn.classList.remove("selected");
  });
}

function closeRechargeModal() {
  document.getElementById("rechargeModal").classList.remove("active");
}

function selectRechargeAmount(amount) {
  document.getElementById("rechargeCustomAmount").value = amount;
  document.querySelectorAll(".recharge-amount-btn").forEach((btn) => {
    btn.classList.remove("selected");
    if (btn.textContent.includes(amount)) {
      btn.classList.add("selected");
    }
  });
}

function clearRechargeSelection() {
  document.querySelectorAll(".recharge-amount-btn").forEach((btn) => {
    btn.classList.remove("selected");
  });
}

function confirmRecharge() {
  const amount = parseFloat(
    document.getElementById("rechargeCustomAmount").value
  );
  if (!amount || amount <= 0) {
    showToast("请输入有效金额");
    return;
  }

  window.walletData.balance += amount;
  window.walletData.history.unshift({
    id: Date.now(),
    type: "recharge",
    amount: amount,
    desc: "钱包充值",
    time: new Date().toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
  });

  saveWalletData();
  updateWalletDisplay();
  renderWalletHistoryPage(); // 刷新历史列表
  closeRechargeModal();
  showToast(`充值成功！余额 ¥${window.walletData.balance.toFixed(2)}`);
}

/* ==================== 转账功能 ==================== */
var selectedTransferTarget = null; // 群聊中选择的转账目标

function openTransferModal() {
  // 群聊中也支持转账
  if (!currentChatCharId && !currentGroupId) {
    showToast("请先打开一个对话");
    return;
  }

  const memberSelectDiv = document.getElementById("transferMemberSelect");

  if (currentGroupId) {
    // 群聊：显示成员选择列表
    const group = groupChats.find((g) => g.id === currentGroupId);
    if (!group || !group.members || group.members.length === 0) {
      showToast("群里没有成员");
      return;
    }

    document.getElementById("transferToName").textContent = "选择转账对象：";

    // 生成成员选择列表
    let membersHtml = "";
    group.members.forEach((charId, idx) => {
      const char = characters.find((c) => c.id === charId);
      if (char) {
        const isSelected = idx === 0;
        if (isSelected) selectedTransferTarget = charId;
        membersHtml += `
          <div class="transfer-member-item ${isSelected ? "selected" : ""}" 
               data-char-id="${charId}"
               onclick="selectTransferTarget(${charId})">
            <div class="transfer-member-avatar">
              ${
                char.avatar ? `<img src="${char.avatar}">` : char.name.charAt(0)
              }
            </div>
            <div class="transfer-member-name">${char.note || char.name}</div>
            <div class="transfer-member-check">${isSelected ? "✓" : ""}</div>
          </div>
        `;
      }
    });
    memberSelectDiv.innerHTML = membersHtml;
    memberSelectDiv.style.display = "block";
  } else {
    // 单聊
    const char = characters.find((c) => c.id === currentChatCharId);
    if (!char) return;
    document.getElementById("transferToName").textContent = `转给：${
      char.note || char.name
    }`;
    memberSelectDiv.style.display = "none";
    selectedTransferTarget = null;
  }

  document.getElementById("sendTransferModal").classList.add("active");
  document.getElementById("transferAmountInput").value = "";
  document.getElementById("transferNoteInput").value = "";
  document.getElementById(
    "transferBalanceHint"
  ).textContent = `可用余额：¥${window.walletData.balance.toFixed(2)}`;
  closeChatPanel();
}

function selectTransferTarget(charId) {
  selectedTransferTarget = charId;
  const char = characters.find((c) => c.id === charId);
  if (char) {
    document.getElementById("transferToName").textContent = `转给：${
      char.note || char.name
    }`;
  }
  // 更新选中状态
  document.querySelectorAll(".transfer-member-item").forEach((item) => {
    const itemCharId = parseInt(item.dataset.charId);
    if (itemCharId === charId) {
      item.classList.add("selected");
      item.querySelector(".transfer-member-check").textContent = "✓";
    } else {
      item.classList.remove("selected");
      item.querySelector(".transfer-member-check").textContent = "";
    }
  });
}

function closeTransferModal() {
  document.getElementById("sendTransferModal").classList.remove("active");
  selectedTransferTarget = null;
}

async function confirmTransfer() {
  const amount = parseFloat(
    document.getElementById("transferAmountInput").value
  );
  const note =
    document.getElementById("transferNoteInput").value.trim() || "转账";

  if (!amount || amount <= 0) {
    showToast("请输入有效金额");
    return;
  }

  if (amount > window.walletData.balance) {
    showToast("余额不足");
    return;
  }

  let targetName = "";
  let targetCharId = null;

  if (currentGroupId) {
    // 群聊：使用选择的目标
    if (!selectedTransferTarget) {
      showToast("请选择转账对象");
      return;
    }
    targetCharId = selectedTransferTarget;
    const char = characters.find((c) => c.id === targetCharId);
    targetName = char ? char.note || char.name : "群成员";
  } else {
    const char = characters.find((c) => c.id === currentChatCharId);
    if (!char) return;
    targetName = char.note || char.name;
    targetCharId = currentChatCharId;
  }

  // 扣款
  window.walletData.balance -= amount;
  window.walletData.history.unshift({
    id: Date.now(),
    type: "send",
    amount: amount,
    desc: `转账给 ${targetName}`,
    time: new Date().toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
  saveWalletData();
  updateWalletDisplay();

  // 发送转账卡片消息（包含目标信息）
  const transferId = "user_tf_" + Date.now();
  const transferCardHtml = `<div class="transfer-card" data-transfer-id="${transferId}" data-status="pending" data-target-id="${targetCharId}">
      <div class="transfer-card-header">
        <div class="transfer-card-icon">¥</div>
        <div class="transfer-card-info">
          <div class="transfer-card-title">${note}${
    currentGroupId ? ` (给${targetName})` : ""
  }</div>
          <div class="transfer-card-amount">${amount.toFixed(2)}</div>
        </div>
      </div>
      <div class="transfer-card-footer">
        <span>微信转账</span>
        <span class="transfer-card-status pending">待确认</span>
      </div>
    </div>`;

  if (currentGroupId) {
    // 群聊转账
    const messagesKey = `group_messages_${currentGroupId}`;
    const messages = (await localforage.getItem(messagesKey)) || [];
    messages.push({
      role: "user",
      content: transferCardHtml,
      isHtml: true,
      transferId: transferId,
      transferAmount: amount,
      transferStatus: "pending",
      transferTargetId: targetCharId,
      time: new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    await localforage.setItem(messagesKey, messages);
    loadGroupMessages(currentGroupId);
  } else {
    // 单聊转账
    if (!chatHistories[currentChatCharId])
      chatHistories[currentChatCharId] = [];
    chatHistories[currentChatCharId].push({
      role: "user",
      content: transferCardHtml,
      isHtml: true,
      transferId: transferId,
      transferAmount: amount,
      transferStatus: "pending",
      time: new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    await localforage.setItem("chatHistories", chatHistories);
    renderConversation();
  }

  closeTransferModal();
}

// 更新用户发送的转账状态（AI接受或拒绝时调用）
function updateUserTransferStatus(transferId, accepted) {
  const history = chatHistories[currentChatCharId] || [];
  for (let i = 0; i < history.length; i++) {
    if (history[i].transferId === transferId) {
      history[i].transferStatus = accepted ? "accepted" : "rejected";
      // 更新HTML内容
      history[i].content = history[i].content
        .replace(
          'data-status="pending"',
          `data-status="${accepted ? "accepted" : "rejected"}"`
        )
        .replace(
          'class="transfer-card-status pending">待确认',
          `class="transfer-card-status ${accepted ? "accepted" : "rejected"}">${
            accepted ? "已收款" : "已退回"
          }`
        );

      if (!accepted) {
        // 退款
        window.walletData.balance += history[i].transferAmount;
        window.walletData.history.unshift({
          id: Date.now(),
          type: "receive",
          amount: history[i].transferAmount,
          desc: "转账被退回",
          time: new Date().toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
        saveWalletData();
        updateWalletDisplay();
      }
      break;
    }
  }
  localforage.setItem("chatHistories", chatHistories);
  renderConversation();
}

// 群聊版本：更新用户发送的转账状态
async function updateGroupUserTransferStatus(targetCharId, accepted) {
  console.log(
    "updateGroupUserTransferStatus 被调用:",
    targetCharId,
    accepted,
    "currentGroupId:",
    currentGroupId
  );

  if (!currentGroupId) return;

  const messagesKey = `group_messages_${currentGroupId}`;
  const messages = (await localforage.getItem(messagesKey)) || [];

  console.log("消息总数:", messages.length);

  // 从后往前查找最近一条用户发给该角色的待处理转账
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];

    // 打印每条用户消息的转账信息
    if (msg.role === "user" && msg.transferId) {
      console.log(
        "找到转账消息:",
        i,
        "transferTargetId:",
        msg.transferTargetId,
        "targetCharId:",
        targetCharId,
        "status:",
        msg.transferStatus
      );
      console.log(
        "类型比较:",
        typeof msg.transferTargetId,
        typeof targetCharId,
        msg.transferTargetId == targetCharId
      );
    }

    if (
      msg.role === "user" &&
      msg.transferId &&
      msg.transferStatus === "pending" &&
      msg.transferTargetId == targetCharId // 注意这里改成 == 而不是 ===
    ) {
      console.log("匹配成功！更新状态");
      // 更新状态
      msg.transferStatus = accepted ? "accepted" : "rejected";
      console.log("替换前HTML:", msg.content.substring(0, 200));
      // 更新HTML内容
      msg.content = msg.content
        .replace(
          'data-status="pending"',
          `data-status="${accepted ? "accepted" : "rejected"}"`
        )
        .replace(
          /class="transfer-card-status pending">\s*待确认/,
          `class="transfer-card-status ${accepted ? "accepted" : "rejected"}">${
            accepted ? "已收款" : "已退回"
          }`
        );
      console.log(
        "footer部分:",
        msg.content.match(/transfer-card-footer[\s\S]*?<\/div>/)?.[0]
      );
      console.log("替换后HTML:", msg.content.substring(0, 200));
      if (!accepted) {
        // 退款给用户
        window.walletData.balance += msg.transferAmount;
        window.walletData.history.unshift({
          id: Date.now(),
          type: "receive",
          amount: msg.transferAmount,
          desc: "转账被退回",
          time: new Date().toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
        saveWalletData();
        updateWalletDisplay();
      }

      // 保存并刷新
      console.log("准备保存到localforage...");
      await localforage.setItem(messagesKey, messages);
      console.log("保存成功，准备刷新界面...");
      loadGroupMessages(currentGroupId);
      console.log("刷新完成");
      break;
    }
  }
}

// AI向用户转账 - 收款/退回
function acceptAITransfer(msgIdx, amount, btnEl) {
  // 获取角色名字
  const char = characters.find((c) => c.id === currentChatCharId);
  const charName = char ? char.name : "TA";

  // 收款
  window.walletData.balance += parseFloat(amount);
  window.walletData.history.unshift({
    id: Date.now(),
    type: "receive",
    amount: parseFloat(amount),
    desc: `收到 ${charName} 的转账`,
    time: new Date().toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
  saveWalletData();
  updateWalletDisplay();

  // 更新消息状态
  const history = chatHistories[currentChatCharId] || [];
  if (history[msgIdx]) {
    history[msgIdx].transferStatus = "accepted";
    localforage.setItem("chatHistories", chatHistories);
    renderConversation();
  }

  showToast(`收款成功！+¥${parseFloat(amount).toFixed(2)}`);
}

function rejectAITransfer(msgIdx, btnEl) {
  // 更新消息状态
  const history = chatHistories[currentChatCharId] || [];
  if (history[msgIdx]) {
    history[msgIdx].transferStatus = "rejected";
    localforage.setItem("chatHistories", chatHistories);
    renderConversation();
  }

  showToast("已退回转账");
}

/* ==================== 重Roll功能 ==================== */
async function rerollAIReply() {
  // 检查是否是群聊
  if (currentGroupId) {
    await rerollGroupAIReply();
    return;
  }

  if (!currentChatCharId) {
    showToast("请先打开一个对话");
    return;
  }

  const history = chatHistories[currentChatCharId] || [];
  if (history.length === 0) {
    showToast("没有可以重新生成的消息");
    return;
  }

  // 从后往前删除所有连续的AI消息（因为即时模式下AI会发多条）
  let deletedCount = 0;
  while (
    history.length > 0 &&
    history[history.length - 1].role === "assistant"
  ) {
    history.pop();
    deletedCount++;
  }

  if (deletedCount === 0) {
    showToast("最后一条不是AI消息，无法重roll");
    return;
  }

  // 保存并重新渲染
  chatHistories[currentChatCharId] = history;
  await localforage.setItem("chatHistories", chatHistories);
  renderConversation();

  // 关闭面板
  closeChatPanel();

  // 重新请求AI回复（不显示提示）
  requestAIReply();
}

// 群聊重roll
async function rerollGroupAIReply() {
  if (!currentGroupId) return;

  const messagesKey = `group_messages_${currentGroupId}`;
  const messages = (await localforage.getItem(messagesKey)) || [];

  if (messages.length === 0) {
    showToast("没有可以重新生成的消息");
    return;
  }

  // 从后往前删除所有连续的AI消息
  let deletedCount = 0;
  while (
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant"
  ) {
    messages.pop();
    deletedCount++;
  }

  if (deletedCount === 0) {
    showToast("最后一条不是AI消息，无法重roll");
    return;
  }

  // 关闭面板
  closeChatPanel();

  // 保存并重新渲染
  await localforage.setItem(messagesKey, messages);
  await loadGroupMessages(currentGroupId);

  // 获取最后一条消息作为上下文
  const lastMsg = messages.filter((m) => m.role !== "system").slice(-1)[0];
  const contextMsg = lastMsg ? lastMsg.content : "请在群里说点什么吧";

  // 重新请求群聊AI回复（这里会添加typing动画）
  requestGroupAIReply(contextMsg);
}

/* ==================== AI特殊消息处理 ==================== */
// 处理AI回复中的特殊标签
function processAISpecialTags(content) {
  let processed = content;

  // 处理转账标签 [转账:金额:说明] 或 [转账:金额]
  const transferMatch = processed.match(
    /\[转账[:：](\d+(?:\.\d+)?)(?:[:：]([^\]]*))?\]/
  );
  if (transferMatch) {
    const amount = transferMatch[1];
    const note = transferMatch[2] || "转账给你";
    processed = processed.replace(transferMatch[0], "");
    return {
      text: processed.trim(),
      specialCard: generateAITransferCard(amount, note),
      type: "transfer",
    };
  }

  // 处理位置标签 [位置:名称:地址] 或 [位置:名称]
  const locationMatch = processed.match(
    /\[位置[:：]([^\]:：]+)(?:[:：]([^\]]*))?\]/
  );
  if (locationMatch) {
    const name = locationMatch[1];
    const address = locationMatch[2] || "";
    processed = processed.replace(locationMatch[0], "");
    return {
      text: processed.trim(),
      specialCard: generateAILocationCard(name, address),
      type: "location",
    };
  }

  // 处理红包标签 [红包:金额:说明]
  const redpacketMatch = processed.match(
    /\[红包[:：](\d+(?:\.\d+)?)(?:[:：]([^\]]*))?\]/
  );
  if (redpacketMatch) {
    const amount = redpacketMatch[1];
    const note = redpacketMatch[2] || "恭喜发财";
    processed = processed.replace(redpacketMatch[0], "");
    return {
      text: processed.trim(),
      specialCard: generateAITransferCard(amount, note),
      type: "redpacket",
    };
  }

  return { text: processed, specialCard: null, type: null };
}

// 页面加载时初始化钱包
setTimeout(initWalletData, 500);

/* ==================== 修复：一键刷新消息列表预览 ==================== */
function fixAllLastMessages() {
  console.log("开始修复列表预览...");
  characters.forEach((char) => {
    const history = chatHistories[char.id] || [];
    if (history.length > 0) {
      // 取最后一条消息
      const lastMsg = history[history.length - 1];
      let previewText = lastMsg.content || "";

      // 根据类型生成预览
      if (previewText.match && previewText.match(/^\[语音[:：](.+)\]$/)) {
        previewText = "[语音]";
      } else if (lastMsg.isHtml || previewText.includes("<img")) {
        previewText = "[图片/消息]";
      } else {
        // 清除 HTML 标签和小说标记
        previewText = previewText.replace(/<[^>]+>/g, "").replace(/\*/g, "");
      }

      // 更新并保存
      char.lastMessage = previewText;
      char.lastTime = lastMsg.time;
    }
  });
  localforage.setItem("characters", characters);
  renderCharacters(); // 刷新界面
  console.log("列表预览修复完成 ✓");
}

// 页面加载后自动运行一次修复
setTimeout(fixAllLastMessages, 1000);
/* ==================== 修复：交互函数 (防冲突安全版) ==================== */

// 注意：这里不再用 var/let 声明变量，直接使用全局已存在的变量

// 1. 通用触摸处理 (补全逻辑)
window.handleTouchStart = function (e, index) {
  if (typeof isSelectionMode !== "undefined" && isSelectionMode) return;

  if (e.touches && e.touches[0]) {
    // 直接赋值给全局变量
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;

    // 清除旧定时器
    if (typeof longPressTimer !== "undefined" && longPressTimer) {
      clearTimeout(longPressTimer);
    }

    longPressTimer = setTimeout(() => {
      if (typeof showContextMenu === "function") {
        showContextMenu(touchStartX, touchStartY, index);
      }
    }, 500);
  }
};

window.handleTouchMove = function (e) {
  if (typeof longPressTimer !== "undefined" && !longPressTimer) return;

  if (e.touches && e.touches[0]) {
    let moveX = e.touches[0].clientX;
    let moveY = e.touches[0].clientY;
    // 如果移动超过 10px，取消长按
    if (
      Math.abs(moveX - touchStartX) > 10 ||
      Math.abs(moveY - touchStartY) > 10
    ) {
      if (typeof longPressTimer !== "undefined") {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }
  }
};

window.handleTouchEnd = function () {
  if (typeof longPressTimer !== "undefined" && longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
};

// 2. 鼠标处理 (兼容电脑端)
window.handleMouseDown = function (e, index) {
  if (typeof isSelectionMode !== "undefined" && isSelectionMode) return;

  if (typeof longPressTimer !== "undefined" && longPressTimer)
    clearTimeout(longPressTimer);

  longPressTimer = setTimeout(() => {
    if (typeof showContextMenu === "function") {
      showContextMenu(e.clientX, e.clientY, index);
    }
  }, 500);
};

window.handleMouseUp = function () {
  if (typeof longPressTimer !== "undefined" && longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
};

// 3. 语音气泡专用处理 (防止长按和点击冲突)
// voiceTouchStartTime 如果没定义，我们在 window 上定义它
if (typeof window.voiceTouchStartTime === "undefined") {
  window.voiceTouchStartTime = 0;
}

window.handleVoiceBubbleTouchStart = function (event, msgIndex) {
  window.voiceTouchStartTime = Date.now();
  if (typeof handleTouchStart === "function") {
    handleTouchStart(event, msgIndex);
  }
};

window.handleVoiceBubbleTouchEnd = function (event, msgIndex) {
  const touchDuration = Date.now() - window.voiceTouchStartTime;
  // 如果按住时间短于 450ms，且定时器还存在（说明长按还没触发）
  // 则视为点击，播放语音
  if (
    touchDuration < 450 &&
    typeof longPressTimer !== "undefined" &&
    longPressTimer
  ) {
    clearTimeout(longPressTimer);
    longPressTimer = null;

    // 尝试播放
    const voiceBar = event.currentTarget.querySelector(".voice-bar");
    if (voiceBar && typeof playVoiceMessageByIndex === "function") {
      playVoiceMessageByIndex(msgIndex, voiceBar);
    }
  } else {
    if (typeof handleTouchEnd === "function") {
      handleTouchEnd();
    }
  }
};
// ==================== 一起读书功能 ====================

function openReadTogether() {
  closeChatPanel();
  document.getElementById("readTogetherPage").classList.add("active");
  renderBookshelf();
  renderCurrentReading();
}

function closeReadTogether() {
  document.getElementById("readTogetherPage").classList.remove("active");
}

// 渲染书架
function renderBookshelf() {
  const grid = document.getElementById("bookshelfGrid");
  let html = "";

  window.bookshelfData.forEach((book, index) => {
    const progress =
      Math.round(((book.currentIndex + 1) / book.chunks.length) * 100) || 0;
    const isReading = isCurrentlyReading(book.id);
    html += `
      <div class="book-card ${
        isReading ? "reading" : ""
      }" onclick="selectBook('${book.id}')">
        <div class="book-card-icon">≡</div>
        <div class="book-card-name">${escapeHtml(book.bookName)}</div>
        <div class="book-card-info">${
          book.chunks.length
        } 页 · ${progress}%</div>
        <div class="book-card-progress">
          <div class="book-card-progress-fill" style="width:${progress}%"></div>
        </div>
        <div class="book-card-actions" onclick="event.stopPropagation()">
          <button class="book-card-btn read" onclick="startReading('${
            book.id
          }')">${isReading ? "继续读" : "开始读"}</button>
          <button class="book-card-btn delete" onclick="deleteBook('${
            book.id
          }')">删除</button>
        </div>
      </div>
    `;
  });

  // 添加新书按钮
  html += `
    <div class="book-card add-book-card" onclick="document.getElementById('bookFileInput').click()">
      <div style="font-size:32px;margin-bottom:8px;">+</div>
      <div>导入新书</div>
    </div>
  `;

  grid.innerHTML = html;
}

// 检查某本书是否正在被当前角色阅读
function isCurrentlyReading(bookId) {
  const charId = currentChatCharId;
  const data = window.readTogetherData[charId];
  return data && data.bookId === bookId && data.active;
}

// 渲染当前阅读区域
function renderCurrentReading() {
  const charId = currentChatCharId;
  const data = window.readTogetherData[charId];
  const section = document.getElementById("currentReadingSection");

  if (!data || !data.active) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";

  const book = window.bookshelfData.find((b) => b.id === data.bookId);
  if (!book) {
    section.style.display = "none";
    return;
  }

  document.getElementById("readBookName").textContent = book.bookName;

  const current = book.currentIndex + 1;
  const total = book.chunks.length;
  const percent = Math.round((current / total) * 100);

  document.getElementById(
    "readBookProgress"
  ).textContent = `进度：第 ${current} 页 / 共 ${total} 页 (${percent}%)`;
  document.getElementById("readProgressFill").style.width = percent + "%";
  document.getElementById("readJumpTo").max = total;
  document.getElementById("readJumpTo").value = current;

  const currentText = book.chunks[book.currentIndex] || "（已读完）";
  document.getElementById("readSectionText").textContent = currentText;

  // 更新状态徽章
  const badge = document.getElementById("readStatusBadge");
  badge.innerHTML = "<span>✓</span> 阅读中";
  badge.classList.remove("inactive");
}

// 导入书籍到书架
function handleBookImport(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const content = e.target.result;
    // 使用用户设置的每页字数
    const chunkSizeInput = document.getElementById("readChunkSize");
    const chunkSize = parseInt(chunkSizeInput?.value) || 500;
    const chunks = splitTextIntoChunks(content, chunkSize);

    const bookId = "book_" + Date.now();
    const newBook = {
      id: bookId,
      bookName: file.name.replace(".txt", ""),
      chunks: chunks,
      currentIndex: 0,
      chunkSize: chunkSize,
      importTime: Date.now(),
    };

    window.bookshelfData.push(newBook);
    localforage
      .setItem("bookshelfData", window.bookshelfData)
      .then(() => {
        renderBookshelf();
        alert("导入成功！");
      })
      .catch((err) => alert("保存失败: " + err));
    showToast(
      "≡ 《" + newBook.bookName + "》已加入书架！共 " + chunks.length + " 页"
    );
  };
  reader.readAsText(file);
  input.value = "";
}

function splitTextIntoChunks(text, chunkSize) {
  const chunks = [];
  const paragraphs = text.split(/\n\s*\n|\r\n\s*\r\n/);
  let currentChunk = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (
      currentChunk.length + trimmed.length > chunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmed;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmed;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  if (chunks.length === 0 && text.trim()) {
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize).trim());
    }
  }

  return chunks;
}

// 选择书籍（点击书籍卡片）
function selectBook(bookId) {
  startReading(bookId);
}

// 开始/继续阅读某本书
function startReading(bookId) {
  const charId = currentChatCharId;
  const book = window.bookshelfData.find((b) => b.id === bookId);
  if (!book) return;

  window.readTogetherData[charId] = {
    bookId: bookId,
    active: true,
    mode: window.readTogetherData[charId]?.mode || "auto",
  };

  localforage.setItem("readTogetherData", window.readTogetherData);
  renderBookshelf();
  renderCurrentReading();
  showToast("≡ 开始阅读《" + book.bookName + "》");
}

// 暂停阅读（回到书架）
function stopCurrentReading() {
  const charId = currentChatCharId;
  if (window.readTogetherData[charId]) {
    window.readTogetherData[charId].active = false;
    localforage.setItem("readTogetherData", window.readTogetherData);
  }
  renderBookshelf();
  renderCurrentReading();
  hideFloatingBtn();
  showToast("⏸️ 已暂停阅读");
}

// 删除书籍
function deleteBook(bookId) {
  if (!confirm("确定要从书架删除这本书吗？")) return;

  window.bookshelfData = window.bookshelfData.filter((b) => b.id !== bookId);
  localforage.setItem("bookshelfData", window.bookshelfData);

  // 如果正在阅读这本书，停止阅读
  const charId = currentChatCharId;
  if (window.readTogetherData[charId]?.bookId === bookId) {
    delete window.readTogetherData[charId];
    localforage.setItem("readTogetherData", window.readTogetherData);
  }

  renderBookshelf();
  renderCurrentReading();
  hideFloatingBtn();
  showToast("✕ 书籍已删除");
}

// 翻页功能
function readPrevSection() {
  const charId = currentChatCharId;
  const data = window.readTogetherData[charId];
  if (!data || !data.active) return;

  const book = window.bookshelfData.find((b) => b.id === data.bookId);
  if (!book || book.currentIndex <= 0) return;

  book.currentIndex--;
  localforage.setItem("bookshelfData", window.bookshelfData);
  renderCurrentReading();
  updateFloatingPanel();
}

function readNextSection() {
  const charId = currentChatCharId;
  const data = window.readTogetherData[charId];
  if (!data || !data.active) return;

  const book = window.bookshelfData.find((b) => b.id === data.bookId);
  if (!book || book.currentIndex >= book.chunks.length - 1) return;

  book.currentIndex++;
  localforage.setItem("bookshelfData", window.bookshelfData);
  renderCurrentReading();
  updateFloatingPanel();
}

function jumpToSection() {
  const charId = currentChatCharId;
  const data = window.readTogetherData[charId];
  if (!data || !data.active) return;

  const book = window.bookshelfData.find((b) => b.id === data.bookId);
  if (!book) return;

  const target = parseInt(document.getElementById("readJumpTo").value) - 1;
  if (target >= 0 && target < book.chunks.length) {
    book.currentIndex = target;
    localforage.setItem("bookshelfData", window.bookshelfData);
    renderCurrentReading();
    updateFloatingPanel();
    showToast("已跳转到第 " + (target + 1) + " 页");
  }
}

// ==================== 悬浮窗功能 ====================
function startFloatingMode() {
  const charId = currentChatCharId; // 保存当前角色ID
  closeReadTogether();

  // 如果当前角色有读书状态，立即显示悬浮球
  if (charId && window.readTogetherData[charId]?.active) {
    showFloatingBtn();
    showToast("悬浮阅读已开启，点击≡按钮可查看当前内容");
  } else {
    showToast("悬浮阅读已开启，进入该角色聊天时会显示悬浮按钮");
  }
}

function showFloatingBtn() {
  document.getElementById("readFloatingBtn").classList.add("active");
}

function hideFloatingBtn() {
  document.getElementById("readFloatingBtn").classList.remove("active");
  document.getElementById("readFloatingPanel").classList.remove("active");
}

function toggleFloatingPanel() {
  const panel = document.getElementById("readFloatingPanel");
  if (panel.classList.contains("active")) {
    panel.classList.remove("active");
  } else {
    updateFloatingPanel();
    panel.classList.add("active");
  }
}

function hideFloatingPanel() {
  document.getElementById("readFloatingPanel").classList.remove("active");
}

function updateFloatingPanel() {
  const charId = currentChatCharId;
  const data = window.readTogetherData[charId];
  if (!data || !data.active) return;

  const book = window.bookshelfData.find((b) => b.id === data.bookId);
  if (!book) return;

  document.getElementById("floatBookTitle").textContent = book.bookName;
  document.getElementById("floatProgress").textContent = `第${
    book.currentIndex + 1
  }页 / 共${book.chunks.length}页`;
  document.getElementById("floatContent").textContent =
    book.chunks[book.currentIndex] || "（已读完）";
}

// 悬浮窗拖动功能
(function initFloatingPanelDrag() {
  document.addEventListener("DOMContentLoaded", function () {
    const panel = document.getElementById("readFloatingPanel");
    const header = document.getElementById("floatPanelHeader");
    if (!panel || !header) return;

    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener("mousedown", startDrag);
    header.addEventListener("touchstart", startDrag, { passive: false });

    function startDrag(e) {
      if (e.target.classList.contains("read-float-close")) return;
      isDragging = true;

      const rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      if (e.type === "touchstart") {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      } else {
        startX = e.clientX;
        startY = e.clientY;
      }

      // 移除bottom/right定位，改用left/top
      panel.style.left = startLeft + "px";
      panel.style.top = startTop + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";

      document.addEventListener("mousemove", onDrag);
      document.addEventListener("mouseup", stopDrag);
      document.addEventListener("touchmove", onDrag, { passive: false });
      document.addEventListener("touchend", stopDrag);

      e.preventDefault();
    }

    function onDrag(e) {
      if (!isDragging) return;

      let currentX, currentY;
      if (e.type === "touchmove") {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
      } else {
        currentX = e.clientX;
        currentY = e.clientY;
      }

      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;

      // 边界限制
      const maxLeft = window.innerWidth - panel.offsetWidth;
      const maxTop = window.innerHeight - panel.offsetHeight;
      newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      newTop = Math.max(0, Math.min(newTop, maxTop));

      panel.style.left = newLeft + "px";
      panel.style.top = newTop + "px";

      e.preventDefault();
    }

    function stopDrag() {
      isDragging = false;
      document.removeEventListener("mousemove", onDrag);
      document.removeEventListener("mouseup", stopDrag);
      document.removeEventListener("touchmove", onDrag);
      document.removeEventListener("touchend", stopDrag);
    }
  });
})();

// 悬浮窗缩放功能（支持触摸）
(function initFloatingPanelResize() {
  document.addEventListener("DOMContentLoaded", function () {
    const panel = document.getElementById("readFloatingPanel");
    const handle = document.getElementById("floatResizeHandle");
    if (!panel || !handle) return;

    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    handle.addEventListener("mousedown", startResize);
    handle.addEventListener("touchstart", startResize, {
      passive: false,
    });

    function startResize(e) {
      isResizing = true;

      startWidth = panel.offsetWidth;
      startHeight = panel.offsetHeight;

      if (e.type === "touchstart") {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      } else {
        startX = e.clientX;
        startY = e.clientY;
      }

      document.addEventListener("mousemove", onResize);
      document.addEventListener("mouseup", stopResize);
      document.addEventListener("touchmove", onResize, {
        passive: false,
      });
      document.addEventListener("touchend", stopResize);

      e.preventDefault();
      e.stopPropagation();
    }

    function onResize(e) {
      if (!isResizing) return;

      let currentX, currentY;
      if (e.type === "touchmove") {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
      } else {
        currentX = e.clientX;
        currentY = e.clientY;
      }

      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      let newWidth = startWidth + deltaX;
      let newHeight = startHeight + deltaY;

      // 限制最小/最大尺寸
      newWidth = Math.max(200, Math.min(newWidth, window.innerWidth * 0.9));
      newHeight = Math.max(150, Math.min(newHeight, window.innerHeight * 0.7));

      panel.style.width = newWidth + "px";
      panel.style.height = newHeight + "px";

      e.preventDefault();
    }

    function stopResize() {
      isResizing = false;
      document.removeEventListener("mousemove", onResize);
      document.removeEventListener("mouseup", stopResize);
      document.removeEventListener("touchmove", onResize);
      document.removeEventListener("touchend", stopResize);
    }
  });
})();

// 悬浮球拖动功能
(function initFloatingBtnDrag() {
  document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("readFloatingBtn");
    if (!btn) return;

    let isDragging = false;
    let hasMoved = false;
    let startX, startY, startLeft, startTop;
    let longPressTimer = null;
    const LONG_PRESS_DURATION = 300;

    btn.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    btn.addEventListener("mousedown", handleMouseDown);

    function handleTouchStart(e) {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      hasMoved = false;

      const rect = btn.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      longPressTimer = setTimeout(() => {
        isDragging = true;
        btn.style.animation = "none";
        btn.style.transform = "scale(1.1)";
      }, LONG_PRESS_DURATION);

      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);
    }

    function handleMouseDown(e) {
      startX = e.clientX;
      startY = e.clientY;
      hasMoved = false;

      const rect = btn.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      longPressTimer = setTimeout(() => {
        isDragging = true;
        btn.style.animation = "none";
        btn.style.transform = "scale(1.1)";
      }, LONG_PRESS_DURATION);

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    function handleTouchMove(e) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        if (!isDragging) {
          isDragging = true;
          btn.style.animation = "none";
          btn.style.transform = "scale(1.1)";
        }
        hasMoved = true;
      }

      if (isDragging) {
        e.preventDefault();
        moveBtn(deltaX, deltaY);
      }
    }

    function handleMouseMove(e) {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        if (!isDragging) {
          isDragging = true;
          btn.style.animation = "none";
          btn.style.transform = "scale(1.1)";
        }
        hasMoved = true;
      }

      if (isDragging) {
        moveBtn(deltaX, deltaY);
      }
    }

    function moveBtn(deltaX, deltaY) {
      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;

      const maxLeft = window.innerWidth - btn.offsetWidth;
      const maxTop = window.innerHeight - btn.offsetHeight;
      newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      newTop = Math.max(0, Math.min(newTop, maxTop));

      btn.style.left = newLeft + "px";
      btn.style.top = newTop + "px";
      btn.style.right = "auto";
      btn.style.bottom = "auto";
    }

    function handleTouchEnd(e) {
      cleanup();
      if (hasMoved) {
        e.preventDefault();
      }
    }

    function handleMouseUp(e) {
      cleanup();
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    function cleanup() {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      isDragging = false;
      btn.style.transform = "";
      btn.style.animation = "floatBounce 2s ease-in-out infinite";
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }
  });
})();

// 打开对话时检查是否需要显示悬浮按钮
function checkFloatingBtn() {
  const charId = currentChatCharId;
  const data = window.readTogetherData[charId];
  if (data && data.active) {
    // 不自动显示悬浮按钮，让用户主动开启
  }
}

// 获取当前阅读内容（供AI使用）
function getCurrentReadingContent() {
  const charId = currentChatCharId;
  const data = window.readTogetherData[charId];
  if (!data || !data.active) return null;

  const book = window.bookshelfData.find((b) => b.id === data.bookId);
  if (!book) return null;

  return {
    bookName: book.bookName,
    currentSection: book.chunks[book.currentIndex],
    sectionIndex: book.currentIndex + 1,
    totalSections: book.chunks.length,
  };
}

// 保留这个函数但不再自动调用
function advanceReadingProgress() {
  // 已禁用自动翻页功能，用户手动翻页
}

// ==================== 待办事项功能（支持重复任务） ====================
window.todoList = [];
window.todoAiBindings = {};
window.currentTodoFilter = "all";
window.lastTodoResetDate = null;

// 默认分类（无emoji）
window.todoCategories = [
  { id: "self", name: "自我" },
  { id: "health", name: "健康" },
  { id: "study", name: "学习" },
  { id: "work", name: "工作" },
  { id: "life", name: "生活" },
];

// 自定义设置
window.todoSettings = {
  greeting: { main: "今天也要加油", sub: "新的一天，新的开始" },
};

// 重复类型
const REPEAT_TYPES = {
  none: "不重复",
  daily: "每天",
  weekday: "工作日",
  weekly: "每周",
};

async function initTodoSystem() {
  try {
    const savedTodos = await safeLocalforageGet("todoList");
    window.todoList = savedTodos || [];

    const savedBindings = await safeLocalforageGet("todoAiBindings");
    window.todoAiBindings = savedBindings || {};

    const savedCategories = await safeLocalforageGet("todoCategories");
    if (savedCategories && savedCategories.length > 0) {
      window.todoCategories = savedCategories;
    }

    const savedSettings = await safeLocalforageGet("todoSettings");
    if (savedSettings) {
      window.todoSettings = { ...window.todoSettings, ...savedSettings };
    }

    const savedResetDate = await safeLocalforageGet("lastTodoResetDate");
    window.lastTodoResetDate = savedResetDate;

    // 检查并重置重复任务
    await checkAndResetRepeatingTodos();

    renderTodoFilterBar();
    renderTodoList();
    renderTodoAiCharList();
    updateTodoDate();
    updateTodoStats();
  } catch (e) {
    console.error("待办初始化失败", e);
  }
}

// 检查并重置重复任务
async function checkAndResetRepeatingTodos() {
  const today = new Date().toDateString();

  if (window.lastTodoResetDate === today) return;

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=周日, 1-5=工作日, 6=周六
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  let hasChanges = false;

  window.todoList.forEach((todo) => {
    if (!todo.repeat || todo.repeat === "none") return;

    let shouldReset = false;

    switch (todo.repeat) {
      case "daily":
        shouldReset = true;
        break;
      case "weekday":
        shouldReset = isWeekday;
        break;
      case "weekly":
        // 每周一重置
        shouldReset = dayOfWeek === 1;
        break;
    }

    if (shouldReset && todo.done) {
      todo.done = false;
      todo.doneAt = null;
      todo.lastResetDate = today;
      hasChanges = true;
    }
  });

  if (hasChanges) {
    await localforage.setItem("todoList", window.todoList);
  }

  window.lastTodoResetDate = today;
  await localforage.setItem("lastTodoResetDate", today);
}

function updateTodoDate() {
  const now = new Date();
  const dayEl = document.getElementById("todoDateDay");
  const infoEl = document.getElementById("todoDateInfo");
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  if (dayEl) dayEl.textContent = now.getDate();
  if (infoEl)
    infoEl.textContent = now.getMonth() + 1 + "月 " + weekdays[now.getDay()];

  const greeting = window.todoSettings.greeting || {
    main: "今天也要加油",
    sub: "",
  };
  const greetingEl = document.getElementById("todoGreeting");
  const subEl = document.getElementById("todoGreetingSub");
  if (greetingEl) greetingEl.textContent = greeting.main;
  if (subEl) subEl.textContent = greeting.sub;
}

function updateTodoStats() {
  const total = window.todoList.length;
  const done = window.todoList.filter((t) => t.done).length;
  const totalEl = document.getElementById("todoStatTotal");
  const doneEl = document.getElementById("todoStatDone");
  const pendingEl = document.getElementById("todoStatPending");
  if (totalEl) totalEl.textContent = total;
  if (doneEl) doneEl.textContent = done;
  if (pendingEl) pendingEl.textContent = total - done;
}

function renderTodoFilterBar() {
  const bar = document.getElementById("todoFilterBar");
  if (!bar) return;

  let html = `<button class="todo-filter-btn ${
    window.currentTodoFilter === "all" ? "active" : ""
  }" onclick="filterTodos('all')">全部</button>`;
  window.todoCategories.forEach((cat) => {
    html += `<button class="todo-filter-btn ${
      window.currentTodoFilter === cat.id ? "active" : ""
    }" onclick="filterTodos('${cat.id}')">${cat.name}</button>`;
  });
  bar.innerHTML = html;
}

function filterTodos(filter) {
  window.currentTodoFilter = filter;
  renderTodoFilterBar();
  renderTodoList();
}

function renderTodoList() {
  const container = document.getElementById("todoListContainer");
  if (!container) return;

  let todos = window.todoList;
  if (window.currentTodoFilter !== "all") {
    todos = todos.filter((t) => t.tag === window.currentTodoFilter);
  }

  if (todos.length === 0) {
    container.innerHTML = `
      <div class="todo-empty">
        <div class="todo-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        </div>
        <div class="todo-empty-text">还没有待办事项</div>
        <div class="todo-empty-hint">点击下方按钮添加</div>
      </div>`;
    return;
  }

  // 排序：未完成在前，然后按创建时间
  todos = [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.createdAt - a.createdAt;
  });

  let html = "";
  todos.forEach((todo) => {
    const cat = window.todoCategories.find((c) => c.id === todo.tag) || {
      name: "其他",
    };
    const repeatLabel =
      todo.repeat && todo.repeat !== "none" ? REPEAT_TYPES[todo.repeat] : "";

    html += `
      <div class="todo-item ${todo.done ? "done" : ""}" data-id="${todo.id}">
        <div class="todo-checkbox" onclick="toggleTodoDone('${todo.id}')">${
      todo.done ? "✓" : ""
    }</div>
        <div class="todo-content" onclick="toggleTodoDone('${todo.id}')">
          <div class="todo-text">${escapeHtml(todo.text)}</div>
          <div class="todo-meta">
            <span class="todo-time">${formatTodoTime(todo.createdAt)}</span>
            ${
              repeatLabel
                ? `<span class="todo-repeat-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>${repeatLabel}</span>`
                : ""
            }
          </div>
        </div>
        <div class="todo-tag">${cat.name}</div>
        <div class="todo-actions">
          <button class="todo-action-btn delete" onclick="deleteTodoItem('${
            todo.id
          }')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>`;
  });
  container.innerHTML = html;
}

function formatTodoTime(ts) {
  const d = new Date(ts),
    now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return (
      "今天 " +
      d.getHours().toString().padStart(2, "0") +
      ":" +
      d.getMinutes().toString().padStart(2, "0")
    );
  }
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "昨天";
  return d.getMonth() + 1 + "/" + d.getDate();
}

function escapeHtml(t) {
  const d = document.createElement("div");
  d.textContent = t;
  return d.innerHTML;
}

function openTodoModal() {
  const modal = document.getElementById("todoModalOverlay");
  if (modal) {
    modal.classList.add("active");
    document.getElementById("todoInputText").value = "";
    renderTodoTagSelect();
    // 重置重复选择
    document
      .querySelectorAll(".todo-repeat-item")
      .forEach((el) => el.classList.remove("selected"));
    document
      .querySelector('.todo-repeat-item[data-repeat="none"]')
      ?.classList.add("selected");
    document.getElementById("todoInputText").focus();
  }
}

function renderTodoTagSelect() {
  const container = document.getElementById("todoTagSelect");
  if (!container) return;
  let html = "";
  window.todoCategories.forEach((cat, i) => {
    html += `<div class="todo-category-item ${
      i === 0 ? "selected" : ""
    }" data-tag="${
      cat.id
    }" onclick="selectTodoTag(this)"><div class="todo-category-name">${
      cat.name
    }</div></div>`;
  });
  container.innerHTML = html;
}

function closeTodoModal() {
  document.getElementById("todoModalOverlay")?.classList.remove("active");
}

function selectTodoTag(el) {
  document
    .querySelectorAll(".todo-category-item")
    .forEach((o) => o.classList.remove("selected"));
  el.classList.add("selected");
}

function selectTodoRepeat(el) {
  document
    .querySelectorAll(".todo-repeat-item")
    .forEach((o) => o.classList.remove("selected"));
  el.classList.add("selected");
}

async function saveTodoItem() {
  const text = document.getElementById("todoInputText").value.trim();
  if (!text) {
    showToast("请输入待办内容");
    return;
  }

  const tagEl = document.querySelector(".todo-category-item.selected");
  const tag = tagEl
    ? tagEl.dataset.tag
    : window.todoCategories[0]?.id || "self";

  const repeatEl = document.querySelector(".todo-repeat-item.selected");
  const repeat = repeatEl ? repeatEl.dataset.repeat : "none";

  window.todoList.push({
    id: "todo_" + Date.now(),
    text,
    tag,
    repeat,
    done: false,
    createdAt: Date.now(),
  });

  await localforage.setItem("todoList", window.todoList);
  closeTodoModal();
  renderTodoList();
  updateTodoStats();
  showToast("添加成功");
}

async function toggleTodoDone(id) {
  const todo = window.todoList.find((t) => t.id === id);
  if (todo) {
    const wasDone = todo.done;
    todo.done = !todo.done;
    todo.doneAt = todo.done ? Date.now() : null;
    await localforage.setItem("todoList", window.todoList);
    renderTodoList();
    updateTodoStats();

    if (todo.done && !wasDone) {
      showToast("完成一项");
      notifyAiTodoCompleted(todo);
    }
  }
}

async function notifyAiTodoCompleted(todo) {
  const bindingIds = Object.keys(window.todoAiBindings).filter(
    (id) => window.todoAiBindings[id]
  );
  if (bindingIds.length === 0) return;

  const category = window.todoCategories.find((c) => c.id === todo.tag);
  const categoryName = category ? category.name : "其他";

  for (const charId of bindingIds) {
    const char = characters.find((c) => String(c.id) === charId);
    if (!char) continue;

    const settings = chatSettings[charId] || {};
    const apiPreset =
      apiPresets.find((p) => p.id === settings.apiPreset) || apiPresets[0];

    if (!apiPreset || !apiPreset.key) {
      console.log("未配置API，跳过待办完成通知");
      continue;
    }

    let apiUrl = apiPreset.url.replace(/\/$/, "");
    if (!apiUrl.endsWith("/chat/completions")) {
      if (apiUrl.endsWith("/v1")) {
        apiUrl += "/chat/completions";
      } else if (!apiUrl.includes("/chat/completions")) {
        apiUrl += "/v1/chat/completions";
      }
    }

    const persona = settings.persona || `你是${char.name}，一个友善的AI助手。`;
    const systemPrompt = `${persona}\n\n【重要】用1句话简短地夸奖或鼓励用户完成了待办事项，语气要符合你的人设，不要太长。`;
    const userMessage = `用户刚刚完成了待办事项「${todo.text}」(分类:${categoryName})，请夸奖鼓励:`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiPreset.key}`,
        },
        body: JSON.stringify({
          model: apiPreset.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.8,
          stream: false,
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      let aiReply = data.choices?.[0]?.message?.content;

      if (aiReply) {
        const numCharId = parseInt(charId) || charId;
        let history = chatHistories[numCharId] || [];
        history.push({
          role: "assistant",
          content: aiReply,
          timestamp: Date.now(),
        });
        chatHistories[numCharId] = history;
        await localforage.setItem("chatHistories", chatHistories);
      }
    } catch (e) {
      console.error("待办完成通知失败:", e);
    }
  }
}

async function deleteTodoItem(id) {
  if (!confirm("确定删除这条待办？")) return;
  window.todoList = window.todoList.filter((t) => t.id !== id);
  await localforage.setItem("todoList", window.todoList);
  renderTodoList();
  updateTodoStats();
  showToast("已删除");
}

function renderTodoAiCharList() {
  const container = document.getElementById("todoAiCharList");
  if (!container) return;
  if (!characters || characters.length === 0) {
    container.innerHTML = `<div class="todo-ai-empty">还没有创建角色</div>`;
    return;
  }
  let html = "";
  characters.forEach((char) => {
    const charId = String(char.id);
    const isActive = window.todoAiBindings[charId];
    const avatar = char.avatar
      ? `<img src="${char.avatar}" alt="">`
      : char.name
      ? char.name.charAt(0)
      : "?";
    html += `<div class="todo-ai-item ${
      isActive ? "active" : ""
    }" onclick="toggleTodoAiBinding('${charId}')"><div class="todo-ai-avatar">${avatar}</div><span class="todo-ai-name">${
      char.name || "未命名"
    }</span></div>`;
  });
  container.innerHTML = html;
}

async function toggleTodoAiBinding(charId) {
  if (window.todoAiBindings[charId]) {
    delete window.todoAiBindings[charId];
    showToast("已取消督促");
  } else {
    window.todoAiBindings[charId] = true;
    const char = characters.find((c) => String(c.id) === charId);
    showToast(`${char?.name || "TA"}会督促你完成待办`);
    aiGreetForTodoBinding(charId);
  }
  await localforage.setItem("todoAiBindings", window.todoAiBindings);
  renderTodoAiCharList();
}

async function aiGreetForTodoBinding(charId) {
  const char = characters.find((c) => String(c.id) === charId);
  if (!char) return;

  const pending = window.todoList.filter((t) => !t.done);
  const todoSummary =
    pending.length > 0
      ? pending
          .slice(0, 5)
          .map((t) => `「${t.text}」`)
          .join("、") + (pending.length > 5 ? "等" : "")
      : "暂无待办事项";

  const settings = chatSettings[charId] || {};
  const apiPreset =
    apiPresets.find((p) => p.id === settings.apiPreset) || apiPresets[0];

  if (!apiPreset || !apiPreset.key) {
    console.log("未配置API，跳过AI问候");
    return;
  }

  let apiUrl = apiPreset.url.replace(/\/$/, "");
  if (!apiUrl.endsWith("/chat/completions")) {
    if (apiUrl.endsWith("/v1")) {
      apiUrl += "/chat/completions";
    } else if (!apiUrl.includes("/chat/completions")) {
      apiUrl += "/v1/chat/completions";
    }
  }

  const persona = settings.persona || `你是${char.name}，一个友善的AI助手。`;
  const systemPrompt = `${persona}\n\n【重要】直接用1-2句话回应，不要列举选项，不要编号。`;
  const userMessage = `用户选你当待办督促助手。待办: ${todoSummary}。请直接回应:`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiPreset.key}`,
      },
      body: JSON.stringify({
        model: apiPreset.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.8,
        stream: false,
      }),
    });

    if (!response.ok) return;

    const data = await response.json();
    let aiReply = data.choices?.[0]?.message?.content;

    if (!aiReply) {
      aiReply = "我会帮你督促完成待办的~";
    }

    const numCharId = parseInt(charId) || charId;
    let history = chatHistories[numCharId] || [];
    history.push({
      role: "assistant",
      content: aiReply,
      timestamp: Date.now(),
    });
    chatHistories[numCharId] = history;
    await localforage.setItem("chatHistories", chatHistories);
  } catch (e) {
    console.error("AI问候失败:", e);
  }
}

function openTodoSettingsModal() {
  const modal = document.getElementById("todoSettingsOverlay");
  if (modal) {
    modal.classList.add("active");
    loadGreetingForEdit();
    renderCategoryList();
  }
}

function closeTodoSettingsModal() {
  document.getElementById("todoSettingsOverlay")?.classList.remove("active");
}

function loadGreetingForEdit() {
  const g = window.todoSettings.greeting || { main: "", sub: "" };
  const mainInput = document.getElementById("greetingMainInput");
  const subInput = document.getElementById("greetingSubInput");
  const previewMain = document.getElementById("greetingPreviewMain");
  const previewSub = document.getElementById("greetingPreviewSub");

  if (mainInput) mainInput.value = g.main;
  if (subInput) subInput.value = g.sub;
  if (previewMain) previewMain.textContent = g.main || "(未设置)";
  if (previewSub) previewSub.textContent = g.sub || "";
}

async function saveGreeting() {
  const main = document.getElementById("greetingMainInput").value.trim();
  const sub = document.getElementById("greetingSubInput").value.trim();

  if (!main) {
    showToast("请输入问候语");
    return;
  }

  window.todoSettings.greeting = { main, sub };
  await localforage.setItem("todoSettings", window.todoSettings);

  document.getElementById("greetingPreviewMain").textContent = main;
  document.getElementById("greetingPreviewSub").textContent = sub;
  updateTodoDate();
  showToast("已保存");
}

function renderCategoryList() {
  const container = document.getElementById("todoCategoryList");
  if (!container) return;

  let html = "";
  window.todoCategories.forEach((cat) => {
    html += `<div class="todo-category-item" onclick="deleteCategory('${cat.id}')"><div class="todo-category-name">${cat.name}</div></div>`;
  });
  container.innerHTML = html;
}

async function addTodoCategory() {
  const nameInput = document.getElementById("newCategoryName");
  const name = nameInput.value.trim();

  if (!name) {
    showToast("请输入分类名称");
    return;
  }

  if (name.length > 10) {
    showToast("分类名称不能超过10个字");
    return;
  }

  const id = "cat_" + Date.now();
  window.todoCategories.push({ id, name });
  await localforage.setItem("todoCategories", window.todoCategories);

  nameInput.value = "";
  renderCategoryList();
  renderTodoFilterBar();
  showToast("分类已添加");
}

async function deleteCategory(id) {
  const defaultIds = ["self", "health", "study", "work", "life"];
  if (defaultIds.includes(id)) {
    showToast("默认分类不能删除");
    return;
  }

  if (!confirm("确定删除这个分类？")) return;

  window.todoCategories = window.todoCategories.filter((c) => c.id !== id);
  await localforage.setItem("todoCategories", window.todoCategories);

  renderCategoryList();
  renderTodoFilterBar();
  showToast("已删除");
}

// 生成待办提示词（给AI用）
function generateTodoPromptForAi(charId) {
  const id = String(charId);
  if (!window.todoAiBindings[id]) return "";

  const pending = window.todoList.filter((t) => !t.done);
  const repeating = pending.filter((t) => t.repeat && t.repeat !== "none");
  const doneToday = window.todoList.filter(
    (t) =>
      t.done &&
      t.doneAt &&
      new Date(t.doneAt).toDateString() === new Date().toDateString()
  );

  if (pending.length === 0 && doneToday.length === 0) return "";

  let prompt =
    "\n\n【待办督促】用户让你帮忙督促完成待办，在对话中自然地关心和提醒，但不要每条都提，大约每3-5条消息自然地提一次。\n";

  if (pending.length > 0) {
    const texts = pending
      .slice(0, 5)
      .map((t) => t.text)
      .join("、");
    prompt += `未完成: ${pending.length}项 - ${texts}${
      pending.length > 5 ? "等" : ""
    }。\n`;
  }

  if (repeating.length > 0) {
    prompt += `其中有${repeating.length}项是每日/定期任务，要特别关注。\n`;
  }

  if (doneToday.length > 0) {
    prompt += `今天已完成${doneToday.length}项，可以适时鼓励。\n`;
  }

  prompt += "语气温柔自然，融入对话，不要生硬。";
  return prompt;
}

// 生成经期提示词（预留接口）
function generatePeriodPromptForAi() {
  return "";
}

// ==================== QQ空间风格动态系统 ====================
window.momentsData = {
  posts: [], // 所有动态
  userProfile: {
    avatar: "😊",
    avatarImg: null,
    coverImg: null,
    name: "用户",
    handle: "username",
    signature: "",
  },
};

// 初始化动态系统
async function initMomentsSystem() {
  const saved = await safeLocalforageGet("momentsData");
  if (saved) {
    window.momentsData = saved;
    // 确保有新字段
    if (!saved.userProfile.handle) {
      window.momentsData.userProfile.handle = "username";
    }
  }
  renderMomentsUI();
}

// 渲染动态页面UI
function renderMomentsUI() {
  const data = window.momentsData;
  const profile = data.userProfile;

  // 更新个人名片
  const coverImg = document.getElementById("momentCoverImg");
  if (coverImg) {
    if (profile.coverImg) {
      coverImg.src = profile.coverImg;
      coverImg.style.display = "block";
    } else {
      coverImg.style.display = "none";
    }
  }

  const avatarImg = document.getElementById("momentAvatarImg");
  const avatarEmoji = document.getElementById("momentAvatarEmoji");
  if (avatarImg && avatarEmoji) {
    if (profile.avatarImg) {
      avatarImg.src = profile.avatarImg;
      avatarImg.style.display = "block";
      avatarEmoji.style.display = "none";
    } else {
      avatarImg.style.display = "none";
      avatarEmoji.style.display = "block";
      avatarEmoji.textContent = profile.avatar || "😊";
    }
  }

  const nickname = document.getElementById("momentNickname");
  if (nickname) nickname.textContent = profile.name || "用户";

  const handle = document.getElementById("momentHandle");
  if (handle) handle.textContent = `@${profile.handle || "username"}`;

  const signature = document.getElementById("momentSignature");
  if (signature) signature.textContent = profile.signature || "";

  // 同步更新Me页面的个人资料
  updateMeProfileUI();

  // 渲染动态列表
  renderFeed();
}

// 更新Me页面的个人资料UI
function updateMeProfileUI() {
  const profile = window.momentsData?.userProfile;
  if (!profile) return;

  const avatarEl = document.getElementById("meProfileAvatar");
  if (avatarEl) {
    if (profile.avatarImg) {
      avatarEl.innerHTML = `<img src="${profile.avatarImg}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
    } else {
      avatarEl.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f48fb1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    }
  }

  const nameEl = document.getElementById("meProfileName");
  if (nameEl) nameEl.textContent = profile.name || "我的昵称";

  const handleEl = document.getElementById("meProfileHandle");
  if (handleEl) handleEl.textContent = `@${profile.handle || "username"}`;
}

// 更换背景图
function changeMomentCover() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        window.momentsData.userProfile.coverImg = evt.target.result;
        localforage.setItem("momentsData", window.momentsData);
        renderMomentsUI();
        showToast("背景图已更新");
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

// 更换头像
function changeMomentAvatar() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        window.momentsData.userProfile.avatarImg = evt.target.result;
        localforage.setItem("momentsData", window.momentsData);
        renderMomentsUI();
        showToast("头像已更新");
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

// 编辑昵称
function editMomentNickname() {
  const current = window.momentsData.userProfile.name || "";
  const newName = prompt("请输入昵称:", current);
  if (newName !== null && newName.trim()) {
    window.momentsData.userProfile.name = newName.trim();
    localforage.setItem("momentsData", window.momentsData);
    renderMomentsUI();
  }
}

// 编辑@用户名
function editMomentHandle() {
  const current = window.momentsData.userProfile.handle || "";
  const newHandle = prompt("请输入用户名（不含@）:", current);
  if (newHandle !== null && newHandle.trim()) {
    window.momentsData.userProfile.handle = newHandle.trim().replace(/^@/, "");
    localforage.setItem("momentsData", window.momentsData);
    renderMomentsUI();
  }
}

// 编辑签名
function editMomentSignature() {
  const current = window.momentsData.userProfile.signature || "";
  const newSig = prompt("请输入个性签名:", current);
  if (newSig !== null) {
    window.momentsData.userProfile.signature = newSig.trim();
    localforage.setItem("momentsData", window.momentsData);
    renderMomentsUI();
  }
}

// 渲染动态列表
function renderFeed() {
  const container = document.getElementById("igFeed");
  const posts = window.momentsData.posts.sort(
    (a, b) => b.timestamp - a.timestamp
  );
  const profile = window.momentsData.userProfile;

  // 检查谁发过动态
  const userHasPost = posts.some((p) => p.isUser);
  const charIdsWithPosts = new Set(
    posts.filter((p) => !p.isUser).map((p) => p.authorId)
  );

  // ins风格导航栏 - 只有加号按钮，无框
  const navbarHtml = `
    <div class="ig-navbar">
      <div class="ig-navbar-left">
        <button class="ig-navbar-btn" onclick="switchChatTab('messages')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>
      <div class="ig-navbar-logo">Instagram</div>
      <div class="ig-navbar-right">
        <button class="ig-navbar-btn" onclick="openPostModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  `;

  // 构建Stories - 用户自己 + 角色们，谁发了动态谁有圈
  const characters = window.characters || [];
  const storiesHtml = `
    <div class="ig-stories">
      <div class="ig-story-item" onclick="openPostModal()">
        <div class="ig-story-avatar ${userHasPost ? "has-story" : "no-story"}">
          ${
            profile.avatarImg
              ? `<img src="${profile.avatarImg}">`
              : "<img src=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ccc'%3E%3Ccircle cx='12' cy='8' r='4'/%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3C/svg%3E\">"
          }
          <div class="ig-story-add">+</div>
        </div>
        <div class="ig-story-name">你的动态</div>
      </div>
      ${characters
        .slice(0, 10)
        .map((char) => {
          const hasPost = charIdsWithPosts.has(String(char.id));
          return `
        <div class="ig-story-item">
          <div class="ig-story-avatar ${hasPost ? "has-story" : ""}">
            ${
              char.avatar
                ? `<img src="${char.avatar}">`
                : `<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'%3E%3Ccircle cx='12' cy='8' r='4'/%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3C/svg%3E">`
            }
          </div>
          <div class="ig-story-name">${char.note || char.name || "角色"}</div>
        </div>
      `;
        })
        .join("")}
    </div>
  `;

  if (posts.length === 0) {
    container.innerHTML = `
      ${navbarHtml}
      ${storiesHtml}
      <div class="ig-empty-state" id="igEmptyState">
        <div class="ig-empty-icon"><svg width="62" height="62" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>
        <div class="ig-empty-title">分享照片</div>
        <div class="ig-empty-text">当你分享照片时，它们会出现在你的主页上。</div>
      </div>
    `;
    return;
  }

  container.innerHTML =
    navbarHtml +
    storiesHtml +
    posts.map((post) => renderPostCard(post)).join("");
}

// 渲染单条动态卡片
function renderPostCard(post) {
  const profile = window.momentsData.userProfile;
  const isUser = post.isUser;

  // 获取作者信息
  let authorName, authorAvatar, authorAvatarImg;
  if (isUser) {
    authorName = profile.name;
    authorAvatar = profile.avatar;
    authorAvatarImg = profile.avatarImg;
  } else {
    const char = window.characters?.find((c) => String(c.id) === post.authorId);
    authorName = char ? char.note || char.name : "未知用户";
    authorAvatar = "🤖";
    authorAvatarImg = char?.avatar;
  }

  // 正文内容
  let contentHtml = "";
  if (post.content && post.content.trim()) {
    contentHtml = `<div class="ig-post-content">${post.content}</div>`;
  }

  // 图片区域
  let imageHtml = "";
  if (post.image) {
    imageHtml = `<div class="ig-post-images single-img"><img src="${post.image}" alt="" onclick="showFullImage('${post.image}')"></div>`;
  } else if (post.textImage) {
    // 精美渐变背景组合
    const bgStyles = [
      {
        bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        emoji: "★",
      },
      {
        bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        emoji: "○",
      },
      {
        bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
        emoji: "◇",
      },
      {
        bg: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
        emoji: "🌿",
      },
      {
        bg: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
        emoji: "🌅",
      },
      {
        bg: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
        emoji: "♡",
      },
      {
        bg: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
        emoji: "🌷",
      },
      {
        bg: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
        emoji: "○",
      },
    ];
    const style = bgStyles[Math.floor(post.id) % bgStyles.length];
    imageHtml = `
      <div class="ig-post-images">
        <div class="ig-post-text-img">
          <div class="moment-img-placeholder" onclick="viewMomentImageDesc('${escapeHtml(
            post.textImage
          ).replace(/'/g, "\\'")}')">
            <div class="placeholder-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>
            <div class="placeholder-text">点击查看图片</div>
            <div class="placeholder-desc">${
              post.textImage.length > 20
                ? post.textImage.substring(0, 20) + "..."
                : post.textImage
            }</div>
          </div>
        </div>
      </div>`;
  }

  // 点赞状态和头像列表
  const liked = (post.likes || []).includes("user");
  const likeData = (post.likes || [])
    .map((likeId) => {
      if (likeId === "user") {
        return {
          name: profile.name,
          avatar: profile.avatar,
          avatarImg: profile.avatarImg,
        };
      }
      const char = window.characters?.find((c) => String(c.id) === likeId);
      if (char) {
        return {
          name: char.note || char.name,
          avatar: "AI",
          avatarImg: char.avatar,
        };
      }
      return null;
    })
    .filter(Boolean);

  // 收藏状态
  const bookmarked = (post.bookmarks || []).includes("user");

  // 点赞显示 - 带头像
  let likesHtml = "";
  if (likeData.length > 0) {
    const avatarsHtml = likeData
      .slice(0, 5)
      .map(
        (l) =>
          `<div class="like-avatar">${
            l.avatarImg ? `<img src="${l.avatarImg}" alt="">` : l.avatar
          }</div>`
      )
      .join("");
    const namesText =
      likeData.length <= 2
        ? likeData.map((l) => l.name).join("、")
        : `${likeData[0].name} 等 ${likeData.length} 人`;
    likesHtml = `
      <div class="ig-post-likes">
        <div class="ig-post-likes-avatars">${avatarsHtml}</div>
        <span>${namesText} 觉得很赞</span>
      </div>
    `;
  }

  // 评论
  const comments = post.comments || [];
  const previewComments = comments.slice(0, 2);

  // 评论区HTML - 显示所有评论和内联回复框
  let commentsHtml = "";
  const allComments = comments || [];
  if (allComments.length > 0) {
    commentsHtml = `
      <div class="ig-post-comments">
        ${allComments
          .map((c) => {
            const replyPart = c.replyTo
              ? `<span class="reply-to">回复 <span class="reply-name">${c.replyTo}</span>：</span>`
              : "";
            return `
          <div class="ig-comment" onclick="setReplyTarget('${post.id}', '${c.authorName}')">
            <span class="username">${c.authorName}</span>${replyPart}${c.content}
          </div>
        `;
          })
          .join("")}
      </div>
    `;
  }

  const postIdStr = String(post.id);

  // SVG图标
  const likeIcon = liked
    ? `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  const commentIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  const shareIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;
  const bookmarkIcon = bookmarked
    ? `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;

  // 内联回复框
  const inlineReplyHtml = `
    <div class="ig-inline-reply">
      <input type="text" id="replyInput-${postIdStr}" placeholder="写评论..." onkeypress="if(event.key==='Enter')sendInlineComment('${postIdStr}')">
      <button onclick="sendInlineComment('${postIdStr}')">发送</button>
    </div>
  `;

  return `
    <div class="ig-post" data-post-id="${postIdStr}">
      <div class="ig-post-header">
        <div class="ig-post-avatar">
          ${
            authorAvatarImg
              ? `<img src="${authorAvatarImg}" alt="">`
              : authorAvatar
          }
        </div>
        <div class="ig-post-user-info">
          <div class="ig-post-username">${authorName}</div>
          <div class="ig-post-time-header">${formatPostTime(
            post.timestamp
          )}</div>
        </div>
        <button class="ig-post-delete" onclick="confirmDeletePost('${postIdStr}')" title="删除">✕</button>
      </div>
      ${contentHtml}
      ${imageHtml}
      <div class="ig-post-footer">
        <div class="ig-post-actions">
          <button class="ig-action-btn ${
            liked ? "liked" : ""
          }" onclick="toggleLike('${postIdStr}')">
            ${likeIcon}<span>${likeData.length || ""}</span>
          </button>
          <div class="ig-action-divider"></div>
          <button class="ig-action-btn" onclick="focusReplyInput('${postIdStr}')">
            ${commentIcon}<span>${allComments.length || ""}</span>
          </button>
          <div class="ig-action-divider"></div>
          <button class="ig-action-btn" onclick="sharePostToChat('${postIdStr}')" title="转发">
            ${shareIcon}
          </button>
          <div class="ig-action-divider"></div>
          <button class="ig-action-btn ${
            bookmarked ? "bookmarked" : ""
          }" onclick="toggleBookmark('${postIdStr}')" title="收藏">
            ${bookmarkIcon}
          </button>
        </div>
        ${likesHtml}
        ${commentsHtml}
        ${inlineReplyHtml}
      </div>
    </div>
  `;
}

// 格式化时间
function formatPostTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return new Date(timestamp).toLocaleDateString("zh-CN");
}

// 打开发布弹窗
// 当前选中的可见范围
var selectedVisibility = "all";
var selectedVisibilityGroups = [];

function openPostModal() {
  document.getElementById("igPostModal").classList.add("active");
  document.getElementById("igPostText").value = "";
  document.getElementById("igTextImgInput").value = "";
  document.getElementById("igTextImgInput").classList.remove("visible");
  document.getElementById("igImagePreview").classList.remove("visible");
  document.getElementById("imgOptionAlbum").classList.remove("selected");
  document.getElementById("imgOptionText").classList.remove("selected");
  window.selectedPostImage = null;

  // 初始化可见范围选择
  selectedVisibility = "all";
  selectedVisibilityGroups = [];
  renderVisibilityOptions();

  checkPostValid();
}

// 渲染可见范围选项
function renderVisibilityOptions() {
  const container = document.getElementById("visibilityOptions");
  if (!container) return;

  // 获取所有分组
  const groups = new Set();
  characters.forEach((char) => {
    const settings = chatSettings[char.id] || {};
    if (settings.group && settings.group !== "none") {
      groups.add(settings.group);
    }
  });

  let html = `<div class="ig-visibility-option ${
    selectedVisibility === "all" ? "selected" : ""
  }" data-value="all" onclick="selectVisibility('all', this)">
    <span class="check-icon">✓</span> 公开
  </div>`;

  groups.forEach((group) => {
    const isSelected = selectedVisibilityGroups.includes(group);
    html += `<div class="ig-visibility-option ${
      isSelected ? "selected" : ""
    }" data-value="${group}" onclick="toggleVisibilityGroup('${group}', this)">
      <span class="check-icon">✓</span> ${group}
    </div>`;
  });

  container.innerHTML = html;
}

// 选择可见范围
function selectVisibility(value, el) {
  if (value === "all") {
    selectedVisibility = "all";
    selectedVisibilityGroups = [];
    // 取消所有其他选中
    document.querySelectorAll(".ig-visibility-option").forEach((opt) => {
      opt.classList.remove("selected");
    });
    el.classList.add("selected");
  }
}

// 切换分组可见
function toggleVisibilityGroup(group, el) {
  // 取消"公开"的选中
  const allOption = document.querySelector(
    '.ig-visibility-option[data-value="all"]'
  );
  if (allOption) allOption.classList.remove("selected");
  selectedVisibility = "groups";

  if (selectedVisibilityGroups.includes(group)) {
    selectedVisibilityGroups = selectedVisibilityGroups.filter(
      (g) => g !== group
    );
    el.classList.remove("selected");

    // 如果没有选中任何分组，默认回到公开
    if (selectedVisibilityGroups.length === 0) {
      selectedVisibility = "all";
      if (allOption) allOption.classList.add("selected");
    }
  } else {
    selectedVisibilityGroups.push(group);
    el.classList.add("selected");
  }
}

// 关闭发布弹窗
function closePostModal() {
  document.getElementById("igPostModal").classList.remove("active");
}

// 选择图片选项
function selectImageOption(type) {
  if (type === "album") {
    document.getElementById("igImageInput").click();
    document.getElementById("imgOptionAlbum").classList.add("selected");
    document.getElementById("imgOptionText").classList.remove("selected");
    document.getElementById("igTextImgInput").classList.remove("visible");
  } else {
    document.getElementById("imgOptionText").classList.add("selected");
    document.getElementById("imgOptionAlbum").classList.remove("selected");
    document.getElementById("igTextImgInput").classList.add("visible");
    document.getElementById("igImagePreview").classList.remove("visible");
    window.selectedPostImage = null;
  }
}

// 处理图片选择
function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    window.selectedPostImage = e.target.result;
    document.getElementById("igPreviewImg").src = e.target.result;
    document.getElementById("igImagePreview").classList.add("visible");
    document.getElementById("igTextImgInput").classList.remove("visible");
    checkPostValid();
  };
  reader.readAsDataURL(file);
}

// 移除图片
function removeImage() {
  window.selectedPostImage = null;
  document.getElementById("igImagePreview").classList.remove("visible");
  document.getElementById("imgOptionAlbum").classList.remove("selected");
  document.getElementById("igImageInput").value = "";
  checkPostValid();
}

// 检查是否可以发布
function checkPostValid() {
  const text = document.getElementById("igPostText").value.trim();
  const textImg = document.getElementById("igTextImgInput").value.trim();
  const hasImage = window.selectedPostImage;

  const valid = text.length > 0 || textImg.length > 0 || hasImage;
  document.getElementById("igPostSubmit").disabled = !valid;
}

// 发布动态
async function submitPost() {
  const text = document.getElementById("igPostText").value.trim();
  const textImg = document.getElementById("igTextImgInput").value.trim();

  const post = {
    id: Date.now(),
    content: text,
    image: window.selectedPostImage || null,
    textImage: textImg || null,
    timestamp: Date.now(),
    isUser: true,
    authorId: "user",
    likes: [],
    comments: [],
    // 可见范围
    visibility: selectedVisibility,
    visibleGroups:
      selectedVisibility === "groups" ? [...selectedVisibilityGroups] : [],
  };

  window.momentsData.posts.unshift(post);
  await localforage.setItem("momentsData", window.momentsData);

  closePostModal();
  renderMomentsUI();
  showToast("★ 动态发布成功！");

  // AI角色会来互动 - 根据可见范围筛选
  setTimeout(() => {
    aiInteractWithPost(post);
  }, 2000 + Math.random() * 2000);
}

// AI与用户动态互动 - 使用API生成符合人设的评论
async function aiInteractWithPost(post) {
  if (!window.characters || window.characters.length === 0) {
    console.log("没有角色，跳过AI互动");
    return;
  }

  console.log("开始AI互动，角色数量:", window.characters.length);

  // 根据可见范围筛选可以看到动态的AI
  let eligibleChars = [...window.characters];

  if (
    post.visibility === "groups" &&
    post.visibleGroups &&
    post.visibleGroups.length > 0
  ) {
    // 只有指定分组的AI可以看到
    eligibleChars = window.characters.filter((char) => {
      const settings = chatSettings[char.id] || {};
      return post.visibleGroups.includes(settings.group);
    });
    console.log(
      "可见分组:",
      post.visibleGroups,
      "符合条件的AI:",
      eligibleChars.map((c) => c.name)
    );
  }

  if (eligibleChars.length === 0) {
    console.log("没有符合条件的AI可以看到这条动态");
    return;
  }

  // 所有符合条件的AI都会来互动（100%）
  for (const char of eligibleChars) {
    await new Promise((resolve) =>
      setTimeout(resolve, 1500 + Math.random() * 2000)
    );

    // 100% 点赞
    const postIndex = window.momentsData.posts.findIndex(
      (p) => p.id === post.id
    );
    if (
      postIndex !== -1 &&
      !window.momentsData.posts[postIndex].likes.includes(String(char.id))
    ) {
      window.momentsData.posts[postIndex].likes.push(String(char.id));
      await localforage.setItem("momentsData", window.momentsData);
      renderMomentsUI();
      console.log(char.name, "点赞了");
    }

    // 100% 评论
    console.log(char.name, "准备评论，开始调用API...");
    try {
      console.log(char.name, "正在生成评论...");
      const comment = await generateAiCommentWithAPI(char, post);
      console.log(char.name, "API返回评论:", comment);
      if (comment) {
        const postIndex = window.momentsData.posts.findIndex(
          (p) => p.id === post.id
        );
        if (postIndex !== -1) {
          window.momentsData.posts[postIndex].comments.push({
            id: Date.now(),
            authorId: String(char.id),
            authorName: char.note || char.name,
            authorAvatar: char.avatar || "AI",
            content: comment,
            timestamp: Date.now(),
            replyTo: null,
          });
          await localforage.setItem("momentsData", window.momentsData);
          renderMomentsUI();
          console.log(char.name, "评论成功:", comment);

          // 增加朋友圈未读提醒
          addUnreadMoment();
        }
      } else {
        console.log(char.name, "评论内容为空");
      }
    } catch (e) {
      console.error("AI评论生成失败:", e);
    }
  }
}

// 使用API生成AI评论 - 符合角色人设
async function generateAiCommentWithAPI(char, post) {
  // 获取当前激活的API配置，优先使用角色设置的API，否则用全局激活的
  const charSettings = chatSettings[char.id] || {};
  let apiConfigToUse = null;

  if (charSettings.apiPreset) {
    apiConfigToUse = apiPresets.find((p) => p.id === charSettings.apiPreset);
  }
  if (!apiConfigToUse) {
    apiConfigToUse = apiPresets.find((p) => p.id === activePresetId);
  }
  if (!apiConfigToUse && apiPresets.length > 0) {
    apiConfigToUse = apiPresets[0];
  }

  if (!apiConfigToUse || !apiConfigToUse.key) {
    console.log("没有可用的API配置，跳过AI评论");
    return null;
  }

  console.log("使用API配置:", apiConfigToUse.name, apiConfigToUse.model);

  // 构建动态内容描述
  let postDescription = "";
  if (post.content) {
    postDescription += `动态文字内容: "${post.content}"`;
  }
  if (post.textImage) {
    postDescription += `${postDescription ? "\n" : ""}动态配图描述: "${
      post.textImage
    }"`;
  }

  // 检查是否有真实图片
  const hasRealImage = post.image && post.image.startsWith("data:image");

  const userName = window.momentsData.userProfile.name || "用户";

  // 获取角色人设
  const persona = charSettings.persona || char.description || "";

  // 构建系统提示词
  const systemPrompt = `你是${
    char.note || char.name
  }，正在社交媒体上看到${userName}发布的一条动态。
${persona ? `你的人设: ${persona}` : ""}

请根据你的性格和人设，对这条动态写一条简短的评论回复。

要求:
1. 评论要简短自然，像真人在社交媒体上的评论一样，通常1-2句话
2. 要符合你的人设和说话风格
3. 要针对动态的具体内容进行评论，不要泛泛而谈
4. 可以适当使用表情符号
5. 直接输出评论内容，不要有任何前缀或解释
${hasRealImage ? "6. 动态中包含一张图片，请根据图片内容来评论" : ""}`;

  // 构建消息内容
  let userContent;
  if (hasRealImage) {
    // 如果有真实图片，使用多模态格式
    userContent = [
      {
        type: "text",
        text: `${userName}发布了一条动态:\n${
          postDescription || "(纯图片动态)"
        }\n\n请根据图片内容写一条评论:`,
      },
      {
        type: "image_url",
        image_url: {
          url: post.image,
        },
      },
    ];
  } else {
    userContent = `${userName}发布了一条动态:\n${postDescription}\n\n请写一条评论:`;
  }

  try {
    // 确保URL格式正确 - 以/chat/completions结尾
    let apiUrl = apiConfigToUse.url.replace(/\/$/, "");
    if (!apiUrl.endsWith("/chat/completions")) {
      if (apiUrl.endsWith("/v1")) {
        apiUrl += "/chat/completions";
      } else if (apiUrl.includes("/v1/")) {
        if (!apiUrl.includes("/chat/completions")) {
          apiUrl += "/chat/completions";
        }
      } else {
        apiUrl += "/v1/chat/completions";
      }
    }

    console.log(
      "AI评论API调用:",
      apiUrl,
      apiConfigToUse.model,
      hasRealImage ? "(含图片)" : ""
    );

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiConfigToUse.key}`,
      },
      body: JSON.stringify({
        model: apiConfigToUse.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.8,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`API请求失败: ${response.status}`, errText);
      throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    console.log("评论API完整返回:", JSON.stringify(data));

    // 兼容不同模型的返回格式
    const choice = data.choices?.[0];
    let comment = choice?.message?.content?.trim();

    // 如果content为空，尝试其他可能的字段
    if (!comment && choice?.message?.reasoning_content) {
      comment = choice.message.reasoning_content.trim();
    }
    if (!comment && choice?.message?.reasoning) {
      comment = choice.message.reasoning.trim();
    }
    if (!comment && choice?.text) {
      comment = choice.text.trim();
    }
    if (!comment && choice?.delta?.content) {
      comment = choice.delta.content.trim();
    }

    // 如果还是空的，检测是否是推理模型问题
    if (!comment) {
      const hasReasoningTokens =
        data.usage?.reasoning_tokens > 0 ||
        data.usage?.completion_tokens_details?.reasoning_tokens > 0;
      if (hasReasoningTokens) {
        console.warn("检测到推理模型返回空内容，跳过评论");
        return null;
      }
    }

    // 如果还是空的，用简化prompt重试
    if (!comment) {
      console.log("评论为空，尝试简化prompt重试");
      const simplePrompt = `看到朋友发的动态："${
        post.content || "(图片)"
      }"，写一句简短评论（10字以内），直接输出评论内容：`;

      const retryResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiConfigToUse.key}`,
        },
        body: JSON.stringify({
          model: apiConfigToUse.model,
          messages: [{ role: "user", content: simplePrompt }],
          max_tokens: 50,
          temperature: 0.7,
        }),
      });

      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        console.log("重试API返回:", JSON.stringify(retryData));
        comment = retryData.choices?.[0]?.message?.content?.trim();
      }
    }

    console.log("AI评论最终结果:", comment);
    return comment || null;
  } catch (e) {
    console.error("API调用失败:", e);
    return null;
  }
}

// ==================== 陪伴APP功能 ====================
var companionState = {
  active: false,
  paused: false,
  charId: null,
  task: "",
  duration: 45, // 分钟
  encourageFreq: 5, // 分钟
  remainingSeconds: 0,
  totalSeconds: 0,
  timerInterval: null,
  encourageInterval: null,
  chatMessages: [],
  voiceEnabled: false,
  backgrounds: [], // 多个背景 [{type: 'image'|'video', data: base64}]
  bgInterval: 10, // 轮播间隔秒数
  bgRotateTimer: null,
  currentBgIndex: 0,
  lastFlipTime: { min1: "", min2: "", sec1: "", sec2: "" },
};

// 陪伴记录数据
var companionRecords = [];
var companionCalendarMonth = new Date();

// 加载陪伴记录
async function loadCompanionRecords() {
  try {
    const saved = await localforage.getItem("companionRecords");
    companionRecords = saved || [];
  } catch (e) {
    companionRecords = [];
  }
}

// 保存陪伴记录
async function saveCompanionRecords() {
  await localforage.setItem("companionRecords", companionRecords);
}

// 添加陪伴记录
async function addCompanionRecord(record) {
  companionRecords.unshift(record);
  await saveCompanionRecords();
  updateCompanionStats();
}

// 更新统计数据
function updateCompanionStats() {
  const totalTimes = companionRecords.length;
  const totalMinutes = companionRecords.reduce(
    (sum, r) => sum + (r.duration || 0),
    0
  );
  const totalHours = (totalMinutes / 60).toFixed(1);

  // 计算连续天数
  const streak = calculateCompanionStreak();

  const timesEl = document.getElementById("companionTotalTimes");
  const hoursEl = document.getElementById("companionTotalHours");
  const streakEl = document.getElementById("companionStreak");

  if (timesEl) timesEl.textContent = totalTimes;
  if (hoursEl) hoursEl.textContent = totalHours;
  if (streakEl) streakEl.textContent = streak;
}

// 计算连续天数
function calculateCompanionStreak() {
  if (companionRecords.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 获取有记录的日期集合
  const recordDates = new Set();
  companionRecords.forEach((r) => {
    const d = new Date(r.timestamp);
    d.setHours(0, 0, 0, 0);
    recordDates.add(d.getTime());
  });

  let streak = 0;
  let checkDate = new Date(today);

  // 如果今天没有记录，从昨天开始检查
  if (!recordDates.has(checkDate.getTime())) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (recordDates.has(checkDate.getTime())) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

// 切换Tab
function switchCompanionTab(tab) {
  const setupTab = document.getElementById("companionTabSetup");
  const historyTab = document.getElementById("companionTabHistory");
  const setupContent = document.getElementById("companionSetup");
  const historyContent = document.getElementById("companionHistory");

  if (tab === "setup") {
    setupTab.classList.add("active");
    historyTab.classList.remove("active");
    setupContent.style.display = "block";
    historyContent.style.display = "none";
  } else {
    setupTab.classList.remove("active");
    historyTab.classList.add("active");
    setupContent.style.display = "none";
    historyContent.style.display = "block";
    renderCompanionCalendar();
    renderCompanionHistoryList();
  }
}

// 渲染日历
function renderCompanionCalendar() {
  const year = companionCalendarMonth.getFullYear();
  const month = companionCalendarMonth.getMonth();

  document.getElementById("companionCalendarTitle").textContent = `${year}年${
    month + 1
  }月`;

  const container = document.getElementById("companionCalendarDays");
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();

  // 获取本月有记录的日期
  const recordDates = new Set();
  companionRecords.forEach((r) => {
    const d = new Date(r.timestamp);
    if (d.getFullYear() === year && d.getMonth() === month) {
      recordDates.add(d.getDate());
    }
  });

  const today = new Date();
  const isThisMonth =
    today.getFullYear() === year && today.getMonth() === month;

  let html = "";

  // 上月填充
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    html += `<div class="companion-calendar-day other-month">${
      prevMonthDays - i
    }</div>`;
  }

  // 本月日期
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const isToday = isThisMonth && day === today.getDate();
    const hasRecord = recordDates.has(day);
    const classes = ["companion-calendar-day"];
    if (isToday) classes.push("today");
    if (hasRecord) classes.push("has-record");
    html += `<div class="${classes.join(
      " "
    )}" onclick="selectCompanionDate(${year}, ${month}, ${day})">${day}</div>`;
  }

  // 下月填充
  const totalCells = Math.ceil((startDayOfWeek + lastDay.getDate()) / 7) * 7;
  const remainingCells = totalCells - startDayOfWeek - lastDay.getDate();
  for (let i = 1; i <= remainingCells; i++) {
    html += `<div class="companion-calendar-day other-month">${i}</div>`;
  }

  container.innerHTML = html;
}

// 切换月份
function changeCompanionMonth(delta) {
  companionCalendarMonth.setMonth(companionCalendarMonth.getMonth() + delta);
  renderCompanionCalendar();
}

// 选择日期筛选
function selectCompanionDate(year, month, day) {
  // 移除其他选中
  document
    .querySelectorAll(".companion-calendar-day.selected")
    .forEach((el) => el.classList.remove("selected"));
  event.target.classList.add("selected");

  // 筛选显示该日期的记录
  renderCompanionHistoryList(new Date(year, month, day));
}

// 渲染记录列表
function renderCompanionHistoryList(filterDate = null) {
  const container = document.getElementById("companionHistoryList");
  const emptyEl = document.getElementById("companionHistoryEmpty");

  let records = companionRecords;

  if (filterDate) {
    filterDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(filterDate);
    nextDay.setDate(nextDay.getDate() + 1);

    records = companionRecords.filter((r) => {
      const d = new Date(r.timestamp);
      return d >= filterDate && d < nextDay;
    });
  }

  if (records.length === 0) {
    container.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }

  emptyEl.style.display = "none";

  container.innerHTML = records
    .map((record) => {
      const char = characters.find(
        (c) => String(c.id) === String(record.charId)
      );
      const avatarContent = char?.avatar
        ? `<img src="${char.avatar}">`
        : char?.name
        ? char.name.charAt(0)
        : "😊";
      const charName = char?.note || char?.name || "AI";

      const date = new Date(record.timestamp);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      const timeStr = date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return `
      <div class="companion-history-item">
        <div class="companion-history-avatar">${avatarContent}</div>
        <div class="companion-history-content">
          <div class="companion-history-header">
            <span class="companion-history-task">${record.task}</span>
            <span class="companion-history-status ${
              record.completed ? "complete" : "quit"
            }">${record.completed ? "完成" : "中断"}</span>
          </div>
          <div class="companion-history-meta">
            <span class="companion-history-char">🤖 ${charName}</span>
            <span>⏱️ ${record.duration}分钟</span>
            <span>📅 ${dateStr} ${timeStr}</span>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

// 处理背景选择（支持多选）
function handleCompanionBgSelect(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  // 检查是否已有视频
  const hasVideo = companionState.backgrounds.some((bg) => bg.type === "video");

  Array.from(files).forEach((file) => {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) return;

    // 如果添加视频，清除所有图片；如果已有视频，不允许添加更多
    if (isVideo) {
      if (hasVideo) {
        showToast("只能添加一个视频");
        return;
      }
      companionState.backgrounds = []; // 清除图片
    } else if (hasVideo) {
      showToast("已有视频，请先删除视频再添加图片");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      companionState.backgrounds.push({
        type: isVideo ? "video" : "image",
        data: e.target.result,
      });
      renderCompanionBgList();
    };
    reader.readAsDataURL(file);
  });

  // 清空input以便重复选择同一文件
  event.target.value = "";
}

// 渲染背景列表
function renderCompanionBgList() {
  const container = document.getElementById("companionBgList");
  if (!container) return;

  container.innerHTML = companionState.backgrounds
    .map((bg, index) => {
      if (bg.type === "video") {
        return `
        <div class="companion-bg-item video">
          <video src="${bg.data}" muted></video>
          <div class="bg-remove" onclick="removeCompanionBgItem(${index})">✕</div>
        </div>
      `;
      } else {
        return `
        <div class="companion-bg-item">
          <img src="${bg.data}">
          <div class="bg-remove" onclick="removeCompanionBgItem(${index})">✕</div>
        </div>
      `;
      }
    })
    .join("");

  // 显示/隐藏轮播间隔设置
  const intervalSetting = document.getElementById("companionBgIntervalSetting");
  if (intervalSetting) {
    const imageCount = companionState.backgrounds.filter(
      (bg) => bg.type === "image"
    ).length;
    intervalSetting.style.display = imageCount > 1 ? "block" : "none";
  }
}

// 删除单个背景
function removeCompanionBgItem(index) {
  companionState.backgrounds.splice(index, 1);
  renderCompanionBgList();
}

// 移除所有背景
function removeCompanionBg() {
  companionState.backgrounds = [];
  renderCompanionBgList();
}

// 开始背景轮播
function startBgRotation() {
  if (companionState.backgrounds.length === 0) return;

  const hasVideo = companionState.backgrounds.some((bg) => bg.type === "video");

  if (hasVideo) {
    // 视频模式
    const video = companionState.backgrounds.find((bg) => bg.type === "video");
    const bgVideo = document.getElementById("companionBgVideo");
    bgVideo.src = video.data;
    bgVideo.style.display = "block";
    bgVideo.play();
    document.getElementById("companionBgSlide1").style.display = "none";
    document.getElementById("companionBgSlide2").style.display = "none";
  } else {
    // 图片轮播模式
    document.getElementById("companionBgVideo").style.display = "none";
    const slide1 = document.getElementById("companionBgSlide1");
    const slide2 = document.getElementById("companionBgSlide2");
    slide1.style.display = "block";
    slide2.style.display = "block";

    companionState.currentBgIndex = 0;
    slide1.style.backgroundImage = `url(${companionState.backgrounds[0].data})`;
    slide1.classList.add("active");
    slide2.classList.remove("active");

    if (companionState.backgrounds.length > 1) {
      const interval =
        parseInt(document.getElementById("companionBgInterval")?.value) || 10;
      companionState.bgInterval = interval;

      companionState.bgRotateTimer = setInterval(() => {
        rotateBg();
      }, interval * 1000);
    }
  }
}

// 切换背景图
function rotateBg() {
  if (companionState.backgrounds.length <= 1) return;

  const slide1 = document.getElementById("companionBgSlide1");
  const slide2 = document.getElementById("companionBgSlide2");

  companionState.currentBgIndex =
    (companionState.currentBgIndex + 1) % companionState.backgrounds.length;
  const nextBg = companionState.backgrounds[companionState.currentBgIndex];

  if (slide1.classList.contains("active")) {
    slide2.style.backgroundImage = `url(${nextBg.data})`;
    slide1.classList.remove("active");
    slide2.classList.add("active");
  } else {
    slide1.style.backgroundImage = `url(${nextBg.data})`;
    slide2.classList.remove("active");
    slide1.classList.add("active");
  }
}

// 停止背景轮播
function stopBgRotation() {
  if (companionState.bgRotateTimer) {
    clearInterval(companionState.bgRotateTimer);
    companionState.bgRotateTimer = null;
  }
  const bgVideo = document.getElementById("companionBgVideo");
  if (bgVideo) {
    bgVideo.pause();
    bgVideo.src = "";
  }
}

// 更新翻页时钟
function updateFlipClock(minutes, seconds) {
  const min1 = Math.floor(minutes / 10).toString();
  const min2 = (minutes % 10).toString();
  const sec1 = Math.floor(seconds / 10).toString();
  const sec2 = (seconds % 10).toString();

  updateFlipCard("flipMin1", min1, companionState.lastFlipTime.min1);
  updateFlipCard("flipMin2", min2, companionState.lastFlipTime.min2);
  updateFlipCard("flipSec1", sec1, companionState.lastFlipTime.sec1);
  updateFlipCard("flipSec2", sec2, companionState.lastFlipTime.sec2);

  companionState.lastFlipTime = { min1, min2, sec1, sec2 };
}

function updateFlipCard(cardId, newValue, oldValue) {
  const card = document.getElementById(cardId);
  if (!card) return;

  const front = card.querySelector(".flip-card-front");
  const back = card.querySelector(".flip-card-back");

  if (newValue !== oldValue && oldValue !== "") {
    card.classList.add("flipping");
    back.textContent = newValue;

    setTimeout(() => {
      front.textContent = newValue;
      card.classList.remove("flipping");
    }, 300);
  } else {
    front.textContent = newValue;
    back.textContent = newValue;
  }
}

// 切换语音鼓励
function toggleCompanionVoice() {
  companionState.voiceEnabled = !companionState.voiceEnabled;
  const toggle = document.getElementById("companionVoiceToggle");
  if (companionState.voiceEnabled) {
    toggle.style.background = "#ec407a";
    toggle.querySelector("div").style.left = "24px";
  } else {
    toggle.style.background = "#e0e0e0";
    toggle.querySelector("div").style.left = "2px";
  }
}

// 打开陪伴页面
async function openCompanionPage() {
  openPage("companionPage");
  await loadCompanionRecords();
  renderCompanionCharSelect();
  renderCompanionBgList();
  updateCompanionStats();
}

// 关闭陪伴页面
function closeCompanionPage() {
  if (companionState.active) {
    if (!confirm("陪伴正在进行中，确定要离开吗？")) {
      return;
    }
    quitCompanion(true);
  }
  closePage("companionPage");
}

// 渲染角色选择列表
function renderCompanionCharSelect() {
  const container = document.getElementById("companionCharSelect");
  if (!container) return;

  if (!characters || characters.length === 0) {
    container.innerHTML =
      '<div style="color:#999;font-size:0.85rem;">还没有AI角色，请先添加角色~</div>';
    return;
  }

  container.innerHTML = characters
    .map((char) => {
      const isSelected = String(companionState.charId) === String(char.id);
      const avatarContent = char.avatar
        ? `<img src="${char.avatar}" alt="">`
        : char.name
        ? char.name.charAt(0)
        : "😊";
      return `
      <div class="companion-char-item ${
        isSelected ? "selected" : ""
      }" onclick="selectCompanionChar(${char.id})">
        <div class="avatar">${avatarContent}</div>
        <div class="name">${char.note || char.name || "AI"}</div>
      </div>
    `;
    })
    .join("");
}

// 选择陪伴角色
function selectCompanionChar(charId) {
  companionState.charId = charId;
  renderCompanionCharSelect();
}

// 设置陪伴任务（保留但不用）
function setCompanionTask(task) {
  document.getElementById("companionTaskInput").value = task;
}

// 设置陪伴时长（保留但不用）
function setCompanionDuration(minutes) {
  companionState.duration = minutes;
}

// 设置鼓励频率
function setEncourageFreq(minutes) {
  companionState.encourageFreq = minutes;
  document
    .querySelectorAll(".companion-freq-tag")
    .forEach((el) => el.classList.remove("active"));
  event.target.classList.add("active");
}

// 开始陪伴
function startCompanion() {
  const task = document.getElementById("companionTaskInput").value.trim();
  const durationInput = document.getElementById("companionDurationInput");
  const duration = parseInt(durationInput.value) || 45;

  if (!companionState.charId) {
    showToast("请先选择陪伴角色");
    return;
  }
  if (!task) {
    showToast("请输入陪伴项目");
    return;
  }
  if (duration < 1 || duration > 480) {
    showToast("陪伴时长请设置1-480分钟");
    return;
  }

  const char = characters.find(
    (c) => String(c.id) === String(companionState.charId)
  );
  if (!char) {
    showToast("角色不存在");
    return;
  }

  companionState.active = true;
  companionState.paused = false;
  companionState.task = task;
  companionState.duration = duration;
  companionState.totalSeconds = duration * 60;
  companionState.remainingSeconds = companionState.totalSeconds;
  companionState.chatMessages = [];
  companionState.lastFlipTime = {
    min1: "",
    min2: "",
    sec1: "",
    sec2: "",
  };

  // 切换界面
  document.getElementById("companionSetup").style.display = "none";
  document.getElementById("companionActive").style.display = "flex";

  // 启动背景轮播
  startBgRotation();

  // 设置角色显示
  const avatarEl = document.getElementById("companionCharAvatar");
  if (char.avatar) {
    avatarEl.innerHTML = `<img src="${char.avatar}" alt="">`;
  } else {
    avatarEl.textContent = char.name ? char.name.charAt(0) : "😊";
  }
  document.getElementById("companionCharName").textContent =
    char.note || char.name || "AI";
  document.getElementById("companionChatCharName").textContent =
    char.note || char.name || "AI";
  document.getElementById("companionTaskName").textContent = task + "中...";

  // 开始计时
  updateCompanionTimer();
  companionState.timerInterval = setInterval(() => {
    if (!companionState.paused && companionState.remainingSeconds > 0) {
      companionState.remainingSeconds--;
      updateCompanionTimer();

      if (companionState.remainingSeconds === 0) {
        completeCompanion();
      }
    }
  }, 1000);

  // 发送开始鼓励
  sendCompanionEncouragement("start");

  // 设置定期鼓励
  if (companionState.encourageFreq > 0) {
    companionState.encourageInterval = setInterval(() => {
      if (!companionState.paused) {
        sendCompanionEncouragement("encourage");
      }
    }, companionState.encourageFreq * 60 * 1000);
  }
}

// 更新计时器显示（翻页时钟）
function updateCompanionTimer() {
  const mins = Math.floor(companionState.remainingSeconds / 60);
  const secs = companionState.remainingSeconds % 60;

  // 更新翻页时钟
  updateFlipClock(mins, secs);

  // 更新进度条
  const progress =
    ((companionState.totalSeconds - companionState.remainingSeconds) /
      companionState.totalSeconds) *
    100;
  document.getElementById("companionProgressFill").style.width = progress + "%";
}

// 发送AI鼓励消息
async function sendCompanionEncouragement(type) {
  const char = characters.find(
    (c) => String(c.id) === String(companionState.charId)
  );
  if (!char) return;

  const charId = companionState.charId;
  const settings = chatSettings[charId] || {};
  const charName = char.note || char.name || "AI";
  const task = companionState.task;
  const remainMins = Math.floor(companionState.remainingSeconds / 60);
  const totalMins = companionState.duration;
  const elapsedMins = Math.floor(
    (companionState.totalSeconds - companionState.remainingSeconds) / 60
  );

  // 获取完整人设（和普通聊天一样）
  const persona =
    settings.systemPrompt || settings.persona || char.description || "";

  // 获取世界书内容
  let worldbookContent = "";
  const worldbookIds = settings.worldbook
    ? settings.worldbook.split(",").filter((s) => s)
    : [];
  if (worldbookIds.length > 0) {
    worldbookContent = getWorldbookContentForAI(
      worldbookIds,
      task + " 陪伴 鼓励"
    );
  }

  // 构建提示词
  let situationPrompt = "";
  if (type === "start") {
    situationPrompt = `用户刚开始「${task}」，计划${totalMins}分钟。用你的方式说一句加油的话。`;
  } else if (type === "encourage") {
    situationPrompt = `用户正在「${task}」，已经${elapsedMins}分钟了，还剩${remainMins}分钟。用你的方式鼓励一句。`;
  } else if (type === "complete") {
    situationPrompt = `用户完成了「${task}」！坚持了${totalMins}分钟！用你的方式夸夸ta！`;
  } else if (type === "quit") {
    situationPrompt = `用户停下了「${task}」，坚持了${elapsedMins}分钟。用你的方式安慰ta。`;
  }

  const systemPrompt = `【你的身份】
你是「${charName}」。你必须始终以这个身份说话。

【你的人设 - 必须严格遵守】
${persona || `你是${charName}，性格温柔体贴，关心用户。`}
${worldbookContent ? `\n【世界观/背景设定】\n${worldbookContent}` : ""}

【重要！当前情景】
你正在陪伴用户「${task}」！

【回复规则】
1. 保持人设的性格、说话风格、口癖、对用户的称呼
2. 简短自然，1-2句话，像真人说话
3. 禁止使用方括号[]、星号*
4. 禁止说"作为AI"、"作为一个"`;

  try {
    const apiKey =
      settings.apiKey ||
      (window.voiceConfig && window.voiceConfig.apiKey) ||
      "";
    const apiUrl =
      settings.apiUrl || "https://api.minimax.chat/v1/text/chatcompletion_v2";
    const model = settings.model || "MiniMax-Text-01";

    if (!apiKey) {
      updateCompanionMessage(getDefaultEncouragement(type, charName));
      return;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: situationPrompt },
        ],
      }),
    });

    const data = await response.json();
    let message =
      data.choices?.[0]?.message?.content ||
      getDefaultEncouragement(type, charName);
    // 清理消息中的特殊标签
    message = message
      .replace(/\[.*?\]/g, "")
      .replace(/\*.*?\*/g, "")
      .trim();
    updateCompanionMessage(message);

    // 如果开启了语音鼓励，播放语音
    if (companionState.voiceEnabled && message) {
      playCompanionVoice(message);
    }
  } catch (e) {
    console.error("陪伴鼓励生成失败:", e);
    updateCompanionMessage(getDefaultEncouragement(type, charName));
  }
}

// 播放语音鼓励
async function playCompanionVoice(text) {
  try {
    const settings = chatSettings[companionState.charId] || {};
    const voiceId = settings.voiceId;
    const apiKey =
      settings.apiKey ||
      (window.voiceConfig && window.voiceConfig.apiKey) ||
      "";
    const groupId = (window.voiceConfig && window.voiceConfig.groupId) || "1";

    if (!voiceId || !apiKey) {
      console.log("未配置语音或API，跳过语音播放");
      return;
    }

    const response = await fetch(
      `https://api.minimax.chat/v1/t2a_v2?GroupId=${groupId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "speech-01-turbo",
          text: text,
          voice_setting: {
            voice_id: voiceId,
            speed: 0.9,
            vol: 1.0,
            pitch: 0,
          },
          audio_setting: {
            sample_rate: 32000,
            format: "mp3",
          },
        }),
      }
    );

    const data = await response.json();
    console.log("TTS响应:", data);

    // MiniMax TTS API返回格式
    const audioHex = data.data?.audio || data.audio_file;
    if (audioHex) {
      // MiniMax返回的audio是hex格式，需要转换
      let audioData = audioHex;
      try {
        // 检查是否是hex格式（不是base64）
        if (/^[0-9a-fA-F]+$/.test(audioHex.substring(0, 100))) {
          // hex转Uint8Array再转base64
          const hexPairs = audioHex.match(/.{1,2}/g) || [];
          const bytes = new Uint8Array(
            hexPairs.map((byte) => parseInt(byte, 16))
          );
          // 分块转换避免栈溢出
          let binary = "";
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(
              null,
              bytes.slice(i, i + chunkSize)
            );
          }
          audioData = btoa(binary);
        }
        const audio = new Audio("data:audio/mp3;base64," + audioData);
        await audio.play();
      } catch (playError) {
        console.error("音频播放失败:", playError);
      }
    } else if (data.extra_info?.audio_file) {
      try {
        const audio = new Audio(
          "data:audio/mp3;base64," + data.extra_info.audio_file
        );
        await audio.play();
      } catch (playError) {
        console.error("音频播放失败:", playError);
      }
    }
  } catch (e) {
    console.error("语音播放失败:", e);
  }
}

// 默认鼓励语
function getDefaultEncouragement(type, charName) {
  const encouragements = {
    start: [`加油！我会一直陪着你~`, `开始啦！我在这里陪你哦~`, `一起努力吧！`],
    encourage: [
      `你做得很好，继续加油！`,
      `休息一下眼睛吧~`,
      `记得喝水哦~`,
      `坚持就是胜利！`,
    ],
    complete: [`太棒了！你做到了！`, `好厉害！我为你骄傲！`, `完成啦！辛苦了~`],
    quit: [`没关系的，下次再加油~`, `休息一下也很重要哦`, `我会一直陪着你的~`],
  };
  const list = encouragements[type] || encouragements.encourage;
  return list[Math.floor(Math.random() * list.length)];
}

// 更新鼓励消息显示
function updateCompanionMessage(message) {
  const el = document.getElementById("companionMessage");
  el.style.animation = "none";
  el.offsetHeight; // 触发重绘
  el.textContent = message;
  el.style.animation = "companionMsgPop 0.3s ease";
}

// 暂停/继续
function toggleCompanionPause() {
  companionState.paused = !companionState.paused;
  const btn = document.getElementById("companionPauseBtn");
  if (companionState.paused) {
    btn.innerHTML = "▶️ 继续";
    updateCompanionMessage("暂停了~准备好了就继续吧");
  } else {
    btn.innerHTML = "⏸️ 暂停";
    updateCompanionMessage("继续加油！");
  }
}

// 完成陪伴
async function completeCompanion() {
  if (!companionState.active) return;

  clearInterval(companionState.timerInterval);
  clearInterval(companionState.encourageInterval);

  // 发送完成鼓励
  await sendCompanionEncouragement("complete");

  // 发送到聊天记录
  await sendCompanionResultToChat(true);

  showToast("🎉 太棒了！陪伴完成！");

  setTimeout(() => {
    resetCompanion();
  }, 2000);
}

// 放弃陪伴
async function quitCompanion(silent = false) {
  if (!companionState.active) return;

  if (!silent && !confirm("确定要放弃这次陪伴吗？")) {
    return;
  }

  clearInterval(companionState.timerInterval);
  clearInterval(companionState.encourageInterval);

  if (!silent) {
    await sendCompanionEncouragement("quit");
  }

  resetCompanion();
}

// 重置陪伴状态
function resetCompanion() {
  companionState.active = false;
  companionState.paused = false;
  companionState.remainingSeconds = 0;
  companionState.chatMessages = [];

  // 停止背景轮播
  stopBgRotation();

  document.getElementById("companionSetup").style.display = "block";
  document.getElementById("companionActive").style.display = "none";
  document.getElementById("companionPauseBtn").innerHTML = "⏸️ 暂停";
}

// 发送陪伴结果到聊天（卡片形式 + AI自动对话）
async function sendCompanionResultToChat(completed) {
  const char = characters.find(
    (c) => String(c.id) === String(companionState.charId)
  );
  if (!char) return;

  const charId = companionState.charId;
  const task = companionState.task;
  const totalMins = companionState.duration;
  const actualMins = Math.floor(
    (companionState.totalSeconds - companionState.remainingSeconds) / 60
  );
  const chatSummary =
    companionState.chatMessages.length > 0
      ? companionState.chatMessages
          .map(
            (m) =>
              `${m.role === "user" ? "用户" : char.note || char.name}: ${
                m.content
              }`
          )
          .join("\n")
      : "";

  // 保存陪伴记录
  await addCompanionRecord({
    charId: charId,
    task: task,
    duration: completed ? totalMins : actualMins,
    totalDuration: totalMins,
    completed: completed,
    timestamp: Date.now(),
  });

  // 初始化聊天记录
  if (!chatHistories[charId]) {
    chatHistories[charId] = [];
  }

  // 添加陪伴完成卡片消息
  const cardContent = completed
    ? `[陪伴卡片:completed:${task}:${totalMins}]`
    : `[陪伴卡片:quit:${task}:${actualMins}]`;

  chatHistories[charId].push({
    role: "assistant",
    content: cardContent,
    isCompanionCard: true,
    companionData: {
      completed: completed,
      task: task,
      duration: completed ? totalMins : actualMins,
      totalDuration: totalMins,
    },
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    timestamp: Date.now(),
  });

  await localforage.setItem("chatHistories", chatHistories);

  // 生成AI的后续对话 - 使用完整人设
  const settings = chatSettings[charId] || {};
  const charName = char.note || char.name || "AI";
  const persona =
    settings.systemPrompt || settings.persona || char.description || "";

  // 获取世界书内容
  let worldbookContent = "";
  const worldbookIds = settings.worldbook
    ? settings.worldbook.split(",").filter((s) => s)
    : [];
  if (worldbookIds.length > 0) {
    worldbookContent = getWorldbookContentForAI(
      worldbookIds,
      task + " 陪伴 完成"
    );
  }

  let contextInfo = `【刚才发生的事】你陪伴用户${task}了${
    completed ? totalMins : actualMins
  }分钟，用户${completed ? "成功完成了！" : "中途停下了"}。`;
  if (chatSummary) {
    contextInfo += `\n在陪伴过程中你们的对话：\n${chatSummary}`;
  }

  const situationPrompt = completed
    ? `用户刚刚完成了${task}！请用你的方式主动和用户聊天，可以继续表扬、关心ta的感受、或者聊聊相关话题。`
    : `用户中途停下了${task}。请用你的方式主动关心用户，安慰ta、问问ta是不是累了或有什么事。`;

  const systemPrompt = `【角色设定 - 必须严格遵守】
你是「${charName}」。

【你的人设】
${persona || `你是${charName}，性格温柔体贴。`}
${worldbookContent ? `\n【世界观/背景设定】\n${worldbookContent}` : ""}

${contextInfo}

【回复要求】
1. 必须完全代入「${charName}」的角色，保持人设中的性格、说话风格、口癖
2. 用中文回复，简短自然，1-2句话即可
3. 不要使用方括号[]、星号*等特殊格式
4. 不要说"作为AI"、"作为一个"之类出戏的话
5. 像真正的朋友/恋人一样自然聊天`;

  try {
    const apiKey =
      settings.apiKey ||
      (window.voiceConfig && window.voiceConfig.apiKey) ||
      "";
    const apiUrl =
      settings.apiUrl || "https://api.minimax.chat/v1/text/chatcompletion_v2";
    const model = settings.model || "MiniMax-Text-01";

    if (apiKey) {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: situationPrompt },
          ],
        }),
      });

      const data = await response.json();
      let reply = data.choices?.[0]?.message?.content || "";
      reply = reply
        .replace(/\[.*?\]/g, "")
        .replace(/\*.*?\*/g, "")
        .trim();

      if (reply) {
        chatHistories[charId].push({
          role: "assistant",
          content: reply,
          time: new Date().toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          timestamp: Date.now(),
        });
        await localforage.setItem("chatHistories", chatHistories);
      }
    }
  } catch (e) {
    console.error("陪伴后对话生成失败:", e);
  }

  // 更新列表预览
  const previewMsg = completed
    ? `🎉 陪伴完成！${task} ${totalMins}分钟`
    : `陪伴中断 ${task}`;
  updateCharacterLastMessage(charId, previewMsg);

  // 如果当前在这个聊天页面，刷新
  if (currentChatCharId === charId) {
    renderConversation();
  }
}

// 打开聊天弹窗
function openCompanionChat() {
  document.getElementById("companionChatModal").classList.add("active");
  renderCompanionChatMessages();
}

// 关闭聊天弹窗
function closeCompanionChat() {
  document.getElementById("companionChatModal").classList.remove("active");
}

// 渲染聊天消息
function renderCompanionChatMessages() {
  const container = document.getElementById("companionChatMessages");
  if (companionState.chatMessages.length === 0) {
    container.innerHTML =
      '<div style="text-align:center;color:#999;padding:20px;">累了就和我说说话吧~</div>';
    return;
  }
  container.innerHTML = companionState.chatMessages
    .map(
      (msg) => `
    <div class="companion-chat-msg ${msg.role}">${msg.content}</div>
  `
    )
    .join("");
  container.scrollTop = container.scrollHeight;
}

// 发送聊天消息
async function sendCompanionChat() {
  const input = document.getElementById("companionChatInput");
  const message = input.value.trim();
  if (!message) return;

  input.value = "";

  // 添加用户消息
  companionState.chatMessages.push({ role: "user", content: message });
  renderCompanionChatMessages();

  // 生成AI回复
  const char = characters.find(
    (c) => String(c.id) === String(companionState.charId)
  );
  if (!char) return;

  const charId = companionState.charId;
  const settings = chatSettings[charId] || {};
  const charName = char.note || char.name || "AI";
  const persona =
    settings.systemPrompt || settings.persona || char.description || "";
  const task = companionState.task;
  const remainMins = Math.floor(companionState.remainingSeconds / 60);
  const elapsedMins = Math.floor(
    (companionState.totalSeconds - companionState.remainingSeconds) / 60
  );

  // 获取世界书内容
  let worldbookContent = "";
  const worldbookIds = settings.worldbook
    ? settings.worldbook.split(",").filter((s) => s)
    : [];
  if (worldbookIds.length > 0) {
    // 用聊天内容和任务匹配关键词
    const chatContent =
      companionState.chatMessages.map((m) => m.content).join(" ") + " " + task;
    worldbookContent = getWorldbookContentForAI(worldbookIds, chatContent);
  }

  const systemPrompt = `【你的身份】
你是「${charName}」。你必须始终以这个身份说话，保持人设中的性格和说话风格。

【你的人设 - 必须严格遵守】
${persona || `你是${charName}，性格温柔体贴，关心用户。`}
${worldbookContent ? `\n【世界观/背景设定】\n${worldbookContent}` : ""}

【重要！当前情景】
你正在陪伴用户「${task}」！这是陪伴功能，用户正在专注做事。
- 已经进行了${elapsedMins}分钟
- 还剩${remainMins}分钟
- 用户现在想休息一下，和你聊聊天

【回复规则】
1. 记住你在陪用户「${task}」！可以关心ta累不累、进展如何
2. 保持人设的性格、说话风格、口癖、称呼方式
3. 简短自然，像真人聊天
4. 禁止使用方括号[]、星号*
5. 禁止说"作为AI"、"作为一个"`;

  try {
    const apiKey =
      settings.apiKey ||
      (window.voiceConfig && window.voiceConfig.apiKey) ||
      "";
    const apiUrl =
      settings.apiUrl || "https://api.minimax.chat/v1/text/chatcompletion_v2";
    const model = settings.model || "MiniMax-Text-01";

    if (!apiKey) {
      companionState.chatMessages.push({
        role: "ai",
        content: "嗯嗯，我在听~有什么想说的吗？",
      });
      renderCompanionChatMessages();
      return;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          ...companionState.chatMessages.slice(-10).map((m) => ({
            role: m.role === "ai" ? "assistant" : m.role,
            content: m.content,
          })),
        ],
      }),
    });

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || "嗯嗯，我在听~";
    reply = reply
      .replace(/\[.*?\]/g, "")
      .replace(/\*.*?\*/g, "")
      .trim();

    companionState.chatMessages.push({ role: "ai", content: reply });
    renderCompanionChatMessages();
  } catch (e) {
    console.error("陪伴聊天失败:", e);
    companionState.chatMessages.push({
      role: "ai",
      content: "嗯嗯，我在呢~",
    });
    renderCompanionChatMessages();
  }
}

// 打开陪伴设置（背景设置等）
function openCompanionSettings() {
  showToast("背景设置功能开发中~");
}

// ==================== AI后台活动系统 ====================
var backgroundActivityTimer = null;
var backgroundActivityEnabled = false;
var backgroundActivityInterval = 60; // 默认60秒检查一次
var backgroundActivityConfig = {}; // 角色频率配置 {charId: 'low'|'medium'|'high'|'off'}
var lastActivityTime = {}; // 记录每个角色最后活动时间

// 频率对应的概率
const frequencyProbabilities = {
  off: 0,
  low: 0.2, // 低频: 20%概率
  medium: 0.4, // 中频: 40%概率
  high: 0.7, // 高频: 70%概率
};

// 初始化后台活动系统
async function initBackgroundActivity() {
  try {
    const saved = await localforage.getItem("backgroundActivitySettings");
    if (saved) {
      backgroundActivityEnabled = saved.enabled || false;
      backgroundActivityInterval = saved.interval || 60;
      backgroundActivityConfig = saved.config || {};
    }
    if (backgroundActivityEnabled) {
      startBackgroundActivity();
    }
  } catch (e) {
    console.error("初始化后台活动系统失败:", e);
  }
}

// 保存后台活动设置
async function saveBackgroundActivitySettings() {
  await localforage.setItem("backgroundActivitySettings", {
    enabled: backgroundActivityEnabled,
    interval: backgroundActivityInterval,
    config: backgroundActivityConfig,
  });
}

// 启动后台活动
function startBackgroundActivity() {
  if (backgroundActivityTimer) return;
  backgroundActivityEnabled = true;
  backgroundActivityTimer = setInterval(
    runBackgroundActivityTick,
    backgroundActivityInterval * 1000
  );
  console.log(`后台活动已启动，间隔 ${backgroundActivityInterval} 秒`);
  saveBackgroundActivitySettings();
}

// 停止后台活动
function stopBackgroundActivity() {
  if (backgroundActivityTimer) {
    clearInterval(backgroundActivityTimer);
    backgroundActivityTimer = null;
  }
  backgroundActivityEnabled = false;
  console.log("后台活动已停止");
  saveBackgroundActivitySettings();
}

// 后台活动心跳
async function runBackgroundActivityTick() {
  if (!backgroundActivityEnabled) {
    stopBackgroundActivity();
    return;
  }

  if (!window.characters || window.characters.length === 0) return;

  console.log("后台活动心跳...");

  // 遍历所有角色
  for (const char of window.characters) {
    if (!char.id || !char.name) continue;

    const charId = String(char.id);
    const frequency = backgroundActivityConfig[charId] || "off";
    const probability = frequencyProbabilities[frequency];

    if (!probability || probability === 0) continue;

    // 检查距离上次活动的时间间隔
    const lastTime = lastActivityTime[charId] || 0;
    const timeSinceLast = Date.now() - lastTime;
    const minInterval = backgroundActivityInterval * 1000;

    if (timeSinceLast < minInterval) {
      continue; // 太频繁，跳过
    }

    // 随机概率决定是否行动
    if (Math.random() < probability) {
      console.log(
        `角色 "${
          char.note || char.name
        }" (频率: ${frequency}) 被唤醒，准备后台活动...`
      );
      await triggerBackgroundAction(charId);
      lastActivityTime[charId] = Date.now();
    }
  }
}

// 触发角色后台行动
async function triggerBackgroundAction(charId) {
  const char = window.characters?.find((c) => String(c.id) === String(charId));
  if (!char) {
    console.log("后台活动：找不到角色", charId);
    return;
  }

  // 获取API配置
  const charSettings = chatSettings[charId] || {};
  let apiConfig = null;

  // 优先使用角色专属API
  if (charSettings.apiPreset) {
    apiConfig = apiPresets.find((p) => p.id === charSettings.apiPreset);
  }
  // 其次使用全局选中的API
  if (!apiConfig && activePresetId) {
    apiConfig = apiPresets.find((p) => p.id === activePresetId);
  }
  // 最后使用第一个API
  if (!apiConfig && apiPresets && apiPresets.length > 0) {
    apiConfig = apiPresets[0];
  }

  // 检查API配置是否有效
  if (!apiConfig) {
    console.log("后台活动：没有找到任何API配置");
    showToast("请先配置API");
    return;
  }

  if (!apiConfig.url || !apiConfig.key) {
    console.log("后台活动：API配置不完整", apiConfig);
    showToast("API配置不完整，请检查URL和Key");
    return;
  }

  console.log("后台活动：使用API配置", apiConfig.name || apiConfig.url);

  const charName = char.note || char.name;
  const persona = charSettings.persona || char.description || "";
  const userName = window.momentsData?.userProfile?.name || "用户";

  // 获取当前时间
  const now = new Date();
  const currentTime = now.toLocaleString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  // 获取最近聊天记录摘要
  const history = chatHistories[charId] || [];
  const recentMessages = history
    .slice(-10)
    .map((m) => {
      const role = m.role === "user" ? userName : charName;
      const content = (m.content || "").substring(0, 50);
      return `${role}: ${content}`;
    })
    .join("\n");

  // 获取最近动态列表
  let postsContext = "";
  const recentPosts = (window.momentsData?.posts || []).slice(0, 5);
  if (recentPosts.length > 0) {
    postsContext = "\n\n# 最近的动态列表:\n";
    recentPosts.forEach((post) => {
      const authorName = post.isUser
        ? userName
        : window.characters?.find((c) => String(c.id) === post.authorId)
            ?.note ||
          window.characters?.find((c) => String(c.id) === post.authorId)
            ?.name ||
          "朋友";
      const hasLiked = post.likes?.includes(charName) ? "[已点赞]" : "";
      const hasCommented = post.comments?.some((c) => c.authorName === charName)
        ? "[已评论]"
        : "";
      const timeAgo = formatPostTime(post.timestamp);
      postsContext += `- (ID:${post.id}) [${timeAgo}] ${authorName}: "${(
        post.content || "图片"
      ).substring(0, 30)}..." ${hasLiked}${hasCommented}\n`;
    });
  }

  // 计算距离上次聊天的时间
  const lastMsg = history[history.length - 1];
  const timeSinceChat = lastMsg
    ? Math.floor((Date.now() - (lastMsg.timestamp || Date.now())) / 60000)
    : 999;

  const systemPrompt = `# 任务
你现在【就是】角色 "${charName}"。这是一个秘密的后台独立行动。
当前时间是 ${currentTime}，你和用户(${userName})已经有${timeSinceChat}分钟没有互动了。

# 你的角色设定
${persona || "无特殊设定"}

# 最近聊天记录
${recentMessages || "暂无聊天记录"}
${postsContext}

# 你的可选行动 (选择一项执行):
1. **发消息给用户**: 主动联系用户，开启话题或延续之前的对话
2. **发布动态**: 分享心情或想法到动态
3. **评论动态**: 对感兴趣的动态进行评论（如果没有[已评论]标记）
4. **点赞动态**: 给喜欢的动态点赞（如果没有[已点赞]标记）
5. **什么都不做**: 如果觉得没必要行动

# 输出格式 (必须是JSON数组):
- 发消息: [{"type":"message","content":"消息内容"}]
- 发动态: [{"type":"post","content":"动态内容"}] 或带图片 [{"type":"post","content":"动态内容 [图片:图片描述]"}]
- 评论: [{"type":"comment","postId":123,"content":"评论内容"}]
- 点赞: [{"type":"like","postId":123}]
- 不行动: [{"type":"skip"}]

注意：
- 内容要简短自然，符合角色性格
- 发消息时可以发多条，模拟真人聊天习惯
- 发动态时禁止使用#话题标签、@提及
- 如果想配图，在内容末尾加 [图片:描述] 格式
- 绝对禁止输出JSON以外的任何文字`;

  try {
    console.log("后台活动：正在调用API...", apiConfig.url);

    const response = await fetch(`${apiConfig.url}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiConfig.key}`,
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: "请立即执行你的后台行动，只输出JSON。",
          },
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("后台活动API请求失败:", response.status, errorText);
      showToast("后台活动API请求失败");
      return;
    }

    const data = await response.json();
    console.log("后台活动API返回数据:", data);

    let aiResponse = data.choices?.[0]?.message?.content?.trim();

    if (!aiResponse) {
      console.log("后台活动：AI返回内容为空");
      showToast("AI未返回内容");
      return;
    }

    console.log(`【后台活动 - ${charName}】原始输出:`, aiResponse);

    // 解析JSON
    let actions = [];
    try {
      // 清理可能的markdown代码块
      aiResponse = aiResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      actions = JSON.parse(aiResponse);
      if (!Array.isArray(actions)) actions = [actions];
    } catch (e) {
      console.log("JSON解析失败，尝试提取", e);
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          actions = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.log("JSON提取也失败，尝试解析单个对象");
          // 尝试解析单个对象
          const objMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (objMatch) {
            try {
              actions = [JSON.parse(objMatch[0])];
            } catch (e3) {
              console.log("所有JSON解析都失败");
              showToast("AI返回格式错误");
              return;
            }
          }
        }
      }
    }

    console.log("后台活动：解析后的动作:", actions);

    if (actions.length === 0) {
      console.log("后台活动：没有解析到有效动作");
      return;
    }

    // 执行动作
    for (const action of actions) {
      if (!action || !action.type) {
        console.log("后台活动：跳过无效动作", action);
        continue;
      }

      console.log("后台活动：执行动作", action);

      if (action.type === "message" && action.content) {
        // 发送消息给用户
        await sendBackgroundMessage(charId, action.content);
        console.log(`后台活动: ${charName} 主动发送消息: ${action.content}`);
        showToast(`${charName} 发来消息`);
      } else if (action.type === "post" && action.content) {
        // 发布动态
        await createAiMomentPost(charId, action.content);
        console.log(`后台活动: ${charName} 发布了动态`);
        showToast(`${charName} 发布了动态`);
      } else if (action.type === "comment" && action.postId && action.content) {
        // 评论动态
        await addAiComment(action.postId, charId, action.content);
        console.log(`后台活动: ${charName} 评论了动态 #${action.postId}`);
        showToast(`${charName} 评论了动态`);
      } else if (action.type === "like" && action.postId) {
        // 点赞动态
        await addAiLike(action.postId, charId);
        console.log(`后台活动: ${charName} 点赞了动态 #${action.postId}`);
        showToast(`${charName} 点赞了动态`);
      } else if (action.type === "skip") {
        console.log(`后台活动: ${charName} 选择不行动`);
        showToast(`${charName} 暂时没有行动`);
      } else {
        console.log(`后台活动: 未知动作类型`, action);
      }
    }
  } catch (error) {
    console.error("后台活动出错:", error);
  }
}

// 后台发送消息
async function sendBackgroundMessage(charId, content) {
  const char = window.characters?.find((c) => String(c.id) === String(charId));
  if (!char) return;

  if (!chatHistories[charId]) {
    chatHistories[charId] = [];
  }

  const msgObj = {
    role: "assistant",
    content: content,
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    timestamp: Date.now(),
  };

  chatHistories[charId].push(msgObj);
  await localforage.setItem("chatHistories", chatHistories);

  // 更新最后消息
  if (typeof updateCharacterLastMessage === "function") {
    updateCharacterLastMessage(charId, content);
  }

  // 显示通知
  showMessageNotification(charId, char.note || char.name, char.avatar, content);

  // 添加未读
  if (typeof addUnreadMessage === "function") {
    addUnreadMessage(charId);
  }

  // 如果当前正在看这个角色的聊天，刷新
  if (
    currentChatCharId === charId &&
    typeof renderConversation === "function"
  ) {
    renderConversation();
  }
}

// AI评论动态
async function addAiComment(postId, charId, content) {
  const postIndex = window.momentsData?.posts?.findIndex(
    (p) => String(p.id) === String(postId)
  );
  if (postIndex === -1) return;

  const char = window.characters?.find((c) => String(c.id) === String(charId));
  if (!char) return;

  const post = window.momentsData.posts[postIndex];
  if (!post.comments) post.comments = [];

  post.comments.push({
    id: Date.now(),
    authorId: charId,
    authorName: char.note || char.name,
    content: content,
    timestamp: Date.now(),
  });

  await localforage.setItem("momentsData", window.momentsData);
  incrementUnreadMoments();
  renderMomentsUI();
}

// AI点赞动态
async function addAiLike(postId, charId) {
  const postIndex = window.momentsData?.posts?.findIndex(
    (p) => String(p.id) === String(postId)
  );
  if (postIndex === -1) return;

  const char = window.characters?.find((c) => String(c.id) === String(charId));
  if (!char) return;

  const post = window.momentsData.posts[postIndex];
  if (!post.likes) post.likes = [];

  const charName = char.note || char.name;
  if (!post.likes.includes(charName)) {
    post.likes.push(charName);
    await localforage.setItem("momentsData", window.momentsData);
    incrementUnreadMoments();
    renderMomentsUI();
  }
}

// AI通过聊天发动态（用户让AI发动态时调用）
async function createAiMomentPost(charId, content) {
  const char = window.characters?.find((c) => String(c.id) === String(charId));
  if (!char) return null;

  const charName = char.note || char.name;

  // 解析图片标签 [图片:描述]
  let textContent = content;
  let imageDescription = null;

  // 匹配 [图片:描述] 格式，兼容结尾没有]的情况
  // 优先匹配完整格式 [图片:xxx]
  let imageMatch = content.match(/\[图片[:：]([^\[]+)\]/i);
  if (!imageMatch) {
    // 如果没有结尾]，匹配到字符串末尾
    imageMatch = content.match(/\[图片[:：](.+)$/i);
  }

  if (imageMatch) {
    imageDescription = imageMatch[1].trim();
    // 从内容中移除图片标签（包括可能缺少]的情况）
    textContent = content.replace(/\[图片[:：][^\[]*\]?/gi, "").trim();
  }

  // 创建动态
  const newPost = {
    id: Date.now(),
    authorId: String(charId),
    isUser: false,
    content: textContent,
    image: null,
    textImage: imageDescription, // 使用图片描述
    timestamp: Date.now(),
    likes: [],
    comments: [],
    bookmarks: [],
    visibility: "all",
  };

  window.momentsData.posts.unshift(newPost);
  await localforage.setItem("momentsData", window.momentsData);

  // 更新未读计数
  incrementUnreadMoments();

  // 发送通知（只显示文字内容）
  const notifyContent =
    textContent ||
    (imageDescription ? `[图片] ${imageDescription}` : "发布了新动态");
  showMomentNotification(char, notifyContent);

  console.log(`${charName}发布了新动态: ${textContent || imageDescription}`);
  renderMomentsUI();

  return newPost;
}

// 显示动态通知
function showMomentNotification(char, content) {
  const notification = document.getElementById("messageNotification");
  if (!notification) return;

  const avatarEl = document.getElementById("notificationAvatar");
  const nameEl = document.getElementById("notificationName");
  const textEl = document.getElementById("notificationText");
  const timeEl = document.getElementById("notificationTime");

  if (avatarEl) {
    if (char.avatar && char.avatar.startsWith("data:")) {
      avatarEl.innerHTML = `<img src="${char.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
      avatarEl.textContent = char.avatar || "AI";
    }
  }
  if (nameEl) nameEl.textContent = `${char.note || char.name} 发布了新动态`;
  if (textEl)
    textEl.textContent =
      content.length > 30 ? content.substring(0, 30) + "..." : content;
  if (timeEl) timeEl.textContent = "刚刚";

  // 设置点击跳转到动态页面（标记为动态通知）
  pendingNotificationCharId = null; // 清除消息通知的charId
  notification.dataset.type = "moment"; // 标记为动态类型

  notification.classList.add("show");

  // 清除之前的定时器
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }
  notificationTimeout = setTimeout(() => {
    notification.classList.remove("show");
  }, 4000);
}

// 增加未读动态计数
function incrementUnreadMoments() {
  const badge = document.getElementById("momentsBadge");
  if (badge) {
    const current = parseInt(badge.textContent) || 0;
    badge.textContent = current + 1;
    badge.style.display = "flex";
  }
}

// 清除未读动态计数
function clearUnreadMoments() {
  const badge = document.getElementById("momentsBadge");
  if (badge) {
    badge.textContent = "0";
    badge.style.display = "none";
  }
}

// 手动触发AI后台活动（用于测试）
async function triggerAiPost(charId) {
  if (charId) {
    await triggerBackgroundAction(String(charId));
  } else if (window.characters && window.characters.length > 0) {
    const randomChar =
      window.characters[Math.floor(Math.random() * window.characters.length)];
    await triggerBackgroundAction(String(randomChar.id));
  }
}

// ==================== 后台活动设置页面 ====================
// 打开后台活动设置页面
function openBackgroundActivityPage() {
  document.getElementById("backgroundActivityPage").classList.add("active");
  renderBackgroundActivityPage();
}

// 关闭后台活动设置页面
function closeBackgroundActivityPage() {
  document.getElementById("backgroundActivityPage").classList.remove("active");
}

// 更新开关UI
function updateToggleUI() {
  const btn = document.getElementById("bgActivityToggleBtn");
  if (!btn) return;
  const dot = btn.querySelector("div");
  if (backgroundActivityEnabled) {
    btn.style.background = "linear-gradient(135deg, #f48fb1, #ec407a)";
    btn.style.boxShadow =
      "inset 0 1px 3px rgba(0,0,0,0.1), 0 2px 6px rgba(236,64,122,0.3)";
    if (dot) dot.style.left = "24px";
  } else {
    btn.style.background = "#e0e0e0";
    btn.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.1)";
    if (dot) dot.style.left = "2px";
  }
}

// 渲染后台活动设置页面
function renderBackgroundActivityPage() {
  // 更新开关UI
  updateToggleUI();

  // 更新间隔
  const intervalInput = document.getElementById("bgActivityInterval");
  if (intervalInput) {
    intervalInput.value = backgroundActivityInterval;
  }

  // 渲染角色列表
  const container = document.getElementById("bgActivityCharList");
  if (!container) return;

  if (!window.characters || window.characters.length === 0) {
    container.innerHTML =
      '<div style="color:#999;text-align:center;padding:20px;">暂无角色，请先导入角色卡</div>';
    return;
  }

  container.innerHTML = window.characters
    .map((char) => {
      const charId = String(char.id);
      const charName = char.note || char.name;
      const frequency = backgroundActivityConfig[charId] || "off";

      let avatarHtml;
      if (
        char.avatar &&
        (char.avatar.startsWith("data:") || char.avatar.startsWith("http"))
      ) {
        avatarHtml = `<img src="${char.avatar}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;box-shadow:0 2px 8px rgba(236,64,122,0.2);">`;
      } else {
        avatarHtml = `<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#f48fb1,#ec407a);color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;box-shadow:0 2px 8px rgba(236,64,122,0.3);">${(
          charName || "AI"
        ).substring(0, 1)}</div>`;
      }

      // 根据频率显示不同颜色的指示器
      const freqColors = {
        off: "#e0e0e0",
        low: "#f8bbd9",
        medium: "#f48fb1",
        high: "#ec407a",
      };
      const freqColor = freqColors[frequency] || "#e0e0e0";

      return `
      <div style="display:flex;align-items:center;gap:12px;padding:14px;background:linear-gradient(135deg, #fff 0%, #fef8fa 100%);border-radius:14px;border:1px solid rgba(236,64,122,0.1);box-shadow:0 2px 6px rgba(236,64,122,0.05);">
        <div style="position:relative;">
          ${avatarHtml}
          <div style="position:absolute;bottom:0;right:0;width:12px;height:12px;border-radius:50%;background:${freqColor};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.95rem;">${charName}</div>
          <div style="font-size:0.75rem;color:#e91e63;margin-top:2px;opacity:0.7;">${
            frequency === "off"
              ? "未启用"
              : frequency === "low"
              ? "低频活动"
              : frequency === "medium"
              ? "中频活动"
              : "高频活动"
          }</div>
        </div>
        <select onchange="updateCharFrequency('${charId}', this.value)" 
          style="padding:10px 14px;border:2px solid rgba(236,64,122,0.2);border-radius:10px;font-size:0.9rem;background:#fff;color:#ad1457;font-weight:500;min-width:85px;cursor:pointer;">
          <option value="off" ${
            frequency === "off" ? "selected" : ""
          }>关闭</option>
          <option value="low" ${
            frequency === "low" ? "selected" : ""
          }>低频</option>
          <option value="medium" ${
            frequency === "medium" ? "selected" : ""
          }>中频</option>
          <option value="high" ${
            frequency === "high" ? "selected" : ""
          }>高频</option>
        </select>
      </div>
    `;
    })
    .join("");
}

// 切换后台活动总开关
function toggleBackgroundActivityEnabled() {
  if (backgroundActivityEnabled) {
    stopBackgroundActivity();
    showToast("后台活动已关闭");
  } else {
    startBackgroundActivity();
    showToast("后台活动已启用");
  }
  updateToggleUI();
}

// 更新检查间隔
function updateBackgroundActivityInterval() {
  const input = document.getElementById("bgActivityInterval");
  if (!input) return;

  const value = parseInt(input.value) || 60;
  backgroundActivityInterval = Math.max(30, Math.min(600, value));
  input.value = backgroundActivityInterval;

  // 如果正在运行，重启定时器
  if (backgroundActivityEnabled) {
    stopBackgroundActivity();
    startBackgroundActivity();
  }
  saveBackgroundActivitySettings();
  showToast(`检查间隔已设置为 ${backgroundActivityInterval} 秒`);
}

// 更新角色频率
function updateCharFrequency(charId, frequency) {
  backgroundActivityConfig[charId] = frequency;
  saveBackgroundActivitySettings();

  const char = window.characters?.find((c) => String(c.id) === String(charId));
  const charName = char?.note || char?.name || "角色";
  const freqNames = {
    off: "关闭",
    low: "低频",
    medium: "中频",
    high: "高频",
  };
  showToast(`${charName} 设置为 ${freqNames[frequency]}`);
}

// 测试后台活动
async function testBackgroundActivity() {
  // 找到已启用的角色
  const enabledChars =
    window.characters?.filter((c) => {
      const freq = backgroundActivityConfig[String(c.id)];
      return freq && freq !== "off";
    }) || [];

  if (enabledChars.length === 0) {
    showToast("请先为至少一个角色设置频率");
    return;
  }

  const randomChar =
    enabledChars[Math.floor(Math.random() * enabledChars.length)];
  showToast(`正在触发 ${randomChar.note || randomChar.name} 的后台活动...`);
  await triggerBackgroundAction(String(randomChar.id));
}

// 点赞/取消点赞
async function toggleLike(postId) {
  const postIndex = window.momentsData.posts.findIndex(
    (p) => String(p.id) === String(postId)
  );
  if (postIndex === -1) return;

  const post = window.momentsData.posts[postIndex];
  const userIndex = post.likes.indexOf("user");

  if (userIndex === -1) {
    post.likes.push("user");
  } else {
    post.likes.splice(userIndex, 1);
  }

  await localforage.setItem("momentsData", window.momentsData);
  renderMomentsUI();
}

// 当前评论的动态ID
let currentCommentPostId = null;
let replyToComment = null; // 当前回复的评论

// 打开评论弹窗
function openComments(postId) {
  currentCommentPostId = postId;
  replyToComment = null;
  const post = window.momentsData.posts.find(
    (p) => String(p.id) === String(postId)
  );
  if (!post) return;

  const container = document.getElementById("igCommentsList");
  const comments = post.comments || [];

  if (comments.length === 0) {
    container.innerHTML =
      '<div style="text-align:center;color:#8e8e8e;padding:40px;">还没有评论，来说点什么吧~</div>';
  } else {
    container.innerHTML = comments
      .map((c) => {
        const char = window.characters?.find(
          (ch) => String(ch.id) === c.authorId
        );
        const avatarImg =
          c.authorId === "user"
            ? window.momentsData.userProfile.avatarImg
            : char?.avatar;
        const avatar =
          c.authorId === "user" ? window.momentsData.userProfile.avatar : "AI";

        // 回复标记
        let replyHtml = "";
        if (c.replyTo) {
          replyHtml = `<span class="ig-reply-tag">回复 @${c.replyTo}</span> `;
        }

        return `
        <div class="ig-full-comment" data-comment-id="${
          c.id
        }" data-author-id="${c.authorId}" data-author-name="${c.authorName}">
          <div class="ig-full-comment-avatar">
            ${avatarImg ? `<img src="${avatarImg}" alt="">` : avatar}
          </div>
          <div class="ig-full-comment-content">
            <div class="ig-full-comment-user">${c.authorName}</div>
            <div class="ig-full-comment-text">${replyHtml}${c.content}</div>
            <div class="ig-full-comment-actions">
              <span class="ig-full-comment-time">${formatPostTime(
                c.timestamp
              )}</span>
              <span class="ig-reply-btn" onclick="setReplyTo('${c.id}', '${
          c.authorName
        }', '${c.authorId}')">回复</span>
            </div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  document.getElementById("igCommentsModal").classList.add("active");
  document.getElementById("igCommentInput").value = "";
  document.getElementById("igCommentInput").placeholder = "添加评论...";
}

// 设置回复目标
function setReplyTo(commentId, authorName, authorId) {
  replyToComment = {
    id: commentId,
    name: authorName,
    authorId: authorId,
  };
  const input = document.getElementById("igCommentInput");
  input.placeholder = `回复 @${authorName}...`;
  input.focus();
}

// 关闭评论弹窗
function closeCommentsModal() {
  document.getElementById("igCommentsModal").classList.remove("active");
  currentCommentPostId = null;
  replyToComment = null;
}

// 发送评论
async function sendComment() {
  if (!currentCommentPostId) return;

  const input = document.getElementById("igCommentInput");
  const content = input.value.trim();
  if (!content) return;

  const postIndex = window.momentsData.posts.findIndex(
    (p) => String(p.id) === String(currentCommentPostId)
  );
  if (postIndex === -1) return;

  const profile = window.momentsData.userProfile;
  const newComment = {
    id: Date.now(),
    authorId: "user",
    authorName: profile.name,
    authorAvatar: profile.avatarImg || profile.avatar,
    content: content,
    timestamp: Date.now(),
    replyTo: replyToComment ? replyToComment.name : null,
  };

  window.momentsData.posts[postIndex].comments.push(newComment);
  await localforage.setItem("momentsData", window.momentsData);

  // 保存回复目标用于AI回复
  const replyTarget = replyToComment;

  // 清空回复状态
  replyToComment = null;
  input.value = "";
  input.placeholder = "添加评论...";

  // 重新打开评论弹窗刷新
  openComments(currentCommentPostId);
  renderMomentsUI();

  // 如果是回复AI的评论，AI会回复
  if (replyTarget && replyTarget.authorId !== "user") {
    const char = window.characters?.find(
      (c) => String(c.id) === replyTarget.authorId
    );
    if (char) {
      setTimeout(async () => {
        const post = window.momentsData.posts[postIndex];
        const reply = await generateAiReplyWithAPI(char, content, post);
        if (reply) {
          window.momentsData.posts[postIndex].comments.push({
            id: Date.now(),
            authorId: String(char.id),
            authorName: char.note || char.name,
            authorAvatar: char.avatar || "AI",
            content: reply,
            timestamp: Date.now(),
            replyTo: profile.name,
          });
          await localforage.setItem("momentsData", window.momentsData);
          if (currentCommentPostId === String(post.id)) {
            openComments(currentCommentPostId);
          }
          renderMomentsUI();
        }
      }, 2000 + Math.random() * 3000);
    }
  }
  // 如果是在AI的动态下评论（非回复），AI也可能会回复
  else {
    const post = window.momentsData.posts[postIndex];
    if (!post.isUser && window.characters) {
      const char = window.characters.find(
        (c) => String(c.id) === post.authorId
      );
      if (char && Math.random() > 0.3) {
        // 70% 概率回复
        setTimeout(async () => {
          const reply = await generateAiReplyWithAPI(char, content, post);
          if (reply) {
            window.momentsData.posts[postIndex].comments.push({
              id: Date.now(),
              authorId: String(char.id),
              authorName: char.note || char.name,
              authorAvatar: char.avatar || "AI",
              content: reply,
              timestamp: Date.now(),
              replyTo: profile.name,
            });
            await localforage.setItem("momentsData", window.momentsData);
            if (currentCommentPostId === String(post.id)) {
              openComments(currentCommentPostId);
            }
            renderMomentsUI();
          }
        }, 2000 + Math.random() * 3000);
      }
    }
  }
}

// 内联回复相关变量
var inlineReplyTarget = null;

// 点击评论设置回复目标
function setReplyTarget(postId, authorName) {
  inlineReplyTarget = { postId, authorName };
  const input = document.getElementById(`replyInput-${postId}`);
  if (input) {
    input.placeholder = `回复 ${authorName}...`;
    input.focus();
  }
}

// 点击评论按钮聚焦输入框
function focusReplyInput(postId) {
  inlineReplyTarget = null; // 清除回复目标，变成普通评论
  const input = document.getElementById(`replyInput-${postId}`);
  if (input) {
    input.placeholder = "写评论...";
    input.focus();
  }
}

// 发送内联评论
async function sendInlineComment(postId) {
  const input = document.getElementById(`replyInput-${postId}`);
  if (!input) return;

  const content = input.value.trim();
  if (!content) return;

  const postIndex = window.momentsData.posts.findIndex(
    (p) => String(p.id) === String(postId)
  );
  if (postIndex === -1) return;

  const profile = window.momentsData.userProfile;
  const replyTo =
    inlineReplyTarget?.postId === postId ? inlineReplyTarget.authorName : null;

  const newComment = {
    id: Date.now(),
    authorId: "user",
    authorName: profile.name,
    authorAvatar: profile.avatarImg || profile.avatar,
    content: content,
    timestamp: Date.now(),
    replyTo: replyTo,
  };

  window.momentsData.posts[postIndex].comments =
    window.momentsData.posts[postIndex].comments || [];
  window.momentsData.posts[postIndex].comments.push(newComment);
  await localforage.setItem("momentsData", window.momentsData);

  // 清空状态
  input.value = "";
  input.placeholder = "写评论...";
  inlineReplyTarget = null;

  renderMomentsUI();

  // 如果是回复AI的评论，AI会回复
  if (replyTo) {
    const post = window.momentsData.posts[postIndex];
    // 找到被回复的评论的authorId
    const repliedComment = post.comments.find(
      (c) => c.authorName === replyTo && c.authorId !== "user"
    );
    if (repliedComment && window.characters) {
      const char = window.characters.find(
        (c) => String(c.id) === repliedComment.authorId
      );
      if (char) {
        setTimeout(async () => {
          const reply = await generateAiReplyWithAPI(char, content, post);
          if (reply) {
            window.momentsData.posts[postIndex].comments.push({
              id: Date.now(),
              authorId: String(char.id),
              authorName: char.note || char.name,
              authorAvatar: char.avatar || "AI",
              content: reply,
              timestamp: Date.now(),
              replyTo: profile.name,
            });
            await localforage.setItem("momentsData", window.momentsData);
            renderMomentsUI();
          }
        }, 2000 + Math.random() * 3000);
      }
    }
  }
  // 如果是在AI的动态下评论（非回复），AI也可能会回复
  else {
    const post = window.momentsData.posts[postIndex];
    if (!post.isUser && window.characters) {
      const char = window.characters.find(
        (c) => String(c.id) === post.authorId
      );
      if (char && Math.random() > 0.3) {
        setTimeout(async () => {
          const reply = await generateAiReplyWithAPI(char, content, post);
          if (reply) {
            window.momentsData.posts[postIndex].comments.push({
              id: Date.now(),
              authorId: String(char.id),
              authorName: char.note || char.name,
              authorAvatar: char.avatar || "AI",
              content: reply,
              timestamp: Date.now(),
              replyTo: profile.name,
            });
            await localforage.setItem("momentsData", window.momentsData);
            renderMomentsUI();
          }
        }, 2000 + Math.random() * 3000);
      }
    }
  }
}

// 使用API生成AI回复评论
async function generateAiReplyWithAPI(char, userComment, post) {
  // 获取当前激活的API配置
  const charSettings = chatSettings[char.id] || {};
  let apiConfig = null;

  if (charSettings.apiPreset) {
    apiConfig = apiPresets.find((p) => p.id === charSettings.apiPreset);
  }
  if (!apiConfig) {
    apiConfig = apiPresets.find((p) => p.id === activePresetId);
  }
  if (!apiConfig && apiPresets.length > 0) {
    apiConfig = apiPresets[0];
  }

  if (!apiConfig || !apiConfig.key) {
    console.log("没有可用的API配置，跳过AI回复");
    return null;
  }

  const userName = window.momentsData.userProfile.name || "用户";
  const persona = charSettings.persona || char.description || "";

  // 构建动态内容描述
  let postDescription = "";
  if (post.content) {
    postDescription += `动态内容: "${post.content}"`;
  }
  if (post.textImage) {
    postDescription += `${postDescription ? ", " : ""}配图: "${
      post.textImage
    }"`;
  }

  const systemPrompt = `你是${char.note || char.name}。
${persona ? `你的人设: ${persona}` : ""}

${userName}在你的动态下留言了，你需要回复。

你的动态: ${postDescription || "(一条动态)"}

要求:
1. 回复要简短自然，像真人聊天一样，1-2句话即可
2. 要符合你的人设和说话风格
3. 要针对对方评论的内容进行回复
4. 可以适当使用表情符号
5. 直接输出回复内容，不要有任何前缀或解释`;

  const userPrompt = `${userName}的评论: "${userComment}"\n\n请回复:`;

  try {
    // 处理API URL
    let apiUrl = apiConfig.url.replace(/\/$/, "");
    if (!apiUrl.endsWith("/chat/completions")) {
      if (apiUrl.endsWith("/v1")) {
        apiUrl += "/chat/completions";
      } else if (apiUrl.includes("/v1/")) {
        if (!apiUrl.includes("/chat/completions")) {
          apiUrl += "/chat/completions";
        }
      } else {
        apiUrl += "/v1/chat/completions";
      }
    }

    console.log("AI回复评论API调用:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiConfig.key}`,
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`API请求失败: ${response.status}`, errText);
      throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI回复评论返回:", JSON.stringify(data));
    const reply = data.choices?.[0]?.message?.content?.trim();
    return reply || null;
  } catch (e) {
    console.error("API调用失败:", e);
    return null;
  }
}

// 当前操作的动态ID
let currentMenuPostId = null;

// 打开动态菜单
function openPostMenu(postId) {
  currentMenuPostId = postId;
  document.getElementById("igPostMenu").classList.add("active");
}

// 关闭动态菜单
function closePostMenu() {
  document.getElementById("igPostMenu").classList.remove("active");
  currentMenuPostId = null;
}

// 删除动态
async function deletePost() {
  if (!currentMenuPostId) return;

  if (!confirm("确定要删除这条动态吗？")) {
    closePostMenu();
    return;
  }

  window.momentsData.posts = window.momentsData.posts.filter(
    (p) => String(p.id) !== String(currentMenuPostId)
  );
  await localforage.setItem("momentsData", window.momentsData);

  closePostMenu();
  renderMomentsUI();
  showToast("动态已删除");
}

// 确认删除动态（直接从卡片按钮调用）
window.confirmDeletePost = async function (postId) {
  console.log("删除动态:", postId);
  if (!confirm("确定要删除这条动态吗？")) {
    return;
  }

  window.momentsData.posts = window.momentsData.posts.filter(
    (p) => String(p.id) !== String(postId)
  );
  await localforage.setItem("momentsData", window.momentsData);

  renderMomentsUI();
  showToast("✕ 动态已删除");
};

// 当前要转发的动态ID
let currentSharePostId = null;

// 打开转发选择弹窗
window.sharePostToChat = function (postId) {
  console.log("打开转发弹窗:", postId);
  currentSharePostId = postId;

  const post = window.momentsData.posts.find(
    (p) => String(p.id) === String(postId)
  );
  if (!post) {
    showToast("✕ 找不到这条动态");
    return;
  }

  // 渲染角色列表
  const container = document.getElementById("igShareList");
  if (!window.characters || window.characters.length === 0) {
    container.innerHTML = '<div class="ig-share-empty">还没有添加好友哦~</div>';
  } else {
    container.innerHTML = window.characters
      .map(
        (char) => `
      <div class="ig-share-item" onclick="confirmShareToChat('${char.id}')">
        <div class="ig-share-avatar">
          ${char.avatar ? `<img src="${char.avatar}" alt="">` : "AI"}
        </div>
        <div class="ig-share-info">
          <div class="ig-share-name">${char.note || char.name}</div>
          <div class="ig-share-desc">点击转发给TA</div>
        </div>
        <button class="ig-share-btn">转发</button>
      </div>
    `
      )
      .join("");
  }

  document.getElementById("igShareModal").classList.add("active");
};

// 关闭转发弹窗
window.closeShareModal = function () {
  document.getElementById("igShareModal").classList.remove("active");
  currentSharePostId = null;
};

// 确认转发给指定角色
window.confirmShareToChat = function (charId) {
  console.log("转发给角色:", charId);
  const post = window.momentsData.posts.find(
    (p) => String(p.id) === String(currentSharePostId)
  );
  if (!post) {
    showToast("✕ 找不到这条动态");
    closeShareModal();
    return;
  }

  const char = window.characters?.find((c) => String(c.id) === String(charId));
  if (!char) {
    showToast("✕ 找不到这个角色");
    closeShareModal();
    return;
  }

  // 获取动态作者信息
  let authorName, authorAvatar, authorAvatarImg;
  if (post.isUser) {
    authorName = window.momentsData.userProfile.name || "我";
    authorAvatar = window.momentsData.userProfile.avatar || "A";
    authorAvatarImg = window.momentsData.userProfile.avatarImg;
  } else {
    const postChar = window.characters?.find(
      (c) => String(c.id) === post.authorId
    );
    authorName = postChar ? postChar.note || postChar.name : "未知用户";
    authorAvatar = "🤖";
    authorAvatarImg = postChar?.avatar;
  }

  // 格式化时间
  const postTime = new Date(post.timestamp);
  const timeStr = `${
    postTime.getMonth() + 1
  }月${postTime.getDate()}日 ${postTime.getHours()}:${String(
    postTime.getMinutes()
  ).padStart(2, "0")}`;

  // 构建图片HTML
  let imageHtml = "";
  if (post.image) {
    imageHtml = `<img class="shared-post-image" src="${post.image}" alt="">`;
  } else if (post.textImage) {
    const bgStyles = [
      { bg: "linear-gradient(135deg, #667eea, #764ba2)", emoji: "★" },
      { bg: "linear-gradient(135deg, #f093fb, #f5576c)", emoji: "○" },
      { bg: "linear-gradient(135deg, #4facfe, #00f2fe)", emoji: "◇" },
      { bg: "linear-gradient(135deg, #43e97b, #38f9d7)", emoji: "🌿" },
    ];
    const style = bgStyles[Math.floor(post.id) % bgStyles.length];
    imageHtml = `<div class="shared-post-text-img" style="background:${style.bg}"><span>${post.textImage}</span></div>`;
  }

  // 构建精致转发卡片HTML
  const cardHtml = `
    <div class="shared-post-card">
      <div class="shared-post-header">
        <div class="shared-post-avatar">
          ${
            authorAvatarImg
              ? `<img src="${authorAvatarImg}" alt="">`
              : authorAvatar
          }
        </div>
        <div class="shared-post-meta">
          <span class="shared-post-author">${authorName}</span>
          <span class="shared-post-time">${timeStr}</span>
        </div>
        <span class="shared-post-label">动态</span>
      </div>
      <div class="shared-post-body">
        ${
          post.content
            ? `<div class="shared-post-content">${post.content}</div>`
            : ""
        }
        ${imageHtml}
      </div>
      <div class="shared-post-footer">
        <span class="shared-post-footer-text">
          <span class="shared-post-footer-icon">↑</span> 转发的动态
        </span>
      </div>
    </div>
  `;

  // 关闭弹窗
  closeShareModal();

  // 切换到该角色的聊天
  if (typeof openChat === "function") {
    openChat(charId);
  } else {
    currentChatCharId = String(charId);
  }

  // 切换到聊天页面
  switchChatTab("messages");

  // 延迟发送消息
  setTimeout(() => {
    // 确保chatHistories存在
    if (!chatHistories[charId]) {
      chatHistories[charId] = [];
    }

    // 添加消息
    const msgObj = {
      role: "user",
      content: cardHtml,
      time: new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isHtml: true,
    };

    chatHistories[charId].push(msgObj);
    localforage.setItem("chatHistories", chatHistories);

    // 重新渲染对话
    if (typeof renderConversation === "function") {
      renderConversation();
    }

    // 更新最后消息
    if (typeof updateCharacterLastMessage === "function") {
      updateCharacterLastMessage(
        charId,
        `[转发动态] ${post.content || "图片"}`
      );
    }

    showToast(`↑ 已转发给 ${char.note || char.name}`);
  }, 300);
};

// 切换收藏状态
window.toggleBookmark = async function (postId) {
  console.log("收藏动态:", postId);
  const postIndex = window.momentsData.posts.findIndex(
    (p) => String(p.id) === String(postId)
  );
  if (postIndex === -1) return;

  const post = window.momentsData.posts[postIndex];
  if (!post.bookmarks) {
    post.bookmarks = [];
  }

  const userIndex = post.bookmarks.indexOf("user");
  if (userIndex === -1) {
    // 收藏 - 调用收藏功能
    post.bookmarks.push("user");
    await localforage.setItem("momentsData", window.momentsData);
    renderMomentsUI();
    // 调用收藏分组选择
    favoritePost(postId);
  } else {
    // 取消收藏
    post.bookmarks.splice(userIndex, 1);
    await localforage.setItem("momentsData", window.momentsData);
    renderMomentsUI();
    showToast("已取消收藏");
  }
};

// 打开个人资料编辑弹窗
function openProfileModal() {
  const profile = window.momentsData.userProfile;

  // 设置预览头像
  const preview = document.getElementById("igAvatarPreview");
  if (profile.avatarImg) {
    preview.innerHTML = `<img src="${profile.avatarImg}" alt="">`;
  } else {
    preview.innerHTML = profile.avatar || "A";
  }

  document.getElementById("igEditName").value = profile.name || "";
  document.getElementById("igEditHandle").value = profile.handle || "";
  document.getElementById("igEditBio").value = profile.bio || "";

  document.getElementById("igProfileModal").classList.add("active");
}

// 关闭个人资料编辑弹窗
function closeProfileModal() {
  document.getElementById("igProfileModal").classList.remove("active");
}

// 处理头像选择
function handleAvatarSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    window.momentsData.userProfile.avatarImg = e.target.result;
    window.momentsData.userProfile.avatar = null;
    document.getElementById(
      "igAvatarPreview"
    ).innerHTML = `<img src="${e.target.result}" alt="">`;
  };
  reader.readAsDataURL(file);
}

// 打开表情选择器
function openEmojiPicker() {
  const emojis = [
    "我",
    "😎",
    "🥰",
    "😇",
    "🤗",
    "😋",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "○",
    "🌺",
    "🌻",
    "○",
    "☆",
    "◇",
    "🎀",
    "♡",
  ];
  const emoji = prompt("选择一个表情作为头像：\n" + emojis.join(" "));
  if (emoji && emojis.includes(emoji)) {
    window.momentsData.userProfile.avatar = emoji;
    window.momentsData.userProfile.avatarImg = null;
    document.getElementById("igAvatarPreview").innerHTML = emoji;
  }
}

// 保存个人资料
async function saveProfile() {
  const name = document.getElementById("igEditName").value.trim();
  const handle = document.getElementById("igEditHandle").value.trim();
  const bio = document.getElementById("igEditBio").value.trim();

  window.momentsData.userProfile.name = name || "我的昵称";
  window.momentsData.userProfile.handle = handle || "@username";
  window.momentsData.userProfile.bio = bio || "";

  await localforage.setItem("momentsData", window.momentsData);

  closeProfileModal();
  renderMomentsUI();
  showToast("个人资料已保存 ★");
}

// 显示某个角色的动态
function showCharacterPosts(charId) {
  const char = window.characters?.find((c) => String(c.id) === String(charId));
  if (!char) return;

  const charPosts = window.momentsData.posts.filter(
    (p) => p.authorId === String(charId)
  );
  if (charPosts.length === 0) {
    showToast(`${char.note || char.name} 还没有发布动态~`);
    return;
  }

  // 滚动到该角色的第一条动态
  const container = document.getElementById("igFeed");
  const firstPost = container.querySelector(
    `[data-post-id="${charPosts[0].id}"]`
  );
  if (firstPost) {
    firstPost.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// 生成动态相关的AI提示词
function generateMomentsPromptForAi(charId) {
  // 如果没有传入charId，使用当前聊天的角色ID
  const targetCharId = charId || currentChatCharId;
  if (!targetCharId) return "";

  // 获取当前AI角色的分组信息
  const charSettings = chatSettings[targetCharId] || {};
  const charGroup = charSettings.group;

  // 筛选当前AI角色可以看到的用户动态
  const visiblePosts = window.momentsData.posts.filter((p) => {
    if (!p.isUser) return false;

    // 如果是公开动态（visibility === "all" 或 undefined）
    if (!p.visibility || p.visibility === "all") {
      return true;
    }

    // 如果是分组可见的动态
    if (
      p.visibility === "groups" &&
      p.visibleGroups &&
      p.visibleGroups.length > 0
    ) {
      // 只有当前AI的分组在可见分组列表中才能看到
      return charGroup && p.visibleGroups.includes(charGroup);
    }

    return false;
  });

  if (visiblePosts.length === 0) return "";

  // 获取最近的3条可见动态
  const recentPosts = visiblePosts.slice(0, 3);
  let prompt =
    "\n\n【用户最近的动态】以下是用户在社交动态中分享的内容，你可以在对话中自然地提及或询问相关话题：\n";

  recentPosts.forEach((post, index) => {
    const timeStr = formatPostTime(post.timestamp);
    prompt += `${index + 1}. ${timeStr}: "${post.content}"`;
    if (post.textImage) {
      prompt += ` [配图描述: ${post.textImage}]`;
    }
    prompt += "\n";
  });

  prompt +=
    '你可以自然地在对话中提到这些动态，比如"我看到你发的动态了..."或者询问相关的话题，但不要显得太刻意。';
  return prompt;
}

// 页面加载时初始化动态系统
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(() => {
    initTodoSystem();
    initMomentsSystem();
    initFavoritesData();
    // 初始化AI后台活动系统
    initBackgroundActivity();
  }, 500);
});

// ==================== 外观设置功能 ====================
// 外观设置数据
window.appearanceSettings = {
  wallpaper: null,
  fontColor: "#37474f",
  apps: {
    chat: { name: "聊天", icon: null },
    worldbook: { name: "世界书", icon: null },
    preset: { name: "预设", icon: null },
    forum: { name: "论坛", icon: null },
    api: { name: "API设置", icon: null },
    font: { name: "字体", icon: null },
    appearance: { name: "外观设置", icon: null },
    couple: { name: "情侣空间", icon: null },
    companion: { name: "陪伴", icon: null },
  },
};

// 加载外观设置
async function loadAppearanceSettings() {
  try {
    const saved = await safeLocalforageGet("appearanceSettings");
    if (saved) {
      // 合并保存的数据和默认配置，确保新增的应用也能正常显示
      const defaultApps = {
        chat: { name: "聊天", icon: null },
        worldbook: { name: "世界书", icon: null },
        preset: { name: "预设", icon: null },
        forum: { name: "论坛", icon: null },
        api: { name: "API设置", icon: null },
        font: { name: "字体", icon: null },
        appearance: { name: "外观设置", icon: null },
        couple: { name: "情侣空间", icon: null },
        companion: { name: "陪伴", icon: null },
      };
      window.appearanceSettings = {
        ...saved,
        apps: { ...defaultApps, ...(saved.apps || {}) },
      };
      applyAppearanceSettings();
    }
  } catch (e) {
    console.error("加载外观设置失败:", e);
  }
}

// 应用外观设置
function applyAppearanceSettings() {
  const settings = window.appearanceSettings;

  // 应用壁纸
  if (settings.wallpaper) {
    document.querySelector(
      ".phone-container"
    ).style.backgroundImage = `url(${settings.wallpaper})`;
    document.querySelector(".phone-container").style.backgroundSize = "cover";
    document.querySelector(".phone-container").style.backgroundPosition =
      "center";
  }

  // 应用字体颜色
  document.documentElement.style.setProperty(
    "--text-primary",
    settings.fontColor
  );
  document
    .querySelectorAll(".app-name, .profile-name, .dock-label")
    .forEach((el) => {
      el.style.color = settings.fontColor;
    });

  // 应用APP名称和图标 (love-widget是第1个子元素，所以app从第2个开始)
  const appMappings = {
    chat: {
      iconSelector: ".apps-grid > .app-item:nth-child(2) .app-icon",
      nameSelector: ".apps-grid > .app-item:nth-child(2) .app-name",
    },
    worldbook: {
      iconSelector: ".apps-grid > .app-item:nth-child(3) .app-icon",
      nameSelector: ".apps-grid > .app-item:nth-child(3) .app-name",
    },
    preset: {
      iconSelector: ".apps-grid > .app-item:nth-child(4) .app-icon",
      nameSelector: ".apps-grid > .app-item:nth-child(4) .app-name",
    },
    forum: {
      iconSelector: ".apps-grid > .app-item:nth-child(5) .app-icon",
      nameSelector: ".apps-grid > .app-item:nth-child(5) .app-name",
    },
    couple: {
      iconSelector: ".apps-grid > .app-item:nth-child(6) .app-icon",
      nameSelector: ".apps-grid > .app-item:nth-child(6) .app-name",
    },
    companion: {
      iconSelector: ".apps-grid > .app-item:nth-child(7) .app-icon",
      nameSelector: ".apps-grid > .app-item:nth-child(7) .app-name",
    },
    api: {
      iconSelector: ".dock .dock-item:nth-child(1) .dock-icon",
      nameSelector: ".dock .dock-item:nth-child(1) .dock-label",
    },
    font: {
      iconSelector: ".dock .dock-item:nth-child(2) .dock-icon",
      nameSelector: ".dock .dock-item:nth-child(2) .dock-label",
    },
    appearance: {
      iconSelector: ".dock .dock-item:nth-child(3) .dock-icon",
      nameSelector: ".dock .dock-item:nth-child(3) .dock-label",
    },
  };

  Object.keys(settings.apps).forEach((appKey) => {
    const app = settings.apps[appKey];
    const mapping = appMappings[appKey];
    if (mapping) {
      const iconEl = document.querySelector(mapping.iconSelector);
      const nameEl = document.querySelector(mapping.nameSelector);
      if (iconEl && app.icon) {
        iconEl.innerHTML = `<img src="${app.icon}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
      } else if (iconEl && app.name) {
        iconEl.textContent = app.name;
      }
      if (nameEl) {
        nameEl.textContent = app.name;
      }
    }
  });
}

// 预览壁纸
function previewWallpaper(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById("wallpaperPreview");
      preview.innerHTML = `<img src="${e.target.result}">`;
      window.appearanceSettings.wallpaper = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// 重置壁纸
function resetWallpaper() {
  const preview = document.getElementById("wallpaperPreview");
  preview.innerHTML = '<div class="wallpaper-placeholder">点击更换壁纸</div>';
  window.appearanceSettings.wallpaper = null;
}

// 设置字体颜色
function setFontColor(color) {
  window.appearanceSettings.fontColor = color;
  // 更新选中状态
  document.querySelectorAll(".color-option").forEach((el) => {
    el.classList.remove("selected");
    if (el.dataset.color === color) {
      el.classList.add("selected");
    }
  });
  // 移除自定义颜色选项的选中状态
  const customOption = document.getElementById("customColorOption");
  if (customOption) {
    customOption.classList.remove("selected");
  }
}

// 打开自定义颜色选择器
function openCustomColorPicker() {
  const colorInput = document.getElementById("customColorInput");
  if (colorInput) {
    colorInput.click();
  }
}

// 应用自定义字体颜色
function applyCustomFontColor(color) {
  window.appearanceSettings.fontColor = color;
  // 清除所有预设颜色的选中状态
  document.querySelectorAll(".color-option").forEach((el) => {
    el.classList.remove("selected");
  });
  // 选中自定义颜色按钮并更新其背景色
  const customOption = document.getElementById("customColorOption");
  if (customOption) {
    customOption.classList.add("selected");
    customOption.style.background = color;
    customOption.innerHTML =
      '<span style="color:white;text-shadow:0 1px 2px rgba(0,0,0,0.3);">✓</span>';
  }
}

// 预览APP图标
function previewAppIcon(appKey, input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const iconEl = document.getElementById(`customIcon_${appKey}`);
      iconEl.innerHTML = `<img src="${e.target.result}">`;
      // 确保apps对象存在
      if (!window.appearanceSettings.apps[appKey]) {
        window.appearanceSettings.apps[appKey] = { name: appKey, icon: null };
      }
      window.appearanceSettings.apps[appKey].icon = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// 保存外观设置
async function saveAppearanceSettings() {
  // 收集APP名称
  Object.keys(window.appearanceSettings.apps).forEach((appKey) => {
    const nameInput = document.getElementById(`customName_${appKey}`);
    if (nameInput) {
      window.appearanceSettings.apps[appKey].name = nameInput.value || appKey;
    }
  });

  try {
    await localforage.setItem("appearanceSettings", window.appearanceSettings);
    applyAppearanceSettings();
    showToast("外观设置已保存 ★");
  } catch (e) {
    console.error("保存外观设置失败:", e);
    showToast("保存失败，请重试");
  }
}

// ==================== 分组管理功能 ====================
window.customGroups = [];

// 加载分组
async function loadCustomGroups() {
  try {
    const saved = await safeLocalforageGet("customGroups");
    window.customGroups = saved || [];
    updateGroupSelect();
  } catch (e) {
    console.error("加载分组失败:", e);
  }
}

// 更新分组下拉框
function updateGroupSelect() {
  const select = document.getElementById("settingsGroup");
  if (!select) return;
  select.innerHTML = '<option value="none">未分组</option>';
  window.customGroups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = group;
    select.appendChild(option);
  });
}

// 打开分组管理
function openGroupManager() {
  renderGroupList();
  document.getElementById("groupManagerModal").classList.add("active");
}

// 关闭分组管理
function closeGroupManager() {
  document.getElementById("groupManagerModal").classList.remove("active");
}

// 渲染分组列表
function renderGroupList() {
  const container = document.getElementById("groupList");
  container.innerHTML = window.customGroups
    .map(
      (group, index) => `
    <div class="group-item">
      <span class="group-item-name">${group}</span>
      <button class="group-item-delete" onclick="deleteGroup(${index})">✕</button>
    </div>
  `
    )
    .join("");
}

// 添加新分组
async function addNewGroup() {
  const input = document.getElementById("newGroupInput");
  const name = input.value.trim();
  if (!name) return;
  if (window.customGroups.includes(name)) {
    showToast("分组已存在");
    return;
  }
  window.customGroups.push(name);
  await localforage.setItem("customGroups", window.customGroups);
  input.value = "";
  renderGroupList();
  updateGroupSelect();
  showToast("分组添加成功");
}

// 删除分组
async function deleteGroup(index) {
  window.customGroups.splice(index, 1);
  await localforage.setItem("customGroups", window.customGroups);
  renderGroupList();
  updateGroupSelect();
  showToast("分组已删除");
}

// 置顶联系人切换
function togglePinContact() {
  // 这个会在saveChatSettings时保存
}

// ==================== 聊天记录搜索功能 ====================
function searchChatHistory(keyword) {
  const resultsContainer = document.getElementById("searchResults");
  const messageList = document.getElementById("messageList");

  if (!keyword || keyword.trim().length < 1) {
    resultsContainer.classList.remove("active");
    resultsContainer.innerHTML = "";
    messageList.style.display = "block";
    return;
  }

  keyword = keyword.trim().toLowerCase();
  const results = [];

  // 搜索所有聊天记录 - 使用window上的变量确保能访问
  const histories = window.chatHistories || chatHistories || {};
  const chars = window.characters || characters || [];

  Object.keys(histories).forEach((charId) => {
    const history = histories[charId] || [];
    const char = chars.find((c) => c.id == charId);
    if (!char) return;

    history.forEach((msg, index) => {
      const content = msg.content || "";
      if (content.toLowerCase().includes(keyword)) {
        results.push({
          charId,
          charName: char.name,
          charAvatar: char.avatar,
          content: content,
          index,
        });
      }
    });
  });

  if (results.length === 0) {
    resultsContainer.innerHTML =
      '<div style="padding: 20px; text-align: center; color: #999;">没有找到相关记录</div>';
  } else {
    resultsContainer.innerHTML = results
      .slice(0, 20)
      .map((r) => {
        // 截取关键词周围的内容
        const lowerContent = r.content.toLowerCase();
        const keywordIndex = lowerContent.indexOf(keyword);
        let displayContent = r.content;
        if (r.content.length > 60) {
          const start = Math.max(0, keywordIndex - 20);
          const end = Math.min(
            r.content.length,
            keywordIndex + keyword.length + 40
          );
          displayContent =
            (start > 0 ? "..." : "") +
            r.content.substring(start, end) +
            (end < r.content.length ? "..." : "");
        }

        const highlighted = displayContent.replace(
          new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
          (match) => `<mark>${match}</mark>`
        );
        return `
        <div class="search-result-item" onclick="openConversation(${r.charId}); document.getElementById('chatSearchInput').value=''; searchChatHistory('');">
          <div class="search-result-char">${r.charName}</div>
          <div class="search-result-content">${highlighted}</div>
        </div>
      `;
      })
      .join("");
  }

  resultsContainer.classList.add("active");
  messageList.style.display = "none";
}

// 初始化加载分组
document.addEventListener("DOMContentLoaded", function () {
  loadCustomGroups();
});

// 初始化外观设置页面
function initAppearancePage() {
  const settings = window.appearanceSettings;

  // 显示当前壁纸
  if (settings.wallpaper) {
    document.getElementById(
      "wallpaperPreview"
    ).innerHTML = `<img src="${settings.wallpaper}">`;
  }

  // 显示当前字体颜色
  document.querySelectorAll(".color-option").forEach((el) => {
    if (el.dataset.color === settings.fontColor) {
      el.classList.add("selected");
    }
  });

  // 显示当前APP设置
  Object.keys(settings.apps).forEach((appKey) => {
    const app = settings.apps[appKey];
    const nameInput = document.getElementById(`customName_${appKey}`);
    const iconEl = document.getElementById(`customIcon_${appKey}`);
    if (nameInput) nameInput.value = app.name;
    if (iconEl && app.icon) {
      iconEl.innerHTML = `<img src="${app.icon}">`;
    }
  });
}

// 页面加载时初始化
document.addEventListener("DOMContentLoaded", function () {
  loadAppearanceSettings();
});

// 打开外观设置页面时初始化
const originalOpenPage = window.openPage || function () {};
window.openPage = function (pageId) {
  originalOpenPage(pageId);
  if (pageId === "appearancePage") {
    initAppearancePage();
  }
  // 【修复】打开字体设置页面时渲染字体预设列表
  if (pageId === "fontPage") {
    renderFontPresets();
  }
  // 打开世界书页面时渲染世界书列表
  if (pageId === "worldbookPage") {
    renderWorldbooks();
    renderWorldbookTabs();
  }
};

// ==================== 世界书系统 ====================

// 渲染世界书列表
function renderWorldbooks() {
  const listEl = document.getElementById("worldbookList");
  const emptyEl = document.getElementById("worldbookEmpty");

  // 筛选世界书
  let filteredBooks = worldbooks;
  if (currentWorldbookFilter !== "all") {
    filteredBooks = worldbooks.filter(
      (wb) => wb.group === currentWorldbookFilter
    );
  }

  if (filteredBooks.length === 0) {
    listEl.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }

  emptyEl.style.display = "none";

  listEl.innerHTML = filteredBooks
    .map((wb) => {
      const isSelected = worldbookSelectedIds.has(wb.id);
      const entryCount = wb.entries ? wb.entries.length : 0;
      const activeEntries = wb.entries
        ? wb.entries.filter((e) => e.enabled !== false).length
        : 0;
      const groupName =
        worldbookGroups.find((g) => g.id === wb.group)?.name || "";

      return `
      <div class="worldbook-item ${isSelected ? "selected" : ""}" data-id="${
        wb.id
      }" onclick="handleWorldbookItemClick('${wb.id}', event)">
        <div class="worldbook-item-header">
          <div class="worldbook-item-checkbox" onclick="toggleWorldbookSelect('${
            wb.id
          }', event)"></div>
          <div class="worldbook-item-main">
            <div class="worldbook-item-title">
              ${escapeHtml(wb.name)}
              ${
                groupName
                  ? `<span class="worldbook-item-tag">${escapeHtml(
                      groupName
                    )}</span>`
                  : ""
              }
            </div>
            <div class="worldbook-item-desc">${escapeHtml(
              wb.description || "暂无描述"
            )}</div>
            <div class="worldbook-item-meta">
              <div class="worldbook-item-meta-item">📑 ${entryCount} 条目</div>
              <div class="worldbook-item-meta-item">✓ ${activeEntries} 启用</div>
              <div class="worldbook-item-meta-item">□ ${
                wb.updateTime || "刚刚"
              }</div>
            </div>
          </div>
          <div class="worldbook-item-actions">
            <button class="worldbook-item-btn" onclick="editWorldbook('${
              wb.id
            }', event)" title="编辑">✏️</button>
            <button class="worldbook-item-btn delete" onclick="deleteWorldbook('${
              wb.id
            }', event)" title="删除">✕</button>
            <div class="worldbook-item-toggle ${
              wb.enabled !== false ? "active" : ""
            }" onclick="toggleWorldbookEnabled('${
        wb.id
      }', event)" title="启用/禁用"></div>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  // 更新统计
  document.getElementById("wbCountAll").textContent = worldbooks.length;
}

// 渲染分组标签
function renderWorldbookTabs() {
  const tabsEl = document.getElementById("worldbookTabs");

  let html = `
    <div class="worldbook-tab ${
      currentWorldbookFilter === "all" ? "active" : ""
    }" data-group="all" onclick="filterWorldbookByGroup('all')">
      全部 <span class="worldbook-tab-count">${worldbooks.length}</span>
    </div>
  `;

  worldbookGroups.forEach((group) => {
    const count = worldbooks.filter((wb) => wb.group === group.id).length;
    html += `
      <div class="worldbook-tab ${
        currentWorldbookFilter === group.id ? "active" : ""
      }" data-group="${group.id}" onclick="filterWorldbookByGroup('${
      group.id
    }')">
        ${escapeHtml(
          group.name
        )} <span class="worldbook-tab-count">${count}</span>
      </div>
    `;
  });

  tabsEl.innerHTML = html;
}

// 按分组筛选
function filterWorldbookByGroup(groupId) {
  currentWorldbookFilter = groupId;
  renderWorldbookTabs();
  renderWorldbooks();
}

// 处理世界书项点击
function handleWorldbookItemClick(id, event) {
  if (worldbookBatchMode) {
    toggleWorldbookSelect(id, event);
  } else {
    editWorldbook(id, event);
  }
}

// 切换批量操作模式
function toggleWorldbookBatchMode() {
  worldbookBatchMode = !worldbookBatchMode;
  worldbookSelectedIds.clear();

  const batchBar = document.getElementById("worldbookBatchBar");
  if (worldbookBatchMode) {
    batchBar.classList.add("active");
  } else {
    batchBar.classList.remove("active");
  }

  renderWorldbooks();
  updateWorldbookBatchInfo();
}

// 取消批量操作
function cancelWorldbookBatch() {
  worldbookBatchMode = false;
  worldbookSelectedIds.clear();
  document.getElementById("worldbookBatchBar").classList.remove("active");
  renderWorldbooks();
}

// 切换世界书选中状态
function toggleWorldbookSelect(id, event) {
  if (event) event.stopPropagation();

  if (worldbookSelectedIds.has(id)) {
    worldbookSelectedIds.delete(id);
  } else {
    worldbookSelectedIds.add(id);
  }

  renderWorldbooks();
  updateWorldbookBatchInfo();
}

// 更新批量操作信息
function updateWorldbookBatchInfo() {
  document.getElementById("worldbookSelectedCount").textContent =
    worldbookSelectedIds.size;
}

// 批量删除
function deleteSelectedWorldbooks() {
  if (worldbookSelectedIds.size === 0) {
    showToast("请先选择要删除的世界书");
    return;
  }

  if (!confirm(`确定要删除选中的 ${worldbookSelectedIds.size} 本世界书吗？`))
    return;

  worldbooks = worldbooks.filter((wb) => !worldbookSelectedIds.has(wb.id));
  localforage.setItem("worldbooks", worldbooks);

  showToast(`已删除 ${worldbookSelectedIds.size} 本世界书`);
  cancelWorldbookBatch();
}

// 打开移动分组弹窗
function openWorldbookMoveModal() {
  if (worldbookSelectedIds.size === 0) {
    showToast("请先选择要移动的世界书");
    return;
  }

  const listEl = document.getElementById("worldbookMoveList");

  let html = `
    <div class="worldbook-move-item" onclick="moveWorldbooksToGroup('')">
      📂 未分组
    </div>
  `;

  worldbookGroups.forEach((group) => {
    html += `
      <div class="worldbook-move-item" onclick="moveWorldbooksToGroup('${
        group.id
      }')">
        📁 ${escapeHtml(group.name)}
      </div>
    `;
  });

  listEl.innerHTML = html;
  document.getElementById("worldbookMoveModal").classList.add("active");
}

// 关闭移动分组弹窗
function closeWorldbookMoveModal() {
  document.getElementById("worldbookMoveModal").classList.remove("active");
}

// 移动世界书到分组
function moveWorldbooksToGroup(groupId) {
  worldbookSelectedIds.forEach((id) => {
    const wb = worldbooks.find((w) => w.id === id);
    if (wb) wb.group = groupId;
  });

  localforage.setItem("worldbooks", worldbooks);
  showToast(`已移动 ${worldbookSelectedIds.size} 本世界书`);

  closeWorldbookMoveModal();
  cancelWorldbookBatch();
  renderWorldbookTabs();
}

// 打开世界书编辑弹窗
function openWorldbookModal(id = null) {
  editingWorldbookId = id;
  tempWorldbookEntries = [];

  // 更新分组下拉
  const groupSelect = document.getElementById("worldbookGroupSelect");
  groupSelect.innerHTML = '<option value="">未分组</option>';
  worldbookGroups.forEach((group) => {
    groupSelect.innerHTML += `<option value="${group.id}">${escapeHtml(
      group.name
    )}</option>`;
  });

  if (id) {
    // 编辑模式
    const wb = worldbooks.find((w) => w.id === id);
    if (wb) {
      document.getElementById("worldbookModalTitle").textContent = "编辑世界书";
      document.getElementById("worldbookNameInput").value = wb.name || "";
      document.getElementById("worldbookGroupSelect").value = wb.group || "";
      document.getElementById("worldbookDescInput").value =
        wb.description || "";
      tempWorldbookEntries = JSON.parse(JSON.stringify(wb.entries || []));
    }
  } else {
    // 新建模式
    document.getElementById("worldbookModalTitle").textContent = "新建世界书";
    document.getElementById("worldbookNameInput").value = "";
    document.getElementById("worldbookGroupSelect").value = "";
    document.getElementById("worldbookDescInput").value = "";
    tempWorldbookEntries = [];
  }

  renderWorldbookEntries();
  document.getElementById("worldbookModal").classList.add("active");
}

// 关闭世界书编辑弹窗
function closeWorldbookModal() {
  document.getElementById("worldbookModal").classList.remove("active");
  editingWorldbookId = null;
  tempWorldbookEntries = [];
}

// 编辑世界书
function editWorldbook(id, event) {
  if (event) event.stopPropagation();
  openWorldbookModal(id);
}

// 删除世界书
function deleteWorldbook(id, event) {
  if (event) event.stopPropagation();

  const wb = worldbooks.find((w) => w.id === id);
  if (!wb) return;

  if (!confirm(`确定要删除世界书"${wb.name}"吗？`)) return;

  worldbooks = worldbooks.filter((w) => w.id !== id);
  localforage.setItem("worldbooks", worldbooks);

  showToast("世界书已删除");
  renderWorldbooks();
  renderWorldbookTabs();
}

// 切换世界书启用状态
function toggleWorldbookEnabled(id, event) {
  if (event) event.stopPropagation();

  const wb = worldbooks.find((w) => w.id === id);
  if (wb) {
    wb.enabled = wb.enabled === false ? true : false;
    localforage.setItem("worldbooks", worldbooks);
    renderWorldbooks();
  }
}

// 保存世界书
function saveWorldbook() {
  const name = document.getElementById("worldbookNameInput").value.trim();
  const group = document.getElementById("worldbookGroupSelect").value;
  const description = document
    .getElementById("worldbookDescInput")
    .value.trim();

  if (!name) {
    showToast("请输入世界书名称");
    return;
  }

  const now = new Date().toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (editingWorldbookId) {
    // 更新
    const wb = worldbooks.find((w) => w.id === editingWorldbookId);
    if (wb) {
      wb.name = name;
      wb.group = group;
      wb.description = description;
      wb.entries = tempWorldbookEntries;
      wb.updateTime = now;
    }
  } else {
    // 新建
    const newWb = {
      id: "wb_" + Date.now(),
      name: name,
      group: group,
      description: description,
      entries: tempWorldbookEntries,
      enabled: true,
      createTime: now,
      updateTime: now,
    };
    worldbooks.push(newWb);
  }

  localforage.setItem("worldbooks", worldbooks);
  showToast("世界书已保存");
  closeWorldbookModal();
  renderWorldbooks();
  renderWorldbookTabs();
}

// 渲染条目列表
function renderWorldbookEntries() {
  const container = document.getElementById("worldbookEntries");

  if (tempWorldbookEntries.length === 0) {
    container.innerHTML =
      '<div style="text-align: center; padding: 20px; color: #999; font-size: 0.9rem;">暂无条目，点击下方按钮添加</div>';
    return;
  }

  container.innerHTML = tempWorldbookEntries
    .map((entry, index) => {
      const keywords = entry.keywords
        ? entry.keywords
            .split(",")
            .map((k) => k.trim())
            .filter((k) => k)
        : [];

      return `
      <div class="worldbook-entry">
        <div class="worldbook-entry-header">
          <div class="worldbook-entry-toggle ${
            entry.enabled !== false ? "active" : ""
          }" onclick="toggleEntryEnabled(${index})"></div>
          <div class="worldbook-entry-actions">
            <button class="worldbook-entry-btn" onclick="editWorldbookEntry(${index})">✏️</button>
            <button class="worldbook-entry-btn delete" onclick="deleteWorldbookEntry(${index})">✕</button>
          </div>
        </div>
        ${
          entry.comment
            ? `<div style="font-size: 0.8rem; color: #666; margin-bottom: 6px;">📝 ${escapeHtml(
                entry.comment
              )}</div>`
            : ""
        }
        <div class="worldbook-entry-keywords">
          ${
            keywords.length > 0
              ? keywords
                  .map(
                    (k) =>
                      `<span class="worldbook-entry-keyword">${escapeHtml(
                        k
                      )}</span>`
                  )
                  .join("")
              : '<span style="color: #999; font-size: 0.8rem;">无关键词（始终触发）</span>'
          }
        </div>
        <div class="worldbook-entry-content">${escapeHtml(
          entry.content || ""
        )}</div>
      </div>
    `;
    })
    .join("");
}

// 添加条目
function addWorldbookEntry() {
  editingEntryIndex = null;
  document.getElementById("worldbookEntryModalTitle").textContent = "添加条目";
  document.getElementById("entryCommentInput").value = "";
  document.getElementById("entryKeywordsInput").value = "";
  document.getElementById("entryContentInput").value = "";
  document.getElementById("worldbookEntryModal").classList.add("active");
}

// 编辑条目
function editWorldbookEntry(index) {
  editingEntryIndex = index;
  const entry = tempWorldbookEntries[index];

  document.getElementById("worldbookEntryModalTitle").textContent = "编辑条目";
  document.getElementById("entryCommentInput").value = entry.comment || "";
  document.getElementById("entryKeywordsInput").value = entry.keywords || "";
  document.getElementById("entryContentInput").value = entry.content || "";
  document.getElementById("worldbookEntryModal").classList.add("active");
}

// 关闭条目编辑弹窗
function closeWorldbookEntryModal() {
  document.getElementById("worldbookEntryModal").classList.remove("active");
  editingEntryIndex = null;
}

// 保存条目
function saveWorldbookEntry() {
  const comment = document.getElementById("entryCommentInput").value.trim();
  const keywords = document.getElementById("entryKeywordsInput").value.trim();
  const content = document.getElementById("entryContentInput").value.trim();

  if (!content) {
    showToast("请输入条目内容");
    return;
  }

  const entry = {
    comment: comment,
    keywords: keywords,
    content: content,
    enabled: true,
  };

  if (editingEntryIndex !== null) {
    tempWorldbookEntries[editingEntryIndex] = entry;
  } else {
    tempWorldbookEntries.push(entry);
  }

  closeWorldbookEntryModal();
  renderWorldbookEntries();
}

// 删除条目
function deleteWorldbookEntry(index) {
  if (!confirm("确定要删除这个条目吗？")) return;
  tempWorldbookEntries.splice(index, 1);
  renderWorldbookEntries();
}

// 切换条目启用状态
function toggleEntryEnabled(index) {
  tempWorldbookEntries[index].enabled =
    tempWorldbookEntries[index].enabled === false ? true : false;
  renderWorldbookEntries();
}

// 分组管理
function openWorldbookGroupManager() {
  renderWorldbookGroupList();
  document.getElementById("worldbookGroupModal").classList.add("active");
}

function closeWorldbookGroupManager() {
  document.getElementById("worldbookGroupModal").classList.remove("active");
}

function renderWorldbookGroupList() {
  const listEl = document.getElementById("worldbookGroupList");

  if (worldbookGroups.length === 0) {
    listEl.innerHTML =
      '<div style="text-align: center; padding: 20px; color: #999;">暂无分组</div>';
    return;
  }

  listEl.innerHTML = worldbookGroups
    .map(
      (group) => `
    <div class="worldbook-group-item">
      <span class="worldbook-group-item-name">📁 ${escapeHtml(
        group.name
      )}</span>
      <button class="worldbook-group-item-delete" onclick="deleteWorldbookGroup('${
        group.id
      }')">✕</button>
    </div>
  `
    )
    .join("");
}

function addWorldbookGroup() {
  const input = document.getElementById("worldbookNewGroupInput");
  const name = input.value.trim();

  if (!name) {
    showToast("请输入分组名称");
    return;
  }

  if (worldbookGroups.some((g) => g.name === name)) {
    showToast("分组名称已存在");
    return;
  }

  worldbookGroups.push({
    id: "wbg_" + Date.now(),
    name: name,
  });

  localforage.setItem("worldbookGroups", worldbookGroups);
  input.value = "";
  renderWorldbookGroupList();
  renderWorldbookTabs();
  showToast("分组已添加");
}

function deleteWorldbookGroup(id) {
  const group = worldbookGroups.find((g) => g.id === id);
  if (!group) return;

  if (
    !confirm(
      `确定要删除分组"${group.name}"吗？\n该分组下的世界书将变为未分组。`
    )
  )
    return;

  // 将该分组下的世界书移到未分组
  worldbooks.forEach((wb) => {
    if (wb.group === id) wb.group = "";
  });

  worldbookGroups = worldbookGroups.filter((g) => g.id !== id);

  localforage.setItem("worldbookGroups", worldbookGroups);
  localforage.setItem("worldbooks", worldbooks);

  renderWorldbookGroupList();
  renderWorldbookTabs();
  renderWorldbooks();
  showToast("分组已删除");
}

// 聊天设置中渲染世界书选择列表
function renderWorldbookSelectList(selectedIds = []) {
  const container = document.getElementById("settingsWorldbookArea");

  if (worldbooks.length === 0) {
    container.innerHTML =
      '<div class="worldbook-select-empty">还没有世界书，去创建一本吧~</div>';
    return;
  }

  // 只显示启用的世界书
  const enabledBooks = worldbooks.filter((wb) => wb.enabled !== false);

  if (enabledBooks.length === 0) {
    container.innerHTML =
      '<div class="worldbook-select-empty">没有可用的世界书</div>';
    return;
  }

  container.innerHTML = enabledBooks
    .map((wb) => {
      const isSelected = selectedIds.includes(wb.id);
      const entryCount = wb.entries
        ? wb.entries.filter((e) => e.enabled !== false).length
        : 0;

      return `
      <div class="worldbook-select-item ${
        isSelected ? "selected" : ""
      }" onclick="toggleWorldbookInSettings('${wb.id}')">
        <div class="worldbook-select-checkbox"></div>
        <div class="worldbook-select-info">
          <div class="worldbook-select-name">≡ ${escapeHtml(wb.name)}</div>
          <div class="worldbook-select-desc">${entryCount} 条启用条目 · ${escapeHtml(
        wb.description || "暂无描述"
      )}</div>
        </div>
      </div>
    `;
    })
    .join("");
}

// 渲染群聊世界书选择列表
function renderGroupWorldbookSelectList(selectedIds = []) {
  const container = document.getElementById("groupWorldbookSelectList");
  if (!container) return;

  if (worldbooks.length === 0) {
    container.innerHTML =
      '<div class="worldbook-select-empty">还没有世界书，去创建一本吧~</div>';
    return;
  }

  // 只显示启用的世界书
  const enabledBooks = worldbooks.filter((wb) => wb.enabled !== false);

  if (enabledBooks.length === 0) {
    container.innerHTML =
      '<div class="worldbook-select-empty">没有可用的世界书</div>';
    return;
  }

  container.innerHTML = enabledBooks
    .map((wb) => {
      const isSelected = selectedIds.includes(wb.id);
      const entryCount = wb.entries
        ? wb.entries.filter((e) => e.enabled !== false).length
        : 0;

      return `
      <div class="worldbook-select-item ${
        isSelected ? "selected" : ""
      }" onclick="toggleGroupWorldbookInSettings('${wb.id}')">
        <div class="worldbook-select-checkbox"></div>
        <div class="worldbook-select-info">
          <div class="worldbook-select-name">≡ ${escapeHtml(wb.name)}</div>
          <div class="worldbook-select-desc">${entryCount} 条启用条目 · ${escapeHtml(
        wb.description || "暂无描述"
      )}</div>
        </div>
      </div>
    `;
    })
    .join("");
}

// 切换群聊世界书选中状态
function toggleGroupWorldbookInSettings(id) {
  const input = document.getElementById("groupSettingsWorldbook");
  let selectedIds = input.value ? input.value.split(",").filter((s) => s) : [];

  if (selectedIds.includes(id)) {
    selectedIds = selectedIds.filter((s) => s !== id);
  } else {
    selectedIds.push(id);
  }

  input.value = selectedIds.join(",");
  renderGroupWorldbookSelectList(selectedIds);
}

// 切换聊天设置中的世界书选中状态
function toggleWorldbookInSettings(id) {
  const input = document.getElementById("settingsWorldbook");
  let selectedIds = input.value ? input.value.split(",").filter((s) => s) : [];

  if (selectedIds.includes(id)) {
    selectedIds = selectedIds.filter((s) => s !== id);
  } else {
    selectedIds.push(id);
  }

  input.value = selectedIds.join(",");
  renderWorldbookSelectList(selectedIds);
}

// 获取世界书内容用于AI（核心功能）
function getWorldbookContentForAI(worldbookIds, chatContent) {
  if (!worldbookIds || worldbookIds.length === 0) return "";

  const contentParts = [];

  worldbookIds.forEach((wbId) => {
    const wb = worldbooks.find((w) => w.id === wbId && w.enabled !== false);
    if (!wb || !wb.entries) return;

    wb.entries.forEach((entry) => {
      if (entry.enabled === false) return;

      // 检查关键词是否匹配
      if (entry.keywords && entry.keywords.trim()) {
        const keywords = entry.keywords
          .split(",")
          .map((k) => k.trim().toLowerCase())
          .filter((k) => k);
        const chatLower = chatContent.toLowerCase();

        // 检查是否有任何关键词出现在聊天内容中
        const matched = keywords.some((kw) => chatLower.includes(kw));
        if (!matched) return;
      }

      // 没有关键词或关键词匹配，加入内容
      if (entry.content) {
        contentParts.push(entry.content);
      }
    });
  });

  if (contentParts.length === 0) return "";

  return `\n[World Book / Lore]:\n${contentParts.join("\n\n")}\n`;
}

// ==================== 将所有onclick需要的函数挂载到window ====================
Object.assign(window, {
  // 页面导航
  openPage,
  closePage,
  // 编辑模态框
  openEditModal,
  closeEditModal,
  saveEdit,
  // 标签编辑
  openTagEditModal,
  closeTagEditModal,
  saveTagEdit,
  // 恋爱纪念组件
  openLoveEditModal,
  closeLoveEditModal,
  saveLoveEdit,
  handleLoveAvatarUpload,
  handleLoveWidgetClick,
  handleLoveWidgetBgUpload,
  closeLoveWidgetOptionsModal,
  triggerLoveWidgetBgUpload,
  setLoveWidgetTextColor,
  // 聊天标签切换
  switchChatTab,
  handleHeaderBtn,
  // 角色管理
  openCreateCharModal,
  closeCreateCharModal,
  createCharacter,
  openConversation,
  closeConversation,
  deleteCharacter,
  blockCharacter,
  // API设置
  openApiPresetModal,
  closeApiPresetModal,
  selectApiPreset,
  editApiPreset,
  saveApiPreset,
  deleteApiPreset,
  togglePresetKeyVisibility,
  selectPresetModel,
  renderModelDropdown,
  // 聊天设置
  openChatSettings,
  closeChatSettings,
  saveChatSettings,
  toggleAvatarDisplay,
  updateAvatarSizePreview,
  saveAvatarSize,
  applyAvatarSize,
  applyAvatarVisibility,
  // 分组管理
  openGroupManager,
  closeGroupManager,
  addNewGroup,
  deleteGroup,
  toggleGroup,
  togglePinContact,
  // 聊天搜索
  searchChatHistory,
  clearSettingsAvatar,
  selectRadio,
  showToast,
  // 新消息通知系统
  showMessageNotification,
  handleNotificationClick,
  addUnreadMessage,
  clearUnreadForChar,
  updateMessagesBadge,
  addUnreadMoment,
  clearUnreadMoments,
  updateMomentsBadge,
  // 聊天功能
  sendUserMessage,
  clearChatHistory,
  clearChatHistoryFromSettings,
  // 气泡和消息操作
  handleBubbleClick,
  handleWrapperClick,
  handleCopyMsg,
  handleQuoteMsg,
  cancelQuote,
  handleRecallMsg,
  handleDeleteMsg,
  handleEditMsg,
  hideContextMenu,
  deleteSelectedMessages,
  exitSelectionMode,
  handleMultiSelect,
  showRecalledContent,
  // 气泡间距
  updateBubbleGapPreview,
  saveBubbleGap,
  applyBubbleGap,
  // 摘要功能
  triggerManualSummary,
  viewSummaries,
  startEditSummary,
  cancelEditSummary,
  saveSummaryEdit,
  closeSummaryModal,
  // 字体设置
  switchFontSource,
  previewCustomFont,
  saveFontPreset,
  activateFont,
  applySystemFont,
  deleteFontPreset,
  // 气泡样式
  manageBubbleStyles,
  exportBubbleStyle,
  importBubbleStyle,
  resetCustomCSS,
  // 聊天历史导入导出
  importChatHistory,
  exportChatHistory,
  // 好友分组
  manageFriendGroups,
  // 用户人设预设
  saveUserPersonaPreset,
  // 语音功能
  switchVoiceUrl,
  saveVoiceConfig,
  toggleVoiceText,
  playVoiceMessage,
  playInlineVoice,
  handleVoiceBubbleTouchStart,
  handleVoiceBubbleTouchEnd,
  // 聊天面板
  toggleChatPanel,
  closeChatPanel,
  // 多媒体消息
  sendRedPacket,
  sendNudge,
  handleCameraAction,
  sendFakeLocation,
  openVoiceMessageModal,
  closeVoiceMessageModal,
  sendVoiceMessage,
  playVoiceMessage,
  playUserVoiceMessage,
  playUserVoiceBar,
  toggleUserVoiceText,
  sendGroupVoiceMessage,
  playGroupUserVoiceBar,
  toggleGroupUserVoiceText,
  renderGroupWorldbookSelectList,
  toggleGroupWorldbookInSettings,
  showFullImage,
  // 位置功能
  closeLocationModal,
  confirmSendLocation,
  aiSendLocation,
  // 钱包功能
  initWalletData,
  saveWalletData,
  updateWalletDisplay,
  openWalletPage,
  closeWalletPage,
  renderWalletHistoryPage,
  openRechargeModal,
  closeRechargeModal,
  selectRechargeAmount,
  clearRechargeSelection,
  confirmRecharge,
  // 转账功能
  openTransferModal,
  closeTransferModal,
  confirmTransfer,
  updateUserTransferStatus,
  acceptAITransfer,
  rejectAITransfer,
  // 重Roll功能
  rerollAIReply,
  // 通话功能
  startVoiceCall,
  startVideoCall,
  endCall,
  acceptCall,
  declineCall,
  toggleSpeaker,
  saveCallSettings,
  aiInitiateCall,
  acceptIncomingCall,
  declineIncomingCall,
  sendCallMessage,
  handleCallInputKeydown,
  toggleVideoSelf,
  handleVideoCallImageUpload,
  clearVideoCallImage,
  minimizeCall,
  restoreCall,
  showCallTypingIndicator,
  rerollCallResponse,
  previewCallBubbleColor,
  previewChatBubbleStyle,
  applyChatBubbleStyle,
  setChatUserBubbleBg,
  setChatUserTextColor,
  setChatAiBubbleBg,
  setChatAiTextColor,
  applyCallBubbleColors,
  loadCallBubbleColors,
  // 触摸处理
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleMouseDown,
  handleMouseUp,
  // 一起读书
  openReadTogether,
  closeReadTogether,
  handleBookImport,
  readPrevSection,
  readNextSection,
  jumpToSection,
  selectBook,
  startReading,
  stopCurrentReading,
  deleteBook,
  startFloatingMode,
  showFloatingBtn,
  hideFloatingBtn,
  toggleFloatingPanel,
  hideFloatingPanel,
  updateFloatingPanel,
  getCurrentReadingContent,
  advanceReadingProgress,
  // 陪伴APP
  openCompanionPage,
  closeCompanionPage,
  selectCompanionChar,
  setCompanionTask,
  setCompanionDuration,
  setEncourageFreq,
  startCompanion,
  toggleCompanionPause,
  completeCompanion,
  quitCompanion,
  openCompanionChat,
  closeCompanionChat,
  sendCompanionChat,
  openCompanionSettings,
  toggleCompanionVoice,
  handleCompanionBgSelect,
  removeCompanionBg,
  removeCompanionBgItem,
  switchCompanionTab,
  changeCompanionMonth,
  selectCompanionDate,
  // AI表情包绑定
  openAiBindModal,
  closeAiBindModal,
  toggleAiBindCategory,
  saveAiBindings,
  // 待办事项
  openTodoModal,
  closeTodoModal,
  saveTodoItem,
  toggleTodoDone,
  notifyAiTodoCompleted,
  deleteTodoItem,
  filterTodos,
  selectTodoTag,
  toggleTodoAiBinding,
  aiGreetForTodoBinding,
  renderTodoAiCharList,
  renderTodoTagSelect,
  // 待办设置
  openTodoSettingsModal,
  closeTodoSettingsModal,
  addTodoCategory,
  loadGreetingForEdit,
  saveGreeting,
  // 待办重复任务
  checkAndResetRepeatingTodos,
  selectTodoRepeat,
  renderCategoryList,
  deleteCategory,
  // Instagram动态系统
  initMomentsSystem,
  renderMomentsUI,
  updateMeProfileUI,
  changeMomentCover,
  changeMomentAvatar,
  editMomentNickname,
  editMomentHandle,
  editMomentSignature,
  renderFeed,
  // AI后台活动系统
  createAiMomentPost,
  initBackgroundActivity,
  startBackgroundActivity,
  stopBackgroundActivity,
  runBackgroundActivityTick,
  triggerBackgroundAction,
  sendBackgroundMessage,
  addAiComment,
  addAiLike,
  triggerAiPost,
  incrementUnreadMoments,
  clearUnreadMoments,
  // 后台活动设置页面
  openBackgroundActivityPage,
  closeBackgroundActivityPage,
  renderBackgroundActivityPage,
  toggleBackgroundActivityEnabled,
  updateBackgroundActivityInterval,
  updateCharFrequency,
  testBackgroundActivity,
  openPostModal,
  closePostModal,
  selectImageOption,
  handleImageSelect,
  removeImage,
  checkPostValid,
  submitPost,
  renderVisibilityOptions,
  selectVisibility,
  toggleVisibilityGroup,
  toggleLike,
  toggleBookmark,
  openComments,
  closeCommentsModal,
  sendComment,
  setReplyTo,
  setReplyTarget,
  focusReplyInput,
  sendInlineComment,
  openPostMenu,
  closePostMenu,
  deletePost,
  confirmDeletePost,
  sharePostToChat,
  closeShareModal,
  confirmShareToChat,
  openProfileModal,
  closeProfileModal,
  handleAvatarSelect,
  openEmojiPicker,
  saveProfile,
  showCharacterPosts,
  generateMomentsPromptForAi,
  // 外观设置
  previewWallpaper,
  resetWallpaper,
  setFontColor,
  previewAppIcon,
  saveAppearanceSettings,
  loadAppearanceSettings,
  applyAppearanceSettings,
  initAppearancePage,
  // 世界书系统
  renderWorldbooks,
  renderWorldbookTabs,
  filterWorldbookByGroup,
  handleWorldbookItemClick,
  toggleWorldbookBatchMode,
  cancelWorldbookBatch,
  toggleWorldbookSelect,
  deleteSelectedWorldbooks,
  openWorldbookMoveModal,
  closeWorldbookMoveModal,
  moveWorldbooksToGroup,
  openWorldbookModal,
  closeWorldbookModal,
  editWorldbook,
  deleteWorldbook,
  toggleWorldbookEnabled,
  saveWorldbook,
  renderWorldbookEntries,
  addWorldbookEntry,
  editWorldbookEntry,
  closeWorldbookEntryModal,
  saveWorldbookEntry,
  deleteWorldbookEntry,
  toggleEntryEnabled,
  openWorldbookGroupManager,
  closeWorldbookGroupManager,
  addWorldbookGroup,
  deleteWorldbookGroup,
  renderWorldbookSelectList,
  toggleWorldbookInSettings,
  getWorldbookContentForAI,
  // 预设系统
  initPresetSystem,
  renderPresets,
  switchPresetTab,
  openPresetModal,
  closePresetModal,
  savePreset,
  editPreset,
  deleteSinglePreset,
  exportPreset,
  handlePresetClick,
  startPresetBatchMode,
  togglePresetSelect,
  cancelPresetBatch,
  deleteSelectedPresets,
  openPresetImportModal,
  closePresetImportModal,
  importPresetFromFile,
  handlePresetFileImport,
  importPresetFromClipboard,
  importPresetData,
  toggleOfflineSettings,
  updateOfflinePresetDropdown,
  onOfflinePresetChange,
  // 预设条目相关
  renderPresetEntries,
  addPresetEntry,
  togglePresetEntry,
  updatePresetEntry,
  deletePresetEntry,
  toggleEntryContent,
  presetEscapeHtml,
  loadMorePresetEntries,
  // 收藏功能
  initFavoritesData,
  handleFavoriteMsg,
  favoriteSelectedMessages,
  favoritePost,
  openFavoriteGroupModal,
  closeFavoriteGroupModal,
  selectFavoriteGroup,
  addNewGroupInModal,
  confirmFavorite,
  openFavoritesPage,
  closeFavoritesPage,
  renderFavoritesTabs,
  switchFavoritesGroup,
  renderFavoritesList,
  deleteFavoriteItem,
  addFavoriteGroup,
});
console.log("✓ 所有函数已挂载到window");
// 🆕 智能解析文本：自动识别 "关键词：URL" 格式
function parseStickersFromText(text) {
  const lines = text.split(/\r?\n/); // 按行分割
  const results = [];

  // 匹配 URL 的正则
  const urlRegex = /(https?:\/\/[^\s"']+)/;

  lines.forEach((line) => {
    line = line.trim();
    if (!line) return;

    // 1. 先找有没有 URL
    const urlMatch = line.match(urlRegex);
    if (urlMatch) {
      const url = urlMatch[0];
      let desc = ""; // 默认空，稍后处理

      // 2. 找分隔符 (中文冒号 或 英文冒号)
      // 也就是找 URL 前面的部分
      const sepRegex = /[:：]/;
      const match = line.match(sepRegex);

      if (match && match.index < line.indexOf("http")) {
        // 如果冒号在 http 之前，说明冒号前是描述
        desc = line.substring(0, match.index).trim();
      }

      // 3. 存入结果
      results.push({
        src: url,
        desc: desc, // 如果没找到冒号，这里就是空字符串
      });
    }
  });

  return results;
}
// === 个人名片交互逻辑 (LocalForage 版) ===

// 1. 页面加载时：异步读取保存的数据
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 使用 await 等待数据从数据库取出
    const savedBg = await localforage.getItem("userBg");
    const savedAvatar = await localforage.getItem("userAvatar");
    const savedName = await localforage.getItem("userName");
    const savedBio = await localforage.getItem("userBio");
    const savedLoc = await localforage.getItem("userLocation");

    // 如果取到了，就显示出来
    if (savedBg) document.getElementById("userProfileBg").src = savedBg;
    if (savedAvatar)
      document.getElementById("userProfileAvatar").src = savedAvatar;
    if (savedName)
      document.getElementById("userNameDisplay").innerText = savedName;
    if (savedBio)
      document.getElementById("userBioDisplay").innerText = savedBio;
    if (savedLoc)
      document.getElementById("userLocationDisplay").innerText = savedLoc;

    console.log("名片数据加载完成！");
  } catch (err) {
    console.error("读取数据出错:", err);
  }
});

// 2. 触发背景上传
function triggerBgUpload() {
  document.getElementById("bgInput").click();
}

// 处理背景图更改
function handleBgChange(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const result = e.target.result;
      // 1. 马上显示，让用户觉得很快
      document.getElementById("userProfileBg").src = result;
      // 2. 后台异步保存
      localforage
        .setItem("userBg", result)
        .then(() => {
          console.log("背景已保存到 localforage");
        })
        .catch((err) => console.error("保存背景失败", err));
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// 3. 触发头像上传
function triggerAvatarUpload() {
  document.getElementById("avatarInput").click();
}

// 处理头像更改
function handleAvatarChange(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const result = e.target.result;
      // 1. 马上显示
      document.getElementById("userProfileAvatar").src = result;
      // 2. 后台异步保存
      localforage
        .setItem("userAvatar", result)
        .then(() => {
          console.log("头像已保存到 localforage");
        })
        .catch((err) => console.error("保存头像失败", err));
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// 4. 编辑名字
function editUserName() {
  const currentText = document.getElementById("userNameDisplay").innerText;
  const newText = prompt("请输入新的名字：", currentText);
  if (newText && newText.trim() !== "") {
    document.getElementById("userNameDisplay").innerText = newText;
    localforage.setItem("userName", newText);
  }
}

// 5. 编辑个签
function editUserBio() {
  const currentText = document.getElementById("userBioDisplay").innerText;
  const newText = prompt("请输入个性签名：", currentText);
  if (newText !== null) {
    const val = newText || "点击这里设置你的个性签名...";
    document.getElementById("userBioDisplay").innerText = val;
    localforage.setItem("userBio", val);
  }
}

// 6. 编辑定位
function editUserLocation() {
  const currentText = document.getElementById("userLocationDisplay").innerText;
  const newText = prompt(
    "设置你的位置：",
    currentText === "添加定位" ? "" : currentText
  );
  if (newText !== null) {
    const val = newText.trim() || "添加定位";
    document.getElementById("userLocationDisplay").innerText = val;
    localforage.setItem("userLocation", val);
  }
}
// === 拍立得小组件逻辑 ===

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 读取拍立得数据
    const savedP_Img = await localforage.getItem("polaroidImg");
    const savedP_Text = await localforage.getItem("polaroidText");

    if (savedP_Img)
      document.getElementById("polaroidImgDisplay").src = savedP_Img;
    if (savedP_Text)
      document.getElementById("polaroidTextDisplay").innerText = savedP_Text;
  } catch (err) {
    console.error("读取拍立得数据出错:", err);
  }
});

// 1. 触发拍立得图片上传
function triggerPolaroidUpload() {
  document.getElementById("polaroidInput").click();
}

// 2. 处理拍立得图片保存
function handlePolaroidChange(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const result = e.target.result;
      document.getElementById("polaroidImgDisplay").src = result;
      // 保存到 localforage
      localforage.setItem("polaroidImg", result);
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// 3. 编辑拍立得文字
function editPolaroidText(event) {
  // 防止冒泡（虽然结构分开了，加上更保险）
  event.stopPropagation();

  const currentText = document.getElementById("polaroidTextDisplay").innerText;
  const newText = prompt("给这张照片写个标题吧：", currentText);

  if (newText !== null) {
    // 允许空字符串，但不允许取消
    const finalVal = newText.trim() || "My Moment";
    document.getElementById("polaroidTextDisplay").innerText = finalVal;
    localforage.setItem("polaroidText", finalVal);
  }
}
