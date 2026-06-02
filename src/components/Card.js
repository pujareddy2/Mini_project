import { StyleSheet, View } from 'react-native';

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)',
    elevation: 2,
  },
});

export default Card;