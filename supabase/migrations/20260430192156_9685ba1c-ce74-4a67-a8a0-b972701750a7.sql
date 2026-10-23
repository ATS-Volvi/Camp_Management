-- Dedupe meal_order_items across all cycles: keep oldest per (employee, meal_date, meal_type)
WITH ranked AS (
  SELECT moi.id, ROW_NUMBER() OVER (
    PARTITION BY mo.employee_id, moi.meal_date, moi.meal_type 
    ORDER BY moi.created_at ASC, moi.id ASC
  ) rn
  FROM meal_order_items moi
  JOIN meal_orders mo ON mo.id = moi.meal_order_id
)
DELETE FROM meal_order_items WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Clean up orphan meal_orders that now have no items
DELETE FROM meal_orders mo
WHERE NOT EXISTS (SELECT 1 FROM meal_order_items moi WHERE moi.meal_order_id = mo.id);