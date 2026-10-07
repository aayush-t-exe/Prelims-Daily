import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tapHaptic } from './Button';
import { colors, radius, space, type } from '../theme';

interface Props<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export function Segmented<T extends string | number>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              tapHaptic();
              onChange(o.value);
            }}
            style={[styles.seg, selected && styles.selected]}
          >
            <Text style={[styles.label, selected && styles.labelSel]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: colors.track, borderRadius: radius.md, padding: 4, gap: 4 },
  seg: { flex: 1, minHeight: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
  selected: { backgroundColor: colors.card, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' },
  label: { ...type.label, color: colors.muted },
  labelSel: { color: colors.primary },
});
