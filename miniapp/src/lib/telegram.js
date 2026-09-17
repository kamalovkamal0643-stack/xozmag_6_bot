export const tg = window.Telegram?.WebApp;

export const isInTelegram = () => Boolean(tg?.initData);

const safe = (fn) => {
  try {
    fn();
  } catch {
    /* eski Telegram versiyalarida ba'zi metodlar yo'q */
  }
};

export function initTelegram() {
  if (!tg) return;
  safe(() => tg.ready());
  safe(() => tg.expand());
  safe(() => tg.setHeaderColor('#ffffff'));
  safe(() => tg.setBackgroundColor('#ffffff'));
  safe(() => tg.disableVerticalSwipes?.());
}

export const getInitData = () => tg?.initData || '';

export const getTelegramUser = () => tg?.initDataUnsafe?.user || null;

export function haptic(kind = 'light') {
  safe(() => {
    if (!tg?.HapticFeedback) return;
    if (['success', 'error', 'warning'].includes(kind)) tg.HapticFeedback.notificationOccurred(kind);
    else tg.HapticFeedback.impactOccurred(kind);
  });
}

export function closeApp() {
  safe(() => tg?.close());
}

export function onBackButton(handler) {
  if (!tg?.BackButton || !isInTelegram()) return () => {};
  safe(() => {
    tg.BackButton.onClick(handler);
    tg.BackButton.show();
  });
  return () =>
    safe(() => {
      tg.BackButton.offClick(handler);
      tg.BackButton.hide();
    });
}

export function requestLocation() {
  return new Promise((resolve, reject) => {
    const fallback = () => {
      if (!navigator.geolocation) {
        reject(new Error("Qurilmangiz joylashuvni aniqlay olmaydi. Manzilni yozing."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => reject(new Error("Joylashuvga ruxsat berilmadi. Manzilni qo'lda yozing.")),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    const lm = tg?.LocationManager;
    if (!lm || !tg.isVersionAtLeast?.('8.0')) {
      fallback();
      return;
    }

    try {
      lm.init(() => {
        if (!lm.isLocationAvailable) {
          fallback();
          return;
        }
        lm.getLocation((location) => {
          if (location) resolve({ latitude: location.latitude, longitude: location.longitude });
          else reject(new Error("Joylashuvga ruxsat berilmadi. Manzilni qo'lda yozing."));
        });
      });
    } catch {
      fallback();
    }
  });
}
