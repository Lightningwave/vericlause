import { NextResponse } from "next/server";
import { getUserPlan } from "@/lib/billing/access";
import { getAuthenticatedUser } from "@/lib/services/db";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await getUserPlan(user.id);

  return NextResponse.json(plan);
}
