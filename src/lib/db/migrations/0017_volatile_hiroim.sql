ALTER TABLE "workout_set" DROP CONSTRAINT "workout_set_session_exercise_id_session_exercises_id_fk";
--> statement-breakpoint
ALTER TABLE "workout_set" ADD CONSTRAINT "workout_set_session_exercise_id_session_exercises_id_fk" FOREIGN KEY ("session_exercise_id") REFERENCES "public"."session_exercises"("id") ON DELETE cascade ON UPDATE no action;