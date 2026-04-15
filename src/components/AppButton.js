import { ActivityIndicator, Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING } from '../theme';

function AppButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  textStyle,
}) {
  const isDisabled = disabled || loading;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function animateTo(value) {
    Animated.spring(scaleAnim, {
      toValue: value,
      useNativeDriver: true,
      speed: 26,
      bounciness: 0,
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          variant === 'secondary' && styles.buttonSecondary,
          pressed && styles.buttonPressed,
          isDisabled && styles.buttonDisabled,
          style,
        ]}
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
      >
        {variant === 'primary' ? (
          <LinearGradient
            colors={[COLORS.primary, '#12296b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientLayer}
          >
            {loading ? (
              <ActivityIndicator color="#ba7e7e" />
            ) : (
              <Text style={[styles.buttonText, textStyle]}>{label}</Text>
            )}
          </LinearGradient>
        ) : loading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <Text style={[styles.buttonText, styles.buttonTextSecondary, textStyle]}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.button,
    elevation: 4,
    minHeight: 52,
    minWidth: 0,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    shadowColor: '#1d4ed8',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  buttonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    elevation: 0,
    shadowOpacity: 0,
  },
  gradientLayer: {
    alignItems: 'center',
    borderRadius: RADIUS.button,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    width: '100%',
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonTextSecondary: {
    color: COLORS.primary,
  },
});

export default AppButton;
