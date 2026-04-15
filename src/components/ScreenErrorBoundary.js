import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppButton from './AppButton';
import Card from './Card';
import ScreenLayout from './ScreenLayout';

class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error) {
    if (__DEV__) {
      console.log('ScreenErrorBoundary caught error:', error);
    }
  }

  handleRetry = () => {
    const { onRetry } = this.props;
    this.setState({ hasError: false, error: null });
    if (typeof onRetry === 'function') {
      onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      const { onGoBack } = this.props;

      return (
        <ScreenLayout contentStyle={styles.contentStyle} centered>
          <Card style={styles.card}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>!</Text>
            </View>
            <Text style={styles.title}>Unexpected error occurred</Text>
            <Text style={styles.subtitle}>The verification screen failed to render safely.</Text>
            <AppButton label="Retry" onPress={this.handleRetry} />
            <AppButton label="Go Back" variant="secondary" onPress={onGoBack} />
          </Card>
        </ScreenLayout>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  contentStyle: {
    justifyContent: 'center',
  },
  card: {
    alignItems: 'stretch',
    gap: 12,
  },
  badge: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 999,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  badgeText: {
    color: '#ef4444',
    fontSize: 34,
    fontWeight: '700',
  },
  title: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default ScreenErrorBoundary;
