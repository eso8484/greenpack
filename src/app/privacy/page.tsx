import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="text-green-600 dark:text-green-400 text-sm font-medium hover:underline mb-8 inline-block">
          ← Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Last updated: March 1, 2026
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">1. Introduction</h2>
            <p>Green Pack Delight (&quot;GreenPack&quot;, &quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. This policy applies in accordance with the Nigeria Data Protection Regulation (NDPR) and other applicable data protection laws.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">2. Information We Collect</h2>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">2.1 Personal Information</h3>
            <p>When you create an account, we collect:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Full name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Date of birth</li>
              <li>Password (stored securely using industry-standard encryption)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">2.2 Vendor Information</h3>
            <p>If you register as a vendor, we additionally collect:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Business name and description</li>
              <li>Business address and location</li>
              <li>Business contact information</li>
              <li>Product and service listings</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">2.3 Usage Data</h3>
            <p>We automatically collect certain information when you use our platform, including:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Device information (type, operating system, browser)</li>
              <li>IP address</li>
              <li>Pages visited and features used</li>
              <li>Search queries</li>
              <li>Date and time of access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">3. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Create and manage your account</li>
              <li>Process orders and facilitate transactions between customers and vendors</li>
              <li>Verify your identity through email and phone verification</li>
              <li>Send you important notifications about your account and orders</li>
              <li>Improve our platform and user experience</li>
              <li>Provide customer support</li>
              <li>Comply with legal obligations</li>
              <li>Detect and prevent fraud or security threats</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">4. Information Sharing</h2>
            <p>We do not sell your personal information. We may share your information with:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Vendors:</strong> When you place an order, we share necessary contact information with the vendor to fulfill your order</li>
              <li><strong>Couriers:</strong> When delivery is requested, we share pickup and delivery addresses with assigned couriers</li>
              <li><strong>Service Providers:</strong> We use third-party services for SMS verification (Termii), payment processing, and hosting</li>
              <li><strong>Legal Requirements:</strong> We may disclose information when required by law or to protect our rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">5. Data Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your personal information, including:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Encryption of data in transit (SSL/TLS) and at rest</li>
              <li>Secure password hashing</li>
              <li>Row-level security policies on our database</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication for administrative functions</li>
            </ul>
            <p className="mt-2">While we strive to protect your information, no method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">6. Your Rights (NDPR)</h2>
            <p>Under the Nigeria Data Protection Regulation, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal requirements)</li>
              <li><strong>Objection:</strong> Object to the processing of your data for certain purposes</li>
              <li><strong>Data Portability:</strong> Request your data in a structured, commonly used format</li>
              <li><strong>Withdraw Consent:</strong> Withdraw previously given consent at any time</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact us at support@greenpackdelight.com.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">7. Cookies and Local Storage</h2>
            <p>We use cookies and browser local storage to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Maintain your login session</li>
              <li>Remember your theme preferences (light/dark mode)</li>
              <li>Store your wishlist and cart items</li>
              <li>Improve platform performance</li>
            </ul>
            <p className="mt-2">You can manage cookie settings through your browser preferences.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">8. Data Retention</h2>
            <p>We retain your personal information for as long as your account is active or as needed to provide you services. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law. Order history and transaction records may be retained for up to 7 years for accounting and legal compliance purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">9. Children&apos;s Privacy</h2>
            <p>Our platform is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will promptly delete the information. Vendor and courier accounts require users to be at least 18 years old.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on our platform or sending you an email. Your continued use of the platform after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">11. Contact Us</h2>
            <p>For questions or concerns about this Privacy Policy or our data practices, contact us at:</p>
            <p className="mt-2">
              <strong>Green Pack Delight</strong><br />
              Email: <a href="mailto:privacy@greenpackdelight.com" className="text-green-600 dark:text-green-400 hover:underline">privacy@greenpackdelight.com</a><br />
              Phone: +234 800 GREEN PACK<br />
              Data Protection Officer: <a href="mailto:dpo@greenpackdelight.com" className="text-green-600 dark:text-green-400 hover:underline">dpo@greenpackdelight.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
