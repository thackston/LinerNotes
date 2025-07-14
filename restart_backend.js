const { exec } = require('child_process');

console.log('🔍 Checking for existing backend server on port 3001...');

// Find and kill existing process on port 3001
exec('lsof -ti:3001', (error, stdout, stderr) => {
  if (stdout.trim()) {
    const pid = stdout.trim();
    console.log(`🛑 Found existing server with PID: ${pid}`);
    console.log('🔪 Killing existing server...');
    
    exec(`kill -9 ${pid}`, (killError) => {
      if (killError) {
        console.error('❌ Error killing process:', killError.message);
      } else {
        console.log('✅ Old server killed successfully');
      }
      
      // Wait a moment then start new server
      setTimeout(() => {
        console.log('🚀 Starting new backend server...');
        
        const newServer = exec('npm start', {
          cwd: '/Users/mattthackston/LinerNotes/backend'
        });
        
        newServer.stdout.on('data', (data) => {
          console.log(data.toString());
        });
        
        newServer.stderr.on('data', (data) => {
          console.error(data.toString());
        });
        
        newServer.on('close', (code) => {
          if (code !== 0) {
            console.error('❌ Server failed to start with code:', code);
          }
        });
        
      }, 1000);
    });
  } else {
    console.log('✅ No existing server found on port 3001');
    console.log('🚀 Starting backend server...');
    
    const newServer = exec('npm start', {
      cwd: '/Users/mattthackston/LinerNotes/backend'
    });
    
    newServer.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    newServer.stderr.on('data', (data) => {
      console.error(data.toString());
    });
  }
});