import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testInsert() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'testlogin@queueflow.io',
    password: 'password123'
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  console.log('Logged in as:', authData.user.id);

  const { data, error } = await supabase.from('restaurants').insert({
    name: 'Test Scratch',
    slug: 'test-scratch-' + Date.now(),
    status: 'ACTIVE'
  }).select();

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Insert success:', data);
  }
}

testInsert();
