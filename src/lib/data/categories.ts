import type { Category } from "@/types";

/**
 * The platform's category taxonomy — the single source for every category
 * surface: the home grid, `/browse` sidebar + pills, the mobile nav drawer,
 * search suggestions, and the vendor/seller category picker.
 *
 * Order is meaningful. It is the order every one of those surfaces renders in,
 * so it runs most-used first, then the long tail grouped by domain. The home
 * page grid only shows the first `HOME_CATEGORY_LIMIT` (see `CategoryNav`);
 * everything past that is reachable through "View all" → `/browse`.
 *
 * `shopCount` is seed copy, not a live count — `/api/search/suggest` prints it
 * as a sublabel. Real counts come from the shops table.
 */
export const categories: Category[] = [
  // ── Core ────────────────────────────────────────────────────────────────
  {
    id: "cat-1",
    name: "Laundry & Dry Cleaning",
    slug: "laundry",
    icon: "🧺",
    description: "Professional laundry and dry cleaning services",
    shopCount: 12,
  },
  {
    id: "cat-2",
    name: "Barbershop & Salon",
    slug: "barbershop-salon",
    icon: "💈",
    description: "Haircuts, styling, grooming, and beauty services",
    shopCount: 18,
  },
  {
    id: "cat-3",
    name: "Phone & Tech Repair",
    slug: "phone-repair",
    icon: "📱",
    description: "Phone screen repairs, gadget fixes, and tech support",
    shopCount: 9,
  },
  {
    id: "cat-4",
    name: "Fashion & Clothing",
    slug: "fashion",
    icon: "👗",
    description: "Tailoring, fashion shops, and clothing stores",
    shopCount: 15,
  },
  {
    id: "cat-5",
    name: "Food & Restaurant",
    slug: "food",
    icon: "🍽️",
    description: "Restaurants, food vendors, and catering services",
    shopCount: 22,
  },
  {
    id: "cat-6",
    name: "Home Services",
    slug: "home-services",
    icon: "🔧",
    description: "Painting, handyman jobs, and general home repairs",
    shopCount: 8,
  },
  {
    id: "cat-7",
    name: "Electronics & Gadgets",
    slug: "electronics",
    icon: "💻",
    description: "Electronics sales, accessories, and gadgets",
    shopCount: 11,
  },
  {
    id: "cat-8",
    name: "Health & Beauty",
    slug: "health-beauty",
    icon: "💆",
    description: "Spa, skincare, makeup, and wellness services",
    shopCount: 14,
  },

  // ── Popular ─────────────────────────────────────────────────────────────
  {
    id: "cat-9",
    name: "Mechanics & Auto Repair",
    slug: "auto-repair",
    icon: "🚗",
    description: "Car servicing, diagnostics, panel beating, and spare parts",
    shopCount: 13,
  },
  {
    id: "cat-10",
    name: "Cleaning & Fumigation",
    slug: "cleaning-fumigation",
    icon: "🧽",
    description: "Home and office cleaning, pest control, and fumigation",
    shopCount: 10,
  },
  {
    id: "cat-11",
    name: "Catering & Baking",
    slug: "catering-baking",
    icon: "🎂",
    description: "Caterers, cake bakers, small chops, and event food",
    shopCount: 17,
  },
  {
    id: "cat-12",
    name: "Groceries & Provisions",
    slug: "groceries",
    icon: "🛒",
    description: "Supermarkets, provision stores, and foodstuff sellers",
    shopCount: 19,
  },
  {
    id: "cat-13",
    name: "Event Planning & Rentals",
    slug: "events-rentals",
    icon: "🎉",
    description: "Event planners, decorators, canopies, and equipment rentals",
    shopCount: 14,
  },
  {
    id: "cat-14",
    name: "Building & Construction",
    slug: "construction",
    icon: "🏗️",
    description: "Building contractors, tiling, POP, and renovation works",
    shopCount: 12,
  },
  {
    id: "cat-15",
    name: "Generator & Solar Power",
    slug: "power-solutions",
    icon: "⚡",
    description: "Generator repairs, solar installation, inverters, and batteries",
    shopCount: 9,
  },
  {
    id: "cat-16",
    name: "Real Estate & Property",
    slug: "real-estate",
    icon: "🏠",
    description: "Land, houses, rentals, and property management",
    shopCount: 10,
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
  },
  {
    id: "cat-44",
    name: "Electricians & Electrical Services",
    slug: "electricians",
    icon: "💡",
    description: "Wiring, sockets, lighting, fault finding, and electrical repairs",
    shopCount: 8,
  },
  {
    id: "cat-45",
    name: "Technicians & Appliance Repair",
    slug: "technicians",
    icon: "🛠️",
    description: "AC, fridge, washing machine, TV, and home appliance repair",
    shopCount: 7,
  },

  // ── Building, home & trade ──────────────────────────────────────────────
  {
    id: "cat-17",
    name: "Building Materials",
    slug: "building-materials",
    icon: "🧱",
    description: "Cement, tiles, roofing, plumbing fittings, and material traders",
    shopCount: 16,
  },
  {
    id: "cat-18",
    name: "Welding & Metal Works",
    slug: "welding-metal",
    icon: "🔨",
    description: "Welders, aluminium windows, gates, and metal fabrication",
    shopCount: 7,
  },
  {
    id: "cat-19",
    name: "Furniture & Home Decor",
    slug: "furniture-decor",
    icon: "🛋️",
    description: "Furniture making, upholstery, and interior decoration",
    shopCount: 11,
  },
  {
    id: "cat-20",
    name: "Water Supply & Borehole",
    slug: "water-supply",
    icon: "💧",
    description: "Borehole drilling, water tankers, and water treatment",
    shopCount: 5,
  },
  {
    id: "cat-21",
    name: "Gas & Cooking Fuel",
    slug: "gas-fuel",
    icon: "🔥",
    description: "Cooking gas refills, cylinders, and burner supplies",
    shopCount: 6,
  },
  {
    id: "cat-22",
    name: "Security & Safety Services",
    slug: "security",
    icon: "🛡️",
    description: "Security guards, CCTV, alarms, and access control",
    shopCount: 8,
  },
  {
    id: "cat-23",
    name: "Car Wash & Detailing",
    slug: "car-wash",
    icon: "🚿",
    description: "Car wash, polishing, detailing, and interior cleaning",
    shopCount: 7,
  },

  // ── Food, farm & drinks ─────────────────────────────────────────────────
  {
    id: "cat-24",
    name: "Drinks & Beverages",
    slug: "drinks",
    icon: "🍹",
    description: "Wine shops, drink distributors, and beverage supplies",
    shopCount: 9,
  },
  {
    id: "cat-25",
    name: "Agriculture & Farm Produce",
    slug: "agriculture",
    icon: "🌾",
    description: "Farm produce, livestock, agro supplies, and animal feeds",
    shopCount: 8,
  },

  // ── Health & wellbeing ──────────────────────────────────────────────────
  {
    id: "cat-26",
    name: "Pharmacy & Medical Supplies",
    slug: "pharmacy",
    icon: "💊",
    description: "Pharmacies, medical equipment, and health supplies",
    shopCount: 10,
  },
  {
    id: "cat-27",
    name: "Fitness & Wellness",
    slug: "fitness",
    icon: "🏋️",
    description: "Gyms, personal trainers, and wellness centres",
    shopCount: 6,
  },

  // ── Fashion trade ───────────────────────────────────────────────────────
  {
    id: "cat-28",
    name: "Fabrics & Textiles",
    slug: "fabrics",
    icon: "🧵",
    description: "Ankara, lace, aso-oke, and wholesale textile traders",
    shopCount: 13,
  },
  {
    id: "cat-29",
    name: "Jewelry & Accessories",
    slug: "jewelry",
    icon: "💍",
    description: "Jewellery, watches, bags, and fashion accessories",
    shopCount: 8,
  },
  {
    id: "cat-30",
    name: "Cosmetics & Beauty Supplies",
    slug: "cosmetics",
    icon: "💄",
    description: "Cosmetics, skincare products, and salon supplies",
    shopCount: 12,
  },
  {
    id: "cat-31",
    name: "Shoe Repair & Leather Works",
    slug: "shoe-repair",
    icon: "👞",
    description: "Cobblers, shoe care, bag repairs, and leather crafting",
    shopCount: 5,
  },

  // ── Professional & business ─────────────────────────────────────────────
  {
    id: "cat-32",
    name: "Professional & Legal Services",
    slug: "professional-services",
    icon: "⚖️",
    description: "Lawyers, accountants, consultants, and business support",
    shopCount: 9,
  },
  {
    id: "cat-33",
    name: "Education & Training",
    slug: "education",
    icon: "📚",
    description: "Schools, lesson teachers, and skill training centres",
    shopCount: 12,
  },
  {
    id: "cat-34",
    name: "Printing & Branding",
    slug: "printing-branding",
    icon: "🖨️",
    description: "Printing, banners, souvenirs, and corporate branding",
    shopCount: 10,
  },
  {
    id: "cat-35",
    name: "Cyber Café & Business Centre",
    slug: "cyber-cafe",
    icon: "🖥️",
    description: "Internet services, typing, laminating, and online registrations",
    shopCount: 6,
  },
  {
    id: "cat-36",
    name: "Photography & Videography",
    slug: "photography",
    icon: "📷",
    description: "Photographers, videographers, and photo studios",
    shopCount: 11,
  },
  {
    id: "cat-37",
    name: "Travel & Tours",
    slug: "travel-tours",
    icon: "✈️",
    description: "Travel agents, visa support, and tour operators",
    shopCount: 6,
  },
  {
    id: "cat-38",
    name: "Logistics & Haulage",
    slug: "logistics",
    icon: "🚚",
    description: "Dispatch riders, haulage, and moving services",
    shopCount: 9,
  },

  // ── Lifestyle ───────────────────────────────────────────────────────────
  {
    id: "cat-39",
    name: "Kids & Baby Care",
    slug: "kids-baby",
    icon: "🍼",
    description: "Baby items, crèche, and children's services",
    shopCount: 7,
  },
  {
    id: "cat-40",
    name: "Pets & Veterinary",
    slug: "pets-vet",
    icon: "🐾",
    description: "Pet shops, grooming, and veterinary care",
    shopCount: 4,
  },
  {
    id: "cat-41",
    name: "Books & Stationery",
    slug: "books-stationery",
    icon: "📖",
    description: "Bookshops, stationery, and office supplies",
    shopCount: 6,
  },
  {
    id: "cat-42",
    name: "Music & Entertainment",
    slug: "entertainment",
    icon: "🎵",
    description: "DJs, live bands, MCs, and entertainment rentals",
    shopCount: 8,
  },
];
