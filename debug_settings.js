
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dcnkwosckxryjiwbtklx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbmt3b3Nja3hyeWppd2J0a2x4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzk1NTUsImV4cCI6MjA4NTkxNTU1NX0.v9QxREYqoRmkOQ7VbxojA8lczXRTXb2vVAIFdiHjqdI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSettings() {
    console.log("Testing connection...");

    // 1. Try to fetch
    console.log("Attempting to fetch settings...");
    const { data, error } = await supabase
        .from('nikeflow_settings')
        .select('*')
        .maybeSingle();

    if (error) {
        console.error("Fetch Error:", JSON.stringify(error, null, 2));
    } else {
        console.log("Fetch Success:", data);
    }

    if (!data) {
        console.log("No settings found. Attempting to insert default...");
        const defaultSettings = {
            id: 'default',
            app_name: 'A.M ABACAXI',
            maintenance_mode: false,
            total_crates: 0
        };

        const { error: insertError } = await supabase
            .from('nikeflow_settings')
            .upsert(defaultSettings);

        if (insertError) {
            console.error("Insert Error:", JSON.stringify(insertError, null, 2));
        } else {
            console.log("Insert Success!");
        }
    }
}

testSettings();
