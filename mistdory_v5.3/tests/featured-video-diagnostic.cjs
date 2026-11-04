'use strict';

// Disposable Chrome evidence capture. Does not modify the website or JSON catalogs.
// Run with Node 22+; requires a running preview and outbound YouTube access.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const lib = require('../scripts/catalog-lib.cjs');
const BASE = process.env.MISTDORY_QA_URL || 'http://127.0.0.1:8002';
const CHROME = process.env.MISTDORY_QA_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP = fs.realpathSync(os.tmpdir());
const PREFIX = 'mistdory-v53-featured-diagnostic-';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let runDir, profile, chrome, browser, page;
const report = { base: BASE, startedAt: new Date().toISOString(), realms: [], warnings: [] };

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

async function evaluate(connection, fn, sessionId, contextId) {
  const result = await connection.send('Runtime.evaluate', {
    expression: '(' + fn.toString() + ')()', returnByValue: true, awaitPromise: true,
    ...(contextId ? { contextId } : {})
  }, sessionId);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

function snapshot() {
  const media = document.querySelector('video');
  const player = document.getElementById('movie_player');
  const available = document.createElement('video');
  let playerResponse, videoData, playerState;
  try { playerResponse = player?.getPlayerResponse?.() || window.ytInitialPlayerResponse; } catch {}
  try { videoData = player?.getVideoData?.(); playerState = player?.getPlayerState?.(); } catch {}
  const summarize = response => response ? {
    playabilityStatus: response.playabilityStatus,
    videoDetails: response.videoDetails ? { videoId: response.videoDetails.videoId, isPrivate: response.videoDetails.isPrivate, isLive: response.videoDetails.isLive, title: response.videoDetails.title } : null,
    formats: [...(response.streamingData?.formats || []), ...(response.streamingData?.adaptiveFormats || [])].map(item => ({ itag: item.itag, mimeType: item.mimeType, quality: item.qualityLabel }))
  } : null;
  return {
    location: location.href, referrer: document.referrer, userAgent: navigator.userAgent,
    bodyText: document.body?.innerText.slice(0, 6000), playerState,
    videoData: videoData ? { video_id: videoData.video_id, title: videoData.title, errorCode: videoData.errorCode } : null,
    player: summarize(playerResponse),
    media: media ? { error: media.error ? { code: media.error.code, message: media.error.message } : null,
      networkState: media.networkState, readyState: media.readyState, paused: media.paused,
      currentTime: media.currentTime, duration: Number.isFinite(media.duration) ? media.duration : null,
      currentSourceHost: (() => { try { return new URL(media.currentSrc).host || 'blob'; } catch { return ''; } })() } : null,
    codecs: Object.fromEntries([
      'video/mp4; codecs="avc1.42E01E"', 'video/mp4; codecs="avc1.640028"',
      'video/webm; codecs="vp9"', 'video/mp4; codecs="av01.0.08M.08"',
      'audio/mp4; codecs="mp4a.40.2"', 'audio/webm; codecs="opus"'
    ].map(type => [type, available.canPlayType(type)]))
  };
}

async function inspectFrame(contexts) {
  const targets = (await browser.send('Target.getTargets')).targetInfos;
  const target = targets.find(item => item.type === 'iframe' && /youtube(?:-nocookie)?\.com\/embed\//.test(item.url));
  if (target) {
    const attached = await browser.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    await browser.send('Runtime.enable', {}, attached.sessionId);
    return { connection: browser, sessionId: attached.sessionId, description: { type: 'out-of-process iframe', url: target.url } };
  }
  for (const context of [...contexts.values()].reverse()) {
    if (/youtube(?:-nocookie)?\.com/.test(context.origin) && context.auxData?.isDefault) {
      return { connection: page, contextId: context.id, description: { type: 'frame execution context', origin: context.origin } };
    }
  }
  return null;
}

async function launch() {
  runDir = fs.mkdtempSync(path.join(TEMP, PREFIX)); profile = path.join(runDir, 'chrome-profile'); fs.mkdirSync(profile);
  chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    '--remote-allow-origins=*', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, cwd: TEMP, stdio: ['ignore', 'ignore', 'pipe'] });
  let endpoint, launchError, stderr = '';
  chrome.on('error', error => { launchError = error; });
  chrome.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-10000); endpoint = /DevTools listening on (ws:\/\/[^\s]+)/.exec(stderr)?.[1] || endpoint; });
  for (let i = 0; i < 200 && !endpoint; i++) { if (launchError) throw launchError; await sleep(100); }
  if (!endpoint) throw new Error('Disposable Chrome did not expose its endpoint');
  browser = await CDP.connect(endpoint);
  report.browser = await browser.send('Browser.getVersion');
  const target = await browser.send('Target.createTarget', { url: 'about:blank' });
  const targets = await fetch('http://127.0.0.1:' + new URL(endpoint).port + '/json/list').then(response => response.json());
  page = await CDP.connect(targets.find(item => item.id === target.targetId).webSocketDebuggerUrl);
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
}

async function inspectRealm(realm) {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/' + realm + '.json'), 'utf8'));
  const id = catalog.meta.ytId;
  const entry = { realm, featuredId: id, network: [], responses: [], consoleExceptions: [] };
  report.realms.push(entry);
  const contexts = new Map();
  let capturing = true;
  const requests = new Map();
  const extraHeaders = new Map();
  page.on('Runtime.executionContextCreated', ({ context }) => { if (capturing) contexts.set(context.id, context); });
  page.on('Runtime.executionContextDestroyed', ({ executionContextId }) => contexts.delete(executionContextId));
  page.on('Runtime.exceptionThrown', params => { if (capturing) entry.consoleExceptions.push(params.exceptionDetails.exception?.description || params.exceptionDetails.text); });
  page.on('Network.requestWillBeSent', event => {
    if (!capturing || !/youtube(?:-nocookie)?\.com\/(?:embed\/|youtubei\/v1\/player)/.test(event.request.url)) return;
    const headers = event.request.headers;
    const record = { url: event.request.url, type: event.type, referrer: headers.Referer || headers.referer || null, policy: event.request.referrerPolicy, frameId: event.frameId };
    if (extraHeaders.has(event.requestId)) { record.extraInfoObserved = true; record.actualReferrer = extraHeaders.get(event.requestId); }
    requests.set(event.requestId, record); entry.network.push(record);
  });
  page.on('Network.requestWillBeSentExtraInfo', event => {
    if (!capturing) return;
    const value = event.headers.Referer || event.headers.referer || null;
    extraHeaders.set(event.requestId, value);
    const record = requests.get(event.requestId); if (record) { record.extraInfoObserved = true; record.actualReferrer = value; }
  });
  page.on('Network.responseReceived', async event => {
    if (!capturing || !/youtube(?:-nocookie)?\.com\/youtubei\/v1\/player/.test(event.response.url)) return;
    try {
      await sleep(150);
      const body = await page.send('Network.getResponseBody', { requestId: event.requestId });
      const json = JSON.parse(body.base64Encoded ? Buffer.from(body.body, 'base64').toString('utf8') : body.body);
      entry.responses.push({ status: event.response.status, playabilityStatus: json.playabilityStatus,
        videoId: json.videoDetails?.videoId, embeddable: json.playabilityStatus?.playableInEmbed,
        mimeTypes: [...new Set([...(json.streamingData?.formats || []), ...(json.streamingData?.adaptiveFormats || [])].map(item => item.mimeType))] });
    } catch (error) { entry.responses.push({ error: error.message }); }
  });
  process.stdout.write('Inspecting ' + realm + ' featured iframe...\n');
  await page.send('Page.navigate', { url: new URL('/index.html?game=' + realm, BASE).href });
  await sleep(12000);
  entry.parent = await evaluate(page, () => ({ title: document.title, game: document.documentElement.dataset.realm,
    iframe: (() => { const frame = document.querySelector('#ytWrap iframe'); return frame ? { src: frame.src, allow: frame.allow, referrerPolicy: frame.referrerPolicy, sandbox: frame.getAttribute('sandbox') } : null; })() }));
  let frame = await inspectFrame(contexts);
  if (frame) {
    entry.frameAccess = frame.description;
    if (frame.sessionId) {
      // YouTube is normally an out-of-process iframe; its player/media
      // requests belong to that target rather than the parent Page session.
      const frameResponses = new Map();
      browser.on('Network.requestWillBeSent', (event, sessionId) => {
        if (!capturing || sessionId !== frame.sessionId || !/youtube(?:-nocookie)?\.com\/youtubei\/v1\/player/.test(event.request.url)) return;
        entry.network.push({ url: event.request.url, type: event.type, referrer: event.request.headers.Referer || event.request.headers.referer || null, source: 'iframe network target' });
      });
      browser.on('Network.responseReceived', (event, sessionId) => {
        if (capturing && sessionId === frame.sessionId && /youtube(?:-nocookie)?\.com\/youtubei\/v1\/player/.test(event.response.url)) frameResponses.set(event.requestId, event.response.status);
      });
      browser.on('Network.loadingFinished', async (event, sessionId) => {
        if (!capturing || sessionId !== frame.sessionId || !frameResponses.has(event.requestId)) return;
        try {
          const body = await browser.send('Network.getResponseBody', { requestId: event.requestId }, sessionId);
          const json = JSON.parse(body.base64Encoded ? Buffer.from(body.body, 'base64').toString('utf8') : body.body);
          entry.responses.push({ source: 'iframe network target', status: frameResponses.get(event.requestId), playabilityStatus: json.playabilityStatus,
            videoId: json.videoDetails?.videoId, mimeTypes: [...new Set([...(json.streamingData?.formats || []), ...(json.streamingData?.adaptiveFormats || [])].map(item => item.mimeType))] });
        } catch (error) { entry.responses.push({ source: 'iframe network target', error: error.message }); }
      });
      browser.on('Network.loadingFailed', (event, sessionId) => {
        if (capturing && sessionId === frame.sessionId) entry.network.push({ source: 'iframe request failure', requestId: event.requestId, type: event.type, errorText: event.errorText, blockedReason: event.blockedReason });
      });
      await browser.send('Network.enable', {}, frame.sessionId);
    }
    entry.beforePlay = await evaluate(frame.connection, snapshot, frame.sessionId, frame.contextId);
    await page.send('Page.bringToFront');
    const frameBox = await evaluate(page, () => {
      const element = document.querySelector('#ytWrap iframe');
      if (!element) return null;
      element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
      const box = element.getBoundingClientRect();
      return { left: box.left + element.clientLeft, top: box.top + element.clientTop, width: box.width, height: box.height };
    });
    const playBox = await evaluate(frame.connection, () => {
      const buttons = [...document.querySelectorAll('.ytp-large-play-button, button[aria-label^="Play"]')];
      const button = buttons.find(element => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && getComputedStyle(element).visibility !== 'hidden' && getComputedStyle(element).display !== 'none';
      });
      if (!button) return null;
      const box = button.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2, label: button.getAttribute('aria-label'), className: button.className };
    }, frame.sessionId, frame.contextId);
    if (frameBox && playBox) {
      const x = frameBox.left + playBox.x, y = frameBox.top + playBox.y;
      // Dispatch through Chrome's input subsystem: DOM .click() / video.play()
      // alone are not reliable evidence of a user's playback gesture.
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
      await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
      entry.playAttempt = { attempted: true, kind: 'trusted Chrome pointer input', frameBox, playBox, click: { x, y } };
    } else entry.playAttempt = { attempted: false, reason: 'No visible iframe play control', frameBox, playBox };
    await sleep(10000);
    entry.afterPlay = await evaluate(frame.connection, snapshot, frame.sessionId, frame.contextId);
    if (entry.afterPlay.media && !entry.afterPlay.media.paused && entry.afterPlay.media.readyState >= 2) {
      await sleep(2000);
      entry.progressCheck = await evaluate(frame.connection, snapshot, frame.sessionId, frame.contextId);
      entry.playbackProgressObserved = entry.progressCheck.media?.currentTime > entry.afterPlay.media.currentTime;
    } else entry.playbackProgressObserved = false;
  } else entry.frameAccess = { error: 'No accessible YouTube execution context/iframe target' };
  const shot = await page.send('Page.captureScreenshot', { format: 'png' });
  entry.screenshot = path.join(runDir, realm + '-featured.png'); fs.writeFileSync(entry.screenshot, Buffer.from(shot.data, 'base64'));
  try {
    const response = await fetch('https://www.youtube.com/watch?v=' + id + '&hl=en', { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' } });
    const html = await response.text(); const player = lib.initialJson(html, 'ytInitialPlayerResponse');
    entry.watch = { httpStatus: response.status, playabilityStatus: player?.playabilityStatus,
      id: player?.videoDetails?.videoId, isPrivate: player?.videoDetails?.isPrivate,
      isUnlisted: player?.microformat?.playerMicroformatRenderer?.isUnlisted,
      owner: player?.microformat?.playerMicroformatRenderer?.ownerChannelId || player?.videoDetails?.channelId };
  } catch (error) { entry.watch = { error: error.message }; }
  capturing = false;
  process.stdout.write(JSON.stringify({ realm, iframe: entry.parent.iframe, before: entry.beforePlay?.bodyText, after: entry.afterPlay?.bodyText,
    media: entry.afterPlay?.media, watch: entry.watch, screenshot: entry.screenshot }, null, 2) + '\n');
}

async function cleanup() {
  if (browser) { try { await Promise.race([browser.send('Browser.close'), sleep(2000)]); } catch {} }
  if (page) page.close(); if (browser) browser.close();
  if (chrome?.pid && chrome.exitCode === null) {
    await Promise.race([once(chrome, 'exit').catch(() => {}), sleep(2500)]);
    if (chrome.exitCode === null) spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  }
  if (profile && fs.existsSync(profile)) {
    const realRun = fs.realpathSync(runDir), realProfile = fs.realpathSync(profile);
    if (path.dirname(realRun).toLowerCase() !== TEMP.toLowerCase() || !path.basename(realRun).startsWith(PREFIX)
      || path.dirname(realProfile).toLowerCase() !== realRun.toLowerCase() || path.basename(realProfile) !== 'chrome-profile') throw new Error('Unsafe diagnostic profile cleanup destination');
    fs.rmSync(realProfile, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 });
  }
}

(async () => {
  try {
    await launch();
    for (const realm of ['poe1', 'poe2']) {
      try { await inspectRealm(realm); }
      catch (error) { report.warnings.push(realm + ': ' + error.message); process.stdout.write('REALM WARNING ' + realm + ': ' + error.message + '\n'); }
    }
  }
  catch (error) { report.failure = error.stack || String(error); process.exitCode = 1; }
  finally {
    try { await cleanup(); } catch (error) { report.warnings.push('Cleanup: ' + error.message); }
    if (runDir) { fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(report, null, 2)); process.stdout.write('ARTIFACTS ' + runDir + '\n'); }
    if (report.failure) process.stderr.write(report.failure + '\n');
  }
})();
