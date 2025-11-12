CREATE TABLE "session_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_session_id" uuid NOT NULL,
	"exercise_id" uuid,
	"order" integer,
	"is_superset" boolean DEFAULT false,
	"superset_group" integer,
	"exercise_name" text
);
--> statement-breakpoint
ALTER TABLE "workout_set" ALTER COLUMN "exercise_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_set" ALTER COLUMN "workout_session_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_set" ADD COLUMN "session_exercise_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_workout_session_id_workout_sessions_id_fk" FOREIGN KEY ("workout_session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_set" ADD CONSTRAINT "workout_set_session_exercise_id_session_exercises_id_fk" FOREIGN KEY ("session_exercise_id") REFERENCES "public"."session_exercises"("id") ON DELETE no action ON UPDATE no action;