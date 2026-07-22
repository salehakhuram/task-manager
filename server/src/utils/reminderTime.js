/**
 * Compute when a reminder should fire relative to an event datetime.
 * @param {Date|string} eventAt
 * @param {number} minutesBefore
 * @returns {Date}
 */
const computeReminderAt = (eventAt, minutesBefore = 15) => {
  const event = new Date(eventAt);
  const mins = Number(minutesBefore);
  const offset = Number.isFinite(mins) ? mins : 15;
  return new Date(event.getTime() - offset * 60 * 1000);
};

/**
 * Resolve reminderAt from an explicit value or from event + offset.
 */
const resolveReminderAt = ({ eventAt, reminderMinutes, reminderAt }) => {
  if (reminderAt) {
    const explicit = new Date(reminderAt);
    if (!Number.isNaN(explicit.getTime())) return explicit;
  }
  return computeReminderAt(eventAt, reminderMinutes ?? 15);
};

const buildMeetingStartAt = (dateValue, timeValue) => {
  const d = new Date(dateValue);
  const [hours, minutes] = String(timeValue || '00:00').split(':').map(Number);
  d.setHours(hours || 0, minutes || 0, 0, 0);
  return d;
};

module.exports = {
  computeReminderAt,
  resolveReminderAt,
  buildMeetingStartAt,
};
