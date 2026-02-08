
export enum UserRole {
  ADMIN = 'ADMIN',
  SELLER = 'SELLER'
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  password?: string;
  password_hash?: string;
}

export interface SystemSettings {
  id: string;
  app_name: string;
  maintenance_mode: boolean;
  total_crates?: number;
}

export enum PaymentMethod {
  PIX = 'PIX',
  CASH = 'DINHEIRO',
  CARD = 'CARTÃO',
  CREDIT = 'FIADO'
}

export enum ExpenseCategory {
  EMPLOYEE = 'FUNCIONÁRIO',
  FREIGHT = 'FRETE',
  LOADING = 'CARGA/DESCARGA',
  OTHER = 'OUTROS'
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  stock: number;
  category: string;
  imageUrl?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  crates_balance?: number;
}

export interface CustomerPayment {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  amount: number;
  method: string;
  notes?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  surcharge: number;
  total: number;
}

export interface Sale {
  id: string;
  date: string;
  customerId: string | null;
  customerName: string;
  sellerId: string;
  sellerName: string;
  items: SaleItem[];
  totalAmount: number;
  globalDiscount?: number;
  globalSurcharge?: number;
  paymentMethod: PaymentMethod;
  dueDate?: string;
  status: 'PAID' | 'PENDING' | 'CANCELLED';
  cratesIn?: number;
  cratesOut?: number;
}

export interface DamagedGood {
  id: string;
  date: string;
  productId: string;
  productName: string;
  quantity: number;
  reason: string;
}
