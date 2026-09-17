# 🧺 Hozmagazin — Telegram bot + Mini App + Admin panel

Xo'jalik mollari do'koni uchun Telegram bot, mijozlar uchun Mini App va do'kon egasi uchun admin panel. Hammasi shu kompyuterda ishlaydi.

## ▶️ Ishga tushirish

**`start.bat` faylini ikki marta bosing.** Qolganini u o'zi qiladi:

1. lokal PostgreSQL bazasini yoqadi;
2. backend (bot + API), Mini App va admin panelni ishga tushiradi;
3. Cloudflare tunnel orqali Mini App uchun https manzil oladi va uni botga o'zi ulaydi;
4. admin panelni brauzerda ochadi.

Oynada `✅ HOZMAGAZIN ISHLAYAPTI` yozuvi chiqsa, hammasi tayyor. **Bu oynani yopmang** — yopsangiz, do'kon to'xtaydi.

## 🖥 Admin panel

- Manzil: http://localhost:5174 (faqat shu kompyuterda ochiladi)
- Parol `start.bat` oynasida ko'rsatiladi (`backend\.env` → `ADMIN_PASSWORD`)

Admin panelda: dashboard (bugungi savdo, 7 kunlik grafik, soatlar bo'yicha faollik, TOP mahsulotlar), buyurtmalar (holatini o'zgartirish, Excel'ga yuklab olish, yangi buyurtmada ovozli signal), mahsulotlar (qo'shish, tahrirlash, o'chirish, kirim, hisobdan chiqarish, inventarizatsiya), ombor harakati tarixi, kategoriyalar va mijozlar.

## 🤖 Telegram bot

**Mijozlar uchun:** `/start` va **Do'kon** menyu tugmasi, `/buyurtmam`, `/info`. Mahsulot nomini yozsa (masalan `lampa`), bot narxini va omborda bor-yo'qligini aytadi.

**Do'kon egasi uchun** (`backend\.env` → `ADMIN_IDS`):
- `/stats` — bugungi buyurtmalar, savdo summasi, o'rtacha chek, kechagi kun bilan solishtirish
- `/ombor` — qoldiqlar, ombor qiymati, tugayotgan mahsulotlar; `/ombor lampa` — bitta mahsulot qoldig'i
- `/buyurtmalar` — faol buyurtmalar, holatni tugmalar bilan o'zgartirish
- har bir yangi buyurtma haqida xabar, "mahsulot tugayapti" ogohlantirishi, har kuni 20:00 da hisobot

## ⚙️ Sozlamalar — `backend\.env`

| Nima | Qator |
|---|---|
| Do'kon nomi, telefoni, ish vaqti | `SHOP_NAME`, `SHOP_PHONE`, `SHOP_WORK_HOURS` |
| Yetkazish narxi, bepul yetkazish chegarasi, minimal buyurtma | `DELIVERY_FEE`, `FREE_DELIVERY_FROM`, `MIN_ORDER` |
| Admin panel paroli | `ADMIN_PASSWORD` |
| Bot tokeni va adminlar | `BOT_TOKEN`, `ADMIN_IDS` |
| Kunlik hisobot vaqti | `DAILY_REPORT_CRON` |

O'zgartirgandan keyin `start.bat` oynasini yopib, qayta ishga tushiring.

## 📌 Bilish kerak

- Tunnel manzili har safar `start.bat` ishga tushganda yangilanadi va botga avtomatik ulanadi. Tunnel uzilib qolsa, `start.bat` buni har daqiqada tekshiradi va 1–2 daqiqada yangi tunnel ochib, botga o'zi ulaydi.
- Telegram'da **Do'kon** menyu tugmasidan foydalaning — u doim eng yangi manzilga ulangan. Eski xabarlardagi tugmalar eski manzilga olib borishi mumkin.
- Kompyuter o'chsa yoki uyqu rejimiga o'tsa, bot ham ishlamaydi.
- Barcha ma'lumotlar `data\postgres` papkasida saqlanadi. Bu papkani o'chirmang.
- Neon (bulutli baza) ga o'tish uchun `backend\.env` dagi `DATABASE_URL` va `DIRECT_URL` ga Neon manzilini yozing.

## 🗂 Tuzilma

```
hozmagazin/
├── start.bat          hammasini ishga tushirish
├── install.bat        paketlarni qayta o'rnatish (faqat biror narsa buzilsa)
├── backend/           Node.js: bot (Telegraf) + API (Express) + Prisma
├── miniapp/           React: mijozlar ilovasi (Telegram Mini App)
├── admin/             React: admin panel
├── scripts/           ishga tushirish skripti
├── tools/             Node.js va cloudflared (tizimga o'rnatilmagan)
└── data/              lokal PostgreSQL ma'lumotlari
```

## 💻 Yangi kompyuterda (GitHub'dan yuklab olganda)

`tools/`, `data/` va `backend/.env` GitHub'ga yuklanmaydi, shuning uchun:

1. https://nodejs.org dan **Node.js 22 LTS** ni o'rnating.
2. [cloudflared-windows-amd64.exe](https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe) ni yuklab oling, nomini `cloudflared.exe` qilib, `tools\` papkasiga qo'ying.
3. `backend\.env.example` dan nusxa oling, nomini `backend\.env` qiling va `BOT_TOKEN`, `ADMIN_IDS`, `ADMIN_PASSWORD`, `ADMIN_SECRET` ni to'ldiring.
4. `start.bat` ni ishga tushiring — paketlar, baza va boshlang'ich mahsulotlar avtomatik tayyorlanadi.

## 🛠 Muammolar

| Muammo | Yechim |
|---|---|
| "portlardan biri band" | Eski `start.bat` oynasini yoping va qayta ishga tushiring |
| Bot javob bermaydi | `start.bat` oynasida xato bormi — tekshiring. `BOT_TOKEN` to'g'ri bo'lishi kerak |
| Mini App ochilmaydi | `start.bat` ni qayta ishga tushiring — yangi tunnel manzili olinadi |
| `/stats` "faqat adminlar uchun" deydi | Botga `/id` yuboring, raqamni `ADMIN_IDS` ga yozing, qayta ishga tushiring |
| Paketlar buzildi | `install.bat` ni ishga tushiring |
