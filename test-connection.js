import { createClient } from '@supabase/supabase-js';

const url = 'https://dcnkwosckxryjiwbtklx.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbmt3b3Nja3hyeWppd2J0a2x4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzk1NTUsImV4cCI6MjA4NTkxNTU1NX0.v9QxREYqoRmkOQ7VbxojA8lczXRTXb2vVAIFdiHjqdI';

console.log('Testing connection...');
console.log('URL:', url);
console.log('Key prefix:', key.substring(0, 10) + '...');

const supabase = createClient(url, key);

async function test() {
    try {
        // Try to generic request to check connectivity
        // Using a public table or just checking health if possible, 
        // but auth.getSession is a good smoke test for the client config
        const { data: authData, error: authError } = await supabase.auth.getSession();
        if (authError) {
            console.error('Auth Check Failed:', authError.message);
        } else {
            console.log('Auth Check Passed (Client Configured)');
        }

        // Try dummy select
        const { data, error, status } = await supabase.from('nikeflow_settings').select('*').limit(1);

        if (error) {
            console.error('Database Select Failed:', error.message);
            console.error('Status:', status);
            if (status === 0 || status === 500) console.log('This might be a network or project status issue.');
            if (status === 404) console.log('Table nikeflow_settings does not exist.');
        } else {
            console.log('Database Connection Successful!');
            console.log('Data returned:', data?.length);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

test();
