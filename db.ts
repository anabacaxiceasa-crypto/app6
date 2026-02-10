import { createClient } from '@supabase/supabase-js';
import { User, Product, Customer, Sale, UserRole, DamagedGood, SystemSettings, SaleItem, Expense, CustomerPayment } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("Initializing Supabase Client...");
console.log("URL:", supabaseUrl);
console.log("Key Length:", supabaseAnonKey?.length);
console.log("Key Start:", supabaseAnonKey?.substring(0, 5));

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("FATAL: Missing Supabase URL or Anon Key. Check .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const DB = {
    getSecuritySQL: () => "",

    getSettings: async (): Promise<SystemSettings> => {
        const { data, error } = await supabase
            .from('nikeflow_settings')
            .select('*')
            .single();

        if (error || !data) {
            return { id: 'default', app_name: 'A.M ABACAXI', maintenance_mode: false, total_crates: 0 };
        }
        return data as SystemSettings;
    },

    saveSettings: async (settings: SystemSettings) => {
        const { error } = await supabase
            .from('nikeflow_settings')
            .upsert(settings);

        if (error) console.error('Error saving settings:', error);
    },

    getUsers: async (): Promise<User[]> => {
        const { data, error } = await supabase
            .from('nikeflow_users')
            .select('*');

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }
        return data as User[];
    },

    saveUser: async (user: User) => {
        const { error } = await supabase
            .from('nikeflow_users')
            .upsert(user);

        if (error) console.error('Error saving user:', error);
    },

    deleteUser: async (id: string) => {
        const { error } = await supabase
            .from('nikeflow_users')
            .delete()
            .eq('id', id);

        if (error) console.error('Error deleting user:', error);
    },

    getProducts: async (): Promise<Product[]> => {
        const { data, error } = await supabase
            .from('nikeflow_products')
            .select('*');

        if (error) {
            console.error('Error fetching products:', error);
            return [];
        }
        return data as Product[];
    },

    saveProduct: async (product: Partial<Product>) => {
        // If ID is missing, we let Supabase generate it or generate one here if strict UUID is needed
        // Assuming the table works with UUIDs
        const payload = { ...product };
        if (!payload.id) {
            // Let database handle ID generation if configured via default, 
            // but types invoke 'id' as optional in Partial but required in Product.
            // Usually better to let the backend handle it or generate one.
            // We can use crypto.randomUUID() if we need the ID immediately or let UPSERT handle it.
            // For consistency with typical Supabase flows, we might verify if it's an insert or update.
            // Here we use upsert.
        }

        const { error } = await supabase
            .from('nikeflow_products')
            .upsert(payload as any); // Cast as any because Partial<Product> might miss required DB fields

        if (error) console.error('Error saving product:', error);
    },

    deleteProduct: async (id: string) => {
        const { error } = await supabase
            .from('nikeflow_products')
            .delete()
            .eq('id', id);

        if (error) console.error('Error deleting product:', error);
    },

    getCustomers: async (): Promise<Customer[]> => {
        const { data, error } = await supabase
            .from('nikeflow_customers')
            .select('*');

        if (error) {
            console.error('Error fetching customers:', error);
            return [];
        }
        return data as Customer[];
    },

    saveCustomer: async (customer: Partial<Customer>) => {
        const { error } = await supabase
            .from('nikeflow_customers')
            .upsert(customer as any);

        if (error) console.error('Error saving customer:', error);
    },

    getSales: async (): Promise<Sale[]> => {
        const { data, error } = await supabase
            .from('nikeflow_sales')
            .select('*');

        if (error) {
            console.error('Error fetching sales:', error);
            return [];
        }
        return data as Sale[];
    },

    saveSale: async (sale: Omit<Sale, 'id'>) => {
        // 1. Save Sale
        const { data: saleData, error: saleError } = await supabase
            .from('nikeflow_sales')
            .insert(sale)
            .select()
            .single();

        if (saleError) {
            console.error('Error saving sale:', saleError);
            return;
        }

        // 2. Update Stock (Logic similar to mock but utilizing RPC is better, but here we do client-side for parity with mock logic if RPC not available)
        // Ideally we should use an RPC function 'process_sale' for atomicity.
        // For now, implementing client-side logic as requested to integrate.

        for (const item of sale.items) {
            if (item.productId !== 'AVULSO') {
                // Get current stock
                const { data: product } = await supabase
                    .from('nikeflow_products')
                    .select('stock')
                    .eq('id', item.productId)
                    .single();

                if (product) {
                    const newStock = product.stock - item.quantity;
                    await supabase
                        .from('nikeflow_products')
                        .update({ stock: newStock })
                        .eq('id', item.productId);
                }
            }
        }

        // 3. Update Crates
        if (sale.customerId && (sale.cratesIn > 0 || sale.cratesOut > 0)) {
            const { data: customer } = await supabase
                .from('nikeflow_customers')
                .select('crates_balance')
                .eq('id', sale.customerId)
                .single();

            if (customer) {
                const current = Number(customer.crates_balance || 0);
                const newBalance = current + (Number(sale.cratesOut) || 0) - (Number(sale.cratesIn) || 0);
                await supabase
                    .from('nikeflow_customers')
                    .update({ crates_balance: newBalance })
                    .eq('id', sale.customerId);
            }
        }
    },

    updateSale: async (sale: Sale) => {
        const { error } = await supabase
            .from('nikeflow_sales')
            .update(sale)
            .eq('id', sale.id);

        if (error) console.error('Error updating sale:', error);
    },

    markSaleAsPaid: async (id: string) => {
        const { error } = await supabase
            .from('nikeflow_sales')
            .update({ status: 'PAID' })
            .eq('id', id);

        if (error) console.error('Error marking sale as paid:', error);
    },

    cancelSale: async (id: string) => {
        // Fetch sale first to revert stock
        const { data: sale, error: fetchError } = await supabase
            .from('nikeflow_sales')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !sale) {
            console.error('Sale not found');
            return;
        }

        if (sale.status === 'CANCELLED') return;

        // Update status
        const { error: updateError } = await supabase
            .from('nikeflow_sales')
            .update({ status: 'CANCELLED' })
            .eq('id', id);

        if (updateError) {
            console.error('Error cancelling sale:', updateError);
            return;
        }

        // Revert Stock
        for (const item of (sale.items as SaleItem[])) {
            if (item.productId !== 'AVULSO') {
                const { data: product } = await supabase
                    .from('nikeflow_products')
                    .select('stock')
                    .eq('id', item.productId)
                    .single();

                if (product) {
                    const newStock = product.stock + item.quantity;
                    await supabase
                        .from('nikeflow_products')
                        .update({ stock: newStock })
                        .eq('id', item.productId);
                }
            }
        }

        // Revert Crates
        if (sale.customerId) {
            const { data: customer } = await supabase
                .from('nikeflow_customers')
                .select('crates_balance')
                .eq('id', sale.customerId)
                .single();

            if (customer) {
                const current = Number(customer.crates_balance || 0);
                const newBalance = current - (Number(sale.cratesOut) || 0) + (Number(sale.cratesIn) || 0);
                await supabase
                    .from('nikeflow_customers')
                    .update({ crates_balance: newBalance })
                    .eq('id', sale.customerId);
            }
        }
    },

    getCustomerPayments: async (): Promise<CustomerPayment[]> => {
        const { data, error } = await supabase
            .from('nikeflow_customer_payments')
            .select('*');

        if (error) {
            return [];
        }
        return data as CustomerPayment[];
    },

    saveCustomerPayment: async (payment: Omit<CustomerPayment, 'id'>) => {
        const { error } = await supabase
            .from('nikeflow_customer_payments')
            .insert(payment);

        if (error) console.error('Error saving payment:', error);
    },

    deleteCustomerPayment: async (id: string) => {
        const { error } = await supabase
            .from('nikeflow_customer_payments')
            .delete()
            .eq('id', id);

        if (error) console.error('Error deleting payment:', error);
    },

    getDamagedGoods: async (): Promise<DamagedGood[]> => {
        const { data, error } = await supabase
            .from('nikeflow_damaged')
            .select('*');

        if (error) return [];
        return data as DamagedGood[];
    },

    saveDamagedGood: async (dg: Omit<DamagedGood, 'id'>) => {
        const { error } = await supabase
            .from('nikeflow_damaged')
            .insert(dg);

        if (error) {
            console.error('Error saving damaged good:', error);
            return;
        }

        // Update Stock
        const { data: product } = await supabase
            .from('nikeflow_products')
            .select('stock')
            .eq('id', dg.productId)
            .single();

        if (product) {
            const newStock = Math.max(0, product.stock - dg.quantity);
            await supabase
                .from('nikeflow_products')
                .update({ stock: newStock })
                .eq('id', dg.productId);
        }
    },

    getExpenses: async (): Promise<Expense[]> => {
        const { data, error } = await supabase
            .from('nikeflow_expenses')
            .select('*');

        if (error) return [];
        return data as Expense[];
    },

    saveExpense: async (expense: Omit<Expense, 'id'> | Expense) => {
        const { error } = await supabase
            .from('nikeflow_expenses')
            .upsert(expense);

        if (error) console.error('Error saving expense:', error);
    },

    deleteExpense: async (id: string) => {
        const { error } = await supabase
            .from('nikeflow_expenses')
            .delete()
            .eq('id', id);

        if (error) console.error('Error deleting expense:', error);
    },

    getPaymentMethods: async (): Promise<any[]> => {
        const { data, error } = await supabase
            .from('nikeflow_payment_methods')
            .select('*');

        if (error) return [];
        return data as any[];
    },

    savePaymentMethod: async (method: any) => {
        const { error } = await supabase
            .from('nikeflow_payment_methods')
            .upsert(method);

        if (error) console.error('Error saving payment method:', error);
    },

    deletePaymentMethod: async (id: string) => {
        const { error } = await supabase
            .from('nikeflow_payment_methods')
            .delete()
            .eq('id', id);

        if (error) console.error('Error deleting payment method:', error);
    }
};
