import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

function ProgressBar({ value = 0, trackStyle, barStyle }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: safeValue,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animatedValue, safeValue]);

  const width = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, trackStyle]}>
      <Animated.View style={[styles.bar, { width }, barStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    height: 10,
    overflow: 'hidden',
    width: '100%',
  },
  bar: {
    backgroundColor: '#3b82f6',
    borderRadius: 999,
    height: '100%',
  },
});

export default ProgressBar;