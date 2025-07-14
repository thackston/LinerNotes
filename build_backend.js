const { exec } = require('child_process');

console.log('🔨 Building backend with TypeScript fixes...');

const buildProcess = exec('npm run build', {
  cwd: '/Users/mattthackston/LinerNotes/backend'
});

buildProcess.stdout.on('data', (data) => {
  console.log(data.toString());
});

buildProcess.stderr.on('data', (data) => {
  console.error(data.toString());
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Backend build successful!');
    console.log('🚀 Now run: npm start');
  } else {
    console.error('❌ Backend build failed with code:', code);
  }
});