import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../theme';

function SegmentTabs({ tabs, value, onChange, style }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, style]}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === value;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text numberOfLines={1} style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: 10,
  },
  tab: {
    backgroundColor: '#e5e7eb',
    borderRadius: RADIUS.button,
    minWidth: 100,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  label: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default SegmentTabs;
