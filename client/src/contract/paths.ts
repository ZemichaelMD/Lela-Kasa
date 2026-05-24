/**
 * API path constants — single source of truth for all endpoint paths.
 * Use these in both the backend (route decorators) and the SDK (fetch URLs).
 */

export const API_VERSION = 'v1' as const;
export const API_BASE = `/api/${API_VERSION}` as const;

export const PATHS = {
  version: `${API_BASE}/version`,

  // Auth
  auth: {
    register: `${API_BASE}/auth/register`,
    login: `${API_BASE}/auth/login`,
    logout: `${API_BASE}/auth/logout`,
    logoutAll: `${API_BASE}/auth/logout-all`,
    refresh: `${API_BASE}/auth/refresh`,
    verifyEmail: `${API_BASE}/auth/verify-email`,
    resendVerification: `${API_BASE}/auth/resend-verification`,
    forgotPassword: `${API_BASE}/auth/forgot-password`,
    resetPassword: `${API_BASE}/auth/reset-password`,
    changePassword: `${API_BASE}/auth/change-password`,
    me: `${API_BASE}/auth/me`,
    sessions: `${API_BASE}/auth/sessions`,
    session: (id: string) => `${API_BASE}/auth/sessions/${id}`,
    twoFactor: {
      setup: `${API_BASE}/auth/2fa/setup`,
      verify: `${API_BASE}/auth/2fa/verify`,
      disable: `${API_BASE}/auth/2fa/disable`,
    },
  },

  // Users
  users: {
    profile: `${API_BASE}/users/me`,
    updateProfile: `${API_BASE}/users/me`,
    changePassword: `${API_BASE}/users/me/password`,
    settings: `${API_BASE}/users/me/settings`,
    addresses: `${API_BASE}/users/me/addresses`,
    address: (id: string) => `${API_BASE}/users/me/addresses/${id}`,
    notificationPrefs: `${API_BASE}/users/me/notification-preferences`,
    deviceTokens: `${API_BASE}/users/me/device-tokens`,
    // Admin only
    list: `${API_BASE}/users`,
    byId: (id: string) => `${API_BASE}/users/${id}`,
    impersonate: (id: string) => `${API_BASE}/users/${id}/impersonate`,
  },
  adminUsers: {
    list: `${API_BASE}/admin/users`,
    create: `${API_BASE}/admin/users`,
    byId: (id: string) => `${API_BASE}/admin/users/${id}`,
    update: (id: string) => `${API_BASE}/admin/users/${id}`,
    updateRole: (id: string) => `${API_BASE}/admin/users/${id}/role`,
    updateStatus: (id: string) => `${API_BASE}/admin/users/${id}/status`,
    delete: (id: string) => `${API_BASE}/admin/users/${id}`,
  },

  // Restaurants
  restaurants: {
    list: `${API_BASE}/restaurants`,
    create: `${API_BASE}/restaurants`,
    byId: (id: number) => `${API_BASE}/restaurants/${id}`,
    bySlugOrId: (slugOrId: string | number) => `${API_BASE}/restaurants/${slugOrId}`,
    mine: `${API_BASE}/restaurants/mine`,
    update: (id: number) => `${API_BASE}/restaurants/${id}`,
    delete: (id: number) => `${API_BASE}/restaurants/${id}`,
    approve: (id: number) => `${API_BASE}/restaurants/${id}/approve`,
    reject: (id: number) => `${API_BASE}/restaurants/${id}/reject`,
    primaryOwner: (id: number) => `${API_BASE}/restaurants/${id}/primary-owner`,
    hours: (id: number) => `${API_BASE}/restaurants/${id}/hours`,
    staff: (id: number) => `${API_BASE}/restaurants/${id}/staff`,
    owners: (id: number) => `${API_BASE}/restaurants/${id}/owners`,
    claim: (id: number) => `${API_BASE}/restaurants/${id}/claim`,
    tables: (id: number) => `${API_BASE}/restaurants/${id}/tables`,
    qrCodes: (id: number) => `${API_BASE}/restaurants/${id}/qr-codes`,
  },
  adminMenuItems: {
    list: `${API_BASE}/admin/menu-items`,
  },

  adminRestaurants: {
    list: `${API_BASE}/admin/restaurants`,
    approve: (id: number) => `${API_BASE}/admin/restaurants/${id}/approve`,
    reject: (id: number) => `${API_BASE}/admin/restaurants/${id}/reject`,
    feature: (id: number) => `${API_BASE}/admin/restaurants/${id}/feature`,
    unfeature: (id: number) => `${API_BASE}/admin/restaurants/${id}/unfeature`,
    verify: (id: number) => `${API_BASE}/admin/restaurants/${id}/verify`,
    unverify: (id: number) => `${API_BASE}/admin/restaurants/${id}/unverify`,
  },

  // Menu
  menuSections: {
    list: (restaurantId: number) => `${API_BASE}/restaurants/${restaurantId}/menu-sections`,
    create: (restaurantId: number) => `${API_BASE}/restaurants/${restaurantId}/menu-sections`,
    byId: (restaurantId: number, id: string) =>
      `${API_BASE}/restaurants/${restaurantId}/menu-sections/${id}`,
  },
  menuItems: {
    list: (restaurantId: number) => `${API_BASE}/restaurants/${restaurantId}/menu-items`,
    listAll: (restaurantId: number) => `${API_BASE}/restaurants/${restaurantId}/menu-items/all`,
    create: (restaurantId: number) => `${API_BASE}/restaurants/${restaurantId}/menu-items`,
    byId: (restaurantId: number, id: number) =>
      `${API_BASE}/restaurants/${restaurantId}/menu-items/${id}`,
    approve: (id: number) => `${API_BASE}/menu-items/${id}/approve`,
    reject: (id: number) => `${API_BASE}/menu-items/${id}/reject`,
  },
  modifierGroups: {
    list: (restaurantId: number) => `${API_BASE}/restaurants/${restaurantId}/modifier-groups`,
    create: (restaurantId: number) =>
      `${API_BASE}/restaurants/${restaurantId}/modifier-groups`,
    byId: (restaurantId: number, id: string) =>
      `${API_BASE}/restaurants/${restaurantId}/modifier-groups/${id}`,
  },

  // Taxonomy
  categories: {
    list: `${API_BASE}/categories`,
    create: `${API_BASE}/categories`,
    byId: (id: number) => `${API_BASE}/categories/${id}`,
    approve: (id: number) => `${API_BASE}/categories/${id}/approve`,
  },
  tags: {
    list: `${API_BASE}/tags`,
    create: `${API_BASE}/tags`,
    byId: (id: number) => `${API_BASE}/tags/${id}`,
    approve: (id: number) => `${API_BASE}/tags/${id}/approve`,
  },
  cuisines: {
    list: `${API_BASE}/cuisines`,
    create: `${API_BASE}/cuisines`,
    byId: (id: number) => `${API_BASE}/cuisines/${id}`,
    approve: (id: number) => `${API_BASE}/cuisines/${id}/approve`,
  },

  // Templates
  templates: {
    list: `${API_BASE}/templates`,
    create: `${API_BASE}/templates`,
    byId: (id: number) => `${API_BASE}/templates/${id}`,
    preview: (id: number) => `${API_BASE}/templates/${id}/preview`,
    sanitize: (id: number) => `${API_BASE}/templates/${id}/sanitize`,
    renderData: (restaurantId: number) =>
      `${API_BASE}/restaurants/${restaurantId}/template-data`,
    assign: (restaurantId: number) =>
      `${API_BASE}/restaurants/${restaurantId}/template`,
  },

  // QR Codes
  qrCodes: {
    resolve: (code: string) => `${API_BASE}/qr/${code}`,
    scan: (code: string) => `${API_BASE}/qr/${code}/scan`,
    themes: `${API_BASE}/qr-themes`,
    themeByKey: (key: string) => `${API_BASE}/qr-themes/${key}`,
    byId: (restaurantId: number, id: string) =>
      `${API_BASE}/restaurants/${restaurantId}/qr-codes/${id}`,
    scans: (restaurantId: number, id: string) =>
      `${API_BASE}/restaurants/${restaurantId}/qr-codes/${id}/scans`,
  },

  // Discovery
  discovery: {
    search: `${API_BASE}/discovery/search`,
    autocomplete: `${API_BASE}/discovery/autocomplete`,
    nearby: `${API_BASE}/discovery/nearby`,
    featured: `${API_BASE}/discovery/featured`,
    recommendations: `${API_BASE}/discovery/recommendations`,
    collections: `${API_BASE}/collections`,
    collectionBySlug: (slug: string) => `${API_BASE}/collections/${slug}`,
  },

  // Reviews
  restaurantReviews: {
    list: (restaurantId: number) => `${API_BASE}/restaurants/${restaurantId}/reviews`,
    create: (restaurantId: number) => `${API_BASE}/restaurants/${restaurantId}/reviews`,
    summary: (restaurantId: number) => `${API_BASE}/restaurants/${restaurantId}/reviews/summary`,
    byId: (restaurantId: number, id: string) =>
      `${API_BASE}/restaurants/${restaurantId}/reviews/${id}`,
    reply: (restaurantId: number, id: string) =>
      `${API_BASE}/restaurants/${restaurantId}/reviews/${id}/reply`,
    vote: (restaurantId: number, id: string) =>
      `${API_BASE}/restaurants/${restaurantId}/reviews/${id}/vote`,
    report: (restaurantId: number, id: string) =>
      `${API_BASE}/restaurants/${restaurantId}/reviews/${id}/report`,
  },
  menuItemReviews: {
    list: (menuItemId: number) => `${API_BASE}/menu-items/${menuItemId}/reviews`,
    create: (menuItemId: number) => `${API_BASE}/menu-items/${menuItemId}/reviews`,
    summary: (menuItemId: number) => `${API_BASE}/menu-items/${menuItemId}/reviews/summary`,
    byId: (menuItemId: number, id: string) =>
      `${API_BASE}/menu-items/${menuItemId}/reviews/${id}`,
    reply: (menuItemId: number, id: string) =>
      `${API_BASE}/menu-items/${menuItemId}/reviews/${id}/reply`,
    vote: (menuItemId: number, id: string) =>
      `${API_BASE}/menu-items/${menuItemId}/reviews/${id}/vote`,
    report: (menuItemId: number, id: string) =>
      `${API_BASE}/menu-items/${menuItemId}/reviews/${id}/report`,
  },
  myReviews: `${API_BASE}/users/me/reviews`,
  myReports: `${API_BASE}/users/me/reports`,
  adminReviews: {
    list: `${API_BASE}/admin/reviews`,
    byId: (id: string) => `${API_BASE}/admin/reviews/${id}`,
    moderate: (id: string) => `${API_BASE}/admin/reviews/${id}/moderate`,
    moderateMenuItem: (id: string) => `${API_BASE}/admin/reviews/menu-item/${id}/moderate`,
    bulkModerate: `${API_BASE}/admin/reviews/bulk-moderate`,
    stats: `${API_BASE}/admin/reviews/stats`,
  },

  // Bookmarks
  bookmarks: {
    restaurants: `${API_BASE}/users/me/bookmarks/restaurants`,
    menuItems: `${API_BASE}/users/me/bookmarks/menu-items`,
    status: `${API_BASE}/users/me/bookmarks/status`,
    toggleRestaurant: (id: number) => `${API_BASE}/users/me/bookmarks/restaurants/${id}`,
    toggleMenuItem: (id: number) => `${API_BASE}/users/me/bookmarks/menu-items/${id}`,
  },

  // Collections
  collections: {
    list: `${API_BASE}/users/me/collections`,
    create: `${API_BASE}/users/me/collections`,
    byId: (id: string) => `${API_BASE}/users/me/collections/${id}`,
    items: (id: string) => `${API_BASE}/users/me/collections/${id}/items`,
    item: (id: string, itemId: string) => `${API_BASE}/users/me/collections/${id}/items/${itemId}`,
    reorder: (id: string) => `${API_BASE}/users/me/collections/${id}/items/reorder`,
    public: (id: string) => `${API_BASE}/collections/${id}`,
  },

  // Reports
  reports: {
    create: `${API_BASE}/reports`,
    mine: `${API_BASE}/users/me/reports`,
    adminList: `${API_BASE}/admin/reports`,
    adminStats: `${API_BASE}/admin/reports/stats`,
    adminById: (id: string) => `${API_BASE}/admin/reports/${id}`,
    adminUpdate: (id: string) => `${API_BASE}/admin/reports/${id}`,
    adminAssign: (id: string) => `${API_BASE}/admin/reports/${id}/assign`,
  },

  // Messages
  messages: {
    create: `${API_BASE}/messages`,
    list: `${API_BASE}/messages`,
    byId: (id: string) => `${API_BASE}/messages/${id}`,
    reply: (id: string) => `${API_BASE}/messages/${id}/reply`,
    markRead: (id: string) => `${API_BASE}/messages/${id}/read`,
    adminList: `${API_BASE}/admin/messages`,
    adminAssign: (id: string) => `${API_BASE}/admin/messages/${id}/assign`,
    adminClose: (id: string) => `${API_BASE}/admin/messages/${id}/close`,
    adminReopen: (id: string) => `${API_BASE}/admin/messages/${id}/reopen`,
  },

  // Notifications
  notifications: {
    list: `${API_BASE}/notifications`,
    unreadCount: `${API_BASE}/notifications/unread-count`,
    markRead: (id: string) => `${API_BASE}/notifications/${id}/read`,
    markAllRead: `${API_BASE}/notifications/read-all`,
    dismiss: (id: string) => `${API_BASE}/notifications/${id}`,
    preferences: `${API_BASE}/users/me/notification-preferences`,
  },

  // Analytics
  analytics: {
    restaurant: (restaurantId: number) =>
      `${API_BASE}/restaurants/${restaurantId}/analytics`,
    platform: `${API_BASE}/analytics/platform`,
    event: `${API_BASE}/analytics/event`,
  },

  // Settings (admin)
  settings: {
    get: `${API_BASE}/settings`,
    update: `${API_BASE}/settings`,
    featureFlags: `${API_BASE}/settings/feature-flags`,
    featureFlag: (key: string) => `${API_BASE}/settings/feature-flags/${key}`,
  },

  // API Keys
  apiKeys: {
    list: `${API_BASE}/api-keys`,
    create: `${API_BASE}/api-keys`,
    byId: (id: string) => `${API_BASE}/api-keys/${id}`,
    revoke: (id: string) => `${API_BASE}/api-keys/${id}/revoke`,
  },

  // Media
  media: {
    upload: `${API_BASE}/media/upload`,
    byId: (id: string) => `${API_BASE}/media/${id}`,
  },

  // Owner requests (USER → OWNER promotion queue)
  ownerRequests: {
    create: `${API_BASE}/owner-requests`,
    mine: `${API_BASE}/owner-requests/mine`,
    withdraw: (id: string) => `${API_BASE}/owner-requests/${id}`,
    adminList: `${API_BASE}/admin/owner-requests`,
    adminReview: (id: string) => `${API_BASE}/admin/owner-requests/${id}/review`,
  },

  // AI assistant
  ai: {
    chat: `${API_BASE}/ai/chat`,
  },

  // Orders (Phase 2 — behind feature flag)
  orders: {
    list: `${API_BASE}/orders`,
    create: `${API_BASE}/orders`,
    byId: (id: string) => `${API_BASE}/orders/${id}`,
    cancel: (id: string) => `${API_BASE}/orders/${id}/cancel`,
    track: (id: string) => `${API_BASE}/orders/${id}/track`,
    updateStatus: (id: string) => `${API_BASE}/orders/${id}/status`,
    assignStaff: (id: string) => `${API_BASE}/orders/${id}/assign-staff`,
    assignDriver: (id: string) => `${API_BASE}/orders/${id}/assign-driver`,
    refunds: (id: string) => `${API_BASE}/orders/${id}/refunds`,
    payments: (id: string) => `${API_BASE}/orders/${id}/payments`,
    audit: (id: string) => `${API_BASE}/orders/${id}/audit`,
    receipt: (id: string) => `${API_BASE}/orders/${id}/receipt`,
    messages: (id: string) => `${API_BASE}/orders/${id}/messages`,
    dispatchStart: (id: string) => `${API_BASE}/orders/${id}/dispatch/start`,
    dispatchCancel: (id: string) => `${API_BASE}/orders/${id}/dispatch/cancel`,
  },

  // Restaurant order endpoints (staff/owner)
  restaurantOrders: {
    board: (restaurantId: number) => `${API_BASE}/restaurants/${restaurantId}/orders/board`,
    kitchen: (restaurantId: number) => `${API_BASE}/restaurants/${restaurantId}/orders/kitchen`,
    reports: (restaurantId: number) => `${API_BASE}/restaurants/${restaurantId}/orders/reports`,
  },

  // Admin order management
  adminOrders: {
    list: `${API_BASE}/admin/orders`,
    board: `${API_BASE}/admin/orders/board`,
  },

  // Delivery zones & fee tiers
  delivery: {
    zones: (restaurantId: number) => `${API_BASE}/restaurants/${restaurantId}/delivery/zones`,
    zone: (restaurantId: number, zoneId: string) => `${API_BASE}/restaurants/${restaurantId}/delivery/zones/${zoneId}`,
    feeTiers: (restaurantId: number) => `${API_BASE}/restaurants/${restaurantId}/delivery/fee-tiers`,
    settings: (restaurantId: number) => `${API_BASE}/restaurants/${restaurantId}/delivery/settings`,
    quote: `${API_BASE}/delivery/quote`,
  },

  // Driver endpoints (driver's own)
  driverMe: {
    profile: `${API_BASE}/me/driver`,
    status: `${API_BASE}/me/driver/status`,
    location: `${API_BASE}/me/driver/location`,
    orders: `${API_BASE}/me/driver/orders`,
    offers: `${API_BASE}/me/driver/offers`,
    acceptOffer: (id: string) => `${API_BASE}/me/driver/offers/${id}/accept`,
    declineOffer: (id: string) => `${API_BASE}/me/driver/offers/${id}/decline`,
    earnings: `${API_BASE}/me/driver/earnings`,
    payouts: `${API_BASE}/me/driver/payouts`,
  },

  // Admin driver management
  adminDrivers: {
    list: `${API_BASE}/admin/drivers`,
    byId: (userId: string) => `${API_BASE}/admin/drivers/${userId}`,
    verify: (userId: string) => `${API_BASE}/admin/drivers/${userId}/verify`,
    forceStatus: (userId: string) => `${API_BASE}/admin/drivers/${userId}/force-status`,
    runPayout: (userId: string) => `${API_BASE}/admin/drivers/${userId}/payouts/run`,
    payouts: `${API_BASE}/admin/drivers/payouts`,
  },

  // Admin dispatch
  adminDispatch: {
    orders: `${API_BASE}/admin/dispatch/orders`,
    drivers: `${API_BASE}/admin/dispatch/drivers`,
  },

  // Admin payouts (restaurant side)
  adminPayouts: {
    restaurants: `${API_BASE}/admin/payouts/restaurants`,
    restaurantById: (id: string) => `${API_BASE}/admin/payouts/restaurants/${id}`,
    runRestaurant: (id: string) => `${API_BASE}/admin/payouts/restaurants/${id}/run`,
    driversList: `${API_BASE}/admin/payouts/drivers`,
  },

  // Billing — owner endpoints
  billing: {
    plans: `${API_BASE}/billing/plans`,
    mySubscription: `${API_BASE}/billing/me/subscription`,
    checkout: `${API_BASE}/billing/checkout`,
    verifyPayment: (txRef: string) =>
      `${API_BASE}/billing/payments/${txRef}/verify`,
    pause: `${API_BASE}/billing/subscription/pause`,
    resume: `${API_BASE}/billing/subscription/resume`,
    cancel: `${API_BASE}/billing/subscription/cancel`,
    resumeCancellation: `${API_BASE}/billing/subscription/resume-cancellation`,
    changePlan: `${API_BASE}/billing/subscription/change-plan`,
    invoices: `${API_BASE}/billing/invoices`,
    invoice: (id: string) => `${API_BASE}/billing/invoices/${id}`,
    invoicePdf: (id: string) => `${API_BASE}/billing/invoices/${id}/pdf`,
    refunds: `${API_BASE}/billing/refunds`,
    validateCoupon: `${API_BASE}/billing/coupons/validate`,
    channels: `${API_BASE}/billing/channels`,
    chapaCallback: `${API_BASE}/billing/chapa/callback`,
    chapaWebhook: `${API_BASE}/billing/chapa/webhook`,
  },

  // Billing — admin endpoints
  adminBilling: {
    overview: `${API_BASE}/admin/billing/overview`,
    // Features
    features: `${API_BASE}/admin/billing/features`,
    feature: (id: string) => `${API_BASE}/admin/billing/features/${id}`,
    // Plans
    plans: `${API_BASE}/admin/billing/plans`,
    plan: (id: string) => `${API_BASE}/admin/billing/plans/${id}`,
    planPrices: (id: string) =>
      `${API_BASE}/admin/billing/plans/${id}/prices`,
    planPrice: (id: string, priceId: string) =>
      `${API_BASE}/admin/billing/plans/${id}/prices/${priceId}`,
    planFeatures: (id: string) =>
      `${API_BASE}/admin/billing/plans/${id}/features`,
    // Coupons
    coupons: `${API_BASE}/admin/billing/coupons`,
    coupon: (id: string) => `${API_BASE}/admin/billing/coupons/${id}`,
    // Subscriptions
    subscriptions: `${API_BASE}/admin/billing/subscriptions`,
    subscription: (id: string) => `${API_BASE}/admin/billing/subscriptions/${id}`,
    adminSubPause: (id: string) =>
      `${API_BASE}/admin/billing/subscriptions/${id}/pause`,
    adminSubResume: (id: string) =>
      `${API_BASE}/admin/billing/subscriptions/${id}/resume`,
    adminSubCancel: (id: string) =>
      `${API_BASE}/admin/billing/subscriptions/${id}/cancel`,
    adminSubChangePlan: (id: string) =>
      `${API_BASE}/admin/billing/subscriptions/${id}/change-plan`,
    // Invoices
    invoices: `${API_BASE}/admin/billing/invoices`,
    invoice: (id: string) => `${API_BASE}/admin/billing/invoices/${id}`,
    invoiceVoid: (id: string) =>
      `${API_BASE}/admin/billing/invoices/${id}/void`,
    invoicePdf: (id: string) =>
      `${API_BASE}/admin/billing/invoices/${id}/pdf`,
    invoiceRegenPdf: (id: string) =>
      `${API_BASE}/admin/billing/invoices/${id}/regenerate-pdf`,
    // Refund requests
    refundRequests: `${API_BASE}/admin/billing/refund-requests`,
    refundRequest: (id: string) =>
      `${API_BASE}/admin/billing/refund-requests/${id}`,
    refundApprove: (id: string) =>
      `${API_BASE}/admin/billing/refund-requests/${id}/approve`,
    refundReject: (id: string) =>
      `${API_BASE}/admin/billing/refund-requests/${id}/reject`,
    refundMarkProcessed: (id: string) =>
      `${API_BASE}/admin/billing/refund-requests/${id}/mark-processed`,
    // Channels
    channels: `${API_BASE}/admin/billing/channels`,
    channel: (channel: string) =>
      `${API_BASE}/admin/billing/channels/${channel}`,
    // Settings
    settings: `${API_BASE}/admin/billing/settings`,
  },
} as const;
