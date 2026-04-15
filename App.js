import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import AppWrapper from './src/components/AppWrapper';
import { AlertsProvider } from './src/context/AlertsContext';
import AppNavigator from './src/navigation/AppNavigator';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  return (
    <AppWrapper>
      <AlertsProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <AppNavigator />
        </NavigationContainer>
      </AlertsProvider>
    </AppWrapper>
  );
}
