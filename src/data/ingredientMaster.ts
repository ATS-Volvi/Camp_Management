/**
 * Master ingredient list derived from all standard dish recipes.
 * Used for auto-populating the Ingredient Master database.
 */

export interface MasterIngredient {
    name: string;
    unit: string;
    category: string;
    unit_cost: number;   // Estimated SAR cost per unit
    reorder_level: number;
}

export const MASTER_INGREDIENTS: MasterIngredient[] = [
    // ================== RICE & GRAINS ==================
    { name: "Basmati Rice", unit: "kg", category: "Rice & Grains", unit_cost: 6, reorder_level: 50 },
    { name: "Semolina", unit: "kg", category: "Rice & Grains", unit_cost: 5, reorder_level: 10 },
    { name: "Wheat Flour", unit: "kg", category: "Rice & Grains", unit_cost: 4, reorder_level: 20 },
    { name: "Rice Batter", unit: "kg", category: "Rice & Grains", unit_cost: 5, reorder_level: 10 },
    { name: "Dosa Batter", unit: "kg", category: "Rice & Grains", unit_cost: 5, reorder_level: 10 },
    { name: "Flattened Rice", unit: "kg", category: "Rice & Grains", unit_cost: 6, reorder_level: 5 },
    { name: "Pasta", unit: "kg", category: "Rice & Grains", unit_cost: 8, reorder_level: 10 },
    { name: "Corn Flour", unit: "kg", category: "Rice & Grains", unit_cost: 6, reorder_level: 5 },

    // ================== MEAT & POULTRY ==================
    { name: "Chicken", unit: "kg", category: "Meat & Poultry", unit_cost: 26, reorder_level: 30 },
    { name: "Mutton", unit: "kg", category: "Meat & Poultry", unit_cost: 60, reorder_level: 10 },
    { name: "Lamb", unit: "kg", category: "Meat & Poultry", unit_cost: 65, reorder_level: 10 },
    { name: "Fish", unit: "kg", category: "Meat & Poultry", unit_cost: 40, reorder_level: 10 },
    { name: "Prawns", unit: "kg", category: "Meat & Poultry", unit_cost: 70, reorder_level: 5 },
    { name: "Minced Meat", unit: "kg", category: "Meat & Poultry", unit_cost: 50, reorder_level: 5 },

    // ================== DAIRY & EGGS ==================
    { name: "Egg", unit: "pieces", category: "Dairy", unit_cost: 1, reorder_level: 60 },
    { name: "Milk", unit: "litres", category: "Dairy", unit_cost: 4.5, reorder_level: 10 },
    { name: "Butter", unit: "kg", category: "Dairy", unit_cost: 28, reorder_level: 5 },
    { name: "Cheese", unit: "kg", category: "Dairy", unit_cost: 45, reorder_level: 3 },
    { name: "Yogurt", unit: "kg", category: "Dairy", unit_cost: 8, reorder_level: 5 },
    { name: "Cream", unit: "litres", category: "Dairy", unit_cost: 18, reorder_level: 3 },
    { name: "Paneer", unit: "kg", category: "Dairy", unit_cost: 40, reorder_level: 3 },
    { name: "Coconut Milk", unit: "litres", category: "Dairy", unit_cost: 12, reorder_level: 5 },

    // ================== VEGETABLES ==================
    { name: "Onion", unit: "kg", category: "Vegetables", unit_cost: 3, reorder_level: 20 },
    { name: "Tomato", unit: "kg", category: "Vegetables", unit_cost: 4, reorder_level: 15 },
    { name: "Potato", unit: "kg", category: "Vegetables", unit_cost: 3.5, reorder_level: 15 },
    { name: "Mixed Vegetables", unit: "kg", category: "Vegetables", unit_cost: 6, reorder_level: 10 },
    { name: "Lettuce", unit: "kg", category: "Vegetables", unit_cost: 8, reorder_level: 3 },
    { name: "Cucumber", unit: "kg", category: "Vegetables", unit_cost: 4, reorder_level: 5 },
    { name: "Carrot", unit: "kg", category: "Vegetables", unit_cost: 4, reorder_level: 5 },
    { name: "Capsicum", unit: "kg", category: "Vegetables", unit_cost: 7, reorder_level: 3 },
    { name: "Celery", unit: "kg", category: "Vegetables", unit_cost: 8, reorder_level: 2 },
    { name: "Green Peas", unit: "kg", category: "Vegetables", unit_cost: 10, reorder_level: 3 },
    { name: "Green Chilli", unit: "kg", category: "Vegetables", unit_cost: 8, reorder_level: 2 },
    { name: "Garlic", unit: "kg", category: "Vegetables", unit_cost: 15, reorder_level: 3 },
    { name: "Chickpeas", unit: "kg", category: "Vegetables", unit_cost: 8, reorder_level: 5 },
    { name: "Fava Beans", unit: "kg", category: "Vegetables", unit_cost: 7, reorder_level: 5 },
    { name: "Dal", unit: "kg", category: "Vegetables", unit_cost: 7, reorder_level: 10 },
    { name: "Urad Dal", unit: "kg", category: "Vegetables", unit_cost: 9, reorder_level: 5 },

    // ================== SPICES ==================
    { name: "Salt", unit: "kg", category: "Spices", unit_cost: 2, reorder_level: 5 },
    { name: "Spices", unit: "kg", category: "Spices", unit_cost: 20, reorder_level: 3 },
    { name: "Biryani Masala", unit: "kg", category: "Spices", unit_cost: 35, reorder_level: 2 },
    { name: "Mandi Spice Mix", unit: "kg", category: "Spices", unit_cost: 30, reorder_level: 2 },
    { name: "Kabsa Spice Mix", unit: "kg", category: "Spices", unit_cost: 30, reorder_level: 2 },
    { name: "Cumin Powder", unit: "kg", category: "Spices", unit_cost: 25, reorder_level: 1 },
    { name: "Cinnamon", unit: "kg", category: "Spices", unit_cost: 30, reorder_level: 1 },
    { name: "Pepper", unit: "kg", category: "Spices", unit_cost: 45, reorder_level: 1 },
    { name: "Mint Leaves", unit: "kg", category: "Spices", unit_cost: 15, reorder_level: 1 },
    { name: "Curry Leaves", unit: "kg", category: "Spices", unit_cost: 10, reorder_level: 1 },
    { name: "Mustard Seeds", unit: "kg", category: "Spices", unit_cost: 18, reorder_level: 1 },
    { name: "Sambar Powder", unit: "kg", category: "Spices", unit_cost: 25, reorder_level: 1 },

    // ================== BEVERAGES ==================
    { name: "Oil", unit: "litres", category: "Beverages", unit_cost: 8, reorder_level: 20 },
    { name: "Olive Oil", unit: "litres", category: "Beverages", unit_cost: 30, reorder_level: 3 },
    { name: "Soy Sauce", unit: "litres", category: "Beverages", unit_cost: 15, reorder_level: 2 },

    // ================== MISCELLANEOUS ==================
    { name: "Parota", unit: "pieces", category: "Miscellaneous", unit_cost: 1.5, reorder_level: 100 },
    { name: "Bread", unit: "pieces", category: "Miscellaneous", unit_cost: 1, reorder_level: 30 },
    { name: "Bread Roll", unit: "pieces", category: "Miscellaneous", unit_cost: 1.5, reorder_level: 20 },
    { name: "Khubz", unit: "pieces", category: "Miscellaneous", unit_cost: 0.50, reorder_level: 100 },
    { name: "Naan", unit: "pieces", category: "Miscellaneous", unit_cost: 2, reorder_level: 30 },
    { name: "Pita Bread", unit: "pieces", category: "Miscellaneous", unit_cost: 2, reorder_level: 20 },
    { name: "Croissant", unit: "pieces", category: "Miscellaneous", unit_cost: 4, reorder_level: 10 },
    { name: "Sugar", unit: "kg", category: "Miscellaneous", unit_cost: 4, reorder_level: 5 },
    { name: "Honey", unit: "kg", category: "Miscellaneous", unit_cost: 30, reorder_level: 2 },
    { name: "Jam", unit: "kg", category: "Miscellaneous", unit_cost: 15, reorder_level: 2 },
    { name: "Lemon", unit: "pieces", category: "Miscellaneous", unit_cost: 1, reorder_level: 10 },
    { name: "Tahini", unit: "kg", category: "Miscellaneous", unit_cost: 20, reorder_level: 2 },
    { name: "Coconut Chutney", unit: "kg", category: "Miscellaneous", unit_cost: 12, reorder_level: 2 },
];
