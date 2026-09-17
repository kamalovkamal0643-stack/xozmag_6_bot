import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = path.join(ROOT, 'backend');
const MINIAPP = path.join(ROOT, 'miniapp');
const ADMIN = path.join(ROOT, 'admin');
const ENV_FILE = path.join(BACKEND, '.env');
const NODE = process.execPath;
const NPM_CLI = path.join(path.dirname(NODE), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const CLOUDFLARED = path.join(ROOT, 'tools', process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
const OPEN_BROWSER = !process.argv.includes('--no-open');

const COLORS = { backend: 36, miniapp: 35, admin: 33, tunnel: 34, baza: 32, start: 37 };
const children = new Map();
let shuttingDown = false;

const paint = (code, text) => `\x1b[${code}m${text}\x1b[0m`;
const log = (name, message) => console.log(`${paint(COLORS[name] || 37, `[${name}]`.padEnd(10))} ${message}`);

function readEnv() {
  const env = {};
  if (!fs.existsSync(ENV_FILE)) return env;
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    env[match[1]] = value;
  }
  return env;
}

function setEnvValue(key, value) {
  const text = fs.readFileSync(ENV_FILE, 'utf8');
  const line = `${key}="${value}"`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const next = pattern.test(text) ? text.replace(pattern, () => line) : `${text.trimEnd()}\n${line}\n`;
  fs.writeFileSync(ENV_FILE, next);
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(1000, () => done(false));
  });
}

async function waitForPort(port, timeoutMs = 90000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await isPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function runSync(name, args, cwd) {
  log(name, paint(90, `${path.basename(args[0])} ${args.slice(1).join(' ')}`));
  const result = spawnSync(NODE, args, { cwd, stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) throw new Error(`${name}: buyruq xato bilan tugadi (${result.status})`);
}

function pipeLines(stream, onLine) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    lines.forEach((line) => line.trim() && onLine(line));
  });
}

function startProcess(name, command, args, cwd, { filter, onLine, restart = false } = {}) {
  const child = spawn(command, args, { cwd, windowsHide: true });
  children.set(name, child);

  const handle = (line) => {
    Promise.resolve()
      .then(() => onLine?.(line))
      .catch((err) => log(name, paint(31, err.message)));
    if (!filter || filter(line)) log(name, line);
  };
  pipeLines(child.stdout, handle);
  pipeLines(child.stderr, handle);

  child.on('exit', (code) => {
    children.delete(name);
    if (shuttingDown) return;
    log(name, paint(31, `to'xtadi (kod: ${code})`));
    if (restart) {
      log(name, "3 soniyadan so'ng qayta ishga tushiriladi...");
      setTimeout(() => !shuttingDown && startProcess(name, command, args, cwd, { filter, onLine, restart }), 3000);
    }
  });
  return child;
}

async function ensureDependencies() {
  for (const [name, dir] of [['backend', BACKEND], ['miniapp', MINIAPP], ['admin', ADMIN]]) {
    if (fs.existsSync(path.join(dir, 'node_modules'))) continue;
    log(name, "paketlar o'rnatilmoqda (birinchi marta, bir necha daqiqa)...");
    runSync(name, [NPM_CLI, 'install', '--no-fund', '--no-audit'], dir);
  }
}

async function ensureDatabase(env) {
  const { isLocalDatabaseUrl, startLocalDb } = await import(pathToFileURL(path.join(BACKEND, 'scripts', 'local-db.js')).href);
  if (isLocalDatabaseUrl(env.DATABASE_URL)) {
    const { status, created } = await startLocalDb();
    if (created) log('baza', 'yangi lokal PostgreSQL yaratildi');
    log('baza', status === 'running' ? 'lokal PostgreSQL allaqachon ishlayapti' : 'lokal PostgreSQL ishga tushdi (port 5433)');
  } else {
    log('baza', 'tashqi PostgreSQL ishlatiladi (DATABASE_URL)');
  }
  runSync('baza', [path.join(BACKEND, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'], BACKEND);
}

async function botUsername(token) {
  if (!token) return null;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: AbortSignal.timeout(10000) });
    const json = await response.json();
    return json.ok ? json.result.username : null;
  } catch {
    return null;
  }
}

function openInBrowser(url) {
  if (!OPEN_BROWSER) return;
  if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', windowsHide: true, detached: true }).unref();
}

async function printSummary(tunnelUrl) {
  const env = readEnv();
  const username = await botUsername(env.BOT_TOKEN);
  const lines = [
    '',
    paint(32, '══════════════════════════════════════════════════════════════'),
    paint(32, '  ✅ HOZMAGAZIN ISHLAYAPTI'),
    paint(32, '══════════════════════════════════════════════════════════════'),
    `  🖥  Admin panel:   http://localhost:5174   (parol: ${env.ADMIN_PASSWORD})`,
    `  📱 Mini App:      ${tunnelUrl || 'http://localhost:5173 (tunnel ulanmagan)'}`,
    username
      ? `  🤖 Telegram bot:  https://t.me/${username}`
      : "  🤖 Telegram bot:  ulanmagan — backend/.env ga BOT_TOKEN yozing va qayta ishga tushiring",
    '',
    "  ⚠️  Bu oynani yopsangiz, do'kon to'xtaydi.",
    paint(32, '══════════════════════════════════════════════════════════════'),
    '',
  ];
  console.log(lines.join('\n'));
}

async function resolvePublicDns(host) {
  const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${host}&type=A`, {
    headers: { accept: 'application/dns-json' },
    signal: AbortSignal.timeout(8000),
  });
  const json = await response.json();
  return (json.Answer || []).filter((a) => a.type === 1).map((a) => a.data);
}

function probeHttps(host, ip) {
  return new Promise((resolve) => {
    const request = https.request(
      { host: ip, servername: host, port: 443, path: '/', method: 'GET', headers: { host, 'user-agent': 'hozmagazin-watchdog' }, timeout: 15000 },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      }
    );
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve(0));
    request.end();
  });
}

async function isTunnelAlive(url) {
  const host = new URL(url).hostname;
  let ips;
  try {
    ips = await resolvePublicDns(host);
  } catch {
    return true;
  }
  if (!ips.length) return false;
  const status = await probeHttps(host, ips[0]);
  return status > 0 && status < 500;
}

function startTunnel() {
  if (!fs.existsSync(CLOUDFLARED)) {
    log('tunnel', paint(31, 'tools/cloudflared topilmadi — Telegram Mini App ulanmaydi'));
    printSummary(null);
    return;
  }

  let announced = false;
  let pendingUrl = null;
  let connectedUrl = null;
  let failures = 0;
  let checking = false;

  const publish = async () => {
    if (!pendingUrl || pendingUrl === connectedUrl) return;
    connectedUrl = pendingUrl;
    failures = 0;
    setEnvValue('MINIAPP_URL', connectedUrl);
    log('tunnel', `Mini App manzili botga ulandi ✓ ${connectedUrl}`);
    if (!announced) {
      announced = true;
      await printSummary(connectedUrl);
    }
  };

  const reconnect = (reason) => {
    if (shuttingDown || !children.get('tunnel')) return;
    log('tunnel', paint(33, `${reason} — yangi tunnel ochilmoqda...`));
    pendingUrl = null;
    connectedUrl = null;
    failures = 0;
    killTree(children.get('tunnel'));
  };

  startProcess('tunnel', CLOUDFLARED, ['tunnel', '--url', 'http://127.0.0.1:5173', '--no-autoupdate'], ROOT, {
    restart: true,
    filter: (line) => / ERR /.test(line) && !/failed to sufficiently increase receive buffer/.test(line),
    onLine: async (line) => {
      const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match) {
        pendingUrl = match[0];
        log('tunnel', `manzil olindi, Cloudflare ulanishi kutilmoqda...`);
      }
      if (/Registered tunnel connection/.test(line)) await publish();
      if (connectedUrl && /tunnel not found|Unauthorized/i.test(line)) reconnect('tunnel Cloudflare tomonidan yopildi');
    },
  });

  setInterval(async () => {
    if (!connectedUrl || checking || shuttingDown) return;
    if (!(await isPortOpen(5173))) return;
    checking = true;
    try {
      const url = connectedUrl;
      const alive = await isTunnelAlive(url);
      if (url !== connectedUrl) return;
      failures = alive ? 0 : failures + 1;
      if (failures >= 2) reconnect('tunnel uzilib qoldi');
    } finally {
      checking = false;
    }
  }, 45000);
}

function killTree(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  else child.kill('SIGTERM');
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${paint(33, "⏹  To'xtatilmoqda...")} (${signal})`);
  for (const child of children.values()) killTree(child);
  try {
    const env = readEnv();
    const { isLocalDatabaseUrl, stopLocalDb } = await import(pathToFileURL(path.join(BACKEND, 'scripts', 'local-db.js')).href);
    if (isLocalDatabaseUrl(env.DATABASE_URL)) await stopLocalDb();
  } catch {
    /* baza allaqachon to'xtagan bo'lishi mumkin */
  }
  process.exit(0);
}

async function main() {
  console.log(paint(36, "\n🧺 Hozmagazin ishga tushirilmoqda...\n"));

  const busy = await Promise.all([5000, 5173, 5174].map(isPortOpen));
  if (busy.every(Boolean)) {
    log('start', "Hozmagazin allaqachon ishlayapti. Admin panel ochilmoqda...");
    openInBrowser('http://localhost:5174');
    return;
  }
  if (busy.some(Boolean)) {
    log('start', paint(31, "5000/5173/5174 portlaridan biri band. Eski oynalarni yoping va qayta urinib ko'ring."));
    process.exitCode = 1;
    return;
  }

  ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'].forEach((signal) => process.on(signal, () => shutdown(signal)));

  await ensureDependencies();
  await ensureDatabase(readEnv());

  const vite = path.join('node_modules', 'vite', 'bin', 'vite.js');
  const viteFilter = (line) => !/^\s*(➜\s+(Network|press)|VITE v)/.test(line);

  log('miniapp', "telefon uchun tayyorlanmoqda (build)...");
  const built = spawnSync(NODE, [vite, 'build', '--logLevel', 'error'], { cwd: MINIAPP, stdio: 'inherit', windowsHide: true }).status === 0;
  if (!built) log('miniapp', paint(33, 'build bo\'lmadi — dev rejimida ishga tushiriladi'));

  startProcess('backend', NODE, ['src/index.js'], BACKEND, { restart: true });
  startProcess('miniapp', NODE, built ? [vite, 'preview'] : [vite], MINIAPP, { filter: viteFilter, restart: true });
  startProcess('admin', NODE, [vite], ADMIN, { filter: viteFilter, restart: true });

  const [backendUp, miniappUp, adminUp] = await Promise.all([waitForPort(5000), waitForPort(5173), waitForPort(5174)]);
  if (!backendUp) log('backend', paint(31, 'ishga tushmadi — yuqoridagi xabarlarni o\'qing'));
  if (!miniappUp) log('miniapp', paint(31, 'ishga tushmadi'));
  if (adminUp) openInBrowser('http://localhost:5174');

  startTunnel();
}

main().catch(async (err) => {
  console.error(paint(31, `\n❌ ${err.message}\n`));
  await shutdown('error');
});
