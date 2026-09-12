import type { CashRegister, CashRegisterDistributionLine, Product } from '../types';
import { PRINCIPAL_CASH_REGISTER_ID } from '../types';

interface CashBootstrapTables {
  cashRegisters: {
    get: (id: string) => Promise<CashRegister | undefined>;
    filter: (fn: (r: CashRegister) => boolean) => { first: () => Promise<CashRegister | undefined> };
    put: (item: CashRegister) => Promise<unknown>;
  };
  cashRegisterDistributionLines: {
    where: (key: 'cashRegisterId') => { equals: (id: string) => { count: () => Promise<number> } };
    bulkPut: (items: CashRegisterDistributionLine[]) => Promise<unknown>;
  };
  products: {
    toCollection: () => { modify: (fn: (product: Product) => void) => Promise<unknown> };
  };
}

export const PRINCIPAL_DEFAULT_LINES: Array<Omit<CashRegisterDistributionLine, 'createdAt' | 'updatedAt' | 'synced'>> = [
  { id: 'dist-principal-reinv', cashRegisterId: PRINCIPAL_CASH_REGISTER_ID, label: 'Reinversión', percentage: 60, sortOrder: 0 },
  { id: 'dist-principal-ops', cashRegisterId: PRINCIPAL_CASH_REGISTER_ID, label: 'Gastos operativos', percentage: 30, sortOrder: 1 },
  { id: 'dist-principal-save', cashRegisterId: PRINCIPAL_CASH_REGISTER_ID, label: 'Ahorro', percentage: 10, sortOrder: 2 }
];

export function buildPrincipalRegister(now: string): CashRegister {
  return {
    id: PRINCIPAL_CASH_REGISTER_ID,
    name: 'Caja Principal',
    description: 'Fondo por defecto de todos los productos',
    isPrincipal: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    synced: false
  };
}

export async function ensurePrincipalCashRegister(tables: CashBootstrapTables): Promise<void> {
  const now = new Date().toISOString();
  const existing = await tables.cashRegisters.get(PRINCIPAL_CASH_REGISTER_ID);
  if (!existing) {
    const principal = await tables.cashRegisters.filter((r) => r.isPrincipal).first();
    if (!principal) {
      await tables.cashRegisters.put(buildPrincipalRegister(now));
    }
  }

  const principalId =
    (await tables.cashRegisters.filter((r) => r.isPrincipal).first())?.id || PRINCIPAL_CASH_REGISTER_ID;

  const lineCount = await tables.cashRegisterDistributionLines.where('cashRegisterId').equals(principalId).count();
  if (lineCount === 0) {
    await tables.cashRegisterDistributionLines.bulkPut(
      PRINCIPAL_DEFAULT_LINES.map((line) => ({
        ...line,
        cashRegisterId: principalId,
        createdAt: now,
        updatedAt: now,
        synced: false
      }))
    );
  }

  await tables.products.toCollection().modify((product) => {
    if (!product.cashRegisterId) {
      product.cashRegisterId = principalId;
    }
  });
}
