import { useMemo, useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Cloud, DatabaseBackup, Download, ExternalLink, Fingerprint, Info, ShieldCheck, Trash2, Upload } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { backupService } from '@/services/backupService';
import { localBackupRepository } from '@/data/syncRepository';
import { useDiaryStore } from '@/store/diaryStore';
import { useSecurityStore } from '@/store/securityStore';
import { useSyncStore } from '@/store/syncStore';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';

interface SettingRowProps {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  description: string;
  onPress?: (() => void) | undefined;
  trailing?: React.ReactNode;
  destructive?: boolean;
}

function SettingRow({ icon: Icon, title, description, onPress, trailing, destructive }: SettingRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, destructive && styles.rowIconDanger]}>
        <Icon size={19} color={destructive ? colors.danger : colors.blue} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, destructive && styles.dangerText]}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      {trailing ?? (onPress ? <ExternalLink size={16} color={colors.inkSubtle} /> : null)}
    </Pressable>
  );
}

const confirmAction = (title: string, message: string): Promise<boolean> => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: '取消', style: 'cancel', onPress: () => resolve(false) },
      { text: '确认', style: 'destructive', onPress: () => resolve(true) },
    ], {
      cancelable: true,
      onDismiss: () => resolve(false),
    });
  });
};

export default function SettingsScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const days = useDiaryStore((state) => state.days);
  const monthlyPlans = useDiaryStore((state) => state.monthlyPlans);
  const updatedAt = useDiaryStore((state) => state.updatedAt);
  const replaceSnapshot = useDiaryStore((state) => state.replaceSnapshot);
  const clearAll = useDiaryStore((state) => state.clearAll);
  const lockEnabled = useSecurityStore((state) => state.enabled);
  const setLockEnabled = useSecurityStore((state) => state.setEnabled);
  const localBackupCount = useSyncStore((state) => state.localBackupCount);
  const restoreLatestBackup = useSyncStore((state) => state.restoreLatestBackup);
  const entryCount = useMemo(() => Object.values(days).reduce((sum, day) => sum + day.events.length, 0), [days]);
  const planCount = useMemo(() => Object.values(monthlyPlans).flat().filter((plan) => plan.trim()).length, [monthlyPlans]);

  const runTask = async (task: () => Promise<void>, successMessage?: string) => {
    setBusy(true);
    try {
      await task();
      if (successMessage) Alert.alert('完成', successMessage);
    } catch (error: unknown) {
      Alert.alert('操作失败', getErrorMessage(error, '请稍后重试。'));
    } finally {
      setBusy(false);
    }
  };

  const exportBackup = () => runTask(
    () => backupService.export({ schemaVersion: 1, days, monthlyPlans, updatedAt }),
    Platform.OS === 'web' ? '备份文件已下载。' : undefined,
  );

  const importBackup = () => runTask(async () => {
    const snapshot = await backupService.import();
    if (!snapshot) return;
    const dayCount = Object.keys(snapshot.days).length;
    const confirmed = await confirmAction('恢复备份', `将用备份中的 ${dayCount} 天记录替换当前设备数据。是否继续？`);
    if (!confirmed) return;
    await localBackupRepository.create({ schemaVersion: 1, days, monthlyPlans, updatedAt }, 'before-import');
    await replaceSnapshot(snapshot);
    Alert.alert('恢复完成', '日记与月度计划已从备份恢复。');
  });

  const confirmClear = () => runTask(async () => {
    const confirmed = await confirmAction('清空全部数据', '此操作不可撤销，建议先导出备份。');
    if (!confirmed) return;
    await clearAll();
    Alert.alert('完成', '本地数据已清空。');
  });

  const restoreLocalBackup = () => runTask(async () => {
    const confirmed = await confirmAction('恢复本地自动备份', '将用最近一次安全快照替换当前日记和计划。是否继续？');
    if (!confirmed) return;
    const restored = await restoreLatestBackup();
    Alert.alert(restored ? '恢复完成' : '没有备份', restored ? '最近的本地安全快照已恢复。' : '当前还没有可恢复的本地快照。');
  });

  return (
    <Screen>
      <PageHeader title="设置" subtitle="数据默认只保存在当前设备" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <View>
            <Text style={styles.brandTitle}>CalendarDiary</Text>
            <Text style={styles.brandVersion}>移动端 {Constants.expoConfig?.version ?? '0.2.0'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>数据概览</Text>
        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={styles.metricValue}>{Object.keys(days).length}</Text><Text style={styles.metricLabel}>记录天数</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{entryCount}</Text><Text style={styles.metricLabel}>日记条数</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{planCount}</Text><Text style={styles.metricLabel}>月度目标</Text></View>
        </View>

        <Text style={styles.sectionTitle}>隐私与安全</Text>
        <View style={styles.group}>
          <SettingRow
            icon={Fingerprint}
            title="设备解锁保护"
            description={Platform.OS === 'web' ? '请在 Android 或 iOS 设备上配置' : '切到后台后需要指纹、面容或设备密码'}
            trailing={
              <Switch
                disabled={busy || Platform.OS === 'web'}
                value={lockEnabled}
                trackColor={{ false: colors.borderStrong, true: colors.blue }}
                thumbColor={colors.surface}
                onValueChange={(enabled) => void runTask(() => setLockEnabled(enabled))}
              />
            }
          />
          <SettingRow
            icon={ShieldCheck}
            title="隐私说明"
            description="本地优先，不接入分析或广告服务"
            onPress={() => void Linking.openURL('https://github.com/xiaoxin744/calendar-diary/blob/main/PRIVACY.md')}
          />
        </View>

        <Text style={styles.sectionTitle}>本地备份与可选同步</Text>
        <View style={styles.group}>
          <SettingRow icon={DatabaseBackup} title="本地自动备份（无需服务器）" description={`已保留 ${localBackupCount} 份安全快照，点击可恢复`} onPress={restoreLocalBackup} />
          <SettingRow icon={Download} title="导出备份" description="生成与桌面端兼容的 JSON 文件" onPress={busy ? undefined : exportBackup} />
          <SettingRow icon={Upload} title="导入备份" description="校验文件后恢复日记和月度计划" onPress={busy ? undefined : importBackup} />
          <SettingRow icon={Cloud} title="可选：WebDAV 跨设备同步" description="已有 WebDAV 的用户可同步手机与电脑，不配置不联网" onPress={() => router.push('/sync')} />
        </View>

        <Text style={styles.sectionTitle}>项目</Text>
        <View style={styles.group}>
          <SettingRow icon={Info} title="GitHub 源代码" description="查看版本、反馈问题与参与开发" onPress={() => void Linking.openURL('https://github.com/xiaoxin744/calendar-diary')} />
          <SettingRow icon={Trash2} title="清空本地数据" description="删除当前设备上的全部日记和计划" destructive onPress={busy ? undefined : confirmClear} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  brand: { paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 52, height: 52, borderRadius: radius.lg },
  brandTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '800' },
  brandVersion: { marginTop: 3, color: colors.inkMuted, fontSize: typography.caption },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.xs, color: colors.inkMuted, fontSize: typography.caption, fontWeight: '800', textTransform: 'uppercase' },
  metrics: { height: 76, flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  metric: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metricValue: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  metricLabel: { marginTop: 3, color: colors.inkMuted, fontSize: typography.caption },
  group: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  row: { minHeight: 72, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  pressed: { backgroundColor: colors.surfaceMuted },
  rowIcon: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  rowIconDanger: { backgroundColor: colors.redSoft },
  rowText: { flex: 1 },
  rowTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '700' },
  rowDescription: { marginTop: 3, color: colors.inkMuted, fontSize: typography.caption, lineHeight: 16 },
  dangerText: { color: colors.danger },
});
