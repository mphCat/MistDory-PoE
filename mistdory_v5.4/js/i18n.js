/* Interface language and translations shared across v5.4. Video titles are source content. */
(function () {
  'use strict';
  const STORAGE_KEY = 'mistdory.language';
  const supported = ['en', 'vi'];
  const translations = {
  "Main navigation": "Điều hướng chính",
  "Home": "Trang chủ",
  "Builds": "Builds",
  "Crafting": "Crafting",
  "Crafting — coming soon": "Crafting — sắp có",
  "Videos": "Video",
  "FAQ": "Hỏi đáp",
  "FAQ — coming soon": "Hỏi đáp — sắp có",
  "Soon": "Sắp có",
  "Support Mist": "Ủng hộ Mist",
  "About": "Giới thiệu",
  "Useful resources": "Tài nguyên hữu ích",
  "Website language": "Ngôn ngữ website",
  "MistDory — Path of Exile Hub": "MistDory — Cổng thông tin Path of Exile",
  "MistDory — Path of Exile builds, crafting guides and featured videos.": "MistDory — Builds, hướng dẫn Crafting và video nổi bật về Path of Exile.",
  "Path of Exile Content Hub": "Cổng thông tin Path of Exile",
  "Path of Exile content hub": "Cổng thông tin Path of Exile",
  "Main server": "Máy chủ chính",
  "Craft Guides": "Hướng dẫn Crafting",
  "Loading…": "Đang tải…",
  "Featured YouTube Video": "Video YouTube nổi bật",
  "Having trouble playing?": "Bạn gặp khó khăn khi phát video?",
  "Watch on YouTube": "Xem trên YouTube",
  "Try again": "Thử lại",
  "Guides & Info": "Hướng dẫn & Thông tin",
  "WIP Projects": "Dự án đang phát triển",
  "Written Guides": "Tài liệu hướng dẫn",
  "Leveling": "Leveling",
  "Miscellaneous": "Tổng hợp",
  "Builds, guides & gameplay": "Builds, hướng dẫn & trải nghiệm",
  "Videos from Mist": "Video của Mist",
  "All videos": "Tất cả video",
  "Search videos": "Tìm video",
  "Search builds, skills, videos…": "Tìm build, kỹ năng, video…",
  "Video category": "Danh mục video",
  "Sort videos": "Sắp xếp video",
  "All Categories": "Tất cả danh mục",
  "Latest": "Mới nhất",
  "Most viewed": "Xem nhiều nhất",
  "Playlist order": "Thứ tự danh sách phát",
  "Name A–Z": "Tên A–Z",
  "Loading videos…": "Đang tải video…",
  "All Videos — MistDory": "Tất cả video — MistDory",
  "Browse MistDory's public Path of Exile and Path of Exile 2 videos by latest, most viewed or keyword, with ten videos per page.": "Khám phá video công khai về Path of Exile và Path of Exile 2 của MistDory theo thời gian, lượt xem hoặc từ khóa, với mười video mỗi trang.",
  "← Back to homepage": "← Về trang chủ",
  "All videos from Mist": "Tất cả video của Mist",
  "Find your next build, guide or gameplay video. Browse up to ten videos per page.": "Tìm video build, hướng dẫn hoặc trải nghiệm tiếp theo. Mỗi trang hiển thị tối đa mười video.",
  "Video pages": "Các trang video",
  "Mist's build library": "Thư viện build của Mist",
  "Choose your build sheet": "Chọn build theo game",
  "Close build picker": "Đóng hộp chọn build",
  "Pick your game. Each sheet opens in a new tab.": "Chọn trò chơi. Mỗi bảng hướng dẫn sẽ mở trong một tab mới.",
  "PoE 1 Builds": "PoE 1 Builds",
  "PoE 2 Builds": "PoE 2 Builds",
  "Path of Exile 1 builds by Mist": "Builds Path of Exile 1 của Mist",
  "Path of Exile 2 builds by Mist": "Builds Path of Exile 2 của Mist",
  "Also explore PoE 2 builds on Mobalytics ↗": "Xem thêm build PoE 2 trên Mobalytics ↗"
};
  let language = preferredLanguage();

  function preferredLanguage() {
    const requested = new URL(window.location.href).searchParams.get('lang');
    if (supported.includes(requested)) return requested;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (supported.includes(saved)) return saved;
    } catch { /* Language URLs work without browser storage. */ }
    return 'en';
  }

  function t(source, values = {}) {
    const phrase = language === 'vi' ? (translations[source] ?? source) : source;
    return String(phrase).replace(/\{(\w+)\}/g, (match, key) =>
      Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match);
  }

  function addTranslations(values) {
    for (const [source, translated] of Object.entries(values)) {
      if (typeof translated === 'string') translations[source] = translated;
    }
  }

  function apply(root = document) {
    const selector = '[data-i18n], [data-i18n-aria-label], [data-i18n-placeholder], [data-i18n-content], [data-i18n-title]';
    const elements = [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)];
    for (const element of elements) {
      if (element.hasAttribute('data-i18n')) element.textContent = t(element.dataset.i18n);
      for (const attribute of ['aria-label', 'placeholder', 'content', 'title']) {
        const source = element.getAttribute('data-i18n-' + attribute);
        if (source !== null) element.setAttribute(attribute, t(source));
      }
    }
    syncSwitches();
  }

  function syncSwitches() {
    document.querySelectorAll('.language-switch').forEach(control => {
      control.setAttribute('aria-label', t('Website language'));
      control.querySelectorAll('[data-language]').forEach(button =>
        button.setAttribute('aria-pressed', String(button.dataset.language === language)));
    });
  }

  function setLanguage(next) {
    if (!supported.includes(next)) return;
    const changed = next !== language;
    language = next;
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
    try { localStorage.setItem(STORAGE_KEY, language); } catch { /* Optional preference storage. */ }
    const url = new URL(window.location.href);
    url.searchParams.set('lang', language);
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    if (changed) {
      apply();
      window.dispatchEvent(new CustomEvent('mistdory:languagechange', { detail: { language } }));
    } else syncSwitches();
  }

  document.documentElement.lang = language;
  document.documentElement.dataset.language = language;
  window.MistI18n = {
    t, addTranslations, apply, setLanguage,
    getLanguage: () => language,
    getLocale: () => language === 'vi' ? 'vi-VN' : 'en-GB'
  };
  window.addEventListener('popstate', () => {
    const next = preferredLanguage();
    if (next === language) return;
    language = next;
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
    apply();
    window.dispatchEvent(new CustomEvent('mistdory:languagechange', { detail: { language } }));
  });
  document.addEventListener('DOMContentLoaded', () => apply());
})();
