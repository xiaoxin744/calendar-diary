import { useEffect } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import '@/services/backgroundSyncTask';
import { localBackupRepository } from '@/data/syncRepository';
import { LockScreen } from '@/components/LockScreen';
import { Screen } from '@/components/Screen';
import { useDiaryStore } from '@/store/diaryStore';
import { useSecurityStore } from '@/store/securityStore';
import { useSyncStore } from '@/store/syncStore';
import { colors, radius, spacing, typography } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <Screen>
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>页面暂时无法显示</Text>
        <Text style={styles.errorMessage}>本地日记数据不会因此被删除，请重试当前页面。</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="重新加载页面"
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          onPress={() => void retry()}
        >
          <Text style={styles.retryText}>重新加载</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

export default function RootLayout() {
  const diaryHydrated = useDiaryStore((state) => state.hydrated);
  const hydrateDiary = useDiaryStore((state) => state.hydrate);
  const securityHydrated = useSecurityStore((state) => state.hydrated);
  const hydrateSecurity = useSecurityStore((state) => state.hydrate);
  const locked = useSecurityStore((state) => state.locked);
  const lock = useSecurityStore((state) => state.lock);
  const syncHydrated = useSyncStore((state) => state.hydrated);
  const hydrateSync = useSyncStore((state) => state.hydrate);
  const syncIfDue = useSyncStore((state) => state.syncIfDue);

  useEffect(() => {
    void hydrateDiary();
    void hydrateSecurity();
    void hydrateSync();
  }, [hydrateDiary, hydrateSecurity, hydrateSync]);

  useEffect(() => {
    if (diaryHydrated && securityHydrated && syncHydrated) {
      void SplashScreen.hideAsync();
      const diary = useDiaryStore.getState();
      void (async () => {
        await localBackupRepository.createIfDue({
          schemaVersion: 1,
          days: diary.days,
          monthlyPlans: diary.monthlyPlans,
          updatedAt: diary.updatedAt,
        }, 24 * 60 * 60 * 1000);
        useSyncStore.setState({ localBackupCount: (await localBackupRepository.list()).length });
      })().catch(() => undefined);
      void syncIfDue();
    }
  }, [diaryHydrated, securityHydrated, syncHydrated, syncIfDue]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncIfDue();
      else lock();
    });
    return () => subscription.remove();
  }, [lock, syncIfDue]);

  if (!diaryHydrated || !securityHydrated || !syncHydrated) return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  if (locked) return <LockScreen />;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="day/[date]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="sync" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorTitle: { color: colors.ink, fontSize: typography.title, fontWeight: '800', textAlign: 'center' },
  errorMessage: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: typography.body, lineHeight: 22, textAlign: 'center' },
  retryButton: { marginTop: spacing.xl, minWidth: 148, paddingVertical: 13, paddingHorizontal: spacing.lg, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.ink },
  retryButtonPressed: { opacity: 0.72 },
  retryText: { color: colors.surface, fontSize: typography.body, fontWeight: '700' },
});
