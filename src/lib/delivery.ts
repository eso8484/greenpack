/**
 * Builds the address JSONB nodes stored on a `deliveries` row so couriers can
 * see distance, navigate, and contact both ends without re-geocoding.
 *
 * - The customer node carries the buyer's coords (captured when they picked
 *   their address at checkout) plus their name/phone. If an older order has no
 *   coords, we geocode the typed address once here as a fallback.
 * - The shop node carries the seller's coords (top-level `shops.lat/lng`),
 *   address (from `shops.location`), name, and contact phone.
 *
 * Server-only: callers pass already-fetched rows (from whichever Supabase
 * client they use) so this stays client-agnostic.
 */

import { geocodeAddress } from "@/lib/geocode";

export interface CustomerInfoLike {
  address?: string;
  message?: string;
  fullName?: string;
  phone?: string;
  lat?: number;
  lng?: number;
}

export interface ShopRowLike {
  name?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  location?: { address?: string; city?: string } | null;
  contact?: { phone?: string } | null;
}

export interface AddressNode {
  address: string;
  instructions?: string;
  city?: string;
  lat?: number;
  lng?: number;
  name?: string;
  phone?: string;
}

export async function buildDeliveryNodes(
  customer: CustomerInfoLike,
  shopRow: ShopRowLike | null
): Promise<{ customerNode: AddressNode; shopNode: AddressNode | null }> {
  const address = customer.address || "";
  let lat = typeof customer.lat === "number" ? customer.lat : null;
  let lng = typeof customer.lng === "number" ? customer.lng : null;

  // Fallback geocode only when the order didn't carry coords (older orders).
  if ((lat == null || lng == null) && address) {
    try {
      const geo = await geocodeAddress(address);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      }
    } catch (err) {
      console.warn("buildDeliveryNodes: customer geocode failed", err);
    }
  }

  const customerNode: AddressNode = {
    address,
    instructions: customer.message || "",
    ...(lat != null && lng != null ? { lat, lng } : {}),
    ...(customer.fullName ? { name: customer.fullName } : {}),
    ...(customer.phone ? { phone: customer.phone } : {}),
  };

  let shopNode: AddressNode | null = null;
  if (shopRow) {
    const loc = shopRow.location ?? {};
    const contact = shopRow.contact ?? {};
    const sLat = shopRow.lat != null ? Number(shopRow.lat) : undefined;
    const sLng = shopRow.lng != null ? Number(shopRow.lng) : undefined;
    shopNode = {
      address: loc.address || shopRow.name || "",
      ...(loc.city ? { city: loc.city } : {}),
      ...(sLat != null && Number.isFinite(sLat) ? { lat: sLat } : {}),
      ...(sLng != null && Number.isFinite(sLng) ? { lng: sLng } : {}),
      ...(shopRow.name ? { name: shopRow.name } : {}),
      ...(contact.phone ? { phone: contact.phone } : {}),
    };
  }

  return { customerNode, shopNode };
}
