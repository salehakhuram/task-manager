import { format } from 'date-fns';
import { CheckCircle2, Circle, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '../ui/EmptyState';
import { getPriorityStyle, cn } from '../../utils/helpers';

export default function TaskItem({ task, onToggle, onEdit, onDelete }) {
  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4 transition hover:border-brand-200 dark:border-ink-800 dark:bg-ink-900/60 dark:hover:border-brand-800',
        task.status === 'completed' && 'opacity-70'
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(task)}
        className="mt-0.5 text-brand-600 dark:text-brand-400"
        aria-label={task.status === 'completed' ? 'Mark pending' : 'Mark complete'}
      >
        {task.status === 'completed' ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={cn(
              'font-medium text-ink-900 dark:text-ink-50',
              task.status === 'completed' && 'line-through'
            )}
          >
            {task.title}
          </h3>
          <Badge className={getPriorityStyle(task.priority)}>{task.priority}</Badge>
          {task.category && (
            <Badge className="bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              {task.category}
            </Badge>
          )}
        </div>
        {task.description && (
          <p className="mt-1 line-clamp-2 text-sm text-ink-500 dark:text-ink-400">{task.description}</p>
        )}
        <p className="mt-2 text-xs text-ink-400">
          Due {format(new Date(task.dueDate), 'MMM d, yyyy · h:mm a')}
        </p>
      </div>
      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        <button type="button" className="btn-ghost !p-2" onClick={() => onEdit(task)}>
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" className="btn-ghost !p-2 text-rose-500" onClick={() => onDelete(task)}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
