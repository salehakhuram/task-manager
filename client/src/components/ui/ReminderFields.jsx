import { useMemo } from 'react';
import { REMINDER_OPTIONS, toDateTimeLocalValue, cn } from '../../utils/helpers';

/**
 * Reminder UI: preset offsets + editable absolute reminder date/time.
 */
export default function ReminderFields({
  eventAt,
  reminder,
  reminderAt,
  onReminderChange,
  onReminderAtChange,
  error,
}) {
  const preview = useMemo(() => {
    if (!reminderAt) return '';
    try {
      return new Date(reminderAt).toLocaleString();
    } catch {
      return '';
    }
  }, [reminderAt]);

  const applyPreset = (minutes) => {
    onReminderChange(Number(minutes));
    if (eventAt) {
      const event = new Date(eventAt);
      if (!Number.isNaN(event.getTime())) {
        const at = new Date(event.getTime() - Number(minutes) * 60 * 1000);
        onReminderAtChange(toDateTimeLocalValue(at));
      }
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-ink-100 bg-ink-50/60 p-4 dark:border-ink-800 dark:bg-ink-900/40">
      <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">Reminder</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="reminder-preset">
            Remind me
          </label>
          <select
            id="reminder-preset"
            className="input"
            value={reminder}
            onChange={(e) => applyPreset(e.target.value)}
          >
            {REMINDER_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="reminder-at">
            Reminder date &amp; time
          </label>
          <input
            id="reminder-at"
            type="datetime-local"
            required
            className={cn(
              'input',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
            )}
            value={reminderAt}
            onChange={(e) => onReminderAtChange(e.target.value)}
          />
        </div>
      </div>
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : (
        preview && (
          <p className="text-xs text-ink-500 dark:text-ink-400">
            Desktop notification will fire at <span className="font-medium">{preview}</span>
          </p>
        )
      )}
    </div>
  );
}

export const computeReminderAtLocal = (eventDateTimeLocal, minutesBefore) => {
  if (!eventDateTimeLocal) return '';
  const event = new Date(eventDateTimeLocal);
  if (Number.isNaN(event.getTime())) return '';
  return toDateTimeLocalValue(
    new Date(event.getTime() - Number(minutesBefore) * 60 * 1000)
  );
};

export const validateReminderAt = (reminderAtLocal, eventAtLocal, { requireFuture = true } = {}) => {
  if (!reminderAtLocal) return 'Reminder date & time is required';
  const reminder = new Date(reminderAtLocal);
  if (Number.isNaN(reminder.getTime())) return 'Enter a valid reminder date & time';
  if (eventAtLocal) {
    const event = new Date(eventAtLocal);
    if (!Number.isNaN(event.getTime()) && reminder.getTime() > event.getTime()) {
      return 'Reminder must be at or before the event time';
    }
  }
  if (requireFuture && reminder.getTime() <= Date.now()) {
    return 'Reminder must be in the future';
  }
  return '';
};
