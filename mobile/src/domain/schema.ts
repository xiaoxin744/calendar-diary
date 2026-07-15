import { parseISO, isValid } from 'date-fns';
import { z } from 'zod';

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => isValid(parseISO(value)),
  '日期格式无效',
);

const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const dayEventSchema = z.object({
  id: z.string().min(1).max(120),
  rawText: z.string().max(20_000),
  summary: z.string().max(500),
  emoji: z.string().max(16),
});

export const dayDataSchema = z.object({
  date: dateKeySchema,
  events: z.array(dayEventSchema).max(100),
  stickers: z.array(z.string().max(16)).max(12),
}).refine((value) => value.events.every((event) => event.rawText.trim().length > 0), {
  message: '日记内容不能为空',
});

export const diarySnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  days: z.record(dateKeySchema, dayDataSchema),
  monthlyPlans: z.record(monthKeySchema, z.array(z.string().max(500)).max(8)),
  updatedAt: z.iso.datetime(),
});

export const diaryBackupSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  exportedAt: z.iso.datetime().optional(),
  data: z.record(dateKeySchema, dayDataSchema),
  monthlyPlans: z.record(monthKeySchema, z.array(z.string().max(500)).max(8)),
});
