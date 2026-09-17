import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA_DIR = path.join(ROOT, 'data', 'postgres');
const LOG_FILE = path.join(ROOT, 'data', 'postgres.log');
const PORT = 5433;

export const LOCAL_DATABASE_URL = `postgresql://postgres@localhost:${PORT}/hozmagazin?schema=public&connect_timeout=15`;

export const isLocalDatabaseUrl = (url = '') => /@(localhost|127\.0\.0\.1):5433\//.test(url);

async function binaries() {
  const platform = { win32: 'windows', darwin: 'darwin', linux: 'linux' }[os.platform()];
  return import(`@embedded-postgres/${platform}-${os.arch()}`);
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
    socket.setTimeout(1500, () => done(false));
  });
}

function logTail(lines = 15) {
  try {
    return fs.readFileSync(LOG_FILE, 'utf8').trim().split(/\r?\n/).slice(-lines).join('\n');
  } catch {
    return '';
  }
}

function run(binary, args) {
  const result = spawnSync(binary, args, { stdio: 'ignore', windowsHide: true });
  return result.status === 0;
}

async function initialise() {
  if (fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))) return false;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const { initdb } = await binaries();
  const ok = run(initdb, ['-D', DATA_DIR, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C', '--no-instructions']);
  if (!ok) throw new Error("PostgreSQL bazasini yaratib bo'lmadi (initdb)");

  fs.appendFileSync(
    path.join(DATA_DIR, 'postgresql.conf'),
    `\n# Hozmagazin\nlisten_addresses = 'localhost'\nport = ${PORT}\nmax_connections = 50\n`
  );
  return true;
}

export async function startLocalDb() {
  const created = await initialise();
  if (await isPortOpen(PORT)) return { status: 'running', created };

  const { pg_ctl } = await binaries();
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  const ok = run(pg_ctl, ['start', '-D', DATA_DIR, '-l', LOG_FILE, '-w', '-t', '90']);

  if (!ok || !(await isPortOpen(PORT))) {
    throw new Error(`PostgreSQL ishga tushmadi.\n${logTail()}`);
  }
  return { status: 'started', created };
}

export async function stopLocalDb() {
  if (!fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))) return false;
  const { pg_ctl } = await binaries();
  return run(pg_ctl, ['stop', '-D', DATA_DIR, '-m', 'fast', '-w', '-t', '30']);
}

export async function localDbStatus() {
  return (await isPortOpen(PORT)) ? 'running' : 'stopped';
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const command = process.argv[2] || 'start';
  try {
    if (command === 'start') {
      const { status, created } = await startLocalDb();
      if (created) console.log("🗄  Yangi lokal PostgreSQL bazasi yaratildi");
      console.log(status === 'running' ? '🗄  Lokal PostgreSQL allaqachon ishlayapti (port 5433)' : '🗄  Lokal PostgreSQL ishga tushdi (port 5433)');
    } else if (command === 'stop') {
      console.log((await stopLocalDb()) ? "🗄  Lokal PostgreSQL to'xtatildi" : '🗄  Lokal PostgreSQL ishlamayotgan edi');
    } else if (command === 'status') {
      console.log(`🗄  Lokal PostgreSQL: ${await localDbStatus()}`);
    } else {
      console.log('Foydalanish: node scripts/local-db.js start|stop|status');
    }
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exitCode = 1;
  }
}
