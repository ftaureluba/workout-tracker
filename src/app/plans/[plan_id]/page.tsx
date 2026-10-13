import { getPlanDetail, getActiveEnrollments } from "@/app/actions/plans";
import PlanDetailClient from "./PlanDetailClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ plan_id: string }> }
): Promise<Metadata> {
  const { plan_id } = await params;
  const plan = await getPlanDetail(plan_id);
  if (!plan) return { title: "Plan Not Found" };
  return {
    title: `${plan.name} | Training Plans`,
    description: plan.description ?? `${plan.durationWeeks}-week strength training programme.`,
  };
}

export default async function PlanDetailPage(
  { params }: { params: Promise<{ plan_id: string }> }
) {
  const { plan_id } = await params;
  const [plan, activeEnrollments] = await Promise.all([
    getPlanDetail(plan_id),
    getActiveEnrollments(),
  ]);

  if (!plan) notFound();

  const alreadyEnrolled = activeEnrollments.some(
    (e) => e.plan.id === plan_id
  );

  return (
    <PlanDetailClient
      plan={plan}
      alreadyEnrolled={alreadyEnrolled}
    />
  );
}
