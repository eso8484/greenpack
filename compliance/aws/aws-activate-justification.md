# AWS Activate — written justification of use case

Reply to the AWS Activate Team's request for substantiation (Case **01240028**).
Attach the CAC Certificate of Incorporation to the same email thread — AWS asks
explicitly that you **not** submit another form, as that delays the review.

---

## Cover email

**To:** the AWS Activate Team (reply to the existing thread)
**Subject:** Re: AWS Activate Credit Application — Case 01240028 (Green Pack Delight)
**Attach:** Certificate of Incorporation (CAC), and this justification as a PDF

---

Hello Austin,

Thank you for your response. Our Certificate of Incorporation is attached to this
thread, as requested. Our details are:

| | |
|---|---|
| AWS Activate Case | 01240028 |
| AWS Account ID | 587628268274 |
| Registered entity | Green Pack Delight |
| Jurisdiction | Federal Republic of Nigeria (Corporate Affairs Commission) |
| Registered contact | paul@greenpackdelight.com |

Our written justification of use case follows below. It is also attached as a PDF.

---

## Written justification of use case

### 1. What Green Pack Delight is

Green Pack Delight is a Nigerian marketplace that connects customers to local
service and retail businesses — laundries, barbershops, phone-repair shops,
tailors, food vendors and similar — and coordinates delivery through independent
couriers.

Every vendor listing is built around a **video showcase**. Vendors publish video,
a service and product catalogue, and contact details. Customers discover,
compare, order and pay through the platform, and a courier is dispatched to
complete the delivery. We handle vendor onboarding and identity verification,
marketplace payments through licensed Nigerian payment processors, and customer
support.

The business is registered with the Corporate Affairs Commission of Nigeria and
operates under the Nigeria Data Protection Regulation (NDPR).

### 2. Where we are today

We are pre-scale and currently run on a managed stack: a Next.js application, a
managed PostgreSQL platform providing database, authentication and object
storage, and third-party SMS and payment providers. Our Android application is
built and preparing for Google Play release.

That stack let us reach the market quickly, and we are not seeking to replace it
wholesale. We are asking for credits to move **two specific workloads** onto AWS
at the point where moving is cheap — rather than after we have scaled on
infrastructure we would then have to leave.

Those two workloads are media delivery and AI inference. They are the two lines
that grow fastest with the business, and they are the two where AWS is the
better home.

### 3. What we will use AWS Activate Credits for

#### Phase 1 — Media storage, transcoding and delivery

Every vendor listing carries video, uploaded from a phone. Today those files sit
in a general-purpose object store and are delivered with egress billed per
gigabyte. Media is already the largest and fastest-growing component of our
infrastructure cost, and it scales directly with vendor count rather than with
revenue — which makes it the single line most worth engineering properly before
growth.

We will store originals in **Amazon S3**, transcode uploads into adaptive-bitrate
HLS renditions with **AWS Elemental MediaConvert**, and deliver them through
**Amazon CloudFront**. Credits will cover S3 storage, MediaConvert transcoding
minutes and CloudFront egress through our first year of vendor growth.

#### Phase 2 — Frontier model inference on Amazon Bedrock

We operate an in-app support assistant that answers customer questions and hands
anything complex to a human agent. It currently routes through a third-party
model aggregator.

We intend to move this to **Amazon Bedrock**, specifically to run frontier models
including **Claude Opus 5, Claude Sonnet 5 and Claude Fable 5.1**. Our reasons
are both capability and governance:

- **Capability.** Frontier models with a 1M-token context window let a small team
  deliver support quality that would otherwise require hiring ahead of revenue.
  This is the single highest-leverage AI budget we have.
- **Governance.** Our support flow touches vendor onboarding records and order
  data. We would rather that inference ran inside our own AWS account, under one
  data-processing relationship and one set of access controls, than through an
  intermediary outside our account boundary. This matters to us because we process
  vendor identity data under NDPR.

We are specifically requesting that credits be applicable to **Amazon Bedrock**,
as access to frontier models is a primary reason we are applying.

#### Phase 3 — Moderation, identity documents and security

- **Amazon Rekognition** to screen vendor-uploaded video and imagery for
  prohibited content before publication. A marketplace with user-generated media
  needs automated moderation, not manual review.
- **Amazon S3 with SSE-KMS, versioning and Object Lock** as the retention store
  for CAC certificates and NIN/BVN verification records, which we are required to
  hold and be able to produce.
- **AWS WAF** in front of CloudFront. We handle payments and personal data; this
  is a baseline we intend to meet before public launch, not after an incident.
- **Amazon SES** for transactional email, and **AWS Lambda** for payment-processor
  webhooks and the order/delivery state machine.

### 4. Why AWS specifically

We evaluated this as an infrastructure decision rather than a cost decision, and
AWS won on three points:

1. **The media stack is unmatched for what we actually need** — S3 with
   MediaConvert and CloudFront is a complete path from "vendor uploads a phone
   video" to "customer watches it on a slow connection," and it is priced so that
   delivery cost falls as we scale rather than rising.
2. **Bedrock gives us frontier models inside our own account boundary**, which no
   aggregator can offer. For a platform handling identity documents, that is worth
   more than a marginal price difference.
3. **One account, one bill, one access model** across storage, inference,
   moderation and security — which is what lets a small team operate this without
   a dedicated platform engineer.

### 5. Current scale

> Fill in only what you can evidence. Do not overstate — Activate credits are
> reviewed, and inflated figures are the most common reason for rejection.

| Metric | Value |
|---|---|
| Vendors listed | [ ] |
| Registered customers | [ ] |
| Orders processed to date | [ ] |
| Media stored today | [ ] GB |
| Projected media at 12 months | [ ] GB |
| Team size | [ ] |
| Funding stage | Pre-seed / bootstrapped |

### 6. What the credits change

The credits cover the migration window. That window is the one period where a
startup runs two infrastructures at once and can least afford to — which is
precisely why it is usually deferred, and why the technical debt compounds.

With Activate Credits we migrate media and inference to AWS now, while the
platform is small and the migration is a contained piece of work, instead of
attempting it later under load. We are happy to share our architecture plan,
usage projections, or a walkthrough of the platform at any point in the review.

Thank you for considering our application.

Warm regards,

**[NAME]**
For Green Pack Delight
paul@greenpackdelight.com / support@greenpackdelight.com
[PHONE]
www.greenpackdelight.com

---

## Before you send

### A. Things to change in the email itself

Only three. Everything else in the draft goes out as written.

- [ ] **Attach the CAC Certificate of Incorporation** to the existing thread. Do
      not open a new application form.
- [ ] **Fill in section 5 honestly.** Leave a row blank rather than guess.
- [ ] **Decide who signs.** The thread is addressed to paul@greenpackdelight.com.
      Your Paystack compliance correspondence was signed by Innocent. Use one
      consistent signatory for the company.

### B. Things to know — these do NOT change the email

Nothing in the draft asks for a credit amount, and it should stay that way. AWS
decides the tier from the application form and your eligibility, not from what you
request in the email, so there is no line for a tier and no line for a figure.
These two are context, not edits:

- **Which tier you are actually in the running for.** Activate **Founders** is
  $1,000 self-serve (some startups qualify for up to $5,000). Activate
  **Portfolio** is up to $200,000 — but it **requires an Organization ID from an
  Activate Provider** (accelerator, angel investor or VC). If you applied without
  a provider Org ID, Portfolio is not available to you no matter what you write,
  and this application is a Founders application. Worth knowing so the outcome is
  not a surprise; it requires no change to the email.

  > **Optional, only if you DID apply with a provider Org ID.** Add one line under
  > the details table so the reviewer can match the application to the provider:
  >
  > `Activate Provider Org ID: [ORG ID]`
  >
  > If you did not apply with one, add nothing.

- **Your AWS account must be on the Paid Tier plan.** Activate eligibility
  requires it. If account 587628268274 is still on the free plan, upgrade it
  before the review closes — this is a technicality that fails applications on
  its own, and it is not something the email can fix.

### C. Presentation

- [ ] **Attach the justification as a PDF** as well as pasting it in the body, so
      it survives forwarding between reviewers.

