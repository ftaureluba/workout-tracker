ALTER TABLE "exercises" ADD COLUMN "body_parts" text[] DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "equipment" text[] DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "movement_type" text DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "movement_pattern" text DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "last_performed_at" timestamp;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "best_weight" integer;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "best_volume" integer;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "best_1rm" integer;