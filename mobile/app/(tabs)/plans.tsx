import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, ChevronRight, Target } from 'lucide-react-native';
import { IconButton } from '@/components/IconButton';
import { PageHeader } from '@/components/PageHeader';
import { SaveStatus } from '@/components/SaveStatus';
import { Screen } from '@/components/Screen';
import { useDiaryStore } from '@/store/diaryStore';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { monthTitle, shiftMonth, toMonthKey } from '@/utils/date';

export default function PlansScreen() {
  const [month, setMonth] = useState(() => new Date());
  const monthKey = toMonthKey(month);
  const plans = useDiaryStore((state) => state.monthlyPlans[monthKey] ?? ['', '', '']);
  const updatePlan = useDiaryStore((state) => state.updatePlan);

  return (
    <Screen>
      <PageHeader title="月度计划" subtitle="把重要的事放在一个安静的位置" right={<SaveStatus />} />
      <View style={styles.monthBar}>
        <IconButton icon={ChevronLeft} label="上个月" onPress={() => setMonth((value) => shiftMonth(value, -1))} />
        <Text style={styles.monthTitle}>{monthTitle(month)}</Text>
        <IconButton icon={ChevronRight} label="下个月" onPress={() => setMonth((value) => shiftMonth(value, 1))} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.intro}>
          <Target size={20} color={colors.blue} />
          <Text style={styles.introText}>建议只保留三个真正重要的目标。</Text>
        </View>
        <View style={styles.planList}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={styles.planRow}>
              <View style={[styles.number, index === 0 ? styles.numberGreen : index === 1 ? styles.numberBlue : styles.numberRed]}>
                <Text style={styles.numberText}>{index + 1}</Text>
              </View>
              <TextInput
                accessibilityLabel={`第${index + 1}个月度目标`}
                multiline
                maxLength={500}
                placeholder="写下这个月最重要的目标"
                placeholderTextColor={colors.inkSubtle}
                style={styles.input}
                value={plans[index] ?? ''}
                onChangeText={(value) => updatePlan(monthKey, index, value)}
              />
            </View>
          ))}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  monthBar: { height: 54, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  monthTitle: { flex: 1, textAlign: 'center', color: colors.ink, fontSize: typography.section, fontWeight: '700' },
  intro: { margin: spacing.md, marginBottom: spacing.xs, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  introText: { flex: 1, color: colors.inkMuted, fontSize: typography.label },
  planList: { marginHorizontal: spacing.md, borderTopWidth: 1, borderColor: colors.border },
  planRow: { minHeight: 92, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderBottomWidth: 1, borderColor: colors.border },
  number: { width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  numberGreen: { backgroundColor: colors.greenSoft },
  numberBlue: { backgroundColor: colors.blueSoft },
  numberRed: { backgroundColor: colors.redSoft },
  numberText: { color: colors.ink, fontSize: typography.label, fontWeight: '800' },
  input: { flex: 1, minHeight: 56, color: colors.ink, fontSize: typography.body, lineHeight: 22, padding: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, textAlignVertical: 'top' },
});
