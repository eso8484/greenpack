import type { Shop } from "@/types";

export const shops: Shop[] = [
  {
    id: "shop-1",
    name: "CleanWave Laundry",
    slug: "cleanwave-laundry",
    description:
      "Professional laundry and dry cleaning service with same-day delivery. We handle all fabric types with care, using eco-friendly detergents. Serving Lekki and surrounding areas for over 5 years.",
    shortDescription: "Professional laundry with same-day delivery",
    categoryId: "cat-1",
    categoryName: "Laundry & Dry Cleaning",
    owner: "Adebayo Johnson",
    rating: 4.7,
    reviewCount: 34,
    location: {
      address: "15 Admiralty Way, Lekki Phase 1",
      city: "Lagos",
      state: "Lagos",
    },
    contact: {
      phone: "+234 801 234 5678",
      email: "info@cleanwave.ng",
      whatsapp: "+234 801 234 5678",
    },
    hours: { open: "07:00", close: "20:00", days: "Mon - Sat" },
    images: {
      thumbnail:
        "https://placehold.co/400x300/22c55e/ffffff?text=CleanWave",
      banner:
        "https://placehold.co/1200x400/16a34a/ffffff?text=CleanWave+Laundry",
      gallery: [
        "https://placehold.co/600x400/22c55e/ffffff?text=Shop+Interior",
        "https://placehold.co/600x400/16a34a/ffffff?text=Equipment",
      ],
    },
    video: {
      url: "",
      thumbnail:
        "https://placehold.co/800x450/22c55e/ffffff?text=Watch+Video",
    },
    tags: ["laundry", "dry cleaning", "ironing", "same-day"],
    isVerified: true,
    isFeatured: true,
    createdAt: "2025-06-15",
  },
  {
    id: "shop-2",
    name: "King's Cut Barbershop",
    slug: "kings-cut-barbershop",
    description:
      "Premium barbershop offering the latest haircut styles, beard grooming, and facial treatments. Walk-ins welcome. Our skilled barbers deliver sharp, clean cuts every time.",
    shortDescription: "Premium haircuts and grooming for men",
    categoryId: "cat-2",
    categoryName: "Barbershop & Salon",
    owner: "Emeka Okonkwo",
    rating: 4.9,
    reviewCount: 56,
    location: {
      address: "22 Allen Avenue, Ikeja",
      city: "Lagos",
      state: "Lagos",
    },
    contact: {
      phone: "+234 802 345 6789",
      email: "kingscut@gmail.com",
      whatsapp: "+234 802 345 6789",
    },
    hours: { open: "08:00", close: "21:00", days: "Mon - Sun" },
    images: {
      thumbnail:
        "https://placehold.co/400x300/22c55e/ffffff?text=King's+Cut",
      banner:
        "https://placehold.co/1200x400/16a34a/ffffff?text=King's+Cut+Barbershop",
      gallery: [
        "https://placehold.co/600x400/22c55e/ffffff?text=Haircuts",
        "https://placehold.co/600x400/16a34a/ffffff?text=Interior",
      ],
    },
    video: {
      url: "",
      thumbnail:
        "https://placehold.co/800x450/22c55e/ffffff?text=Watch+Video",
    },
    tags: ["barber", "haircut", "grooming", "beard", "facial"],
    isVerified: true,
    isFeatured: true,
    createdAt: "2025-04-10",
  },
  {
    id: "shop-3",
    name: "FixIt Phone Clinic",
    slug: "fixit-phone-clinic",
    description:
      "Expert phone and gadget repair. We fix cracked screens, battery replacements, water damage, and software issues for all major brands. Fast turnaround with warranty on all repairs.",
    shortDescription: "Fast phone repairs with warranty",
    categoryId: "cat-3",
    categoryName: "Phone & Tech Repair",
    owner: "Chidi Nwankwo",
    rating: 4.5,
    reviewCount: 41,
    location: {
      address: "8 Computer Village, Ikeja",
      city: "Lagos",
      state: "Lagos",
    },
    contact: {
      phone: "+234 803 456 7890",
      email: "fixitclinic@gmail.com",
      whatsapp: "+234 803 456 7890",
    },
    hours: { open: "09:00", close: "18:00", days: "Mon - Sat" },
    images: {
      thumbnail:
        "https://placehold.co/400x300/22c55e/ffffff?text=FixIt",
      banner:
        "https://placehold.co/1200x400/16a34a/ffffff?text=FixIt+Phone+Clinic",
      gallery: [
        "https://placehold.co/600x400/22c55e/ffffff?text=Repairs",
        "https://placehold.co/600x400/16a34a/ffffff?text=Tools",
      ],
    },
    video: {
      url: "",
      thumbnail:
        "https://placehold.co/800x450/22c55e/ffffff?text=Watch+Video",
    },
    tags: ["phone repair", "screen fix", "battery", "gadgets"],
    isVerified: true,
    isFeatured: true,
    createdAt: "2025-05-20",
  },
  {
    id: "shop-4",
    name: "Adire by Tola",
    slug: "adire-by-tola",
    description:
      "Custom fashion and traditional attire. We specialize in Adire fabrics, custom tailoring, and modern African fashion. From aso-oke to ready-to-wear, we've got you covered.",
    shortDescription: "Custom African fashion and tailoring",
    categoryId: "cat-4",
    categoryName: "Fashion & Clothing",
    owner: "Tolani Bakare",
    rating: 4.8,
    reviewCount: 29,
    location: {
      address: "5 Bode Thomas Street, Surulere",
      city: "Lagos",
      state: "Lagos",
    },
    contact: {
      phone: "+234 804 567 8901",
      email: "adirebytola@gmail.com",
      whatsapp: "+234 804 567 8901",
    },
    hours: { open: "09:00", close: "19:00", days: "Mon - Sat" },
    images: {
      thumbnail:
        "https://placehold.co/400x300/22c55e/ffffff?text=Adire+by+Tola",
      banner:
        "https://placehold.co/1200x400/16a34a/ffffff?text=Adire+by+Tola",
      gallery: [
        "https://placehold.co/600x400/22c55e/ffffff?text=Fabrics",
        "https://placehold.co/600x400/16a34a/ffffff?text=Designs",
      ],
    },
    video: {
      url: "",
      thumbnail:
        "https://placehold.co/800x450/22c55e/ffffff?text=Watch+Video",
    },
    tags: ["fashion", "tailoring", "adire", "african wear", "aso-oke"],
    isVerified: true,
    isFeatured: true,
    createdAt: "2025-03-01",
  },
  {
    id: "shop-5",
    name: "Mama Nkechi Kitchen",
    slug: "mama-nkechi-kitchen",
    description:
      "Authentic Nigerian dishes made with love. From jollof rice to egusi soup, we serve the best homemade meals. Catering available for events and parties. Free delivery within Yaba.",
    shortDescription: "Authentic Nigerian home-cooked meals",
    categoryId: "cat-5",
    categoryName: "Food & Restaurant",
    owner: "Nkechi Obi",
    rating: 4.6,
    reviewCount: 67,
    location: {
      address: "12 Herbert Macaulay Way, Yaba",
      city: "Lagos",
      state: "Lagos",
    },
    contact: {
      phone: "+234 805 678 9012",
      email: "mamankechi@gmail.com",
      whatsapp: "+234 805 678 9012",
    },
    hours: { open: "08:00", close: "22:00", days: "Mon - Sun" },
    images: {
      thumbnail:
        "https://placehold.co/400x300/22c55e/ffffff?text=Mama+Nkechi",
      banner:
        "https://placehold.co/1200x400/16a34a/ffffff?text=Mama+Nkechi+Kitchen",
      gallery: [
        "https://placehold.co/600x400/22c55e/ffffff?text=Jollof+Rice",
        "https://placehold.co/600x400/16a34a/ffffff?text=Kitchen",
      ],
    },
    video: {
      url: "",
      thumbnail:
        "https://placehold.co/800x450/22c55e/ffffff?text=Watch+Video",
    },
    tags: ["food", "restaurant", "nigerian", "catering", "jollof"],
    isVerified: true,
    isFeatured: false,
    createdAt: "2025-07-01",
  },
  {
    id: "shop-6",
    name: "Sparky Electrical Services",
    slug: "sparky-electrical",
    description:
      "Licensed electrician offering residential and commercial electrical services. We handle wiring, installations, repairs, and maintenance. Available for emergency call-outs.",
    shortDescription: "Licensed electrician for all your needs",
    categoryId: "cat-6",
    categoryName: "Home Services",
    owner: "Kunle Adeyemi",
    rating: 4.4,
    reviewCount: 19,
    location: {
      address: "7 Ikorodu Road, Maryland",
      city: "Lagos",
      state: "Lagos",
    },
    contact: {
      phone: "+234 806 789 0123",
      email: "sparkyelectric@gmail.com",
      whatsapp: "+234 806 789 0123",
    },
    hours: { open: "07:00", close: "18:00", days: "Mon - Sat" },
    images: {
      thumbnail:
        "https://placehold.co/400x300/22c55e/ffffff?text=Sparky",
      banner:
        "https://placehold.co/1200x400/16a34a/ffffff?text=Sparky+Electrical",
      gallery: [
        "https://placehold.co/600x400/22c55e/ffffff?text=Wiring",
        "https://placehold.co/600x400/16a34a/ffffff?text=Equipment",
      ],
    },
    video: {
      url: "",
      thumbnail:
        "https://placehold.co/800x450/22c55e/ffffff?text=Watch+Video",
    },
    tags: ["electrician", "wiring", "installation", "repairs", "emergency"],
    isVerified: true,
    isFeatured: false,
    createdAt: "2025-08-12",
  },
  {
    id: "shop-7",
    name: "GadgetZone",
    slug: "gadgetzone",
    description:
      "Your one-stop shop for phones, laptops, accessories, and gadgets. We sell original and certified refurbished devices. Trade-in options available. Warranty on all products.",
    shortDescription: "Phones, laptops, and gadgets at great prices",
    categoryId: "cat-7",
    categoryName: "Electronics & Gadgets",
    owner: "Olu Fashola",
    rating: 4.3,
    reviewCount: 48,
    location: {
      address: "Block B, Computer Village, Ikeja",
      city: "Lagos",
      state: "Lagos",
    },
    contact: {
      phone: "+234 807 890 1234",
      email: "gadgetzone@gmail.com",
      whatsapp: "+234 807 890 1234",
    },
    hours: { open: "09:00", close: "19:00", days: "Mon - Sat" },
    images: {
      thumbnail:
        "https://placehold.co/400x300/22c55e/ffffff?text=GadgetZone",
      banner:
        "https://placehold.co/1200x400/16a34a/ffffff?text=GadgetZone",
      gallery: [
        "https://placehold.co/600x400/22c55e/ffffff?text=Phones",
        "https://placehold.co/600x400/16a34a/ffffff?text=Laptops",
      ],
    },
    video: {
      url: "",
      thumbnail:
        "https://placehold.co/800x450/22c55e/ffffff?text=Watch+Video",
    },
    tags: ["phones", "laptops", "accessories", "gadgets", "electronics"],
    isVerified: true,
    isFeatured: true,
    createdAt: "2025-02-15",
  },
  {
    id: "shop-8",
    name: "Glow Studio",
    slug: "glow-studio",
    description:
      "Premium beauty and skincare studio. We offer facials, makeup services, spa treatments, and skincare consultations. Using top-quality products for radiant, healthy skin.",
    shortDescription: "Skincare, makeup, and spa treatments",
    categoryId: "cat-8",
    categoryName: "Health & Beauty",
    owner: "Amaka Eze",
    rating: 4.8,
    reviewCount: 53,
    location: {
      address: "3 Awolowo Road, Ikoyi",
      city: "Lagos",
      state: "Lagos",
    },
    contact: {
      phone: "+234 808 901 2345",
      email: "glowstudio@gmail.com",
      whatsapp: "+234 808 901 2345",
    },
    hours: { open: "09:00", close: "20:00", days: "Mon - Sun" },
    images: {
      thumbnail:
        "https://placehold.co/400x300/22c55e/ffffff?text=Glow+Studio",
      banner:
        "https://placehold.co/1200x400/16a34a/ffffff?text=Glow+Studio",
      gallery: [
        "https://placehold.co/600x400/22c55e/ffffff?text=Skincare",
        "https://placehold.co/600x400/16a34a/ffffff?text=Spa",
      ],
    },
    video: {
      url: "",
      thumbnail:
        "https://placehold.co/800x450/22c55e/ffffff?text=Watch+Video",
    },
    tags: ["beauty", "skincare", "makeup", "spa", "facial"],
    isVerified: true,
    isFeatured: true,
    createdAt: "2025-01-20",
  },
  {
    id: "shop-9",
    name: "FreshPress Laundromat",
    slug: "freshpress-laundromat",
    description:
      "Self-service and full-service laundry in Victoria Island. We offer express wash, fold, and delivery. Corporate accounts welcome. Open 7 days a week.",
    shortDescription: "Express laundry and delivery service",
    categoryId: "cat-1",
    categoryName: "Laundry & Dry Cleaning",
    owner: "Bola Ogundimu",
    rating: 4.2,
    reviewCount: 21,
    location: {
      address: "18 Adeola Odeku, Victoria Island",
      city: "Lagos",
      state: "Lagos",
    },
    contact: {
      phone: "+234 809 012 3456",
      email: "freshpress@gmail.com",
    },
    hours: { open: "06:00", close: "22:00", days: "Mon - Sun" },
    images: {
      thumbnail:
        "https://placehold.co/400x300/22c55e/ffffff?text=FreshPress",
      banner:
        "https://placehold.co/1200x400/16a34a/ffffff?text=FreshPress",
      gallery: [],
    },
    video: {
      url: "",
      thumbnail:
        "https://placehold.co/800x450/22c55e/ffffff?text=Watch+Video",
    },
    tags: ["laundry", "express", "self-service", "delivery"],
    isVerified: false,
    isFeatured: false,
    createdAt: "2025-09-05",
  },
  {
    id: "shop-10",
    name: "QuickFix Plumbing",
    slug: "quickfix-plumbing",
    description:
      "Reliable plumbing services for homes and offices. We fix leaks, install pipes, unblock drains, and handle all plumbing emergencies. Available 24/7 for urgent repairs.",
    shortDescription: "24/7 plumbing repairs and installation",
    categoryId: "cat-6",
    categoryName: "Home Services",
    owner: "Segun Afolabi",
    rating: 4.1,
    reviewCount: 15,
    location: {
      address: "10 Opebi Road, Ikeja",
      city: "Lagos",
      state: "Lagos",
    },
    contact: {
      phone: "+234 810 123 4567",
      email: "quickfixplumb@gmail.com",
      whatsapp: "+234 810 123 4567",
    },
    hours: { open: "00:00", close: "23:59", days: "Mon - Sun" },
    images: {
      thumbnail:
        "https://placehold.co/400x300/22c55e/ffffff?text=QuickFix",
      banner:
        "https://placehold.co/1200x400/16a34a/ffffff?text=QuickFix+Plumbing",
      gallery: [],
    },
    video: {
      url: "",
      thumbnail:
        "https://placehold.co/800x450/22c55e/ffffff?text=Watch+Video",
    },
    tags: ["plumbing", "pipes", "leaks", "drains", "emergency"],
    isVerified: true,
    isFeatured: false,
    createdAt: "2025-10-01",
  },
];
