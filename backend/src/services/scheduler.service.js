import cron from 'node-cron';
import { bot } from '../core/bot.js';
import { config } from '../config/default.js';
import { buildSalesReport, buildStockReport } from './report.service.js';
import { sendToAdmins } from './notify.service.js';

export function startScheduler() {
  if (!bot) return;

  if (!cron.validate(config.reports.cron)) {
    console.warn(`⚠️  DAILY_REPORT_CRON noto'g'ri: "${config.reports.cron}"`);
    return;
  }

  cron.schedule(
    config.reports.cron,
    async () => {
      if (!config.bot.adminIds.length) return;
      try {
        await sendToAdmins(await buildSalesReport('🌙 Kunlik yakuniy hisobot'));
        await sendToAdmins(await buildStockReport());
      } catch (err) {
        console.error('❌ Kunlik hisobot xatosi:', err.message);
      }
    },
    { timezone: config.reports.timezone }
  );

  console.log(`⏰ Kunlik hisobot yoqildi (${config.reports.cron}, ${config.reports.timezone})`);
}
