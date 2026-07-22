import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { dashboardService, taskService, meetingService } from '../services';
import CalendarView, { getCalendarRange } from '../components/calendar/CalendarView';
import Modal from '../components/ui/Modal';
import TaskForm from '../components/tasks/TaskForm';
import MeetingForm from '../components/meetings/MeetingForm';
import { Spinner } from '../components/ui/EmptyState';
import { getErrorMessage } from '../utils/helpers';

export default function Calendar() {
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formType, setFormType] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const range = getCalendarRange(view, currentDate);
      const { data } = await dashboardService.calendar(range);
      setEvents(data.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load calendar'));
    } finally {
      setLoading(false);
    }
  }, [view, currentDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onDayClick = (day) => {
    setSelectedDate(day);
    setEditingEvent(null);
    setFormType(null);
    setPickerOpen(true);
  };

  const onEventClick = (ev) => {
    setEditingEvent(ev);
    setFormType(ev.type);
    setSelectedDate(new Date(ev.date));
    setPickerOpen(true);
  };

  const closeAll = () => {
    setPickerOpen(false);
    setFormType(null);
    setEditingEvent(null);
    setSelectedDate(null);
  };

  const handleTaskSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editingEvent?.type === 'task') {
        await taskService.update(editingEvent.id, payload);
        toast.success('Task updated');
      } else {
        await taskService.create(payload);
        toast.success('Task created');
      }
      closeAll();
      fetchEvents();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleMeetingSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editingEvent?.type === 'meeting') {
        await meetingService.update(editingEvent.id, payload);
        toast.success('Meeting updated');
      } else {
        await meetingService.create(payload);
        toast.success('Meeting created');
      }
      closeAll();
      fetchEvents();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-900 dark:text-ink-50">Calendar</h1>
        <p className="mt-1 text-ink-500">
          Switch views and click a date to add a task or meeting.
        </p>
      </div>

      {loading && events.length === 0 ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <CalendarView
          view={view}
          setView={setView}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          events={events}
          onDayClick={onDayClick}
          onEventClick={onEventClick}
        />
      )}

      <Modal
        open={pickerOpen && !formType}
        onClose={closeAll}
        title={selectedDate ? `Add to ${selectedDate.toLocaleDateString()}` : 'Add event'}
      >
        <p className="mb-4 text-sm text-ink-500">What would you like to schedule?</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-2xl border border-ink-200 p-4 text-left transition hover:border-brand-400 hover:bg-brand-50 dark:border-ink-700 dark:hover:bg-brand-950/40"
            onClick={() => setFormType('task')}
          >
            <p className="font-display font-semibold text-ink-900 dark:text-ink-50">Task</p>
            <p className="mt-1 text-sm text-ink-500">To-do with priority and reminder</p>
          </button>
          <button
            type="button"
            className="rounded-2xl border border-ink-200 p-4 text-left transition hover:border-sky-400 hover:bg-sky-50 dark:border-ink-700 dark:hover:bg-sky-950/40"
            onClick={() => setFormType('meeting')}
          >
            <p className="font-display font-semibold text-ink-900 dark:text-ink-50">Meeting</p>
            <p className="mt-1 text-sm text-ink-500">Event with time and location</p>
          </button>
        </div>
      </Modal>

      <Modal
        open={pickerOpen && formType === 'task'}
        onClose={closeAll}
        title={editingEvent?.type === 'task' ? 'Edit task' : 'New task'}
        size="lg"
      >
        <TaskForm
          initialData={editingEvent?.type === 'task' ? editingEvent.data : null}
          defaultDate={selectedDate}
          onSubmit={handleTaskSubmit}
          onCancel={closeAll}
          loading={saving}
        />
      </Modal>

      <Modal
        open={pickerOpen && formType === 'meeting'}
        onClose={closeAll}
        title={editingEvent?.type === 'meeting' ? 'Edit meeting' : 'New meeting'}
        size="lg"
      >
        <MeetingForm
          initialData={editingEvent?.type === 'meeting' ? editingEvent.data : null}
          defaultDate={selectedDate}
          onSubmit={handleMeetingSubmit}
          onCancel={closeAll}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
