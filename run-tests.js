#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Running Tests...\n');

// Different ways to run tests
const testCommands = [
  ['npm', ['test']],
  ['npx', ['jest']],
  ['node', ['node_modules/.bin/jest']],
];

async function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, { 
      stdio: 'inherit',
      shell: true 
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        console.log(`Command failed with code ${code}\n`);
        resolve(false);
      }
    });
    
    child.on('error', (error) => {
      console.log(`Error: ${error.message}\n`);
      resolve(false);
    });
  });
}

async function main() {
  for (const [command, args] of testCommands) {
    const success = await runCommand(command, args);
    if (success) {
      console.log('✅ Tests completed successfully!');
      return;
    }
  }
  
  console.log('❌ All test commands failed. Let me show you how to run tests manually:');
  console.log('\n📋 Manual Test Commands:');
  console.log('1. Run all tests: npm test');
  console.log('2. Run specific test: npm test -- --testPathPattern=utils');
  console.log('3. Run with coverage: npm run test:coverage');
  console.log('4. Run unit tests only: npm run test:unit');
  console.log('5. Run integration tests: npm run test:integration');
}

main();