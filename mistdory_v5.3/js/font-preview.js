'use strict';

const fontOptions = {
  pirata: { family: 'Pirata One', weight: 400 },
  cormorant: { family: 'Cormorant Garamond', weight: 600 },
  uncial: { family: 'Uncial Antiqua', weight: 400 },
  oxanium: { family: 'Oxanium', weight: 600 },
  utmniagara: { family: 'Preview UTM Niagara', label: 'UTM Niagara', weight: 400, local: true },
  niagara: { family: 'Preview Niagara Solid', label: 'Niagara Solid', weight: 400, local: true },
  cinzel: { family: 'Cinzel', weight: 700 }
};
const fontStates = new Map();
const preview = document.getElementById('selectedPreview');
let selectedFont = 'oxanium';

function updateSelectedStatus() {
  const state = fontStates.get(selectedFont) || 'loading';
  const option = fontOptions[selectedFont];
  const name = option.label || option.family;
  preview.dataset.fontState = state;
  document.getElementById('selectedLoadStatus').textContent = state === 'ready'
    ? 'Đã tải đúng font ' + name + (option.local ? ' từ thiết bị.' : '.') + ' Chỉ áp dụng cho mẫu này.'
    : state === 'error'
      ? (option.local ? 'Không tìm thấy ' + name + ' trên thiết bị này. Hai mẫu Niagara cần font đã được cài.' : 'Không tải được font. Hãy kiểm tra kết nối Google Fonts rồi tải lại trang.')
      : 'Đang tải đúng font cho mẫu…';
}

function selectFont(key) {
  if (!fontOptions[key] || key === 'cinzel') return;
  selectedFont = key;
  const option = fontOptions[key];
  document.body.style.setProperty('--selected-font', '"' + option.family + '"');
  document.body.style.setProperty('--selected-weight', option.weight);
  document.getElementById('selectedFontName').textContent = option.label || option.family;
  for (const card of document.querySelectorAll('.font-option')) {
    card.classList.toggle('is-selected', card.dataset.font === key);
  }
  updateSelectedStatus();
}

function markFont(key, state) {
  fontStates.set(key, state);
  const card = key === 'cinzel' ? document.querySelector('.current-font') : document.querySelector('[data-font="' + key + '"]');
  card.dataset.fontState = state;
  document.querySelector('[data-font-status="' + key + '"]').textContent = state === 'ready'
    ? (fontOptions[key].local ? 'Font có trên thiết bị · ' : 'Font đã tải · ') + fontOptions[key].weight
    : (fontOptions[key].local ? 'Không tìm thấy font trên thiết bị này' : 'Chưa tải được font · Kiểm tra kết nối');
  if (selectedFont === key) updateSelectedStatus();
}

for (const input of document.querySelectorAll('input[name="headingFont"]')) {
  input.addEventListener('change', () => { if (input.checked) selectFont(input.value); });
}

for (const button of document.querySelectorAll('[data-theme]')) {
  button.addEventListener('click', () => {
    const purple = button.dataset.theme === 'poe2';
    document.documentElement.style.setProperty('--accent', purple ? '#7c3aed' : '#dc2626');
    for (const toggle of document.querySelectorAll('[data-theme]')) {
      toggle.setAttribute('aria-pressed', String(toggle === button));
    }
  });
}

selectFont('oxanium');
for (const [key, option] of Object.entries(fontOptions)) {
  if (!document.fonts) { markFont(key, 'error'); continue; }
  const timer = setTimeout(() => markFont(key, 'error'), 18000);
  document.fonts.load(option.weight + ' 48px "' + option.family + '"', 'MistDory Guides & Info').then(faces => {
    clearTimeout(timer);
    markFont(key, faces.length > 0 ? 'ready' : 'error');
  }).catch(() => {
    clearTimeout(timer);
    markFont(key, 'error');
  });
}
