import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { config, getConfigWarnings, reloadAdminIds, reloadMiniAppUrl } from './config/default.js';
import { prisma, connectDatabase, disconnectDatabase } from './database/connection.js';
import { bot } from './core/bot.js';
import clientRoutes from './routes/client.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { registerBotRoutes, setupBotMenu } from './routes/bot.routes.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';
import { startScheduler } from './services/scheduler.service.js';
import { seedIfEmpty } from '../prisma/seed.js';

const app = express();

app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, shop: config.shop.name, bot: Boolean(bot), time: new Date().toISOString() });
});

app.use('/api/client', clientRoutes);
app.use('/api/admin', adminRoutes);
app.use(notFound);
app.use(errorHandler);

async function startBot() {
  if (!bot) return;
  registerBotRoutes(bot);
  try {
    const me = await bot.telegram.getMe();
    await setupBotMenu(bot);
    bot.launch().catch((err) => console.error("❌ Bot to'xtab qoldi:", err.message));
    console.log(`🤖 Bot ishlayapti: https://t.me/${me.username}`);
    startScheduler();
  } catch (err) {
    console.error('❌ Bot ishga tushmadi (BOT_TOKEN ni tekshiring):', err.description || err.message);
  }
}

function watchEnvFile() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) return;

  fs.watchFile(envPath, { interval: 1500 }, async () => {
    try {
      const parsed = dotenv.parse(fs.readFileSync(envPath));
      const urlChanged = reloadMiniAppUrl(parsed.MINIAPP_URL);
      const adminsChanged = reloadAdminIds(parsed.ADMIN_IDS);
      if (urlChanged) console.log(`🔗 Mini App manzili yangilandi: ${config.bot.miniAppUrl}`);
      if (adminsChanged) console.log(`👑 Adminlar yangilandi: ${config.bot.adminIds.join(', ') || '—'}`);
      if (bot && (urlChanged || adminsChanged)) await setupBotMenu(bot);
    } catch (err) {
      console.warn("⚠️  .env faylini qayta o'qib bo'lmadi:", err.message);
    }
  });
}

async function main() {
  console.log(`\n🏪 ${config.shop.name} — server ishga tushmoqda...\n`);
  getConfigWarnings().forEach((warning) => console.warn(`⚠️  ${warning}`));

  try {
    await connectDatabase();
    console.log('🗄  PostgreSQL bazasiga ulandi');
    await seedIfEmpty(prisma);
  } catch (err) {
    console.error("\n❌ Ma'lumotlar bazasiga ulanib bo'lmadi:", err.message);
    console.error('   1) backend/.env dagi DATABASE_URL va DIRECT_URL ni tekshiring');
    console.error('   2) "npx prisma migrate dev --name init" buyrug\'ini bajarganingizga ishonch hosil qiling\n');
    process.exit(1);
  }

  const server = app.listen(config.port, '127.0.0.1', () => {
    console.log(`🚀 API ishlayapti: http://localhost:${config.port}/api/health`);
  });

  await startBot();
  watchEnvFile();

  const shutdown = async (signal) => {
    console.log(`\n👋 ${signal} — server to'xtatilmoqda...`);
    try {
      bot?.stop(signal);
    } catch {
      /* bot ishlamayotgan bo'lishi mumkin */
    }
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (err) => console.error('❌ Kutilmagan xatolik:', err?.message || err));

main();
