/* Curated source notes, kept separate from generated YouTube catalogs. */
'use strict';
(() => {
  const I = window.MistI18n;
  const translations = {
    'Build Progress': 'Tiến trình build', 'Farm Experiments': 'Thử nghiệm farm', 'Atlas': 'Atlas', 'Ultimatum': 'Ultimatum', 'Regex': 'Regex',
    'Choose a section': 'Chọn mục', 'All build guides': 'Tất cả hướng dẫn build',
    'Build families': 'Nhóm build', 'Choose a CWS ascendancy to view its own source snapshots.': 'Chọn Ascendancy CWS để xem các bản ghi nguồn riêng.',
    'Choose a build family, then open a guide for its recorded PoBs, videos and notes.': 'Chọn nhóm build, rồi mở hướng dẫn để xem PoB, video và ghi chú nguồn.',
    'Guide not found. Choose a build from the library.': 'Không tìm thấy hướng dẫn. Hãy chọn build trong thư viện.',
    'MistDory — Crafting': 'MistDory — Crafting', 'Crafting walkthroughs': 'Hướng dẫn Crafting',
    'PoE 1 crafting videos are being prepared.': 'Video Crafting PoE 1 đang được chuẩn bị.',
    'Guides': 'Hướng dẫn', 'PoE 1 field notes': 'Ghi chép PoE 1',
    'MistDory — PoE 1 Guides': 'MistDory — Hướng dẫn PoE 1', 'Guide sections': 'Các mục hướng dẫn',
    'Choose a strategy. Follow your progression.': 'Chọn cách farm. Theo dõi tiến trình build.',
    'Atlas library': 'Thư viện Atlas', 'Ultimatum 3.30': 'Ultimatum 3.30',
    'Build progression': 'Tiến trình build', 'Regex library': 'Thư viện regex',
    'Crafting videos': 'Video Crafting', 'Farm experiments': 'Thử nghiệm farm',
    'Workbook inspected: 25 November 2026. Patch labels describe the source, not a current-patch recommendation.': 'Đọc tài liệu ngày 25/11/2026. Nhãn patch mô tả nguồn, không có nghĩa là khuyến nghị cho patch hiện tại.',
    'Open source workbook': 'Mở tài liệu nguồn', 'Loading guides…': 'Đang tải hướng dẫn…',
    'Guides could not be loaded. Please try again.': 'Không tải được hướng dẫn. Vui lòng thử lại.',
    'Try again': 'Thử lại', 'Patch': 'Patch', 'All patches': 'Tất cả patch',
    'Source notes': 'Ghi chép từ nguồn', 'Archived patch': 'Patch lưu trữ',
    'Testing — do not follow yet': 'Đang thử nghiệm — chưa làm theo',
    'Open Atlas tree': 'Mở cây Atlas', 'View source': 'Xem nguồn',
    'Source-documented setup; owner recommendation and testing date are not confirmed.': 'Setup có trong tài liệu; chưa xác nhận khuyến nghị của tác giả và ngày kiểm thử.',
    'Historical setup. Compatibility with another patch has not been checked.': 'Setup cũ. Chưa kiểm tra khả năng áp dụng cho patch khác.',
    'No Atlas entries for this patch.': 'Chưa có Atlas cho patch này.',
    'Reward selection from the source flowchart': 'Chọn phần thưởng theo sơ đồ nguồn',
    'Enter a map and find Ultimatum.': 'Vào map và tìm Ultimatum.',
    'The source flowchart selects Catalyst / Inscribed rewards; other rewards are crossed out.': 'Sơ đồ nguồn chọn Catalyst / Inscribed; các phần thưởng khác được gạch bỏ.',
    'Find a Boss Card (new league mechanic); the source selects Currency / Rarity (lv2–3).': 'Tìm Boss Card (cơ chế league trong tài liệu); nguồn chọn Currency / Rarity (lv2–3).',
    'Map trade search from the source': 'Tìm map trên trade theo nguồn',
    'Before following this setup': 'Trước khi làm theo setup',
    'Exact scarabs, point progression, map preparation and suitable build requirements still need confirmation. The source notation 8+2 / 8 is retained without interpretation. Do not substitute the 3.29 scarab list for a 3.30 setup.': 'Cần xác nhận scarab, thứ tự tăng điểm, cách chuẩn bị map và yêu cầu build. Giữ nguyên ký hiệu 8+2 / 8 từ nguồn, chưa diễn giải. Không dùng danh sách scarab 3.29 thay cho setup 3.30.',
    'Open the Atlas library': 'Mở thư viện Atlas', 'Use the map and Inscribed regex below': 'Dùng regex map và Inscribed bên dưới',
    'These are source snapshots, not mandatory upgrade steps. Check the PoB and its notes before changing gear. Costs are historical source notes.': 'Đây là các bản ghi trong tài liệu, không phải các bước nâng cấp bắt buộc. Kiểm tra PoB và ghi chú trước khi đổi đồ. Chi phí là ghi chép cũ từ nguồn.',
    'Open PoB': 'Mở PoB', 'Video from another patch:': 'Video từ patch khác:',
    'Source video:': 'Video trong nguồn:', 'Original source note:': 'Ghi chú gốc:',
    'Archived sheets and event builds': 'Bảng cũ và build sự kiện',
    'Copy exact source text, including quotes and capitalization. These expressions are not executed on this website. Check length limits and suitability in game.': 'Sao chép nguyên văn nguồn, gồm dấu ngoặc kép và chữ hoa/thường. Website không chạy các biểu thức này. Kiểm tra giới hạn độ dài và mức phù hợp trong game.',
    'Copy': 'Sao chép', 'Copied.': 'Đã sao chép.',
    'Copy failed. Select the text and copy it manually.': 'Sao chép thất bại. Chọn nội dung và sao chép thủ công.',
    'Video coming later': 'Chờ video hướng dẫn',
    'Mist will record a YouTube walkthrough. Item targets and crafting steps will be added with the video.': 'Mist sẽ quay hướng dẫn trên YouTube. Món đồ mục tiêu và các bước craft sẽ được bổ sung cùng video.',
    'No recipe or video is available yet.': 'Chưa có công thức hoặc video.',
    'Historical observations from the 3.30 sheet. Prices, run time and outcomes vary. These are not income forecasts.': 'Ghi chép thử nghiệm từ bảng 3.30. Giá, thời gian chạy và kết quả có thể thay đổi. Đây không phải dự báo thu nhập.',
    'Source field': 'Mục trong nguồn', 'Recorded value': 'Giá trị ghi nhận',
    'Rare jackpot, shown separately:': 'Vật phẩm hiếm rơi đột biến, ghi riêng:',
    'The source mixes Cost / Div / Profit and headline returns. Net profit and whether all costs or jackpots are included have not been reconciled. Shorthand is preserved as recorded.': 'Nguồn dùng lẫn Cost / Div / Profit và tổng thu. Chưa đối soát lợi nhuận ròng, chi phí đã tính đủ hay chưa và vật phẩm hiếm có được tính vào tổng thu không. Giữ nguyên ký hiệu trong nguồn.',
    'This library currently contains PoE 1 notes only. PoE 2 guides are not available here yet.': 'Thư viện hiện chỉ có ghi chép PoE 1. Chưa có hướng dẫn PoE 2 tại đây.',
    'Browse PoE 1 guides': 'Xem hướng dẫn PoE 1', 'Back to PoE 2': 'Về PoE 2',
    'No source note recorded.': 'Nguồn chưa ghi chú.', 'Current source patch': 'Patch mới nhất trong tài liệu'
  };
  I.addTranslations(translations);
  const root = document.getElementById('guideContent');
  let data;
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const tr = (tag, text, className) => {
    const node = el(tag, I.t(text), className);
    node.dataset.i18n = text;
    return node;
  };
  function link(text, url) {
    const node = el('a', text);
    const safe = window.MistUrlPolicy.safeExternalUrl(url);
    if (!safe) return el('span', text);
    node.href = safe; node.target = '_blank'; node.rel = 'noopener noreferrer';
    return node;
  }
  const sourceLink = url => link(I.t('View source'), url);
  function section(id, title) {
    const node = el('section', null, 'guide-section'); node.id = id;
    node.setAttribute('aria-labelledby', id + 'Title');node.tabIndex=-1;
    const heading = tr('h2', title); heading.id = id + 'Title'; node.append(heading); root.append(node); return node;
  }
  function renderAtlas() {
    const host = document.getElementById('atlasCards'); host.replaceChildren();
    const patch = document.getElementById('atlasPatch').value;
    const entries = data.atlas.filter(item => patch === 'all' || item.patch === patch);
    for (const item of entries) {
      const card = el('article', null, 'guide-card'); card.id = item.id;
      card.append(el('p', 'PoE 1 · ' + item.patch, 'guide-meta'), el('h3', item.title));
      card.append(tr('p', item.status === 'testing' ? 'Testing — do not follow yet' : item.status === 'archived' ? 'Archived patch' : 'Source notes', 'guide-status '+(item.status === 'testing'?'testing':'')));
      if (item.status !== 'testing') card.append(tr('p', item.status === 'archived' ? 'Historical setup. Compatibility with another patch has not been checked.' : 'Source-documented setup; owner recommendation and testing date are not confirmed.'));
      const actions = el('div', null, 'guide-actions'); actions.append(link(I.t('Open Atlas tree'), item.url), sourceLink(item.source)); card.append(actions); host.append(card);
    }
    if (!entries.length) host.append(tr('p', 'No Atlas entries for this patch.'));
  }
  async function copyRegex(value, field, status) {
    let copied = false;
    try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); copied = true; } } catch { /* Try the selectable-text fallback. */ }
    if (!copied) {
      const position = window.scrollY;
      field.focus(); field.select();
      try { copied = document.execCommand('copy') === true; } catch { copied = false; }
      window.scrollTo(0, position);
    }
    status.textContent = I.t(copied ? 'Copied.' : 'Copy failed. Select the text and copy it manually.');
  }

  const buildViews = {
    ravagebomb: {title:'RavageBomb', group:'Ravage Bomb'},
    'cws-chieftain': {title:'CWS Chieftain', group:'Fire CWS Chieftain'},
    'cws-gladiator': {title:'CWS Gladiator', group:'Fire CWS Gladiator'}
  };
  function buildLink(title, view) {
    const a=el('a',title);a.href=window.MistSite.url('guides.html',{game:window.MistSite.getRealm(),build:view,patch:new URL(location.href).searchParams.get('patch')})+'#builds';return a;
  }
  function renderBuilds() {
    const builds=section('builds','Build Progress');
    const view=new URL(location.href).searchParams.get('build')||'';
    const tree=el('nav',null,'build-guide-tree');tree.setAttribute('aria-label',I.t('Build families'));
    const listTree=el('ul');const cws=el('li');const cwsLink=buildLink('CWS','cws');cws.append(cwsLink);
    const children=el('ul');for(const key of ['cws-chieftain','cws-gladiator']){const li=el('li');const a=buildLink(buildViews[key].title,key);if(view===key)a.setAttribute('aria-current','page');li.append(a);children.append(li);}cws.append(children);listTree.append(cws);
    const ravage=el('li');const ravageLink=buildLink('RavageBomb','ravagebomb');if(view==='ravagebomb')ravageLink.setAttribute('aria-current','page');ravage.append(ravageLink);listTree.append(ravage);if(view==='cws')cwsLink.setAttribute('aria-current','page');tree.append(listTree);builds.append(tree);
    if(view){const back=buildLink(I.t('All build guides'),'');builds.append(back);}
    if(!view){builds.append(tr('p','Choose a build family, then open a guide for its recorded PoBs, videos and notes.'));}
    else if(view==='cws'){builds.append(el('h3','CWS'),tr('p','Choose a CWS ascendancy to view its own source snapshots.'));}
    else if(!buildViews[view]){builds.append(tr('p','Guide not found. Choose a build from the library.'));}
    else {
      const definition=buildViews[view];
      builds.append(el('h3',definition.title),tr('p','These are source snapshots, not mandatory upgrade steps. Check the PoB and its notes before changing gear. Costs are historical source notes.'));
      const records=data.builds.filter(item=>item.group===definition.group);
      const list=el('div',null,'guide-grid build-snapshots');
      for(const item of records) {
        const card=el('article',null,'guide-card');card.id=item.id;card.append(el('p','PoE 1 · '+item.patch+' · '+item.ascendancy,'guide-meta'),el('h4',item.title),tr('p','Original source note:','guide-meta'),el('p',item.note||I.t('No source note recorded.')));
        const actions=el('div',null,'guide-actions');actions.append(link(I.t('Open PoB'),item.pob),sourceLink(item.source));card.append(actions);
        if(item.video.url) {card.append(tr('p',item.video.patch!==item.patch?'Video from another patch:':'Source video:','guide-meta'),link(item.video.title,item.video.url));}list.append(card);
      }builds.append(list);
    }
    builds.append(tr('h3','Archived sheets and event builds'));const archive=el('div',null,'guide-actions');
    data.patches.filter(item=>item.patch!=='3.30').forEach(item=>archive.append(link(item.patch,item.url)));builds.append(archive);

  }
  function renderCrafting() {
    const crafting=section('crafting','Crafting videos');const craftCards=el('div',null,'guide-grid');
    for(const item of data.crafting) {const card=el('article',null,'guide-card');card.id=item.id;card.append(el('h3',item.title),tr('p','Video coming later','guide-status'),tr('p','Mist will record a YouTube walkthrough. Item targets and crafting steps will be added with the video.'),tr('p','No recipe or video is available yet.','guide-meta'));craftCards.append(card);}crafting.append(craftCards);
  }
  let trackingFrame=0;
  function updateSectionNavigation() {
    trackingFrame=0;
    const header=document.querySelector('.nav');const sidebar=document.querySelector('.guide-sidebar');
    const headerHeight=Math.ceil(header?.getBoundingClientRect().height||0);
    document.documentElement.style.setProperty('--guide-header-height',headerHeight+'px');
    if(!sidebar||sidebar.hidden)return;
    const mobile=matchMedia('(max-width:760px)').matches;
    const offset=headerHeight+(mobile?sidebar.getBoundingClientRect().height:0)+24;
    document.documentElement.style.setProperty('--guide-scroll-offset',offset+'px');
    const sections=[...root.querySelectorAll('.guide-section')];let active=sections[0]?.id;
    for(const section of sections){if(section.getBoundingClientRect().top<=offset+8)active=section.id;}
    sidebar.querySelectorAll('.guide-sidebar-links a').forEach(a=>{if(a.hash==='#'+active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    const select=document.getElementById('guideSectionSelect');if(select&&active)select.value=active;
  }
  function queueSectionNavigation(){if(!trackingFrame)trackingFrame=requestAnimationFrame(updateSectionNavigation);}
  window.addEventListener('scroll',queueSectionNavigation,{passive:true});window.addEventListener('resize',queueSectionNavigation);
  const header=document.querySelector('.nav');if(header&&typeof ResizeObserver!=='undefined')new ResizeObserver(queueSectionNavigation).observe(header);
  document.getElementById('guideSectionSelect')?.addEventListener('change',event=>{const target=document.getElementById(event.target.value);if(!target)return;history.replaceState(null,'',location.pathname+location.search+'#'+target.id);target.scrollIntoView();target.focus({preventScroll:true});queueSectionNavigation();});
  document.querySelectorAll('.guide-sidebar-links a').forEach(a=>a.addEventListener('click',()=>requestAnimationFrame(()=>{document.getElementById(a.hash.slice(1))?.focus({preventScroll:true});queueSectionNavigation();})));

  function render() {
    root.replaceChildren();
    const isPoe2 = window.MistSite.getRealm() === 'poe2';
    document.getElementById('poe2Notice').hidden = !isPoe2;
    const sidebar=document.querySelector('.guide-sidebar');if(sidebar)sidebar.hidden=isPoe2;
    if (isPoe2) { I.apply();queueSectionNavigation();return; }
    if(document.body.dataset.page==='crafting'){renderCrafting();I.apply();queueSectionNavigation();return;}
    const atlas = section('atlas', 'Atlas library');
    const filter = el('div', null, 'guide-filter'); const label = tr('label', 'Patch'); label.htmlFor = 'atlasPatch';
    const select = el('select'); select.id = 'atlasPatch';
    for (const patch of ['3.30','3.29','3.27','all']) {const option = el('option',patch === 'all'?I.t('All patches'):patch);option.value=patch;select.append(option);}
    const requested = new URL(location.href).searchParams.get('patch'); if (['3.30','3.29','3.27','all'].includes(requested)) select.value=requested; else { const linked=data.atlas.find(item=>'#'+item.id===location.hash); if(linked) select.value=linked.patch; }
    select.addEventListener('change',()=>{const url=new URL(location.href);url.searchParams.set('patch',select.value);history.replaceState(null,'',url.pathname+url.search+url.hash);renderAtlas();});
    filter.append(label,select); const cards=el('div',null,'guide-grid');cards.id='atlasCards';atlas.append(filter,cards);renderAtlas();
    const ultimatum=section('ultimatum','Ultimatum 3.30');
    ultimatum.append(tr('h3','Reward selection from the source flowchart'));
    const steps=el('ol',null,'guide-steps');data.ultimatum.flow.forEach(step=>steps.append(tr('li',step.en)));ultimatum.append(steps);
    const actions=el('div',null,'guide-actions');actions.append(link(I.t('Map trade search from the source'),data.ultimatum.mapUrl),sourceLink(data.ultimatum.source));
    const atlasJump=tr('a','Open the Atlas library');atlasJump.href='#atlas'; const regexJump=tr('a','Use the map and Inscribed regex below');regexJump.href='#regex';actions.append(atlasJump,regexJump);ultimatum.append(actions,tr('h3','Before following this setup'),tr('p','Exact scarabs, point progression, map preparation and suitable build requirements still need confirmation. The source notation 8+2 / 8 is retained without interpretation. Do not substitute the 3.29 scarab list for a 3.30 setup.','guide-caution'));
    renderBuilds();
    const regex=section('regex','Regex library');regex.append(tr('p','Copy exact source text, including quotes and capitalization. These expressions are not executed on this website. Check length limits and suitability in game.'));
    for(const item of data.regex) {const card=el('article',null,'guide-card regex-card');card.id=item.id;const heading=el('h3',item.title+' · '+item.patch);heading.id=item.id+'Title';const field=el('textarea');field.value=item.value;field.readOnly=true;field.rows=3;field.setAttribute('aria-labelledby',heading.id);const button=tr('button','Copy');button.type='button';button.setAttribute('aria-label',I.t('Copy')+' '+item.title);const status=el('p',null,'copy-status');status.setAttribute('role','status');button.addEventListener('click',()=>copyRegex(item.value,field,status));const actions=el('div',null,'guide-actions');actions.append(button,sourceLink(item.source));card.append(heading,field,actions,status);regex.append(card);}
    const farms=section('farms','Farm experiments');farms.append(tr('p','Historical observations from the 3.30 sheet. Prices, run time and outcomes vary. These are not income forecasts.'));
    for(const item of data.farms) {const article=el('article',null,'guide-card farm-card');article.id=item.id;article.append(el('h3',item.title));const table=el('table');const caption=el('caption','PoE 1 · '+item.patch);table.append(caption);const head=el('thead');const hr=el('tr');hr.append(tr('th','Source field'),tr('th','Recorded value'));head.append(hr);const body=el('tbody');for(const line of item.lines){if(line.label==='Big' && item.jackpot)continue;const row=el('tr');const th=el('th',line.label);th.scope='row';row.append(th,el('td',line.value));body.append(row);}table.append(head,body);article.append(table);if(item.jackpot)article.append(el('p',I.t('Rare jackpot, shown separately:')+' '+item.jackpot,'guide-caution'));article.append(tr('p','The source mixes Cost / Div / Profit and headline returns. Net profit and whether all costs or jackpots are included have not been reconciled. Shorthand is preserved as recorded.','guide-meta'),sourceLink(item.source));farms.append(article);}
    I.apply();updateSectionNavigation();
    if(location.hash){let id=location.hash.slice(1);try{id=decodeURIComponent(id);}catch{}document.getElementById(id)?.scrollIntoView();}
  }
  async function load() {
    root.replaceChildren(tr('p','Loading guides…'));
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),15000);
    try { const response=await fetch('data/guides-poe1.json',{signal:controller.signal});if(!response.ok)throw new Error('HTTP '+response.status);const loaded=await response.json();if(loaded.schemaVersion!==1||loaded.game!=='poe1'||!['atlas','builds','regex','crafting','farms','patches'].every(key=>Array.isArray(loaded[key])))throw new Error('Invalid guide data');data=loaded;render(); }
    catch {root.replaceChildren(tr('p','Guides could not be loaded. Please try again.'));const retry=tr('button','Try again');retry.type='button';retry.addEventListener('click',load);root.append(retry);}
    finally {clearTimeout(timer);}
  }
  window.addEventListener('mistdory:languagechange',()=>{if(data)render();else I.apply(root);});
  if(document.body.dataset.page!=='crafting'&&location.hash==='#crafting'){location.replace(window.MistSite.url('crafting.html',{game:window.MistSite.getRealm()}));return;}
  I.apply();load();
})();
