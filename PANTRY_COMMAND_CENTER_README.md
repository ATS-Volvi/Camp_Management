# Pantry Command Center — 3D Prototype for Camp-365

An enterprise catering intelligence prototype designed for large remote workforce accommodation facilities and contractor camps (e.g., Saudi Aramco projects with 1,000+ workers).

---

## 1. Quick Presentation Launch

You have two instant ways to run and present this prototype:

### Option A: In the Camp-365 Web App
1. Navigate to: `http://localhost:8080/catering/pantry-command-center` (or click **Pantry Command Center** in the sidebar under **Catering Division**).
2. Or click the cyan **Pantry Command Center (3D)** button in the **Mess & Catering** header.

### Option B: Standalone Portable Single-File HTML (Zero Dependencies)
Double-click `pantry-command-center-standalone.html` in the root of the repository (`Camp_Management/pantry-command-center-standalone.html`). It opens immediately in any browser (Chrome, Edge, Safari) without needing Node.js or a backend server.

---

## 2. Sample Data File & Configuration

All sample data is consolidated in a single, clean, developer-friendly file:
📁 **[`frontend/src/data/pantryCommandData.ts`](file:///c:/Users/swast/OneDrive/Desktop/Campm_2.0/Camp_Management/frontend/src/data/pantryCommandData.ts)**

### The 14 Core Ingredients
Thresholds are always expressed strictly in **"days of cover"** (not grams or recipes):

| Ingredient | Category | Current Stock | Daily Burn | Threshold (Days) | Initial Cover | Initial Status | Supplier | Lead Time | Unit Price (SAR) |
|---|---|---|---|---|---|---|---|---|---|
| **Basmati Rice** | Grains | 120 bags | 20 bags | **6 days** | 6.0d | 🟡 **AMBER** | National Grain Co. | 3 days | 165.0 |
| **Fresh Chicken** | Meat & Poultry | 320 kg | 60 kg | **5 days** | 5.3d | 🟡 **AMBER** | Al-Watania Poultry | 2 days | 18.5 |
| **Australian Lamb** | Meat & Poultry | 450 kg | 45 kg | **5 days** | 10.0d | 🟢 **GREEN** | Al-Kabeer Meat Co. | 3 days | 42.0 |
| **White Fish Fillet** | Meat & Poultry | 240 kg | 30 kg | **4 days** | 8.0d | 🟢 **GREEN** | Arabian Gulf Fisheries | 2 days | 28.0 |
| **Cooking Oil** | Oils & Spices | 84 cans | 40 cans | **6 days** | 2.1d | 🔴 **RED (Critical)** | Afia Edible Oils | 3 days | 48.0 |
| **Red Lentils** | Grains | 260 kg | 25 kg | **5 days** | 10.4d | 🟢 **GREEN** | National Grain Co. | 3 days | 9.0 |
| **Chickpeas** | Grains | 190 kg | 20 kg | **5 days** | 9.5d | 🟢 **GREEN** | National Grain Co. | 3 days | 11.5 |
| **Yellow Onions** | Produce | 88 kg | 55 kg | **5 days** | 1.6d | 🔴 **RED (Critical)** | Saudi Fresh Agri | 2 days | 4.8 |
| **Vine Tomatoes** | Produce | 240 kg | 45 kg | **5 days** | 5.3d | 🟡 **AMBER** | Saudi Fresh Agri | 2 days | 6.2 |
| **Russet Potatoes** | Produce | 520 kg | 50 kg | **5 days** | 10.4d | 🟢 **GREEN** | Saudi Fresh Agri | 2 days | 3.8 |
| **Wheat Flour** | Grains | 850 bags | 75 bags | **6 days** | 11.3d | 🟢 **GREEN** | First Milling Co. | 4 days | 34.0 |
| **Full Cream Milk** | Dairy & Eggs | 360 L | 40 L | **4 days** | 9.0d | 🟢 **GREEN** | Almarai Dairy | 1 day | 5.5 |
| **Table Eggs** | Dairy & Eggs | 27 crates | 18 crates | **4 days** | 1.5d | 🔴 **RED (Critical)** | Al-Watania Poultry | 2 days | 22.0 |
| **Aramco Spice Mix** | Oils & Spices | 75 kg | 6 kg | **6 days** | 12.5d | 🟢 **GREEN** | Mehran Spices KSA | 5 days | 36.0 |

* **3 RED items:** Cooking Oil, Yellow Onions, Table Eggs (urgently below safety threshold).
* **3 AMBER items:** Basmati Rice, Fresh Chicken, Vine Tomatoes (near threshold limit).
* **8 GREEN items:** Lamb, Fish, Lentils, Chickpeas, Potatoes, Flour, Milk, Spices (comfortable buffer).

---

## 3. How to Customize Thresholds & What-If Multipliers

To edit any values, simply open `frontend/src/data/pantryCommandData.ts`:

### A. Adjusting an Ingredient's Safety Threshold
Change the `thresholdDays` property on any ingredient in `PANTRY_INGREDIENTS`:
```ts
{
  id: "cooking_oil",
  thresholdDays: 7, // Increase safety threshold from 6 to 7 days
}
```

### B. Adjusting What-If Scenarios
Inside `calculatePantrySimulation()` in `pantryCommandData.ts`:
- **+200 Workers**: Multiplies daily burn rate by `1.20` (+20%).
- **Ramadan Mode**: Automatically increases consumption for Rice & Oil (+35%), Meats (+25%), and Milk (+20%).
- **Delivery Delayed 3 Days**: Adds `+3 days` to the safety buffer requirement, dynamically lifting the threshold plane and triggering earlier buy alerts.

---

## 4. Key Interactive Capabilities

1. **3D Pantry Skyline (Hero View)**:
   - Each tower's height directly reflects **days of stock cover remaining**.
   - Floating translucent threshold plane shows the safety baseline.
   - Red towers pulse with a glowing emissive alarm shader.
   - Full 360° orbit, zoom, pan, and hover tooltips.
   - Click any tower to fly the camera into focus and open the detailed Side Card.
2. **Time Machine Date Slider**:
   - Drag from **Today (Day 0)** up to **Day +14**.
   - Watch towers smoothly shrink in real-time as forecast daily consumption is deducted.
   - Displays real countdown chips: *"Runs out in 1d 14h"*.
3. **Dish Health Rings**:
   - Evaluates 10 upcoming planned dishes (*Chicken Biryani, Dal Tadka, Lamb Kabsa, Fish Curry, Shakshuka, etc.*).
   - Glowing circular health ring (*Green = Ready, Amber = Low Stock, Red = Cannot Serve*).
   - Instant callout of the weakest bottleneck ingredient.
4. **Smart Reorder Buy List**:
   - Auto-aggregates all Red and Amber items.
   - Grouped cleanly by approved vendor with lead times and subtotal SAR.
   - **"Send to Purchase"** button triggers animated purchase order confirmation (`PO-2026-ARAMCO-XXXX`).
5. **3D / 2D View Toggle**:
   - Switch anytime to a high-contrast 2D bar chart mode optimized for mobile screens and report exporting.
6. **Guided Demo Mode**:
   - Click **"Guided Demo Tour"** in the top bar to run an executive 6-step walkthrough with live on-screen captions.
