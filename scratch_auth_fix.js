const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPasswords() {
  const userIds = [
    'a0000000-0000-4000-a000-000000000001', // superadmin
    'a0000000-0000-4000-a000-000000000002', // alice
    'a0000000-0000-4000-a000-000000000003', // bob
    'a0000000-0000-4000-a000-000000000004', // charlie
    'a0000000-0000-4000-a000-000000000005', // diana
  ];

  for (const id of userIds) {
    const { data, error } = await supabase.auth.admin.updateUserById(id, {
      password: 'password123',
    });
    if (error) {
      console.log(`Error updating ${id}:`, error.message);
    } else {
      console.log(`Updated password for ${id} to 'password123'`);
    }
  }
}

fixPasswords();
