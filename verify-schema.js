import { createClient } from '@supabase/supabase-js';

const url = 'https://dcnkwosckxryjiwbtklx.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbmt3b3Nja3hyeWppd2J0a2x4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzk1NTUsImV4cCI6MjA4NTkxNTU1NX0.v9QxREYqoRmkOQ7VbxojA8lczXRTXb2vVAIFdiHjqdI';

const supabase = createClient(url, key);

async function checkTables() {
    console.log('Checking database tables...');

    const tables = [
        'nikeflow_users',
        'nikeflow_products',
        'nikeflow_customers',
        'nikeflow_sales',
        'nikeflow_settings'
    ];

    for (const table of tables) {
        // Try to select 0 rows just to check if table exists and is accessible
        const { error, status } = await supabase.from(table).select('count', { count: 'exact', head: true });

        if (error) {
            if (error.code === '42P01') {
                console.error(`❌ Table '${table}' DOES NOT EXIST.`);
            } else if (status === 404) {
                console.error(`❌ Table '${table}' NOT FOUND (404) - likely missing or Schema Cache issue.`);
            } else {
                console.error(`❌ Error accessing '${table}':`, error.message, `(Code: ${error.code})`);
            }
        } else {
            console.log(`✅ Table '${table}' exists and is accessible.`);
        }
    }
}

checkTables();
