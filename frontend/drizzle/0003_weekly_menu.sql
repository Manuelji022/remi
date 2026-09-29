CREATE TABLE "weekly_menu" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"week_start" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_menu_day" (
	"id" text PRIMARY KEY NOT NULL,
	"weekly_menu_id" text NOT NULL,
	"day" text NOT NULL,
	"context" text,
	"scope" text NOT NULL,
	"lunch_recipe_id" text,
	"dinner_recipe_id" text
);
--> statement-breakpoint
ALTER TABLE "weekly_menu" ADD CONSTRAINT "weekly_menu_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_menu_day" ADD CONSTRAINT "weekly_menu_day_weekly_menu_id_weekly_menu_id_fk" FOREIGN KEY ("weekly_menu_id") REFERENCES "public"."weekly_menu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_menu_day" ADD CONSTRAINT "weekly_menu_day_lunch_recipe_id_recipe_id_fk" FOREIGN KEY ("lunch_recipe_id") REFERENCES "public"."recipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_menu_day" ADD CONSTRAINT "weekly_menu_day_dinner_recipe_id_recipe_id_fk" FOREIGN KEY ("dinner_recipe_id") REFERENCES "public"."recipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "weeklyMenu_userId_weekStart_uidx" ON "weekly_menu" USING btree ("user_id","week_start");--> statement-breakpoint
CREATE UNIQUE INDEX "weeklyMenuDay_menuId_day_uidx" ON "weekly_menu_day" USING btree ("weekly_menu_id","day");