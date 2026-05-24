import { BrowserTokenStore, createSdk } from "@/sdk";

// `PATHS` in @kasa/contract already include the `/api/v1` prefix, so
// configure the base URL as host-only. Tolerate the old `/api/v1` suffix too.
const RAW_API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:3001";
export const API_URL: string = RAW_API_URL.replace(
  /\/api\/v\d+\/?$/,
  "",
).replace(/\/$/, "");

export const tokenStore = new BrowserTokenStore("kasa.admin.auth");

// Allow a dev-time bootstrap token from env so smoke testing without login still works.
const bootstrapToken = import.meta.env.VITE_ADMIN_ACCESS_TOKEN as
  | string
  | undefined;
if (bootstrapToken && !tokenStore.getAccessToken()) {
  tokenStore.setTokens(bootstrapToken, "");
}

export const sdk = createSdk({
  baseUrl: API_URL,
  tokenStore,
  onRefresh: async (refreshToken) => {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error("Refresh failed");
    const body = (await res.json()) as {
      data: { accessToken: string; refreshToken: string };
    };
    return { ...body.data, expiresIn: 15 * 60 };
  },
  onUnauthenticated: () => {
    tokenStore.clearTokens();
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.href = "/login";
    }
  },
});

export async function setAdminAccessToken(accessToken: string) {
  tokenStore.setTokens(accessToken, "");
}
