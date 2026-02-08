
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
  getSecuritySQL: () => {
    return `
-- SCRIPT DE REPARAÇÃO TOTAL - EXECUTE NO SQL EDITOR DO SUPABASE --

-- 1. CRIAR TABELA DE PAGAMENTOS DE CLIENTES SE NÃO EXISTIR
CREATE TABLE IF NOT EXISTS public.${TABLES.CUSTOMER_PAYMENTS} (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date timestamptz DEFAULT now(),
    customer_id uuid REFERENCES public.${TABLES.CUSTOMERS}(id),
    customer_name text,
    amount numeric NOT NULL,
    method text,
    notes text
);

-- 2. REMOVER RESTRIÇÕES DE COLUNA EM VENDAS
ALTER TABLE IF EXISTS public.${TABLES.SALES} 
ALTER COLUMN customer_id DROP NOT NULL;

-- 2.2 ADICIONAR COLUNA EM SETTINGS
ALTER TABLE IF EXISTS public.${TABLES.SETTINGS} ADD COLUMN IF NOT EXISTS total_crates int DEFAULT 0;

-- 2.1 ADICIONAR COLUNAS DE CAIXAS (CRATES)
ALTER TABLE IF EXISTS public.${TABLES.CUSTOMERS} ADD COLUMN IF NOT EXISTS crates_balance int DEFAULT 0;
ALTER TABLE IF EXISTS public.${TABLES.SALES} ADD COLUMN IF NOT EXISTS crates_in int DEFAULT 0;
ALTER TABLE IF EXISTS public.${TABLES.SALES} ADD COLUMN IF NOT EXISTS crates_out int DEFAULT 0;

-- 3. HABILITAR RLS E POLÍTICAS
ALTER TABLE public.${TABLES.CUSTOMER_PAYMENTS} ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Irrestrito Autenticado Payments" ON public.${TABLES.CUSTOMER_PAYMENTS};
CREATE POLICY "Acesso Irrestrito Autenticado Payments" ON public.${TABLES.CUSTOMER_PAYMENTS} FOR ALL TO authenticated USING (true);

-- 4. ATUALIZAR CAIXA DE ESQUEMA (Resolve erro de Cache do esquema)
NOTIFY pgrst, 'reload schema';

-- 5. RECRIAR FUNÇÃO RPC PARA VENDAS COMPLETA
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item jsonb;
    cust_id uuid;
    c_in int;
    c_out int;
BEGIN
    cust_id := NULL;
    IF (sale_data->>'customerId') IS NOT NULL AND (sale_data->>'customerId') != '' AND (sale_data->>'customerId') != 'null' THEN
        cust_id := (sale_data->>'customerId')::uuid;
    END IF;

    c_in := COALESCE((sale_data->>'cratesIn')::int, 0);
    c_out := COALESCE((sale_data->>'cratesOut')::int, 0);

    INSERT INTO public.${TABLES.SALES} (
        date, customer_id, customer_name, seller_id, seller_name, 
        items, total_amount, global_discount, global_surcharge, 
        payment_method, due_date, status, crates_in, crates_out
    )
    VALUES (
        (sale_data->>'date')::timestamptz,
        cust_id,
        COALESCE(sale_data->>'customerName', 'Cliente Balcão'),
        (sale_data->>'sellerId')::uuid,
        sale_data->>'sellerName',
        (sale_data->'items')::jsonb,
        (sale_data->>'totalAmount')::numeric,
        COALESCE((sale_data->>'globalDiscount')::numeric, 0),
        COALESCE((sale_data->>'globalSurcharge')::numeric, 0),
        sale_data->>'paymentMethod',
        (CASE WHEN sale_data->>'dueDate' IS NULL OR sale_data->>'dueDate' = '' THEN NULL ELSE (sale_data->>'dueDate')::date END),
        COALESCE(sale_data->>'status', 'PAID'),
        c_in,
        c_out
    );

    -- ATUALIZAR SALDO DE CAIXAS DO CLIENTE SE HOUVER MOVIMENTACAO
    IF cust_id IS NOT NULL AND (c_in > 0 OR c_out > 0) THEN
        UPDATE public.${TABLES.CUSTOMERS}
        SET crates_balance = COALESCE(crates_balance, 0) + c_out - c_in
        WHERE id = cust_id;
    END IF;

    FOR item IN SELECT * FROM jsonb_array_elements(sale_data->'items')
    LOOP
        IF (item->>'productId') != 'AVULSO' THEN
            UPDATE public.${TABLES.PRODUCTS}
            SET stock = stock - (item->>'quantity')::int
            WHERE id = (item->>'productId')::uuid;
        END IF;
    END LOOP;
END;
$$;
    `.trim();
  },

  getSettings: async (): Promise<SystemSettings> => {
    const { data, error } = await supabase.from(TABLES.SETTINGS).select('*').single();
    if (error || !data) return { id: 'default', app_name: 'A.M ABACAXI', maintenance_mode: false, total_crates: 0 };
    return { ...data, total_crates: safeNumber(data.total_crates) };
  },

  saveSettings: async (settings: SystemSettings) => {
    const { error } = await supabase.from(TABLES.SETTINGS).upsert(settings);
    if (error) throw error;
  },

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from(TABLES.USERS).select('*');
    if (error) return [];
    return data || [];
  },

  saveUser: async (user: User) => {
    const { error } = await supabase.from(TABLES.USERS).upsert({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      password_hash: user.password_hash
    });
    if (error) throw error;
  },

  deleteUser: async (id: string) => {
    const { error } = await supabase.from(TABLES.USERS).delete().eq('id', id);
    if (error) throw error;
  },

  getProducts: async (): Promise<Product[]> => {
    const { data, error } = await supabase.from(TABLES.PRODUCTS).select('*');
    if (error) return [];
    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      price: safeNumber(p.price),
      costPrice: safeNumber(p.cost_price || p.costPrice),
      stock: safeNumber(p.stock),
      category: p.category,
      imageUrl: p.image_url || p.imageUrl
    }));
  },

  saveProduct: async (product: Partial<Product>) => {
    const payload: any = {
      ...product,
      cost_price: product.costPrice,
      image_url: product.imageUrl,
    };
    if ('costPrice' in payload) delete payload.costPrice;
    if ('imageUrl' in payload) delete payload.imageUrl;

    const { error } = await supabase.from(TABLES.PRODUCTS).upsert(payload);
    if (error) throw error;
  },

  deleteProduct: async (id: string) => {
    const { error } = await supabase.from(TABLES.PRODUCTS).delete().eq('id', id);
    if (error) throw error;
  },

  getCustomers: async (): Promise<Customer[]> => {
    const { data, error } = await supabase.from(TABLES.CUSTOMERS).select('*');
    if (error) return [];
    return data || [];
  },

  saveCustomer: async (customer: Partial<Customer>) => {
    const { error } = await supabase.from(TABLES.CUSTOMERS).upsert(customer);
    if (error) throw error;
  },

  getSales: async (): Promise<Sale[]> => {
    const { data, error } = await supabase.from(TABLES.SALES).select('*');
    if (error) return [];

    return (data || []).map(s => ({
      id: s.id,
      date: s.date,
      customerId: s.customer_id,
      customerName: s.customer_name,
      sellerId: s.seller_id,
      sellerName: s.seller_name,
      items: s.items || [],
      totalAmount: safeNumber(s.total_amount),
      globalDiscount: safeNumber(s.global_discount),
      globalSurcharge: safeNumber(s.global_surcharge),
      paymentMethod: s.payment_method,
      dueDate: s.due_date,
      status: s.status,
      cratesIn: safeNumber(s.crates_in),
      cratesOut: safeNumber(s.crates_out)
    }));
  },

  saveSale: async (sale: Omit<Sale, 'id'>) => {
    const normalizedSale = {
      ...sale,
      customerId: (!sale.customerId || sale.customerId === '' || sale.customerId === 'null') ? null : sale.customerId,
      customerName: sale.customerName || 'Cliente Balcão',
      globalDiscount: sale.globalDiscount || 0,
      globalSurcharge: sale.globalSurcharge || 0,
      cratesIn: sale.cratesIn || 0,
      cratesOut: sale.cratesOut || 0
    };

    const { error: rpcError } = await supabase.rpc('process_sale', { sale_data: normalizedSale });

    if (rpcError) {
      const { error: insertError } = await supabase.from(TABLES.SALES).insert([{
        date: normalizedSale.date,
        customer_id: normalizedSale.customerId,
        customer_name: normalizedSale.customerName,
        seller_id: normalizedSale.sellerId,
        seller_name: normalizedSale.sellerName,
        items: normalizedSale.items,
        total_amount: normalizedSale.totalAmount,
        global_discount: normalizedSale.globalDiscount,
        global_surcharge: normalizedSale.globalSurcharge,
        payment_method: normalizedSale.paymentMethod,
        due_date: normalizedSale.dueDate || null,
        status: normalizedSale.status
      }]);

      if (insertError) throw insertError;

      for (const item of normalizedSale.items) {
        if (item.productId !== 'AVULSO') {
          const { data: prod } = await supabase.from(TABLES.PRODUCTS).select('stock').eq('id', item.productId).single();
          if (prod) {
            await supabase.from(TABLES.PRODUCTS).update({ stock: prod.stock - item.quantity }).eq('id', item.productId);
          }
        }
      }
    }
  },

  updateSale: async (sale: Sale) => {
    const payload = {
      date: sale.date,
      customer_id: (!sale.customerId || sale.customerId === '' || sale.customerId === 'null') ? null : sale.customerId,
      customer_name: sale.customerName,
      seller_id: sale.sellerId,
      seller_name: sale.sellerName,
      items: sale.items,
      total_amount: sale.totalAmount,
      global_discount: sale.globalDiscount,
      global_surcharge: sale.globalSurcharge,
      payment_method: sale.paymentMethod,
      due_date: sale.dueDate || null,
      status: sale.status
    };
    const { error } = await supabase.from(TABLES.SALES).update(payload).eq('id', sale.id);
    if (error) throw error;
  },

  markSaleAsPaid: async (id: string) => {
    const { error } = await supabase.from(TABLES.SALES).update({ status: 'PAID' }).eq('id', id);
    if (error) throw error;
  },

  cancelSale: async (id: string) => {
    const { data: sale, error: getError } = await supabase.from(TABLES.SALES).select('*').eq('id', id).single();
    if (getError || !sale) throw getError || new Error('Venda não encontrada');
    if (sale.status !== 'CANCELLED') {
      const { error: updateError } = await supabase.from(TABLES.SALES).update({ status: 'CANCELLED' }).eq('id', id);
      if (updateError) throw updateError;
      for (const item of (sale.items as SaleItem[])) {
        if (item.productId !== 'AVULSO') {
          const { data: p } = await supabase.from(TABLES.PRODUCTS).select('stock').eq('id', item.productId).single();
          if (p) {
            await supabase.from(TABLES.PRODUCTS).update({ stock: p.stock + item.quantity }).eq('id', item.productId);
          }
        }
      }
    }
  },

  getCustomerPayments: async (): Promise<CustomerPayment[]> => {
    const { data, error } = await supabase.from(TABLES.CUSTOMER_PAYMENTS).select('*');
    if (error) return [];
    return (data || []).map(p => ({
      id: p.id,
      date: p.date,
      customerId: p.customer_id,
      customerName: p.customer_name,
      amount: safeNumber(p.amount),
      method: p.method,
      notes: p.notes
    }));
  },

  saveCustomerPayment: async (payment: Omit<CustomerPayment, 'id'>) => {
    const payload = {
      date: payment.date,
      customer_id: payment.customerId,
      customer_name: payment.customerName,
      amount: payment.amount,
      method: payment.method,
      notes: payment.notes
    };
    const { error } = await supabase.from(TABLES.CUSTOMER_PAYMENTS).insert([payload]);
    if (error) throw error;
  },

  deleteCustomerPayment: async (id: string) => {
    const { error } = await supabase.from(TABLES.CUSTOMER_PAYMENTS).delete().eq('id', id);
    if (error) throw error;
  },

  getDamagedGoods: async (): Promise<DamagedGood[]> => {
    const { data, error } = await supabase.from(TABLES.DAMAGED).select('*');
    if (error) return [];
    return (data || []).map(dg => ({
      id: dg.id,
      date: dg.date,
      productId: dg.product_id || dg.productId,
      productName: dg.product_name || dg.productName,
      quantity: safeNumber(dg.quantity),
      reason: dg.reason
    }));
  },

  saveDamagedGood: async (dg: Omit<DamagedGood, 'id'>) => {
    const payload: any = {
      date: dg.date,
      product_id: dg.productId,
      product_name: dg.productName,
      quantity: dg.quantity,
      reason: dg.reason
    };
    const { error } = await supabase.from(TABLES.DAMAGED).insert([payload]);
    if (error) throw error;
    const { data: p } = await supabase.from(TABLES.PRODUCTS).select('stock').eq('id', dg.productId).single();
    if (p) {
      await supabase.from(TABLES.PRODUCTS).update({ stock: Math.max(0, p.stock - dg.quantity) }).eq('id', dg.productId);
    }
  },

  getExpenses: async (): Promise<Expense[]> => {
    const { data, error } = await supabase.from(TABLES.EXPENSES).select('*');
    if (error) return [];
    return (data || []).map(e => ({
      ...e,
      amount: safeNumber(e.amount)
    }));
  },

  saveExpense: async (expense: Omit<Expense, 'id'> | Expense) => {
    const { error } = await supabase.from(TABLES.EXPENSES).upsert(expense);
    if (error) throw error;
  },

  deleteExpense: async (id: string) => {
    const { error } = await supabase.from(TABLES.EXPENSES).delete().eq('id', id);
    if (error) throw error;
  },

  getPaymentMethods: async (): Promise<any[]> => {
    const { data, error } = await supabase.from(TABLES.PAYMENTS).select('*');
    if (error) return [];
    return data || [];
  },

  savePaymentMethod: async (method: any) => {
    const { error } = await supabase.from(TABLES.PAYMENTS).upsert(method);
    if (error) throw error;
  },

  deletePaymentMethod: async (id: string) => {
    const { error } = await supabase.from(TABLES.PAYMENTS).delete().eq('id', id);
    if (error) throw error;
  }
};
