export interface JwtPayload {
  sub: string;       // userId
  role: string;
  sessionId: string;
  shopId?: string;   // present for OWNER and EMPLOYEE users
  ver: number;       // token version for future revocation
  iat?: number;
  exp?: number;
}
