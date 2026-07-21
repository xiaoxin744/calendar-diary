import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { getAlmanac } from '@/utils/lunar';

interface AlmanacPanelProps {
  date: Date;
}

export function AlmanacPanel({ date }: AlmanacPanelProps) {
  const almanac = useMemo(() => getAlmanac(date), [date]);
  const observances = [almanac.festival, almanac.solarTerm].filter((item): item is string => Boolean(item));

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={styles.title}>今日黄历</Text>
          <Text style={styles.lunarDate}>农历 {almanac.lunarDate}</Text>
        </View>
        <Text style={styles.yearName}>{almanac.yearName}</Text>
      </View>

      {observances.length > 0 ? (
        <View style={styles.observanceRow}>
          {observances.map((item) => (
            <View key={item} style={styles.observance}>
              <Text style={styles.observanceText}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.factRow}>
        <View style={styles.fact}>
          <Text style={styles.factLabel}>值日</Text>
          <Text style={styles.factValue}>{almanac.dayOfficer}日</Text>
        </View>
        <View style={styles.fact}>
          <Text style={styles.factLabel}>星宿</Text>
          <Text style={styles.factValue}>{almanac.mansion}宿 · {almanac.mansionLuck}</Text>
        </View>
        <View style={styles.fact}>
          <Text style={styles.factLabel}>冲煞</Text>
          <Text style={styles.factValue}>冲{almanac.clash} · 煞{almanac.sha}</Text>
        </View>
      </View>

      <View style={styles.activityRow}>
        <View style={[styles.activityMark, styles.yiMark]}>
          <Text style={[styles.activityMarkText, styles.yiMarkText]}>宜</Text>
        </View>
        <Text style={styles.activityText}>{almanac.yi.join(' · ') || '诸事不宜'}</Text>
      </View>
      <View style={styles.activityRow}>
        <View style={[styles.activityMark, styles.jiMark]}>
          <Text style={[styles.activityMarkText, styles.jiMarkText]}>忌</Text>
        </View>
        <Text style={styles.activityText}>{almanac.ji.join(' · ') || '诸事不忌'}</Text>
      </View>

      <Text style={styles.pengZu}>彭祖百忌  {almanac.pengZu}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginBottom: spacing.xl, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  headingText: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontSize: typography.section, fontWeight: '800' },
  lunarDate: { marginTop: 3, color: colors.inkMuted, fontSize: typography.caption },
  yearName: { color: colors.red, fontSize: typography.label, fontWeight: '800' },
  observanceRow: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  observance: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, backgroundColor: colors.redSoft, borderRadius: radius.sm },
  observanceText: { color: colors.red, fontSize: typography.caption, fontWeight: '700' },
  factRow: { marginTop: spacing.sm, paddingVertical: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, rowGap: spacing.sm },
  fact: { width: '33.33%', minWidth: 88, paddingRight: spacing.xs },
  factLabel: { color: colors.inkSubtle, fontSize: typography.caption },
  factValue: { marginTop: 3, color: colors.ink, fontSize: typography.label, fontWeight: '700' },
  activityRow: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  activityMark: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  yiMark: { backgroundColor: colors.greenSoft },
  jiMark: { backgroundColor: colors.redSoft },
  activityMarkText: { fontSize: typography.label, fontWeight: '900' },
  yiMarkText: { color: colors.green },
  jiMarkText: { color: colors.red },
  activityText: { flex: 1, color: colors.inkMuted, fontSize: typography.label, lineHeight: 21 },
  pengZu: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, color: colors.inkSubtle, fontSize: typography.caption, lineHeight: 17 },
});
