/**
 * Leave updates for the employee (pure; see staffNotices.test.js): requests decided since they last
 * looked — approved, rejected, withdrawn, or approved leave / week off set by their manager.
 * "Seen" is kept per device as { requestId: status }, so a later change (approved → withdrawn) shows
 * again. Only decisions from the last `days` days are shown, so a new phone isn't flooded.
 */
import { addDays } from './staffToday.js';

const DECIDED = new Set(['Approved', 'Rejected', 'Revoked']);

export function leaveUpdates(leaves, seen, today, days = 14) {
  const from = addDays(today, -days);
  return (leaves || [])
    .filter(l => DECIDED.has(l.status) && l.id && !String(l.id).startsWith('~'))
    .map(l => ({ l, on: (l.status === 'Revoked' ? l.revokedOn : l.decidedOn) || '' }))
    .filter(x => x.on >= from && (seen || {})[x.l.id] !== x.l.status)
    .sort((a, b) => (a.on < b.on ? 1 : a.on > b.on ? -1 : 0))
    .map(({ l, on }) => ({ id: l.id, type: l.type, date: l.date, hours: l.hours || 0, status: l.status, on,
      by: l.status === 'Revoked' ? (l.revokedBy || '') : (l.decidedBy || ''), reason: l.status === 'Revoked' ? (l.revokeReason || '') : '',
      setByManager: l.type === 'AL' || l.type === 'WO' }));
}

/** mark these updates as seen → the new seen map */
export function markSeen(seen, updates) {
  const out = { ...(seen || {}) };
  for (const u of updates || []) out[u.id] = u.status;
  return out;
}

const TYPE = {
  CL: ['CL', 'தற்செயல் விடுப்பு (CL)'],
  Permission: ['permission', 'பர்மிஷன்'],
  AL: ['approved leave', 'அனுமதிக்கப்பட்ட விடுப்பு'],
  WO: ['week off', 'வார விடுமுறை'],
};

/** { en, ta, tone: 'ok' | 'bad' } — dateLabel is the formatted date ("Thu 19 Nov") */
export function updateText(u, dateLabel) {
  const [enT, taT] = TYPE[u.type] || [u.type, u.type];
  const what = u.type === 'Permission' && u.hours ? `${enT} (${u.hours}h)` : enT;
  const whatTa = u.type === 'Permission' && u.hours ? `${taT} (${u.hours} மணி)` : taT;
  const by = u.by ? ` by ${u.by}` : '';
  const byTa = u.by ? `${u.by} ` : '';
  if (u.status === 'Revoked') {
    return { tone: 'bad', en: `Your ${what} for ${dateLabel} was withdrawn${by}${u.reason ? ' — ' + u.reason : ''}.`,
      ta: `${dateLabel} அன்றைய உங்கள் ${whatTa} ${byTa}திரும்பப் பெறப்பட்டது${u.reason ? ' — ' + u.reason : ''}.` };
  }
  if (u.status === 'Rejected') {
    return { tone: 'bad', en: `Your ${what} for ${dateLabel} was not approved${by}.`, ta: `${dateLabel} அன்றைய உங்கள் ${whatTa} ${byTa}நிராகரிக்கப்பட்டது.` };
  }
  if (u.setByManager) {
    return { tone: 'ok', en: `${u.by || 'Your manager'} marked ${dateLabel} as ${enT} ✓`, ta: `${u.by || 'உங்கள் மேனேஜர்'} ${dateLabel}-ஐ ${taT} எனக் குறித்தார் ✓` };
  }
  return { tone: 'ok', en: `Your ${what} for ${dateLabel} was approved${by} ✓`, ta: `${dateLabel} அன்றைய உங்கள் ${whatTa} ${byTa}அனுமதிக்கப்பட்டது ✓` };
}
