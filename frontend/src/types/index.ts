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

export interface CategoryCreate {
  name: string;
  icon?: string;
}

export interface SubcategoryCreate {
  category_id: string;
  name: string;
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
  default_account_id: string;
  memo?: string | null;
}

// ExpensePhoto types
export interface ExpensePhoto {
  id: string;
  expense_id: string;
  file_path: string;
  thumbnail_path?: string;
  sort_order: number;
  created_at: string;
}

// Expense types
export interface Expense {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  subcategory_id: string;
  product_id?: string;
  store_id?: string;
  amount: number;
  memo?: string;
  purchase_url?: string;
  satisfaction?: boolean | null;  // true=만족, false=불만족, null=미평가
  expense_at: string;
  created_at: string;
  updated_at: string;
  photos?: ExpensePhoto[];
  // Backend returns flat field names from ExpenseWithDetails
  account_name?: string;
  category_name?: string;
  subcategory_name?: string;
  product_name?: string;
  store_name?: string;
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
  product_id: string;
  store_id?: string | null;
  amount: number;
  memo?: string | null;
  purchase_url?: string | null;
  satisfaction?: boolean | null;
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

// Store types
export interface Store {
  id: string;
  name: string;
  address?: string;
  road_address?: string;
  latitude?: number;
  longitude?: number;
  naver_place_id?: string;
  category?: string;
  phone?: string;
  sort_order: number;
  created_at: string;
}

export interface StoreCreate {
  name: string;
  address?: string | null;
  road_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  naver_place_id?: string | null;
  category?: string | null;
  phone?: string | null;
}

// 네이버 지역 검색 결과
export interface NaverPlaceItem {
  title: string;
  link: string;
  category: string;
  description: string;
  telephone: string;
  address: string;
  road_address: string;
  mapx: string;
  mapy: string;
}

export interface NaverSearchResponse {
  items: NaverPlaceItem[];
  total: number;
  start: number;
  display: number;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
