# 模块化代码结构指南

## 参考结构（仿照 EPhone 项目）

```
PinkyPhone/
├── index.html          # 主入口文件（只包含HTML结构和必要的引用）
├── manifest.json       # PWA配置文件
├── style.css           # 所有CSS样式
│
├── main-app.js         # 主应用（初始化、导航、工具函数）
├── chat.js             # 单聊功能
├── group-chat.js       # 群聊功能
├── moment.js           # 朋友圈功能
├── voice.js            # 语音/TTS功能
├── api.js              # API调用封装
├── settings.js         # 设置功能
├── companion.js        # 陪伴功能
├── lovers-space.js     # 情侣空间
├── todo.js             # 待办功能
├── favorites.js        # 收藏功能
└── worldbook.js        # 世界书功能
```

## 全屏适配方案（简洁有效）

```css
/* 核心：使用 position: fixed + inset: 0 */
.phone-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 每个页面用绝对定位填满 */
.page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* 用 safe-area-inset 处理刘海和底部 */
.header {
  padding-top: calc(15px + env(safe-area-inset-top));
}

.bottom-bar {
  padding-bottom: env(safe-area-inset-bottom);
}
```

## Z-Index 层级规范

```css
:root {
  --z-base: 1;        /* 基础层 */
  --z-content: 10;    /* 内容层 */
  --z-header: 100;    /* 头部导航 */
  --z-nav: 200;       /* 底部Tab导航 */
  --z-dropdown: 300;  /* 下拉菜单 */
  --z-sticky: 400;    /* 粘性元素 */
  --z-fixed: 500;     /* 固定元素 */
  --z-overlay: 600;   /* 遮罩层 */
  --z-modal: 700;     /* 模态框 */
  --z-popover: 800;   /* 弹出框 */
  --z-tooltip: 900;   /* 提示框 */
  --z-toast: 1000;    /* Toast提示 */
  --z-max: 9999;      /* 最高层级 */
}
```

## 模块化开发规则

### 1. 每个功能独立一个JS文件
- 功能之间通过全局变量或事件通信
- 每个文件开头声明依赖的全局变量
- 每个文件末尾导出需要暴露的函数

### 2. CSS统一放在 style.css
- 按功能模块用注释分隔
- 使用CSS变量统一管理颜色、间距、层级
- 避免内联样式

### 3. HTML结构保持简洁
- 只包含页面骨架
- 动态内容通过JS生成
- 每个page用id标识

### 4. 修改单个功能时
- 只需编辑对应的JS文件
- 不会影响其他功能
- 方便debug和维护

## 逐步迁移步骤

1. **第一步**：把所有CSS提取到 style.css
2. **第二步**：把工具函数提取到 main-app.js
3. **第三步**：按功能逐个提取JS模块
4. **第四步**：测试每个模块独立运行
5. **第五步**：整合测试

## 当前状态

目前代码仍是单文件（index.html），包含所有CSS和JS。
后续可以逐步按上述结构拆分。

