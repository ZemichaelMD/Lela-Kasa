/**
 * Realtime event names and payload types for the socket.io gateway.
 * Clients subscribe to these events; the backend emits them.
 */

import { z } from 'zod';

// ── Event name constants ──────────────────────────────────────────────────────

export const REALTIME_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Notifications (user-scoped room: `user:{userId}`)
  NOTIFICATION_NEW: 'notification:new',

  // Messages (user-scoped room)
  MESSAGE_NEW: 'message:new',
  MESSAGE_READ: 'message:read',

  // Orders — Phase 2 (order-scoped room: `order:{orderId}`)
  ORDER_STATUS_CHANGED: 'order:status_changed',
  ORDER_ITEM_UPDATED: 'order:item_updated',

  // Driver location — Phase 2 (order-scoped room)
  DRIVER_LOCATION_UPDATED: 'driver:location_updated',

  // Restaurant real-time (restaurant-scoped room: `restaurant:{restaurantId}`)
  NEW_ORDER: 'restaurant:new_order',
  ORDER_UPDATED: 'restaurant:order_updated',
} as const;

export type RealtimeEventName =
  (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

// ── Payload schemas ───────────────────────────────────────────────────────────

export const NotificationEventPayloadSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  link: z.string().optional(),
  imageUrl: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type NotificationEventPayload = z.infer<
  typeof NotificationEventPayloadSchema
>;

export const OrderStatusEventPayloadSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  status: z.string(),
  updatedAt: z.string().datetime(),
});

export type OrderStatusEventPayload = z.infer<
  typeof OrderStatusEventPayloadSchema
>;

export const DriverLocationEventPayloadSchema = z.object({
  orderId: z.string(),
  driverId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.string().datetime(),
});

export type DriverLocationEventPayload = z.infer<
  typeof DriverLocationEventPayloadSchema
>;
