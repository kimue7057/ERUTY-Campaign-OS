// UTC is only a coordinate system for date-only values; no local-time arithmetic.
const DAY = 86_400_000;
export const scheduleDay = (value: string) => value.slice(0, 10);
const timestamp = (value: string) => Date.parse(`${scheduleDay(value)}T00:00:00.000Z`);
export function validScheduleDate(value: string) {
  const time = timestamp(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}
export const calendarDays = (start: string, end: string) => Math.round((timestamp(end) - timestamp(start)) / DAY) + 1;

export type DateRange = { start: string; end: string };
export type ScheduleItem = { id: string; strategyId: string; parentId: string | null; kind: string; status: string; plannedStart: string; plannedEnd: string };
export type ScheduleFilters = { strategy: string; status: string; start: string; end: string };

export function scheduleBounds(campaign: DateRange, ranges: DateRange[]): DateRange {
  return ranges.reduce((bounds, range) => ({
    start: scheduleDay(range.start) < bounds.start ? scheduleDay(range.start) : bounds.start,
    end: scheduleDay(range.end) > bounds.end ? scheduleDay(range.end) : bounds.end,
  }), { start: scheduleDay(campaign.start), end: scheduleDay(campaign.end) });
}

export function matchesSchedule(item: ScheduleItem, filters: ScheduleFilters) {
  return (!filters.strategy || item.strategyId === filters.strategy)
    && (!filters.status || item.status === filters.status)
    && (!filters.start || scheduleDay(item.plannedEnd) >= filters.start)
    && (!filters.end || scheduleDay(item.plannedStart) <= filters.end);
}

// A matching subtask keeps its parent visible as context, even if the parent
// has another status. Filtering must never orphan a child in the work tree.
export function scheduleActivities<T extends ScheduleItem>(items: T[], filters: ScheduleFilters) {
  return items.filter(item => item.kind === "ACTIVITY").map(activity => ({
    activity,
    matches: matchesSchedule(activity, filters),
    children: items.filter(item => item.parentId === activity.id && matchesSchedule(item, filters)),
  })).filter(group => group.matches || group.children.length > 0);
}

export function barPosition(start: string, end: string, range: DateRange) {
  const days = calendarDays(range.start, range.end);
  if (!Number.isFinite(days) || days <= 0 || scheduleDay(end) < range.start || scheduleDay(start) > range.end) return null;
  const clippedStart = scheduleDay(start) < range.start ? range.start : scheduleDay(start);
  const clippedEnd = scheduleDay(end) > range.end ? range.end : scheduleDay(end);
  return {
    left: ((timestamp(clippedStart) - timestamp(range.start)) / DAY / days) * 100,
    width: (calendarDays(clippedStart, clippedEnd) / days) * 100,
    clipped: clippedStart !== scheduleDay(start) || clippedEnd !== scheduleDay(end),
  };
}

export function scheduleTicks(range: DateRange, zoom: "week" | "month") {
  const days = calendarDays(range.start, range.end);
  if (!Number.isFinite(days) || days <= 0) return [];
  const start = timestamp(range.start);
  const end = timestamp(range.end);
  const dates = [start];
  if (zoom === "week") {
    const first = new Date(start);
    const nextMonday = start + (((8 - first.getUTCDay()) % 7) || 7) * DAY;
    const stride = Math.max(1, Math.ceil(calendarDays(range.start, range.end) / 7 / 80)) * 7 * DAY;
    for (let current = nextMonday; current <= end; current += stride) dates.push(current);
  } else {
    const first = new Date(start);
    const last = new Date(end);
    const months = (last.getUTCFullYear() - first.getUTCFullYear()) * 12 + last.getUTCMonth() - first.getUTCMonth() + 1;
    const stride = Math.max(1, Math.ceil(months / 80));
    const next = new Date(start);
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    while (next.getTime() <= end) {
      dates.push(next.getTime());
      next.setUTCMonth(next.getUTCMonth() + stride);
    }
  }
  return dates.map(value => {
    const date = new Date(value).toISOString().slice(0, 10);
    return { date, left: (value - start) / DAY / calendarDays(range.start, range.end) * 100 };
  });
}
