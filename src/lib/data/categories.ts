import type { Category, CategoryGroup } from "@/types";

/**
 * The platform's category taxonomy — the single source for every category
 * surface: the `/browse` sidebar and its homepage rail, the sub-`lg` pill
 * disclosure, the mobile nav drawer, search suggestions, and the
 * vendor/seller category picker.
 *
 * It is two levels: nine `categoryGroups` above, and the 45 leaf `categories`
 * below. Only the leaf is ever stored on a shop (`shops.category_id` holds a
 * `Category.id`), so the grouping is a pure view concern — grouping a list of
 * shops means resolving the group to its members' ids and filtering on that
 * set. Nothing about a leaf's id, slug or name changes when its group does.
 *
 * `categories` stays FLAT rather than nesting inside its group: `/api/search/
 * suggest`, `filterShops()` and the vendor pickers all consume it as a flat
 * list, and keeping it flat means none of them had to learn about groups.
 * Group membership is expressed by each leaf's `groupId`, and the two helpers
 * at the bottom of this file are the only readers of it.
 *
 * │ Group slugs must stay DISJOINT from category slugs. They share the
 * │ `/browse` query surface (`?group=` vs `?category=`), and a collision would
 * │ make one of them ambiguous forever. This is why the home/trades group is
 * │ `home-trades`: `cat-6` already owns the slug `home-services`.
 *
 * Order is meaningful. It is the order every flat consumer renders in, so it
 * runs most-used first, then the long tail grouped by domain. (The grouped
 * surfaces render in `categoryGroups` order, and in this order within each
 * group.) `HeroSection`'s "Popular:" pills are the first five.
 *
 * `shopCount` is seed copy, not a live count — `/api/search/suggest` prints it
 * as a sublabel. Real counts come from the shops table.
 */
export const categoryGroups: CategoryGroup[] = [
  {
    id: "grp-home-trades",
    name: "Home Services & Trades",
    slug: "home-trades",
    icon: "🏠",
    description: "Laundry, cleaning, repairs, and the trades that come to you",
  },
  {
    id: "grp-building-property",
    name: "Building, Property & Interiors",
    slug: "building-property",
    icon: "🏗️",
    description: "Contractors, materials, metalwork, furniture, and property",
  },
  {
    id: "grp-auto-transport",
    name: "Auto, Transport & Travel",
    slug: "auto-transport",
    icon: "🚗",
    description: "Vehicle care, haulage, dispatch, and travel agents",
  },
  {
    id: "grp-food-groceries",
    name: "Food, Drinks & Groceries",
    slug: "food-groceries",
    icon: "🍽️",
    description: "Restaurants, catering, provisions, drinks, and farm produce",
  },
  {
    id: "grp-fashion-beauty",
    name: "Fashion, Beauty & Grooming",
    slug: "fashion-beauty",
    icon: "💇",
    description: "Tailoring, fabrics, accessories, grooming, and cosmetics",
  },
  {
    id: "grp-tech-electronics",
    name: "Phones, Tech & Electronics",
    slug: "tech-electronics",
    icon: "📱",
    description: "Devices, accessories, repairs, and business centres",
  },
  {
    id: "grp-events-creative",
    name: "Events, Media & Creative",
    slug: "events-creative",
    icon: "🎉",
    description: "Event planning, photography, printing, and entertainment",
  },
  {
    id: "grp-professional-business",
    name: "Professional & Business",
    slug: "professional-business",
    icon: "⚖️",
    description: "Legal, accounting, training, and office supplies",
  },
  {
    id: "grp-health-lifestyle",
    name: "Health & Lifestyle",
    slug: "health-lifestyle",
    icon: "💊",
    description: "Pharmacy, fitness, baby care, and pets",
  },
];

export const categories: Category[] = [
  // ── Core ────────────────────────────────────────────────────────────────
  {
    id: "cat-1",
    name: "Laundry & Dry Cleaning",
    slug: "laundry",
    icon: "🧺",
    description: "Professional laundry and dry cleaning services",
    shopCount: 12,
    groupId: "grp-home-trades",
  },
  {
    id: "cat-2",
    name: "Barbershop & Salon",
    slug: "barbershop-salon",
    icon: "💈",
    description: "Haircuts, styling, grooming, and beauty services",
    shopCount: 18,
    groupId: "grp-fashion-beauty",
  },
  {
    id: "cat-3",
    name: "Phone & Tech Repair",
    slug: "phone-repair",
    icon: "📱",
    description: "Phone screen repairs, gadget fixes, and tech support",
    shopCount: 9,
    groupId: "grp-tech-electronics",
  },
  {
    id: "cat-4",
    name: "Fashion & Clothing",
    slug: "fashion",
    icon: "👗",
    description: "Tailoring, fashion shops, and clothing stores",
    shopCount: 15,
    groupId: "grp-fashion-beauty",
  },
  {
    id: "cat-5",
    name: "Food & Restaurant",
    slug: "food",
    icon: "🍽️",
    description: "Restaurants, food vendors, and catering services",
    shopCount: 22,
    groupId: "grp-food-groceries",
  },
  {
    id: "cat-6",
    name: "Home Services",
    slug: "home-services",
    icon: "🔧",
    description: "Painting, handyman jobs, and general home repairs",
    shopCount: 8,
    groupId: "grp-home-trades",
  },
  {
    id: "cat-7",
    name: "Electronics & Gadgets",
    slug: "electronics",
    icon: "💻",
    description: "Electronics sales, accessories, and gadgets",
    shopCount: 11,
    groupId: "grp-tech-electronics",
  },
  {
    id: "cat-8",
    name: "Health & Beauty",
    slug: "health-beauty",
    icon: "💆",
    description: "Spa, skincare, makeup, and wellness services",
    shopCount: 14,
    groupId: "grp-fashion-beauty",
  },

  // ── Popular ─────────────────────────────────────────────────────────────
  {
    id: "cat-9",
    name: "Mechanics & Auto Repair",
    slug: "auto-repair",
    icon: "🚗",
    description: "Car servicing, diagnostics, panel beating, and spare parts",
    shopCount: 13,
    groupId: "grp-auto-transport",
  },
  {
    id: "cat-10",
    name: "Cleaning & Fumigation",
    slug: "cleaning-fumigation",
    icon: "🧽",
    description: "Home and office cleaning, pest control, and fumigation",
    shopCount: 10,
    groupId: "grp-home-trades",
  },
  {
    id: "cat-11",
    name: "Catering & Baking",
    slug: "catering-baking",
    icon: "🎂",
    description: "Caterers, cake bakers, small chops, and event food",
    shopCount: 17,
    groupId: "grp-food-groceries",
  },
  {
    id: "cat-12",
    name: "Groceries & Provisions",
    slug: "groceries",
    icon: "🛒",
    description: "Supermarkets, provision stores, and foodstuff sellers",
    shopCount: 19,
    groupId: "grp-food-groceries",
  },
  {
    id: "cat-13",
    name: "Event Planning & Rentals",
    slug: "events-rentals",
    icon: "🎉",
    description: "Event planners, decorators, canopies, and equipment rentals",
    shopCount: 14,
    groupId: "grp-events-creative",
  },
  {
    id: "cat-14",
    name: "Building & Construction",
    slug: "construction",
    icon: "🏗️",
    description: "Building contractors, tiling, POP, and renovation works",
    shopCount: 12,
    groupId: "grp-building-property",
  },
  {
    id: "cat-15",
    name: "Generator & Solar Power",
    slug: "power-solutions",
    icon: "⚡",
    description: "Generator repairs, solar installation, inverters, and batteries",
    shopCount: 9,
    groupId: "grp-home-trades",
  },
  {
    id: "cat-16",
    name: "Real Estate & Property",
    slug: "real-estate",
    icon: "🏠",
    description: "Land, houses, rentals, and property management",
    shopCount: 10,
    groupId: "grp-building-property",
  },

  // ── Trades & repairs ────────────────────────────────────────────────────
  // The trades a customer searches for by name. Each owns its own niche so no
  // two categories claim the same job: plumbing and electrical moved out of
  // `cat-6` Home Services (which keeps painting and handyman work), mechanics
  // is `cat-9`'s own name rather than a second category beside it, and
  // appliance repair is distinct from `cat-3` gadgets and `cat-15` power.
  {
    id: "cat-43",
    name: "Plumbers & Plumbing Services",
    slug: "plumbers",
    icon: "🚰",
    description: "Pipe fitting, leak repairs, and bathroom and kitchen plumbing",
    shopCount: 9,
    groupId: "grp-home-trades",
  },
  {
    id: "cat-44",
    name: "Electricians & Electrical Services",
    slug: "electricians",
    icon: "💡",
    description: "Wiring, sockets, lighting, fault finding, and electrical repairs",
    shopCount: 8,
    groupId: "grp-home-trades",
  },
  {
    id: "cat-45",
    name: "Technicians & Appliance Repair",
    slug: "technicians",
    icon: "🛠️",
    description: "AC, fridge, washing machine, TV, and home appliance repair",
    shopCount: 7,
    groupId: "grp-home-trades",
  },

  // ── Building, home & trade ──────────────────────────────────────────────
  {
    id: "cat-17",
    name: "Building Materials",
    slug: "building-materials",
    icon: "🧱",
    description: "Cement, tiles, roofing, plumbing fittings, and material traders",
    shopCount: 16,
    groupId: "grp-building-property",
  },
  {
    id: "cat-18",
    name: "Welding & Metal Works",
    slug: "welding-metal",
    icon: "🔨",
    description: "Welders, aluminium windows, gates, and metal fabrication",
    shopCount: 7,
    groupId: "grp-building-property",
  },
  {
    id: "cat-19",
    name: "Furniture & Home Decor",
    slug: "furniture-decor",
    icon: "🛋️",
    description: "Furniture making, upholstery, and interior decoration",
    shopCount: 11,
    groupId: "grp-building-property",
  },
  {
    id: "cat-20",
    name: "Water Supply & Borehole",
    slug: "water-supply",
    icon: "💧",
    description: "Borehole drilling, water tankers, and water treatment",
    shopCount: 5,
    groupId: "grp-home-trades",
  },
  {
    id: "cat-21",
    name: "Gas & Cooking Fuel",
    slug: "gas-fuel",
    icon: "🔥",
    description: "Cooking gas refills, cylinders, and burner supplies",
    shopCount: 6,
    groupId: "grp-home-trades",
  },
  {
    id: "cat-22",
    name: "Security & Safety Services",
    slug: "security",
    icon: "🛡️",
    description: "Security guards, CCTV, alarms, and access control",
    shopCount: 8,
    groupId: "grp-home-trades",
  },
  {
    id: "cat-23",
    name: "Car Wash & Detailing",
    slug: "car-wash",
    icon: "🚿",
    description: "Car wash, polishing, detailing, and interior cleaning",
    shopCount: 7,
    groupId: "grp-auto-transport",
  },

  // ── Food, farm & drinks ─────────────────────────────────────────────────
  {
    id: "cat-24",
    name: "Drinks & Beverages",
    slug: "drinks",
    icon: "🍹",
    description: "Wine shops, drink distributors, and beverage supplies",
    shopCount: 9,
    groupId: "grp-food-groceries",
  },
  {
    id: "cat-25",
    name: "Agriculture & Farm Produce",
    slug: "agriculture",
    icon: "🌾",
    description: "Farm produce, livestock, agro supplies, and animal feeds",
    shopCount: 8,
    groupId: "grp-food-groceries",
  },

  // ── Health & wellbeing ──────────────────────────────────────────────────
  {
    id: "cat-26",
    name: "Pharmacy & Medical Supplies",
    slug: "pharmacy",
    icon: "💊",
    description: "Pharmacies, medical equipment, and health supplies",
    shopCount: 10,
    groupId: "grp-health-lifestyle",
  },
  {
    id: "cat-27",
    name: "Fitness & Wellness",
    slug: "fitness",
    icon: "🏋️",
    description: "Gyms, personal trainers, and wellness centres",
    shopCount: 6,
    groupId: "grp-health-lifestyle",
  },

  // ── Fashion trade ───────────────────────────────────────────────────────
  {
    id: "cat-28",
    name: "Fabrics & Textiles",
    slug: "fabrics",
    icon: "🧵",
    description: "Ankara, lace, aso-oke, and wholesale textile traders",
    shopCount: 13,
    groupId: "grp-fashion-beauty",
  },
  {
    id: "cat-29",
    name: "Jewelry & Accessories",
    slug: "jewelry",
    icon: "💍",
    description: "Jewellery, watches, bags, and fashion accessories",
    shopCount: 8,
    groupId: "grp-fashion-beauty",
  },
  {
    id: "cat-30",
    name: "Cosmetics & Beauty Supplies",
    slug: "cosmetics",
    icon: "💄",
    description: "Cosmetics, skincare products, and salon supplies",
    shopCount: 12,
    groupId: "grp-fashion-beauty",
  },
  {
    id: "cat-31",
    name: "Shoe Repair & Leather Works",
    slug: "shoe-repair",
    icon: "👞",
    description: "Cobblers, shoe care, bag repairs, and leather crafting",
    shopCount: 5,
    groupId: "grp-fashion-beauty",
  },

  // ── Professional & business ─────────────────────────────────────────────
  {
    id: "cat-32",
    name: "Professional & Legal Services",
    slug: "professional-services",
    icon: "⚖️",
    description: "Lawyers, accountants, consultants, and business support",
    shopCount: 9,
    groupId: "grp-professional-business",
  },
  {
    id: "cat-33",
    name: "Education & Training",
    slug: "education",
    icon: "📚",
    description: "Schools, lesson teachers, and skill training centres",
    shopCount: 12,
    groupId: "grp-professional-business",
  },
  {
    id: "cat-34",
    name: "Printing & Branding",
    slug: "printing-branding",
    icon: "🖨️",
    description: "Printing, banners, souvenirs, and corporate branding",
    shopCount: 10,
    groupId: "grp-events-creative",
  },
  {
    id: "cat-35",
    name: "Cyber Café & Business Centre",
    slug: "cyber-cafe",
    icon: "🖥️",
    description: "Internet services, typing, laminating, and online registrations",
    shopCount: 6,
    groupId: "grp-tech-electronics",
  },
  {
    id: "cat-36",
    name: "Photography & Videography",
    slug: "photography",
    icon: "📷",
    description: "Photographers, videographers, and photo studios",
    shopCount: 11,
    groupId: "grp-events-creative",
  },
  {
    id: "cat-37",
    name: "Travel & Tours",
    slug: "travel-tours",
    icon: "✈️",
    description: "Travel agents, visa support, and tour operators",
    shopCount: 6,
    groupId: "grp-auto-transport",
  },
  {
    id: "cat-38",
    name: "Logistics & Haulage",
    slug: "logistics",
    icon: "🚚",
    description: "Dispatch riders, haulage, and moving services",
    shopCount: 9,
    groupId: "grp-auto-transport",
  },

  // ── Lifestyle ───────────────────────────────────────────────────────────
  {
    id: "cat-39",
    name: "Kids & Baby Care",
    slug: "kids-baby",
    icon: "🍼",
    description: "Baby items, crèche, and children's services",
    shopCount: 7,
    groupId: "grp-health-lifestyle",
  },
  {
    id: "cat-40",
    name: "Pets & Veterinary",
    slug: "pets-vet",
    icon: "🐾",
    description: "Pet shops, grooming, and veterinary care",
    shopCount: 4,
    groupId: "grp-health-lifestyle",
  },
  {
    id: "cat-41",
    name: "Books & Stationery",
    slug: "books-stationery",
    icon: "📖",
    description: "Bookshops, stationery, and office supplies",
    shopCount: 6,
    groupId: "grp-professional-business",
  },
  {
    id: "cat-42",
    name: "Music & Entertainment",
    slug: "entertainment",
    icon: "🎵",
    description: "DJs, live bands, MCs, and entertainment rentals",
    shopCount: 8,
    groupId: "grp-events-creative",
  },
];

/** The leaves of one group, in taxonomy order. */
export function categoriesInGroup(groupId: string): Category[] {
  return categories.filter((c) => c.groupId === groupId);
}

/** Resolve a `/browse?group=` slug. Undefined for an unknown slug. */
export function getGroupBySlug(slug: string): CategoryGroup | undefined {
  return categoryGroups.find((g) => g.slug === slug);
}
