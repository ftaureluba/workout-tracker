import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workoutSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ session_id: string }> }
) {
    const sessionUser = await auth();
    if (!sessionUser?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { session_id } = await params;

    try {
        const session = await db.query.workoutSessions.findFirst({
            where: eq(workoutSessions.id, session_id),
            with: {
                workout: true,
                sessionExercises: {
                    with: {
                        exercise: true,
                        sets: true,
                    },
                    orderBy: (se, { asc }) => [asc(se.order)],
                },
            },
        });

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        if (session.userId !== sessionUser.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        return NextResponse.json(session, { status: 200 });
    } catch (error) {
        console.error("Error fetching session:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
