import { pool } from '../lib/db.js';

async function createCampMealRates() {
    const client = await pool.connect();
    try {
        console.log('Ensuring camp_meal_rates table exists...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.camp_meal_rates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
                breakfast_rate NUMERIC NOT NULL DEFAULT 0,
                lunch_rate NUMERIC NOT NULL DEFAULT 0,
                dinner_rate NUMERIC NOT NULL DEFAULT 0,
                ramadan_rate NUMERIC NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                UNIQUE (camp_id)
            );
        `);
        console.log('✓ Successfully ensured camp_meal_rates table exists!');

        // Check if trigger function exists and create trigger if needed
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
                ) THEN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_trigger WHERE tgname = 'set_camp_meal_rates_updated_at'
                    ) THEN
                        CREATE TRIGGER set_camp_meal_rates_updated_at
                        BEFORE UPDATE ON public.camp_meal_rates
                        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
                    END IF;
                END IF;
            END $$;
        `);
        console.log('✓ Trigger checked/created.');
    } catch (err) {
        console.error('Error creating camp_meal_rates:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

createCampMealRates();
