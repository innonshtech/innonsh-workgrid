'use server';

import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/db/connect";
import SalaryComponent from "@/lib/db/models/payroll/SalaryComponent";
import { logActivity } from "@/lib/logger";

export async function deleteSalaryComponent(rawId) {
    try {
        // Ensure ID is a clean string
        const id = String(rawId);

        if (!id || id === 'undefined') {
            console.error("❌ Server Action: Missing ID");
            return { success: false, error: "Invalid ID provided" };
        }

        await dbConnect();

        console.log(`🗑️ Server Action processing delete for ID: ${id}`);

        const component = await SalaryComponent.findByIdAndDelete(id);

        if (!component) {
            console.warn(`⚠️ Component ${id} not found`);
            return { success: false, error: "Component not found" };
        }

        // Log locally
        console.log("✅ Component deleted from DB");

        // Attempt activity log (non-blocking)
        try {
            await logActivity({
                action: "deleted",
                entity: "SalaryComponent",
                entityId: component.name,
                description: `Deleted salary component: ${component.name}`,
                performedBy: { userId: "system" }
            });
        } catch (e) {
            console.error("Log failed:", e.message);
        }

        revalidatePath("/dashboard/payroll/components");
        // Must return simple JSON-serializable object
        return JSON.parse(JSON.stringify({ success: true, message: "Deleted successfully" }));

    } catch (error) {
        console.error("❌ Server Action Fatal Error:", error);
        return { success: false, error: error.message };
    }
}
