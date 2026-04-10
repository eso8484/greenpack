import { redirect } from "next/navigation";

// /seller has no content of its own — always redirect to the dashboard
export default function SellerIndexPage() {
  redirect("/seller/dashboard");
}
