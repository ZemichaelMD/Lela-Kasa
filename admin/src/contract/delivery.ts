export type ZoneType = 'POLYGON' | 'RADIUS';

export type LatLng = { lat: number; lng: number };

export type DeliveryZone = {
  id: string;
  restaurantId: number;
  name: string;
  type: ZoneType;
  polygon?: LatLng[] | null;
  radiusMeters?: number | null;
  centerLat?: number | null;
  centerLng?: number | null;
  feeCents: number;
  etaMinutes: number;
  minOrderCents: number;
  freeAboveCents?: number | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateZoneInput = {
  name: string;
  type: ZoneType;
  polygon?: LatLng[];
  radiusMeters?: number;
  centerLat?: number;
  centerLng?: number;
  feeCents: number;
  etaMinutes: number;
  minOrderCents: number;
  freeAboveCents?: number;
  priority?: number;
};

export type UpdateZoneInput = Partial<CreateZoneInput> & { isActive?: boolean };

export type FeeTier = {
  id: string;
  restaurantId: number;
  fromKm: number;
  toKm: number | null;
  feeCents: number;
  label?: string | null;
};

export type FeeTierInput = {
  fromKm: number;
  toKm: number | null;
  feeCents: number;
  label?: string;
};

export type DeliveryAutoDispatchTrigger = 'CONFIRMED' | 'PREPARING';

export type DeliverySettings = {
  restaurantId: number;
  deliveryEnabled: boolean;
  selfDeliveryEnabled: boolean;
  cashOnDeliveryEnabled: boolean;
  autoDispatchTrigger: DeliveryAutoDispatchTrigger;
  surgeMultiplier: number;
  avgPrepTimeMinutes: number;
  autoAcceptOrders: boolean;
  freeDeliveryAboveCents?: number | null;
};

export type UpdateDeliverySettingsInput = Partial<Omit<DeliverySettings, 'restaurantId'>>;

export type DeliveryQuoteResult = {
  feeCents: number;
  etaSeconds: number;
  zoneId?: string | null;
  source: 'polygon' | 'distance_tier' | 'flat';
};

export type ActiveDispatchOrder = {
  orderId: string;
  orderDisplayId: string;
  restaurantId: number;
  restaurantName?: string | null;
  status: string;
  driverUserId?: string | null;
  driverName?: string | null;
  driverLat?: number | null;
  driverLng?: number | null;
  customerLat?: number | null;
  customerLng?: number | null;
  etaSeconds?: number | null;
  createdAt: string;
  dispatchOffers?: import('./drivers').DispatchOffer[];
};

export type OnlineDriver = {
  userId: string;
  name: string;
  phone?: string | null;
  lat: number;
  lng: number;
  rating: number;
  status: import('./enums').DeliveryDriverStatus;
  currentOrderId?: string | null;
  lastSeenAt: string;
};
