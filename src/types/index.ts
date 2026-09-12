export type ProductType = 'physical' | 'service';
export type PaymentMethod = 'cash' | 'transfer';
export type StockStatus = 'ok' | 'low' | 'out_of_stock';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface Product {
  id: string;
  name: string;
  categoryId?: string;
  type: ProductType;
  unit: string;
  costPrice: number;
  marginPercentage: number;
  salePrice: number;
  currentStock: number;
  minStockAlert: number;
  cashRegisterId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  productType: ProductType;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
  profit: number; // 0 for services
  cashRegisterId: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  saleDate: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  changeGiven: number;
  cashSessionId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
  items?: SaleItem[];
}

export interface StockEntry {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  entryDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface ExternalEarning {
  id: string;
  earningDate: string; // YYYY-MM-DD
  platformName: string;
  amount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  customPrice?: number; // Para servicios de monto libre si aplica
  subtotal: number;
}

export interface DailySummary {
  totalTransactions: number;
  totalSales: number;
  cashSales: number;
  transferSales: number;
  physicalProfit: number;
  externalEarnings: number;
  totalProfit: number;
}

export type CashSessionStatus = 'open' | 'closed';
export type ExpenseCategory = 'rent' | 'utilities' | 'supplies' | 'personal_draw' | 'other';

export interface CashRegister {
  id: string;
  name: string;
  description?: string;
  isPrincipal: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface CashRegisterDistributionLine {
  id: string;
  cashRegisterId: string;
  label: string;
  percentage: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface CashSession {
  id: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  closingCashCalculated?: number;
  closingCashCounted?: number;
  difference?: number;
  status: CashSessionStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface Expense {
  id: string;
  cashSessionId: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface CashRegisterSummary {
  register: CashRegister;
  totalSales: number;
  totalProfit: number;
  distribution: Array<{
    line: CashRegisterDistributionLine;
    suggestedAmount: number;
  }>;
}

export const NO_OPEN_SESSION_ERROR = 'NO_OPEN_SESSION';
export const PRINCIPAL_CASH_REGISTER_ID = 'cash-reg-principal';

export interface PinAuthState {
  isLocked: boolean;
  isPinConfigured: boolean;
  autoLockMinutes?: number;
}

export interface PinConfig {
  salt: string;
  hash: string;
  autoLockMinutes: number;
  updatedAt: string;
}
