import { getPlans, getActiveEnrollments } from "@/app/actions/plans";
import PlansClient from "./PlansClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Training Plans | Workout Tracker",
  description: "Browse and enroll in structured strength training programmes like the Russian Squat Programme, 5/3/1, and GZCLP.",
};

export default async function PlansPage() {
  const [plans, activeEnrollments] = await Promise.all([
    getPlans(),
    getActiveEnrollments(),
  ]);

  return (
    <PlansClient
      plans={plans.map((p) => ({
        ...p,
        description: p.description ?? undefined,
        userId: p.userId ?? undefined,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))}
      activeEnrollments={activeEnrollments}
    />
  );
}
