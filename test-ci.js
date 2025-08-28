#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing CI Pipeline Components...\n');

function runCommand(command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function testCI() {
  const tests = [
    {
      name: 'Backend Dependencies',
      command: 'npm list --depth=0',
      cwd: '.'
    },
    {
      name: 'Frontend Dependencies', 
      command: 'npm list --depth=0',
      cwd: './frontend'
    },
    {
      name: 'Backend TypeScript Check',
      command: 'npx tsc --noEmit',
      cwd: '.'
    },
    {
      name: 'Frontend TypeScript Check',
      command: 'npx tsc --noEmit',
      cwd: './frontend'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`⏳ Running: ${test.name}...`);
      const result = await runCommand(test.command, test.cwd);
      console.log(`✅ ${test.name} - PASSED\n`);
    } catch (err) {
      console.log(`❌ ${test.name} - FAILED`);
      console.log(`Error: ${err.error?.message || 'Unknown error'}\n`);
    }
  }

  // Check for critical files
  const criticalFiles = [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'jest.config.js',
    'frontend/package.json',
    'frontend/tsconfig.json',
    'frontend/vite.config.ts',
    '.github/workflows/ci.yml'
  ];

  console.log('📁 Checking critical files...');
  for (const file of criticalFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} - EXISTS`);
    } else {
      console.log(`❌ ${file} - MISSING`);
    }
  }

  console.log('\n🏁 CI Test Complete!');
}

testCI().catch(console.error);