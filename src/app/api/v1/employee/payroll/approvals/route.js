import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import ApprovalWorkflow from '@/lib/db/models/payroll/ApprovalWorkflow';
import Employee from '@/lib/db/models/payroll/Employee';
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const organizationId = searchParams.get('organizationId');
    
    let filter = {};
    
    // SaaS PROTECTION: Restrict by organization
    if (authUser.role === "admin" || authUser.role === "supervisor") {
        filter.organizationId = authUser.organizationId;
    } else if (authUser.role === "employee") {
        // Employees can only see workflows they initiated
        filter.initiatedBy = authUser.id;
    } else if (authUser.role === "super_admin" && organizationId) {
        filter.organizationId = organizationId;
    }

    if (type) filter.type = type;
    if (status) filter.status = status;
    
    const approvals = await ApprovalWorkflow.find(filter)
      .populate('steps.approver', 'name email')
      .populate('initiatedBy', 'name email')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ approvals });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}