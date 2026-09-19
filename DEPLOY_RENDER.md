# Деплой backend на Render.com

Фронтенды уже опубликованы на Vercel и ждут backend по адресу **https://xozmag-6-bot-api.onrender.com**:

| Часть | Адрес |
|---|---|
| Mini App (для покупателей) | https://xozmag-6-miniapp.vercel.app |
| Админ-панель | https://xozmag-6-admin.vercel.app |
| Backend (бот + API) — создаёте вы | https://xozmag-6-bot-api.onrender.com |

Код backend уже готов к Render: на Render он сам включает webhook для бота, слушает внешние подключения и открывает admin API для панели на Vercel.

---

## Шаг 0. Подготовка (2 минуты)

1. **Закройте окно `start.bat`**, если оно открыто, чтобы локальный бот не мешал облачному.
2. **Рекомендуется — новый токен бота.** Токен уже пересылался в переписке, безопаснее его заменить:
   @BotFather → `/revoke` → выберите `@xozmag_6_bot` → скопируйте новый токен. Его и используйте в шаге 3.

## Шаг 1. База данных Neon (5 минут)

Render нужна облачная PostgreSQL. Neon бесплатный и не удаляет данные со временем.

1. Откройте https://neon.tech → **Sign up** → войдите через GitHub.
2. **Create project**: имя `hozmagazin`, регион **AWS Europe Central 1 (Frankfurt)** → **Create**.
3. На странице проекта нажмите **Connect** и скопируйте строку подключения кнопкой копирования.

**Ничего в строке менять не нужно.** Переключатель *Connection pooling*, `channel_binding=require` и таймаут backend настраивает сам. Строка выглядит примерно так:
```
postgresql://neondb_owner:ПАРОЛЬ@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## Шаг 2. Web Service на Render (5 минут)

1. Откройте https://render.com → **Get Started** → **GitHub** (войдите через GitHub).
2. В Dashboard нажмите **New +** → **Web Service**.
3. **Git Provider → GitHub**. Если репозиторий не виден — **Configure account** → *Only select repositories* → выберите `xozmag_6_bot` → **Save**.
4. Выберите `kamalovkamal0643-stack/xozmag_6_bot` → **Connect**.
5. Заполните форму:

| Поле | Значение |
|---|---|
| **Name** | `xozmag-6-bot-api` — именно так, от имени зависит адрес |
| **Language** | `Node` |
| **Branch** | `main` |
| **Region** | `Frankfurt (EU Central)` |
| **Root Directory** | `backend` |
| **Build Command** | `npm install --omit=optional && npm run db:deploy` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

## Шаг 3. Переменные окружения

В блоке **Environment Variables** нажмите **Add from .env**, вставьте текст ниже, замените значения в угловых скобках и нажмите **Add variables**:

```
DATABASE_URL=<строка из Neon, как скопировали>
BOT_TOKEN=<токен бота>
ADMIN_IDS=<ваш Telegram ID — узнать: отправьте боту /id>
MINIAPP_URL=https://xozmag-6-miniapp.vercel.app
ADMIN_PANEL_URL=https://xozmag-6-admin.vercel.app
CORS_ORIGINS=https://xozmag-6-miniapp.vercel.app,https://xozmag-6-admin.vercel.app
ADMIN_PASSWORD=<придумайте надёжный пароль для админки>
ADMIN_SECRET=<длинная случайная строка, минимум 32 символа>
SKIP_TELEGRAM_AUTH=false
SHOP_NAME=Hozmagazin
SHOP_PHONE=+998 90 123 45 67
SHOP_WORK_HOURS=09:00 - 21:00
DELIVERY_FEE=10000
FREE_DELIVERY_FROM=200000
MIN_ORDER=20000
DAILY_REPORT_CRON=0 20 * * *
TZ_NAME=Asia/Tashkent
TZ_OFFSET_MINUTES=300
```

После вставки проверьте, что у значений `SHOP_PHONE`, `SHOP_WORK_HOURS` и `DAILY_REPORT_CRON` нет лишних кавычек.
`PORT` и `RENDER_EXTERNAL_URL` добавлять не нужно — Render задаёт их сам.

Затем раскройте **Advanced** → **Health Check Path**: `/api/health`.
Нажмите **Deploy Web Service**.

## Шаг 4. Проверка (5 минут)

1. На странице сервиса откройте **Logs** и дождитесь статуса **Live**. В логах должны быть строки:
   - `🗄  PostgreSQL bazasiga ulandi`
   - `🌱 Baza bo'sh — boshlang'ich ma'lumotlar yozilmoqda...` (только при первом запуске)
   - `🤖 Bot webhook rejimida ishlayapti: https://t.me/xozmag_6_bot`
2. Адрес сервиса вверху страницы должен быть ровно `https://xozmag-6-bot-api.onrender.com`. Если отличается — шаг 5.
3. Откройте https://xozmag-6-bot-api.onrender.com/api/health — должно быть `"ok":true` и `"bot":true`.
4. В Telegram откройте `@xozmag_6_bot` → `/start` → кнопка меню **Do'kon** — должен открыться каталог с товарами.
   Если кнопка ведёт на старый адрес, закройте чат и откройте снова.
5. Откройте https://xozmag-6-admin.vercel.app и войдите с паролем из `ADMIN_PASSWORD`.
6. Сделайте тестовый заказ в Mini App — бот пришлёт уведомление, заказ появится в админке.

## Шаг 5. Если Render дал другой адрес

Render добавляет к адресу случайный суффикс, если имя занято. Тогда фронтенды нужно направить на новый адрес:

1. https://vercel.com → проект **xozmag-6-miniapp** → **Settings** → **Environment Variables**.
2. У `VITE_API_URL` нажмите **⋯ → Edit**, вставьте новый адрес Render (без `/` в конце) → **Save**. Сделайте это для Production и Preview.
3. **Deployments** → последний деплой → **⋯ → Redeploy**.
4. Повторите для проекта **xozmag-6-admin**.
5. В Render в `CORS_ORIGINS` ничего менять не нужно — там адреса Vercel.

---

## Важно знать

- **Сон бесплатного Render.** Render засыпает через 15 минут без запросов, и тогда первый ответ занимает 20–60 секунд. Backend этого не допускает: каждые 5 минут он обращается к своему адресу (переменная `KEEP_ALIVE_MINUTES`, `0` — выключить). Бесплатных 750 часов в месяц хватает ровно на один постоянно работающий сервис — второй бесплатный сервис их не уложит.
- **После деплоя или перезапуска** Render всё равно поднимает сервис заново: первые секунды бот может отвечать медленнее. Самый быстрый вариант — тариф Starter (7 $/мес): без сна и с более мощным процессором.
- **Новая база** начинается с 26 стартовых товаров. Данные из локальной базы (`data/`) не переносятся.
- **Локальный `start.bat`** после переезда бота на Render сам не запускает бота: он видит, что бот работает в облаке. Mini App и админка локально продолжают работать со своей базой.
- **Обновления кода**: каждый push в ветку `main` Render пересобирает автоматически. Фронтенды на Vercel опубликованы через CLI, поэтому после изменений их нужно задеплоить заново (`vercel deploy --prod` в папках `miniapp` и `admin`) или подключить репозиторий в настройках проектов Vercel.
- **Vercel Hobby** по правилам Vercel предназначен для некоммерческого использования; для магазина нужен тариф Pro.
