CREATE TABLE "ai_menu_generation_request" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_menu_generation_request" ADD CONSTRAINT "ai_menu_generation_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aiMenuGenerationRequest_user_created_idx" ON "ai_menu_generation_request" USING btree ("user_id","created_at");