/**
 * Simple in-memory rate limiter (per IP).
 * Good enough for auth brute-force protection on a single Render instance.
 */
const buckets = new Map();

const prune = (key, windowMs) => {
  const entry = buckets.get(key);
  if (!entry) return;
  const cutoff = Date.now() - windowMs;
  entry.hits = entry.hits.filter((t) => t > cutoff);
  if (entry.hits.length === 0) buckets.delete(key);
};

const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 30, message } = {}) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const key = `${req.baseUrl}${req.path}:${ip}`;
    const now = Date.now();

    if (!buckets.has(key)) buckets.set(key, { hits: [] });
    const entry = buckets.get(key);
    entry.hits = entry.hits.filter((t) => t > now - windowMs);

    if (entry.hits.length >= max) {
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests. Please try again later.',
      });
    }

    entry.hits.push(now);
    prune(key, windowMs);
    next();
  };
};

module.exports = { rateLimit };
