// ==================== 陪伴页面补丁 - 待办事项选择和时长功能 ====================

// 选中的待办事项ID
window.selectedCompanionTodoId = null;

// 渲染待办事项列表到陪伴页面
function renderCompanionTodoList() {
  const container = document.getElementById('companionTodoList');
  if (!container) return;
  
  // 获取今天的日期
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toDateString();
  
  // 筛选当天的待办事项（使用与主应用相同的逻辑）
  const todayTodos = (window.todoList || []).filter(t => {
    const taskDate = new Date(t.createdAt);
    taskDate.setHours(0, 0, 0, 0);
    
    // 非重复任务：只在创建日期显示
    if (!t.repeat || t.repeat === "none") {
      return taskDate.toDateString() === todayStr;
    }
    
    // 重复任务：只在创建日期及之后显示
    if (today < taskDate) return false;
    
    // 检查重复规则
    switch(t.repeat) {
      case "daily":
        return true;
      case "weekly":
        return taskDate.getDay() === today.getDay();
      case "monthly":
        return taskDate.getDate() === today.getDate();
      default:
        return false;
    }
  }).map(t => {
    // 对于重复任务，只有今天的完成状态才是真实的
    if (t.repeat && t.repeat !== "none") {
      return { ...t };
    }
    return t;
  });
  
  // 只显示未完成的
  const pendingTodos = todayTodos.filter(t => !t.done);
  
  // 去重（根据text内容）
  const uniqueTodos = [];
  const seenTexts = new Set();
  for (const todo of pendingTodos) {
    if (!seenTexts.has(todo.text)) {
      seenTexts.add(todo.text);
      uniqueTodos.push(todo);
    }
  }
  
  if (uniqueTodos.length === 0) {
    container.innerHTML = '<div class="companion-todo-empty">今天暂无待办事项</div>';
    return;
  }
  
  container.innerHTML = uniqueTodos.map(todo => `
    <div class="companion-todo-item ${window.selectedCompanionTodoId === todo.id ? 'selected' : ''}" 
         onclick="selectCompanionTodo('${todo.id}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      ${escapeHtml(todo.text)}
    </div>
  `).join('');
}

// 选择待办事项
function selectCompanionTodo(todoId) {
  const todo = (window.todoList || []).find(t => t.id === todoId);
  if (!todo) return;
  
  // 切换选中状态
  if (window.selectedCompanionTodoId === todoId) {
    window.selectedCompanionTodoId = null;
    document.getElementById('companionTaskInput').value = '';
  } else {
    window.selectedCompanionTodoId = todoId;
    document.getElementById('companionTaskInput').value = todo.text;
  }
  
  // 重新渲染列表
  renderCompanionTodoList();
}

// 设置陪伴时长
function setCompanionDuration(minutes) {
  const input = document.getElementById('companionDurationInput');
  if (input) {
    input.value = minutes;
  }
  
  // 更新预设按钮状态
  document.querySelectorAll('.companion-duration-preset').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.includes(minutes + '分钟') || 
        (minutes === 60 && btn.textContent.includes('1小时')) ||
        (minutes === 90 && btn.textContent.includes('1.5小时')) ||
        (minutes === 120 && btn.textContent.includes('2小时'))) {
      btn.classList.add('active');
    }
  });
}

// 监听时长输入变化，更新预设按钮状态
function initDurationInput() {
  const input = document.getElementById('companionDurationInput');
  if (input) {
    input.addEventListener('input', function() {
      const value = parseInt(this.value);
      document.querySelectorAll('.companion-duration-preset').forEach(btn => {
        btn.classList.remove('active');
      });
      // 如果输入值匹配预设，高亮对应按钮
      const presetMap = { 15: '15分钟', 25: '25分钟', 45: '45分钟', 60: '1小时', 90: '1.5小时', 120: '2小时' };
      if (presetMap[value]) {
        document.querySelectorAll('.companion-duration-preset').forEach(btn => {
          if (btn.textContent.includes(presetMap[value])) {
            btn.classList.add('active');
          }
        });
      }
    });
  }
}

// 扩展原有的 openCompanionPage 函数
const originalOpenCompanionPage = window.openCompanionPage;
window.openCompanionPage = function() {
  if (originalOpenCompanionPage) {
    originalOpenCompanionPage();
  }
  // 渲染待办事项列表
  setTimeout(() => {
    renderCompanionTodoList();
    initDurationInput();
  }, 100);
};

// 如果陪伴页面已经存在 renderCompanionCharSelect 函数，扩展它
const originalRenderCompanionCharSelect = window.renderCompanionCharSelect;
if (originalRenderCompanionCharSelect) {
  window.renderCompanionCharSelect = function() {
    originalRenderCompanionCharSelect();
    renderCompanionTodoList();
  };
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 延迟初始化，确保其他脚本已加载
  setTimeout(() => {
    initDurationInput();
    
    // 监听待办事项变化，自动刷新列表
    // 每隔2秒检查一次是否需要更新（简单轮询方案）
    let lastTodoListLength = (window.todoList || []).length;
    let lastTodoListDoneCount = (window.todoList || []).filter(t => t.done).length;
    
    setInterval(() => {
      const currentLength = (window.todoList || []).length;
      const currentDoneCount = (window.todoList || []).filter(t => t.done).length;
      
      // 如果数量或完成数变化了，重新渲染
      if (currentLength !== lastTodoListLength || currentDoneCount !== lastTodoListDoneCount) {
        lastTodoListLength = currentLength;
        lastTodoListDoneCount = currentDoneCount;
        
        // 如果陪伴页面可见，刷新列表
        const companionPage = document.getElementById('companionPage');
        if (companionPage && companionPage.classList.contains('active')) {
          renderCompanionTodoList();
        }
      }
    }, 2000);
  }, 500);
});

// 导出函数
Object.assign(window, {
  renderCompanionTodoList,
  selectCompanionTodo,
  setCompanionDuration,
  initDurationInput
});

// HTML转义函数（如果不存在的话）
if (typeof escapeHtml !== 'function') {
  window.escapeHtml = function(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };
}
