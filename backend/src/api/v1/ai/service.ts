import AIDatabase from './database';

class AIService {
    static async getRawSystemContext() {
        try {
            return await AIDatabase.getSystemContext();
        } catch (err) {
            console.error('Error fetching raw context:', err);
            return {};
        }
    }

    static async getSystemContext(userQuery?: string) {
        try {
            const context = await AIDatabase.getSystemContext();
            const q = (userQuery || '').toLowerCase();

            return `
Operational Context (Live Camp Management Database — RAG Retrieval Engine v2):
- Camps, Capacity & Utilization:
${JSON.stringify(context.camps, null, 2)}

- Department & Workforce Distribution (True Department & Sub-Department Breakdown):
${JSON.stringify(context.departments, null, 2)}

- Facility Bed Classification & Room Matrix (1x1 to 6x1 distribution):
${JSON.stringify(context.room_matrix, null, 2)}

- Employee Supplier Distribution across Camps:
${JSON.stringify(context.suppliers, null, 2)}

- Room Status Summary:
${JSON.stringify(context.rooms, null, 2)}

- Low Inventory Alert Items:
${JSON.stringify(context.inventory, null, 2)}

- Maintenance Tickets Breakdown:
${JSON.stringify(context.tickets, null, 2)}

- Financial Metrics (Revenue, Catering Cost, Rent):
${JSON.stringify(context.financials, null, 2)}

Camp-365 Enterprise Operational SOPs & Domain Policies:
1. True Departments: Major operating divisions include HERD (Heavy Equipment Rental Dept), PMTA (Plant Maintenance Technical Assistance), MBS/EMBS (Modular Building Services), VSD (Valve Services), RSD (Rotating Services), T&L (Transport & Logistics), HSE, and Administration.
2. Sub-Departments: Specialized units such as Waste Management, Rigging, Scaffolding, HVAC, Electrical, and Fabrication operate under these main departments.
3. Bed Tariffs: 1x1 Executive Suite (45 SAR/day), 2x1 Senior Staff (30 SAR/day), 3x1 (22 SAR/day), 4x1 Standard (16 SAR/day), 6x1 Labor (12 SAR/day).
4. Daily Food Rate: 20 SAR/day per inmate unless explicit catering opt-out ("No Food") is approved.
5. Vacation Holding Fee: Inmates away on annual leave retain bed reservation at 12 SAR/day room-holding charge with 0 SAR catering fee.
6. Aramco Compliance: Maximum occupancy must never exceed room design capacity. Negative occupancy or unassigned beds must be immediately flagged.
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
