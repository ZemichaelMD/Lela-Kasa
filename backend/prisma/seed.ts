import {
  PrismaClient,
  UserRole,
  PriceTierKind,
  PaymentAccountKind,
  PaymentMethod,
  SaleStatus,
  SubscriptionStatus,
} from "./generated";

import * as argon2 from "argon2";

const prisma = new PrismaClient();

// Inline permission registry for seeding (mirrors permissions.registry.ts)
const PERMISSION_REGISTRY = [
  { slug: "sales:view", defaultGranted: true },
  { slug: "sales:create", defaultGranted: true },
  { slug: "sales:void", defaultGranted: false },
  { slug: "customers:view", defaultGranted: true },
  { slug: "customers:create", defaultGranted: true },
  { slug: "customers:edit", defaultGranted: false },
  { slug: "customers:delete", defaultGranted: false },
  { slug: "beverages:view", defaultGranted: true },
  { slug: "beverages:create", defaultGranted: false },
  { slug: "beverages:edit", defaultGranted: false },
  { slug: "beverages:delete", defaultGranted: false },
  { slug: "beverages:stock", defaultGranted: false },
  { slug: "price-tiers:view", defaultGranted: true },
  { slug: "price-tiers:create", defaultGranted: false },
  { slug: "price-tiers:edit", defaultGranted: false },
  { slug: "price-tiers:delete", defaultGranted: false },
  { slug: "payment-accounts:view", defaultGranted: true },
  { slug: "payment-accounts:create", defaultGranted: false },
  { slug: "payment-accounts:edit", defaultGranted: false },
  { slug: "payment-accounts:delete", defaultGranted: false },
  { slug: "payments:view", defaultGranted: true },
  { slug: "payments:record", defaultGranted: true },
  { slug: "payments:void", defaultGranted: false },
  { slug: "orders:view", defaultGranted: true },
  { slug: "orders:confirm", defaultGranted: true },
  { slug: "orders:reject", defaultGranted: false },
  { slug: "reports:view", defaultGranted: false },
  { slug: "settings:view", defaultGranted: false },
  { slug: "settings:edit", defaultGranted: false },
  { slug: "employees:view", defaultGranted: false },
];

async function main() {
  // Super Admin
  const superAdminHash = await argon2.hash("SuperAdminPass123!");
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@kasa.app" },
    update: {},
    create: {
      email: "superadmin@kasa.app",
      passwordHash: superAdminHash,
      name: "Super Admin",
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      emailVerified: true,
    },
  });

  // Admin (legacy)
  const adminHash = await argon2.hash("AdminPass123!");
  const admin = await prisma.user.upsert({
    where: { email: "admin@kasa.test" },
    update: {},
    create: {
      email: "admin@kasa.test",
      passwordHash: adminHash,
      name: "Demo Admin",
      role: UserRole.ADMIN,
      isActive: true,
      emailVerified: true,
    },
  });

  // Owner
  const ownerHash = await argon2.hash("OwnerPass123!");
  const owner = await prisma.user.upsert({
    where: { email: "owner@kasa.test" },
    update: {},
    create: {
      email: "owner@kasa.test",
      passwordHash: ownerHash,
      name: "Demo Owner",
      role: UserRole.OWNER,
      isActive: true,
      emailVerified: true,
    },
  });

  // Shop
  const shop = await prisma.shop.upsert({
    where: { ownerId: owner.id },
    update: {},
    create: {
      name: "Demo Beverage Shop",
      ownerId: owner.id,
      currency: "ETB",
      timezone: "Africa/Addis_Ababa",
      lowStockThreshold: 2,
    },
  });

  // Link owner to shop
  await prisma.user.update({
    where: { id: owner.id },
    data: { shopId: shop.id },
  });

  // Employee
  const staffHash = await argon2.hash("StaffPass123!");
  await prisma.user.upsert({
    where: { email: "staff@kasa.test" },
    update: {},
    create: {
      email: "staff@kasa.test",
      passwordHash: staffHash,
      name: "Demo Staff",
      role: UserRole.EMPLOYEE,
      isActive: true,
      emailVerified: true,
      shopId: shop.id,
    },
  });

  // Price tiers
  const retailTier = await prisma.priceTier.upsert({
    where: { shopId_name: { shopId: shop.id, name: "Retail" } },
    update: {},
    create: {
      shopId: shop.id,
      name: "Retail",
      kind: PriceTierKind.RETAIL,
      isDefault: true,
    },
  });

  const wholesaleTier = await prisma.priceTier.upsert({
    where: { shopId_name: { shopId: shop.id, name: "Wholesale" } },
    update: {},
    create: {
      shopId: shop.id,
      name: "Wholesale",
      kind: PriceTierKind.WHOLESALE,
      isDefault: false,
    },
  });

  // Set default tier on shop
  await prisma.shop.update({
    where: { id: shop.id },
    data: { defaultPriceTierId: retailTier.id },
  });

  // Beverages
  const beverageData = [
    { name: "St. George", brand: "BGI", sizeMl: 330 },
    { name: "Harar", brand: "Harar Brewery", sizeMl: 330 },
    { name: "Dashen", brand: "Dashen Brewery", sizeMl: 330 },
    { name: "Walia", brand: "BGI", sizeMl: 330 },
  ];

  const beverages: any[] = [];
  for (const bev of beverageData) {
    const b = await prisma.beverage.upsert({
      where: {
        // Use findFirst pattern via create+skip since no unique on name+shopId beyond index
        // Workaround: use a deterministic approach
        id: `seed-bev-${bev.name.toLowerCase().replace(/\s+/g, "-")}-${shop.id}`,
      },
      update: {},
      create: {
        id: `seed-bev-${bev.name.toLowerCase().replace(/\s+/g, "-")}-${shop.id}`,
        shopId: shop.id,
        name: bev.name,
        brand: bev.brand,
        sizeMl: bev.sizeMl,
        bottlesPerBox: 24,
        isActive: true,
        stockBottles: 240, // 10 boxes
      },
    });
    beverages.push(b);
  }

  // Prices: retail=box 550 ETB (55000c), bottle 25 ETB (2500c); wholesale=box 500 ETB (50000c), bottle 22 ETB (2200c)
  for (const bev of beverages) {
    await prisma.beveragePrice.upsert({
      where: {
        id: `seed-price-retail-${bev.id}`,
      },
      update: {},
      create: {
        id: `seed-price-retail-${bev.id}`,
        beverageId: bev.id,
        priceTierId: retailTier.id,
        pricePerBoxCents: 55000,
        pricePerBottleCents: 2500,
      },
    });
    await prisma.beveragePrice.upsert({
      where: {
        id: `seed-price-wholesale-${bev.id}`,
      },
      update: {},
      create: {
        id: `seed-price-wholesale-${bev.id}`,
        beverageId: bev.id,
        priceTierId: wholesaleTier.id,
        pricePerBoxCents: 50000,
        pricePerBottleCents: 2200,
      },
    });
  }

  // Payment accounts
  const accountData = [
    {
      name: "Cash to Dagim",
      kind: PaymentAccountKind.CASH_PERSON,
      holderName: "Dagim",
    },
    {
      name: "Cash to Bereket",
      kind: PaymentAccountKind.CASH_PERSON,
      holderName: "Bereket",
    },
    {
      name: "CBE — Bereket",
      kind: PaymentAccountKind.BANK,
      holderName: "Bereket",
      bankName: "Commercial Bank of Ethiopia",
    },
    {
      name: "Abyssinia — Dagim",
      kind: PaymentAccountKind.BANK,
      holderName: "Dagim",
      bankName: "Abyssinia Bank",
    },
  ];

  const accounts: any[] = [];
  for (const acc of accountData) {
    const a = await prisma.paymentAccount.upsert({
      where: { shopId_name: { shopId: shop.id, name: acc.name } },
      update: {},
      create: { shopId: shop.id, ...acc, isActive: true },
    });
    accounts.push(a);
  }

  // Customers
  const customerData = [
    { name: "Abebe Kebede", phone: "+251911000001" },
    { name: "Tigist Alemu", phone: "+251911000002" },
    { name: "Mulugeta Haile", phone: "+251911000003" },
  ];

  const customers: any[] = [];
  for (const c of customerData) {
    const cust = await prisma.customer.upsert({
      where: {
        id: `seed-cust-${c.name.toLowerCase().replace(/\s+/g, "-")}-${shop.id}`,
      },
      update: {},
      create: {
        id: `seed-cust-${c.name.toLowerCase().replace(/\s+/g, "-")}-${shop.id}`,
        shopId: shop.id,
        name: c.name,
        phone: c.phone,
        creditBalanceCents: 0,
        outstandingBoxes: 0,
        outstandingBottles: 0,
      },
    });
    customers.push(cust);
  }

  // Sample Sale 1 — fully paid
  const sale1Id = `seed-sale-1-${shop.id}`;
  const sale1 = await prisma.sale.upsert({
    where: { id: sale1Id },
    update: {},
    create: {
      id: sale1Id,
      shopId: shop.id,
      customerId: customers[0].id,
      saleDate: new Date(),
      status: SaleStatus.CONFIRMED,
      priceTierId: retailTier.id,
      subtotalCents: 110000, // 2 boxes St. George @ 55000
      paidCents: 110000,
      creditDeltaCents: 0,
      boxesOutDelta: 2,
      boxesReturnedOnSale: 0,
      bottlesOutDelta: 0,
      bottlesReturnedOnSale: 0,
      createdById: owner.id,
    },
  });

  await prisma.saleLine.upsert({
    where: { id: `seed-sl-1-${shop.id}` },
    update: {},
    create: {
      id: `seed-sl-1-${shop.id}`,
      saleId: sale1.id,
      beverageId: beverages[0].id,
      boxes: 2,
      bottles: 0,
      pricePerBoxCents: 55000,
      pricePerBottleCents: 2500,
      lineTotalCents: 110000,
    },
  });

  await prisma.payment.upsert({
    where: { id: `seed-pay-1-${shop.id}` },
    update: {},
    create: {
      id: `seed-pay-1-${shop.id}`,
      shopId: shop.id,
      saleId: sale1.id,
      customerId: customers[0].id,
      amountCents: 110000,
      method: PaymentMethod.CASH,
      paymentAccountId: accounts[0].id,
      paidAt: new Date(),
      recordedById: owner.id,
    },
  });

  // Sample Sale 2 — with credit
  const sale2Id = `seed-sale-2-${shop.id}`;
  const sale2 = await prisma.sale.upsert({
    where: { id: sale2Id },
    update: {},
    create: {
      id: sale2Id,
      shopId: shop.id,
      customerId: customers[1].id,
      saleDate: new Date(),
      status: SaleStatus.CONFIRMED,
      priceTierId: retailTier.id,
      subtotalCents: 165000, // 3 boxes Harar
      paidCents: 100000,
      creditDeltaCents: 65000,
      boxesOutDelta: 3,
      boxesReturnedOnSale: 0,
      bottlesOutDelta: 0,
      bottlesReturnedOnSale: 0,
      createdById: owner.id,
    },
  });

  await prisma.saleLine.upsert({
    where: { id: `seed-sl-2-${shop.id}` },
    update: {},
    create: {
      id: `seed-sl-2-${shop.id}`,
      saleId: sale2.id,
      beverageId: beverages[1].id,
      boxes: 3,
      bottles: 0,
      pricePerBoxCents: 55000,
      pricePerBottleCents: 2500,
      lineTotalCents: 165000,
    },
  });

  await prisma.payment.upsert({
    where: { id: `seed-pay-2-${shop.id}` },
    update: {},
    create: {
      id: `seed-pay-2-${shop.id}`,
      shopId: shop.id,
      saleId: sale2.id,
      customerId: customers[1].id,
      amountCents: 100000,
      method: PaymentMethod.CASH,
      paymentAccountId: accounts[1].id,
      paidAt: new Date(),
      recordedById: owner.id,
    },
  });

  // Update customer 2 credit balance
  await prisma.customer.update({
    where: { id: customers[1].id },
    data: { creditBalanceCents: 65000, outstandingBoxes: 3 },
  });

  // ── Subscription Plans ────────────────────────────────────────────────────
  const featuresStarter = JSON.stringify([
    "Up to 5 employees",
    "Up to 100 customers",
    "Basic sales tracking",
    "Payment recording",
  ]);
  const featuresGrowth = JSON.stringify([
    "Up to 15 employees",
    "Up to 500 customers",
    "All Starter features",
    "Reports & analytics",
    "Customer orders portal",
  ]);
  const featuresBusiness = JSON.stringify([
    "Unlimited employees",
    "Unlimited customers",
    "All Growth features",
    "Priority support",
    "Advanced reports",
  ]);

  const starterPlan = await prisma.subscriptionPlan.upsert({
    where: { name: "Starter" },
    update: {},
    create: {
      name: "Starter",
      description: "Perfect for small beverage shops getting started.",
      monthlyPriceCents: 29900, // 299 ETB
      yearlyPriceCents: 299000, // 2,990 ETB
      maxUsers: 5,
      maxCustomers: 100,
      features: featuresStarter,
      isDefault: true,
      trialDays: 14,
      isActive: true,
      sortOrder: 1,
    },
  });

  const growthPlan = await prisma.subscriptionPlan.upsert({
    where: { name: "Growth" },
    update: {},
    create: {
      name: "Growth",
      description:
        "For growing shops that need more team members and insights.",
      monthlyPriceCents: 59900, // 599 ETB
      yearlyPriceCents: 599000, // 5,990 ETB
      maxUsers: 15,
      maxCustomers: 500,
      features: featuresGrowth,
      isDefault: false,
      trialDays: 14,
      isActive: true,
      sortOrder: 2,
    },
  });

  const businessPlan = await prisma.subscriptionPlan.upsert({
    where: { name: "Business" },
    update: {},
    create: {
      name: "Business",
      description: "For established shops that need unlimited everything.",
      monthlyPriceCents: 119900, // 1,199 ETB
      yearlyPriceCents: 1199000, // 11,990 ETB
      maxUsers: -1,
      maxCustomers: -1,
      features: featuresBusiness,
      isDefault: false,
      trialDays: 14,
      isActive: true,
      sortOrder: 3,
    },
  });

  // ── Payment Providers ──────────────────────────────────────────────────────
  await prisma.paymentProvider.upsert({
    where: { name: "CBE Bank Transfer" },
    update: {},
    create: {
      name: "CBE Bank Transfer",
      kind: "MANUAL",
      instructions:
        "Transfer to: CBE Account 1000012345678\nAccount Name: LeLa Kasa Tech\nAfter transfer, enter the transaction reference below.",
      sortOrder: 1,
      isActive: true,
    },
  });

  await prisma.paymentProvider.upsert({
    where: { name: "Telebirr Mobile Money" },
    update: {},
    create: {
      name: "Telebirr Mobile Money",
      kind: "MANUAL",
      instructions:
        "Send to Telebirr: 0911 000 000\nAccount Name: LeLa Kasa\nTake a screenshot of the confirmation and enter the reference.",
      sortOrder: 2,
      isActive: true,
    },
  });

  // ── Demo Shop Subscription ─────────────────────────────────────────────────
  await prisma.subscription.upsert({
    where: { shopId: shop.id },
    update: {},
    create: {
      shopId: shop.id,
      planId: starterPlan.id,
      status: SubscriptionStatus.TRIAL,
      billingCycle: "monthly",
      amountCents: starterPlan.monthlyPriceCents,
      startDate: new Date(),
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  // ── Employee Permissions ───────────────────────────────────────────────────
  const employee = await prisma.user.findUnique({
    where: { email: "staff@kasa.test" },
  });
  if (employee) {
    await prisma.userPermission.createMany({
      data: PERMISSION_REGISTRY.map((def) => ({
        userId: employee.id,
        shopId: shop.id,
        slug: def.slug,
        granted: def.defaultGranted,
      })),
      skipDuplicates: true,
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
