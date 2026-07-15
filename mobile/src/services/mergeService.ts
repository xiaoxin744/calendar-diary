import type { DayData, DayEvent, DiarySnapshot } from '@/domain/types';

const deepEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (typeof left !== typeof right || left === null || right === null) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length && left.every((value, index) => deepEqual(value, right[index]));
  }
  if (typeof left !== 'object') return false;

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return deepEqual(leftKeys, rightKeys) && leftKeys.every((key) => deepEqual(leftRecord[key], rightRecord[key]));
};

const shortHash = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const conflictEventId = (event: DayEvent): string =>
  `${event.id.slice(0, 92)}-remote-${shortHash(JSON.stringify(event))}`.slice(0, 120);

interface MergeValueResult<T> {
  value: T | undefined;
  conflictCount: number;
}

const resolveValue = <T>(
  local: T | undefined,
  remote: T | undefined,
  base: T | undefined,
  mergeConflict: (localValue: T | undefined, remoteValue: T | undefined, baseValue: T | undefined) => MergeValueResult<T>,
): MergeValueResult<T> => {
  const localChanged = !deepEqual(local, base);
  const remoteChanged = !deepEqual(remote, base);
  if (!localChanged) return { value: remote, conflictCount: 0 };
  if (!remoteChanged) return { value: local, conflictCount: 0 };
  if (deepEqual(local, remote)) return { value: local, conflictCount: 0 };
  return mergeConflict(local, remote, base);
};

const mergeEvents = (
  localEvents: DayEvent[],
  remoteEvents: DayEvent[],
  baseEvents: DayEvent[],
): { events: DayEvent[]; conflictCount: number } => {
  const localById = new Map(localEvents.map((event) => [event.id, event]));
  const remoteById = new Map(remoteEvents.map((event) => [event.id, event]));
  const baseById = new Map(baseEvents.map((event) => [event.id, event]));
  const orderedIds = [...new Set([
    ...localEvents.map((event) => event.id),
    ...remoteEvents.map((event) => event.id),
    ...baseEvents.map((event) => event.id),
  ])];
  const events: DayEvent[] = [];
  let conflictCount = 0;

  for (const id of orderedIds) {
    const result = resolveValue(localById.get(id), remoteById.get(id), baseById.get(id), (local, remote) => {
      conflictCount += 1;
      if (!local) return { value: remote, conflictCount: 0 };
      if (!remote) return { value: local, conflictCount: 0 };
      events.push(local);
      return { value: { ...remote, id: conflictEventId(remote) }, conflictCount: 0 };
    });
    if (result.value) events.push(result.value);
  }

  return {
    events: events.filter((event, index) => events.findIndex((candidate) => candidate.id === event.id) === index),
    conflictCount,
  };
};

const mergeDayConflict = (
  local: DayData | undefined,
  remote: DayData | undefined,
  base: DayData | undefined,
): MergeValueResult<DayData> => {
  if (!local) return { value: remote, conflictCount: 1 };
  if (!remote) return { value: local, conflictCount: 1 };

  const mergedEvents = mergeEvents(local.events, remote.events, base?.events ?? []);
  return {
    value: {
      date: local.date,
      events: mergedEvents.events,
      stickers: [...new Set([...local.stickers, ...remote.stickers])],
    },
    conflictCount: mergedEvents.conflictCount,
  };
};

const mergePlanConflict = (
  local: string[] | undefined,
  remote: string[] | undefined,
  base: string[] | undefined,
): MergeValueResult<string[]> => {
  if (!local) return { value: remote, conflictCount: 1 };
  if (!remote) return { value: local, conflictCount: 1 };

  const plans: string[] = [];
  const remoteConflicts: string[] = [];
  let conflictCount = 0;
  const length = Math.max(local.length, remote.length, base?.length ?? 0);

  for (let index = 0; index < length; index += 1) {
    const result = resolveValue(local[index], remote[index], base?.[index], (localPlan, remotePlan) => {
      conflictCount += 1;
      if (!localPlan) return { value: remotePlan, conflictCount: 0 };
      if (!remotePlan) return { value: localPlan, conflictCount: 0 };
      const preservedRemote = `[云端冲突] ${remotePlan}`.slice(0, 500);
      if (!local.includes(preservedRemote) && !remoteConflicts.includes(preservedRemote)) remoteConflicts.push(preservedRemote);
      return { value: localPlan, conflictCount: 0 };
    });
    plans.push(result.value ?? '');
  }

  return { value: [...plans, ...remoteConflicts].slice(0, 16), conflictCount: Math.max(1, conflictCount) };
};

const mergeRecord = <T>(
  local: Record<string, T>,
  remote: Record<string, T>,
  base: Record<string, T>,
  mergeConflict: (localValue: T | undefined, remoteValue: T | undefined, baseValue: T | undefined) => MergeValueResult<T>,
): { value: Record<string, T>; conflictCount: number } => {
  const value: Record<string, T> = {};
  let conflictCount = 0;
  const keys = [...new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])].sort();
  for (const key of keys) {
    const result = resolveValue(local[key], remote[key], base[key], mergeConflict);
    if (result.value !== undefined) value[key] = result.value;
    conflictCount += result.conflictCount;
  }
  return { value, conflictCount };
};

export const mergeSnapshots = (
  local: DiarySnapshot,
  remote: DiarySnapshot,
  base: DiarySnapshot | null,
): { snapshot: DiarySnapshot; conflictCount: number } => {
  const days = mergeRecord(local.days, remote.days, base?.days ?? {}, mergeDayConflict);
  const plans = mergeRecord(local.monthlyPlans, remote.monthlyPlans, base?.monthlyPlans ?? {}, mergePlanConflict);
  return {
    snapshot: {
      schemaVersion: 1,
      days: days.value,
      monthlyPlans: plans.value,
      updatedAt: new Date().toISOString(),
    },
    conflictCount: days.conflictCount + plans.conflictCount,
  };
};

export const snapshotsHaveSameContent = (left: DiarySnapshot, right: DiarySnapshot): boolean =>
  deepEqual(left.days, right.days) && deepEqual(left.monthlyPlans, right.monthlyPlans);
