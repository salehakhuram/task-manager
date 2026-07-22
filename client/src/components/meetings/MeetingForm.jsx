import { useEffect, useMemo, useState } from 'react';
import {
  cn,
  toDateInputValue,
  toDateTimeLocalValue,
  validateMeetingDateTime,
  validateOptionalText,
  validateTitle,
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
  const [titleError, setTitleError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [notesError, setNotesError] = useState('');
  const [dateTimeError, setDateTimeError] = useState('');
  const [reminderError, setReminderError] = useState('');
  const [touchedSchedule, setTouchedSchedule] = useState(false);

  const todayStr = useMemo(() => toDateInputValue(new Date()), []);

  const eventLocal = form.date && form.time ? `${form.date}T${form.time}` : '';
  const isPastMeeting =
    Boolean(initialData) && Boolean(validateMeetingDateTime(form.date, form.time));

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
    } else {
      setForm((f) => {
        const event = `${todayStr}T${f.time}`;
        return {
          ...f,
          date: todayStr,
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

    const nextTitle = validateTitle(form.title, 'Meeting title');
    const nextLoc = validateOptionalText(form.location, 300, 'Location');
    const nextNotes = validateOptionalText(form.notes, 2000, 'Notes');

    // Past meetings: allow notes/location/title edits without forcing a future schedule
    const scheduleChanged =
      !initialData ||
      toDateInputValue(initialData.date) !== form.date ||
      (initialData.time || '10:00') !== form.time;

    const scheduleErr =
      !initialData || scheduleChanged
        ? validateMeetingDateTime(form.date, form.time)
        : '';

    const remErr =
      !initialData || scheduleChanged
        ? validateReminderAt(form.reminderAt, eventLocal, { requireFuture: true })
        : validateReminderAt(form.reminderAt, eventLocal, { requireFuture: false });

    setTitleError(nextTitle);
    setLocationError(nextLoc);
    setNotesError(nextNotes);
    setDateTimeError(scheduleErr);
    setReminderError(remErr);

    if (nextTitle || nextLoc || nextNotes || scheduleErr || remErr) return;

    onSubmit({
      title: form.title.trim(),
      date: new Date(`${form.date}T12:00:00`).toISOString(),
      time: form.time,
      location: form.location.trim(),
      notes: form.notes.trim(),
      reminder: Number(form.reminder),
      reminderAt: new Date(form.reminderAt).toISOString(),
    });
  };

  const hasErrors =
    !!titleError || !!locationError || !!notesError || !!dateTimeError || !!reminderError;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="meeting-title">Title</label>
        <input
          id="meeting-title"
          maxLength={200}
          className={cn(
            'input',
            titleError && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
          )}
          value={form.title}
          onChange={(e) => {
            updateField('title', e.target.value);
            setTitleError(validateTitle(e.target.value, 'Meeting title'));
          }}
          placeholder="Meeting title"
        />
        {titleError && (
          <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{titleError}</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="meeting-date">Date</label>
          <input
            id="meeting-date"
            type="date"
            min={isPastMeeting ? undefined : todayStr}
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
          maxLength={300}
          className={cn(
            'input',
            locationError && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
          )}
          value={form.location}
          onChange={(e) => {
            updateField('location', e.target.value);
            setLocationError(validateOptionalText(e.target.value, 300, 'Location'));
          }}
          placeholder="Office, Zoom, etc."
        />
        {locationError && (
          <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{locationError}</p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="meeting-notes">Notes</label>
        <textarea
          id="meeting-notes"
          rows={3}
          maxLength={2000}
          className={cn(
            'input resize-none',
            notesError && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
          )}
          value={form.notes}
          onChange={(e) => {
            updateField('notes', e.target.value);
            setNotesError(validateOptionalText(e.target.value, 2000, 'Notes'));
          }}
          placeholder="Agenda or notes"
        />
        {notesError && (
          <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{notesError}</p>
        )}
      </div>

      <ReminderFields
        eventAt={eventLocal}
        reminder={form.reminder}
        reminderAt={form.reminderAt}
        onReminderChange={(minutes) => updateField('reminder', minutes)}
        onReminderAtChange={(value) => {
          setForm((f) => ({ ...f, reminderAt: value }));
          setReminderError(
            validateReminderAt(value, eventLocal, { requireFuture: !isPastMeeting })
          );
        }}
        error={reminderError}
      />

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || hasErrors}
        >
          {loading ? 'Saving…' : initialData ? 'Update meeting' : 'Create meeting'}
        </button>
      </div>
    </form>
  );
}
