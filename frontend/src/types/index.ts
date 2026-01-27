// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Account types
export type AccountType = 'bank' | 'credit_card' | 'prepaid' | 'other';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  balance: number;
  description?: string;
  badge_color?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AccountCreate {
  name: string;
  account_type: AccountType;
  balance?: number;
  description?: string;
  badge_color?: string;
}

// Transfer types
export interface Transfer {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  memo?: string;
  transferred_at: string;
  created_at: string;
  from_account?: Account;
  to_account?: Account;
}

export interface TransferCreate {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  memo?: string;
  transferred_at?: string;
}

// Category types
export interface Category {
  id: string;
  name: string;
  icon?: string;
  is_system: boolean;
  sort_order: number;
  created_at: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  category?: Category;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  subcategory_id: string;
  default_price?: number;
  default_account_id?: string;
  memo?: string;
  is_favorite: boolean;
  created_at: string;
  subcategory?: Subcategory;
}

export interface ProductCreate {
  name: string;
  subcategory_id: string;
  default_price?: number | null;
  default_account_id?: string | null;
  memo?: string | null;
}

// Expense types
export interface Expense {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  subcategory_id: string;
  product_id?: string;
  amount: number;
  memo?: string;
  purchase_url?: string;
  expense_at: string;
  created_at: string;
  updated_at: string;
  // Backend returns flat field names from ExpenseWithDetails
  account_name?: string;
  category_name?: string;
  subcategory_name?: string;
  product_name?: string;
  // Keep nested objects for backwards compatibility
  account?: Account;
  category?: Category;
  subcategory?: Subcategory;
  product?: Product;
}

export interface ExpenseCreate {
  account_id: string;
  category_id: string;
  subcategory_id: string;
  product_id?: string | null;
  amount: number;
  memo?: string | null;
  purchase_url?: string | null;
  expense_at?: string;
}

// Statistics types
export interface MonthlySummary {
  year: number;
  month: number;
  total_expense: number;
  expense_count: number;
  daily_average: number;
}

export interface CategorySummary {
  category_id: string;
  category_name: string;
  category_icon?: string;
  total_amount: number;
  expense_count: number;
  percentage: number;
}

export interface DailyExpense {
  date: string;
  total_amount: number;
  expense_count: number;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
