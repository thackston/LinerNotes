const { exec } = require('child_process');
const fs = require('fs');

console.log('🔄 Force Rebuilding Backend with Songwriter Fixes...\n');

console.log('❌ PROBLEM IDENTIFIED:');
console.log('The compiled backend still has old includes:');
console.log('   inc: "releases+release-groups+artist-credits"');
console.log('');
console.log('✅ SHOULD HAVE:');
console.log('   inc: "releases+release-groups+artist-credits+artist-rels+work-rels+recording-rels"');
console.log('');

async function forceRebuild() {
  try {
    // Check if dist directory exists and remove it
    console.log('🗑️  Cleaning old build...');
    try {
      if (fs.existsSync('/Users/mattthackston/LinerNotes/backend/dist')) {
        await new Promise((resolve, reject) => {
          exec('rm -rf dist', { cwd: '/Users/mattthackston/LinerNotes/backend' }, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
        console.log('✅ Old build cleaned');
      }
    } catch (cleanError) {
      console.log('⚠️  Could not clean old build, continuing...');
    }
    
    // Force rebuild
    console.log('\n📦 Force rebuilding backend...');
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
        console.log('\n✅ Backend rebuilt successfully!');
        
        // Verify the fix
        console.log('\n🔍 Verifying songwriter fixes in compiled code...');
        try {
          const compiledFile = fs.readFileSync('/Users/mattthackston/LinerNotes/backend/dist/services/musicAPIs/musicBrainzEnhanced.js', 'utf8');
          
          if (compiledFile.includes('artist-rels+work-rels+recording-rels')) {
            console.log('✅ SONGWRITER FIXES VERIFIED IN COMPILED CODE!');
            console.log('   Found: artist-rels+work-rels+recording-rels');
          } else {
            console.log('❌ SONGWRITER FIXES NOT FOUND IN COMPILED CODE');
            console.log('   Still has old includes - compilation may have failed');
          }
          
          if (compiledFile.includes('Found songwriter(s)')) {
            console.log('✅ Songwriter logging code found in compiled version');
          } else {
            console.log('❌ Songwriter logging code missing from compiled version');
          }
          
        } catch (verifyError) {
          console.log('⚠️  Could not verify compiled code');
        }
        
        console.log('\n🚀 NEXT STEPS:');
        console.log('1. Restart your backend server:');
        console.log('   npm start');
        console.log('');
        console.log('2. Search for "Yesterday" by "The Beatles"');
        console.log('');
        console.log('3. Check backend console for:');
        console.log('   "🎼 Found X songwriter(s) for Yesterday"');
        console.log('');
        console.log('4. If you see songwriter logs but no UI display:');
        console.log('   - Run the debug script to check API response');
        console.log('   - Check browser console for frontend issues');
        
      } else {
        console.error('\n❌ Backend build failed with code:', code);
        console.log('\nTry running manually:');
        console.log('cd /Users/mattthackston/LinerNotes/backend');
        console.log('rm -rf dist');
        console.log('npm run build');
      }
    });
    
  } catch (error) {
    console.error('❌ Force rebuild failed:', error.message);
  }
}

forceRebuild();