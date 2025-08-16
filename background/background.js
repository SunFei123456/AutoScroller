// 背景脚本：处理命令、注入脚本、管理与转发消息
// 说明：命名使用英文，注释使用中文

const STATE_CACHE = new Map(); // tabId -> { isScrolling, isPaused, speed }

// 工具：获取当前活动tab
async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

// 工具：确保 content 脚本已注入
async function ensureContentInjected(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [
        "content/overlay.js",
        "content/scrollEngine.js"
      ]
    });
  } catch (e) {
    console.warn("inject failed", e);
    throw e;
  }
}

// 发送控制消息到tab
async function sendToTab(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message).catch(err => {
    console.warn("sendMessage error", err);
    return null;
  });
}

// 处理快捷键命令
chrome.commands.onCommand.addListener(async (command) => {
  const tab = await getActiveTab();
  if (!tab) return;
  try {
    await ensureContentInjected(tab.id);
  } catch (e) {
    return;
  }

  switch (command) {
    case 'start_stop':
      await sendToTab(tab.id, { type: 'TOGGLE_START_STOP' });
      break;
    case 'pause_resume':
      await sendToTab(tab.id, { type: 'TOGGLE_PAUSE_RESUME' });
      break;
    case 'speed_up':
      await sendToTab(tab.id, { type: 'ADJUST_SPEED', delta: +50 });
      break;
    case 'speed_down':
      await sendToTab(tab.id, { type: 'ADJUST_SPEED', delta: -50 });
      break;
    default:
      break;
  }
});

// 统一的消息处理监听器
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 处理来自 content 的状态更新
  if (sender.tab) {
    const tabId = sender.tab.id;

    if (message?.type === 'STATE_UPDATE') {
      STATE_CACHE.set(tabId, message.payload);
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === 'REACHED_BOTTOM') {
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === 'QUERY_STATE') {
      sendResponse({ ok: true, payload: STATE_CACHE.get(tabId) || null });
      return;
    }

    // 处理来自 overlay 的控制消息
    if (message?.type === 'TOGGLE_START_STOP') {
      sendToTab(tabId, { type: 'TOGGLE_START_STOP' }).then(() => {
        sendResponse({ ok: true });
      });
      return true; // 异步响应
    }

    if (message?.type === 'TOGGLE_PAUSE_RESUME') {
      sendToTab(tabId, { type: 'TOGGLE_PAUSE_RESUME' }).then(() => {
        sendResponse({ ok: true });
      });
      return true; // 异步响应
    }

    if (message?.type === 'ADJUST_SPEED') {
      sendToTab(tabId, { type: 'ADJUST_SPEED', delta: message.delta }).then(() => {
        sendResponse({ ok: true });
      });
      return true; // 异步响应
    }
  }

  // 处理来自 popup 的请求
  if (message?.from === 'popup') {
    (async () => {
      const tab = await getActiveTab();
      if (!tab) return sendResponse({ ok: false, error: 'no_active_tab' });

      try {
        if (message.type === 'QUERY_STATE') {
          const cached = STATE_CACHE.get(tab.id);
          if (cached) return sendResponse({ ok: true, payload: cached });
          await ensureContentInjected(tab.id);
          const resp = await sendToTab(tab.id, { type: 'QUERY_STATE' });
          return sendResponse(resp || { ok: true, payload: null });
        }

        // 控制类
        await ensureContentInjected(tab.id);
        await sendToTab(tab.id, { type: message.type, payload: message.payload });
        return sendResponse({ ok: true });
      } catch (e) {
        return sendResponse({ ok: false, error: 'inject_failed' });
      }
    })();

    return true; // 声明异步响应
  }
});