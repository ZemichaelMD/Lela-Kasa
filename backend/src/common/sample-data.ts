/**
 * Throwaway sample data so the API has something to return and the web apps look complete.
 * Replaced by the real database (Prisma) per REBUILD_PLAN/02 & /05.
 */

export type SamplePriceRange = 'BUDGET' | 'MODERATE' | 'EXPENSIVE' | 'LUXURY';

export interface SampleMenuItem {
  id: number;
  section: string;
  name: string;
  description: string;
  priceCents: number;
  imageSeed: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  spiceLevel?: number; // 0–3
}

export interface SampleRestaurant {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  city: string;
  neighborhood: string;
  cuisines: string[];
  priceRange: SamplePriceRange;
  rating: number; // 0–5
  ratingCount: number;
  coverSeed: string;
  logoSeed: string;
  isVerified: boolean;
  isFeatured: boolean;
  openNow: boolean;
  deliveryAvailable: boolean;
  estimatedDeliveryTimeMins: number;
  hours: string;
  phone: string;
  menu?: SampleMenuItem[];
}

const m = (
  id: number,
  section: string,
  name: string,
  description: string,
  priceCents: number,
  imageSeed: string,
  extra: Partial<SampleMenuItem> = {},
): SampleMenuItem => ({ id, section, name, description, priceCents, imageSeed, ...extra });

export const SAMPLE_RESTAURANTS: SampleRestaurant[] = [
  {
    id: 1,
    slug: 'abyssinia-kitchen',
    name: 'Abyssinia Kitchen',
    tagline: 'Time-honoured injera & wot, slow-cooked daily',
    description:
      'A family-run favourite serving classic Ethiopian dishes on hand-rolled injera, from doro wot to a generous beyaynetu platter. Coffee ceremony every evening.',
    city: 'Addis Ababa',
    neighborhood: 'Kazanchis',
    cuisines: ['Ethiopian', 'Traditional', 'Coffee'],
    priceRange: 'MODERATE',
    rating: 4.7,
    ratingCount: 312,
    coverSeed: 'abyssinia-cover',
    logoSeed: 'abyssinia-logo',
    isVerified: true,
    isFeatured: true,
    openNow: true,
    deliveryAvailable: true,
    estimatedDeliveryTimeMins: 35,
    hours: 'Mon–Sun · 08:00 – 22:00',
    phone: '+251 11 555 0101',
    menu: [
      m(101, 'Signature Platters', 'Beyaynetu', 'A vegetarian feast: shiro, misir wot, gomen, atkilt and more on injera.', 28000, 'beyaynetu', { isVegetarian: true, isVegan: true, spiceLevel: 1 }),
      m(102, 'Signature Platters', 'Doro Wot', 'Slow-simmered chicken in berbere with a hard-boiled egg.', 34000, 'doro-wot', { spiceLevel: 3 }),
      m(103, 'Signature Platters', 'Kitfo (Leb Leb)', 'Lightly warmed minced beef with mitmita and niter kibbeh.', 38000, 'kitfo', { spiceLevel: 2 }),
      m(104, 'Tibs & Grills', 'Awaze Tibs', 'Sautéed beef cubes with onion, rosemary and awaze.', 32000, 'awaze-tibs', { spiceLevel: 2 }),
      m(105, 'Coffee Ceremony', 'Buna (Traditional Coffee)', 'Roasted, ground and brewed at your table — served with popcorn.', 9000, 'buna'),
      m(106, 'Drinks', 'Tej (Honey Wine)', 'House-fermented honey wine, served chilled.', 12000, 'tej'),
    ],
  },
  {
    id: 2,
    slug: 'lucy-lounge',
    name: 'Lucy Lounge & Grill',
    tagline: 'Modern Ethiopian plates, a long wine list & a leafy terrace',
    description:
      'A contemporary take on Ethiopian classics with grilled mains, a curated wine list and a relaxed terrace. Great for groups and special occasions.',
    city: 'Addis Ababa',
    neighborhood: 'Bole',
    cuisines: ['Ethiopian', 'Grill', 'Fusion', 'Wine'],
    priceRange: 'EXPENSIVE',
    rating: 4.5,
    ratingCount: 198,
    coverSeed: 'lucy-cover',
    logoSeed: 'lucy-logo',
    isVerified: true,
    isFeatured: true,
    openNow: true,
    deliveryAvailable: true,
    estimatedDeliveryTimeMins: 45,
    hours: 'Tue–Sun · 11:00 – 23:00',
    phone: '+251 11 555 0202',
    menu: [
      m(201, 'Starters', 'Sambusa (3 pc)', 'Crisp pastry filled with spiced lentils.', 11000, 'sambusa', { isVegetarian: true, spiceLevel: 1 }),
      m(202, 'Mains', 'Lamb Tibs Skillet', 'Grilled lamb, peppers and onion finished tableside.', 42000, 'lamb-tibs', { spiceLevel: 2 }),
      m(203, 'Mains', 'Asa Lebleb (Fish)', 'Pan-seared Nile perch with awaze and lemon.', 39000, 'asa-lebleb', { spiceLevel: 1 }),
      m(204, 'Vegetarian', 'Shiro Bowl', 'Velvety chickpea stew with a side of injera.', 19000, 'shiro', { isVegetarian: true, isVegan: true, spiceLevel: 1 }),
      m(205, 'Dessert', 'Honey & Cardamom Cake', 'Light sponge with whipped cream and roasted nuts.', 13000, 'honey-cake', { isVegetarian: true }),
    ],
  },
  {
    id: 3,
    slug: 'tomoca-corner',
    name: 'Tomoca Corner',
    tagline: 'Single-origin Ethiopian coffee & light bites',
    description:
      'A bright neighbourhood café roasting beans from Yirgacheffe, Sidamo and Harar. Pour-overs, macchiatos and freshly baked pastries.',
    city: 'Addis Ababa',
    neighborhood: 'Piassa',
    cuisines: ['Coffee', 'Café', 'Bakery'],
    priceRange: 'BUDGET',
    rating: 4.8,
    ratingCount: 521,
    coverSeed: 'tomoca-cover',
    logoSeed: 'tomoca-logo',
    isVerified: true,
    isFeatured: false,
    openNow: true,
    deliveryAvailable: false,
    estimatedDeliveryTimeMins: 0,
    hours: 'Mon–Sat · 07:00 – 19:00',
    phone: '+251 11 555 0303',
    menu: [
      m(301, 'Coffee', 'Yirgacheffe Pour-Over', 'Floral, citrusy, light-bodied — brewed to order.', 8000, 'pourover'),
      m(302, 'Coffee', 'Macchiato', 'Espresso marked with a touch of steamed milk.', 5000, 'macchiato'),
      m(303, 'Coffee', 'Spris', 'Layered tea and coffee — a Piassa classic.', 6000, 'spris'),
      m(304, 'Bakery', 'Ambasha', 'Lightly spiced celebration bread, served warm.', 7000, 'ambasha', { isVegetarian: true }),
      m(305, 'Bakery', 'Bombolino', 'Sugar-dusted cream-filled doughnut.', 6000, 'bombolino', { isVegetarian: true }),
    ],
  },
  {
    id: 4,
    slug: 'gursha-house',
    name: 'Gursha House',
    tagline: 'Big platters, bigger gursha — built for sharing',
    description:
      'Generous family-style platters meant to be shared the traditional way. Vegetarian fasting menus available every day.',
    city: 'Bahir Dar',
    neighborhood: 'Lakeside',
    cuisines: ['Ethiopian', 'Traditional', 'Vegetarian'],
    priceRange: 'MODERATE',
    rating: 4.4,
    ratingCount: 142,
    coverSeed: 'gursha-cover',
    logoSeed: 'gursha-logo',
    isVerified: false,
    isFeatured: true,
    openNow: false,
    deliveryAvailable: true,
    estimatedDeliveryTimeMins: 40,
    hours: 'Wed–Mon · 10:00 – 21:30',
    phone: '+251 58 555 0404',
    menu: [
      m(401, 'Sharing Platters', 'Beyaynetu Grande', 'A 9-item fasting platter for two — fully plant-based.', 36000, 'beyaynetu-grande', { isVegetarian: true, isVegan: true, spiceLevel: 1 }),
      m(402, 'Sharing Platters', 'Mahberawi', 'A mixed meat & veg platter — doro, key wot, tibs and sides.', 52000, 'mahberawi', { spiceLevel: 2 }),
      m(403, 'Soups', 'Shorba', 'Warm lentil soup with cumin and lemon.', 10000, 'shorba', { isVegetarian: true, isVegan: true }),
    ],
  },
  {
    id: 5,
    slug: 'shola-street-food',
    name: 'Shola Street Food',
    tagline: 'Quick, spicy & cheap — the after-work go-to',
    description:
      'A fast-casual counter for tibs sandwiches, firfir wraps and ful in the morning. Order, eat, go.',
    city: 'Addis Ababa',
    neighborhood: 'Shola',
    cuisines: ['Ethiopian', 'Street Food', 'Fast Casual'],
    priceRange: 'BUDGET',
    rating: 4.2,
    ratingCount: 88,
    coverSeed: 'shola-cover',
    logoSeed: 'shola-logo',
    isVerified: false,
    isFeatured: false,
    openNow: true,
    deliveryAvailable: true,
    estimatedDeliveryTimeMins: 25,
    hours: 'Mon–Sat · 06:30 – 20:00',
    phone: '+251 11 555 0505',
    menu: [
      m(501, 'Sandwiches', 'Tibs Sandwich', 'Sautéed beef, awaze and onion in a soft roll.', 12000, 'tibs-sandwich', { spiceLevel: 2 }),
      m(502, 'Wraps', 'Firfir Wrap', 'Shredded injera tossed in berbere sauce, wrapped to go.', 9000, 'firfir-wrap', { isVegetarian: true, spiceLevel: 2 }),
      m(503, 'Breakfast', 'Ful', 'Stewed fava beans with onion, tomato and a swirl of yoghurt.', 8000, 'ful', { isVegetarian: true }),
    ],
  },
  {
    id: 6,
    slug: 'nile-view-bistro',
    name: 'Nile View Bistro',
    tagline: 'Ethiopian–Mediterranean plates with a river breeze',
    description:
      'A calm bistro blending Ethiopian spices with Mediterranean technique — grilled fish, mezze and a short, sharp cocktail list.',
    city: 'Bahir Dar',
    neighborhood: 'Riverside',
    cuisines: ['Fusion', 'Mediterranean', 'Seafood'],
    priceRange: 'LUXURY',
    rating: 4.6,
    ratingCount: 76,
    coverSeed: 'nileview-cover',
    logoSeed: 'nileview-logo',
    isVerified: true,
    isFeatured: false,
    openNow: true,
    deliveryAvailable: false,
    estimatedDeliveryTimeMins: 0,
    hours: 'Tue–Sun · 12:00 – 23:30',
    phone: '+251 58 555 0606',
    menu: [
      m(601, 'Mezze', 'Berbere Hummus', 'Hummus with a berbere swirl, olive oil and warm flatbread.', 14000, 'berbere-hummus', { isVegetarian: true, isVegan: true, spiceLevel: 1 }),
      m(602, 'From the Grill', 'Whole Grilled Tilapia', 'Charred tilapia with awaze butter, herbs and lemon.', 46000, 'grilled-tilapia', { spiceLevel: 1 }),
      m(603, 'From the Grill', 'Lamb Chops', 'Rosemary-marinated chops with smoked aubergine.', 54000, 'lamb-chops', { spiceLevel: 1 }),
      m(604, 'Dessert', 'Cardamom Panna Cotta', 'Set cream with a honey-roasted fig.', 15000, 'panna-cotta', { isVegetarian: true }),
    ],
  },
];

export function findRestaurantBySlug(slug: string): SampleRestaurant | undefined {
  return SAMPLE_RESTAURANTS.find((r) => r.slug === slug);
}
