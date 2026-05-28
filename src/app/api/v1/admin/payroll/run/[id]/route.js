import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PayrollRun from '@/lib/db/models/payroll/PayrollRun';
import Payslip from '@/lib/db/models/payroll/Payslip';
import RetroAdjustment from '@/lib/db/models/payroll/RetroAdjustment';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const run = await PayrollRun.findById(id)
            .populate('organizationId', 'name')
            .populate('generatedBy', 'name');

        if (!run) return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });

        // Fetch all payslips for this run
        const payslips = await Payslip.find({ payrollRunId: run._id })
            .populate('employee', 'employeeId personalDetails.firstName personalDetails.lastName jobDetails.department')
            .lean();

        return NextResponse.json({ run, payslips });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();
        const { status, updatedBy } = body;

        const run = await PayrollRun.findById(id);
        if (!run) return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });

        // Prevent transitions from Locked/Cancelled
        if (run.status === 'Locked' || run.status === 'Cancelled') {
            return NextResponse.json({ error: "Cannot modify a Locked or Cancelled payroll run." }, { status: 400 });
        }

        run.status = status || run.status;
        if (status === 'Locked') {
            run.lockedBy = updatedBy;
            run.lockedAt = new Date();
        }

        await run.save();

        await logActivity({
            action: "updated",
            entity: "PayrollRun",
            entityId: run.runId,
            description: `Payroll run status changed to ${run.status}`,
            performedBy: { userId: updatedBy },
            req: request
        });

        return NextResponse.json(run);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;

        const run = await PayrollRun.findById(id);
        if (!run) return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });

        if (run.status === 'Locked') {
            return NextResponse.json({ error: "Cannot rollback a Locked payroll run." }, { status: 400 });
        }

        // Rollback: Delete all payslips generated in this run
        await Payslip.deleteMany({
            month: run.month,
            year: run.year,
            status: 'Draft'
            // Note: Only delete Drafts to avoid deleting manually finalized/legacy slips
        });

        // Reset Retros to 'Pending'
        await RetroAdjustment.updateMany(
            { appliedInMonth: run.month, appliedInYear: run.year },
            { status: 'Pending', $unset: { appliedInMonth: 1, appliedInYear: 1 } }
        );

        await PayrollRun.findByIdAndDelete(id);

        await logActivity({
            action: "deleted",
            entity: "PayrollRun",
            entityId: run.runId,
            description: `Rolled back and deleted payroll run for ${run.month}/${run.year}`,
            performedBy: { userId: run.generatedBy },
            req: request
        });

        return NextResponse.json({ message: "Payroll run rolled back and deleted successfully" });
    } catch (error) {
        console.error("Rollback Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
