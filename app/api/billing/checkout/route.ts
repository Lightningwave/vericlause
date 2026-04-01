import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

if (!stripeSecretKey) {
  console.warn("Missing STRIPE_SECRET_KEY");
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    })
  : null;

const PLAN_CONFIG = {
  pro: {
    name: "VeriClause Pro",
    description: "Monthly access to VeriClause Pro plan",
    amount: 900,
  },
} as const;

function getStripeLocale(locale?: string): Stripe.Checkout.SessionCreateParams.Locale {
  switch (locale) {
    case "en":
      return "en";
    case "zh":
      return "zh";
    case "ms":
      return "ms";
    case "ta":
      return "auto";
    default:
      return "auto";
  }
}

export async function POST(request: Request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Add STRIPE_SECRET_KEY first." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      plan?: keyof typeof PLAN_CONFIG;
      locale?: string;
    };

    const selectedPlan = body.plan || "pro";

    if (!(selectedPlan in PLAN_CONFIG)) {
      return NextResponse.json(
        { error: "Invalid plan selected." },
        { status: 400 },
      );
    }

    const plan = PLAN_CONFIG[selectedPlan];
    const stripeLocale = getStripeLocale(body.locale);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
      locale: stripeLocale,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "sgd",
            recurring: {
              interval: "month",
            },
            product_data: {
              name: plan.name,
              description: plan.description,
            },
            unit_amount: plan.amount,
          },
        },
      ],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Unable to create checkout session." },
      { status: 500 },
    );
  }
}