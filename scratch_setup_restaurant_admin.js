const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupRestaurantAdmin() {
  // 1. Create the user in Supabase Auth
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'restaurantadmin@queueflow.io',
    password: 'password123',
    email_confirm: true,
  });
  
  if (error && error.message !== 'User already registered') {
    console.error('Error creating user:', error.message);
    return;
  }
  
  console.log('User created or exists.');
  
  // 2. Insert into the database
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    
    // Get the ID of restaurantadmin
    const res = await client.query("SELECT id FROM auth.users WHERE email = 'restaurantadmin@queueflow.io'");
    if (res.rows.length === 0) throw new Error("User not found in auth.users");
    const userId = res.rows[0].id;
    console.log('User ID:', userId);
    
    // Insert into user_profiles
    await client.query(`
      INSERT INTO public.user_profiles (id, display_name, email)
      VALUES ($1, 'Test Restaurant Admin', 'restaurantadmin@queueflow.io')
      ON CONFLICT (id) DO NOTHING
    `, [userId]);
    console.log('Inserted into user_profiles');
    
    // Get the first available restaurant from the database
    const restRes = await client.query("SELECT id, name FROM public.restaurants LIMIT 1");
    if (restRes.rows.length === 0) throw new Error("No restaurants found in database");
    const restaurantId = restRes.rows[0].id;
    const restaurantName = restRes.rows[0].name;
    console.log(`Assigning to restaurant: ${restaurantName} (${restaurantId})`);
    
    // Insert into restaurant_memberships as RESTAURANT_ADMIN
    await client.query(`
      INSERT INTO public.restaurant_memberships (user_id, restaurant_id, role, status)
      VALUES ($1, $2, 'RESTAURANT_ADMIN', 'ACTIVE')
      ON CONFLICT DO NOTHING
    `, [userId, restaurantId]);
    console.log('Granted RESTAURANT_ADMIN membership');
    
  } catch (e) {
    console.error('Database Error:', e);
  } finally {
    await client.end();
  }
}

setupRestaurantAdmin();
