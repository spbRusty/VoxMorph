import './style.css';
import { Creature } from './renderer';
import { Microphone } from './audio';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <a class="brand" href="#"><span class="brand-mark">V</span><span>VOXMORPH<small>PROCEDURAL AVATAR LAB</small></span></a>
      <div class="top-status"><i></i><span id="status">МИКРОФОН НЕ ПОДКЛЮЧЁН</span></div>
      <div class="window-actions">
        <button class="language-button" id="language">EN</button>
        <button class="mode-button" id="obs-mode" title="Прозрачный режим для OBS">РЕЖИМ OBS</button>
        <button class="icon-button" id="fullscreen" title="Полный экран">⛶</button>
        <button class="icon-button window-control" id="minimize" title="Свернуть">−</button>
        <button class="icon-button window-control close-control" id="close" title="Закрыть">×</button>
      </div>
    </header>
    <section class="workspace">
      <aside class="sidebar">
        <div class="section-kicker" id="source-title">ИСТОЧНИК ЗВУКА</div>
        <h1 id="headline">Живой организм<br><em>из твоего голоса.</em></h1>
        <p class="intro" id="intro">Форма, цвет и характер существа меняются в реальном времени вслед за звучанием твоего голоса.</p>
        <label class="field-label" for="device">Устройство ввода</label>
        <select id="device"><option value="">Системный микрофон</option></select>
        <button class="primary-button" id="start"><span class="button-dot"></span> ЗАПУСТИТЬ МИКРОФОН</button>
        
      </aside>
      <section class="stage-wrap">
        <div class="stage-head"><span>СУЩЕСТВО / <b id="seed">VX-001</b></span><span class="live-label"><i></i> LIVE RENDER</span></div>
        <div class="stage" id="stage">
          <canvas id="creature"></canvas>
          <div id="drag-handle" aria-hidden="true"></div>
          <div id="resize-handle" title="Потяните, чтобы изменить размер" aria-label="Изменить размер существа"></div>
          <div class="stage-hint" id="hint">НАЖМИ «ЗАПУСТИТЬ МИКРОФОН»<br><small>ИЛИ ГОВОРИ, ЧТОБЫ ОНО ПРОСНУЛОСЬ</small></div>
          <div class="stage-coordinates">WEBGL 2.0 <span>•</span> REALTIME AUDIO</div>
        </div>
        <div class="meters">
          <div class="meter"><span>LEVEL</span><div><i id="level-meter"></i></div></div>
          <div class="meter"><span>BASS</span><div><i id="low-meter"></i></div></div>
          <div class="meter"><span>VOICE</span><div><i id="mid-meter"></i></div></div>
          <div class="meter"><span>AIR</span><div><i id="high-meter"></i></div></div>
          <div class="meter"><span>PITCH</span><div><i id="pitch-meter"></i></div></div>
          <div class="meter"><span>BREATH</span><div><i id="breath-meter"></i></div></div>
          <div class="meter"><span>VOICING</span><div><i id="voicing-meter"></i></div></div>
          <div class="meter"><span>BRIGHT</span><div><i id="brightness-meter"></i></div></div>
          <div class="meter"><span>ROUGH</span><div><i id="roughness-meter"></i></div></div>
          <div class="meter"><span>RHYTHM</span><div><i id="rhythm-meter"></i></div></div>
          <div class="meter"><span>ONSET</span><div><i id="onset-meter"></i></div></div>
          <div class="meter"><span>HARMONICS</span><div><i id="harmonics-meter"></i></div></div>
          <div class="meter"><span>FLATNESS</span><div><i id="flatness-meter"></i></div></div>
          <div class="meter"><span>ZCR</span><div><i id="zeroCrossing-meter"></i></div></div>
          <div class="meter"><span>MOTION</span><div><i id="motion-meter"></i></div></div>
          <div class="meter"><span>FLUX</span><div><i id="flux-meter"></i></div></div>
        </div>
      </section>
    </section>
    <footer><span>VOXMORPH <b>0.1.0</b></span><span>MADE OF SOUND &amp; MATHEMATICS</span><span>LINUX / UBUNTU</span></footer>
  </main>`;

const translations = {
ru: { off:'МИКРОФОН НЕ ПОДКЛЮЧЁН', on:'АУДИОПОТОК АКТИВЕН', error:'НЕТ ДОСТУПА К МИКРОФОНУ', obs:'РЕЖИМ OBS', exit:'ВЫЙТИ ИЗ OBS (Ctrl+Shift+O)', source:'ИСТОЧНИК ЗВУКА', headline:'Живой организм<br><em>из твоего голоса.</em>', intro:'Форма, цвет и характер существа меняются в реальном времени вслед за звучанием твоего голоса.', input:'Устройство ввода', start:'ЗАПУСТИТЬ МИКРОФОН', stop:'ОСТАНОВИТЬ МИКРОФОН', hint:'НАЖМИ «ЗАПУСТИТЬ МИКРОФОН»<br><small>ИЛИ ГОВОРИ, ЧТОБЫ ОНО ПРОСНУЛОСЬ</small>', device:'Системный микрофон', mic:'Микрофон' },
en: { off:'MICROPHONE DISCONNECTED', on:'AUDIO STREAM ACTIVE', error:'MICROPHONE ACCESS DENIED', obs:'OBS MODE', exit:'EXIT OBS (Ctrl+Shift+O)', source:'AUDIO INPUT', headline:'A living being<br><em>shaped by your voice.</em>', intro:'Its shape, color and character evolve in real time with the sound of your voice.', input:'Input device', start:'START MICROPHONE', stop:'STOP MICROPHONE', hint:'CLICK “START MICROPHONE”<br><small>OR SPEAK TO WAKE IT UP</small>', device:'System microphone', mic:'Microphone' }
};
let language: 'ru'|'en' = localStorage.getItem('voxmorph-language') === 'en' ? 'en' : 'ru';
function applyLanguage(){ const t=translations[language]; document.documentElement.lang=language; $('language').textContent=language==='ru'?'EN':'РУ'; $('source-title').textContent=t.source; $('headline').innerHTML=t.headline; $('intro').textContent=t.intro; $('input-label').textContent=t.input; $('obs-mode').textContent=document.body.classList.contains('obs-mode')?t.exit:t.obs; $('status').textContent=running?t.on:t.off; $('hint').innerHTML=t.hint; if(!running) $('start').innerHTML='<span class="button-dot"></span>'+t.start; const sel=$('device'); if(sel.options.length===1 && !sel.options[0].value) sel.options[0].textContent=t.device; }
const canvas = document.querySelector<HTMLCanvasElement>('#creature')!;
const creature = new Creature(canvas);
const mic = new Microphone();
let running = false;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  creature.resize(canvas.width, canvas.height);
}
new ResizeObserver(resize).observe(canvas);
resize();

function updateMeters(audio: ReturnType<Microphone['read']>) {
  const values:Record<string,number>={
    level:audio.level, low:audio.low, mid:audio.mid, high:audio.high,
    pitch:audio.pitch, breath:audio.breath, voicing:audio.voicing,
    brightness:audio.brightness, roughness:audio.roughness,
    rhythm:audio.rhythm, onset:audio.onset, harmonics:audio.harmonics,
    flatness:audio.flatness, zeroCrossing:audio.zeroCrossing,
    motion:audio.motion, flux:audio.flux, softness:audio.softness,
  };
  for(const [name,value] of Object.entries(values)) {
    const meter=document.getElementById(`${name}-meter`);
    if(meter) meter.style.width=`${Math.min(100,value*100)}%`;
  }
}

async function refreshDevices() {
  const select = $('device') as HTMLSelectElement;
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter(d => d.kind === 'audioinput');
    select.innerHTML = inputs.map((d, i) => `<option value="${d.deviceId}">${d.label || `${translations[language].mic} ${i + 1}`}</option>`).join('');
  } catch { /* Разрешение будет запрошено при запуске. */ }
}

$('start').addEventListener('click', async () => {
  const button = $('start');
  if (running) {
    mic.stop(); running = false;
    button.innerHTML = '<span class="button-dot"></span>'+translations[language].start;
    $('status').textContent = translations[language].off;
    $('hint').classList.remove('hidden');
    return;
  }
  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Браузер блокирует микрофон в небезопасном контексте. Открой VoxMorph через HTTPS или http://localhost. При доступе с другого устройства по локальному IP нужен HTTPS.');
    }
    await mic.start(($('device') as HTMLSelectElement).value || undefined);
    running = true;
    button.textContent = '■ '+translations[language].stop;
    $('status').textContent = translations[language].on;
    $('hint').classList.add('hidden');
    await refreshDevices();
  } catch (error) {
    $('status').textContent = translations[language].error;
    alert(error instanceof Error ? error.message : 'Не удалось подключить микрофон');
  }
});


$('fullscreen').addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
});

$('obs-mode').addEventListener('click', async () => {
  await window.voxmorph?.toggleObsMode();
});

$('minimize').addEventListener('click', () => window.voxmorph?.minimize());
$('close').addEventListener('click', () => window.voxmorph?.close());
$('language').addEventListener('click', () => { language=language==='ru'?'en':'ru'; localStorage.setItem('voxmorph-language',language); applyLanguage(); });



const resizeHandle = $('resize-handle');
let resizing = false;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 720;
let resizeStartHeight = 720;

resizeHandle.addEventListener('pointerdown', (event) => {
  if (!document.body.classList.contains('obs-mode')) return;
  event.preventDefault();
  event.stopPropagation();
  resizing = true;
  document.body.classList.add('resizing-avatar');
  resizeStartX = event.screenX;
  resizeStartY = event.screenY;
  resizeStartWidth = window.innerWidth;
  resizeStartHeight = window.innerHeight;
  resizeHandle.setPointerCapture(event.pointerId);
});

resizeHandle.addEventListener('pointermove', (event) => {
  if (!resizing) return;
  const dx = event.screenX - resizeStartX;
  const dy = event.screenY - resizeStartY;
  // Диагональное движение одинаково меняет обе стороны; вертикаль/горизонталь тоже работают.
  const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
  const nextSize = Math.max(240, Math.min(1200, Math.round((resizeStartWidth + resizeStartHeight) / 2 + delta)));
  window.voxmorph?.resizeWindowTo(nextSize, nextSize);
});

function stopResize(event: PointerEvent) {
  if (!resizing) return;
  resizing = false;
  document.body.classList.remove('resizing-avatar');
  if (resizeHandle.hasPointerCapture(event.pointerId)) resizeHandle.releasePointerCapture(event.pointerId);
}
resizeHandle.addEventListener('pointerup', stopResize);
resizeHandle.addEventListener('pointercancel', stopResize);

window.voxmorph?.onObsModeChanged((enabled) => {
  document.documentElement.classList.toggle('obs-mode', enabled);
  document.body.classList.toggle('obs-mode', enabled);
  $('obs-mode').textContent = enabled ? translations[language].exit : translations[language].obs;
});

function frame() {
  const audio = mic.read();
  const scaledAudio = audio;
  creature.render(scaledAudio);
  updateMeters(scaledAudio);
  requestAnimationFrame(frame);
}
frame();
applyLanguage();
refreshDevices();
