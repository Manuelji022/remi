CREATE TABLE "ai_menu_generation_lease" (
	"user_id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_menu_generation_lease" ADD CONSTRAINT "ai_menu_generation_lease_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;