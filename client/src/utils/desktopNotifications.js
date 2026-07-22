const DEFAULT_ICON = '/vite.svg';

const isSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export const getDesktopPermission = () => {
  if (!isSupported()) return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
};

/**
 * Must be called from a user click (browser gesture).
 * If already denied, browsers will NOT show the prompt again.
 */
export const requestDesktopPermission = async () => {
  if (!isSupported()) return 'unsupported';

  // Always re-read live permission (user may have changed site settings)
  const current = Notification.permission;
  if (current === 'granted') return 'granted';
  if (current === 'denied') return 'denied';

  try {
    const result = await Notification.requestPermission();
    localStorage.setItem('tm_notif_permission_asked', 'true');
    return result;
  } catch {
    localStorage.setItem('tm_notif_permission_asked', 'true');
    return Notification.permission;
  }
};

/**
 * Do NOT auto-prompt on load — that often gets Blocked accidentally.
 * Only sync current permission state.
 */
export const syncDesktopPermission = () => getDesktopPermission();

export const getNotificationHelpSteps = () => [
  'Click the lock / tune icon left of the address bar',
  'Open Site settings → Notifications',
  'Change to Allow',
  'Refresh this page, then click Enable again',
];

/**
 * Native desktop notification (Web Notification API).
 */
export const showDesktopNotification = ({
  title,
  message,
  description,
  icon,
  tag,
  onClick,
}) => {
  if (!isSupported() || Notification.permission !== 'granted') return null;

  const body = description || message || '';

  try {
    const n = new Notification(title || 'TaskFlow Reminder', {
      body,
      icon: icon || DEFAULT_ICON,
      badge: DEFAULT_ICON,
      tag: tag ? String(tag) : `taskflow-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      silent: false,
    });

    n.onclick = () => {
      window.focus();
      onClick?.();
      n.close();
    };

    setTimeout(() => n.close(), 12000);
    return n;
  } catch (err) {
    console.warn('Desktop notification failed:', err);
    return null;
  }
};
