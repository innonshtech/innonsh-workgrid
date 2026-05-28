import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Loan from "@/lib/db/models/payroll/Loan";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function PUT(req, { params }) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();
        
        const { id } = await params;
        const body = await req.json();
        const { status, rejectionReason } = body;

        const loan = await Loan.findById(id);
        if (!loan) {
            return NextResponse.json({ message: "Loan not found" }, { status: 404 });
        }

        // SaaS PROTECTION: Admin restricted to their org
        if (authUser.role === "admin") {
            // We need to check the employee's org. Loan model usually has employee ref.
            // For brevity, we'll check if the loan was already marked for this org or populate employee.
            await loan.populate("employee", "jobDetails");
            if (loan.employee?.jobDetails?.organizationId?.toString() !== authUser.organizationId) {
                return NextResponse.json({ message: "Forbidden" }, { status: 403 });
            }
        }

        // Admin Operations: Approve/Reject
        if (authUser.role === "admin" || authUser.role === "super_admin") {
            if (status) {
                loan.status = status;
                if (status === "Approved") {
                    loan.approvedBy = authUser.id;
                    loan.approvalDate = new Date();
                    
                    // --- AUTOMATIC REPAYMENT SCHEDULE GENERATION ---
                    if (!loan.repaymentSchedule || loan.repaymentSchedule.length === 0) {
                        const schedule = [];
                        const installmentAmount = Math.round(loan.amount / (loan.installments || 1));
                        const startDate = new Date();
                        
                        for (let i = 1; i <= (loan.installments || 1); i++) {
                            const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 10); // 10th of each following month
                            schedule.push({
                                dueDate,
                                amount: i === loan.installments ? (loan.amount - (installmentAmount * (i - 1))) : installmentAmount,
                                status: "Pending"
                            });
                        }
                        loan.repaymentSchedule = schedule;
                    }
                } else if (status === "Rejected") {
                    loan.rejectionReason = rejectionReason;
                }
            }
        } else {
            return NextResponse.json({ message: "Unauthorized to update status" }, { status: 403 });
        }

        await loan.save();
        return NextResponse.json({ message: "Loan updated successfully", loan });
    } catch (error) {
        console.error("Error updating loan:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();

        const { id } = await params;
        const loan = await Loan.findById(id);
        if (!loan) {
            return NextResponse.json({ message: "Loan not found" }, { status: 404 });
        }

        // Only allow delete if Pending
        if (loan.status !== "Pending") {
            return NextResponse.json({ message: "Cannot delete processed loan" }, { status: 400 });
        }

        // SaaS PROTECTION
        if (authUser.role === 'admin') {
            await loan.populate("employee", "jobDetails");
            if (loan.employee?.jobDetails?.organizationId?.toString() !== authUser.organizationId) {
                return NextResponse.json({ message: "Forbidden" }, { status: 403 });
            }
        } else if (authUser.role === 'employee' && loan.employee.toString() !== authUser.id) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        await Loan.findByIdAndDelete(id);
        return NextResponse.json({ message: "Loan request deleted" });

    } catch (error) {
        console.error("Error deleting loan:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
