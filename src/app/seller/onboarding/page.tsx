import { redirect } from "next/navigation";

// The vendor registration form moved to /vendor/register so it renders with
// the normal site chrome instead of the seller-dashboard sidebar layout.
// Keep this redirect for any bookmarked/old links.
export default function SellerOnboardingRedirect() {
  redirect("/vendor/register");
}
