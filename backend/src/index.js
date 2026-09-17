import crypto from 'node:crypto';
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
let botActive = false;

app.set('trust proxy', true);
app.use(cors(config.corsOrigins.length ? { origin: config.corsOrigins } : undefined));
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'hozmagazin-api', health: '/api/health' });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, shop: config.shop.name, bot: botActive, time: new Date().toISOString() });
});

app.use('/api/client', clientRoutes);
app.use('/api/admin', adminRoutes);

function mountWebhook() {
  if (!bot || !config.bot.webhookDomain) return null;
  const secret = crypto.createHash('sha256').update(`webhook:${config.bot.token}`).digest('hex');
  const hookPath = `/telegram/webhook/${secret.slice(0, 24)}`;
  const handleWebhook = bot.webhookCallback(hookPath, { secretToken: secret });

  app.post(hookPath, (req, res, next) => {
    Promise.resolve(handleWebhook(req, res, next)).catch((err) => {
      console.error('❌ Telegram webhook xatosi:', err.description || err.message);
      if (!res.headersSent) res.sendStatus(200);
    });
  });

  return { url: `${config.bot.webhookDomain}${hookPath}`, secret };
}

async function startBot(webhook) {
  if (!bot) return;
  try {
    const me = await bot.telegram.getMe();
    bot.botInfo = me;

    if (webhook) {
      await setupBotMenu(bot);
      await bot.telegram.setWebhook(webhook.url, {
        secret_token: webhook.secret,
        allowed_updates: ['message', 'callback_query'],
      });
      botActive = true;
      console.log(`🤖 Bot webhook rejimida ishlayapti: https://t.me/${me.username}`);
    } else {
      const info = await bot.telegram.getWebhookInfo();
      if (info.url) {
        console.warn(`⚠️  Bot hozir boshqa serverda ishlayapti (${new URL(info.url).host}) — lokal bot ishga tushirilmadi.`);
        return;
      }
      await setupBotMenu(bot);
      bot.launch().catch((err) => {
        botActive = false;
        console.error("❌ Bot to'xtab qoldi:", err.message);
      });
      botActive = true;
      console.log(`🤖 Bot ishlayapti: https://t.me/${me.username}`);
    }

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
      if (bot && botActive && (urlChanged || adminsChanged)) await setupBotMenu(bot);
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
    console.error('   DATABASE_URL va DIRECT_URL ni tekshiring, keyin "npx prisma migrate deploy" ni bajaring\n');
    process.exit(1);
  }

  if (bot) registerBotRoutes(bot);
  const webhook = mountWebhook();

  app.use(notFound);
  app.use(errorHandler);

  const server = app.listen(config.port, config.host, () => {
    console.log(`🚀 API ishlayapti: http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}/api/health`);
  });

  await startBot(webhook);
  watchEnvFile();

  const shutdown = async (signal) => {
    console.log(`\n👋 ${signal} — server to'xtatilmoqda...`);
    try {
      if (botActive && !webhook) bot.stop(signal);
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
