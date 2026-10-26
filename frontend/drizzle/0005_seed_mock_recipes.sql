-- Mock data for the existing local development account; never create an auth user.
-- If the account does not exist yet, skip without blocking schema migrations.
-- After db:seed-user, this file can safely be reapplied with psql -f.
DO $$
DECLARE
  mock_user_id text;
BEGIN
  SELECT "id" INTO mock_user_id
  FROM "user"
  WHERE "email" = 'manueljialt@gmail.com';

  IF mock_user_id IS NULL THEN
    RAISE NOTICE 'Mock user not found; recipes skipped. Seed the development user and reapply 0005_seed_mock_recipes.sql.';
    RETURN;
  END IF;

  WITH mock_recipes (id, name, slot, ingredients) AS (
    VALUES
      ('mock-recipe-01', 'Lemon chicken rice bowl', 'lunch', '[
        {"name":"Chicken breast","quantity":300,"unit":"g"},
        {"name":"Rice","quantity":150,"unit":"g"},
        {"name":"Broccoli","quantity":200,"unit":"g"},
        {"name":"Lemon","quantity":1,"unit":"unit"}
      ]'::jsonb),
      ('mock-recipe-02', 'Chickpea and cucumber salad', 'lunch', '[
        {"name":"Chickpeas","quantity":1,"unit":"can"},
        {"name":"Cucumber","quantity":1,"unit":"unit"},
        {"name":"Cherry tomatoes","quantity":150,"unit":"g"},
        {"name":"Olive oil","quantity":2,"unit":"tbsp"}
      ]'::jsonb),
      ('mock-recipe-03', 'Turkey avocado wrap', 'lunch', '[
        {"name":"Tortillas","quantity":2,"unit":"unit"},
        {"name":"Turkey breast","quantity":150,"unit":"g"},
        {"name":"Avocado","quantity":1,"unit":"unit"},
        {"name":"Lettuce","quantity":50,"unit":"g"}
      ]'::jsonb),
      ('mock-recipe-04', 'Tuna sweetcorn pasta salad', 'lunch', '[
        {"name":"Pasta","quantity":180,"unit":"g"},
        {"name":"Tuna","quantity":1,"unit":"can"},
        {"name":"Sweetcorn","quantity":100,"unit":"g"},
        {"name":"Greek yogurt","quantity":3,"unit":"tbsp"}
      ]'::jsonb),
      ('mock-recipe-05', 'Roasted vegetable couscous', 'lunch', '[
        {"name":"Couscous","quantity":150,"unit":"g"},
        {"name":"Zucchini","quantity":1,"unit":"unit"},
        {"name":"Bell pepper","quantity":1,"unit":"unit"},
        {"name":"Olive oil","quantity":2,"unit":"tbsp"}
      ]'::jsonb),
      ('mock-recipe-06', 'Spinach and feta omelette', 'lunch', '[
        {"name":"Eggs","quantity":3,"unit":"unit"},
        {"name":"Spinach","quantity":80,"unit":"g"},
        {"name":"Feta","quantity":50,"unit":"g"},
        {"name":"Olive oil","quantity":1,"unit":"tsp"}
      ]'::jsonb),
      ('mock-recipe-07', 'Black bean burrito bowl', 'lunch', '[
        {"name":"Black beans","quantity":1,"unit":"can"},
        {"name":"Brown rice","quantity":150,"unit":"g"},
        {"name":"Avocado","quantity":1,"unit":"unit"},
        {"name":"Tomato salsa","quantity":4,"unit":"tbsp"}
      ]'::jsonb),
      ('mock-recipe-08', 'Caprese pesto sandwich', 'lunch', '[
        {"name":"Wholegrain bread","quantity":4,"unit":"unit"},
        {"name":"Mozzarella","quantity":125,"unit":"g"},
        {"name":"Tomatoes","quantity":2,"unit":"unit"},
        {"name":"Pesto","quantity":2,"unit":"tbsp"}
      ]'::jsonb),
      ('mock-recipe-09', 'Lentil and carrot soup', 'lunch', '[
        {"name":"Red lentils","quantity":150,"unit":"g"},
        {"name":"Carrots","quantity":2,"unit":"unit"},
        {"name":"Onion","quantity":1,"unit":"unit"},
        {"name":"Vegetable stock","quantity":750,"unit":"ml"}
      ]'::jsonb),
      ('mock-recipe-10', 'Chicken hummus pita', 'lunch', '[
        {"name":"Pita bread","quantity":2,"unit":"unit"},
        {"name":"Chicken breast","quantity":250,"unit":"g"},
        {"name":"Hummus","quantity":4,"unit":"tbsp"},
        {"name":"Cucumber","quantity":1,"unit":"unit"}
      ]'::jsonb),
      ('mock-recipe-11', 'Quinoa roasted beet salad', 'lunch', '[
        {"name":"Quinoa","quantity":150,"unit":"g"},
        {"name":"Beetroot","quantity":200,"unit":"g"},
        {"name":"Goat cheese","quantity":75,"unit":"g"},
        {"name":"Walnuts","quantity":30,"unit":"g"}
      ]'::jsonb),
      ('mock-recipe-12', 'Egg and potato salad', 'lunch', '[
        {"name":"Eggs","quantity":3,"unit":"unit"},
        {"name":"Potatoes","quantity":400,"unit":"g"},
        {"name":"Green beans","quantity":150,"unit":"g"},
        {"name":"Dijon mustard","quantity":1,"unit":"tsp"}
      ]'::jsonb),
      ('mock-recipe-13', 'Peanut tofu noodle bowl', 'lunch', '[
        {"name":"Rice noodles","quantity":150,"unit":"g"},
        {"name":"Tofu","quantity":200,"unit":"g"},
        {"name":"Carrot","quantity":1,"unit":"unit"},
        {"name":"Peanut butter","quantity":2,"unit":"tbsp"},
        {"name":"Soy sauce","quantity":2,"unit":"tbsp"}
      ]'::jsonb),
      ('mock-recipe-14', 'Baked salmon with potatoes', 'dinner', '[
        {"name":"Salmon","quantity":300,"unit":"g"},
        {"name":"Potatoes","quantity":400,"unit":"g"},
        {"name":"Asparagus","quantity":200,"unit":"g"},
        {"name":"Lemon","quantity":1,"unit":"unit"}
      ]'::jsonb),
      ('mock-recipe-15', 'Spaghetti bolognese', 'dinner', '[
        {"name":"Spaghetti","quantity":200,"unit":"g"},
        {"name":"Ground beef","quantity":250,"unit":"g"},
        {"name":"Chopped tomatoes","quantity":1,"unit":"can"},
        {"name":"Onion","quantity":1,"unit":"unit"},
        {"name":"Garlic cloves","quantity":2,"unit":"unit"}
      ]'::jsonb),
      ('mock-recipe-16', 'Coconut chickpea curry', 'dinner', '[
        {"name":"Chickpeas","quantity":1,"unit":"can"},
        {"name":"Coconut milk","quantity":400,"unit":"ml"},
        {"name":"Spinach","quantity":100,"unit":"g"},
        {"name":"Curry powder","quantity":2,"unit":"tsp"},
        {"name":"Rice","quantity":150,"unit":"g"}
      ]'::jsonb),
      ('mock-recipe-17', 'Chicken fajitas', 'dinner', '[
        {"name":"Chicken breast","quantity":300,"unit":"g"},
        {"name":"Tortillas","quantity":4,"unit":"unit"},
        {"name":"Bell peppers","quantity":2,"unit":"unit"},
        {"name":"Onion","quantity":1,"unit":"unit"},
        {"name":"Smoked paprika","quantity":2,"unit":"tsp"}
      ]'::jsonb),
      ('mock-recipe-18', 'Mushroom risotto', 'dinner', '[
        {"name":"Arborio rice","quantity":180,"unit":"g"},
        {"name":"Mushrooms","quantity":250,"unit":"g"},
        {"name":"Vegetable stock","quantity":750,"unit":"ml"},
        {"name":"Parmesan","quantity":50,"unit":"g"},
        {"name":"Butter","quantity":20,"unit":"g"}
      ]'::jsonb),
      ('mock-recipe-19', 'Beef and broccoli stir-fry', 'dinner', '[
        {"name":"Beef strips","quantity":300,"unit":"g"},
        {"name":"Broccoli","quantity":250,"unit":"g"},
        {"name":"Soy sauce","quantity":3,"unit":"tbsp"},
        {"name":"Ginger","quantity":15,"unit":"g"},
        {"name":"Rice","quantity":150,"unit":"g"}
      ]'::jsonb),
      ('mock-recipe-20', 'Vegetable and lentil lasagna', 'dinner', '[
        {"name":"Lasagna sheets","quantity":180,"unit":"g"},
        {"name":"Cooked lentils","quantity":1,"unit":"can"},
        {"name":"Zucchini","quantity":1,"unit":"unit"},
        {"name":"Tomato passata","quantity":400,"unit":"ml"},
        {"name":"Ricotta","quantity":200,"unit":"g"}
      ]'::jsonb),
      ('mock-recipe-21', 'Garlic shrimp linguine', 'dinner', '[
        {"name":"Linguine","quantity":200,"unit":"g"},
        {"name":"Shrimp","quantity":250,"unit":"g"},
        {"name":"Garlic cloves","quantity":3,"unit":"unit"},
        {"name":"Olive oil","quantity":2,"unit":"tbsp"},
        {"name":"Lemon","quantity":1,"unit":"unit"}
      ]'::jsonb),
      ('mock-recipe-22', 'Sweet potato black bean chili', 'dinner', '[
        {"name":"Sweet potato","quantity":300,"unit":"g"},
        {"name":"Black beans","quantity":1,"unit":"can"},
        {"name":"Chopped tomatoes","quantity":1,"unit":"can"},
        {"name":"Onion","quantity":1,"unit":"unit"},
        {"name":"Ground cumin","quantity":2,"unit":"tsp"}
      ]'::jsonb),
      ('mock-recipe-23', 'Honey mustard chicken traybake', 'dinner', '[
        {"name":"Chicken thighs","quantity":400,"unit":"g"},
        {"name":"Carrots","quantity":3,"unit":"unit"},
        {"name":"Potatoes","quantity":300,"unit":"g"},
        {"name":"Honey","quantity":1,"unit":"tbsp"},
        {"name":"Dijon mustard","quantity":1,"unit":"tbsp"}
      ]'::jsonb),
      ('mock-recipe-24', 'Teriyaki tofu with rice', 'dinner', '[
        {"name":"Tofu","quantity":250,"unit":"g"},
        {"name":"Rice","quantity":150,"unit":"g"},
        {"name":"Broccoli","quantity":200,"unit":"g"},
        {"name":"Teriyaki sauce","quantity":3,"unit":"tbsp"},
        {"name":"Sesame seeds","quantity":1,"unit":"tsp"}
      ]'::jsonb),
      ('mock-recipe-25', 'Roasted tomato gnocchi', 'dinner', '[
        {"name":"Gnocchi","quantity":400,"unit":"g"},
        {"name":"Cherry tomatoes","quantity":250,"unit":"g"},
        {"name":"Mozzarella","quantity":125,"unit":"g"},
        {"name":"Olive oil","quantity":2,"unit":"tbsp"},
        {"name":"Basil","quantity":10,"unit":"g"}
      ]'::jsonb)
  ),
  inserted_recipes AS (
    INSERT INTO "recipe" ("id", "user_id", "name", "slot")
    SELECT id, mock_user_id, name, slot
    FROM mock_recipes
    ON CONFLICT ("id") DO NOTHING
    RETURNING "id"
  )
  INSERT INTO "recipe_ingredient" ("id", "recipe_id", "name", "quantity", "unit", "position")
  SELECT
    mock.id || '-ingredient-' || ingredient.ordinality,
    mock.id,
    ingredient.value->>'name',
    (ingredient.value->>'quantity')::double precision,
    ingredient.value->>'unit',
    (ingredient.ordinality - 1)::integer
  FROM mock_recipes AS mock
  JOIN inserted_recipes AS inserted ON inserted.id = mock.id
  CROSS JOIN LATERAL jsonb_array_elements(mock.ingredients) WITH ORDINALITY AS ingredient(value, ordinality);
END;
$$;
