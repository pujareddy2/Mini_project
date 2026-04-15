function wait(timeout) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}

async function verifyQR(token) {
  // API-ready structure: replace with POST /verify-qr
  // payload example: { token, userID }
  await wait(900);

  const normalizedToken = typeof token === 'string' ? token.trim() : '';

  if (!normalizedToken) {
    return {
      valid: false,
      status: 'invalid',
      message: 'QR token is missing',
    };
  }

  return {
    valid: true,
    status: 'valid',
    session: 'DSA Class',
    time: '09:30 AM',
    message: 'QR verified successfully',
  };
}

export { verifyQR };