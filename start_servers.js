const { exec, spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Liner Notes Discovery App...\n');

// Check if Redis is running
console.log('🔍 Checking Redis connection...');
exec('redis-cli ping', (error, stdout, stderr) => {
  if (error) {
    console.log('⚠️  Redis not responding. Please start Redis first:');
    console.log('   brew services start redis');
    console.log('   OR: redis-server\n');
  } else {
    console.log('✅ Redis is running\n');
  }
  
  // Build backend first
  console.log('📦 Building backend...');
  const buildProcess = exec('npm run build', {
    cwd: '/Users/mattthackston/LinerNotes/backend'
  });
  
  buildProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  buildProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  buildProcess.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ Backend build failed with code', code);
      return;
    }
    
    console.log('\n✅ Backend built successfully');
    console.log('\n🔧 Starting backend server...');
    
    // Start backend
    const backend = spawn('npm', ['start'], {
      cwd: '/Users/mattthackston/LinerNotes/backend',
      stdio: 'inherit'
    });
    
    // Give backend time to start
    setTimeout(() => {
      console.log('\n🎨 Starting frontend server...');
      
      // Start frontend
      const frontend = spawn('npm', ['start'], {
        cwd: '/Users/mattthackston/LinerNotes/frontend',
        stdio: 'inherit'
      });
      
      console.log('\n🌟 Servers starting up!');
      console.log('📍 Backend:  http://localhost:3001');
      console.log('📍 Frontend: http://localhost:3000');
      console.log('\nPress Ctrl+C to stop both servers\n');
      
      // Handle cleanup
      process.on('SIGINT', () => {
        console.log('\n🛑 Stopping servers...');
        backend.kill('SIGTERM');
        frontend.kill('SIGTERM');
        setTimeout(() => {
          process.exit(0);
        }, 1000);
      });
      
    }, 5000); // 5 second delay for backend startup
  });
});