import api from '../services/api';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
};

export const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export const registerServiceWorker = async () => {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return registration;
};

export const subscribeToPush = async () => {
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported' };
  }

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

  if (permission !== 'granted') {
    return { ok: false, reason: permission };
  }

  const { data } = await api.get('/push/vapid-public-key');
  if (!data?.data?.enabled || !data?.data?.publicKey) {
    return { ok: false, reason: 'server-disabled' };
  }

  const registration = await registerServiceWorker();
  if (!registration) return { ok: false, reason: 'unsupported' };

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.data.publicKey),
    });
  }

  await api.post('/push/subscribe', subscription.toJSON());
  localStorage.setItem('tm_push_enabled', 'true');
  return { ok: true, reason: 'granted', subscription };
};

export const unsubscribeFromPush = async () => {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager?.getSubscription();
  if (subscription) {
    try {
      await api.delete('/push/subscribe', { data: { endpoint: subscription.endpoint } });
    } catch {
      /* ignore */
    }
    await subscription.unsubscribe();
  }
  localStorage.removeItem('tm_push_enabled');
};
