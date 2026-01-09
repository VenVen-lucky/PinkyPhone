// ==================== 续写功能 ====================
// 让AI主动继续发消息，完全复用现有的聊天逻辑

async function continueChat() {
  console.log('[续写] 触发');
  
  // 检查是否有当前对话
  if (!currentChatCharId) {
    showToast('请先打开一个对话');
    return;
  }
  
  // 检查是否是群聊
  if (currentGroupId) {
    await continueGroupChat();
    return;
  }
  
  // 获取聊天历史
  if (!chatHistories[currentChatCharId]) {
    chatHistories[currentChatCharId] = [];
  }
  const history = chatHistories[currentChatCharId];
  
  if (history.length === 0) {
    showToast('还没有聊天记录');
    return;
  }
  
  // 关闭功能面板
  if (typeof closeChatPanel === 'function') {
    closeChatPanel();
  }
  
  // 保存当前角色ID，防止用户切换
  const savedCharId = currentChatCharId;
  
  // 添加一条隐藏的续写触发消息
  const continueMsg = {
    role: 'user',
    content: '[系统指令：用户没有回复你的消息。请你主动再发一条消息，延续之前的话题和情绪。注意：不要说"你来了"、"你终于回我"、"你找我"之类的话，因为用户并没有发消息给你，是你在主动追发消息。]',
    isHidden: true,  // 不显示在界面上
    isContinue: true, // 标记为续写消息，方便后续清理
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now()
  };
  
  chatHistories[savedCharId].push(continueMsg);
  await localforage.setItem('chatHistories', chatHistories);
  
  try {
    // 调用现有的AI回复函数
    if (typeof requestAIReply === 'function') {
      await requestAIReply();
    } else {
      showToast('找不到AI回复函数');
      // 清理隐藏消息
      await removeContinueMessage(savedCharId);
      return;
    }
  } catch (e) {
    console.error('[续写] 错误:', e);
  }
  
  // AI回复完成后，删除隐藏的续写触发消息
  await removeContinueMessage(savedCharId);
}

// 群聊续写
async function continueGroupChat() {
  console.log('[续写] 群聊模式');
  
  const group = groupChats.find(g => g.id === currentGroupId);
  if (!group || !group.members || group.members.length === 0) {
    showToast('群里没有成员');
    return;
  }
  
  // 关闭功能面板
  if (typeof closeChatPanel === 'function') {
    closeChatPanel();
  }
  
  // 获取群聊消息
  const messagesKey = `group_messages_${currentGroupId}`;
  const messages = await localforage.getItem(messagesKey) || [];
  
  if (messages.length === 0) {
    showToast('还没有聊天记录');
    return;
  }
  
  // 找到最后一条非隐藏的用户消息作为上下文
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user' && !m.isHidden);
  
  // 添加隐藏的续写触发消息
  const continueMsg = {
    role: 'user',
    content: '[系统指令：群里安静了一会儿，没有人说话。请某个群成员主动说点什么，延续之前的话题。注意：不要说"你们来了"、"有人吗"之类的话，而是自然地继续之前的对话。]',
    isHidden: true,
    isContinue: true,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now()
  };
  
  messages.push(continueMsg);
  await localforage.setItem(messagesKey, messages);
  
  try {
    // 调用群聊AI回复函数
    if (typeof requestGroupAIReply === 'function') {
      await requestGroupAIReply(lastUserMsg?.content || '继续');
    }
  } catch (e) {
    console.error('[续写] 群聊错误:', e);
  }
  
  // 删除隐藏消息
  const savedGroupId = currentGroupId;
  setTimeout(async () => {
    const key = `group_messages_${savedGroupId}`;
    const msgs = await localforage.getItem(key) || [];
    const filtered = msgs.filter(m => !m.isContinue);
    await localforage.setItem(key, filtered);
    console.log('[续写] 已清理群聊触发消息');
  }, 1000);
}

// 删除续写触发消息
async function removeContinueMessage(charId) {
  if (!chatHistories[charId]) return;
  
  // 过滤掉续写触发消息
  const before = chatHistories[charId].length;
  chatHistories[charId] = chatHistories[charId].filter(m => !m.isContinue);
  const after = chatHistories[charId].length;
  
  if (before !== after) {
    await localforage.setItem('chatHistories', chatHistories);
    console.log('[续写] 已清理触发消息，删除了', before - after, '条');
  }
}

// 导出
window.continueChat = continueChat;
