
import { createClient } from '@supabase/supabase-js';
import { User, Product, Customer, Sale, UserRole, DamagedGood, SystemSettings, SaleItem, Expense, CustomerPayment } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Supabase keys missing! Check .env.local");
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

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

export const DB = {
  getSettings: async (): Promise<SystemSettings> => {
    const { data, error } = await supabase.from(TABLES.SETTINGS).select('*').limit(1).single();
    if (error || !data) {
      return { id: 'default', app_name: 'A.M ABACAXI', maintenance_mode: false, total_crates: 0 };
    }
    return {
      ...data,
      total_crates: Number(data.total_crates || 0)
    };
  },

  saveSettings: async (settings: SystemSettings) => {
    const { error } = await supabase.from(TABLES.SETTINGS).upsert(settings);
    if (error) console.error('Error saving settings:', error);
  },

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from(TABLES.USERS).select('*');
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    return data || [];
  },

  saveUser: async (user: User) => {
    const { error } = await supabase.from(TABLES.USERS).upsert(user);
    if (error) console.error('Error saving user:', error);
  },

  deleteUser: async (id: string) => {
    const { error } = await supabase.from(TABLES.USERS).delete().eq('id', id);
    if (error) console.error('Error deleting user:', error);
  },

  getProducts: async (): Promise<Product[]> => {
    const { data, error } = await supabase.from(TABLES.PRODUCTS).select('*');
    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }
    return data || [];
  },

  saveProduct: async (product: Partial<Product>) => {
    const { error } = await supabase.from(TABLES.PRODUCTS).upsert(product);
    if (error) console.error('Error saving product:', error);
  },

  deleteProduct: async (id: string) => {
    const { error } = await supabase.from(TABLES.PRODUCTS).delete().eq('id', id);
    if (error) console.error('Error deleting product:', error);
  },

  getCustomers: async (): Promise<Customer[]> => {
    const { data, error } = await supabase.from(TABLES.CUSTOMERS).select('*');
    if (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
    return data || [];
  },

  saveCustomer: async (customer: Partial<Customer>) => {
    const { error } = await supabase.from(TABLES.CUSTOMERS).upsert(customer);
    if (error) console.error('Error saving customer:', error);
  },

  getSales: async (): Promise<Sale[]> => {
    const { data, error } = await supabase.from(TABLES.SALES).select('*');
    if (error) {
      console.error('Error fetching sales:', error);
      return [];
    }
    return data || [];
  },

  saveSale: async (sale: Omit<Sale, 'id'>) => {
    const { data: newSale, error } = await supabase.from(TABLES.SALES).insert(sale).select().single();

    if (error) {
      console.error('Error saving sale:', error);
      return;
    }

    // Update Stock
    for (const item of sale.items) {
      if (item.productId !== 'AVULSO') {
        const { data: product } = await supabase.from(TABLES.PRODUCTS).select('stock').eq('id', item.productId).single();
        if (product) {
          const newStock = product.stock - item.quantity;
          await supabase.from(TABLES.PRODUCTS).update({ stock: newStock }).eq('id', item.productId);
        }
      }
    }

    // Update Crates
    if (sale.customerId && (sale.cratesIn || sale.cratesOut)) {
      const { data: customer } = await supabase.from(TABLES.CUSTOMERS).select('crates_balance').eq('id', sale.customerId).single();
      if (customer) {
        const current = Number(customer.crates_balance || 0);
        const newBalance = current + (Number(sale.cratesOut) || 0) - (Number(sale.cratesIn) || 0);
        await supabase.from(TABLES.CUSTOMERS).update({ crates_balance: newBalance }).eq('id', sale.customerId);
      }
    }
  },

  updateSale: async (sale: Sale) => {
    const { error } = await supabase.from(TABLES.SALES).update(sale).eq('id', sale.id);
    if (error) console.error('Error updating sale:', error);
  },

  markSaleAsPaid: async (id: string) => {
    const { error } = await supabase.from(TABLES.SALES).update({ status: 'PAID' }).eq('id', id);
    if (error) console.error('Error marking sale as paid:', error);
  },

  cancelSale: async (id: string) => {
    const { data: sale, error } = await supabase.from(TABLES.SALES).select('*').eq('id', id).single();
    if (error || !sale) {
      console.error("Venda não encontrada");
      return;
    }

    if (sale.status === 'CANCELLED') return;

    await supabase.from(TABLES.SALES).update({ status: 'CANCELLED' }).eq('id', id);

    // Revert Stock
    for (const item of sale.items) {
      if (item.productId !== 'AVULSO') {
        const { data: product } = await supabase.from(TABLES.PRODUCTS).select('stock').eq('id', item.productId).single();
        if (product) {
          const newStock = product.stock + item.quantity;
          await supabase.from(TABLES.PRODUCTS).update({ stock: newStock }).eq('id', item.productId);
        }
      }
    }

    // Revert Crates
    if (sale.customerId) {
      const { data: customer } = await supabase.from(TABLES.CUSTOMERS).select('crates_balance').eq('id', sale.customerId).single();
      if (customer) {
        const current = Number(customer.crates_balance || 0);
        const newBalance = current - (Number(sale.cratesOut) || 0) + (Number(sale.cratesIn) || 0);
        await supabase.from(TABLES.CUSTOMERS).update({ crates_balance: newBalance }).eq('id', sale.customerId);
      }
    }
  },

  getCustomerPayments: async (): Promise<CustomerPayment[]> => {
    const { data, error } = await supabase.from(TABLES.CUSTOMER_PAYMENTS).select('*');
    if (error) return [];
    return data || [];
  },

  saveCustomerPayment: async (payment: Omit<CustomerPayment, 'id'>) => {
    const { error } = await supabase.from(TABLES.CUSTOMER_PAYMENTS).insert(payment);
    if (error) console.error('Error saving customer payment:', error);
  },

  deleteCustomerPayment: async (id: string) => {
    const { error } = await supabase.from(TABLES.CUSTOMER_PAYMENTS).delete().eq('id', id);
    if (error) console.error('Error deleting customer payment:', error);
  },

  getDamagedGoods: async (): Promise<DamagedGood[]> => {
    const { data, error } = await supabase.from(TABLES.DAMAGED).select('*');
    if (error) return [];
    return data || [];
  },

  saveDamagedGood: async (dg: Omit<DamagedGood, 'id'>) => {
    const { error } = await supabase.from(TABLES.DAMAGED).insert(dg);
    if (error) console.error('Error saving damaged good:', error);

    // Decrease stock
    const { data: product } = await supabase.from(TABLES.PRODUCTS).select('stock').eq('id', dg.productId).single();
    if (product) {
      const newStock = Math.max(0, product.stock - dg.quantity);
      await supabase.from(TABLES.PRODUCTS).update({ stock: newStock }).eq('id', dg.productId);
    }
  },

  getExpenses: async (): Promise<Expense[]> => {
    const { data, error } = await supabase.from(TABLES.EXPENSES).select('*');
    if (error) return [];
    return data || [];
  },

  saveExpense: async (expense: Omit<Expense, 'id'> | Expense) => {
    const { error } = await supabase.from(TABLES.EXPENSES).upsert(expense);
    if (error) console.error('Error saving expense:', error);
  },

  deleteExpense: async (id: string) => {
    const { error } = await supabase.from(TABLES.EXPENSES).delete().eq('id', id);
    if (error) console.error('Error deleting expense:', error);
  },

  getPaymentMethods: async (): Promise<any[]> => {
    const { data, error } = await supabase.from(TABLES.PAYMENTS).select('*');
    if (error) return [];
    return data || [];
  },

  savePaymentMethod: async (method: any) => {
    const { error } = await supabase.from(TABLES.PAYMENTS).upsert(method);
    if (error) console.error('Error saving payment method:', error);
  },

  deletePaymentMethod: async (id: string) => {
    const { error } = await supabase.from(TABLES.PAYMENTS).delete().eq('id', id);
    if (error) console.error('Error deleting payment method:', error);
  }
};
