import { db } from '../db';
import { PRINCIPAL_CASH_REGISTER_ID, type CashRegister, type CashRegisterDistributionLine } from '../types';
import { createEntityId } from '../utils/ids';

const PCT_TOLERANCE = 0.01;

function assertDistributionTotals100(lines: Array<{ percentage: number }>): void {
  const sum = lines.reduce((acc, line) => acc + Number(line.percentage || 0), 0);
  if (Math.abs(sum - 100) > PCT_TOLERANCE) {
    throw new Error(`Los porcentajes deben sumar 100%. Suma actual: ${sum.toFixed(2)}%`);
  }
}

export const cashRegisterRepository = {
  async getAll(includeInactive = false): Promise<CashRegister[]> {
    const rows = await db.cashRegisters.toArray();
    const filtered = includeInactive ? rows : rows.filter((r) => r.isActive !== false);
    return filtered.sort((a, b) => Number(b.isPrincipal) - Number(a.isPrincipal) || a.name.localeCompare(b.name));
  },

  async getById(id: string): Promise<CashRegister | undefined> {
    return db.cashRegisters.get(id);
  },

  async getPrincipal(): Promise<CashRegister> {
    const principal = await db.cashRegisters.filter((r) => r.isPrincipal).first();
    if (principal) return principal;
    const fallback = await db.cashRegisters.get(PRINCIPAL_CASH_REGISTER_ID);
    if (!fallback) throw new Error('No existe la Caja Principal');
    return fallback;
  },

  async getDistribution(cashRegisterId: string): Promise<CashRegisterDistributionLine[]> {
    const lines = await db.cashRegisterDistributionLines.where('cashRegisterId').equals(cashRegisterId).toArray();
    return lines.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async create(params: {
    name: string;
    description?: string;
    lines: Array<{ label: string; percentage: number }>;
  }): Promise<CashRegister> {
    const name = params.name.trim();
    if (!name) throw new Error('El nombre de la caja es obligatorio');
    assertDistributionTotals100(params.lines);
    if (params.lines.length === 0) throw new Error('Agrega al menos un rubro de distribución');

    const now = new Date().toISOString();
    const register: CashRegister = {
      id: createEntityId('cash-reg'),
      name,
      description: params.description?.trim() || undefined,
      isPrincipal: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      synced: false
    };

    const distLines: CashRegisterDistributionLine[] = params.lines.map((line, index) => ({
      id: createEntityId('dist'),
      cashRegisterId: register.id,
      label: line.label.trim(),
      percentage: Number(line.percentage),
      sortOrder: index,
      createdAt: now,
      updatedAt: now,
      synced: false
    }));

    if (distLines.some((l) => !l.label)) {
      throw new Error('Cada rubro debe tener un nombre');
    }

    await db.transaction('rw', [db.cashRegisters, db.cashRegisterDistributionLines], async () => {
      await db.cashRegisters.add(register);
      await db.cashRegisterDistributionLines.bulkAdd(distLines);
    });

    return register;
  },

  async update(
    id: string,
    params: {
      name?: string;
      description?: string;
      isActive?: boolean;
      lines?: Array<{ label: string; percentage: number }>;
    }
  ): Promise<void> {
    const current = await db.cashRegisters.get(id);
    if (!current) throw new Error('Caja no encontrada');

    if (current.isPrincipal && params.isActive === false) {
      throw new Error('La Caja Principal no se puede desactivar');
    }

    if (params.lines) {
      assertDistributionTotals100(params.lines);
      if (params.lines.length === 0) throw new Error('Agrega al menos un rubro de distribución');
    }

    const now = new Date().toISOString();
    await db.transaction('rw', [db.cashRegisters, db.cashRegisterDistributionLines], async () => {
      await db.cashRegisters.update(id, {
        name: params.name !== undefined ? params.name.trim() : current.name,
        description: params.description !== undefined ? params.description.trim() : current.description,
        isActive: params.isActive !== undefined ? params.isActive : current.isActive,
        updatedAt: now,
        synced: false
      });

      if (params.lines) {
        const existing = await db.cashRegisterDistributionLines.where('cashRegisterId').equals(id).toArray();
        await db.cashRegisterDistributionLines.bulkDelete(existing.map((l) => l.id));
        await db.cashRegisterDistributionLines.bulkAdd(
          params.lines.map((line, index) => ({
            id: createEntityId('dist'),
            cashRegisterId: id,
            label: line.label.trim(),
            percentage: Number(line.percentage),
            sortOrder: index,
            createdAt: now,
            updatedAt: now,
            synced: false
          }))
        );
      }
    });
  },

  async delete(id: string): Promise<void> {
    const current = await db.cashRegisters.get(id);
    if (!current) throw new Error('Caja no encontrada');
    if (current.isPrincipal) throw new Error('La Caja Principal no se puede eliminar');

    const principal = await this.getPrincipal();
    const now = new Date().toISOString();

    await db.transaction(
      'rw',
      [db.cashRegisters, db.cashRegisterDistributionLines, db.products],
      async () => {
        await db.products.where('cashRegisterId').equals(id).modify({
          cashRegisterId: principal.id,
          updatedAt: now,
          synced: false
        });
        const lines = await db.cashRegisterDistributionLines.where('cashRegisterId').equals(id).toArray();
        await db.cashRegisterDistributionLines.bulkDelete(lines.map((l) => l.id));
        await db.cashRegisters.delete(id);
      }
    );
  }
};
