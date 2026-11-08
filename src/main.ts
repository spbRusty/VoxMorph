import './style.css';
import { Creature } from './renderer';
import { Microphone } from './audio';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <a class="brand" href="#"><span class="brand-mark">V</span><span>VOXMORPH<small>PROCEDURAL AVATAR LAB</small></span></a>
      <div class="top-status"><i></i><span id="status">МИКРОФОН НЕ ПОДКЛЮЧЁН</span></div>
      <button class="icon-button" id="fullscreen" title="Полный экран">⛶</button>
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
        <div class="section-kicker">02 / МОРФОЛОГИЯ</div>
        <div class="control-row"><label for="symmetry">Симметрия</label><output id="symmetry-value">100%</output></div>
        <input id="symmetry" type="range" min="0" max="100" value="100">
        <div class="control-row"><label for="complexity">Сложность формы</label><output id="complexity-value">62%</output></div>
        <input id="complexity" type="range" min="10" max="100" value="62">
        <div class="control-row"><label for="eyes">Количество глаз</label><output id="eyes-value">2</output></div>
        <input id="eyes" type="range" min="0" max="6" value="2" step="1">
        <div class="control-row"><label for="sensitivity">Чувствительность</label><output id="sensitivity-value">65%</output></div>
        <input id="sensitivity" type="range" min="10" max="100" value="65">
        <div class="divider"></div>
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
          <div class="stage-hint" id="hint">НАЖМИ «ЗАПУСТИТЬ МИКРОФОН»<br><small>ИЛИ ГОВОРИ, ЧТОБЫ ОНО ПРОСНУЛОСЬ</small></div>
          <div class="stage-coordinates">WEBGL 2.0 <span>•</span> REALTIME AUDIO</div>
        </div>
        <div class="meters">
          <div class="meter"><span>LOW / БАС</span><div><i id="low-meter"></i></div></div>
          <div class="meter"><span>MID / ГОЛОС</span><div><i id="mid-meter"></i></div></div>
          <div class="meter"><span>HIGH / ВОЗДУХ</span><div><i id="high-meter"></i></div></div>
          <div class="meter"><span>LEVEL</span><div><i id="level-meter"></i></div></div>
        </div>
      </section>
    </section>
    <footer><span>VOXMORPH <b>0.1.0</b></span><span>MADE OF SOUND &amp; MATHEMATICS</span><span>LINUX / UBUNTU</span></footer>
  </main>`;

const canvas = document.querySelector<HTMLCanvasElement>('#creature')!;
const creature = new Creature(canvas);
const mic = new Microphone();
let running = false;
let sensitivity = 0.65;
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

function updateMeters(level: number, low: number, mid: number, high: number) {
  for (const [id, value] of [['level-meter', level], ['low-meter', low], ['mid-meter', mid], ['high-meter', high]] as const) {
    $(id).style.width = `${Math.min(100, value * 100)}%`;
  }
}

async function refreshDevices() {
  const select = $('device') as HTMLSelectElement;
  try {
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

const ranges = ['symmetry', 'complexity', 'eyes', 'sensitivity'] as const;
for (const id of ranges) {
  const input = $(id) as HTMLInputElement;
  input.addEventListener('input', () => {
    const value = Number(input.value);
    $(`${id}-value`).textContent = id === 'eyes' ? String(value) : `${value}%`;
    if (id === 'sensitivity') sensitivity = value / 100;
    creature.setParameter(id, id === 'eyes' ? value : value / 100);
  });
}

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

function frame() {
  const audio = mic.read();
  const scaled = Math.min(1, audio.level * (0.7 + sensitivity * 2.2));
  creature.render({ ...audio, level: scaled });
  updateMeters(scaled, audio.low, audio.mid, audio.high);
  requestAnimationFrame(frame);
}
frame();
refreshDevices();
