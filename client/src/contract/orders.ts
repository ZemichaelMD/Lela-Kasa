import type { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from './enums';

export type OrderItemModifier = {
  groupName: string;
  name: string;
  priceCents: number;
};

export type OrderItem = {
  id: string;
  menuItemId: number;
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  notes?: string | null;
  modifiers: OrderItemModifier[];
  kitchenStation?: string | null;
  prepStartedAt?: string | null;
  prepDoneAt?: string | null;
};

export type OrderPayment = {
  id: string;
  method: PaymentMethod;
  amountCents: number;
  status: PaymentStatus;
  providerRef?: string | null;
  capturedAt?: string | null;
  createdAt: string;
};

export type OrderRefund = {
  id: string;
  amountCents: number;
  reason: string;
  notes?: string | null;
  processedAt?: string | null;
  initiatorId?: string | null;
  initiatorName?: string | null;
  createdAt: string;
};

export type OrderCustomer = {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export type OrderDeliveryAddress = {
  label?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  lat?: number | null;
  lng?: number | null;
};

export type OrderStatusStep = {
  status: OrderStatus;
  at: string;
  actorId?: string | null;
  actorName?: string | null;
};

export type Order = {
  id: string;
  displayId: string;
  restaurantId: number;
  restaurantName?: string | null;
  orderType: OrderType;
  status: OrderStatus;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  itemCount: number;
  items: OrderItem[];
  payments: OrderPayment[];
  refunds?: OrderRefund[];
  customer?: OrderCustomer | null;
  tableNumber?: string | null;
  deliveryAddress?: OrderDeliveryAddress | null;
  assignedDriverId?: string | null;
  assignedDriverName?: string | null;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  notes?: string | null;
  promoCode?: string | null;
  estimatedReadyAt?: string | null;
  estimatedDeliveryAt?: string | null;
  statusTimeline?: OrderStatusStep[];
  confirmedAt?: string | null;
  preparingAt?: string | null;
  readyAt?: string | null;
  outForDeliveryAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderBoardColumn = {
  status: OrderStatus;
  orders: Order[];
  total: number;
};

export type OrderBoardResult = {
  columns: OrderBoardColumn[];
  restaurantId: number;
  generatedAt: string;
};

export type KitchenOrderItem = {
  orderId: string;
  orderDisplayId: string;
  orderItemId: string;
  orderType: OrderType;
  orderCreatedAt: string;
  orderConfirmedAt?: string | null;
  itemName: string;
  quantity: number;
  modifiers: OrderItemModifier[];
  notes?: string | null;
  station: string;
  isHighPriority: boolean;
  prepStartedAt?: string | null;
  prepDoneAt?: string | null;
  slaTotalSeconds: number;
};

export type KitchenStation = {
  name: string;
  items: KitchenOrderItem[];
};

export type KitchenResult = {
  stations: KitchenStation[];
};

export type AuditEvent = {
  id: string;
  action: string;
  actorId?: string | null;
  actorName?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
};

export type OrderListQuery = {
  restaurantId?: number;
  status?: OrderStatus | OrderStatus[];
  orderType?: OrderType;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

export type OrderListResult = {
  items: Order[];
  total: number;
};

export type UpdateStatusInput = {
  status: OrderStatus;
  reason?: string;
};

export type RefundInput = {
  amountCents: number;
  reason: string;
  notes?: string;
  lineItemIds?: string[];
};

export type AssignDriverInput = {
  driverUserId: string;
};

export type AssignStaffInput = {
  role: string;
  userId: string;
};
