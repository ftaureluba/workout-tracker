// app/dashboard/page.tsx (SIMPLIFIED)
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboardClient";
import type { Workout } from "@/lib/types";
import { cookies } from "next/headers";

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const response = await fetch(`/api/dashboard`, {
    cache: "no-store",
    headers: {
      Cookie: cookieHeader, 
    },
  });
  console.log("Response status:", response.status, response);
  const workouts: Workout[] = await response.json();

  return <DashboardClient workouts={workouts} userId={session.user.id} />;
}