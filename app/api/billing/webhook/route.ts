import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    })
  : null;

export async function POST(req: Request) {
  if (!stripe || !webhookSecret) {
    console.error("Stripe or Webhook secret not configured");
    return NextResponse.json({ error: "Configuration missing" }, { status: 500 });
  }

  const body = await req.text();
  const signature = headers().get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createClient();

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        // Fetch subscription; basil API exposes current_period_end on subscription items
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEndTs = subscription.items.data[0]?.current_period_end;
        if (periodEndTs == null) {
          console.error("No current_period_end on subscription items");
          break;
        }
        const periodEnd = new Date(periodEndTs * 1000).toISOString();

        if (!userId) {
          console.error("No userId found in session metadata");
          break;
        }

        // Update user profile to Pro
        const { error } = await supabase
          .from("profiles")
          .update({
            plan: "pro",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (error) {
          console.error(`Error updating user profile: ${error.message}`);
        } else {
          console.log(`User ${userId} upgraded to Pro`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Revert user to free plan
        const { error } = await supabase
          .from("profiles")
          .update({
            plan: "free",
            stripe_subscription_id: null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          console.error(`Error downgrading user profile: ${error.message}`);
        } else {
          console.log(`Customer ${customerId} reverted to free tier`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
