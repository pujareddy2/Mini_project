import { Platform, StyleSheet, View } from 'react-native';

const isMobilePreview = true;

function AppWrapper({ children }) {
  if (Platform.OS !== 'web') {
    return <View style={styles.nativeRoot}>{children}</View>;
  }

  if (!isMobilePreview) {
    return <View style={styles.webFull}>{children}</View>;
  }

  return (
    <View style={styles.appWrapper}>
      <View style={styles.mobileContainer}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
  },
  webFull: {
    flex: 1,
    width: '100%',
  },
  appWrapper: {
    alignItems: 'center',
    backgroundColor: '#e5e9eb',
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  mobileContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 24,
    elevation: 10,
    height: '92%',
    maxHeight: 860,
    maxWidth: 420,
    overflow: 'hidden',
    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.12)',
    aspectRatio: 9 / 19.5,
    width: '100%',
  },
});

export default AppWrapper;