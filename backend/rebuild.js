const { exec } = require('child_process');
const fs = require('fs');

console.log('🔄 Rebuilding Backend with Songwriter Fixes...\n');

async function rebuild() {
  try {
    // Clean old build
    console.log('🗑️  Cleaning old build...');
    if (fs.existsSync('./dist')) {
      exec('rm -rf dist', (error) => {
        if (error) {
          console.log('⚠️  Could not clean, continuing...');
        } else {
          console.log('✅ Old build cleaned');
        }
        
        // Build
        console.log('\n📦 Building...');
        const buildProcess = exec('npm run build');
        
        buildProcess.stdout.on('data', (data) => {
          console.log(data.toString());
        });
        
        buildProcess.stderr.on('data', (data) => {
          console.error(data.toString());
        });
        
        buildProcess.on('close', (code) => {
          if (code === 0) {
            console.log('\n✅ Build successful!');
            
            // Verify includes
            try {
              const compiledFile = fs.readFileSync('./dist/services/musicAPIs/musicBrainzEnhanced.js', 'utf8');
              
              if (compiledFile.includes('artist-rels+work-rels+recording-rels')) {
                console.log('✅ SONGWRITER FIXES VERIFIED!');
              } else {
                console.log('❌ SONGWRITER FIXES MISSING - old includes still present');
              }
            } catch (e) {
              console.log('⚠️  Could not verify compiled code');
            }
            
            console.log('\n🚀 Now run: npm start');
          } else {
            console.error('❌ Build failed');
          }
        });
      });
    } else {
      console.log('No dist directory, proceeding with build...');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

rebuild();