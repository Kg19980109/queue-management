const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixSchemaCache() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    console.log('Connected to remote DB');
    
    // Reload PostgREST schema cache
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('Sent reload schema NOTIFY to PostgREST.');
    
    // Check if the users exist
    const res = await client.query('SELECT email FROM auth.users');
    console.log('Users in auth.users:', res.rows.map(r => r.email));
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await client.end();
  }
}

fixSchemaCache();
