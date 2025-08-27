const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Attempting to install and run TypeScript application...');

// Try different installation methods
const installMethods = [
  'npm install tsx ts-node typescript --save-dev --legacy-peer-deps',
  'npm install tsx ts-node typescript --save-dev --force',
  'npm install --legacy-peer-deps',
];

const runMethods = [
  'npx tsx watch src/index.ts',
  'npx ts-node src/index.ts',
  'node -r ts-node/register src/index.ts',
];

function tryInstall() {
  for (const method of installMethods) {
    try {
      console.log(`Trying install method: ${method}`);
      execSync(method, { stdio: 'inherit' });
      console.log('Install successful!');
      return true;
    } catch (error) {
      console.log(`Install method failed: ${error.message}`);
    }
  }
  return false;
}

function tryRun() {
  for (const method of runMethods) {
    try {
      console.log(`Trying run method: ${method}`);
      execSync(method, { stdio: 'inherit' });
      return true;
    } catch (error) {
      console.log(`Run method failed: ${error.message}`);
    }
  }
  return false;
}

// Main execution
if (tryInstall()) {
  console.log('Dependencies installed, trying to run...');
  if (!tryRun()) {
    console.log('All run methods failed. Please check the logs above.');
  }
} else {
  console.log('All install methods failed. There may be a system-level npm/node configuration issue.');
  console.log('You may need to:');
  console.log('1. Use a single Node.js installation (either snap or system-wide, not both)');
  console.log('2. Clear npm cache: npm cache clear --force');
  console.log('3. Check permissions on node_modules directory');
}