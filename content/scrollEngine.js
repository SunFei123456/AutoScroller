// 滚动引擎：负责选择容器、驱动滚动、触底检测
// 注释中文、命名英文

// 检查是否已经初始化
if (window.__autoScrollerEngine) {
  console.log('AutoScroller engine already initialized');
} else {
  const DEFAULTS = {
    minSpeed: 50,
    maxSpeed: 4000,
    defaultSpeed: 600,
    step: 50,
    overlayEnabled: true,
    threshold: 4
  };

  let state = {
    isScrolling: false,
    isPaused: false,
    speed: DEFAULTS.defaultSpeed,
    container: null,
    lastTick: 0,
    direction: 'down',
    threshold: DEFAULTS.threshold,
    suspectedInfinite: false,
    bottomHitCount: 0,
    lastScrollHeight: 0
  };

  function clampSpeed(v){
    return Math.max(DEFAULTS.minSpeed, Math.min(DEFAULTS.maxSpeed, v));
  }

  function selectScrollContainer() {
    // 简化实现：优先选择文档根，否则尝试查找可滚动容器
    // TODO: 可扩展为扫描可见可滚动元素并择优
    const docEl = document.scrollingElement || document.documentElement || document.body;
    return docEl;
  }

  function isAtBottom() {
    const el = state.container;
    if (!el) return false;
    const scrollTop = el.scrollTop;
    const clientHeight = el.clientHeight;
    const scrollHeight = el.scrollHeight;
    return scrollTop + clientHeight >= scrollHeight - state.threshold;
  }

  function detectInfiniteScroll() {
    const el = state.container;
    const h = el.scrollHeight;
    if (isAtBottom()) {
      state.bottomHitCount += 1;
      // 若上次触底后高度增长，标记疑似无限滚动
      if (state.lastScrollHeight && h > state.lastScrollHeight + 10) {
        state.suspectedInfinite = true;
      }
      state.lastScrollHeight = h;
    }
    return state.suspectedInfinite;
  }

  function tick(ts) {
    if (!state.isScrolling || state.isPaused) return;
    if (!state.lastTick) state.lastTick = ts;
    const dt = Math.max(0, ts - state.lastTick) / 1000; // 秒
    state.lastTick = ts;

    const delta = state.speed * dt;
    state.container.scrollTop += delta;

    if (isAtBottom()) {
      // 到底部：通知 background/content，触发 overlay 提示
      chrome.runtime.sendMessage({ type: 'REACHED_BOTTOM' });
      if (window.__autoScrollerOverlay && typeof window.__autoScrollerOverlay.showBottomPrompt === 'function') {
        window.__autoScrollerOverlay.showBottomPrompt(state.suspectedInfinite ? 'infinite' : 'normal');
      }
    }

    detectInfiniteScroll();

    requestAnimationFrame(tick);
  }

  function startScrolling() {
    if (state.isScrolling) return;
    state.container = selectScrollContainer();
    state.isScrolling = true;
    state.isPaused = false;
    state.lastTick = 0;
    requestAnimationFrame(tick);
    publishState();
  }

  function stopScrolling() {
    state.isScrolling = false;
    state.isPaused = false;
    state.lastTick = 0;
    publishState();
  }

  function pauseScrolling() {
    if (!state.isScrolling) return;
    state.isPaused = true;
    publishState();
  }

  function resumeScrolling() {
    if (!state.isScrolling) return;
    state.isPaused = false;
    requestAnimationFrame(tick);
    publishState();
  }

  function setSpeed(v) {
    state.speed = clampSpeed(v);
    publishState();
  }

  function adjustSpeed(delta) {
    setSpeed(state.speed + delta);
  }

  function toggleStartStop(){
    if (state.isScrolling) stopScrolling();
    else startScrolling();
  }

  function togglePauseResume(){
    if (!state.isScrolling) return;
    if (state.isPaused) resumeScrolling();
    else pauseScrolling();
  }

  function publishState(){
    chrome.runtime.sendMessage({ type: 'STATE_UPDATE', payload: {
      isScrolling: state.isScrolling,
      isPaused: state.isPaused,
      speed: state.speed
    }});
    window.dispatchEvent(new CustomEvent('autoscroll:state', { detail: {
      isScrolling: state.isScrolling,
      isPaused: state.isPaused,
      speed: state.speed
    }}));
  }

  // 处理来自 background/popup 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message?.type) {
      case 'TOGGLE_START_STOP':
        toggleStartStop();
        sendResponse({ ok: true });
        break;
      case 'TOGGLE_PAUSE_RESUME':
        togglePauseResume();
        sendResponse({ ok: true });
        break;
      case 'SET_SPEED':
        setSpeed(message.payload?.speed ?? state.speed);
        sendResponse({ ok: true });
        break;
      case 'ADJUST_SPEED':
        adjustSpeed(message.delta ?? 0);
        sendResponse({ ok: true });
        break;
      case 'QUERY_STATE':
        sendResponse({ ok: true, payload: {
          isScrolling: state.isScrolling,
          isPaused: state.isPaused,
          speed: state.speed
        }});
        break;
      default:
        break;
    }
  });

  // 导出到全局，避免重复初始化
  window.__autoScrollerEngine = {
    startScrolling,
    stopScrolling,
    pauseScrolling,
    resumeScrolling,
    setSpeed,
    adjustSpeed,
    toggleStartStop,
    togglePauseResume,
    getState: () => state
  };

  console.log('AutoScroller engine initialized');
}