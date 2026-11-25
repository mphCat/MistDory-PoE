'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),{spawn}=require('child_process');
class CDP {
  constructor(socket) {
    this.socket = socket; this.sequence = 0; this.pending = new Map(); this.listeners = new Map();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id); clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(message.error.message)); else pending.resolve(message.result);
      } else {
        for (const listener of this.listeners.get(message.method) || []) listener(message.params, message.sessionId);
      }
    });
  }
  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    return new CDP(socket);
  }
  on(method, listener) { if (!this.listeners.has(method)) this.listeners.set(method, []); this.listeners.get(method).push(listener); }
  send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 20000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  close() { this.socket.close(); }
}




const BASE=process.env.MISTDORY_QA_URL||'http://127.0.0.1:8003';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let chrome,browser,page;let checks=0;const errors=[];
function ok(value,message){if(!value)throw new Error(message);checks++;console.log('PASS '+message);}
async function evalCode(expression){const result=await page.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
async function go(url){await page.send('Page.navigate',{url});for(let i=0;i<100;i++){await pause(80);if(await evalCode("!!document.querySelector('#farms, #crafting') || !!document.querySelector('#poe2Notice:not([hidden])')"))return;}throw new Error('Load timeout '+url);}
(async()=>{
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mist-guides-browser-'));
chrome=spawn(process.env.MISTDORY_QA_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--remote-allow-origins=*','--user-data-dir='+path.join(dir,'profile'),'about:blank'],{windowsHide:true,cwd:os.tmpdir(),stdio:['ignore','ignore','pipe']});
let log='',endpoint;chrome.stderr.on('data',c=>{log+=c;endpoint=/DevTools listening on (ws:\/\/[^\s]+)/.exec(log)?.[1];});for(let i=0;i<150&&!endpoint;i++)await pause(100);if(!endpoint)throw new Error(log);
browser=await CDP.connect(endpoint);const target=await browser.send('Target.createTarget',{url:'about:blank'});const list=await fetch('http://127.0.0.1:'+new URL(endpoint).port+'/json/list').then(r=>r.json());page=await CDP.connect(list.find(t=>t.id===target.targetId).webSocketDebuggerUrl);await page.send('Page.enable');await page.send('Runtime.enable');page.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.text));
for(const width of [1440,1024,390])for(const lang of ['en','vi']){
await page.send('Emulation.setDeviceMetricsOverride',{width,height:950,deviceScaleFactor:1,mobile:width===390});await go(BASE+'/guides.html?game=poe1&lang='+lang);
ok(await evalCode("document.querySelectorAll('.guide-section').length===5"),width+' '+lang+' five sections');
ok(await evalCode("document.querySelectorAll('#atlasCards article').length===2"),'two current Atlas');
ok(await evalCode("document.documentElement.scrollWidth<=innerWidth"),'no horizontal overflow');
ok(await evalCode("document.documentElement.lang==="+JSON.stringify(lang)),lang+' language');
ok(await evalCode("document.querySelector('#ultimatum-thread').innerText.includes('TESTING DONT FOLLOW YET')"),'experimental warning kept');
ok(await evalCode("!document.querySelector('#crafting')"),'Crafting is not a sixth guide section');
await evalCode("document.querySelector('#atlasPatch').value='3.29';document.querySelector('#atlasPatch').dispatchEvent(new Event('change'))");ok(await evalCode("document.querySelectorAll('#atlasCards article').length===8"),'archive filter');
const screenshot=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(dir,width+'-'+lang+'.png'),Buffer.from(screenshot.data,'base64'));
}
await evalCode("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied')}}});document.execCommand=()=>false;document.querySelector('#regex button').click()");await pause(150);
ok(await evalCode("document.querySelector('#regex .copy-status').innerText.includes('thất bại')"),'clipboard denial gives failure');
await evalCode("navigator.clipboard.writeText=async v=>{window.copiedValue=v};document.querySelector('#regex button').click()");await pause(100);ok(await evalCode("window.copiedValue===document.querySelector('#regex textarea').value"),'clipboard preserves exact source');
await go(BASE+'/guides.html?game=poe2&lang=vi');ok(await evalCode("!document.querySelector('#poe2Notice').hidden&&!document.querySelector('#atlas')"),'PoE2 scope notice');
await page.send('Page.navigate',{url:BASE+'/index.html?game=poe1&lang=vi'});await pause(800);ok(await evalCode("document.querySelector('[data-guide-link]').href.includes('lang=vi')&&document.querySelector('[data-guide-link]').href.includes('game=poe1')"),'Home links preserve language and realm');ok(await evalCode("document.querySelector('[data-build-game=poe1]').href.includes('17157168')"),'Builds points to 3.30');
await go(BASE+'/guides.html?game=poe1&lang=en#atlas-329-6');ok(await evalCode("document.querySelector('#atlasPatch').value==='3.29' && !!document.getElementById('atlas-329-6')"),'archived Atlas deep link');
await page.send('Network.enable');await page.send('Network.setBlockedURLs',{urls:['*guides-poe1.json*']});await page.send('Page.navigate',{url:BASE+'/guides.html?lang=vi'});await pause(500);ok(await evalCode("document.querySelector('#guideContent').innerText.includes('Không tải được')"),'guide fetch failure localized');await page.send('Network.setBlockedURLs',{urls:[]});await evalCode("document.querySelector('#guideContent button').click()");await pause(400);ok(await evalCode("!!document.querySelector('#farms')"),'guide retry recovers');

await evalCode("localStorage.setItem('mistdory.realm','poe2')");
await go(BASE+'/guides.html?lang=en');
ok(await evalCode("MistSite.getRealm()==='poe2' && !document.querySelector('#poe2Notice').hidden && !document.querySelector('#atlas')"),'saved PoE2 preference scopes direct guide route');
await go(BASE+'/guides.html?game=poe1&lang=en');
ok(await evalCode("MistSite.getRealm()==='poe1' && !!document.querySelector('#atlas')"),'explicit PoE1 overrides saved preference');
await evalCode("localStorage.setItem('mistdory.realm','poe1')");
await page.send('Network.setBlockedURLs',{urls:['*guides-poe1.json*']});
await page.send('Page.navigate',{url:BASE+'/guides.html?game=poe1&lang=en'});await pause(500);
ok(await evalCode("document.querySelector('#guideContent').innerText.includes('Guides could not be loaded')"),'English guide failure');
await evalCode("MistI18n.setLanguage('vi')");
ok(await evalCode("document.querySelector('#guideContent').innerText.includes('Không tải được') && document.querySelector('#guideContent button').textContent==='Thử lại'"),'failure and retry relocalize EN to VN');
await evalCode("MistI18n.setLanguage('en')");
ok(await evalCode("document.querySelector('#guideContent button').textContent==='Try again'"),'failure retry relocalizes VN to EN');
await page.send('Network.setBlockedURLs',{urls:[]});
const injection=await page.send('Page.addScriptToEvaluateOnNewDocument',{source:"const sourceFetch=window.fetch;window.fetch=(url,options)=>String(url).includes('guides-poe1.json')?new Promise(()=>{}):sourceFetch(url,options);"});
await page.send('Page.navigate',{url:BASE+'/guides.html?game=poe1&lang=en'});await pause(400);
ok(await evalCode("document.querySelector('#guideContent').innerText.includes('Loading guides')"),'English loading state');
await evalCode("MistI18n.setLanguage('vi')");
ok(await evalCode("document.querySelector('#guideContent').innerText.includes('Đang tải hướng dẫn') && !document.querySelector('#guideContent button')"),'loading relocalizes while pending without showing retry');
await page.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:injection.identifier});


await go(BASE+'/guides.html?game=poe1&lang=en#builds');
ok(await evalCode("document.querySelectorAll('.guide-sidebar-links a').length===5 && [...document.querySelectorAll('.guide-sidebar-links a')].map(a=>a.textContent).join('|')==='Atlas|Ultimatum|Build Progress|Regex|Farm Experiments'"),'exact five sidebar sections');
ok(await evalCode("document.querySelector('.build-guide-tree ul ul').innerText.includes('CWS Chieftain') && document.querySelector('.build-guide-tree ul ul').innerText.includes('CWS Gladiator') && !document.querySelector('.build-snapshots')"),'CWS parent exposes nested children without flattened snapshots');
for(const [view,count,ascendancy] of [['ravagebomb',3,'Chieftain'],['cws-chieftain',1,'Chieftain'],['cws-gladiator',4,'Gladiator']]){
await go(BASE+'/guides.html?game=poe1&lang=en&build='+view+'#builds');
ok(await evalCode("document.querySelectorAll('.build-snapshots article').length==="+count),'leaf '+view+' preserves source record count');
ok(await evalCode("[...document.querySelectorAll('.build-snapshots .guide-meta:first-child')].every(p=>p.innerText.includes('"+ascendancy+"'))"),'leaf '+view+' has correct ascendancy');
ok(await evalCode("document.querySelector('.build-guide-tree a[aria-current=page]').href.includes('build='+"+JSON.stringify(view)+")"),'leaf '+view+' active hierarchy URL');
}
for(const width of [1440,1024,390]){
await page.send('Emulation.setDeviceMetricsOverride',{width,height:950,deviceScaleFactor:1,mobile:width===390});await go(BASE+'/guides.html?game=poe1&lang=vi');
await evalCode("document.querySelector('#regex').scrollIntoView()");await pause(120);
ok(await evalCode("document.documentElement.scrollWidth<=innerWidth"),'sidebar '+width+' has no horizontal overflow');
ok(await evalCode("document.querySelector('.guide-sidebar-links a[aria-current]').hash==='#regex' && document.querySelector('#guideSectionSelect').value==='regex'"),'sidebar '+width+' active section follows scroll');
ok(await evalCode("document.querySelector('#regex').getBoundingClientRect().top>=document.querySelector('.nav').getBoundingClientRect().bottom"),'section '+width+' is below sticky header');
if(width>760){ok(await evalCode("document.querySelector('.guide-sidebar').getBoundingClientRect().right<document.querySelector('#guideContent').getBoundingClientRect().left"),'sidebar '+width+' stays on left');await evalCode("document.querySelector('.guide-sidebar-links a[href=\"#farms\"]').focus()");await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await pause(100);ok(await evalCode("location.hash==='#farms'"),'sidebar '+width+' keyboard Enter navigates');}
else {await evalCode("document.querySelector('#guideSectionSelect').focus()");await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'End',code:'End',windowsVirtualKeyCode:35});await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'End',code:'End',windowsVirtualKeyCode:35});await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await pause(100);ok(await evalCode("location.hash==='#farms' && document.querySelector('#guideSectionSelect').value==='farms'"),'mobile selector keyboard changes section');}
const shot=await page.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(dir,width+'-sidebar-vi.png'),Buffer.from(shot.data,'base64'));
}
await go(BASE+'/crafting.html?game=poe1&lang=vi');ok(await evalCode("document.body.dataset.page==='crafting' && document.querySelectorAll('#crafting article').length===2 && document.querySelectorAll('#crafting a,#crafting iframe').length===0"),'dedicated crafting has two honest placeholders');
ok(await evalCode("document.querySelector('[data-crafting-link]').pathname.endsWith('/crafting.html') && document.querySelector('[data-crafting-link]').href.includes('lang=vi')"),'Crafting menu points dedicated localized page');
await evalCode("localStorage.setItem('mistdory.realm','poe2')");await go(BASE+'/crafting.html?lang=vi');ok(await evalCode("!document.querySelector('#poe2Notice').hidden && !document.querySelector('#crafting')"),'Crafting respects stored PoE2 scope');
await go(BASE+'/guides.html?game=poe1&lang=vi#crafting');ok(await evalCode("location.pathname.endsWith('/crafting.html') && document.querySelectorAll('#crafting article').length===2"),'legacy crafting anchor reaches dedicated page');

await go(BASE+'/guides.html?game=poe1&lang=en&build=cws-gladiator#builds');
await evalCode("MistI18n.setLanguage('vi')");
ok(await evalCode("new URL(location.href).searchParams.get('build')==='cws-gladiator' && location.hash==='#builds' && document.querySelectorAll('.build-snapshots article').length===4"),'leaf guide survives language switch');
await go(BASE+'/guides.html?game=poe2&lang=vi&build=cws-chieftain#builds');
ok(await evalCode("document.querySelector('[data-poe1-guide]').href.includes('build=cws-chieftain') && document.querySelector('[data-poe1-guide]').href.includes('lang=vi')"),'realm scope return link preserves leaf and language');
await evalCode("document.querySelector('[data-poe1-guide]').click()");await pause(450);
ok(await evalCode("MistSite.getRealm()==='poe1' && document.querySelectorAll('.build-snapshots article').length===1"),'realm return opens correct leaf');
await evalCode("history.back()");await pause(450);
ok(await evalCode("MistSite.getRealm()==='poe2' && !document.querySelector('#poe2Notice').hidden && new URL(location.href).searchParams.get('build')==='cws-chieftain'"),'Back restores scoped leaf URL');
ok(errors.length===0,'no JS exceptions');console.log(JSON.stringify({checks,dir,errors}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{try{page?.close();await browser?.send('Browser.close');browser?.close();}catch{}chrome?.kill();});
