import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, space, type } from '../theme';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'warn';
}

export function Chip({ label, selected, onPress, tone = 'default' }: Props) {
  const warn = tone === 'warn';
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      hitSlop={6}
      style={[styles.chip, warn && styles.warn, selected && styles.selected]}
    >
      <Text style={[styles.label, warn && { color: '#92400E' }, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
  },
  warn: { backgroundColor: colors.accentSoft },
  selected: { backgroundColor: colors.primary },
  label: { ...type.label, color: colors.primary },
});
