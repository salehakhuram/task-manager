import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  CheckSquare,
  CircleDashed,
  CalendarDays,
  Bell,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { dashboardService } from '../services';
import { useAuth } from '../context/AuthContext';
import { Spinner, Badge } from '../components/ui/EmptyState';
import { getErrorMessage, getPriorityStyle } from '../utils/helpers';

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="card-surface p-5 shadow-soft animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-500 dark:text-ink-400">{label}</p>
          <p className="mt-1 font-display text-3xl font-bold text-ink-900 dark:text-ink-50">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await dashboardService.get();
        if (mounted) setData(res.data.data);
      } catch (err) {
        if (mounted) toast.error(getErrorMessage(err, 'Failed to load dashboard'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const counts = data?.counts || {};

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-600 dark:text-brand-400">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink-900 dark:text-ink-50">
            Hello, {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-1 text-ink-500 dark:text-ink-400">
            Here&apos;s what&apos;s on your plate today.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/tasks" className="btn-primary">
            <Plus className="h-4 w-4" /> New task
          </Link>
          <Link to="/calendar" className="btn-secondary">
            <CalendarDays className="h-4 w-4" /> Calendar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CheckSquare}
          label="Completed"
          value={counts.completed ?? 0}
          accent="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
        />
        <StatCard
          icon={CircleDashed}
          label="Pending"
          value={counts.pending ?? 0}
          accent="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        />
        <StatCard
          icon={CalendarDays}
          label="Today's tasks"
          value={counts.todayTasks ?? 0}
          accent="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
        />
        <StatCard
          icon={Bell}
          label="Today's meetings"
          value={counts.todayMeetings ?? 0}
          accent="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Today&apos;s tasks</h2>
            <Link to="/tasks" className="text-sm font-medium text-brand-600 dark:text-brand-400">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {(data?.todayTasks || []).length === 0 && (
              <p className="py-6 text-center text-sm text-ink-400">No tasks due today</p>
            )}
            {(data?.todayTasks || []).map((task) => (
              <div
                key={task._id}
                className="flex items-center justify-between gap-3 rounded-xl bg-ink-50 px-3 py-2.5 dark:bg-ink-800/50"
              >
                <div className="min-w-0">
                  <p
                    className={`truncate font-medium text-ink-900 dark:text-ink-50 ${
                      task.status === 'completed' ? 'line-through opacity-60' : ''
                    }`}
                  >
                    {task.title}
                  </p>
                  <p className="text-xs text-ink-400">
                    {format(new Date(task.dueDate), 'h:mm a')}
                    {task.status === 'completed' ? ' · done' : ''}
                  </p>
                </div>
                <Badge className={getPriorityStyle(task.priority)}>{task.priority}</Badge>
              </div>
            ))}
          </div>
        </section>

        <section className="card-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Today&apos;s meetings</h2>
            <Link to="/meetings" className="text-sm font-medium text-brand-600 dark:text-brand-400">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {(data?.todayMeetings || []).length === 0 && (
              <p className="py-6 text-center text-sm text-ink-400">No meetings today</p>
            )}
            {(data?.todayMeetings || []).map((m) => (
              <div
                key={m._id}
                className="rounded-xl bg-ink-50 px-3 py-2.5 dark:bg-ink-800/50"
              >
                <p className="font-medium text-ink-900 dark:text-ink-50">{m.title}</p>
                <p className="text-xs text-ink-400">
                  {m.time}
                  {m.location ? ` · ${m.location}` : ''}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="card-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Upcoming tasks</h2>
            <Link to="/tasks" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600">
              All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="mb-3 text-xs text-ink-400">
            Later today and the next 7 days ({counts.upcomingTasks ?? (data?.upcomingTasks || []).length} pending)
          </p>
          <div className="space-y-2">
            {(data?.upcomingTasks || []).length === 0 && (
              <p className="py-6 text-center text-sm text-ink-400">No upcoming tasks</p>
            )}
            {(data?.upcomingTasks || []).map((task) => {
              const due = new Date(task.dueDate);
              const isToday =
                format(due, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              return (
                <div
                  key={task._id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-ink-100 px-3 py-2.5 dark:border-ink-800"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="text-[11px] text-ink-400">
                      {isToday ? 'Today' : format(due, 'EEE, MMM d')} · {format(due, 'h:mm a')}
                    </p>
                  </div>
                  <Badge className={getPriorityStyle(task.priority)}>{task.priority}</Badge>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent notifications</h2>
          </div>
          <div className="space-y-2">
            {(data?.recentNotifications || []).length === 0 && (
              <p className="py-6 text-center text-sm text-ink-400">No notifications yet</p>
            )}
            {(data?.recentNotifications || []).map((n) => (
              <div
                key={n._id}
                className={`rounded-xl px-3 py-2.5 ${
                  n.isRead ? 'bg-ink-50 dark:bg-ink-800/40' : 'bg-brand-50 dark:bg-brand-950/30'
                }`}
              >
                <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">{n.title}</p>
                <p className="text-xs text-ink-500 dark:text-ink-400">{n.message}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
