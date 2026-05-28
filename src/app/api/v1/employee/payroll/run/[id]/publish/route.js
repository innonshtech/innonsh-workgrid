import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import PayrollRun from "@/lib/db/models/payroll/PayrollRun";
import Payslip from "@/lib/db/models/payroll/Payslip";
import { logActivity } from "@/lib/logger";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function PUT(request, { params }) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin"]);

    await dbConnect();
    const { id } = params;

    const run = await PayrollRun.findById(id);
    if (!run) {
      return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
    }

    // SaaS PROTECTION
    if (authUser.role === "admin" && run.organizationId.toString() !== authUser.organizationId) {
       return NextResponse.json({ error: "Forbidden: This payroll run belongs to another organization" }, { status: 403 });
    }

    if (run.status !== 'Locked') {
        return NextResponse.json({ error: "A payroll run must be Locked before it can be Published" }, { status: 400 });
    }

    // Publish the run
    run.status = 'Published';
    run.updatedBy = authUser.id;
    await run.save();

    // Publish all associated payslips
    await Payslip.updateMany(
        { payrollRunId: run._id, status: 'Locked' },
        { $set: { status: 'Published', updatedBy: authUser.id } }
    );

    await logActivity({
      action: "published",
      entity: "PayrollRun",
      entityId: run.runId,
      description: `Published payroll run ${run.runId} for ${run.month}/${run.year}`,
      performedBy: { userId: authUser.id, name: authUser.name },
      req: request
    });

    return NextResponse.json({ message: "Payroll run published successfully. Payslips are now visible to employees.", run }, { status: 200 });

  } catch (error) {
    console.error("Publish Payroll Run Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
