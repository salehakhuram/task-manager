import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function CalendarView({
  view,
  setView,
  currentDate,
  setCurrentDate,
  events,
  onDayClick,
  onEventClick,
}) {
  const goPrev = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const goNext = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const title =
    view === 'day'
      ? format(currentDate, 'EEEE, MMMM d, yyyy')
      : view === 'week'
        ? `${format(startOfWeek(currentDate), 'MMM d')} – ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`
        : format(currentDate, 'MMMM yyyy');

  const eventsForDay = (day) =>
    events.filter((e) => isSameDay(new Date(e.date), day));

  const renderMonth = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(monthEnd),
    });

    return (
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-ink-200 bg-ink-200 dark:border-ink-700 dark:bg-ink-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div
            key={d}
            className="bg-ink-50 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-ink-500 dark:bg-ink-900 dark:text-ink-400"
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const dayEvents = eventsForDay(day);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDayClick(day)}
              className={cn(
                'min-h-24 bg-white p-2 text-left transition hover:bg-brand-50/60 dark:bg-ink-900 dark:hover:bg-brand-950/40',
                !isSameMonth(day, currentDate) && 'bg-ink-50/80 text-ink-400 dark:bg-ink-950/50 dark:text-ink-600',
                isToday(day) && 'ring-2 ring-inset ring-brand-500'
              )}
            >
              <span
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                  isToday(day) && 'bg-brand-600 text-white'
                )}
              >
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={`${ev.type}-${ev.id}`}
                    role="presentation"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    className={cn(
                      'truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                      ev.type === 'meeting'
                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200'
                        : ev.status === 'completed'
                          ? 'bg-ink-100 text-ink-500 line-through dark:bg-ink-800'
                          : 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200'
                    )}
                  >
                    {ev.type === 'meeting' && ev.time ? `${ev.time} ` : ''}
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[10px] text-ink-400">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderWeekOrDay = () => {
    const days =
      view === 'day'
        ? [currentDate]
        : eachDayOfInterval({
            start: startOfWeek(currentDate),
            end: endOfWeek(currentDate),
          });

    return (
      <div className={cn('grid gap-3', view === 'day' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-7')}>
        {days.map((day) => {
          const dayEvents = eventsForDay(day).sort(
            (a, b) => new Date(a.date) - new Date(b.date) || String(a.time || '').localeCompare(String(b.time || ''))
          );
          return (
            <div
              key={day.toISOString()}
              className="card-surface min-h-48 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => onDayClick(day)}
                className={cn(
                  'flex w-full items-center justify-between border-b border-ink-100 px-3 py-2 text-left dark:border-ink-800',
                  isToday(day) && 'bg-brand-50 dark:bg-brand-950/40'
                )}
              >
                <span className="text-sm font-semibold">{format(day, view === 'day' ? 'EEEE' : 'EEE')}</span>
                <span
                  className={cn(
                    'text-sm',
                    isToday(day) && 'rounded-full bg-brand-600 px-2 py-0.5 text-white'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </button>
              <div className="space-y-1.5 p-2">
                {dayEvents.length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-ink-400">No events</p>
                )}
                {dayEvents.map((ev) => (
                  <button
                    key={`${ev.type}-${ev.id}`}
                    type="button"
                    onClick={() => onEventClick(ev)}
                    className={cn(
                      'block w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium transition',
                      ev.type === 'meeting'
                        ? 'bg-sky-50 text-sky-900 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-100'
                        : 'bg-brand-50 text-brand-900 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-100'
                    )}
                  >
                    <span className="uppercase tracking-wide opacity-60">{ev.type}</span>
                    <p className="mt-0.5 truncate font-semibold">{ev.title}</p>
                    {ev.time && <p className="opacity-70">{ev.time}</p>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary !p-2" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" className="btn-secondary !p-2" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" className="btn-ghost text-sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </button>
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">{title}</h2>
        </div>
        <div className="flex rounded-xl border border-ink-200 p-1 dark:border-ink-700">
          {['month', 'week', 'day'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition',
                view === v
                  ? 'bg-brand-600 text-white'
                  : 'text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {view === 'month' ? renderMonth() : renderWeekOrDay()}
    </div>
  );
}

export function getCalendarRange(view, currentDate) {
  if (view === 'day') {
    return { from: startOfDay(currentDate).toISOString(), to: endOfDay(currentDate).toISOString() };
  }
  if (view === 'week') {
    return {
      from: startOfWeek(currentDate).toISOString(),
      to: endOfWeek(currentDate).toISOString(),
    };
  }
  return {
    from: startOfWeek(startOfMonth(currentDate)).toISOString(),
    to: endOfWeek(endOfMonth(currentDate)).toISOString(),
  };
}
