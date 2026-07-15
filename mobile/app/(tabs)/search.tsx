import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import type { DayData } from '@/domain/types';
import { useDiaryStore } from '@/store/diaryStore';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { fromDateKey, fullDateTitle } from '@/utils/date';

interface SearchResult {
  dateKey: string;
  day: DayData;
  snippet: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const days = useDiaryStore((state) => state.days);
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const results = useMemo<SearchResult[]>(() => {
    if (!normalizedQuery) return [];
    return Object.values(days)
      .flatMap((day) => {
        const text = day.events.map((event) => event.rawText).join(' · ');
        const matchIndex = text.toLocaleLowerCase().indexOf(normalizedQuery);
        if (matchIndex < 0) return [];
        const start = Math.max(0, matchIndex - 24);
        const end = Math.min(text.length, matchIndex + normalizedQuery.length + 56);
        return [{ dateKey: day.date, day, snippet: `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}` }];
      })
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [days, normalizedQuery]);

  return (
    <Screen>
      <PageHeader title="搜索" subtitle="所有日记内容只在本机检索" />
      <View style={styles.searchBox}>
        <Search size={19} color={colors.inkSubtle} />
        <TextInput
          accessibilityLabel="搜索日记"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="输入关键词"
          placeholderTextColor={colors.inkSubtle}
          returnKeyType="search"
          style={styles.input}
          value={query}
          onChangeText={setQuery}
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="清空搜索" hitSlop={8} onPress={() => setQuery('')}>
            <X size={18} color={colors.inkMuted} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.dateKey}
        contentContainerStyle={results.length === 0 ? styles.emptyContainer : styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <Search size={34} color={colors.borderStrong} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>{normalizedQuery ? '没有找到相关记录' : '搜索日记内容'}</Text>
            <Text style={styles.emptyText}>{normalizedQuery ? '换一个更短或更具体的关键词' : '支持任务、想法、地点和人物名称'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.result, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: '/day/[date]', params: { date: item.dateKey } })}
          >
            <View style={styles.resultHeader}>
              <Text style={styles.resultDate}>{fullDateTitle(fromDateKey(item.dateKey))}</Text>
              <Text style={styles.resultCount}>{item.day.events.length} 条</Text>
            </View>
            <Text numberOfLines={3} style={styles.snippet}>{item.snippet}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: { height: 48, marginHorizontal: spacing.md, marginBottom: spacing.sm, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  input: { flex: 1, color: colors.ink, fontSize: typography.body, paddingVertical: 0 },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  emptyContainer: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { marginTop: spacing.md, color: colors.ink, fontSize: typography.section, fontWeight: '700' },
  emptyText: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: typography.label, textAlign: 'center' },
  result: { paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.6 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultDate: { color: colors.ink, fontSize: typography.body, fontWeight: '700' },
  resultCount: { color: colors.inkSubtle, fontSize: typography.caption },
  snippet: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: typography.label, lineHeight: 19 },
});
