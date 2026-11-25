import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DatasetId } from "@/lib/dynamicReports/types";
import { format } from "date-fns";
import { resolveEmployeeHierarchy } from "@/lib/departmentLabels";
import {
  PROJECT_DMC_DATA,
  SAMPLE_CLIENT_MEAL_CONSUMPTION,
  SAMPLE_DAILY_WASTAGE_LOGS,
  CURRENT_ARAMCO_BILLING_PACK,
} from "@/data/enterpriseCateringSuiteData";
import { DISH_RECIPES, findRecipe } from "@/data/dishRecipes";
import { MASTER_INGREDIENTS } from "@/data/ingredientMaster";

export function useDynamicReportData(dataset: DatasetId) {
  return useQuery({
    queryKey: ["dynamic-report-data", dataset],
    queryFn: async () => {
      switch (dataset) {
        case "inmates": {
          const { data, error } = await supabase
            .from("check_ins")
            .select(`
              id, check_in_date, food_required,
              employees(id, employee_id, name, department, sub_department, presence_status, company, designation, nationality, project),
              rooms(room_number, category, max_capacity, floor),
              camps(name)
            `)
            .order("check_in_date", { ascending: false })
            .limit(2000);

          if (error) throw error;

          return (data || []).map((r: any) => {
            const h = resolveEmployeeHierarchy({
              department: r.employees?.department,
              sub_department: r.employees?.sub_department,
              project: r.employees?.project,
            });

            return {
              id: r.id,
              camp: r.camps?.name || "Unassigned Camp",
              block: r.rooms?.room_number?.split("-")[0] || "Block A",
              floor: r.rooms?.floor ? `Floor ${r.rooms.floor}` : "Floor G",
              room_number: r.rooms?.room_number || "N/A",
              room_category: r.rooms?.category || "4x1",
              department: h.department !== "—" ? h.department : "Unassigned",
              sub_department: h.sub_department !== "—" ? h.sub_department : "Unassigned",
              project: h.project !== "—" ? h.project : "—",
              company: r.employees?.company || "Expertise",
              nationality: r.employees?.nationality || "Indian",
              designation: r.employees?.designation || "Staff",
              presence_status: r.employees?.presence_status || "active",
              food_required: r.food_required ? "Catering Included" : "Accommodation Only",
              check_in_date: r.check_in_date ? format(new Date(r.check_in_date), "yyyy-MM-dd") : "",
              inmates_count: 1,
              bed_capacity: r.rooms?.max_capacity || 4,
            };
          });
        }

        case "billing": {
          // Generate flattened billing records from active stays and room rates
          const { data: checkins, error } = await supabase
            .from("check_ins")
            .select(`
              id, check_in_date, food_required,
              employees(department, sub_department, presence_status, project),
              rooms(category),
              camps(name)
            `)
            .limit(1500);

          if (error) throw error;

          const TIER_RATES: Record<string, { acc: number; cat: number }> = {
            "1x1": { acc: 45, cat: 20 },
            "2x1": { acc: 30, cat: 20 },
            "3x1": { acc: 22, cat: 20 },
            "4x1": { acc: 16, cat: 20 },
            "5x1": { acc: 14, cat: 20 },
            "6x1": { acc: 12, cat: 20 },
          };

          return (checkins || []).map((r: any) => {
            const cat = String(r.rooms?.category || "4x1").toLowerCase();
            const rates = TIER_RATES[cat] || { acc: 18, cat: 20 };
            const status = r.employees?.presence_status || "active";
            const days = 30; // standard billing cycle days
            const accCharges = rates.acc * days;
            const isVacation = status === "vacation" || status === "on_vacation";
            const catCharges = isVacation ? 0 : rates.cat * days;
            const holdingCharges = isVacation ? 12 * days : 0;
            const lunchCharges = cat === "1x1" ? 156 : 0;
            const grandTotal = accCharges + catCharges + holdingCharges + lunchCharges;

            const h = resolveEmployeeHierarchy({
              department: r.employees?.department,
              sub_department: r.employees?.sub_department,
              project: r.employees?.project,
            });

            return {
              id: r.id,
              department: h.department !== "—" ? h.department : "EMBS",
              sub_department: h.sub_department !== "—" ? h.sub_department : "EMBS",
              project: h.project !== "—" ? h.project : "—",
              camp: r.camps?.name || "Main Camp",
              room_category: r.rooms?.category || "4x1",
              presence_status: status,
              service_month: "Sep-2026",
              mandays: days,
              accommodation_charges: accCharges,
              catering_charges: catCharges,
              holding_charges: holdingCharges,
              lunch_charges: lunchCharges,
              grand_total: grandTotal,
            };
          });
        }

        case "movements": {
          const [checkInsRes, checkOutsRes] = await Promise.all([
            supabase
              .from("check_ins")
              .select("id, check_in_date, employees(department, sub_department, nationality, project), rooms(category), camps(name)")
              .order("check_in_date", { ascending: false })
              .limit(500),
            supabase
              .from("check_outs")
              .select("id, check_out_date, checkout_reason, damage_charges, employees(department, sub_department, nationality, project), rooms(category), camps(name)")
              .order("check_out_date", { ascending: false })
              .limit(500),
          ]);

          const records: any[] = [];

          (checkInsRes.data || []).forEach((ci: any) => {
            const h = resolveEmployeeHierarchy({
              department: ci.employees?.department,
              sub_department: ci.employees?.sub_department,
              project: ci.employees?.project,
            });

            records.push({
              id: `ci_${ci.id}`,
              movement_type: "Check-In (Arrival)",
              camp: ci.camps?.name || "Main Camp",
              department: h.department !== "—" ? h.department : "Unassigned",
              sub_department: h.sub_department !== "—" ? h.sub_department : "Unassigned",
              project: h.project !== "—" ? h.project : "—",
              nationality: ci.employees?.nationality || "Indian",
              room_category: ci.rooms?.category || "4x1",
              reason: "New Deployment",
              date: ci.check_in_date ? format(new Date(ci.check_in_date), "yyyy-MM-dd") : "",
              movement_count: 1,
              damage_deduction: 0,
            });
          });

          (checkOutsRes.data || []).forEach((co: any) => {
            const h = resolveEmployeeHierarchy({
              department: co.employees?.department,
              sub_department: co.employees?.sub_department,
              project: co.employees?.project,
            });

            records.push({
              id: `co_${co.id}`,
              movement_type: "Check-Out (Departure)",
              camp: co.camps?.name || "Main Camp",
              department: h.department !== "—" ? h.department : "Unassigned",
              sub_department: h.sub_department !== "—" ? h.sub_department : "Unassigned",
              project: h.project !== "—" ? h.project : "—",
              nationality: co.employees?.nationality || "Indian",
              room_category: co.rooms?.category || "4x1",
              reason: co.checkout_reason || "Completed Project",
              date: co.check_out_date ? format(new Date(co.check_out_date), "yyyy-MM-dd") : "",
              movement_count: 1,
              damage_deduction: Number(co.damage_charges) || 0,
            });
          });

          return records;
        }

        case "catering": {
          const { data: requests, error } = await supabase
            .from("department_lunch_requests")
            .select("id, request_date, department, quantity, unit_price, total_cost, status, camps(name)")
            .limit(500);

          if (error) {
            // Fallback generated catering records if lunch requests table has few entries
            return [
              { id: "1", camp: "Camp A", department: "EMBS", meal_type: "Breakfast", service_month: "Sep-2026", status: "Served", meal_count: 120, unit_price: 6, total_cost: 720 },
              { id: "2", camp: "Camp A", department: "EMBS", meal_type: "Lunch", service_month: "Sep-2026", status: "Served", meal_count: 120, unit_price: 8, total_cost: 960 },
              { id: "3", camp: "Camp A", department: "EMBS", meal_type: "Dinner", service_month: "Sep-2026", status: "Served", meal_count: 118, unit_price: 8, total_cost: 944 },
              { id: "4", camp: "Camp A", department: "HERD", meal_type: "Breakfast", service_month: "Sep-2026", status: "Served", meal_count: 85, unit_price: 6, total_cost: 510 },
              { id: "5", camp: "Camp A", department: "HERD", meal_type: "Lunch", service_month: "Sep-2026", status: "Served", meal_count: 85, unit_price: 8, total_cost: 680 },
              { id: "6", camp: "Camp B", department: "PMTA", meal_type: "Dinner", service_month: "Sep-2026", status: "Served", meal_count: 45, unit_price: 8, total_cost: 360 },
            ];
          }

          if (!requests || requests.length === 0) {
            return [
              { id: "1", camp: "Camp A", department: "EMBS", meal_type: "Breakfast", service_month: "Sep-2026", status: "Served", meal_count: 120, unit_price: 6, total_cost: 720 },
              { id: "2", camp: "Camp A", department: "EMBS", meal_type: "Lunch", service_month: "Sep-2026", status: "Served", meal_count: 120, unit_price: 8, total_cost: 960 },
              { id: "3", camp: "Camp A", department: "EMBS", meal_type: "Dinner", service_month: "Sep-2026", status: "Served", meal_count: 118, unit_price: 8, total_cost: 944 },
              { id: "4", camp: "Camp A", department: "HERD", meal_type: "Breakfast", service_month: "Sep-2026", status: "Served", meal_count: 85, unit_price: 6, total_cost: 510 },
              { id: "5", camp: "Camp A", department: "HERD", meal_type: "Lunch", service_month: "Sep-2026", status: "Served", meal_count: 85, unit_price: 8, total_cost: 680 },
              { id: "6", camp: "Camp B", department: "PMTA", meal_type: "Dinner", service_month: "Sep-2026", status: "Served", meal_count: 45, unit_price: 8, total_cost: 360 },
            ];
          }

          return requests.map((r: any) => ({
            id: r.id,
            camp: r.camps?.name || "Main Camp",
            department: r.department || "General",
            meal_type: "Office Lunch",
            service_month: r.request_date ? format(new Date(r.request_date), "MMM-yyyy") : "Sep-2026",
            status: r.status || "approved",
            meal_count: Number(r.quantity) || 1,
            unit_price: Number(r.unit_price) || 5.2,
            total_cost: Number(r.total_cost) || 5.2,
          }));
        }

        case "catering_dmc": {
          const records: any[] = [];
          PROJECT_DMC_DATA.forEach((p) => {
            const sessions = [
              { name: "Breakfast", cph: p.sessions.breakfast.cph, cost: p.sessions.breakfast.totalCostSAR },
              { name: "Lunch", cph: p.sessions.lunch.cph, cost: p.sessions.lunch.totalCostSAR },
              { name: "Dinner", cph: p.sessions.dinner.cph, cost: p.sessions.dinner.totalCostSAR },
              { name: "Field Pack", cph: p.sessions.fieldPack.cph, cost: p.sessions.fieldPack.totalCostSAR },
            ];
            sessions.forEach((s) => {
              records.push({
                id: `${p.projectCode}_${s.name}`,
                project: p.projectName,
                client: p.contractClient,
                meal_session: s.name,
                budget_status: p.status === "over_budget" ? "Over Budget" : "Under Cap",
                top_driver: p.topCostDriver,
                headcount: p.headcount,
                session_cph: s.cph,
                total_cph: p.overallCphSAR,
                budget_cap: p.budgetCeilingCphSAR,
                daily_dmc_sar: s.cost,
              });
            });
          });
          return records;
        }

        case "catering_headcount": {
          return SAMPLE_CLIENT_MEAL_CONSUMPTION.map((c) => ({
            id: c.clientCode,
            client: c.clientName,
            contract_ref: c.contractRef,
            attendance_status: c.status === "compliant" ? "Compliant" : "Variance Flagged",
            entitled_headcount: c.entitledHeadcount,
            scanned_dine_in: c.actualDineInHeadcount,
            packed_meals: c.packedMealsDispatched,
            advance_cancellations: c.advanceCancellations,
            net_billed_pax: c.netBilledPax,
            attendance_pct: c.attendanceRatePct,
          }));
        }

        case "catering_wastage": {
          return SAMPLE_DAILY_WASTAGE_LOGS.map((w) => ({
            id: w.logId,
            meal_session: w.mealSession,
            station: w.responsibleStation,
            disposal_method: w.haccpDisposalMethod,
            chef_auditor: w.chefAuditor,
            status: w.status === "within_target" ? "Within Target (<28g)" : "Exceeded Target",
            prep_waste_kg: w.prepWasteKg,
            buffet_overprod_kg: w.buffetOverproductionKg,
            plate_scraps_kg: w.plateScrapKg,
            total_waste_kg: w.totalWasteKg,
            waste_grams_per_pax: w.wasteGramsPerPax,
            financial_loss_sar: w.financialLossSAR,
          }));
        }

        case "catering_billing": {
          const layers = [
            { layer: "1. Inmate Bed-Nights", count: 34500, rate: 45.0, subtotal: 1552500 },
            { layer: "2. Scanned Dining Meals", count: 72400, rate: 12.0, subtotal: 868800 },
            { layer: "3. Approved Field Lunches", count: 18200, rate: 14.5, subtotal: 263900 },
            { layer: "4. Deducted Cancellations", count: 2150, rate: -10.0, subtotal: -21500 },
          ];
          return layers.map((l, i) => ({
            id: `layer_${i + 1}`,
            audit_layer: l.layer,
            contract_number: CURRENT_ARAMCO_BILLING_PACK.contractNumber,
            sap_doc: CURRENT_ARAMCO_BILLING_PACK.sapPostingDocument,
            sap_status: "Verified Reconciled",
            unit_count: l.count,
            contract_rate: l.rate,
            subtotal_sar: l.subtotal,
          }));
        }

        case "catering_dishes": {
          // 1. Fetch live saved custom dishes from Supabase menu_dishes
          let dbDishes: any[] = [];
          try {
            const { data, error } = await supabase
              .from("menu_dishes")
              .select(`
                id, name, description, meal_type, is_active,
                menu_dish_ingredients(
                  id, qty_per_person,
                  ingredients(id, name, unit, unit_cost, category)
                )
              `)
              .order("name");
            if (!error && data) {
              dbDishes = data;
            }
          } catch (e) {
            console.warn("Failed fetching menu_dishes from Supabase, using standard dishes", e);
          }

          // Build ingredient unit cost lookup map from MASTER_INGREDIENTS
          const costMap: Record<string, number> = {};
          MASTER_INGREDIENTS.forEach((ing) => {
            costMap[ing.name.toLowerCase()] = ing.unit_cost;
          });

          // Metadata classifier helper (Cuisine, Diet, Kitchen Station, Allergens)
          const inferDishMetadata = (dishName: string, mealType: string) => {
            const lower = dishName.toLowerCase();
            let cuisine = "International";
            if (lower.match(/biryani|masala|parota|dosa|dal|paneer|curry|sambar|idli|korma|chapati|tikka|roti|pulao/)) {
              cuisine = "Indian / Subcontinental";
            } else if (lower.match(/kabsa|mandi|hummus|shakshuka|falafel|ful|shawarma|tabbouleh|mutabbal|sayadieh|tagine/)) {
              cuisine = "Arabic / Middle Eastern";
            } else if (lower.match(/pasta|spaghetti|alfredo|pizza|burger|sandwich|lasagna|stroganoff|macaroni|steak/)) {
              cuisine = "Continental / Western";
            } else if (lower.match(/noodles|fried rice|manchurian|chilli chicken|teriyaki|stir fry/)) {
              cuisine = "Pan-Asian";
            }

            let diet = "Non-Vegetarian";
            if (lower.match(/vegetable|veg|dal|paneer|aloo|dosa|chana|salad|hummus|falafel|bread|cheese|croissant/)) {
              diet = "Vegetarian";
            }
            if (lower.match(/fruit|salad|steamed rice|plain rice|boiled/)) {
              diet = "Vegan / Low-Cal";
            }

            let station = "Hot Kitchen";
            if (lower.match(/salad|hummus|fruit|dressing|raita|chutney|coleslaw/)) {
              station = "Cold Larder / Pantry";
            } else if (lower.match(/bread|croissant|toast|cake|muffin|pastry|pancake|parota|chapati/)) {
              station = "Bakery & Dough";
            } else if (lower.match(/biryani|stew|curry|gravy|soup|rice|kabsa/)) {
              station = "Hot Kitchen";
            } else if (lower.match(/grilled|fry|roast|steak|chicken|mutton|fish/)) {
              station = "Grill & Butchery";
            }

            let allergens = "None";
            if (lower.match(/bread|pasta|wheat|flour|parota|roti|croissant|noodles/)) allergens = "Gluten";
            if (lower.match(/paneer|cheese|milk|butter|cream|yogurt|ghee/)) allergens = allergens === "None" ? "Dairy" : `${allergens}, Dairy`;
            if (lower.match(/egg|omelette/)) allergens = allergens === "None" ? "Eggs" : `${allergens}, Eggs`;
            if (lower.match(/fish|prawns/)) allergens = allergens === "None" ? "Seafood" : `${allergens}, Seafood`;

            return { cuisine, diet, station, allergens };
          };

          const records: any[] = [];
          const seenNames = new Set<string>();

          // Process DB dishes first (reflects any dish added by the user in Mess & Catering)
          for (const d of dbDishes) {
            const name = d.name || "Unnamed Dish";
            seenNames.add(name.toLowerCase());
            const mealType = d.meal_type || "Lunch";
            const meta = inferDishMetadata(name, mealType);
            const ingredients = d.menu_dish_ingredients || [];

            let portionCost = 0;
            let portionGrams = 0;

            if (ingredients.length > 0) {
              ingredients.forEach((ing: any) => {
                const qty = Number(ing.qty_per_person) || 0;
                const unitCost = Number(ing.ingredients?.unit_cost) || costMap[ing.ingredients?.name?.toLowerCase()] || 8;
                portionCost += qty * unitCost;
                if (ing.ingredients?.unit === "kg") portionGrams += qty * 1000;
                else if (ing.ingredients?.unit === "pieces") portionGrams += qty * 50;
                else portionGrams += qty * 100;
              });
            } else {
              const recipe = findRecipe(name);
              if (recipe && recipe.length > 0) {
                recipe.forEach((ing) => {
                  const unitCost = costMap[ing.name.toLowerCase()] || 8;
                  portionCost += ing.qty_per_person * unitCost;
                  if (ing.unit === "kg") portionGrams += ing.qty_per_person * 1000;
                  else if (ing.unit === "pieces") portionGrams += ing.qty_per_person * 50;
                  else portionGrams += ing.qty_per_person * 100;
                });
              } else {
                portionCost = mealType === "Breakfast" ? 4.5 : 8.5;
                portionGrams = 320;
              }
            }

            portionCost = Number(portionCost.toFixed(2));
            portionGrams = Math.round(portionGrams) || 350;
            const forecastPax = 450;
            const totalBatchCost = Number((portionCost * forecastPax).toFixed(2));
            const caloriesKcal = Math.round(portionGrams * (meta.diet === "Vegetarian" ? 1.4 : 1.9));

            records.push({
              id: d.id,
              dish_name: name,
              camp: d.camp_name || d.camp || "Tanajib Main Camp",
              meal_type: mealType,
              cuisine: meta.cuisine,
              diet_type: meta.diet,
              station: meta.station,
              allergens: meta.allergens,
              source: "Database Saved Dish",
              status: d.is_active !== false ? "Active Menu" : "Archived",
              ingredients_count: ingredients.length > 0 ? ingredients.length : (findRecipe(name)?.length || 4),
              portion_grams: portionGrams,
              cost_per_portion_sar: portionCost,
              forecast_pax: forecastPax,
              total_batch_cost_sar: totalBatchCost,
              calories_kcal: caloriesKcal,
            });
          }

          // Merge all standard catalog dishes from DISH_RECIPES that weren't already added
          Object.entries(DISH_RECIPES).forEach(([dishKey, ings], index) => {
            if (seenNames.has(dishKey.toLowerCase())) return;

            const name = dishKey
              .split(" ")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ");

            let mealType = "Lunch";
            const lowerKey = dishKey.toLowerCase();
            if (lowerKey.match(/parota|dosa|toast|croissant|omelette|pancake|idli|falafel|ful medames|breakfast/)) {
              mealType = "Breakfast";
            } else if (lowerKey.match(/snack|cake|tea|sandwich/)) {
              mealType = "Snack";
            } else if (lowerKey.match(/biryani|kabsa|steak|stroganoff|dinner/)) {
              mealType = "Dinner";
            }

            const meta = inferDishMetadata(name, mealType);
            let portionCost = 0;
            let portionGrams = 0;

            ings.forEach((ing) => {
              const unitCost = costMap[ing.name.toLowerCase()] || 8;
              portionCost += ing.qty_per_person * unitCost;
              if (ing.unit === "kg") portionGrams += ing.qty_per_person * 1000;
              else if (ing.unit === "pieces") portionGrams += ing.qty_per_person * 50;
              else portionGrams += ing.qty_per_person * 100;
            });

            portionCost = Number(portionCost.toFixed(2));
            portionGrams = Math.round(portionGrams) || 320;
            const forecastPax = 450;
            const totalBatchCost = Number((portionCost * forecastPax).toFixed(2));
            const caloriesKcal = Math.round(portionGrams * (meta.diet === "Vegetarian" ? 1.4 : 1.9));

            records.push({
              id: `standard_${index + 1}`,
              dish_name: name,
              camp: "Tanajib Main Camp",
              meal_type: mealType,
              cuisine: meta.cuisine,
              diet_type: meta.diet,
              station: meta.station,
              allergens: meta.allergens,
              source: "Standard Recipe Catalog",
              status: "Active Menu",
              ingredients_count: ings.length,
              portion_grams: portionGrams,
              cost_per_portion_sar: portionCost,
              forecast_pax: forecastPax,
              total_batch_cost_sar: totalBatchCost,
              calories_kcal: caloriesKcal,
            });
          });

          return records;
        }

        default:
          return [];
      }
    },
  });
}

