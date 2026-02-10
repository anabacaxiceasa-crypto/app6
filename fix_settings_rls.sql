-- Allow anonymous users to read settings (required for app initialization before login)
create policy "Enable read access for anon" on nikeflow_settings for select using (true);

-- Ensure authenticated users can also read (already exists in schema.sql likely, but adding for completeness)
-- create policy "Enable read access for authenticated users" on nikeflow_settings for select using (auth.role() = 'authenticated');

-- Initialize default settings manually if they don't exist
insert into nikeflow_settings (id, app_name, maintenance_mode, total_crates)
values ('default', 'A.M ABACAXI', false, 0)
on conflict (id) do nothing;
