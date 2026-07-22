import { useEffect, useMemo, useState } from 'react';
import {
  cn,
  toDateInputValue,
  toDateTimeLocalValue,
  validateMeetingDateTime,
} from '../../utils/helpers';
import ReminderFields, {
  computeReminderAtLocal,
  validateReminderAt,
} from '../ui/ReminderFields';

const initial = {
  title: '',
  date: '',
  time: '10:00',
  location: '',
  notes: '',
  reminder: 15,
  reminderAt: '',
};

export default function MeetingForm({ initialData, defaultDate, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial);
  const [dateTimeError, setDateTimeError] = useState('');
  const [reminderError, setReminderError] = useState('');
  const [touchedSchedule, setTouchedSchedule] = useState(false);

  const todayStr = useMemo(() => toDateInputValue(new Date()), []);

  const eventLocal = form.date && form.time ? `${form.date}T${form.time}` : '';

  useEffect(() => {
    if (initialData) {
      const date = toDateInputValue(initialData.date);
      const time = initialData.time || '10:00';
      const event = `${date}T${time}`;
      const remAt = initialData.reminderAt
        ? toDateTimeLocalValue(initialData.reminderAt)
        : computeReminderAtLocal(event, initialData.reminder ?? 15);
      setForm({
        title: initialData.title || '',
        date,
        time,
        location: initialData.location || '',
        notes: initialData.notes || '',
        reminder: initialData.reminder ?? 15,
        reminderAt: remAt,
      });
    } else if (defaultDate) {
      const picked = toDateInputValue(defaultDate);
      const date = picked < todayStr ? todayStr : picked;
      setForm((f) => {
        const event = `${date}T${f.time}`;
        return {
          ...f,
          date,
          reminderAt: computeReminderAtLocal(event, f.reminder),
        };
      });
    }
  }, [initialData, defaultDate, todayStr]);

  const syncReminderFromSchedule = (next) => {
    const event = next.date && next.time ? `${next.date}T${next.time}` : '';
    return {
      ...next,
      reminderAt: computeReminderAtLocal(event, next.reminder),
    };
  };

  const updateField = (field, value) => {
    setForm((prev) => {
      let next = { ...prev, [field]: value };
      if (field === 'date' || field === 'time') {
        const err = validateMeetingDateTime(
          field === 'date' ? value : next.date,
          field === 'time' ? value : next.time
        );
        if (touchedSchedule) setDateTimeError(err);
        next = syncReminderFromSchedule(next);
      }
      if (field === 'reminder') {
        next = syncReminderFromSchedule({ ...next, reminder: Number(value) });
      }
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouchedSchedule(true);
    const scheduleErr = validateMeetingDateTime(form.date, form.time);
    setDateTimeError(scheduleErr);
    const remErr = validateReminderAt(form.reminderAt, eventLocal);
    setReminderError(remErr);
    if (scheduleErr || remErr) return;

    onSubmit({
      title: form.title,
      date: new Date(`${form.date}T12:00:00`).toISOString(),
      time: form.time,
      location: form.location,
      notes: form.notes,
      reminder: Number(form.reminder),
      reminderAt: new Date(form.reminderAt).toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="meeting-title">Title</label>
        <input
          id="meeting-title"
          required
          className="input"
          value={form.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Meeting title"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="meeting-date">Date</label>
          <input
            id="meeting-date"
            type="date"
            required
            min={todayStr}
            className={cn(
              'input',
              dateTimeError && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
            )}
            value={form.date}
            onChange={(e) => updateField('date', e.target.value)}
            onBlur={() => {
              setTouchedSchedule(true);
              setDateTimeError(validateMeetingDateTime(form.date, form.time));
            }}
          />
        </div>
        <div>
          <label className="label" htmlFor="meeting-time">Time</label>
          <input
            id="meeting-time"
            type="time"
            required
            className={cn(
              'input',
              dateTimeError && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
            )}
            value={form.time}
            onChange={(e) => updateField('time', e.target.value)}
            onBlur={() => {
              setTouchedSchedule(true);
              setDateTimeError(validateMeetingDateTime(form.date, form.time));
            }}
          />
        </div>
      </div>
      {dateTimeError && (
        <p className="-mt-2 text-xs text-rose-600 dark:text-rose-400">{dateTimeError}</p>
      )}
      <div>
        <label className="label" htmlFor="meeting-location">Location</label>
        <input
          id="meeting-location"
          className="input"
          value={form.location}
          onChange={(e) => updateField('location', e.target.value)}
          placeholder="Office, Zoom, etc."
        />
      </div>
      <div>
        <label className="label" htmlFor="meeting-notes">Notes</label>
        <textarea
          id="meeting-notes"
          rows={3}
          className="input resize-none"
          value={form.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Agenda or notes"
        />
      </div>

      <ReminderFields
        eventAt={eventLocal}
        reminder={form.reminder}
        reminderAt={form.reminderAt}
        onReminderChange={(minutes) => updateField('reminder', minutes)}
        onReminderAtChange={(value) => {
          setForm((f) => ({ ...f, reminderAt: value }));
          setReminderError('');
        }}
        error={reminderError}
      />

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !!dateTimeError || !!reminderError}
        >
          {loading ? 'Saving…' : initialData ? 'Update meeting' : 'Create meeting'}
        </button>
      </div>
    </form>
  );
}
