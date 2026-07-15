import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { AlertTriangle, CheckCircle2, Cloud, History, RefreshCw, Save, ShieldCheck, Trash2, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { WebDavConfig } from '@/domain/syncTypes';
import { useSyncStore } from '@/store/syncStore';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';

const EMPTY_CONFIG: WebDavConfig = {
  serverUrl: '',
  rootPath: '/CalendarDiary',
  username: '',
  password: '',
};

const confirmAction = (title: string, message: string): Promise<boolean> => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: '取消', style: 'cancel', onPress: () => resolve(false) },
      { text: '确认', style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
};

const formatTime = (value: string | null): string => value
  ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  : '尚未执行';

const directionText = {
  uploaded: '已上传本机变更',
  downloaded: '已下载云端变更',
  merged: '已合并本机与云端变更',
  unchanged: '两端数据已一致',
} as const;

export default function SyncScreen() {
  const router = useRouter();
  const savedConfig = useSyncStore((state) => state.config);
  const configured = useSyncStore((state) => state.configured);
  const autoSyncEnabled = useSyncStore((state) => state.autoSyncEnabled);
  const backgroundAvailable = useSyncStore((state) => state.backgroundAvailable);
  const status = useSyncStore((state) => state.status);
  const errorMessage = useSyncStore((state) => state.errorMessage);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const lastBackupAt = useSyncStore((state) => state.lastBackupAt);
  const lastConflictCount = useSyncStore((state) => state.lastConflictCount);
  const lastDirection = useSyncStore((state) => state.lastDirection);
  const localBackupCount = useSyncStore((state) => state.localBackupCount);
  const testConnection = useSyncStore((state) => state.testConnection);
  const saveConfig = useSyncStore((state) => state.saveConfig);
  const clearConfig = useSyncStore((state) => state.clearConfig);
  const setAutoSync = useSyncStore((state) => state.setAutoSync);
  const syncNow = useSyncStore((state) => state.syncNow);
  const restoreLatestBackup = useSyncStore((state) => state.restoreLatestBackup);
  const [draft, setDraft] = useState<WebDavConfig>(savedConfig ?? EMPTY_CONFIG);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const runTask = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (error: unknown) {
      Alert.alert('操作失败', getErrorMessage(error, '请检查网络后重试。'));
    } finally {
      setBusy(false);
    }
  };

  const saveAndTest = () => runTask(async () => {
    await testConnection(draft);
    await saveConfig(draft);
    Alert.alert('连接成功', 'WebDAV 配置已安全保存，并创建了同步目录。');
  });

  const startSync = () => runTask(async () => {
    const result = await syncNow();
    const conflictMessage = result.conflictCount > 0
      ? `检测到 ${result.conflictCount} 处同项修改，两个版本都已保留。`
      : '没有需要人工处理的冲突。';
    Alert.alert('同步完成', `${directionText[result.direction]}。${conflictMessage}`);
  });

  const toggleAutoSync = (enabled: boolean) => runTask(async () => {
    await setAutoSync(enabled);
  });

  const restoreBackup = () => runTask(async () => {
    const confirmed = await confirmAction('恢复自动备份', '将用同步前保存的最近本地快照替换当前数据。是否继续？');
    if (!confirmed) return;
    const restored = await restoreLatestBackup();
    Alert.alert(restored ? '恢复完成' : '没有备份', restored ? '已恢复最近一次同步前快照。' : '当前没有可恢复的自动备份。');
  });

  const removeConfig = () => runTask(async () => {
    const confirmed = await confirmAction('移除 WebDAV 配置', '将停止自动同步并删除当前设备保存的 WebDAV 凭据，不会删除云端日记。');
    if (!confirmed) return;
    await clearConfig();
    setDraft(EMPTY_CONFIG);
  });

  const working = busy || status === 'testing' || status === 'syncing';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="关闭同步设置" hitSlop={8} style={styles.headerButton} onPress={() => router.back()}>
          <X size={22} color={colors.inkMuted} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>跨设备同步</Text>
          <Text style={styles.subtitle}>WebDAV · 自动备份 · 冲突合并</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Cloud size={25} color={colors.blue} /></View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{configured ? '可选同步服务已配置' : '可选：连接你的 WebDAV'}</Text>
            <Text style={styles.heroDescription}>本地日记无需服务器即可使用；有 WebDAV 的用户可与电脑共用目录。</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>服务器配置</Text>
        <View style={styles.formCard}>
          <Text style={styles.label}>服务器地址</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://dav.example.com/"
            placeholderTextColor={colors.inkSubtle}
            style={styles.input}
            value={draft.serverUrl}
            onChangeText={(serverUrl) => setDraft((value) => ({ ...value, serverUrl }))}
          />
          <Text style={styles.label}>同步目录</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="/CalendarDiary"
            placeholderTextColor={colors.inkSubtle}
            style={styles.input}
            value={draft.rootPath}
            onChangeText={(rootPath) => setDraft((value) => ({ ...value, rootPath }))}
          />
          <Text style={styles.label}>用户名</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="WebDAV 用户名"
            placeholderTextColor={colors.inkSubtle}
            style={styles.input}
            value={draft.username}
            onChangeText={(username) => setDraft((value) => ({ ...value, username }))}
          />
          <Text style={styles.label}>密码或应用专用密码</Text>
          <View style={styles.passwordRow}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="WebDAV 密码"
              placeholderTextColor={colors.inkSubtle}
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
              value={draft.password}
              onChangeText={(password) => setDraft((value) => ({ ...value, password }))}
            />
            <Pressable style={styles.showButton} onPress={() => setShowPassword((value) => !value)}>
              <Text style={styles.showText}>{showPassword ? '隐藏' : '显示'}</Text>
            </Pressable>
          </View>
          <Pressable disabled={working} style={({ pressed }) => [styles.primaryButton, (pressed || working) && styles.pressed]} onPress={saveAndTest}>
            <Save size={18} color={colors.surface} />
            <Text style={styles.primaryText}>{status === 'testing' ? '正在测试连接…' : '测试并保存'}</Text>
          </Pressable>
          <View style={styles.secureNote}>
            <ShieldCheck size={15} color={colors.green} />
            <Text style={styles.secureText}>{Platform.OS === 'web' ? 'Web 端凭据保存在浏览器本地存储中' : '密码只保存在系统安全凭据库中'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>同步控制</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>自动同步与自动备份</Text>
              <Text style={styles.rowDescription}>{Platform.OS === 'web' || !backgroundAvailable ? '打开应用时每小时检查一次' : '系统允许时在后台每小时检查一次'}</Text>
            </View>
            <Switch disabled={working || !configured} value={autoSyncEnabled} trackColor={{ false: colors.borderStrong, true: colors.blue }} thumbColor={colors.surface} onValueChange={toggleAutoSync} />
          </View>
          <Pressable disabled={working || !configured} style={({ pressed }) => [styles.syncButton, (pressed || working || !configured) && styles.disabled]} onPress={startSync}>
            <RefreshCw size={18} color={colors.blue} />
            <Text style={styles.syncText}>{status === 'syncing' ? '正在安全合并…' : '立即同步'}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>最近状态</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusLine}><Text style={styles.statusLabel}>最近同步</Text><Text style={styles.statusValue}>{formatTime(lastSyncedAt)}</Text></View>
          <View style={styles.statusLine}><Text style={styles.statusLabel}>云端备份</Text><Text style={styles.statusValue}>{formatTime(lastBackupAt)}</Text></View>
          <View style={styles.statusLine}><Text style={styles.statusLabel}>本地快照</Text><Text style={styles.statusValue}>{localBackupCount} 份</Text></View>
          {lastDirection ? <View style={styles.resultLine}><CheckCircle2 size={15} color={colors.green} /><Text style={styles.resultText}>{directionText[lastDirection]}</Text></View> : null}
          {lastConflictCount > 0 ? <View style={styles.warningLine}><AlertTriangle size={15} color={colors.yellow} /><Text style={styles.warningText}>上次同步保留了 {lastConflictCount} 处冲突版本</Text></View> : null}
          {errorMessage ? <View style={styles.errorLine}><AlertTriangle size={15} color={colors.danger} /><Text style={styles.errorText}>{errorMessage}</Text></View> : null}
        </View>

        <Text style={styles.sectionTitle}>恢复与维护</Text>
        <View style={styles.group}>
          <Pressable style={({ pressed }) => [styles.maintenanceRow, pressed && styles.pressed]} onPress={restoreBackup}>
            <History size={18} color={colors.blue} />
            <View style={styles.rowText}><Text style={styles.rowTitle}>恢复最近自动备份</Text><Text style={styles.rowDescription}>找回同步发生前的本机数据</Text></View>
          </Pressable>
          <Pressable disabled={!configured} style={({ pressed }) => [styles.maintenanceRow, pressed && styles.pressed, !configured && styles.disabled]} onPress={removeConfig}>
            <Trash2 size={18} color={colors.danger} />
            <View style={styles.rowText}><Text style={[styles.rowTitle, { color: colors.danger }]}>移除同步配置</Text><Text style={styles.rowDescription}>停止同步但保留本地和云端日记</Text></View>
          </Pressable>
        </View>

        {Platform.OS === 'web' ? <Text style={styles.webHint}>WebDAV 服务需要允许浏览器跨域请求；Android、iOS 和桌面端不受此限制。</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  header: { minHeight: 66, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.border },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  title: { color: colors.ink, fontSize: typography.section, fontWeight: '800' },
  subtitle: { marginTop: 2, color: colors.inkSubtle, fontSize: typography.caption },
  content: { padding: spacing.md, paddingBottom: 60 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  heroIcon: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.blueSoft },
  heroText: { flex: 1 },
  heroTitle: { color: colors.ink, fontSize: typography.section, fontWeight: '800' },
  heroDescription: { marginTop: 4, color: colors.inkMuted, fontSize: typography.label, lineHeight: 18 },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.xs, color: colors.inkMuted, fontSize: typography.caption, fontWeight: '800', textTransform: 'uppercase' },
  formCard: { padding: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  label: { marginTop: spacing.xs, marginBottom: 5, color: colors.inkMuted, fontSize: typography.caption, fontWeight: '700' },
  input: { height: 44, paddingHorizontal: spacing.sm, color: colors.ink, fontSize: typography.body, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  passwordRow: { height: 44, flexDirection: 'row', backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  passwordInput: { flex: 1, paddingHorizontal: spacing.sm, color: colors.ink, fontSize: typography.body },
  showButton: { paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  showText: { color: colors.blue, fontSize: typography.label, fontWeight: '700' },
  primaryButton: { height: 46, marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.md, backgroundColor: colors.ink },
  primaryText: { color: colors.surface, fontSize: typography.label, fontWeight: '800' },
  secureNote: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  secureText: { color: colors.inkMuted, fontSize: typography.caption },
  group: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  row: { minHeight: 72, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { flex: 1 },
  rowTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '700' },
  rowDescription: { marginTop: 3, color: colors.inkMuted, fontSize: typography.caption, lineHeight: 16 },
  syncButton: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderTopWidth: 1, borderColor: colors.border },
  syncText: { color: colors.blue, fontSize: typography.label, fontWeight: '800' },
  statusCard: { padding: spacing.sm, gap: spacing.xs, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  statusLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { color: colors.inkMuted, fontSize: typography.label },
  statusValue: { color: colors.ink, fontSize: typography.label, fontWeight: '700' },
  resultLine: { marginTop: spacing.xs, padding: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.sm, backgroundColor: colors.greenSoft },
  resultText: { flex: 1, color: colors.green, fontSize: typography.caption, fontWeight: '700' },
  warningLine: { padding: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.sm, backgroundColor: colors.yellowSoft },
  warningText: { flex: 1, color: colors.yellow, fontSize: typography.caption, fontWeight: '700' },
  errorLine: { padding: spacing.xs, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, borderRadius: radius.sm, backgroundColor: colors.redSoft },
  errorText: { flex: 1, color: colors.danger, fontSize: typography.caption, lineHeight: 16 },
  maintenanceRow: { minHeight: 68, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  webHint: { marginTop: spacing.md, color: colors.inkSubtle, fontSize: typography.caption, lineHeight: 17, textAlign: 'center' },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.42 },
});
