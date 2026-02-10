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

-- Function to check if user is admin or financial
CREATE OR REPLACE FUNCTION public.is_admin_or_financial()
RETURNS boolean AS $$
BEGIN
  RETURN (SELECT role IN ('ADMIN', 'FINANCIAL') FROM public.nikeflow_users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- POLICIES
-- ==============================================================================

-- 1. USERS TABLE (nikeflow_users)
-- Everyone can read users (needed for login checks and displaying names)
CREATE POLICY "Enable read access for authenticated users" 
ON public.nikeflow_users FOR SELECT 
TO authenticated 
USING (true);

-- Only Admins can update roles or delete users
CREATE POLICY "Admins can update users" 
ON public.nikeflow_users FOR UPDATE 
TO authenticated 
USING (is_admin_or_financial());

-- Users can update their own profile (e.g. password, name)
CREATE POLICY "Users can update own profile" 
ON public.nikeflow_users FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 2. PRODUCTS TABLE (nikeflow_products)
-- Everyone read
CREATE POLICY "Enable read access for all users" 
ON public.nikeflow_products FOR SELECT 
TO authenticated 
USING (true);

-- Only Admin/Financial can insert/update/delete
CREATE POLICY "Admins/Financial can manage products" 
ON public.nikeflow_products FOR ALL 
TO authenticated 
USING (is_admin_or_financial());

-- 3. CUSTOMERS TABLE (nikeflow_customers)
-- Everyone read
CREATE POLICY "Enable read access for all users" 
ON public.nikeflow_customers FOR SELECT 
TO authenticated 
USING (true);

-- Only Admin/Financial can insert/update/delete
-- NOTE: Sellers might need to create customers? If so, change this.
-- Assuming Sellers can CREATE customers for sales:
CREATE POLICY "Sellers can create customers" 
ON public.nikeflow_customers FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Admins/Financial can manage customers" 
ON public.nikeflow_customers FOR ALL 
TO authenticated 
USING (is_admin_or_financial());

-- 4. SALES TABLE (nikeflow_sales)
-- Everyone read (Sellers need to see history/dashboard)
CREATE POLICY "Enable read access for all users" 
ON public.nikeflow_sales FOR SELECT 
TO authenticated 
USING (true);

-- Sellers can INSERT sales
CREATE POLICY "Sellers can create sales" 
ON public.nikeflow_sales FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Only Admin/Financial can DELETE sales
CREATE POLICY "Admins/Financial can delete sales" 
ON public.nikeflow_sales FOR DELETE 
TO authenticated 
USING (is_admin_or_financial());

-- Only Admin/Financial can UPDATE sales (e.g. cancel, mark paid if restricted)
-- Exception: Sellers might need to mark as paid immediately?
-- Let's allow UPDATE for owner (Seller) OR Admin
CREATE POLICY "Admins/Financial or Owner can update sales" 
ON public.nikeflow_sales FOR UPDATE 
TO authenticated 
USING (is_admin_or_financial() OR auth.uid()::text = "sellerId");

-- 5. FINANCIAL TABLES (Expenses, Payments, Payment Methods)
-- STRICT: Only Admin/Financial
CREATE POLICY "Restricted access to financial tables" 
ON public.nikeflow_expenses FOR ALL 
TO authenticated 
USING (is_admin_or_financial());

CREATE POLICY "Restricted access to payment methods" 
ON public.nikeflow_payment_methods FOR ALL 
TO authenticated 
USING (is_admin_or_financial());

CREATE POLICY "Restricted access to customer payments" 
ON public.nikeflow_customer_payments FOR ALL 
TO authenticated 
USING (is_admin_or_financial());

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
USING (is_admin_or_financial());

-- 7. DAMAGED GOODS
-- Admin/Financial manage
CREATE POLICY "Admins/Financial manage damaged goods" 
ON public.nikeflow_damaged FOR ALL 
TO authenticated 
USING (is_admin_or_financial());
