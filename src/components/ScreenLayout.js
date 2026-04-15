import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppBackground from './AppBackground';

function ScreenLayout({
  children,
  contentStyle,
  centered = false,
  scrollEnabled = true,
}) {
  const contentStyles = [styles.content, centered && styles.contentCentered, contentStyle];

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <AppBackground>
        <ScrollView
          contentContainerStyle={contentStyles}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
          style={styles.body}
        >
          <View style={styles.inner}>{children}</View>
        </ScrollView>
      </AppBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  body: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inner: {
    alignSelf: 'stretch',
    width: '100%',
  },
  contentCentered: {
    justifyContent: 'center',
  },
});

export default ScreenLayout;
