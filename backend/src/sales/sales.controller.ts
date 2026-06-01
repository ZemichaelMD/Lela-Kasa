import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { SaleStatus } from "../database";

import { SalesService } from "./sales.service";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { UpdateSaleDto } from "./dto/update-sale.dto";
import { AddPaymentDto } from "./dto/add-payment.dto";
import { CurrentShopId } from "../common/decorators/current-shop.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RequirePermission } from "../permissions/decorators/require-permission.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { toCsv } from "../reports/csv.helper";

@ApiTags("sales")
@ApiBearerAuth()
@Controller("sales")
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @ApiOperation({ summary: "List sales" })
  list(
    @CurrentShopId() shopId: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortDir") sortDir?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("customerId") customerId?: string,
    @Query("customerCode") customerCode?: string,
    @Query("status") status?: string,
    @Query("paymentAccountId") paymentAccountId?: string,
    @Query("beverageId") beverageId?: string,
    @Query("beverageCode") beverageCode?: string,
    @Query("hasCredit") hasCredit?: string,
    @Query("search") search?: string,
    @Query("createdById") createdById?: string,
  ) {
    return this.salesService.list(shopId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      sortBy: sortBy as any,
      sortDir: sortDir as any,
      dateFrom,
      dateTo,
      customerId,
      customerCode,
      status: status as SaleStatus | undefined,
      paymentAccountId,
      beverageId,
      beverageCode,
      createdById,
      hasCredit:
        hasCredit === "true" ? true : hasCredit === "false" ? false : undefined,
      search,
    });
  }

  @Get("export")
  @ApiOperation({ summary: "Export sales as CSV" })
  async export(
    @CurrentShopId() shopId: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("customerId") customerId?: string,
    @Query("status") status?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.salesService.exportSales(shopId, {
      dateFrom,
      dateTo,
      customerId,
      status: status as SaleStatus | undefined,
    });

    if (res) {
      const csv = toCsv(
        [
          "Sale ID",
          "Date",
          "Customer",
          "Status",
          "Subtotal",
          "Paid",
          "Credit",
          "Boxes Out",
          "Bottles Out",
          "Boxes Returned",
          "Bottles Returned",
          "Created By",
        ],
        data.map((s) => [
          s.id,
          s.saleDate,
          s.customerName,
          s.status,
          s.subtotalCents / 100,
          s.paidCents / 100,
          s.creditDeltaCents / 100,
          s.boxesOutDelta,
          s.bottlesOutDelta,
          s.boxesReturnedOnSale,
          s.bottlesReturnedOnSale,
          s.createdByName,
        ]),
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="sales-export.csv"`,
      );
      res.send(csv);
      return;
    }

    return data;
  }

  @Post()
  @ApiOperation({ summary: "Create a sale" })
  create(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.createSale(shopId, user.id, dto);
  }

  @Patch(":id")
  @RequirePermission("sales:edit")
  @ApiOperation({ summary: "Full-replace update a sale" })
  update(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateSaleDto,
  ) {
    return this.salesService.updateSale(shopId, user.id, id, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get sale by id" })
  findOne(@CurrentShopId() shopId: string, @Param("id") id: string) {
    return this.salesService.findOne(shopId, id);
  }

  @Post(":id/void")
  @Roles("OWNER")
  @ApiOperation({ summary: "Void a sale (Owner only)" })
  voidSale(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: { reason: string },
  ) {
    return this.salesService.voidSale(shopId, user.id, id, body.reason);
  }

  @Post(":id/payments")
  @ApiOperation({ summary: "Add a payment to a sale" })
  addPayment(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AddPaymentDto,
  ) {
    return this.salesService.addPayment(shopId, user.id, id, dto);
  }

  @Delete(":id/payments/:paymentId")
  @Roles("OWNER")
  @RequirePermission("payments:void")
  @ApiOperation({ summary: "Void a payment on a sale (Owner only)" })
  voidPayment(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("paymentId") paymentId: string,
    @Body() body: { reason?: string },
  ) {
    return this.salesService.voidPayment(
      shopId,
      user.id,
      id,
      paymentId,
      body.reason,
    );
  }
}
