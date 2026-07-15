import type { ComponentType } from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import type { LucideProps } from 'lucide-react-native';
import { colors, radius } from '@/theme/tokens';

interface IconButtonProps extends Omit<PressableProps, 'children'> {
  icon: ComponentType<LucideProps>;
  label: string;
  color?: string;
  size?: number;
}

export function IconButton({ icon: Icon, label, color = colors.inkMuted, size = 20, style, ...props }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={(state) => [styles.button, state.pressed && styles.pressed, typeof style === 'function' ? style(state) : style]}
      {...props}
    >
      <Icon color={color} size={size} strokeWidth={1.9} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfaceMuted },
});
