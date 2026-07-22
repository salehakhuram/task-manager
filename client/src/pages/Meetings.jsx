import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, Users } from 'lucide-react';
import { meetingService } from '../services';
import MeetingItem from '../components/meetings/MeetingItem';
import MeetingForm from '../components/meetings/MeetingForm';
import Modal from '../components/ui/Modal';
import EmptyState, { Spinner } from '../components/ui/EmptyState';
import { getErrorMessage } from '../utils/helpers';

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await meetingService.getAll({
        search: search || undefined,
        sort: 'date',
      });
      setMeetings(data.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load meetings'));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchMeetings, 250);
    return () => clearTimeout(t);
  }, [fetchMeetings]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (meeting) => {
    setEditing(meeting);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        await meetingService.update(editing._id, payload);
        toast.success('Meeting updated');
      } else {
        await meetingService.create(payload);
        toast.success('Meeting created');
      }
      setModalOpen(false);
      setEditing(null);
      fetchMeetings();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (meeting) => {
    if (!window.confirm(`Delete "${meeting.title}"?`)) return;
    try {
      await meetingService.remove(meeting._id);
      setMeetings((prev) => prev.filter((m) => m._id !== meeting._id));
      toast.success('Meeting deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-900 dark:text-ink-50">Meetings</h1>
          <p className="mt-1 text-ink-500">Schedule and track your meetings.</p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New meeting
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          className="input !pl-9"
          placeholder="Search meetings…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No meetings yet"
          description="Schedule a meeting with a time, location, and reminder."
          action={
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add meeting
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <MeetingItem
              key={meeting._id}
              meeting={meeting}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit meeting' : 'New meeting'}
        size="lg"
      >
        <MeetingForm
          initialData={editing}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
