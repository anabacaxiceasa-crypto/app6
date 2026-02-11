import { createClient } from '@supabase/supabase-js';

const url = 'https://dcnkwosckxryjiwbtklx.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbmt3b3Nja3hyeWppd2J0a2x4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzk1NTUsImV4cCI6MjA4NTkxNTU1NX0.v9QxREYqoRmkOQ7VbxojA8lczXRTXb2vVAIFdiHjqdI';

const supabase = createClient(url, key);

async function checkUser() {
    console.log('Checking user status...');

    const email = 'fgmanutencaoeservicos@gmail.com';

    // Check if user exists in nikeflow_users
    const { data: users, error } = await supabase
        .from('nikeflow_users')
        .select('*')
        .eq('email', email);

    if (error) {
        console.error('Error fetching user:', error);
        return;
    }

    if (users && users.length > 0) {
        console.log(`✅ User found: ${users.length} record(s)`);
        users.forEach(u => {
            console.log(` - ID: ${u.id}`);
            console.log(` - Role: ${u.role}`);
            console.log(` - Name: ${u.name}`);
            console.log(` - Created: ${u.created_at || 'N/A'}`);
        });
    } else {
        console.log('❌ User not found in nikeflow_users table.');
    }
}

checkUser();
