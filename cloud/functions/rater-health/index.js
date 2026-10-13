'use strict';

// Connectivity probe only: no SDK, credentials, user input or database access.
exports.main = async () => ({
  service: 'rater-tracker-health',
  protocol: 1,
  ok: true,
  serverTime: new Date().toISOString()
});
