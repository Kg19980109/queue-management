const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'superadmin@queueflow.io',
    password: 'password123',
  });
  if (error) {
    console.error('Login Error:', error.message);
  } else {
    console.log('Login Success! User ID:', data.user.id);
  }
}

testLogin();
