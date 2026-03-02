import { FAQCategory, FAQItem } from "@/types";

export const faqCategories: FAQCategory[] = [
  {
    id: "getting-started",
    name: "Getting Started",
    description: "Learn the basics of using GreenPack",
    icon: "🚀",
    slug: "getting-started",
  },
  {
    id: "ordering",
    name: "How to Order",
    description: "Place orders and book services",
    icon: "🛒",
    slug: "how-to-order",
  },
  {
    id: "payment",
    name: "Payment & Pricing",
    description: "Payment methods and pricing info",
    icon: "💳",
    slug: "payment-pricing",
  },
  {
    id: "tracking",
    name: "Track & Manage Orders",
    description: "Track and manage your bookings",
    icon: "📦",
    slug: "track-orders",
  },
  {
    id: "support",
    name: "Contact & Support",
    description: "Get help and contact vendors",
    icon: "💬",
    slug: "contact-support",
  },
  {
    id: "account",
    name: "Account Help",
    description: "Manage your account settings",
    icon: "👤",
    slug: "account-help",
  },
];

export const faqItems: FAQItem[] = [
  // Getting Started
  {
    id: "faq-1",
    categoryId: "getting-started",
    question: "What is GreenPack?",
    answer:
      "GreenPack (Green Pack Delight) is a Nigerian service and shop discovery platform that connects customers with local vendors. You can browse shops, discover services like laundry, barbershops, phone repair, fashion, food delivery, and more. Connect with providers via phone, WhatsApp, or inquiry forms.",
    keywords: ["greenpack", "what is", "about", "platform", "nigeria"],
  },
  {
    id: "faq-2",
    categoryId: "getting-started",
    question: "How do I browse shops and services?",
    answer:
      'Click on "Browse" in the main navigation or use the search bar to find specific shops, services, or products. You can filter by category, location, ratings, and more to find exactly what you need.',
    keywords: ["browse", "search", "find", "shops", "services", "filter"],
  },
  {
    id: "faq-3",
    categoryId: "getting-started",
    question: "Do I need to create an account to browse?",
    answer:
      "No, you can browse all shops, services, and products without creating an account. However, creating an account allows you to save favorites, track orders, and get personalized recommendations.",
    keywords: ["account", "signup", "register", "browse", "login"],
  },
  {
    id: "faq-4",
    categoryId: "getting-started",
    question: "Is GreenPack available across Nigeria?",
    answer:
      "Yes! GreenPack connects you with vendors across Nigeria. You can filter shops by location to find services near you. Each shop listing includes their exact address and service area.",
    keywords: ["location", "nigeria", "available", "cities", "areas"],
  },

  // How to Order
  {
    id: "faq-5",
    categoryId: "ordering",
    question: "How do I place an order or book a service?",
    answer:
      "Browse to find the shop or service you want, add items to your cart, then proceed to checkout. You'll provide your contact details and can add special notes. The vendor will contact you directly to confirm and arrange delivery or service appointment.",
    keywords: ["order", "book", "purchase", "checkout", "cart"],
  },
  {
    id: "faq-6",
    categoryId: "ordering",
    question: "Can I order from multiple shops at once?",
    answer:
      "Yes! You can add products and services from multiple shops to your cart. At checkout, your order will be grouped by shop, and each vendor will contact you separately to arrange their portion of your order.",
    keywords: ["multiple", "shops", "vendors", "cart", "order"],
  },
  {
    id: "faq-7",
    categoryId: "ordering",
    question: "How do I add special instructions to my order?",
    answer:
      "When adding items to your cart, you can add notes for each item. At checkout, there's also a general message field where you can provide additional instructions for the vendor.",
    keywords: ["instructions", "notes", "special", "request", "custom"],
  },
  {
    id: "faq-8",
    categoryId: "ordering",
    question: "What happens after I submit my order?",
    answer:
      "After you submit your order, the vendor receives your request along with your contact details. They will reach out to you via phone or WhatsApp to confirm availability, finalize pricing, arrange payment, and schedule delivery or service appointment.",
    keywords: ["after", "submit", "next", "confirmation", "vendor contact"],
  },

  // Payment & Pricing
  {
    id: "faq-9",
    categoryId: "payment",
    question: "What payment methods are accepted?",
    answer:
      "Payment methods vary by vendor. Most shops accept cash, bank transfers, and mobile money. Some also accept card payments. When the vendor contacts you, they'll explain their accepted payment methods and arrange payment details.",
    keywords: ["payment", "methods", "cash", "transfer", "card", "pay"],
  },
  {
    id: "faq-10",
    categoryId: "payment",
    question: "Do I pay through GreenPack?",
    answer:
      "No, GreenPack is a discovery platform. All payments are made directly to the vendor using their preferred payment method. This allows you to negotiate and choose the payment option that works best for both parties.",
    keywords: ["payment", "greenpack", "direct", "vendor", "platform"],
  },
  {
    id: "faq-11",
    categoryId: "payment",
    question: "Are the prices on the website final?",
    answer:
      "Prices listed are the vendor's standard rates, but some prices (marked as 'negotiable' or 'starting from') may vary based on your specific needs. The vendor will confirm the final price when they contact you.",
    keywords: ["price", "cost", "final", "negotiable", "rates"],
  },
  {
    id: "faq-12",
    categoryId: "payment",
    question: "Are there any hidden fees?",
    answer:
      "GreenPack doesn't charge customers any fees for browsing or connecting with vendors. However, vendors may have their own delivery fees, service charges, or minimum order requirements. Always confirm the total cost with the vendor before finalizing your order.",
    keywords: ["fees", "charges", "hidden", "delivery", "service charge"],
  },

  // Track & Manage Orders
  {
    id: "faq-13",
    categoryId: "tracking",
    question: "How do I track my order?",
    answer:
      "Since orders are fulfilled directly by vendors, you'll track your order through direct communication with them via phone or WhatsApp. They'll update you on preparation, dispatch, and estimated delivery time.",
    keywords: ["track", "order", "status", "delivery", "update"],
  },
  {
    id: "faq-14",
    categoryId: "tracking",
    question: "Can I cancel or modify my order?",
    answer:
      "Contact the vendor directly as soon as possible to request changes or cancellations. Each vendor has their own cancellation policy. For the best results, reach out before the vendor begins preparing your order or service.",
    keywords: ["cancel", "modify", "change", "order", "refund"],
  },
  {
    id: "faq-15",
    categoryId: "tracking",
    question: "What if my order is delayed?",
    answer:
      "Contact the vendor directly for updates on delayed orders. They can provide specific information about your order status and new estimated delivery time. You can find their contact information in your order confirmation or on their shop page.",
    keywords: ["delay", "late", "order", "delivery", "time"],
  },
  {
    id: "faq-16",
    categoryId: "tracking",
    question: "How long does delivery take?",
    answer:
      "Delivery times vary by vendor, location, and service type. When placing your order, check the shop's service area and operating hours. The vendor will provide an estimated delivery or service time when they contact you to confirm your order.",
    keywords: ["delivery", "time", "how long", "duration", "shipping"],
  },

  // Contact & Support
  {
    id: "faq-17",
    categoryId: "support",
    question: "How do I contact a vendor?",
    answer:
      "Each shop page displays contact information including phone number, email, and WhatsApp (if available). You can reach out directly or submit an inquiry through their shop page. After placing an order, vendors will also contact you.",
    keywords: ["contact", "vendor", "shop", "phone", "whatsapp", "email"],
  },
  {
    id: "faq-18",
    categoryId: "support",
    question: "What if a vendor doesn't respond?",
    answer:
      "If a vendor doesn't respond within 24 hours, try contacting them through an alternative method (phone if you used WhatsApp, or vice versa). You can also browse for alternative vendors offering similar services. If the issue persists, contact GreenPack support.",
    keywords: ["no response", "vendor", "not responding", "contact", "issue"],
  },
  {
    id: "faq-19",
    categoryId: "support",
    question: "How do I report a problem with a vendor?",
    answer:
      "If you experience issues with a vendor, first try to resolve it directly with them. If the issue can't be resolved, contact GreenPack support with details about the vendor and the issue. We take all complaints seriously and investigate accordingly.",
    keywords: ["report", "problem", "issue", "complaint", "vendor", "bad"],
  },
  {
    id: "faq-20",
    categoryId: "support",
    question: "How can I contact GreenPack support?",
    answer:
      "You can reach GreenPack support through the contact information in the footer, or send us an email. We're here to help with platform questions, vendor issues, or any other concerns you may have.",
    keywords: ["greenpack", "support", "contact", "help", "customer service"],
  },

  // Account Help
  {
    id: "faq-21",
    categoryId: "account",
    question: "How do I create an account?",
    answer:
      'Click the "Sign Up" button in the top navigation bar. Provide your name, email, and create a password. You\'ll receive a confirmation email to verify your account. Once verified, you can start using personalized features.',
    keywords: ["signup", "register", "account", "create", "join"],
  },
  {
    id: "faq-22",
    categoryId: "account",
    question: "I forgot my password. How do I reset it?",
    answer:
      'Click "Login" then select "Forgot Password". Enter your email address and we\'ll send you a password reset link. Follow the link to create a new password for your account.',
    keywords: ["password", "forgot", "reset", "login", "access"],
  },
  {
    id: "faq-23",
    categoryId: "account",
    question: "Can I change my email address?",
    answer:
      "Yes, you can update your email address in your account settings. Log in, go to your profile settings, and update your email. You'll need to verify the new email address before the change takes effect.",
    keywords: ["email", "change", "update", "account", "settings"],
  },
  {
    id: "faq-24",
    categoryId: "account",
    question: "How do I become a vendor on GreenPack?",
    answer:
      'Click "Sell on GreenPack" in the navigation menu to access the vendor registration portal. You\'ll provide your business information, upload photos and videos, and list your services or products. Our team will review your application and get back to you within 48 hours.',
    keywords: ["vendor", "seller", "sell", "shop owner", "business", "register"],
  },
];
