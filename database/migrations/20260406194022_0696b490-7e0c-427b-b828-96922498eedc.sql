
-- Create menu_dishes table
CREATE TABLE public.menu_dishes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_dishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_menu_dishes" ON public.menu_dishes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_menu_dishes" ON public.menu_dishes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));
CREATE POLICY "admin_update_menu_dishes" ON public.menu_dishes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));
CREATE POLICY "admin_delete_menu_dishes" ON public.menu_dishes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_menu_dishes_updated_at BEFORE UPDATE ON public.menu_dishes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create menu_dish_ingredients table
CREATE TABLE public.menu_dish_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dish_id UUID NOT NULL REFERENCES public.menu_dishes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  qty_per_person NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dish_id, ingredient_id)
);

ALTER TABLE public.menu_dish_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_dish_ingredients" ON public.menu_dish_ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_dish_ingredients" ON public.menu_dish_ingredients FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));
CREATE POLICY "admin_update_dish_ingredients" ON public.menu_dish_ingredients FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));
CREATE POLICY "admin_delete_dish_ingredients" ON public.menu_dish_ingredients FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));

-- Add menu_dish_id to weekly_menu_config
ALTER TABLE public.weekly_menu_config ADD COLUMN IF NOT EXISTS menu_dish_id UUID REFERENCES public.menu_dishes(id) ON DELETE SET NULL;

-- Seed breakfast dishes
INSERT INTO public.menu_dishes (name, meal_type, description) VALUES
  ('Parota & Egg Kurma', 'Breakfast', 'Soft parota served with spiced egg kurma'),
  ('Parota & Chicken Kurma', 'Breakfast', 'Soft parota with rich chicken kurma'),
  ('Egg Parota', 'Breakfast', 'Parota stuffed with scrambled egg'),
  ('Aloo Parota', 'Breakfast', 'Parota stuffed with spiced potato filling'),
  ('Egg Omelette & Toast', 'Breakfast', 'Fluffy omelette with toasted bread'),
  ('Mixed Vegetables & Chapati', 'Breakfast', 'Seasonal vegetables with fresh chapati'),
  ('Bread & Cheese', 'Breakfast', 'Sliced bread with cheese spread'),
  ('Egg Dosa', 'Breakfast', 'Crispy dosa topped with egg'),
  ('Dosa with Chutney & Sambar', 'Breakfast', 'Plain dosa served with coconut chutney and sambar'),
  ('Falafel Wrap', 'Breakfast', 'Crispy falafel in pita with tahini'),
  ('Croissant & Jam', 'Breakfast', 'Butter croissant with jam and butter'),
  ('Idli & Vada', 'Breakfast', 'Steamed idli with crispy vada and sambar'),
  ('Puri & Bhaji', 'Breakfast', 'Deep fried puri with potato bhaji'),
  ('Upma & Chutney', 'Breakfast', 'Semolina upma with coconut chutney'),
  ('Poha', 'Breakfast', 'Flattened rice with peanuts and spices'),
  ('French Toast', 'Breakfast', 'Egg-dipped bread pan fried with cinnamon'),
  ('Pancakes & Honey', 'Breakfast', 'Fluffy pancakes with honey drizzle'),
  ('Ful Medames', 'Breakfast', 'Traditional fava bean dish with olive oil and lemon');

-- Seed lunch dishes
INSERT INTO public.menu_dishes (name, meal_type, description) VALUES
  ('Chicken Biryani', 'Lunch', 'Aromatic basmati rice with spiced chicken'),
  ('Mutton Biryani', 'Lunch', 'Fragrant rice cooked with tender mutton'),
  ('Veg Biryani', 'Lunch', 'Basmati rice with mixed vegetables and spices'),
  ('Fish Fry Rice', 'Lunch', 'Fried rice served with crispy fish fry'),
  ('Fish Curry & Rice', 'Lunch', 'Spiced fish curry served with steamed rice'),
  ('Mutton Mandi', 'Lunch', 'Traditional Arabian mutton mandi'),
  ('Chicken Mandi', 'Lunch', 'Arabian style chicken mandi with special rice'),
  ('Veg Pulao', 'Lunch', 'Lightly spiced vegetable pulao'),
  ('Chicken Fried Rice', 'Lunch', 'Wok-tossed rice with chicken and vegetables'),
  ('Dal Rice', 'Lunch', 'Yellow dal served with steamed rice'),
  ('Egg Biryani', 'Lunch', 'Fragrant rice with boiled egg masala'),
  ('Chicken Curry & Rice', 'Lunch', 'Spiced chicken curry with steamed rice'),
  ('Mutton Curry & Rice', 'Lunch', 'Rich mutton curry with steamed rice'),
  ('Prawn Biryani', 'Lunch', 'Spiced rice with prawns'),
  ('Kabsa', 'Lunch', 'Traditional Saudi spiced rice with chicken'),
  ('Chicken Shawarma Rice', 'Lunch', 'Shawarma flavored chicken with rice'),
  ('Lamb Chops & Rice', 'Lunch', 'Grilled lamb chops served with flavored rice'),
  ('Paneer Butter Masala & Naan', 'Lunch', 'Creamy paneer curry with fresh naan');

-- Seed dinner dishes
INSERT INTO public.menu_dishes (name, meal_type, description) VALUES
  ('Parota & Chicken Curry', 'Dinner', 'Layered parota with spiced chicken curry'),
  ('Parota & Egg Curry', 'Dinner', 'Layered parota with boiled egg curry'),
  ('Chapati & Dal Fry', 'Dinner', 'Whole wheat chapati with tempered dal'),
  ('Chapati & Paneer Masala', 'Dinner', 'Chapati with cottage cheese masala'),
  ('Naan & Butter Chicken', 'Dinner', 'Tandoor naan with creamy butter chicken'),
  ('Naan & Mutton Rogan Josh', 'Dinner', 'Naan bread with Kashmiri mutton curry'),
  ('Fried Rice & Chilli Chicken', 'Dinner', 'Fried rice with spicy chilli chicken'),
  ('Rice & Fish Curry', 'Dinner', 'Steamed rice with coastal fish curry'),
  ('Roti & Mixed Vegetable Curry', 'Dinner', 'Whole wheat roti with mixed veg curry'),
  ('Pasta & Garlic Bread', 'Dinner', 'Penne pasta with marinara and garlic bread'),
  ('Chicken Soup & Bread Roll', 'Dinner', 'Clear chicken soup with fresh bread rolls'),
  ('Egg Fried Rice & Manchurian', 'Dinner', 'Egg fried rice with veg manchurian'),
  ('Biryani & Raita', 'Dinner', 'Chicken biryani with cucumber raita'),
  ('Shawarma Wrap', 'Dinner', 'Chicken shawarma in Arabic bread'),
  ('Grilled Chicken & Salad', 'Dinner', 'Herb grilled chicken with fresh salad'),
  ('Mutton Keema & Parota', 'Dinner', 'Minced mutton curry with layered parota');
