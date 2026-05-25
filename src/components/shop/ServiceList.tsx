import ServiceCard from "./ServiceCard";
import type { Service } from "@/types";

interface ServiceListProps {
  services: Service[];
  shopName: string;
}

export default function ServiceList({ services, shopName }: ServiceListProps) {
  return (
    <section id="services" className="scroll-mt-24">
      <div className="mb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider mb-2">
          <span className="material-symbols-outlined text-[14px] fill-1">design_services</span>
          Services
        </span>
        <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          Services offered
        </h2>
      </div>
      {services.length === 0 ? (
        <div className="text-center py-10 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
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
