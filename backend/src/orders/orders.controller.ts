import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentShopId } from "../common/decorators/current-shop.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RequirePermission } from "../permissions/decorators/require-permission.decorator";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { RejectOrderDto } from "./dto/reject-order.dto";
import type { AuthenticatedUser } from "../common/types/authenticated-user";

@ApiTags("Orders")
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ── Shop-facing ─────────────────────────────────────────────────────────────

  @Get("shop")
  @ApiBearerAuth()
  @ApiOperation({ summary: "List orders for the current shop" })
  list(
    @CurrentShopId() shopId: string,
    @Query("status") status?: string,
    @Query("customerId") customerId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.ordersService.list(shopId, {
      status,
      customerId,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get("shop/pending/count")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Pending orders count for notification bell" })
  pendingCount(@CurrentShopId() shopId: string) {
    return this.ordersService
      .getPendingCount(shopId)
      .then((count) => ({ count }));
  }

  @Get("shop/pending")
  @ApiBearerAuth()
  @ApiOperation({ summary: "List pending orders" })
  pending(@CurrentShopId() shopId: string) {
    return this.ordersService.getPending(shopId);
  }

  @Post(":id/confirm")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Confirm order — creates a Sale" })
  confirm(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.ordersService.confirm(id, shopId, user.id);
  }

  @Post(":id/reject")
  @ApiBearerAuth()
  @Roles("OWNER")
  @ApiOperation({ summary: "Reject order" })
  reject(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: RejectOrderDto,
  ) {
    return this.ordersService.reject(id, shopId, user.id, dto.reason);
  }

  // ── Customer-facing ─────────────────────────────────────────────────────────

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create order (customer or staff)" })
  create(@Body() dto: CreateOrderDto, @CurrentShopId() shopId: string) {
    return this.ordersService.create(shopId, dto);
  }

  @Get("mine")
  @ApiBearerAuth()
  @ApiOperation({ summary: "List orders for the authenticated customer" })
  listMine(
    @Req() req: any,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const customerId = (req as any).user?.sub;
    if (!customerId) throw new Error("Unauthorized");
    return this.ordersService.listForCustomer(
      customerId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Post(":id/cancel")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cancel own pending order" })
  cancel(@Param("id") id: string, @Req() req: Request) {
    const customerId = (req as any).user?.sub;
    if (!customerId) throw new Error("Unauthorized");
    return this.ordersService.cancel(id, customerId);
  }

  @Get(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get order by id" })
  findOne(@Param("id") id: string) {
    return this.ordersService.findOne(id);
  }
}
