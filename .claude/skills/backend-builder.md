# Backend Builder Skill

Build and manage the complete backend infrastructure for GreenPack platform.

## Trigger Patterns
- "build the backend"
- "implement backend for [feature]"
- "setup database"
- "create API endpoints"
- "add backend functionality"
- "/backend-builder"

## What This Skill Does

Systematically builds GreenPack's backend infrastructure including:
- Firebase/Firestore database setup and schema design
- REST API endpoints with Next.js App Router route handlers
- Authentication system (customer, vendor, courier, admin roles)
- Payment integration (Paystack/Flutterwave)
- File upload handling (shop videos, product images)
- Email/SMS notification system
- Admin dashboard backend
- Data validation and security rules

## Workflow

### Phase 1: Database Architecture
1. Read `CLAUDE.md` and `src/types/index.ts` to understand data models
2. Design Firestore collections schema
3. Create database utility functions in `src/lib/firebase/`
4. Set up Firebase config and initialization
5. Create data migration scripts to convert mock data to Firestore

### Phase 2: Authentication System
1. Set up Firebase Authentication
2. Create auth context and hooks (`src/context/AuthContext.tsx`)
3. Implement role-based access control (customer, vendor, courier, admin)
4. Build login/signup pages with proper validation
5. Add protected route middleware
6. Create user profile management endpoints

### Phase 3: Core API Endpoints
Create API routes in `src/app/api/`:
- `/api/shops` - CRUD operations for shops
- `/api/products` - Product management
- `/api/services` - Service management
- `/api/orders` - Order processing and tracking
- `/api/reviews` - Review submission and moderation
- `/api/cart` - Cart persistence (optional)
- `/api/wishlist` - Wishlist sync across devices

### Phase 4: Payment Integration
1. Set up Paystack/Flutterwave account
2. Create payment initialization endpoint
3. Handle payment webhooks for verification
4. Implement refund/cancellation logic
5. Create transaction history tracking
6. Add payment security and fraud prevention

### Phase 5: File Upload & Media
1. Configure Firebase Storage or Cloudinary
2. Create upload endpoints with validation
3. Implement image optimization and resizing
4. Add video upload for shop showcases
5. Create CDN integration for fast delivery

### Phase 6: Notifications & Communication
1. Set up email service (SendGrid/Mailgun)
2. Implement SMS notifications (Termii/Africa's Talking)
3. Create notification templates
4. Build notification preference management
5. Add real-time updates with Firebase Realtime Database

### Phase 7: Admin & Vendor Dashboards
1. Create admin API endpoints for:
   - User management
   - Shop verification
   - Content moderation
   - Analytics and reporting
2. Create vendor API endpoints for:
   - Shop/product management
   - Order fulfillment
   - Revenue tracking
   - Customer communication

### Phase 8: Security & Optimization
1. Add rate limiting
2. Implement request validation with Zod
3. Set up CORS properly
4. Add API error handling and logging
5. Create database indexes for performance
6. Implement caching strategy (Redis optional)
7. Add security headers

## Technical Standards

### Database Schema Example
```typescript
// Firestore Collections
shops: {
  [shopId]: {
    name: string;
    ownerId: string;
    category: string;
    description: string;
    videoUrl?: string;
    contactInfo: {...};
    isVerified: boolean;
    rating: number;
    totalReviews: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }
}

orders: {
  [orderId]: {
    customerId: string;
    items: CartItem[];
    totalAmount: number;
    status: OrderStatus;
    deliveryInfo?: {...};
    paymentStatus: string;
    createdAt: Timestamp;
  }
}
```

### API Route Pattern
```typescript
// src/app/api/shops/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    // Query Firestore
    const shops = await getShops({ category });

    return NextResponse.json({ success: true, data: shops });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shops' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = shopSchema.parse(body);

    // Create shop
    const shopId = await createShop(user.uid, validatedData);

    return NextResponse.json({
      success: true,
      data: { shopId }
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create shop' },
      { status: 500 }
    );
  }
}
```

### Environment Variables
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Payment
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=

# Notifications
TERMII_API_KEY=
SENDGRID_API_KEY=

# Admin
ADMIN_SECRET=
```

## Implementation Order

When user requests backend implementation:

1. **Clarify scope** - Ask which features to implement first
2. **Setup Firebase** - Initialize project, install dependencies
3. **Database design** - Create collections schema
4. **Auth system** - User authentication and authorization
5. **Core APIs** - Implement essential endpoints
6. **Payment** - Integrate payment gateway
7. **Testing** - Test all endpoints with different scenarios
8. **Documentation** - Update CLAUDE.md with API documentation

## Key Files to Create

- `src/lib/firebase/config.ts` - Firebase initialization
- `src/lib/firebase/db.ts` - Database utility functions
- `src/lib/firebase/storage.ts` - File upload utilities
- `src/lib/auth.ts` - Authentication helpers
- `src/lib/validation/` - Zod schemas for validation
- `src/context/AuthContext.tsx` - Auth state management
- `src/app/api/` - All API route handlers
- `firestore.rules` - Firestore security rules
- `storage.rules` - Storage security rules

## Success Criteria

- ✅ All mock data successfully migrated to Firestore
- ✅ Authentication working for all user roles
- ✅ API endpoints tested and working
- ✅ Payment integration functional
- ✅ File uploads working
- ✅ Security rules implemented
- ✅ Error handling and validation in place
- ✅ Documentation complete in CLAUDE.md

## Notes

- Use **Firebase Firestore** for database (NoSQL, scalable, good free tier)
- Use **Firebase Auth** for authentication (supports email, Google, phone)
- Use **Paystack** for payments (best for Nigeria)
- Use **Termii** for SMS (Nigerian-focused)
- Follow **Next.js 16 App Router** conventions
- Maintain **TypeScript strict mode**
- Keep API responses consistent with `{ success: boolean, data?: any, error?: string }` format
- Implement proper **error logging** for debugging
