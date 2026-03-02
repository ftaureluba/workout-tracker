// app/dashboard/page.tsx (SIMPLIFIED)
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboardClient";
import type { Workout } from "@/lib/types";
import { cookies } from "next/headers";
import { getLastPerformedDates } from "@/app/actions/last-performance";


const baseUrl =
  process.env.AUTH_URL ??
  process.env.NEXTAUTH_URL ??
  process.env.RENDER_EXTERNAL_URL ??
  "http://localhost:3000";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const response = await fetch(`${baseUrl}/api/dashboard`, {
    cache: "no-store",
    headers: {
      Cookie: cookieHeader,
    },
  });
  console.log("Response status:", response.status, response);
  const workouts: Workout[] = await response.json();

  // Fetch "last performed" dates for all workout IDs
  const workoutIds = workouts.map((w) => w.id);
  const lastPerformedMap = await getLastPerformedDates(workoutIds);

  return <DashboardClient workouts={workouts} userId={session.user.id} lastPerformedMap={lastPerformedMap} />;
}