import { getDashboardSummary } from './attendanceDataService';

function wait(timeout) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}

async function getDashboardData() {
  // API-ready shape: replace this with GET /attendance-status when backend is available.
  await wait(600);

  return getDashboardSummary();
}

export { getDashboardData };
