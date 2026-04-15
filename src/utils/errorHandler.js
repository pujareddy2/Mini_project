function resolveType(error = {}) {
  const code = String(error.code || '').toLowerCase();
  const message = String(error.message || '').toLowerCase();

  if (code.includes('permission') || message.includes('permission') || code.includes('gps_off')) {
    return 'permission';
  }

  if (code.includes('network') || code.includes('offline') || code.includes('timeout') || message.includes('network') || message.includes('internet')) {
    return 'network';
  }

  if (code.includes('invalid') || code.includes('rejected') || code.includes('location') || code.includes('wifi') || code.includes('camera')) {
    return 'validation';
  }

  return 'server';
}

function defaultActionByType(type) {
  if (type === 'network') {
    return 'retry';
  }

  if (type === 'permission') {
    return 'open_settings';
  }

  if (type === 'validation') {
    return 'scan_again';
  }

  return 'retry';
}

function defaultMessageByType(type) {
  if (type === 'network') {
    return "You're offline. Please reconnect and try again.";
  }

  if (type === 'permission') {
    return 'Permission is required to continue verification.';
  }

  if (type === 'validation') {
    return 'Verification failed. Please retry the current step.';
  }

  return 'Something went wrong. Please try again.';
}

function handleError(error) {
  const type = resolveType(error);

  return {
    type,
    message: error?.message || defaultMessageByType(type),
    action: defaultActionByType(type),
    raw: error || null,
  };
}

export { handleError };
