// MOCK DATABASE IMPLEMENTATION
// Desativando Supabase real para uso local/offline
import { MockDB, mockSupabase } from './mockDb';
export const supabase = mockSupabase;
export const DB = MockDB;

/*
import { createClient } from '@supabase/supabase-js';
import { User, Product, Customer, Sale, UserRole, DamagedGood, SystemSettings, SaleItem, Expense, CustomerPayment } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Supabase keys missing! Check .env.local");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLES = {
  USERS: 'nikeflow_users',
  PRODUCTS: 'nikeflow_products',
  CUSTOMERS: 'nikeflow_customers',
  SALES: 'nikeflow_sales',
  DAMAGED: 'nikeflow_damaged',
  PAYMENTS: 'nikeflow_payment_methods',
  SETTINGS: 'nikeflow_settings',
  EXPENSES: 'nikeflow_expenses',
  CUSTOMER_PAYMENTS: 'nikeflow_customer_payments'
};

const safeNumber = (val: any): number => {
  const parsed = Number(val);
  return isNaN(parsed) ? 0 : parsed;
};

export const DB = {
// ... (rest of the original file commented out)
};
*/
