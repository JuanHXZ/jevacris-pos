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
  debtId?: string;
  debtPaymentId?: string;
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

export type DebtStatus = 'pending' | 'partial' | 'paid';

export interface DebtItem {
  id: string;
  debtId: string;
  productId: string;
  productName: string;
  productType: ProductType;
  unit: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
  profit: number;
  cashRegisterId: string;
  createdAt: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paidAt: string;
  cashSessionId?: string;
  generatedSaleId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface Debt {
  id: string;
  folio: string;
  debtorName: string;
  debtorPhone?: string;
  totalAmount: number;
  totalProfit: number;
  paidAmount: number;
  remainingAmount: number;
  status: DebtStatus;
  dueDate?: string; // YYYY-MM-DD
  notes?: string;
  cashSessionId?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
  items?: DebtItem[];
  payments?: DebtPayment[];
}

export interface DebtWithDetails extends Debt {
  items: DebtItem[];
  payments: DebtPayment[];
  isOverdue: boolean;
  daysUntilDue: number | null;
}

export interface DebtsKpiSummary {
  totalReceivable: number;
  activeCount: number;
  collectedThisMonth: number;
  settledThisMonthCount: number;
  overdueCount: number;
  upcomingDueCount: number;
  recoveryRate: number;
}

export interface DebtorQuickFilter {
  debtorName: string;
  debtorPhone?: string;
  activeTicketsCount: number;
  totalTicketsCount: number;
  totalPendingAmount: number;
}

export interface DailySummary {
  totalTransactions: number;
  totalSales: number;
  cashSales: number;
  transferSales: number;
  physicalProfit: number;
  externalEarnings: number;
  totalProfit: number;
  /** Valor total de mercancía/servicios entregados en fiado hoy (control de salida/gasto temporal) */
  debtsGivenAmount?: number;
  /** Cantidad de tickets de fiado entregados en el día */
  debtsGivenCount?: number;
  /** Saldo pendiente actual de los fiados creados en el día */
  debtsPendingFromDay?: number;
  /** Monto recaudado en el día por abonos o liquidación de fiados (ya incluido en totalSales) */
  debtPaymentsCollected?: number;
  /** Cartera total pendiente acumulada del negocio */
  totalActiveReceivables?: number;
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

export type ReportPreset = '24h' | '3d' | '7d' | '30d' | 'custom';
export type ReportExportFormat = 'excel' | 'pdf';

export interface ReportDateRange {
  preset: ReportPreset;
  startIso: string;
  endIso: string;
  startDateStr: string;
  endDateStr: string;
  label: string;
}

export interface DailyBreakdownRow {
  dateStr: string;
  totalTransactions: number;
  cashSales: number;
  transferSales: number;
  totalSales: number;
  physicalProfit: number;
  externalEarnings: number;
  totalProfit: number;
  debtsGivenAmount?: number;
  debtPaymentsCollected?: number;
}

export interface TopProductRow {
  productId: string;
  productName: string;
  productType: ProductType;
  cashRegisterName: string;
  quantitySold: number;
  totalSales: number;
  totalProfit: number;
}

export interface EnrichedPeriodSale extends Sale {
  items: SaleItem[];
  registerNamesById: Record<string, string>;
}

export interface PeriodSummary extends DailySummary {
  expensesTotal: number;
  netBalance: number;
  debtsGivenAmount: number;
  debtsGivenCount: number;
  debtsPendingFromPeriod: number;
  debtPaymentsCollected: number;
  totalActiveReceivables: number;
}

export interface PeriodReportData {
  range: ReportDateRange;
  generatedAt: string;
  summary: PeriodSummary;
  dailyBreakdown: DailyBreakdownRow[];
  salesWithItems: EnrichedPeriodSale[];
  topProducts: TopProductRow[];
  externalEarningsList: ExternalEarning[];
  cashSessions: CashSession[];
  expenses: Expense[];
  cashRegisterSummaries: CashRegisterSummary[];
  debtsInPeriod?: DebtWithDetails[];
  activeDebts?: DebtWithDetails[];
  debtPaymentsInPeriod?: Array<DebtPayment & { debtorName: string; folio: string }>;
}
