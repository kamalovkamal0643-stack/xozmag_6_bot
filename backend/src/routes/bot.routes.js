import { config, isAdmin, hasHttpsMiniApp } from '../config/default.js';
import { botController as c } from '../controllers/botController.js';

const adminOnly = (handler) => (ctx) => {
  if (isAdmin(ctx.from?.id)) return handler(ctx);
  return ctx.reply(`⛔ Bu bo'lim faqat do'kon adminlari uchun.\nSizning ID: ${ctx.from?.id}`);
};

const USER_COMMANDS = [
  { command: 'start', description: "Do'konni ochish" },
  { command: 'buyurtmam', description: 'Mening buyurtmalarim' },
  { command: 'info', description: "Do'kon haqida" },
  { command: 'help', description: 'Yordam' },
  { command: 'id', description: 'Telegram ID raqamim' },
];

const ADMIN_COMMANDS = [
  { command: 'stats', description: '📊 Bugungi savdo' },
  { command: 'ombor', description: '📦 Ombor qoldig\'i' },
  { command: 'buyurtmalar', description: '🧾 Faol buyurtmalar' },
  { command: 'admin', description: '🖥 Admin panel' },
  ...USER_COMMANDS,
];

export function registerBotRoutes(bot) {
  bot.start(c.start);
  bot.help(c.help);
  bot.command('id', c.myId);
  bot.command('info', c.info);
  bot.command('buyurtmam', c.myOrders);

  bot.command('stats', adminOnly(c.stats));
  bot.command('ombor', adminOnly(c.stock));
  bot.command('buyurtmalar', adminOnly(c.activeOrders));
  bot.command('admin', adminOnly(c.adminPanel));

  bot.hears(c.BTN.myOrders, c.myOrders);
  bot.hears(c.BTN.info, c.info);
  bot.hears(c.BTN.stats, adminOnly(c.stats));
  bot.hears(c.BTN.stock, adminOnly(c.stock));
  bot.hears(c.BTN.active, adminOnly(c.activeOrders));

  bot.on('contact', c.contact);
  bot.action(/^st:(\d+):(CONFIRMED|DELIVERING|DELIVERED|CANCELLED)$/, c.changeStatus);
  bot.on('text', c.search);

  bot.catch(async (err, ctx) => {
    console.error('❌ Bot xatosi:', err.message);
    try {
      await ctx.reply("😔 Kechirasiz, xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.");
    } catch {
      /* ignore */
    }
  });
}

export async function setupBotMenu(bot) {
  try {
    await bot.telegram.setMyCommands(USER_COMMANDS);
    for (const id of config.bot.adminIds) {
      await bot.telegram
        .setMyCommands(ADMIN_COMMANDS, { scope: { type: 'chat', chat_id: Number(id) } })
        .catch(() => {});
    }
    if (hasHttpsMiniApp()) {
      await bot.telegram.setChatMenuButton({
        menuButton: { type: 'web_app', text: "Do'kon", web_app: { url: config.bot.miniAppUrl } },
      });
    }
  } catch (err) {
    console.warn('⚠️  Bot menyusini sozlab bo\'lmadi:', err.description || err.message);
  }
}
