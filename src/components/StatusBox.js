import { StyleSheet, Text, View } from 'react-native';
import Card from './Card';

function StatusBox({
  title,
  subtitle,
  trailing,
  leadingStyle,
  trailingStyle,
  style,
}) {
  return (
    <Card style={[styles.container, style]}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={[styles.leadingDot, leadingStyle]} />
          <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        {trailing ? <Text style={[styles.trailing, trailingStyle]}>{trailing}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  left: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  leadingDot: {
    backgroundColor: '#3a6095',
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  title: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 3,
  },
  trailing: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default StatusBox;