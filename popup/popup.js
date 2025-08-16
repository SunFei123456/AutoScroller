// popup 逻辑：查询状态、绑定UI、发送控制命令

function sendMessage(msg){
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ from: 'popup', ...msg }, (resp) => resolve(resp));
  });
}

async function queryState(){
  const resp = await sendMessage({ type: 'QUERY_STATE' });
  return resp?.payload || { isScrolling: false, isPaused: false, speed: 600 };
}

function bindUI(){
  const startStop = document.getElementById('startStop');
  const pauseResume = document.getElementById('pauseResume');
  const speedRange = document.getElementById('speedRange');
  const speedLabel = document.getElementById('speedLabel');
  const openOptions = document.getElementById('openOptions');

  startStop.addEventListener('click', async () => {
    await sendMessage({ type: 'TOGGLE_START_STOP' });
    const s = await queryState();
    speedLabel.textContent = `${s.speed} px/s`;
  });

  pauseResume.addEventListener('click', async () => {
    await sendMessage({ type: 'TOGGLE_PAUSE_RESUME' });
    const s = await queryState();
    speedLabel.textContent = `${s.speed} px/s`;
  });

  speedRange.addEventListener('input', async (e) => {
    const v = Number(e.target.value);
    await sendMessage({ type: 'SET_SPEED', payload: { speed: v } });
    const s = await queryState();
    speedLabel.textContent = `${s.speed} px/s`;
  });

  openOptions.addEventListener('click', () => chrome.runtime.openOptionsPage());
}

(async function init(){
  bindUI();
  const s = await queryState();
  document.getElementById('speedLabel').textContent = `${s.speed} px/s`;
  document.getElementById('speedRange').value = String(s.speed);
})();