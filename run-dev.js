const { spawn } = require('child_process');
const path = require('path');

// Try different methods to run TypeScript
const methods = [
  ['npx', 'tsx', 'watch', 'src/index.ts'],
  ['npx', 'ts-node', 'src/index.ts'],
  ['node', '-r', 'ts-node/register', 'src/index.ts'],
];

function tryMethod(methodIndex) {
  if (methodIndex >= methods.length) {
    console.error('All TypeScript execution methods failed');
    process.exit(1);
  }

  const method = methods[methodIndex];
  console.log(`Trying method ${methodIndex + 1}: ${method.join(' ')}`);
  
  const child = spawn(method[0], method.slice(1), {
    stdio: 'inherit',
    env: { ...process.env, PATH: '/snap/bin:' + process.env.PATH }
  });

  child.on('error', (error) => {
    console.error(`Method ${methodIndex + 1} failed:`, error.message);
    tryMethod(methodIndex + 1);
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Method ${methodIndex + 1} exited with code ${code}`);
      tryMethod(methodIndex + 1);
    }
  });
}

tryMethod(0);