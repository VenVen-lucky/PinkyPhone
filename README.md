# 模块化代码结构说明

## 目录结构
```
app/
├── index.html          # 主入口文件（开发版，引用外部CSS和JS）
├── css/
│   ├── variables.css   # CSS变量定义（颜色、z-index层级等）
│   ├── base.css        # 基础样式
│   ├── components.css  # 组件样式
│   ├── chat.css        # 聊天页面样式
│   ├── group.css       # 群聊样式
│   ├── moment.css      # 朋友圈样式
│   └── settings.css    # 设置页面样式
├── js/
│   ├── app.js          # 主应用入口
│   ├── utils.js        # 工具函数
│   ├── storage.js      # 存储相关
│   ├── chat.js         # 单聊功能
│   ├── group.js        # 群聊功能
│   ├── moment.js       # 朋友圈功能
│   ├── voice.js        # 语音功能
│   ├── api.js          # API调用
│   └── settings.js     # 设置功能
└── build/
    └── index.html      # 构建后的单文件版本
```

## Z-Index层级规范
在 `css/variables.css` 中定义了统一的层级变量：

```css
:root {
  --z-base: 1;        /* 基础层 */
  --z-content: 10;    /* 内容层 */
  --z-header: 100;    /* 头部导航 */
  --z-nav: 200;       /* 底部导航 */
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

**使用规则：**
- 任何需要设置z-index的元素，必须使用变量
- 禁止直接写死数字
- 如需新层级，先在variables.css中定义

## 视口高度规范
使用动态视口高度（dvh）以适配移动端：

```css
:root {
  --vh-full: 100dvh;
  --vh-90: 90dvh;
  --vh-85: 85dvh;
  /* ... */
}
```

对于不支持dvh的浏览器，自动回退到vh。

## 开发指南

### 添加新功能
1. 确定功能属于哪个模块
2. 在对应的JS文件中添加代码
3. 样式添加到对应的CSS文件
4. 使用统一的层级和视口变量

### 构建单文件版本
运行构建脚本将所有模块合并为单个HTML文件：
```bash
node build.js
```

### 调试
开发时使用 `app/index.html`，它会加载所有模块文件，方便调试。
