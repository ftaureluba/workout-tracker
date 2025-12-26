CREATE TABLE "push_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"fire_at" timestamp NOT NULL,
	"payload" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "exercises" ALTER COLUMN "movement_type" SET DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE "exercises" ALTER COLUMN "movement_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ALTER COLUMN "movement_pattern" SET DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE "exercises" ALTER COLUMN "movement_pattern" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "push_jobs" ADD CONSTRAINT "push_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;