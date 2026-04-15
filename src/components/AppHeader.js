import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function AppHeader({ title, subtitle, showBack = false, onBackPress }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.headerRow}>
        {showBack ? (
          <Pressable onPress={onBackPress} style={styles.backButton}>
            <Text style={styles.backText}>{'<'}</Text>
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}

        <View style={styles.titleWrap}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.backSpacer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  headerRow: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: 16,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(75, 77, 81, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  backSpacer: {
    height: 36,
    width: 36,
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  backText: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '600',
  },
  title: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    color: '#9eafc7',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default AppHeader;