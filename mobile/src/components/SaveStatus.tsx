import { StyleSheet, Text, View } from 'react-native';
import { Check, CloudOff } from 'lucide-react-native';
import { useDiaryStore } from '@/store/diaryStore';
import { colors, spacing, typography } from '@/theme/tokens';

export function SaveStatus() {
  const status = useDiaryStore((state) => state.saveStatus);
  if (status === 'idle') return null;

  const isError = status === 'error';
  return (
    <View style={styles.container}>
      {isError ? <CloudOff size={13} color={colors.danger} /> : <Check size={13} color={colors.green} />}
      <Text style={[styles.text, isError && styles.error]}>
        {isError ? '保存失败' : status === 'saving' ? '保存中' : '已保存'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  text: { fontSize: typography.caption, color: colors.green },
  error: { color: colors.danger },
});
