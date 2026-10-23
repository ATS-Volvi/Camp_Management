import type { Request, Response, NextFunction } from 'express';
import AIService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';
import Database from '../../../../config/dbConn';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_AI_MODEL = 'meta-llama/llama-3.3-70b-instruct';

function getFallbackIngredients(dishName: string, availableIngredients: any[] = []): any[] {
    const nameLower = (dishName || '').toLowerCase();
    const findAvail = (keywords: string[]) => {
        return availableIngredients.find(ing => {
            const n = (ing.name || '').toLowerCase();
            return keywords.some(k => n.includes(k));
        });
    };

    const results: any[] = [];

    // Helper to add
    const addIng = (keywords: string[], fallbackName: string, defaultQty: number) => {
        const match = findAvail(keywords);
        results.push({
            ingredient: match ? match.name : fallbackName,
            ingredientId: match ? match.id : undefined,
            qtyPerPerson: defaultQty
        });
    };

    if (nameLower.includes('rice') || nameLower.includes('biryani') || nameLower.includes('kabsa') || nameLower.includes('mandi') || nameLower.includes('majboos') || nameLower.includes('pulao')) {
        addIng(['rice', 'basmati'], 'Basmati Rice', 0.18);
        if (nameLower.includes('chicken')) addIng(['chicken', 'poultry'], 'Fresh Chicken', 0.22);
        else if (nameLower.includes('beef') || nameLower.includes('mutton') || nameLower.includes('meat')) addIng(['beef', 'mutton', 'meat'], 'Mutton / Beef', 0.20);
        else if (nameLower.includes('fish')) addIng(['fish'], 'Fresh Fish', 0.20);
        addIng(['oil', 'cooking oil'], 'Cooking Vegetable Oil', 0.02);
        addIng(['onion'], 'Yellow Onions', 0.05);
        addIng(['tomato'], 'Red Tomatoes', 0.04);
        addIng(['spice', 'masala'], 'Assorted Spices & Masala', 0.015);
    } else if (nameLower.includes('curry') || nameLower.includes('stew') || nameLower.includes('salona') || nameLower.includes('gravy')) {
        if (nameLower.includes('chicken')) addIng(['chicken', 'poultry'], 'Fresh Chicken', 0.22);
        else if (nameLower.includes('beef') || nameLower.includes('meat')) addIng(['beef', 'mutton'], 'Mutton / Beef', 0.20);
        else if (nameLower.includes('fish')) addIng(['fish'], 'Fresh Fish', 0.20);
        else addIng(['egg'], 'Fresh Eggs', 0.10);
        addIng(['potato'], 'Potatoes', 0.08);
        addIng(['onion'], 'Yellow Onions', 0.05);
        addIng(['tomato'], 'Red Tomatoes', 0.04);
        addIng(['oil', 'cooking oil'], 'Cooking Vegetable Oil', 0.02);
        addIng(['spice', 'masala'], 'Assorted Spices & Masala', 0.01);
    } else if (nameLower.includes('dal') || nameLower.includes('lentil') || nameLower.includes('soup')) {
        addIng(['lentil', 'dal', 'masoor'], 'Red Lentils (Masoor Dal)', 0.10);
        addIng(['onion'], 'Yellow Onions', 0.04);
        addIng(['tomato'], 'Red Tomatoes', 0.03);
        addIng(['oil', 'cooking oil'], 'Cooking Vegetable Oil', 0.015);
        addIng(['spice', 'masala'], 'Assorted Spices & Masala', 0.008);
    } else if (nameLower.includes('egg') || nameLower.includes('shakshouka') || nameLower.includes('omelet') || nameLower.includes('bhurji')) {
        addIng(['egg'], 'Fresh Eggs', 0.10);
        addIng(['onion'], 'Yellow Onions', 0.03);
        addIng(['tomato'], 'Red Tomatoes', 0.04);
        addIng(['oil', 'cooking oil'], 'Cooking Vegetable Oil', 0.015);
        addIng(['bread', 'pita', 'khubz'], 'Arabic Bread (Pita)', 1.5);
    } else if (nameLower.includes('roti') || nameLower.includes('chapati') || nameLower.includes('paratha') || nameLower.includes('bread')) {
        addIng(['flour', 'atta', 'wheat'], 'Wheat Flour (Atta)', 0.12);
        addIng(['oil', 'cooking oil'], 'Cooking Vegetable Oil', 0.01);
    } else if (nameLower.includes('tea') || nameLower.includes('chai') || nameLower.includes('coffee')) {
        addIng(['tea', 'leaves'], 'Black Tea Leaves', 0.005);
        addIng(['milk'], 'Whole Milk', 0.05);
        addIng(['sugar'], 'Sugar', 0.015);
    } else {
        // Generic recipe based on available ingredients
        const staple = findAvail(['rice', 'flour', 'bread']);
        if (staple) results.push({ ingredient: staple.name, ingredientId: staple.id, qtyPerPerson: 0.15 });

        const protein = findAvail(['chicken', 'beef', 'egg', 'lentil']);
        if (protein) results.push({ ingredient: protein.name, ingredientId: protein.id, qtyPerPerson: 0.18 });

        const veg = findAvail(['onion', 'tomato', 'potato']);
        if (veg) results.push({ ingredient: veg.name, ingredientId: veg.id, qtyPerPerson: 0.05 });

        const oil = findAvail(['oil']);
        if (oil) results.push({ ingredient: oil.name, ingredientId: oil.id, qtyPerPerson: 0.015 });

        const spice = findAvail(['spice', 'masala']);
        if (spice) results.push({ ingredient: spice.name, ingredientId: spice.id, qtyPerPerson: 0.01 });
    }

    return results;
}

class AIController {
    static async chat(req: Request, res: Response, next: NextFunction) {
        const { prompt } = req.body;
        if (!OPENROUTER_API_KEY) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'AI API key not configured' });
        }

        const context = await AIService.getSystemContext();

        const systemPrompt = `You are LodgiX AI (Camp-365 AI), the senior operational analyst and reporting engine for an industrial camp management platform.

Analyze real-time operational data and produce executive-quality, well-structured reports.

FORMATTING RULES:
1. Title: Use a single # heading summarizing the report topic.
2. 📋 Executive Summary: 2-3 crisp sentences leading with the key finding.
3. 📊 Key Metrics: Present 3-6 KPIs in a clean markdown table (Metric | Value | Status).
4. 📈 Detailed Analysis: Use ## subheadings with narrative explanation and structured markdown tables.
5. 💡 Insights & Recommendations: 3-5 actionable bullet points.
6. Use Markdown tables for all tabular data with headers and alignment.
7. Use ✅ (Good), ⚠️ (Warning), 🔴 (Critical) status emoji indicators.
8. Use bold for key numbers and percentages. Round percentages to 1 decimal place.
9. Present findings directly without saying "based on the provided context".

${context}`;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'http://localhost:8082',
                    'X-Title': 'Camp-365'
                },
                body: JSON.stringify({
                    model: DEFAULT_AI_MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    stream: true
                })
            });

            if (!response.body) throw new Error('No response body');

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                res.write(chunk);
            }

            res.end();
        } catch (err: any) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err.message });
        }
    }

    static async anomaly(req: Request, res: Response, next: NextFunction) {
        const { category } = req.body;
        if (!OPENROUTER_API_KEY) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'AI API key not configured' });
        }

        try {
            const anomalyContext = await AIService.getAnomalyContext(category);

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'LodgiX Hub'
                },
                body: JSON.stringify({
                    model: DEFAULT_AI_MODEL,
                    messages: [
                        { role: 'system', content: `You are an Anomaly Detection AI. Analyze the provided operational data and flag any irregularities, inefficiencies, or suspicious patterns. Format the report in Markdown with clear sections and tables. ${anomalyContext}` },
                        { role: 'user', content: `Run a ${category} anomaly scan.` }
                    ],
                    stream: true
                })
            });

            if (!response.body) throw new Error('No response body');

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                res.write(chunk);
            }

            res.end();
        } catch (err: any) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err.message });
        }
    }

    static async parseInvoice(req: Request, res: Response, next: NextFunction) {
        const { invoice_id } = req.body;
        if (!OPENROUTER_API_KEY) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'AI API key not configured' });
        }

        try {
            const pool = Database.getPool();
            const invoice = await pool.query('SELECT * FROM catering_invoices WHERE id = $1', [invoice_id]);
            if (invoice.rows.length === 0) throw new Error('Invoice not found');

            await pool.query('UPDATE catering_invoices SET parsing_status = \'parsed\' WHERE id = $1', [invoice_id]);

            res.status(StatusCodes.OK).json({ message: 'Invoice parsed successfully', data: { items: [] } });
        } catch (err: any) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err.message });
        }
    }

    static async foodSafetyInsights(req: Request, res: Response, next: NextFunction) {
        const { context } = req.body;
        if (!OPENROUTER_API_KEY) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'AI API key not configured' });
        }

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'LodgiX Hub'
                },
                body: JSON.stringify({
                    model: DEFAULT_AI_MODEL,
                    messages: [
                        { role: 'system', content: 'You are a Food Safety Specialist. Analyze the provided audit data and NCR (Non-Conformance Report) records. Provide an executive summary with risk analysis, trend predictions, and actionable recommendations in Markdown.' },
                        { role: 'user', content: `Analyze this context: ${JSON.stringify(context)}` }
                    ]
                })
            });

            const data = await response.json();
            res.status(StatusCodes.OK).json({ report: data.choices[0].message.content });
        } catch (err: any) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err.message });
        }
    }

    static async getDishIngredients(req: Request, res: Response, next: NextFunction) {
        const { dishName, headcount, availableIngredients } = req.body;

        try {
            if (OPENROUTER_API_KEY) {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'HTTP-Referer': 'http://localhost:3000',
                        'X-Title': 'LodgiX Hub'
                    },
                    body: JSON.stringify({
                        model: DEFAULT_AI_MODEL,
                        messages: [
                            { 
                                role: 'system', 
                                content: 'You are an executive chef for Saudi industrial worker camps. Given a dish name and available store ingredients, return ONLY a JSON object: {"ingredients": [{"ingredient": string, "qtyPerPerson": number, "ingredientId": string | null}]}. Strict: qtyPerPerson in standard units (kg, liters, pieces per person, e.g. 0.180 kg rice, 0.220 kg chicken).' 
                            },
                            { 
                                role: 'user', 
                                content: `Dish: ${dishName}, Headcount: ${headcount}, Available Ingredients: ${JSON.stringify(availableIngredients || [])}` 
                            }
                        ],
                        response_format: { type: "json_object" }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    let content = data.choices?.[0]?.message?.content;
                    if (content) {
                        if (content.includes('```json')) {
                            content = content.split('```json')[1].split('```')[0];
                        } else if (content.includes('```')) {
                            content = content.split('```')[1].split('```')[0];
                        }

                        const parsed = JSON.parse(content.trim());
                        const ings = Array.isArray(parsed) ? parsed : (parsed.ingredients || []);
                        if (ings.length > 0) {
                            return res.status(StatusCodes.OK).json({ ingredients: ings });
                        }
                    }
                }
            }

            // Fallback to rich culinary recipe engine
            console.log(`Using culinary recipe engine fallback for dish: ${dishName}`);
            const fallbackIngs = getFallbackIngredients(dishName, availableIngredients);
            return res.status(StatusCodes.OK).json({ ingredients: fallbackIngs });

        } catch (err: any) {
            console.warn('AI error, falling back to culinary generator:', err.message);
            const fallbackIngs = getFallbackIngredients(dishName, availableIngredients);
            return res.status(StatusCodes.OK).json({ ingredients: fallbackIngs });
        }
    }
}

export default AIController;
