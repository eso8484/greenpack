import Link from "next/link";

const benefits = [
  { icon: "💰", title: "Earn Extra Income", desc: "Make ₦2,000–₦8,000+ daily delivering for local businesses" },
  { icon: "🕐", title: "Flexible Hours", desc: "Work whenever you want — morning, afternoon, or evening" },
  { icon: "🏍️", title: "Use Your Vehicle", desc: "Work with your bike, car, or bicycle" },
  { icon: "📱", title: "Easy Dashboard", desc: "Accept jobs and track earnings from your phone" },
];

const howItWorks = [
  { step: "1", title: "Customer places order", desc: "Customer requests pickup & delivery at checkout" },
  { step: "2", title: "You accept the job", desc: "Nearby couriers are notified — first to accept gets the job" },
  { step: "3", title: "Pick up from customer", desc: "Go to the customer's address and collect the item" },
  { step: "4", title: "Deliver to shop", desc: "Drop off the item at the listed shop/vendor" },
  { step: "5", title: "Return completed order", desc: "Pick up finished order from shop, return to customer" },
  { step: "6", title: "Get paid", desc: "Earnings added to your wallet instantly after completion" },
];

export default function BecomeCourierPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full text-sm font-semibold mb-4">
          <span className="material-symbols-outlined text-base">local_shipping</span>
          Become a Courier
        </div>
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">
          Earn Money Delivering <br />
          <span className="text-green-500">for Local Businesses</span>
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Join the GreenPack courier network. Pick up items from customers,
          deliver to shops, and return completed orders — all on your schedule.
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        {benefits.map((b) => (
          <div
            key={b.title}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6"
          >
            <span className="text-3xl mb-3 block">{b.icon}</span>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">{b.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{b.desc}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 mb-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          How GreenPack Delivery Works
        </h2>
        <div className="space-y-4">
          {howItWorks.map((item) => (
            <div key={item.step} className="flex gap-4">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                {item.step}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Earnings */}
      <div className="bg-green-500 rounded-2xl p-8 text-white mb-10">
        <h2 className="text-xl font-bold mb-4">Courier Earnings</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-black">₦600</p>
            <p className="text-sm opacity-80">Short distance (&lt;3km)</p>
          </div>
          <div>
            <p className="text-2xl font-black">₦1,200</p>
            <p className="text-sm opacity-80">Medium (3–8km)</p>
          </div>
          <div>
            <p className="text-2xl font-black">₦2,400</p>
            <p className="text-sm opacity-80">Long distance (8km+)</p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link
          href="/courier/register"
          className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-10 rounded-xl text-lg shadow-lg shadow-green-500/20 transition-all"
        >
          Apply Now — It&apos;s Free
        </Link>
        <p className="text-sm text-gray-400 mt-3">Takes less than 5 minutes</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          Already a courier?{" "}
          <Link
            href="/login?redirect=/courier/dashboard"
            className="text-green-600 dark:text-green-400 font-semibold hover:underline"
          >
            Log in to your dashboard →
          </Link>
        </p>
      </div>
    </div>
  );
}
