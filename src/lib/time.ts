export const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const nowTimeStr = (): string => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const formatTime12 = (t: string): string => {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

export const formatDate = (d: string): string => {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const nowMinutes = (): number => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

export const minutesAhead = (t: string): number => timeToMinutes(t) - nowMinutes();

export const monthName = (year: number, month: number): string =>
  new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export const sameDay = (a: string, b: string): boolean => a === b;

export const daysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();

export const dateStr = (year: number, month: number, day: number): string =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// IST date/time helpers
const IST_TZ = 'Asia/Kolkata';

export const istDateStr = (): string => {
  return new Date().toLocaleDateString('en-CA', { timeZone: IST_TZ });
};

export const istTimeStr = (): string => {
  return new Date().toLocaleTimeString('en-GB', { timeZone: IST_TZ, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const istFullDate = (): string => {
  return new Date().toLocaleDateString('en-IN', { timeZone: IST_TZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

export const istNowMinutes = (): number => {
  const parts = new Date().toLocaleTimeString('en-GB', { timeZone: IST_TZ, hour: '2-digit', minute: '2-digit' }).split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
};

export const istTodayStr = (): string => {
  return new Date().toLocaleDateString('en-CA', { timeZone: IST_TZ });
};

export const istMinutesAhead = (t: string): number => timeToMinutes(t) - istNowMinutes();

export const formatDateTimeIST = (iso: string): string => {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: IST_TZ,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};
