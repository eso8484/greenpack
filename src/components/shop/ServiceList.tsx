import ServiceCard from "./ServiceCard";
import type { Service } from "@/types";

interface ServiceListProps {
  services: Service[];
  shopName: string;
}

export default function ServiceList({ services, shopName }: ServiceListProps) {
  if (services.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Services Offered
      </h2>
      <div className="space-y-3">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} shopName={shopName} />
        ))}
      </div>
    </section>
  );
}
