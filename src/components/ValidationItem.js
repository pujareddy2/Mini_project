import { StyleSheet, Text, View } from 'react-native';
import Card from './Card';

function ValidationItem({ title, label, status = 'passed', subtitle, extraInfo, style }) {
  const resolvedTitle = title || label || 'Validation';
  const icon = status === 'failed'
    ? '❌'
    : status === 'limited'
      ? '⚠'
      : status === 'pending'
        ? '⬜'
        : '✔';
  const statusText = status === 'failed'
    ? 'Failed'
    : status === 'limited'
      ? 'Limited'
      : status === 'pending'
        ? 'Pending'
        : 'Passed';

  return (
    <Card
      style={[
        styles.container,
        status === 'failed' ? styles.failedBorder : status === 'limited' ? styles.limitedBorder : status === 'pending' ? styles.pendingBorder : styles.passedBorder,
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.labelWrap}>
          <Text style={styles.label}>{icon} {resolvedTitle}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={[styles.statusPill, status === 'failed' ? styles.failedPill : status === 'limited' ? styles.limitedPill : styles.passedPill]}>
          <Text
            style={[
              styles.status,
              status === 'failed' ? styles.failed : status === 'limited' ? styles.limited : styles.passed,
            ]}
          >
            {statusText}
          </Text>
        </View>
      </View>

      {extraInfo ? <Text style={styles.extraInfo}>{extraInfo}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    boxShadow: '0 8px 16px rgba(15, 23, 42, 0.06)',
  },
  passedBorder: {
    borderLeftColor: '#22c55e',
    borderLeftWidth: 4,
  },
  failedBorder: {
    borderLeftColor: '#ef4444',
    borderLeftWidth: 4,
  },
  limitedBorder: {
    borderLeftColor: '#f59e0b',
    borderLeftWidth: 4,
  },
  pendingBorder: {
    borderLeftColor: '#7a8286',
    borderLeftWidth: 4,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelWrap: {
    flex: 1,
    paddingRight: 8,
  },
  label: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  extraInfo: {
    color: '#475569',
    fontSize: 12,
    marginTop: 8,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  passedPill: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  failedPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  limitedPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
  },
  passed: {
    color: '#22c55e',
  },
  failed: {
    color: '#ef4444',
  },
  limited: {
    color: '#f59e0b',
  },
  pending: {
    color: '#7a8286',
  },
});

export default ValidationItem;