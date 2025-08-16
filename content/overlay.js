// 悬浮控件：注入控制条与到底部提示

(function(){
  // 检查是否已经初始化
  if (window.__autoScrollerOverlay) {
    console.log('AutoScroller overlay already initialized');
    return;
  }

  const STYLE_ID = 'autoScroller-overlay-style';

  function ensureStyle(){
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('content/overlay.css');
    document.documentElement.appendChild(link);
  }

  function mountOverlay(){
    ensureStyle();
    if (document.getElementById('autoScroller-overlay')) return;

    const root = document.createElement('div');
    root.id = 'autoScroller-overlay';
    root.innerHTML = `
      <div class="panel">
        <button id="as-play">播放/停止</button>
        <button id="as-speed-down">-</button>
        <span class="speed" id="as-speed">600 px/s</span>
        <button id="as-speed-up">+</button>
        <button id="as-top">顶部</button>
      </div>
      <div id="autoScroller-bottom-prompt"></div>
    `;
    document.documentElement.appendChild(root);

    // 绑定事件
    const playBtn = root.querySelector('#as-play');
    const speedUpBtn = root.querySelector('#as-speed-up');
    const speedDownBtn = root.querySelector('#as-speed-down');
    const topBtn = root.querySelector('#as-top');

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        console.log('Play/Stop button clicked');
        if (window.__autoScrollerEngine) {
          window.__autoScrollerEngine.toggleStartStop();
        }
      });
    }

    if (speedUpBtn) {
      speedUpBtn.addEventListener('click', () => {
        console.log('Speed up button clicked');
        if (window.__autoScrollerEngine) {
          window.__autoScrollerEngine.adjustSpeed(+25);
        }
      });
    }

    if (speedDownBtn) {
      speedDownBtn.addEventListener('click', () => {
        console.log('Speed down button clicked');
        if (window.__autoScrollerEngine) {
          window.__autoScrollerEngine.adjustSpeed(-25);
        }
      });
    }

    if (topBtn) {
      topBtn.addEventListener('click', () => {
        console.log('Top button clicked');
        // 停止滚动并返回顶部
        if (window.__autoScrollerEngine) {
          window.__autoScrollerEngine.stopScrolling();
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    console.log('Overlay mounted and event listeners attached');
  }

  const updateOverlay = (scrollState) => {
    const speedEl = document.getElementById('as-speed');
    const playBtn = document.getElementById('as-play');
    
    if (speedEl && scrollState) {
      speedEl.textContent = `${scrollState.speed} px/s`;
    }
    
    if (playBtn && scrollState) {
      playBtn.textContent = scrollState.isScrolling ? '停止' : '播放';
    }
  };

  function showBottomPrompt(type){
    const el = document.getElementById('autoScroller-bottom-prompt');
    if (!el) return;
    el.classList.add('show');
    el.textContent = type === 'infinite' ? '已到达底部（疑似无限滚动）' : '已到达底部';
    setTimeout(() => el.classList.remove('show'), 2000);
  }

  function teardownOverlay(){
    const el = document.getElementById('autoScroller-overlay');
    if (el) el.remove();
  }

  // 初始化：挂载并监听状态事件
  mountOverlay();
  
  // 监听来自 scrollEngine 的状态更新
  window.addEventListener('autoscroll:state', (ev) => {
    console.log('Received state update:', ev.detail);
    updateOverlay(ev.detail);
  });

  // 初始更新一次状态
  if (window.__autoScrollerEngine) {
    const initialState = window.__autoScrollerEngine.getState();
    updateOverlay(initialState);
  }

  // 处理来自 background 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'UPDATE_OVERLAY') {
      updateOverlay(message.payload);
      sendResponse({ ok: true });
    }
  });

  // 导出到全局（供 scrollEngine 直接调用，如需要）
  window.__autoScrollerOverlay = { mountOverlay, updateOverlay, showBottomPrompt, teardownOverlay };

  console.log('AutoScroller overlay initialized');
})();