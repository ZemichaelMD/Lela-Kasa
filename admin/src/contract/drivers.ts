import type { DeliveryDriverStatus } from './enums';

export type DriverVehicle = {
  type: 'MOTORCYCLE' | 'BICYCLE' | 'CAR' | 'OTHER';
  plate?: string | null;
  model?: string | null;
  color?: string | null;
  year?: number | null;
};

export type DriverDocuments = {
  licenseUrl?: string | null;
  idUrl?: string | null;
  vehicleRegUrl?: string | null;
};

export type DriverVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type DriverProfile = {
  userId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  status: DeliveryDriverStatus;
  verificationStatus: DriverVerificationStatus;
  rating: number;
  ratingCount: number;
  totalDeliveries: number;
  acceptanceRate: number;
  cancellationRate: number;
  lat?: number | null;
  lng?: number | null;
  lastSeenAt?: string | null;
  vehicle?: DriverVehicle | null;
  documents?: DriverDocuments | null;
  serviceCities?: string[] | null;
  verificationNotes?: string | null;
  currentOrderId?: string | null;
  createdAt: string;
};

export type DriverEarning = {
  id: string;
  orderId: string;
  orderDisplayId: string;
  baseCents: number;
  distanceCents: number;
  tipCents: number;
  bonusCents: number;
  totalCents: number;
  cashCollectedCents: number;
  earnedAt: string;
};

export type DriverPayoutStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';

export type DriverPayout = {
  id: string;
  driverUserId: string;
  driverName?: string | null;
  periodStart: string;
  periodEnd: string;
  deliveryCount: number;
  grossEarningsCents: number;
  cashCollectedCents: number;
  platformFeeCents: number;
  netCents: number;
  cashOwedCents: number;
  status: DriverPayoutStatus;
  paidAt?: string | null;
  reference?: string | null;
  method?: string | null;
  notes?: string | null;
  createdAt: string;
};

export type DispatchOffer = {
  id: string;
  orderId: string;
  orderDisplayId: string;
  driverUserId: string;
  driverName?: string | null;
  offeredAt: string;
  expiresAt: string;
  respondedAt?: string | null;
  response?: 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | null;
  distanceMeters?: number | null;
};

export type DriverListQuery = {
  verificationStatus?: DriverVerificationStatus;
  status?: DeliveryDriverStatus;
  q?: string;
  limit?: number;
  offset?: number;
};

export type DriverListResult = {
  items: DriverProfile[];
  total: number;
};

export type VerifyDriverInput = {
  decision: 'APPROVED' | 'REJECTED';
  notes?: string;
};

export type ForceStatusInput = {
  status: 'OFFLINE' | 'SUSPENDED';
  reason?: string;
};

export type MarkDriverPayoutPaidInput = {
  reference: string;
  method: string;
  notes?: string;
};
