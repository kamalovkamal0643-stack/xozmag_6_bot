import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isChannelBindingError, normalizeDatabaseUrl } from '../src/database/url.js';

const prismaCli = fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url));
const schema = fileURLToPath(new URL('../prisma/schema.prisma', import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL topilmadi — Neon satrini DATABASE_URL ga yozing');
  process.exit(1);
}

function migrate(relaxChannelBinding) {
  const options = { relaxChannelBinding };
  const env = {
    ...process.env,
    DATABASE_URL: normalizeDatabaseUrl(process.env.DATABASE_URL, options),
    DIRECT_URL: normalizeDatabaseUrl(process.env.DIRECT_URL || process.env.DATABASE_URL, options),
  };
  const result = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--schema', schema], { env, encoding: 'utf8' });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  return result;
}

let result = migrate(false);
if (result.status !== 0 && isChannelBindingError(`${result.stdout}${result.stderr}`)) {
  console.log('ℹ️  channel_binding=require ishlamadi — prefer bilan qayta urinilmoqda...');
  result = migrate(true);
}

process.exit(result.status ?? 1);
