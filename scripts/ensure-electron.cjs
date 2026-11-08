const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const electronDir = path.join(root, 'node_modules', 'electron');
const executable = path.join(electronDir, 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
const installer = path.join(electronDir, 'install.js');

if (fs.existsSync(executable)) {
  console.log('Electron найден.');
  process.exit(0);
}

if (!fs.existsSync(installer)) {
  console.error('Пакет Electron не установлен. Сначала выполните npm install.');
  process.exit(1);
}

console.log('Бинарник Electron отсутствует. Запускаю его загрузку...');
const env = { ...process.env };
delete env.ELECTRON_SKIP_BINARY_DOWNLOAD;
delete env.npm_config_electron_skip_binary_download;
delete env.NPM_CONFIG_ELECTRON_SKIP_BINARY_DOWNLOAD;

const result = spawnSync(process.execPath, [installer], {
  cwd: root,
  env,
  stdio: 'inherit',
});

if (result.error) {
  console.error('Не удалось запустить установщик Electron:', result.error.message);
  process.exit(1);
}

if (result.status !== 0 || !fs.existsSync(executable)) {
  console.error('\nElectron не загрузился. Установщик не создал исполняемый файл.');
  console.error('Проверьте доступ к GitHub Releases; повторная установка остальных npm-пакетов не требуется.');
  process.exit(result.status || 1);
}

try {
  fs.chmodSync(executable, 0o755);
} catch {}

console.log('Electron успешно подготовлен.');
