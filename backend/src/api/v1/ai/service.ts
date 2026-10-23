import AIDatabase from './database';

class AIService {
    static async getSystemContext() {
        try {
            const context = await AIDatabase.getSystemContext();
            return `
Operational Context (Live Camp Management Database):
- Camps, Capacity & Utilization:
${JSON.stringify(context.camps, null, 2)}

- Employee Supplier Distribution across Camps:
${JSON.stringify(context.suppliers, null, 2)}

- Room Status Summary:
${JSON.stringify(context.rooms, null, 2)}

- Low Inventory Items:
${JSON.stringify(context.inventory, null, 2)}

- Maintenance Tickets Breakdown:
${JSON.stringify(context.tickets, null, 2)}

- Estimated Financials (Revenue, Catering Cost, Rent):
${JSON.stringify(context.financials, null, 2)}
`;
        } catch (err) {
            console.error('Error fetching context:', err);
            return 'Context temporarily unavailable.';
        }
    }

    static async getAnomalyContext(category: string) {
        let anomalyContext = '';
        try {
            if (category === 'occupancy' || category === 'all') {
                const data = await AIDatabase.getOccupancyAnomalies();
                anomalyContext += `Occupancy Data: ${JSON.stringify(data)}\n`;
            }
            if (category === 'maintenance' || category === 'all') {
                const data = await AIDatabase.getMaintenanceAnomalies();
                anomalyContext += `Maintenance Data: ${JSON.stringify(data)}\n`;
            }
            if (category === 'inventory' || category === 'all') {
                const data = await AIDatabase.getInventoryAnomalies();
                anomalyContext += `Inventory Data: ${JSON.stringify(data)}\n`;
            }
            return anomalyContext;
        } catch (err) {
            console.error('Error fetching anomaly context:', err);
            return 'Anomaly context unavailable.';
        }
    }
}

export default AIService;
