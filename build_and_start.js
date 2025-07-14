#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');

console.log('🚀 Building and Starting Liner Notes Discovery App...\n');

// Build backend
console.log('📦 Building backend...');
const buildProcess = spawn('npm', ['run', 'build'], {
  cwd: '/Users/mattthackston/LinerNotes/backend',
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Backend build failed');
    process.exit(1);
  }
  
  console.log('✅ Backend built successfully');
  console.log('\n🔄 Starting servers...\n');
  
  // Start backend
  console.log('🔧 Starting backend server on http://localhost:3001');
  const backendProcess = spawn('npm', ['start'], {
    cwd: '/Users/mattthackston/LinerNotes/backend',
    stdio: 'inherit',
    shell: true,
    detached: false
  });
  
  // Give backend time to start
  setTimeout(() => {
    console.log('🎨 Starting frontend server on http://localhost:3000');
    const frontendProcess = spawn('npm', ['start'], {
      cwd: '/Users/mattthackston/LinerNotes/frontend',
      stdio: 'inherit',
      shell: true,
      detached: false
    });
    
    // Handle cleanup
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping servers...');
      backendProcess.kill();
      frontendProcess.kill();
      process.exit(0);
    });
    
    frontendProcess.on('close', (code) => {
      console.log('Frontend server stopped');
      backendProcess.kill();
    });
    
  }, 3000);
  
  backendProcess.on('close', (code) => {
    console.log('Backend server stopped');
  });
});

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n🛑 Build interrupted');
  process.exit(0);
});