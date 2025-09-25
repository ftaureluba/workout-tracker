ALTER TABLE "workout_exercises" ADD COLUMN "order" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD COLUMN "planned_sets" integer;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD COLUMN "planned_reps" integer;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD COLUMN "planned_weight" integer;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD COLUMN "rest_time_seconds" integer;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD COLUMN "is_superset" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD COLUMN "superset_group" integer;