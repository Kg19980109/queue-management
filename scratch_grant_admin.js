const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function grantSuperAdmin() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    
    // Get the ID of testlogin
    const res = await client.query("SELECT id FROM auth.users WHERE email = 'testlogin@queueflow.io'");
    if (res.rows.length === 0) throw new Error("testlogin not found");
    const userId = res.rows[0].id;
    console.log('testlogin ID:', userId);
    
    // Insert into user_profiles
    await client.query(`
      INSERT INTO public.user_profiles (id, display_name, email)
      VALUES ($1, 'Test Super Admin', 'testlogin@queueflow.io')
      ON CONFLICT (id) DO NOTHING
    `, [userId]);
    console.log('Inserted into user_profiles');
    
    // Insert into restaurant_memberships as SUPER_ADMIN
    await client.query(`
      INSERT INTO public.restaurant_memberships (user_id, restaurant_id, role, status)
      VALUES ($1, NULL, 'SUPER_ADMIN', 'ACTIVE')
      ON CONFLICT DO NOTHING
    `, [userId]);
    console.log('Granted SUPER_ADMIN membership');
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await client.end();
  }
}

grantSuperAdmin();
