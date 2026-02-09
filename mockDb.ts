import { User, Product, Customer, Sale, UserRole, DamagedGood, SystemSettings, SaleItem, Expense, CustomerPayment } from './types';

// Simulando delay de rede para realismo (opcional, pode ser removido para velocidade instantânea)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const STORAGE_KEYS = {
    USERS: 'nikeflow_local_users',
    PRODUCTS: 'nikeflow_local_products',
    CUSTOMERS: 'nikeflow_local_customers',
    SALES: 'nikeflow_local_sales',
    DAMAGED: 'nikeflow_local_damaged',
    PAYMENTS: 'nikeflow_local_payment_methods',
    SETTINGS: 'nikeflow_local_settings',
    EXPENSES: 'nikeflow_local_expenses',
    CUSTOMER_PAYMENTS: 'nikeflow_local_customer_payments',
    SESSION: 'nikeflow_local_session'
};

// Helper para ler/escrever no LocalStorage
const getStorage = <T>(key: string, defaultValue: T): T => {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    try {
        return JSON.parse(stored);
    } catch (e) {
        return defaultValue;
    }
};

const setStorage = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
};

// Inicializa dados padrão se vazio
const initializeDefaults = () => {
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    if (users.length === 0) {
        const adminUser: User = {
            id: 'master-admin-local',
            email: 'admin@sistema.com',
            name: 'Administrador Master',
            username: 'admin',
            role: UserRole.ADMIN,
            password_hash: 'admin', // Em produção seria hash real, aqui é simulação
            created_at: new Date().toISOString()
        };
        setStorage(STORAGE_KEYS.USERS, [adminUser]);
    }

    const settings = getStorage(STORAGE_KEYS.SETTINGS, null);
    if (!settings) {
        setStorage(STORAGE_KEYS.SETTINGS, { id: 'default', app_name: 'A.M ABACAXI', maintenance_mode: false, total_crates: 0 });
    }
};

initializeDefaults();

// Mock do Supabase Client
export const mockSupabase = {
    auth: {
        signInWithPassword: async ({ email, password }: any) => {
            await delay(500);
            const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
            // Admin backdoor hardcoded + check na lista de users
            if ((email === 'admin' && password === 'admin') ||
                users.find(u => u.email === email && (u.password_hash === password || password === 'admin'))) { // Senha simplificada para teste

                const user = users.find(u => u.email === email) || {
                    id: 'master-admin-local',
                    email: 'admin@sistema.com',
                    role: UserRole.ADMIN,
                    name: 'Admin Local',
                    username: 'admin'
                };

                const session = {
                    access_token: 'mock-token-' + Date.now(),
                    token_type: 'bearer',
                    expires_in: 3600,
                    refresh_token: 'mock-refresh-' + Date.now(),
                    user: { id: user.id, email: user.email, user_metadata: { ...user } }
                };

                setStorage(STORAGE_KEYS.SESSION, session);
                return { data: { user: session.user, session }, error: null };
            }
            return { data: { user: null, session: null }, error: { message: 'Credenciais inválidas' } };
        },
        signOut: async () => {
            await delay(200);
            localStorage.removeItem(STORAGE_KEYS.SESSION);
            return { error: null };
        },
        getSession: async () => {
            const session = getStorage(STORAGE_KEYS.SESSION, null);
            if (session) return { data: { session }, error: null };
            return { data: { session: null }, error: null };
        },
        getUser: async () => {
            const session = getStorage<any>(STORAGE_KEYS.SESSION, null);
            if (session) return { data: { user: session.user }, error: null };
            return { data: { user: null }, error: null };
        },
        onAuthStateChange: (callback: any) => {
            // Simples mock que não faz nada real, pois não temos eventos de storage listener aqui
            // Se quisesse ser muito reativo, usaria window.addEventListener('storage', ...)
            const session = getStorage(STORAGE_KEYS.SESSION, null);
            callback('INITIAL_SESSION', session);
            return { data: { subscription: { unsubscribe: () => { } } } };
        }
    },
    // Mock Genérico para consultas (usado em alguns `useEffect` diretos no código se houver)
    from: (table: string) => {
        const getTableData = () => {
            switch (table) {
                case 'nikeflow_users': return getStorage(STORAGE_KEYS.USERS, []);
                case 'nikeflow_products': return getStorage(STORAGE_KEYS.PRODUCTS, []);
                case 'nikeflow_customers': return getStorage(STORAGE_KEYS.CUSTOMERS, []);
                case 'nikeflow_sales': return getStorage(STORAGE_KEYS.SALES, []);
                case 'nikeflow_settings': return getStorage(STORAGE_KEYS.SETTINGS, []);
                // ... outros
                default: return [];
            }
        };

        return {
            select: (columns: string) => ({
                eq: (col: string, val: any) => {
                    const data = getTableData();
                    // @ts-ignore
                    const filtered = data.filter(item => item[col] === val);
                    return {
                        single: async () => ({ data: filtered[0] || null, error: null }),
                        async: async () => ({ data: filtered, error: null }), // compatibilidade
                        then: (cb: any) => cb({ data: filtered, error: null }) // promise-like
                    }
                },
                single: async () => {
                    // @ts-ignore
                    const data = getTableData();
                    return { data: data[0] || null, error: null };
                },
                then: (cb: any) => cb({ data: getTableData(), error: null })
            }),
            insert: async (data: any[]) => {
                // Implementação básica de insert direto via `supabase.from` se for usado fora do DB object
                // Mas o app usa principalmente o DB object, então isso é fallback
                return { data: null, error: null };
            },
            update: (updates: any) => ({
                eq: async (col: string, val: any) => {
                    return { data: null, error: null };
                }
            }),
            delete: () => ({
                eq: async (col: string, val: any) => {
                    return { data: null, error: null };
                }
            }),
            upsert: async (data: any) => {
                return { data: null, error: null };
            }
        };
    },
    rpc: async (fn: string, args: any) => {
        console.warn(`RPC mock chamado: ${fn}`, args);
        // Fallback para simular erro e forçar lógica client-side se existir
        return { data: null, error: { message: 'RPC not implemented in mock' } };
    }
};


// Mock DB Object Implementation
export const MockDB = {
    getSecuritySQL: () => "-- MOCK DB: No SQL scripts needed",

    getSettings: async (): Promise<SystemSettings> => {
        await delay(100);
        const settings = getStorage<SystemSettings>(STORAGE_KEYS.SETTINGS, { id: 'default', app_name: 'A.M ABACAXI', maintenance_mode: false, total_crates: 0 });
        // Garante segurança númerica
        return {
            ...settings,
            total_crates: Number(settings.total_crates || 0)
        };
    },

    saveSettings: async (settings: SystemSettings) => {
        await delay(200);
        setStorage(STORAGE_KEYS.SETTINGS, settings);
    },

    getUsers: async (): Promise<User[]> => {
        await delay(200);
        return getStorage<User[]>(STORAGE_KEYS.USERS, []);
    },

    saveUser: async (user: User) => {
        await delay(200);
        const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
        const index = users.findIndex(u => u.id === user.id);
        if (index >= 0) {
            users[index] = user;
        } else {
            users.push(user);
        }
        setStorage(STORAGE_KEYS.USERS, users);
    },

    deleteUser: async (id: string) => {
        await delay(200);
        let users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
        users = users.filter(u => u.id !== id);
        setStorage(STORAGE_KEYS.USERS, users);
    },

    getProducts: async (): Promise<Product[]> => {
        await delay(200);
        return getStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    },

    saveProduct: async (product: Partial<Product>) => {
        await delay(200);
        const products = getStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);
        const id = product.id || crypto.randomUUID();
        const newProduct = { ...product, id } as Product;

        const index = products.findIndex(p => p.id === id);
        if (index >= 0) {
            // Merge updates
            products[index] = { ...products[index], ...product } as Product;
        } else {
            products.push(newProduct);
        }
        setStorage(STORAGE_KEYS.PRODUCTS, products);
    },

    deleteProduct: async (id: string) => {
        await delay(200);
        let products = getStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);
        products = products.filter(p => p.id !== id);
        setStorage(STORAGE_KEYS.PRODUCTS, products);
    },

    getCustomers: async (): Promise<Customer[]> => {
        await delay(200);
        return getStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    },

    saveCustomer: async (customer: Partial<Customer>) => {
        await delay(200);
        const customers = getStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
        const id = customer.id || crypto.randomUUID();
        const index = customers.findIndex(c => c.id === id);
        if (index >= 0) {
            customers[index] = { ...customers[index], ...customer } as Customer;
        } else {
            customers.push({ ...customer, id } as Customer);
        }
        setStorage(STORAGE_KEYS.CUSTOMERS, customers);
    },

    getSales: async (): Promise<Sale[]> => {
        await delay(200);
        return getStorage<Sale[]>(STORAGE_KEYS.SALES, []);
    },

    saveSale: async (sale: Omit<Sale, 'id'>) => {
        await delay(300);
        const sales = getStorage<Sale[]>(STORAGE_KEYS.SALES, []);
        const newSale = {
            ...sale,
            id: crypto.randomUUID(),
            // Garante datas como string ISO se necessario, mas JS object já funciona
        };
        sales.push(newSale as Sale);
        setStorage(STORAGE_KEYS.SALES, sales);

        // Atualizar Estoque
        const products = getStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);
        for (const item of sale.items) {
            if (item.productId !== 'AVULSO') {
                const prodIndex = products.findIndex(p => p.id === item.productId);
                if (prodIndex >= 0) {
                    products[prodIndex].stock -= item.quantity;
                }
            }
        }
        setStorage(STORAGE_KEYS.PRODUCTS, products);

        // Atualizar Caixas
        if (sale.customerId && (sale.cratesIn > 0 || sale.cratesOut > 0)) {
            const customers = getStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
            const custIndex = customers.findIndex(c => c.id === sale.customerId);
            if (custIndex >= 0) {
                const current = Number(customers[custIndex].crates_balance || 0);
                customers[custIndex].crates_balance = current + (Number(sale.cratesOut) || 0) - (Number(sale.cratesIn) || 0);
                setStorage(STORAGE_KEYS.CUSTOMERS, customers);
            }
        }
    },

    updateSale: async (sale: Sale) => {
        await delay(200);
        const sales = getStorage<Sale[]>(STORAGE_KEYS.SALES, []);
        const index = sales.findIndex(s => s.id === sale.id);
        if (index >= 0) {
            sales[index] = sale;
            setStorage(STORAGE_KEYS.SALES, sales);
        }
    },

    markSaleAsPaid: async (id: string) => {
        await delay(100);
        const sales = getStorage<Sale[]>(STORAGE_KEYS.SALES, []);
        const index = sales.findIndex(s => s.id === id);
        if (index >= 0) {
            sales[index].status = 'PAID';
            setStorage(STORAGE_KEYS.SALES, sales);
        }
    },

    cancelSale: async (id: string) => {
        await delay(200);
        const sales = getStorage<Sale[]>(STORAGE_KEYS.SALES, []);
        const index = sales.findIndex(s => s.id === id);
        if (index < 0) throw new Error("Venda não encontrada");

        const sale = sales[index];
        if (sale.status === 'CANCELLED') return;

        sale.status = 'CANCELLED';
        setStorage(STORAGE_KEYS.SALES, sales);

        // Reverter Estoque
        const products = getStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);
        for (const item of sale.items) {
            if (item.productId !== 'AVULSO') {
                const prodIndex = products.findIndex(p => p.id === item.productId);
                if (prodIndex >= 0) {
                    products[prodIndex].stock += item.quantity;
                }
            }
        }
        setStorage(STORAGE_KEYS.PRODUCTS, products);

        // Reverter Caixas
        if (sale.customerId) {
            const customers = getStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
            const custIndex = customers.findIndex(c => c.id === sale.customerId);
            if (custIndex >= 0) {
                const current = Number(customers[custIndex].crates_balance || 0);
                customers[custIndex].crates_balance = current - (Number(sale.cratesOut) || 0) + (Number(sale.cratesIn) || 0);
                setStorage(STORAGE_KEYS.CUSTOMERS, customers);
            }
        }
    },

    getCustomerPayments: async (): Promise<CustomerPayment[]> => {
        await delay(100);
        return getStorage<CustomerPayment[]>(STORAGE_KEYS.CUSTOMER_PAYMENTS, []);
    },

    saveCustomerPayment: async (payment: Omit<CustomerPayment, 'id'>) => {
        await delay(200);
        const payments = getStorage<CustomerPayment[]>(STORAGE_KEYS.CUSTOMER_PAYMENTS, []);
        const newPayment = { ...payment, id: crypto.randomUUID() };
        payments.push(newPayment);
        setStorage(STORAGE_KEYS.CUSTOMER_PAYMENTS, payments);
    },

    deleteCustomerPayment: async (id: string) => {
        await delay(200);
        let payments = getStorage<CustomerPayment[]>(STORAGE_KEYS.CUSTOMER_PAYMENTS, []);
        payments = payments.filter(p => p.id !== id);
        setStorage(STORAGE_KEYS.CUSTOMER_PAYMENTS, payments);
    },

    getDamagedGoods: async (): Promise<DamagedGood[]> => {
        await delay(100);
        return getStorage<DamagedGood[]>(STORAGE_KEYS.DAMAGED, []);
    },

    saveDamagedGood: async (dg: Omit<DamagedGood, 'id'>) => {
        await delay(200);
        const damaged = getStorage<DamagedGood[]>(STORAGE_KEYS.DAMAGED, []);
        const newDG = { ...dg, id: crypto.randomUUID() };
        damaged.push(newDG);
        setStorage(STORAGE_KEYS.DAMAGED, damaged);

        // Baixa no estoque
        const products = getStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);
        const prodIndex = products.findIndex(p => p.id === dg.productId);
        if (prodIndex >= 0) {
            products[prodIndex].stock = Math.max(0, products[prodIndex].stock - dg.quantity);
            setStorage(STORAGE_KEYS.PRODUCTS, products);
        }
    },

    getExpenses: async (): Promise<Expense[]> => {
        await delay(100);
        return getStorage<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    },

    saveExpense: async (expense: Omit<Expense, 'id'> | Expense) => {
        await delay(200);
        const expenses = getStorage<Expense[]>(STORAGE_KEYS.EXPENSES, []);
        if ('id' in expense && expense.id) {
            const index = expenses.findIndex(e => e.id === expense.id);
            if (index >= 0) expenses[index] = expense as Expense;
            else expenses.push(expense as Expense);
        } else {
            expenses.push({ ...expense, id: crypto.randomUUID() } as Expense);
        }
        setStorage(STORAGE_KEYS.EXPENSES, expenses);
    },

    deleteExpense: async (id: string) => {
        await delay(200);
        let expenses = getStorage<Expense[]>(STORAGE_KEYS.EXPENSES, []);
        expenses = expenses.filter(e => e.id !== id);
        setStorage(STORAGE_KEYS.EXPENSES, expenses);
    },

    getPaymentMethods: async (): Promise<any[]> => {
        await delay(100);
        return getStorage<any[]>(STORAGE_KEYS.PAYMENTS, []);
    },

    savePaymentMethod: async (method: any) => {
        await delay(200);
        const methods = getStorage<any[]>(STORAGE_KEYS.PAYMENTS, []);
        const index = methods.findIndex(m => m.id === method.id);
        if (index >= 0) methods[index] = method;
        else methods.push(method);
        setStorage(STORAGE_KEYS.PAYMENTS, methods);
    },

    deletePaymentMethod: async (id: string) => {
        await delay(200);
        let methods = getStorage<any[]>(STORAGE_KEYS.PAYMENTS, []);
        methods = methods.filter(m => m.id !== id);
        setStorage(STORAGE_KEYS.PAYMENTS, methods);
    }
};
