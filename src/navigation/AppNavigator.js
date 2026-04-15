import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CameraCaptureScreen from '../screens/CameraCaptureScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import ErrorScreen from '../screens/ErrorScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import ProcessingScreen from '../screens/ProcessingScreen';
import AlertsScreen from '../screens/AlertsScreen';
import ResultScreen from '../screens/ResultScreen';
import ScanScreen from '../screens/ScanScreen';
import SplashScreen from '../screens/SplashScreen';
import SemesterScreen from '../screens/SemesterScreen';
import PeriodWiseScreen from '../screens/PeriodWiseScreen';
import TimetableScreen from '../screens/TimetableScreen';
import SuccessScreen from '../screens/SuccessScreen';
import ScreenErrorBoundary from '../components/ScreenErrorBoundary';
import ROUTES from './routes';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  function ProcessingRoute(props) {
    return (
      <ScreenErrorBoundary
        onRetry={() => props.navigation.replace(ROUTES.PROCESSING, props.route?.params || {})}
        onGoBack={() => props.navigation.goBack()}
      >
        <ProcessingScreen {...props} />
      </ScreenErrorBoundary>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={ROUTES.SPLASH}
      screenOptions={{
        animation: 'fade_from_bottom',
        headerShown: false,
      }}
    >
      <Stack.Screen name={ROUTES.SPLASH} component={SplashScreen} />
      <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={ROUTES.HOME} component={HomeScreen} />
      <Stack.Screen name={ROUTES.SEMESTER} component={SemesterScreen} />
      <Stack.Screen name={ROUTES.ATTENDANCE} component={AttendanceScreen} />
      <Stack.Screen name={ROUTES.PERIOD_WISE} component={PeriodWiseScreen} />
      <Stack.Screen name={ROUTES.TIMETABLE} component={TimetableScreen} />
      <Stack.Screen name={ROUTES.SCAN} component={ScanScreen} />
      <Stack.Screen name={ROUTES.PROCESSING} component={ProcessingRoute} />
      <Stack.Screen name={ROUTES.CAMERA_CAPTURE} component={CameraCaptureScreen} />
      <Stack.Screen name={ROUTES.RESULT} component={ResultScreen} />
      <Stack.Screen name={ROUTES.ALERTS} component={AlertsScreen} />
      <Stack.Screen name={ROUTES.SUCCESS} component={SuccessScreen} />
      <Stack.Screen name={ROUTES.ERROR} component={ErrorScreen} />
    </Stack.Navigator>
  );
}

export default AppNavigator;
