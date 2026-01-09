self.addEventListener('install', (event) => {
    // 安装后立即激活，不等待
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // 接管所有页面
    event.waitUntil(self.clients.claim());
});

// 监听：用户点击了通知
self.addEventListener('notificationclick', (event) => {
    // 1. 关闭通知
    event.notification.close();

    // 2. 尝试打开或聚焦窗口
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // 如果已经有打开的窗口，就聚焦它
            for (const client of clientList) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            // 如果没有打开的窗口，就重新打开首页 (可选，视你的需求而定)
            if (clients.openWindow) {
                return clients.openWindow('./index.html');
            }
        })
    );
});