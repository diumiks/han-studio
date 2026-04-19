// Format an ISO date (YYYY-MM-DD) in various forms
export const fmtDate = (isoDate, format = 'long') => {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T12:00:00');
  const day = d.toLocaleDateString('en-US', { weekday: 'long' });
  const dayShort = d.toLocaleDateString('en-US', { weekday: 'short' });
  const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const date = d.getDate();
  if (format === 'long') return `${day}, ${month} ${date}`;
  if (format === 'short') return `${dayShort} ${monthShort} ${date}`;
  if (format === 'day') return day;
  if (format === 'num') return date;
  return isoDate;
};

// Format a time (HH:MM:SS from DB) to just HH:MM
export const fmtTime = (time) => {
  if (!time) return '';
  return time.slice(0, 5);
};

// Group a list of slots by date, returning { '2026-04-13': [...], ... }
export const groupSlotsByDate = (slots) => {
  const groups = {};
  slots.forEach(s => {
    if (!groups[s.slot_date]) groups[s.slot_date] = [];
    groups[s.slot_date].push(s);
  });
  Object.keys(groups).forEach(k =>
    groups[k].sort((a, b) => a.slot_time.localeCompare(b.slot_time))
  );
  return groups;
};

// Current ISO date (yyyy-mm-dd) in local timezone
export const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Hours from now until the given slot (slot_date + slot_time, interpreted as
// local/Bloomington naive time). Negative if the slot is already past.
export const hoursUntilSlot = (slotDate, slotTime) => {
  if (!slotDate || !slotTime) return Infinity;
  const [h, m] = slotTime.split(':').map(Number);
  const [y, mo, d] = slotDate.split('-').map(Number);
  const start = new Date(y, mo - 1, d, h, m, 0, 0);
  return (start.getTime() - Date.now()) / (1000 * 60 * 60);
};

// Start-of-week (Monday) ISO date for the week containing `date`
export const weekStart = (dateISO) => {
  const d = new Date(dateISO + 'T12:00:00');
  const dow = d.getDay(); // 0 = Sunday
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
};
