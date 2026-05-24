import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { ReportsService } from './reports.service';
import { toCsv } from './csv.helper';
import { CurrentShopId } from '../common/decorators/current-shop.decorator';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private sendCsv(res: Response, filename: string, csv: string) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ── sales-summary ──────────────────────────────────────────────────────────

  @Get('sales-summary')
  @RequirePermission('reports:view')
  @ApiOperation({ summary: 'Sales summary report' })
  async salesSummary(
    @CurrentShopId() shopId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.salesSummary(shopId, { from, to });

    if (format === 'csv' && res) {
      const rows: (string | number)[][] = data.byDay.map((d) => [d.date, d.amountCents, d.count]);
      const csv = toCsv(['date', 'amountCents', 'count'], rows);
      this.sendCsv(res, 'sales-summary.csv', csv);
      return;
    }

    return data;
  }

  // ── sales-by-customer ──────────────────────────────────────────────────────

  @Get('sales-by-customer')
  @ApiOperation({ summary: 'Sales by customer report' })
  async salesByCustomer(
    @CurrentShopId() shopId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.salesByCustomer(shopId, { from, to });

    if (format === 'csv' && res) {
      const rows = data.map((r) => [
        r.customerId,
        r.customerName,
        r.salesCount,
        r.subtotalCents,
        r.paidCents,
        r.creditCents,
        r.outstandingBoxes,
        r.outstandingBottles,
      ]);
      const csv = toCsv(
        [
          'customerId',
          'customerName',
          'salesCount',
          'subtotalCents',
          'paidCents',
          'creditCents',
          'outstandingBoxes',
          'outstandingBottles',
        ],
        rows,
      );
      this.sendCsv(res, 'sales-by-customer.csv', csv);
      return;
    }

    return data;
  }

  // ── sales-by-beverage ──────────────────────────────────────────────────────

  @Get('sales-by-beverage')
  @ApiOperation({ summary: 'Sales by beverage report' })
  async salesByBeverage(
    @CurrentShopId() shopId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.salesByBeverage(shopId, { from, to });

    if (format === 'csv' && res) {
      const rows = data.map((r) => [
        r.beverageId,
        r.beverageName,
        r.boxesSold,
        r.bottlesSold,
        r.totalAmountCents,
      ]);
      const csv = toCsv(
        ['beverageId', 'beverageName', 'boxesSold', 'bottlesSold', 'totalAmountCents'],
        rows,
      );
      this.sendCsv(res, 'sales-by-beverage.csv', csv);
      return;
    }

    return data;
  }

  // ── sales-by-payment-account ───────────────────────────────────────────────

  @Get('sales-by-payment-account')
  @ApiOperation({ summary: 'Sales by payment account report' })
  async salesByPaymentAccount(
    @CurrentShopId() shopId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.salesByPaymentAccount(shopId, { from, to });

    if (format === 'csv' && res) {
      const rows = data.map((r) => [
        r.accountId,
        r.accountName,
        String(r.kind ?? ''),
        r.totalAmountCents,
        r.count,
      ]);
      const csv = toCsv(
        ['accountId', 'accountName', 'kind', 'totalAmountCents', 'count'],
        rows,
      );
      this.sendCsv(res, 'sales-by-payment-account.csv', csv);
      return;
    }

    return data;
  }

  // ── credit-aging ───────────────────────────────────────────────────────────

  @Get('credit-aging')
  @ApiOperation({ summary: 'Credit aging report' })
  async creditAging(
    @CurrentShopId() shopId: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.creditAging(shopId);

    if (format === 'csv' && res) {
      const rows = data.map((r) => [
        r.customerId,
        r.customerName,
        r.creditBalanceCents,
        r.ageBucket,
      ]);
      const csv = toCsv(['customerId', 'customerName', 'creditBalanceCents', 'ageBucket'], rows);
      this.sendCsv(res, 'credit-aging.csv', csv);
      return;
    }

    return data;
  }

  // ── container-debt ─────────────────────────────────────────────────────────

  @Get('container-debt')
  @ApiOperation({ summary: 'Container debt report' })
  async containerDebt(
    @CurrentShopId() shopId: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.containerDebt(shopId);

    if (format === 'csv' && res) {
      const rows = data.map((r) => [
        r.customerId,
        r.customerName,
        r.outstandingBoxes,
        r.outstandingBottles,
      ]);
      const csv = toCsv(
        ['customerId', 'customerName', 'outstandingBoxes', 'outstandingBottles'],
        rows,
      );
      this.sendCsv(res, 'container-debt.csv', csv);
      return;
    }

    return data;
  }

  // ── stock-on-hand ──────────────────────────────────────────────────────────

  @Get('stock-on-hand')
  @ApiOperation({ summary: 'Stock on hand report' })
  async stockOnHand(
    @CurrentShopId() shopId: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.stockOnHand(shopId);

    if (format === 'csv' && res) {
      const rows = data.map((r) => [
        r.beverageId,
        r.beverageName,
        r.brand ?? '',
        r.stockBottles,
        r.stockBoxes,
        r.looseBottles,
        r.isLowStock ? 'yes' : 'no',
      ]);
      const csv = toCsv(
        ['beverageId', 'beverageName', 'brand', 'stockBottles', 'stockBoxes', 'looseBottles', 'isLowStock'],
        rows,
      );
      this.sendCsv(res, 'stock-on-hand.csv', csv);
      return;
    }

    return data;
  }

  // ── low-stock ──────────────────────────────────────────────────────────────

  @Get('low-stock')
  @ApiOperation({ summary: 'Low stock report' })
  async lowStock(
    @CurrentShopId() shopId: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.lowStock(shopId);

    if (format === 'csv' && res) {
      const rows = data.map((r) => [
        r.beverageId,
        r.beverageName,
        r.brand ?? '',
        r.stockBottles,
        r.stockBoxes,
        r.looseBottles,
      ]);
      const csv = toCsv(
        ['beverageId', 'beverageName', 'brand', 'stockBottles', 'stockBoxes', 'looseBottles'],
        rows,
      );
      this.sendCsv(res, 'low-stock.csv', csv);
      return;
    }

    return data;
  }

  // ── dashboard ──────────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard overview (cached 30s)' })
  dashboard(@CurrentShopId() shopId: string) {
    return this.reportsService.dashboard(shopId);
  }
}
