import { formatDistanceToNow } from 'date-fns';
import { CheckCheck, Trash2, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNotifications } from '../../context/NotificationContext';
import { getNotificationHelpSteps } from '../../utils/desktopNotifications';
import { cn } from '../../utils/helpers';

export default function NotificationPanel({ onClose }) {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    remove,
    clearAll,
    desktopPermission,
    enableDesktopNotifications,
  } = useNotifications();

  const handleEnableDesktop = async () => {
    const result = await enableDesktopNotifications();
    if (result === 'default') {
      toast('Permission popup was dismissed — click Enable again and choose Allow');
    }
    // granted: success toast comes from enableDesktopNotifications
    // denied: unblock steps shown in panel
  };

  return (
    <>
      <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="absolute right-0 top-12 z-50 w-[min(100vw-2rem,24rem)] animate-slide-down overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft dark:border-ink-700 dark:bg-ink-900">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
          <div>
            <p className="font-display text-sm font-semibold">Notifications</p>
            <p className="text-xs text-ink-500">{unreadCount} unread</p>
          </div>
          <div className="flex gap-1">
            <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={markAllRead} title="Mark all read">
              <CheckCheck className="h-4 w-4" />
            </button>
            <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={clearAll} title="Clear all">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {desktopPermission === 'default' && (
          <div className="border-b border-ink-100 bg-brand-50/80 px-4 py-3 dark:border-ink-800 dark:bg-brand-950/30">
            <p className="text-xs text-ink-600 dark:text-ink-300">
              Click below and choose <strong>Allow</strong> so reminders can appear on your desktop.
            </p>
            <button
              type="button"
              className="btn-primary mt-2 !px-3 !py-1.5 text-xs"
              onClick={handleEnableDesktop}
            >
              <Monitor className="h-3.5 w-3.5" />
              Enable desktop reminders
            </button>
          </div>
        )}

        {desktopPermission === 'denied' && (
          <div className="border-b border-ink-100 bg-amber-50 px-4 py-3 dark:border-ink-800 dark:bg-amber-950/30">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              Notifications are blocked for this site
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              The browser will not show the Allow popup again until you turn it on in settings:
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] text-amber-800 dark:text-amber-200">
              {getNotificationHelpSteps().map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <button
              type="button"
              className="btn-secondary mt-3 !px-3 !py-1.5 text-xs"
              onClick={handleEnableDesktop}
            >
              I&apos;ve allowed it — check again
            </button>
          </div>
        )}

        {desktopPermission === 'granted' && (
          <div className="border-b border-ink-100 px-4 py-2 dark:border-ink-800">
            <p className="text-[11px] text-brand-700 dark:text-brand-300">
              Desktop reminders are on. Missed ones are delivered when you reconnect.
            </p>
          </div>
        )}

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-500">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                className={cn(
                  'border-b border-ink-50 px-4 py-3 transition dark:border-ink-800',
                  !n.isRead && 'bg-brand-50/60 dark:bg-brand-950/30'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => !n.isRead && markRead(n._id)}
                  >
                    <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">{n.title}</p>
                    <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-300">{n.message}</p>
                    <p className="mt-1 text-[11px] text-ink-400">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="btn-ghost !p-1 text-ink-400"
                    onClick={() => remove(n._id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
