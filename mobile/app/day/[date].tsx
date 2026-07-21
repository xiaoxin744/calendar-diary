import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Plus, Save, Trash2, X } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EVENT_EMOJIS, MOODS, type DayEvent } from '@/domain/types';
import { AlmanacPanel } from '@/components/AlmanacPanel';
import { useDiaryStore } from '@/store/diaryStore';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { fromDateKey, fullDateTitle } from '@/utils/date';

const newEvent = (): DayEvent => ({ id: Crypto.randomUUID(), rawText: '', summary: '', emoji: '📝' });

export default function DayEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date: string }>();
  const dateKey = params.date;
  const existing = useDiaryStore((state) => state.days[dateKey]);
  const saveDay = useDiaryStore((state) => state.saveDay);
  const [events, setEvents] = useState<DayEvent[]>(() => existing?.events.map((event) => ({ ...event })) ?? [newEvent()]);
  const [stickers, setStickers] = useState<string[]>(() => existing?.stickers ?? []);
  const date = useMemo(() => fromDateKey(dateKey), [dateKey]);

  const updateEvent = (id: string, patch: Partial<DayEvent>) => {
    setEvents((current) => current.map((event) => event.id === id ? { ...event, ...patch } : event));
  };

  const handleSave = () => {
    saveDay(dateKey, events, stickers);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="取消" hitSlop={8} style={styles.headerButton} onPress={() => router.back()}>
            <X size={22} color={colors.inkMuted} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>{fullDateTitle(date)}</Text>
            <Text style={styles.dateKey}>{dateKey}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="保存日记" hitSlop={8} style={styles.saveButton} onPress={handleSave}>
            <Save size={17} color={colors.surface} />
            <Text style={styles.saveText}>保存</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AlmanacPanel date={date} />
          <Text style={styles.sectionLabel}>日记与待办</Text>
          {events.map((event, index) => (
            <View key={event.id} style={styles.entry}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryIndex}>{String(index + 1).padStart(2, '0')}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`删除第${index + 1}条记录`}
                  hitSlop={8}
                  onPress={() => setEvents((current) => current.length === 1 ? [newEvent()] : current.filter((item) => item.id !== event.id))}
                >
                  <Trash2 size={17} color={colors.inkSubtle} />
                </Pressable>
              </View>
              <TextInput
                accessibilityLabel={`第${index + 1}条记录内容`}
                multiline
                maxLength={20_000}
                placeholder="写下今天发生的事、任务或想法…"
                placeholderTextColor={colors.inkSubtle}
                style={styles.entryInput}
                textAlignVertical="top"
                value={event.rawText}
                onChangeText={(rawText) => updateEvent(event.id, { rawText })}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
                {EVENT_EMOJIS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    accessibilityRole="button"
                    accessibilityLabel={`标记为${emoji}`}
                    style={[styles.emojiButton, event.emoji === emoji && styles.emojiSelected]}
                    onPress={() => updateEvent(event.id, { emoji })}
                  >
                    <Text style={styles.emoji}>{emoji}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ))}

          <Pressable style={({ pressed }) => [styles.addButton, pressed && styles.pressed]} onPress={() => setEvents((current) => [...current, newEvent()])}>
            <Plus size={18} color={colors.blue} />
            <Text style={styles.addText}>添加一条记录</Text>
          </Pressable>

          <Text style={[styles.sectionLabel, styles.moodLabel]}>今天的心情</Text>
          <View style={styles.moodGrid}>
            {MOODS.map((mood) => {
              const selected = stickers.includes(mood.emoji);
              return (
                <Pressable
                  key={mood.emoji}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [styles.moodButton, selected && styles.moodSelected, pressed && styles.pressed]}
                  onPress={() => setStickers((current) => selected ? current.filter((item) => item !== mood.emoji) : [...current, mood.emoji])}
                >
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text style={[styles.moodText, selected && styles.moodTextSelected]}>{mood.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  keyboard: { flex: 1, backgroundColor: colors.canvas },
  container: { flex: 1, backgroundColor: colors.canvas },
  header: { minHeight: 66, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.border },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 0, alignItems: 'center' },
  title: { color: colors.ink, fontSize: typography.section, fontWeight: '800' },
  dateKey: { marginTop: 2, color: colors.inkSubtle, fontSize: typography.caption },
  saveButton: { height: 38, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.md, backgroundColor: colors.ink },
  saveText: { color: colors.surface, fontSize: typography.label, fontWeight: '800' },
  content: { padding: spacing.md, paddingBottom: 80 },
  sectionLabel: { marginBottom: spacing.xs, color: colors.inkMuted, fontSize: typography.caption, fontWeight: '800', textTransform: 'uppercase' },
  entry: { marginBottom: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  entryHeader: { height: 38, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceMuted, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  entryIndex: { color: colors.inkMuted, fontSize: typography.caption, fontWeight: '800' },
  entryInput: { minHeight: 92, padding: spacing.sm, color: colors.ink, fontSize: typography.body, lineHeight: 22 },
  emojiRow: { paddingHorizontal: spacing.xs, paddingBottom: spacing.xs, gap: spacing.xxs },
  emojiButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  emojiSelected: { backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: colors.blue },
  emoji: { fontSize: 18 },
  addButton: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, borderRadius: radius.md },
  addText: { color: colors.blue, fontSize: typography.label, fontWeight: '700' },
  moodLabel: { marginTop: spacing.xl },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  moodButton: { width: '31%', minHeight: 64, padding: spacing.xs, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  moodSelected: { backgroundColor: colors.redSoft, borderColor: colors.red },
  moodEmoji: { fontSize: 23 },
  moodText: { marginTop: 3, color: colors.inkMuted, fontSize: typography.caption },
  moodTextSelected: { color: colors.red, fontWeight: '700' },
  pressed: { opacity: 0.65 },
});
