// Quick start script for Liner Notes Discovery App
const { exec } = require('child_process');

console.log('🚀 Quick Start: Liner Notes Discovery App\n');

function runCommand(command, cwd, description) {
  return new Promise((resolve, reject) => {
    console.log(`📋 ${description}...`);
    const process = exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ ${description} failed:`, error.message);
        reject(error);
      } else {
        console.log(`✅ ${description} completed`);
        resolve(stdout);
      }
    });
    
    process.stdout.on('data', (data) => {
      // Show build output
      if (description.includes('Building')) {
        process.stdout.write(data);
      }
    });
  });
}

async function quickStart() {
  try {
    // Check Redis
    console.log('🔍 Checking Redis...');
    try {
      await runCommand('redis-cli ping', '.', 'Redis connection test');
    } catch {
      console.log('⚠️  Redis not running. Starting Redis...');
      try {
        await runCommand('brew services start redis', '.', 'Starting Redis');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      } catch {
        console.log('⚠️  Could not start Redis automatically. Please run: brew services start redis');
      }
    }

    // Build backend
    await runCommand('npm run build', '/Users/mattthackston/LinerNotes/backend', 'Building backend');

    // Start backend
    console.log('\n🔧 Starting backend server...');
    const backendProcess = exec('npm start', { 
      cwd: '/Users/mattthackston/LinerNotes/backend' 
    });
    
    backendProcess.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    // Wait for backend to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Start frontend
    console.log('🎨 Starting frontend server...');
    const frontendProcess = exec('npm start', { 
      cwd: '/Users/mattthackston/LinerNotes/frontend' 
    });
    
    frontendProcess.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    console.log('\n🌟 Servers should be starting up!');
    console.log('📍 Backend:  http://localhost:3001/api/search/health');
    console.log('📍 Frontend: http://localhost:3000');
    console.log('\n🎵 Try searching for "Come Together Beatles" to test the enhanced search!');
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    console.log('\n📋 Manual startup instructions:');
    console.log('1. brew services start redis');
    console.log('2. cd /Users/mattthackston/LinerNotes/backend && npm run build && npm start');
    console.log('3. cd /Users/mattthackston/LinerNotes/frontend && npm start');
  }
}

quickStart();