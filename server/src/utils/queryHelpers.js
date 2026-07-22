/** Escape user input for safe use inside RegExp. */
const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Clamp pagination; MongoDB treats limit(0) as unlimited. */
const parsePagination = (query, { defaultLimit = 50, maxLimit = 100 } = {}) => {
  let page = Number.parseInt(query.page, 10);
  let limit = Number.parseInt(query.limit, 10);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  return { page, limit, skip: (page - 1) * limit };
};

const ALLOWED_TASK_SORT = new Set([
  'dueDate',
  '-dueDate',
  'createdAt',
  '-createdAt',
  'priority',
  '-priority',
  'title',
  '-title',
]);

const ALLOWED_MEETING_SORT = new Set([
  'date',
  '-date',
  'createdAt',
  '-createdAt',
  'title',
  '-title',
  'time',
  '-time',
]);

const parseSort = (sort, allowed, fallback) => {
  const value = String(sort || fallback);
  return allowed.has(value) ? value : fallback;
};

const trimText = (value, max) => {
  const text = String(value ?? '').trim();
  if (max && text.length > max) return text.slice(0, max);
  return text;
};

module.exports = {
  escapeRegex,
  parsePagination,
  parseSort,
  ALLOWED_TASK_SORT,
  ALLOWED_MEETING_SORT,
  trimText,
};
