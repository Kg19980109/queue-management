const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAuth() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'testlogin@queueflow.io',
    password: 'password123',
    email_confirm: true,
  });
  console.log('Create User:', error ? error.message : 'Success');
  
  if (!error) {
    const login = await supabase.auth.signInWithPassword({
      email: 'testlogin@queueflow.io',
      password: 'password123',
    });
    console.log('Login Test User:', login.error ? login.error.message : 'Success');
  }
}

checkAuth();
