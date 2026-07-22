import { format } from 'date-fns';
import { MapPin, Pencil, Trash2, Clock } from 'lucide-react';

export default function MeetingItem({ meeting, onEdit, onDelete }) {
  return (
    <div className="group flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4 transition hover:border-brand-200 dark:border-ink-800 dark:bg-ink-900/60 dark:hover:border-brand-800">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
        <Clock className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-ink-900 dark:text-ink-50">{meeting.title}</h3>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          {format(new Date(meeting.date), 'EEE, MMM d, yyyy')} · {meeting.time}
        </p>
        {meeting.location && (
          <p className="mt-1 flex items-center gap-1 text-sm text-ink-500">
            <MapPin className="h-3.5 w-3.5" /> {meeting.location}
          </p>
        )}
        {meeting.notes && (
          <p className="mt-2 line-clamp-2 text-sm text-ink-500 dark:text-ink-400">{meeting.notes}</p>
        )}
      </div>
      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        <button type="button" className="btn-ghost !p-2" onClick={() => onEdit(meeting)}>
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" className="btn-ghost !p-2 text-rose-500" onClick={() => onDelete(meeting)}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
