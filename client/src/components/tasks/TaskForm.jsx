import { useEffect, useMemo, useState } from 'react';
import {
  PRIORITY_OPTIONS,
  cn,
  getMinDateTimeLocal,
  toDateTimeLocalValue,
  validateTaskDueDate,
} from '../../utils/helpers';
import ReminderFields, {
  computeReminderAtLocal,
  validateReminderAt,
} from '../ui/ReminderFields';

const initial = {
  title: '',
  description: '',
  priority: 'medium',
  category: 'General',
  dueDate: '',
  reminder: 15,
  reminderAt: '',
  status: 'pending',
};

export default function TaskForm({ initialData, defaultDate, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial);
  const [dueError, setDueError] = useState('');
  const [reminderError, setReminderError] = useState('');

  const minDateTime = useMemo(() => getMinDateTimeLocal(), []);

  useEffect(() => {
    if (initialData) {
      const due = toDateTimeLocalValue(initialData.dueDate);
      const remAt = initialData.reminderAt
        ? toDateTimeLocalValue(initialData.reminderAt)
        : computeReminderAtLocal(due, initialData.reminder ?? 15);
      setForm({
        title: initialData.title || '',
        description: initialData.description || '',
        priority: initialData.priority || 'medium',
        category: initialData.category || 'General',
        dueDate: due,
        reminder: initialData.reminder ?? 15,
        reminderAt: remAt,
        status: initialData.status || 'pending',
      });
    } else if (defaultDate) {
      const d = new Date(defaultDate);
      if (!Number.isNaN(d.getTime())) {
        const now = new Date();
        // If calendar day is today/past morning default, bump to at least +1 hour from now
        if (d.getTime() <= now.getTime()) {
          d.setTime(now.getTime() + 60 * 60 * 1000);
        } else {
          d.setHours(Math.max(9, now.getHours()), 0, 0, 0);
          if (d.getTime() <= now.getTime()) {
            d.setTime(now.getTime() + 60 * 60 * 1000);
          }
        }
        const due = toDateTimeLocalValue(d);
        setForm((f) => ({
          ...f,
          dueDate: due,
          reminderAt: computeReminderAtLocal(due, f.reminder),
        }));
      }
    } else {
      // Default new task: 1 hour from now
      const d = new Date(Date.now() + 60 * 60 * 1000);
      const due = toDateTimeLocalValue(d);
      setForm((f) => ({
        ...f,
        dueDate: due,
        reminderAt: computeReminderAtLocal(due, f.reminder),
      }));
    }
  }, [initialData, defaultDate]);

  const setDueDate = (value) => {
    setForm((prev) => ({
      ...prev,
      dueDate: value,
      reminderAt: computeReminderAtLocal(value, prev.reminder),
    }));
    setDueError(validateTaskDueDate(value));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Editing completed tasks may keep past due dates; only enforce future on create / pending
    const mustBeFuture = !initialData || form.status === 'pending';
    const dueErr = mustBeFuture ? validateTaskDueDate(form.dueDate) : '';
    setDueError(dueErr);
    const remErr = validateReminderAt(form.reminderAt, form.dueDate);
    setReminderError(remErr);
    if (dueErr || remErr) return;

    onSubmit({
      title: form.title,
      description: form.description,
      priority: form.priority,
      category: form.category,
      status: form.status,
      dueDate: new Date(form.dueDate).toISOString(),
      reminder: Number(form.reminder),
      reminderAt: new Date(form.reminderAt).toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="task-title">Title</label>
        <input
          id="task-title"
          required
          className="input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="What needs to be done?"
        />
      </div>
      <div>
        <label className="label" htmlFor="task-desc">Description</label>
        <textarea
          id="task-desc"
          rows={3}
          className="input resize-none"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Optional details"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="task-priority">Priority</label>
          <select
            id="task-priority"
            className="input"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="task-category">Category</label>
          <input
            id="task-category"
            className="input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="General"
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="task-due">Due date & time</label>
        <input
          id="task-due"
          type="datetime-local"
          required
          min={minDateTime}
          className={cn(
            'input',
            dueError && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
          )}
          value={form.dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          onBlur={() => setDueError(validateTaskDueDate(form.dueDate))}
        />
        {dueError && (
          <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{dueError}</p>
        )}
      </div>

      <ReminderFields
        eventAt={form.dueDate}
        reminder={form.reminder}
        reminderAt={form.reminderAt}
        onReminderChange={(minutes) => setForm((f) => ({ ...f, reminder: minutes }))}
        onReminderAtChange={(value) => {
          setForm((f) => ({ ...f, reminderAt: value }));
          setReminderError('');
        }}
        error={reminderError}
      />

      {initialData && (
        <div>
          <label className="label" htmlFor="task-status">Status</label>
          <select
            id="task-status"
            className="input"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading || !!dueError || !!reminderError}>
          {loading ? 'Saving…' : initialData ? 'Update task' : 'Create task'}
        </button>
      </div>
    </form>
  );
}
