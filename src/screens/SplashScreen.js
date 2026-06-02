import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import ROUTES from '../navigation/routes';
import STORAGE_KEYS from '../utils/storageKeys';

function SplashScreen({ navigation }) {
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const loadingFade = useRef(new Animated.Value(0)).current;
  const [nextRoute, setNextRoute] = useState(ROUTES.LOGIN);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textFade, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(loadingFade, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    async function checkSession() {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      setNextRoute(token ? ROUTES.HOME : ROUTES.LOGIN);
    }

    checkSession();

    const timer = setTimeout(() => {
      navigation.replace(nextRoute);
    }, 2000);

    return () => clearTimeout(timer);
  }, [loadingFade, logoScale, navigation, nextRoute, textFade]);

  return (
    <Pressable style={styles.screen} onPress={() => navigation.replace(nextRoute)}>
      <LinearGradient colors={['#dbeafe', '#f8fafc', '#ffffff']} style={styles.gradientBg} />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.centerContent, { opacity: textFade }]}> 
          <Animated.View style={[styles.logoGlow, { transform: [{ scale: logoScale }] }]} />
          <Animated.View style={[styles.logoShell, { transform: [{ scale: logoScale }] }]}>
            <Text style={styles.logoText}>SAS</Text>
          </Animated.View>
          <Text style={styles.title}>Student Attendance System</Text>
          <Text style={styles.subtitle}>Smart Classroom Verification</Text>
          <Animated.Text style={[styles.loadingText, { opacity: loadingFade }]}>Loading your dashboard...</Animated.Text>
        </Animated.View>
      </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centerContent: {
    alignItems: 'center',
    gap: 12,
  },
  logoGlow: {
    backgroundColor: 'rgba(59, 130, 246, 0.22)',
    borderRadius: 999,
    height: 108,
    position: 'absolute',
    width: 108,
  },
  logoShell: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 34,
    height: 82,
    justifyContent: 'center',
    marginBottom: 10,
    boxShadow: '0 10px 14px rgba(59, 130, 246, 0.2)',
    width: 82,
  },
  logoText: {
    color: '#3b82f6',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
});

export default SplashScreen;
