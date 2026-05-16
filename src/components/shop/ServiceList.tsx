import ServiceCard from "./ServiceCard";
import type { Service } from "@/types";

interface ServiceListProps {
  services: Service[];
  shopName: string;
}

export default function ServiceList({ services, shopName }: ServiceListProps) {
  return (
    <section id="services" className="scroll-mt-24">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Services Offered
      </h2>
      {services.length === 0 ? (
        <div className="text-center py-8 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This shop hasn&apos;t added any services yet. Use the contact buttons above to reach out.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} shopName={shopName} />
          ))}
        </div>
      )}
    </section>
  );
}
