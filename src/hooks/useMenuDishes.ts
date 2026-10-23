import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useMenuDishes(mealType?: string) {
  return useQuery({
    queryKey: ["menu-dishes", mealType],
    queryFn: async () => {
      let q = supabase.from("menu_dishes").select("*").eq("is_active", true).order("name");
      if (mealType) q = q.eq("meal_type", mealType);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertMenuDish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dish: any) => {
      if (dish.id) {
        const { id, ...rest } = dish;
        const { data, error } = await supabase.from("menu_dishes").update(rest).eq("id", id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from("menu_dishes").insert(dish).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-dishes"] });
      toast({ title: "Dish saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteMenuDish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_dishes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-dishes"] });
      toast({ title: "Dish removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDishIngredients(dishId: string | null) {
  return useQuery({
    queryKey: ["dish-ingredients", dishId],
    enabled: !!dishId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_dish_ingredients")
        .select("*, ingredients(name, unit, unit_cost, category)")
        .eq("dish_id", dishId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertDishIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: any) => {
      if (item.id) {
        const { id, ...rest } = item;
        const { data, error } = await supabase.from("menu_dish_ingredients").update(rest).eq("id", id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from("menu_dish_ingredients").insert(item).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dish-ingredients"] });
      toast({ title: "Ingredient mapping saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteDishIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_dish_ingredients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dish-ingredients"] });
      toast({ title: "Ingredient removed from dish" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
