import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    })
  : null;

function stripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer,
): string | null {
  return typeof customer === "string" ? customer : customer?.id ?? null;
}

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

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch (e) {
    console.error("Supabase service role not configured:", e);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

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

        // Update user profile to Pro (service role bypasses RLS; anon client has no auth.uid() here)
        const { data: updatedRows, error } = await supabase
          .from("profiles")
          .update({
            plan: "pro",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            current_period_end: periodEnd,
            subscription_cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId)
          .select("id");

        if (error) {
          console.error(`Error updating user profile: ${error.message}`);
          return NextResponse.json({ error: "Profile update failed" }, { status: 500 });
        }
        if (!updatedRows?.length) {
          console.error(`No profile row for user id ${userId}`);
          return NextResponse.json({ error: "Profile not found" }, { status: 500 });
        }
        console.log(`User ${userId} upgraded to Pro`);
        break;
      }

      case "customer.subscription.updated": {
        // Add `customer.subscription.updated` to your Stripe webhook (same endpoint).
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = stripeCustomerId(subscription.customer);
        if (!customerId) break;

        const periodEndTs = subscription.items.data[0]?.current_period_end;
        const patch: {
          subscription_cancel_at_period_end: boolean;
          stripe_subscription_id: string;
          updated_at: string;
          current_period_end?: string;
        } = {
          subscription_cancel_at_period_end: subscription.cancel_at_period_end,
          stripe_subscription_id: subscription.id,
          updated_at: new Date().toISOString(),
        };
        if (periodEndTs != null) {
          patch.current_period_end = new Date(periodEndTs * 1000).toISOString();
        }

        const { data: synced, error } = await supabase
          .from("profiles")
          .update(patch)
          .eq("stripe_customer_id", customerId)
          .select("id");

        if (error) {
          console.error(`Error syncing subscription: ${error.message}`);
          return NextResponse.json({ error: "Profile update failed" }, { status: 500 });
        }
        if (synced?.length) {
          console.log(
            `Synced subscription for ${customerId} (cancel_at_period_end=${subscription.cancel_at_period_end})`,
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = stripeCustomerId(subscription.customer);
        if (!customerId) break;

        // Revert user to free plan
        const { data: downgraded, error } = await supabase
          .from("profiles")
          .update({
            plan: "free",
            stripe_subscription_id: null,
            current_period_end: null,
            subscription_cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId)
          .select("id");

        if (error) {
          console.error(`Error downgrading user profile: ${error.message}`);
          return NextResponse.json({ error: "Profile update failed" }, { status: 500 });
        }
        if (!downgraded?.length) {
          console.warn(`No profile for stripe_customer_id ${customerId}`);
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
