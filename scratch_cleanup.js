import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanUp() {
  console.log('Cleaning up test restaurants...');
  
  const { data: restaurants, error: fetchError } = await supabase
    .from('restaurants')
    .select('id, name');
    
  if (fetchError) {
    console.error('Error fetching restaurants:', fetchError);
    return;
  }
  
  const toDelete = restaurants.filter(r => 
    r.name.startsWith('Phase ') || 
    r.name.startsWith('Test Scratch') ||
    r.slug?.includes('bistro') ||
    r.slug?.includes('ramen')
  );
  
  console.log(`Found ${toDelete.length} restaurants to delete.`);
  
  for (const r of toDelete) {
    const { error: deleteError } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', r.id);
      
    if (deleteError) {
      console.error(`Error deleting ${r.name}:`, deleteError);
    } else {
      console.log(`Deleted ${r.name}`);
    }
  }
  
  console.log('Cleanup complete!');
}

cleanUp();
