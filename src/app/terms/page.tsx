import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="text-green-600 dark:text-green-400 text-sm font-medium hover:underline mb-8 inline-block">
          ← Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Terms & Conditions
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Last updated: March 1, 2026
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using the Green Pack Delight platform (&quot;GreenPack&quot;, &quot;we&quot;, &quot;our&quot;), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services. These terms apply to all users including customers, vendors, and couriers.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">2. Description of Service</h2>
            <p>Green Pack Delight is a Nigerian service and shop discovery platform that connects customers with local vendors offering products and services including but not limited to laundry, barbershop, phone repair, fashion, food, and other categories. We facilitate discovery, browsing, and connection between customers and vendors.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">3. User Accounts</h2>
            <p>To use certain features, you must create an account. You agree to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Keep your password secure and confidential</li>
              <li>Be responsible for all activities under your account</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
            <p className="mt-2">You must be at least 13 years old to create a customer account, and at least 18 years old to register as a vendor or courier.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">4. Vendor Terms</h2>
            <p>Vendors who list their businesses on GreenPack agree to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Provide accurate descriptions of products and services</li>
              <li>Maintain fair and transparent pricing in Nigerian Naira (NGN)</li>
              <li>Fulfill orders and services in a timely manner</li>
              <li>Comply with all applicable Nigerian laws and regulations</li>
              <li>Maintain valid business licenses where required</li>
              <li>Not list prohibited, illegal, or counterfeit items</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">5. Courier Terms</h2>
            <p>Couriers who register on GreenPack agree to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Handle all items with care during pickup and delivery</li>
              <li>Complete deliveries within the estimated timeframes</li>
              <li>Maintain their vehicle in safe working condition</li>
              <li>Follow all traffic laws and safety regulations</li>
              <li>Treat customers and vendors with respect and professionalism</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">6. Orders and Payments</h2>
            <p>All prices are displayed in Nigerian Naira (NGN). When placing an order, you agree to pay the listed price plus any applicable delivery fees. Payment methods and processing are subject to availability in your region. We reserve the right to refuse or cancel any order for any reason.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">7. Reviews and Content</h2>
            <p>Users may submit reviews, ratings, and other content. By doing so, you grant GreenPack a non-exclusive, worldwide, royalty-free license to use, display, and distribute such content. You agree not to post content that is false, misleading, defamatory, or inappropriate.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">8. Prohibited Activities</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Use the platform for any illegal or unauthorized purpose</li>
              <li>Impersonate another person or entity</li>
              <li>Interfere with or disrupt the platform&apos;s operation</li>
              <li>Attempt to gain unauthorized access to other accounts</li>
              <li>Use automated systems to access the platform without permission</li>
              <li>Engage in fraud, deception, or manipulation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">9. Limitation of Liability</h2>
            <p>GreenPack acts as a marketplace connecting customers with vendors. We are not responsible for the quality, safety, or legality of products and services listed by vendors. Transactions are between customers and vendors directly. To the maximum extent permitted by Nigerian law, GreenPack shall not be liable for any indirect, incidental, or consequential damages.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">10. Termination</h2>
            <p>We may suspend or terminate your account at any time for violating these terms or for any reason at our discretion. You may also delete your account at any time through your profile settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">11. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes arising from these terms shall be resolved in the courts of Lagos State, Nigeria.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">12. Contact Us</h2>
            <p>If you have questions about these Terms, please contact us at:</p>
            <p className="mt-2">
              Email: <a href="mailto:support@greenpackdelight.com" className="text-green-600 dark:text-green-400 hover:underline">support@greenpackdelight.com</a><br />
              Phone: +234 800 GREEN PACK
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
