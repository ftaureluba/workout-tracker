ALTER TABLE "workout_set" DROP CONSTRAINT "workout_set_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "workout_set" DROP CONSTRAINT "workout_set_workout_id_workouts_id_fk";
--> statement-breakpoint
ALTER TABLE "workout_set" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "workout_set" DROP COLUMN "workout_id";