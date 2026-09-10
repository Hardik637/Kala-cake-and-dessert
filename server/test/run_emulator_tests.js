/**
 * Automated Test Runner for Production Audit Suite
 * Configures the isolated test environment per Requirement 30 and executes the audit tests.
 */

process.env.TEST_FIREBASE_PROJECT_ID = 'patisserie-isolated-test-suite';
process.env.NODE_ENV = 'test';

const main = require('./production_audit_tests');

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test run failed:', err);
    process.exit(1);
  });
