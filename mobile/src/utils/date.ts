import {
  addMonths,
  addDays,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const toDateKey = (date: Date) => format(date, 'yyyy-MM-dd');
export const toMonthKey = (date: Date) => format(date, 'yyyy-MM');
export const fromDateKey = (dateKey: string) => parseISO(dateKey);
export const monthTitle = (date: Date) => format(date, 'yyyy年M月', { locale: zhCN });
export const fullDateTitle = (date: Date) => format(date, 'M月d日 EEEE', { locale: zhCN });
export const shiftMonth = (date: Date, amount: number) => amount > 0 ? addMonths(date, amount) : subMonths(date, Math.abs(amount));

export const getCalendarDays = (month: Date) => {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
};

export { format, isSameDay, isSameMonth };
