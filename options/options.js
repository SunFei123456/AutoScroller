// options：读取/保存默认配置

const DEFAULTS = { defaultSpeed: 600, overlayEnabled: true };

function load(){
  chrome.storage.sync.get(DEFAULTS, (items) => {
    document.getElementById('defaultSpeed').value = items.defaultSpeed;
    document.getElementById('overlayEnabled').checked = items.overlayEnabled;
  });
}

function save(){
  const defaultSpeed = Number(document.getElementById('defaultSpeed').value) || DEFAULTS.defaultSpeed;
  const overlayEnabled = !!document.getElementById('overlayEnabled').checked;
  chrome.storage.sync.set({ defaultSpeed, overlayEnabled }, () => {
    const s = document.getElementById('status');
    s.style.display = 'block';
    setTimeout(() => { s.style.display = 'none'; }, 1200);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  load();
  document.getElementById('save').addEventListener('click', save);
});