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
        <button class="mode-button" id="obs-mode" title="Прозрачный режим для OBS">РЕЖИМ OBS</button>
        <button class="icon-button" id="fullscreen" title="Полный экран">⛶</button>
        <button class="icon-button window-control" id="minimize" title="Свернуть">−</button>
        <button class="icon-button window-control close-control" id="close" title="Закрыть">×</button>
      </div>
    </header>
    <section class="workspace">
      <aside class="sidebar">
        <div class="section-kicker">01 / ИСТОЧНИК</div>
        <h1>Твоё новое<br><em>альтер эго.</em></h1>
        <p class="intro">Живой цифровой организм. Он дышит, пульсирует и меняет форму вместе с твоим голосом.</p>
        <label class="field-label" for="device">Устройство ввода</label>
        <select id="device"><option value="">Системный микрофон</option></select>
        <button class="primary-button" id="start"><span class="button-dot"></span> ЗАПУСТИТЬ МИКРОФОН</button>
        <div class="divider"></div>
        <div class="section-kicker">02 / АВТОНОМНАЯ МОРФОЛОГИЯ</div>
        <p class="intro morphology-note">Симметрия, сложность и пластика меняются самостоятельно под воздействием голоса.</p>
        <div class="section-kicker">03 / ПАЛИТРА</div>
        <div class="swatches">
          <button class="swatch active" data-palette="violet" aria-label="Фиолетовая"></button>
          <button class="swatch" data-palette="acid" aria-label="Кислотная"></button>
          <button class="swatch" data-palette="ember" aria-label="Огненная"></button>
          <button class="swatch" data-palette="ice" aria-label="Ледяная"></button>
          <button class="swatch" data-palette="mono" aria-label="Монохромная"></button>
        </div>
        <button class="secondary-button" id="randomize">↻ &nbsp; СЛУЧАЙНАЯ МОРФОЛОГИЯ</button>
      </aside>
      <section class="stage-wrap">
        <div class="stage-head"><span>СУЩЕСТВО / <b id="seed">VX-001</b></span><span class="live-label"><i></i> LIVE RENDER</span></div>
        <div class="stage" id="stage">
          <canvas id="creature"></canvas>
          <div id="drag-handle" aria-hidden="true"></div>
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
    motion:audio.motion, flux:audio.flux,
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
    select.innerHTML = inputs.map((d, i) => `<option value="${d.deviceId}">${d.label || `Микрофон ${i + 1}`}</option>`).join('');
  } catch { /* Разрешение будет запрошено при запуске. */ }
}

$('start').addEventListener('click', async () => {
  const button = $('start');
  if (running) {
    mic.stop(); running = false;
    button.innerHTML = '<span class="button-dot"></span> ЗАПУСТИТЬ МИКРОФОН';
    $('status').textContent = 'МИКРОФОН НЕ ПОДКЛЮЧЁН';
    $('hint').classList.remove('hidden');
    return;
  }
  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Браузер блокирует микрофон в небезопасном контексте. Открой VoxMorph через HTTPS или http://localhost. При доступе с другого устройства по локальному IP нужен HTTPS.');
    }
    await mic.start(($('device') as HTMLSelectElement).value || undefined);
    running = true;
    button.textContent = '■ ОСТАНОВИТЬ МИКРОФОН';
    $('status').textContent = 'АУДИОПОТОК АКТИВЕН';
    $('hint').classList.add('hidden');
    await refreshDevices();
  } catch (error) {
    $('status').textContent = 'НЕТ ДОСТУПА К МИКРОФОНУ';
    alert(error instanceof Error ? error.message : 'Не удалось подключить микрофон');
  }
});


document.querySelectorAll<HTMLButtonElement>('.swatch').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelector('.swatch.active')?.classList.remove('active');
    button.classList.add('active');
    creature.setPalette(button.dataset.palette || 'violet');
  });
});

$('randomize').addEventListener('click', () => {
  creature.randomize();
  $('seed').textContent = `VX-${String(Math.floor(Math.random() * 900) + 100)}`;
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



window.voxmorph?.onObsModeChanged((enabled) => {
  document.documentElement.classList.toggle('obs-mode', enabled);
  document.body.classList.toggle('obs-mode', enabled);
  $('obs-mode').textContent = enabled ? 'ВЫЙТИ ИЗ OBS (Ctrl+Shift+O)' : 'РЕЖИМ OBS';
});

function frame() {
  const audio = mic.read();
  const scaledAudio = audio;
  creature.render(scaledAudio);
  updateMeters(scaledAudio);
  requestAnimationFrame(frame);
}
frame();
refreshDevices();
