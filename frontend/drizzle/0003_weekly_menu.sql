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
	"user_id" text NOT NULL,
	"day" text NOT NULL,
	"context" text,
	"scope" text NOT NULL,
	"lunch_recipe_id" text,
	"dinner_recipe_id" text
);
--> statement-breakpoint
ALTER TABLE "weekly_menu" ADD CONSTRAINT "weekly_menu_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_menu_day" ADD CONSTRAINT "weekly_menu_day_lunch_recipe_id_recipe_id_fk" FOREIGN KEY ("lunch_recipe_id") REFERENCES "public"."recipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_menu_day" ADD CONSTRAINT "weekly_menu_day_dinner_recipe_id_recipe_id_fk" FOREIGN KEY ("dinner_recipe_id") REFERENCES "public"."recipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "weeklyMenu_userId_weekStart_uidx" ON "weekly_menu" USING btree ("user_id","week_start");--> statement-breakpoint
CREATE UNIQUE INDEX "weeklyMenu_id_userId_uidx" ON "weekly_menu" USING btree ("id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "weeklyMenuDay_menuId_day_uidx" ON "weekly_menu_day" USING btree ("weekly_menu_id","day");--> statement-breakpoint
ALTER TABLE "weekly_menu_day" ADD CONSTRAINT "weeklyMenuDay_menuId_userId_fk" FOREIGN KEY ("weekly_menu_id","user_id") REFERENCES "public"."weekly_menu"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_menu_day" ADD CONSTRAINT "weeklyMenuDay_lunchRecipeId_userId_fk" FOREIGN KEY ("lunch_recipe_id","user_id") REFERENCES "public"."recipe"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_menu_day" ADD CONSTRAINT "weeklyMenuDay_dinnerRecipeId_userId_fk" FOREIGN KEY ("dinner_recipe_id","user_id") REFERENCES "public"."recipe"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_menu_day" ADD CONSTRAINT "weeklyMenuDay_day_check" CHECK ("day" in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'));--> statement-breakpoint
ALTER TABLE "weekly_menu_day" ADD CONSTRAINT "weeklyMenuDay_context_check" CHECK ("context" is null or "context" in ('office', 'eatOut'));--> statement-breakpoint
ALTER TABLE "weekly_menu_day" ADD CONSTRAINT "weeklyMenuDay_scope_check" CHECK ("scope" in ('lunch', 'dinner', 'both'));
--> statement-breakpoint
CREATE FUNCTION "check_weekly_menu_day_recipe_slots"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  recipe_slot text;
BEGIN
  IF NEW."lunch_recipe_id" IS NOT NULL THEN
    SELECT "slot" INTO recipe_slot
    FROM "recipe"
    WHERE "id" = NEW."lunch_recipe_id"
    FOR SHARE;

    IF recipe_slot IS DISTINCT FROM 'lunch' THEN
      RAISE EXCEPTION 'Lunch recipe must have the lunch slot'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW."dinner_recipe_id" IS NOT NULL THEN
    SELECT "slot" INTO recipe_slot
    FROM "recipe"
    WHERE "id" = NEW."dinner_recipe_id"
    FOR SHARE;

    IF recipe_slot IS DISTINCT FROM 'dinner' THEN
      RAISE EXCEPTION 'Dinner recipe must have the dinner slot'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "weekly_menu_day_recipe_slots_trigger"
BEFORE INSERT OR UPDATE OF "lunch_recipe_id", "dinner_recipe_id"
ON "weekly_menu_day"
FOR EACH ROW
EXECUTE FUNCTION "check_weekly_menu_day_recipe_slots"();
--> statement-breakpoint
CREATE FUNCTION "prevent_recipe_slot_change_when_assigned"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."slot" IS DISTINCT FROM OLD."slot" AND EXISTS (
    SELECT 1
    FROM "weekly_menu_day"
    WHERE ("lunch_recipe_id" = OLD."id" AND NEW."slot" <> 'lunch')
       OR ("dinner_recipe_id" = OLD."id" AND NEW."slot" <> 'dinner')
  ) THEN
    RAISE EXCEPTION 'Recipe slot cannot change while assigned to a different meal';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "recipe_slot_assignment_trigger"
BEFORE UPDATE OF "slot" ON "recipe"
FOR EACH ROW
EXECUTE FUNCTION "prevent_recipe_slot_change_when_assigned"();