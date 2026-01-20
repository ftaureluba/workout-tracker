CREATE TABLE "user_exercise_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"best_weight" integer,
	"best_volume" integer,
	"best_1rm" integer,
	"last_performed_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_exercise_metrics_user_id_exercise_id_unique" UNIQUE("user_id","exercise_id")
);
--> statement-breakpoint
ALTER TABLE "user_exercise_metrics" ADD CONSTRAINT "user_exercise_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_exercise_metrics" ADD CONSTRAINT "user_exercise_metrics_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" DROP COLUMN "last_performed_at";--> statement-breakpoint
ALTER TABLE "exercises" DROP COLUMN "best_weight";--> statement-breakpoint
ALTER TABLE "exercises" DROP COLUMN "best_volume";--> statement-breakpoint
ALTER TABLE "exercises" DROP COLUMN "best_1rm";