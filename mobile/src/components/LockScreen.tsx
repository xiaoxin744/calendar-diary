import { Fingerprint } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSecurityStore } from '@/store/securityStore';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export function LockScreen() {
  const unlock = useSecurityStore((state) => state.unlock);

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.iconWrap}><Fingerprint size={38} color={colors.blue} strokeWidth={1.6} /></View>
        <Text style={styles.title}>日记已锁定</Text>
        <Text style={styles.subtitle}>使用设备生物识别或系统密码继续</Text>
        <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={() => void unlock()}>
          <Text style={styles.buttonText}>解锁</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: spacing.lg, fontSize: typography.title, fontWeight: '700', color: colors.ink },
  subtitle: { marginTop: spacing.xs, fontSize: typography.body, color: colors.inkMuted, textAlign: 'center' },
  button: { marginTop: spacing.xl, minWidth: 150, backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
  buttonPressed: { opacity: 0.78 },
  buttonText: { color: colors.surface, fontSize: typography.body, fontWeight: '700' },
});
