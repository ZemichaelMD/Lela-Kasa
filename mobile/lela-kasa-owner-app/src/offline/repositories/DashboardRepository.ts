import { getDatabase } from '../db/database';

export interface DashboardSummary {
  totalOutstandingCreditCents: number;
  customersWithCreditCount: number;
  outstandingBoxes: number;
  outstandingBottles: number;
  todaySalesCents: number;
}

export class DashboardRepository {
  async getSummary(shopId: string): Promise<DashboardSummary> {
    const db = await getDatabase();

    // Total Outstanding Credit
    const creditResult = await db.getFirstAsync<{ total: number, count: number }>(
      'SELECT SUM(credit_balance_cents) as total, COUNT(*) as count FROM customers WHERE shop_id = ? AND credit_balance_cents > 0',
      [shopId]
    );

    // Outstanding Containers
    const containerResult = await db.getFirstAsync<{ boxes: number, bottles: number }>(
      'SELECT SUM(outstanding_boxes) as boxes, SUM(outstanding_bottles) as bottles FROM customers WHERE shop_id = ?',
      [shopId]
    );

    // Today's Sales
    const today = new Date().toISOString().split('T')[0];
    const salesResult = await db.getFirstAsync<{ total: number }>(
      'SELECT SUM(subtotal_cents) as total FROM sales WHERE shop_id = ? AND sale_date >= ?',
      [shopId, today]
    );

    return {
      totalOutstandingCreditCents: creditResult?.total || 0,
      customersWithCreditCount: creditResult?.count || 0,
      outstandingBoxes: containerResult?.boxes || 0,
      outstandingBottles: containerResult?.bottles || 0,
      todaySalesCents: salesResult?.total || 0,
    };
  }
}

export const dashboardRepo = new DashboardRepository();
