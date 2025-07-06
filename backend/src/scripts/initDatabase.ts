import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';

async function initDatabase() {
  console.log('🗄️  Initializing database...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'createTables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ Database tables created successfully');
    
    // Test connection with a simple query
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('⏰ Database connection test:', result.rows[0].current_time);
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase();
}

export { initDatabase };