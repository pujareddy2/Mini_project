import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

function AppBackground({ children }) {
  const patternLines = new Array(6).fill(null);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#bccfe0', '#cfd6e4', '#b0bacd']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientLayer}
      />

      <View pointerEvents="none" style={styles.patternLayer}>
        {patternLines.map((_, index) => (
          <View
            key={`line-${index}`}
            style={[
              styles.patternLine,
              {
                top: `${(index + 1) * 13}%`,
              },
            ]}
          />
        ))}
      </View>

      <View pointerEvents="none" style={styles.softGlowTop} />
      <View pointerEvents="none" style={styles.softGlowBottom} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  patternLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  patternLine: {
    backgroundColor: '#3b82f6',
    height: 1,
    opacity: 0.03,
    position: 'absolute',
    width: '100%',
  },
  softGlowTop: {
    backgroundColor: '#bfdbfe',
    borderRadius: 220,
    height: 260,
    opacity: 0.2,
    position: 'absolute',
    right: -80,
    top: -90,
    width: 260,
  },
  softGlowBottom: {
    backgroundColor: '#dbeafe',
    borderRadius: 240,
    bottom: -120,
    height: 280,
    left: -100,
    opacity: 0.22,
    position: 'absolute',
    width: 280,
  },
  content: {
    flex: 1,
  },
});

export default AppBackground;
