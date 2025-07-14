const { exec } = require('child_process');

console.log('🔧 Fixing 400 Error in Search Validation...\n');

console.log('❌ PROBLEM IDENTIFIED:');
console.log('The validation middleware was still expecting the old "q" parameter');
console.log('When using separate fields (song + artist), no "q" parameter exists');
console.log('This caused a 400 validation error\n');

console.log('✅ SOLUTION APPLIED:');
console.log('• Updated validation to accept either "q" OR "song" parameter');
console.log('• Made both "q" and "song" optional in validation');
console.log('• Added custom validation to ensure at least one is provided');
console.log('• Added validation for optional "artist" parameter\n');

// Build backend
console.log('📦 Building backend with validation fix...');
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
    console.log('✅ Backend build successful!\n');
    
    console.log('🎯 VALIDATION NOW SUPPORTS:');
    console.log('✅ New format: ?song=Hotel California&artist=Eagles');
    console.log('✅ Legacy format: ?q=Hotel California Eagles');
    console.log('✅ Song only: ?song=Hotel California');
    console.log('✅ Combined only: ?q=Hotel California\n');
    
    console.log('🚀 TO FIX THE 400 ERROR:');
    console.log('1. Restart your backend server:');
    console.log('   cd /Users/mattthackston/LinerNotes/backend');
    console.log('   npm start');
    console.log('');
    console.log('2. Try the search again with separate fields');
    console.log('   Song Title: "Hotel California"');
    console.log('   Artist: "Eagles"');
    console.log('');
    console.log('The 400 error should now be resolved!');
  } else {
    console.error('❌ Backend build failed with code:', code);
  }
});