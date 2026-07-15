import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { IconButton } from '@/components/IconButton';
import { PageHeader } from '@/components/PageHeader';
import { SaveStatus } from '@/components/SaveStatus';
import { Screen } from '@/components/Screen';
import { useDiaryStore } from '@/store/diaryStore';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { format, getCalendarDays, isSameDay, isSameMonth, monthTitle, shiftMonth, toDateKey, toMonthKey } from '@/utils/date';

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function CalendarScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const daysData = useDiaryStore((state) => state.days);
  const days = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);
  const cellWidth = (width - spacing.md * 2 - 6) / 7;
  const cellHeight = Math.max(50, Math.min(64, Math.round(cellWidth * 1.1)));
  const monthKey = toMonthKey(currentMonth);
  const monthRecords = useMemo(
    () => Object.values(daysData).filter((day) => day.date.startsWith(monthKey)),
    [daysData, monthKey],
  );
  const entryCount = monthRecords.reduce((sum, day) => sum + day.events.length, 0);

  const changeMonth = (amount: number) => {
    void Haptics.selectionAsync();
    setCurrentMonth((month) => shiftMonth(month, amount));
  };

  return (
    <Screen>
      <PageHeader title="CalendarDiary" subtitle={format(new Date(), 'yyyy年M月d日')} right={<SaveStatus />} />

      <View style={styles.monthBar}>
        <IconButton icon={ChevronLeft} label="上个月" onPress={() => changeMonth(-1)} />
        <Text style={styles.monthTitle}>{monthTitle(currentMonth)}</Text>
        <View style={styles.monthActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="返回今天"
            style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}
            onPress={() => setCurrentMonth(new Date())}
          >
            <CalendarDays color={colors.red} size={16} />
            <Text style={styles.todayText}>今天</Text>
          </Pressable>
          <IconButton icon={ChevronRight} label="下个月" onPress={() => changeMonth(1)} />
        </View>
      </View>

      <View style={styles.weekHeader}>
        {WEEK_DAYS.map((day, index) => (
          <Text key={day} style={[styles.weekText, (index === 0 || index === 6) && styles.weekendText, { width: cellWidth }]}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const dateKey = toDateKey(day);
          const record = daysData[dateKey];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isSameDay(day, new Date());
          const weekend = day.getDay() === 0 || day.getDay() === 6;
          return (
            <Pressable
              key={dateKey}
              accessibilityRole="button"
              accessibilityLabel={`${format(day, 'M月d日')}${record ? `，${record.events.length}条记录` : ''}`}
              onPress={() => {
                void Haptics.selectionAsync();
                router.push({ pathname: '/day/[date]', params: { date: dateKey } });
              }}
              style={({ pressed }) => [
                styles.dayCell,
                { width: cellWidth, height: cellHeight },
                !inMonth && styles.outsideCell,
                today && styles.todayCell,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.dayTopLine}>
                <Text style={[
                  styles.dayNumber,
                  !inMonth && styles.outsideText,
                  inMonth && weekend && styles.weekendText,
                  today && styles.todayNumber,
                ]}>
                  {format(day, 'd')}
                </Text>
                {record?.stickers[0] ? <Text style={styles.mood}>{record.stickers[0]}</Text> : null}
              </View>
              {record?.events[0] ? <Text numberOfLines={1} style={styles.preview}>{record.events[0].summary || record.events[0].rawText}</Text> : null}
              {record && record.events.length > 0 ? <View style={styles.entryDot} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>本月记录</Text>
        <Text style={styles.summaryValue}>{monthRecords.length} 天</Text>
        <View style={styles.summaryDivider} />
        <Text style={styles.summaryValue}>{entryCount} 条</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthBar: { height: 54, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  monthTitle: { flex: 1, color: colors.ink, fontSize: typography.section, fontWeight: '700', marginLeft: spacing.xs },
  monthActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  todayButton: { height: 34, paddingHorizontal: spacing.sm, flexDirection: 'row', gap: spacing.xs, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.redSoft },
  todayText: { color: colors.red, fontSize: typography.label, fontWeight: '700' },
  pressed: { opacity: 0.65 },
  weekHeader: { paddingHorizontal: spacing.md, height: 30, flexDirection: 'row', alignItems: 'center', gap: 1 },
  weekText: { textAlign: 'center', fontSize: typography.caption, fontWeight: '700', color: colors.inkMuted },
  weekendText: { color: colors.red },
  grid: { marginHorizontal: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 1, backgroundColor: colors.border },
  dayCell: { backgroundColor: colors.surface, padding: 5, position: 'relative' },
  outsideCell: { backgroundColor: colors.surfaceMuted },
  todayCell: { backgroundColor: colors.yellowSoft, borderWidth: 1.5, borderColor: colors.yellow },
  dayTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayNumber: { fontSize: typography.label, fontWeight: '700', color: colors.ink },
  outsideText: { color: colors.inkSubtle },
  todayNumber: { color: colors.yellow },
  mood: { fontSize: 11 },
  preview: { marginTop: 4, color: colors.inkMuted, fontSize: 8, lineHeight: 11 },
  entryDot: { position: 'absolute', left: 5, bottom: 5, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.blue },
  summary: { height: 48, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryLabel: { color: colors.inkMuted, fontSize: typography.label },
  summaryValue: { color: colors.ink, fontSize: typography.label, fontWeight: '700' },
  summaryDivider: { width: 1, height: 14, backgroundColor: colors.border },
});
