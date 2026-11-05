export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function text(value, label, max, min = 0) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    throw new HttpError(400, `${label} must contain ${min}–${max} characters.`);
  }
  return value.trim();
}

export function email(value) {
  const result = text(value, 'Email', 254, 3).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new HttpError(400, 'Enter a valid email address.');
  return result;
}

export function password(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) {
    throw new HttpError(400, 'Use a password with 8–128 characters.');
  }
  if (!/[a-zA-Z]/.test(value)) {
    throw new HttpError(400, 'Password must contain at least one letter.');
  }
  if (!/[0-9]/.test(value)) {
    throw new HttpError(400, 'Password must contain at least one number.');
  }
  return value;
}

export function uuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(404, 'Not found.');
  }
  return value;
}

export function integer(value, label, max = 10000, min = 0) {
  if (!Number.isInteger(value) || value < min || value > max) throw new HttpError(400, `${label} is invalid.`);
  return value;
}

export function boolean(value, label) {
  if (typeof value !== 'boolean') throw new HttpError(400, `${label} is invalid.`);
  return value;
}

/**
 * Validate any value that will later be rendered into an `href` or `src`.
 * Only absolute HTTPS URLs are accepted, plus root-relative paths when
 * `allowRelative` is set (same-origin assets such as `/logo.svg`).
 * This is the boundary that keeps `javascript:` and `data:` values out of
 * links and image sources.
 */
export function safeUrl(value, label, max = 2048, { required = false, allowRelative = false } = {}) {
  const raw = text(value ?? '', label, max);
  if (!raw) {
    if (required) throw new HttpError(400, `${label} is required.`);
    return '';
  }
  if (allowRelative && raw.startsWith('/') && !raw.startsWith('//')) return raw;
  let url;
  try { url = new URL(raw); } catch { throw new HttpError(400, `Enter a valid HTTPS ${label}.`); }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new HttpError(400, `Use an HTTPS ${label} without credentials.`);
  }
  return raw;
}

export function teamInput(body) {
  const photoUrl = safeUrl(body.photoUrl, 'Photo URL', 2048);
  return {
    name: text(body.name, 'Name', 160, 1), role: text(body.role, 'Role', 120, 1),
    group: text(body.group, 'Hierarchy group', 120, 1),
    hierarchyOrder: integer(body.hierarchyOrder, 'Hierarchy order'),
    displayOrder: integer(body.displayOrder, 'Display order'),
    isLead: boolean(body.isLead, 'Lead selection'), photoUrl,
    bio: text(body.bio ?? '', 'Biography', 5000),
    department: text(body.department ?? '', 'Department', 160),
    tenure: text(body.tenure ?? '', 'Tenure', 80),
    published: boolean(body.published, 'Publication status'),
  };
}
