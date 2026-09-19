import { config } from '../config/default.js';

/**
 * Render'ning bepul tarifi 15 daqiqa so'rovsiz qolgan serverni uxlatib qo'yadi,
 * keyin birinchi javob 20–60 soniya kechikadi. Server o'z tashqi manziliga
 * muntazam so'rov yuborib, uxlab qolmaydi.
 */
export function startKeepAlive() {
  const { url, minutes } = config.keepAlive;
  if (!url || minutes <= 0) return;

  const ping = async () => {
    try {
      const response = await fetch(`${url}/api/health?source=keepalive`, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) console.warn(`⚠️  Keep-alive: HTTP ${response.status}`);
    } catch (err) {
      console.warn('⚠️  Keep-alive xatosi:', err.message);
    }
  };

  setInterval(ping, minutes * 60 * 1000);
  console.log(`⏱  Server uxlab qolmasligi uchun har ${minutes} daqiqada o'ziga so'rov yuboradi`);
}
