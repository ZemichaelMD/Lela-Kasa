export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  sessionId?: string;
  shopId?: string;
  changePinRequired?: boolean;
}
