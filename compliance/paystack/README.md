# Green Pack Delight Paystack Compliance Pack

Prepared: 29 August 2026

This folder contains a draft response and policy documents prepared from the
GreenPack codebase and the two documents supplied by the business owner.

## Before sending or publishing

The business owner must confirm every item marked `[CONFIRM]`. In particular:

1. The actual vendor KYC documents collected and the person/team responsible
   for checking them.
2. Whether every vendor premises is physically inspected before activation.
3. Any category-specific return exceptions the business is operationally able
   to honour.
4. The legal business name, registered address, and telephone
   number, and website URLs.
5. The exact address that will be used on Paystack and the matching proof of
   address dated within the last six months.

## Codebase findings

- Customers pay GreenPack through Paystack.
- A Paystack subaccount is required for each vendor before checkout.
- Paystack split settlement sends the product/service portion (97% of the
  subtotal) to the vendor subaccount and retains the 3% platform fee plus the
  delivery fee on GreenPack's main Paystack account.
- Courier fees are transferred to a Paystack transfer recipient after the
  delivery is marked delivered.
- GreenPack has no user or vendor wallet and no wallet-to-wallet transfer
  feature.
- Vendor email is verified by a single-use OTP. The current application
  collects personal and shop details, but does not currently collect or verify
  government ID or CAC documents in code.
- Courier applications collect an 11-digit NIN, vehicle type, guarantor name
  and phone, and require manual admin approval. The code records approval but
  does not integrate with an external NIN verification provider.
- A customer can cancel a pending order. The code has a `refunded` payment
  state but does not currently include an automated Paystack refund endpoint.

## Confirmed business decisions

- Vendor KYC will require either NIN or BVN plus a business certificate such
  as a CAC certificate and should be automated wherever source services allow.
- Delivery issues must be reported within 24 hours.
- Other complaints should normally be resolved within 7 days, with serious or
  complex matters allowed up to 10 business days.
- Approved refunds will be submitted through Paystack within 1-2 business
  days; bank posting time may be additional.
- Public contacts are contact@greenpackdelight.com and
  support@greenpackdelight.com.
- The Paystack proof-of-address mismatch has been resolved.
- The correct domain is greenpackdelight.com. Git history shows that
  greenparkdelight.com was an earlier typo.

These documents are operational/legal drafts, not legal advice. Nigerian
counsel should review them before publication.
