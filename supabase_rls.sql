-- ==============================================================================
-- SECURITY & RLS POLICIES FOR NIKEFLOW (A.M ABACAXI)
-- ==============================================================================
-- Enable RLS on all tables
ALTER TABLE nikeflow_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE nikeflow_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE nikeflow_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE nikeflow_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE nikeflow_damaged ENABLE ROW LEVEL SECURITY;
ALTER TABLE nikeflow_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE nikeflow_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE nikeflow_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE nikeflow_customer_payments ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- HELPER FUNCTIONS
-- ==============================================================================
-- Function to get the current user's role safely
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
BEGIN
  RETURN (SELECT role FROM public.nikeflow_users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (SELECT role = 'ADMIN' FROM public.nikeflow_users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- POLICIES
-- ==============================================================================

-- 1. USERS TABLE (nikeflow_users)
-- READ: Everyone (needed for login and display)
CREATE POLICY "Enable read access for authenticated users" 
ON public.nikeflow_users FOR SELECT 
TO authenticated 
USING (true);

-- WRITE (Insert/Update/Delete): Admins can do anything
CREATE POLICY "Admins can manage all users" 
ON public.nikeflow_users FOR ALL 
TO authenticated 
USING (is_admin());

-- SELF-HEALING/SELF-UPDATE: Users can insert/update their own profile
CREATE POLICY "Users can manage own profile" 
ON public.nikeflow_users FOR ALL 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2. PRODUCTS TABLE (nikeflow_products)
-- READ: Everyone
CREATE POLICY "Enable read access for all users" 
ON public.nikeflow_products FOR SELECT 
TO authenticated 
USING (true);

-- INSERT/DELETE: Admin Only
CREATE POLICY "Admins can insert/delete products" 
ON public.nikeflow_products FOR INSERT 
TO authenticated 
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete products" 
ON public.nikeflow_products FOR DELETE 
TO authenticated 
USING (is_admin());

-- UPDATE: Admins (Full) OR Sellers (Stock updates)
-- WARNING: Giving UPDATE to Sellers is needed for client-side stock deduction.
-- Ideally, use a Database Trigger or RPC for this.
CREATE POLICY "Admins or Sellers can update products" 
ON public.nikeflow_products FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. CUSTOMERS TABLE (nikeflow_customers)
-- READ: Everyone
CREATE POLICY "Enable read access for all users" 
ON public.nikeflow_customers FOR SELECT 
TO authenticated 
USING (true);

-- INSERT: Sellers need to create customers
CREATE POLICY "Sellers can create customers" 
ON public.nikeflow_customers FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- UPDATE: Sellers need to update crates balance
CREATE POLICY "Admins or Sellers can update customers" 
ON public.nikeflow_customers FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- DELETE: Admin Only
CREATE POLICY "Admins can delete customers" 
ON public.nikeflow_customers FOR DELETE 
TO authenticated 
USING (is_admin());

-- 4. SALES TABLE (nikeflow_sales)
-- READ: Everyone
CREATE POLICY "Enable read access for all users" 
ON public.nikeflow_sales FOR SELECT 
TO authenticated 
USING (true);

-- INSERT: Sellers
CREATE POLICY "Sellers can create sales" 
ON public.nikeflow_sales FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- DELETE: Admin Only
CREATE POLICY "Admins can delete sales" 
ON public.nikeflow_sales FOR DELETE 
TO authenticated 
USING (is_admin());

-- UPDATE: Admin or Owner (e.g. to Cancel or mark Paid)
CREATE POLICY "Admins or Owner can update sales" 
ON public.nikeflow_sales FOR UPDATE 
TO authenticated 
USING (is_admin() OR auth.uid()::text = "sellerId");

-- 5. FINANCIAL TABLES (Expenses, Payments, Payment Methods)
-- STRICT: Only Admin
CREATE POLICY "Restricted access to financial tables" 
ON public.nikeflow_expenses FOR ALL 
TO authenticated 
USING (is_admin());

CREATE POLICY "Restricted access to payment methods" 
ON public.nikeflow_payment_methods FOR ALL 
TO authenticated 
USING (is_admin());

CREATE POLICY "Restricted access to customer payments" 
ON public.nikeflow_customer_payments FOR ALL 
TO authenticated 
USING (is_admin());

-- 6. SETTINGS TABLE (nikeflow_settings)
-- Read: Everyone
CREATE POLICY "Everyone can read settings" 
ON public.nikeflow_settings FOR SELECT 
TO authenticated 
USING (true);

-- Update: Admin Only
CREATE POLICY "Admins can update settings" 
ON public.nikeflow_settings FOR UPDATE 
TO authenticated 
USING (is_admin());

-- 7. DAMAGED GOODS
-- Admin manage
CREATE POLICY "Admins manage damaged goods" 
ON public.nikeflow_damaged FOR ALL 
TO authenticated 
USING (is_admin());
