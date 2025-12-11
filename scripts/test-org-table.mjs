import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log('Testing organizations table...');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

  // Test insert with k12_district type
  const testSlug = 'test-' + Date.now();
  const { data: insertData, error: insertError } = await supabase
    .from('organizations')
    .insert({
      name: 'Test Organization',
      slug: testSlug,
      type: 'k12_district',
      admin_email: 'test@example.com',
      billing_email: 'test@example.com',
      subscription_tier: 'pilot',
      max_seats: 100,
      current_seats: 0,
    })
    .select()
    .single();

  console.log('\nInsert test result:');
  console.log('Data:', insertData);
  console.log('Error:', JSON.stringify(insertError, null, 2));

  if (insertError) {
    console.log('\n❌ Insert failed!');
    console.log('Error code:', insertError.code);
    console.log('Error message:', insertError.message);
    console.log('Error details:', insertError.details);
    console.log('Error hint:', insertError.hint);
  } else {
    console.log('\n✅ Insert succeeded!');
    // Clean up
    await supabase.from('organizations').delete().eq('id', insertData.id);
    console.log('Test data cleaned up.');
  }
}

test();
