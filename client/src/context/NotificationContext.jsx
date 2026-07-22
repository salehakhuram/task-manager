import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { notificationService } from '../services';
import { useAuth } from './AuthContext';
import {
  getDesktopPermission,
  syncDesktopPermission,
  requestDesktopPermission,
  showDesktopNotification,
} from '../utils/desktopNotifications';
import { isPushSupported, subscribeToPush } from '../utils/pushNotifications';

const NotificationContext = createContext(null);

const shownReminderIds = new Set();

const showReminderToast = (payload) => {
  const overdue = payload.overdue || payload.missed;
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-slide-down' : 'opacity-0'
        } max-w-sm rounded-2xl border px-4 py-3 shadow-soft ${
          overdue
            ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
            : 'border-brand-200 bg-white dark:border-brand-800 dark:bg-ink-900'
        }`}
      >
        <p className="font-display text-sm font-semibold text-ink-900 dark:text-ink-50">
          {payload.title}
        </p>
        <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-300">
          {payload.description || payload.message}
        </p>
        {overdue && (
          <p className="mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
            Ye waqt guzar gaya hai
          </p>
        )}
      </div>
    ),
    { duration: 7000, id: `reminder-${payload.notificationId || payload.id}` }
  );
};

const handleReminderEvent = (payload, { onStored }) => {
  const id = String(payload.notificationId || payload.id || '');
  if (id && shownReminderIds.has(id)) return;
  if (id) shownReminderIds.add(id);

  const overdue = payload.overdue || payload.missed;
  const desktopTitle = overdue
    ? payload.title?.startsWith('Time passed')
      ? payload.title
      : `Time passed: ${payload.title}`
    : payload.title;
  const desktopBody = overdue
    ? `Ye waqt guzar gaya hai. ${payload.description || payload.message || ''}`
    : payload.description || payload.message;

  showDesktopNotification({
    title: desktopTitle,
    message: payload.message,
    description: desktopBody,
    icon: payload.icon || '/vite.svg',
    tag: id || undefined,
  });

  showReminderToast(payload);
  onStored?.(payload);
};

export const NotificationProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [desktopPermission, setDesktopPermission] = useState(getDesktopPermission);
  const [pushReady, setPushReady] = useState(
    () => localStorage.getItem('tm_push_enabled') === 'true'
  );
  const socketRef = useRef(null);

  const upsertFromReminder = useCallback((payload) => {
    const doc = {
      _id: payload.notificationId || payload.id,
      title: payload.title,
      message: payload.message,
      description: payload.description,
      type: payload.type,
      icon: payload.icon,
      relatedId: payload.relatedId,
      relatedModel: payload.relatedModel,
      isRead: false,
      createdAt: payload.createdAt || new Date().toISOString(),
    };

    setNotifications((prev) => {
      if (prev.some((n) => String(n._id) === String(doc._id))) return prev;
      return [doc, ...prev];
    });
    setUnreadCount((c) => c + 1);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const { data } = await notificationService.getAll({ limit: 40 });
      setNotifications(data.data);
      setUnreadCount(data.unreadCount);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const enableDesktopNotifications = useCallback(async () => {
    const permission = await requestDesktopPermission();
    setDesktopPermission(permission);

    if (permission !== 'granted') {
      // Panel shows unblock steps when denied — avoid noisy toast-only UX
      return permission;
    }

    if (isPushSupported()) {
      const result = await subscribeToPush();
      setPushReady(Boolean(result.ok));
    }

    toast.success('Desktop reminders enabled');
    return permission;
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Sync permission on load + when user returns from browser settings
  useEffect(() => {
    setDesktopPermission(syncDesktopPermission());

    const refresh = () => setDesktopPermission(syncDesktopPermission());
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  // After login: ensure push subscription when permission already granted
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    if (getDesktopPermission() !== 'granted') return undefined;

    const timer = setTimeout(async () => {
      if (!isPushSupported()) return;
      const result = await subscribeToPush();
      setPushReady(Boolean(result.ok));
      setDesktopPermission('granted');
    }, 800);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // Socket.IO — listen for reminder (+ legacy notification) events
  useEffect(() => {
    if (!token || !isAuthenticated) return undefined;

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      path: '/socket.io',
    });
    socketRef.current = socket;

    socket.on('reminder', (payload) => {
      handleReminderEvent(payload, { onStored: upsertFromReminder });
    });

    // Legacy channel: still refresh list, avoid double desktop if reminder already handled
    socket.on('notification', (notification) => {
      const id = String(notification._id);
      setNotifications((prev) => {
        if (prev.some((n) => String(n._id) === id)) return prev;
        return [notification, ...prev];
      });
      if (!shownReminderIds.has(id)) {
        setUnreadCount((c) => c + 1);
      }
    });

    socket.on('connect', () => {
      // Server flushes missed reminders on connect; client is ready to receive `reminder`
      console.info('Socket connected — listening for reminders');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, isAuthenticated, upsertFromReminder]);

  const markRead = async (id) => {
    await notificationService.markRead(id);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const remove = async (id) => {
    await notificationService.remove(id);
    setNotifications((prev) => {
      const target = prev.find((n) => n._id === id);
      if (target && !target.isRead) setUnreadCount((c) => Math.max(0, c - 1));
      return prev.filter((n) => n._id !== id);
    });
  };

  const clearAll = async () => {
    await notificationService.clearAll();
    setNotifications([]);
    setUnreadCount(0);
  };

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      desktopPermission,
      pushReady,
      enableDesktopNotifications,
      fetchNotifications,
      markRead,
      markAllRead,
      remove,
      clearAll,
    }),
    [
      notifications,
      unreadCount,
      loading,
      desktopPermission,
      pushReady,
      enableDesktopNotifications,
      fetchNotifications,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
