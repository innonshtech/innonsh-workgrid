import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import Employee from '@/lib/db/models/payroll/Employee';
import User from '@/lib/db/models/User';
import Department from '@/lib/db/models/crm/Department/department';
import EmployeeCategory from '@/lib/db/models/crm/employee/EmployeeCategory';
import EmployeeType from '@/lib/db/models/crm/employee/EmployeeType';
import Organization from '@/lib/db/models/crm/organization/Organization';
import BusinessUnit from '@/lib/db/models/crm/organization/BusinessUnit';
import Team from '@/lib/db/models/crm/organization/Team';
import CostCenter from '@/lib/db/models/finance/CostCenter';
import { logActivity } from '@/lib/logger';
import bcrypt from 'bcryptjs';
import { getAuthUser, authorize } from '@/lib/auth-util';

// Helper function to clean ObjectId fields
const cleanObjectIdFields = (data) => {
  const cleaned = { ...data };

  if (cleaned.jobDetails) {
    if (cleaned.jobDetails.departmentId === '' || !cleaned.jobDetails.departmentId) {
      cleaned.jobDetails.departmentId = null;
    }
    if (cleaned.jobDetails.organizationId === '' || !cleaned.jobDetails.organizationId) {
      cleaned.jobDetails.organizationId = null;
    }
    if (cleaned.jobDetails.reportingManager === '' || !cleaned.jobDetails.reportingManager) {
      cleaned.jobDetails.reportingManager = null;
    }
    // Clean new ObjectId fields
    if (cleaned.jobDetails.teamLead === '' || !cleaned.jobDetails.teamLead) {
      cleaned.jobDetails.teamLead = null;
    }
    if (cleaned.jobDetails.supervisor === '' || !cleaned.jobDetails.supervisor) {
      cleaned.jobDetails.supervisor = null;
    }
    // Clean nested hierarchy ObjectId fields
    if (cleaned.jobDetails.employeeTypeId === '' || !cleaned.jobDetails.employeeTypeId) {
      cleaned.jobDetails.employeeTypeId = null;
    }
    if (cleaned.jobDetails.categoryId === '' || !cleaned.jobDetails.categoryId) {
      cleaned.jobDetails.categoryId = null;
    }
    if (cleaned.jobDetails.businessUnitId === '' || !cleaned.jobDetails.businessUnitId) {
      cleaned.jobDetails.businessUnitId = null;
    }
    if (cleaned.jobDetails.teamId === '' || !cleaned.jobDetails.teamId) {
      cleaned.jobDetails.teamId = null;
    }
    if (cleaned.jobDetails.costCenterId === '' || !cleaned.jobDetails.costCenterId) {
      cleaned.jobDetails.costCenterId = null;
    }
    if (cleaned.jobDetails.assignedOfficeId === '' || !cleaned.jobDetails.assignedOfficeId) {
      cleaned.jobDetails.assignedOfficeId = null;
    }
    if (cleaned.jobDetails.defaultShift === '' || !cleaned.jobDetails.defaultShift) {
      cleaned.jobDetails.defaultShift = null;
    }
  }

  if (cleaned.attendanceApproval) {
    if (cleaned.attendanceApproval.shift1Supervisor === '' || !cleaned.attendanceApproval.shift1Supervisor) {
      cleaned.attendanceApproval.shift1Supervisor = null;
    }
    if (cleaned.attendanceApproval.shift2Supervisor === '' || !cleaned.attendanceApproval.shift2Supervisor) {
      cleaned.attendanceApproval.shift2Supervisor = null;
    }
  }

  return cleaned;
};

// GET single employee
export async function GET(request, { params }) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ['admin', 'hr', 'company_admin', 'super_admin', 'employee']);
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid employee ID format' }, { status: 400 });
    }

    const employee = await Employee.findById(id)
      .populate('jobDetails.reportingManager', 'personalDetails.firstName personalDetails.lastName employeeId')
      .populate('jobDetails.departmentId', 'departmentName')
      .populate('jobDetails.organizationId', 'name')
      .populate('jobDetails.businessUnitId', 'name')
      .populate('jobDetails.teamId', 'name')
      .populate('jobDetails.costCenterId', 'name code')
      .populate('attendanceApproval.shift1Supervisor', 'personalDetails.firstName personalDetails.lastName employeeId')
      .populate('attendanceApproval.shift2Supervisor', 'personalDetails.firstName personalDetails.lastName employeeId')
      .populate('jobDetails.employeeTypeId', 'employeeType')
      .populate('jobDetails.categoryId', 'employeeCategory')
      .populate('jobDetails.defaultShift', 'name startTime endTime color')

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    // SaaS PROTECTION: Restrict admin/hr to their own org
    if (authUser.role !== "super_admin" && authUser.organizationId) {
        if (employee.jobDetails?.organizationId?._id?.toString() !== authUser.organizationId.toString()) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }
    }

    return NextResponse.json({ success: true, employee });
  } catch (error) {
    console.error('Error in GET /api/v1/admin/employees/[id]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// UPDATE employee
export async function PUT(request, { params }) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ['admin', 'hr', 'company_admin', 'super_admin']);
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid employee ID format' }, { status: 400 });
    }

    const existingEmployee = await Employee.findById(id);
    if (!existingEmployee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    // SaaS PROTECTION
    if (authUser.role !== "super_admin" && authUser.organizationId) {
        if (existingEmployee.jobDetails?.organizationId?.toString() !== authUser.organizationId.toString()) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }
    }

    if (body.personalDetails?.email && body.personalDetails.email !== existingEmployee.personalDetails.email) {
      const existingEmail = await Employee.findOne({
        'personalDetails.email': body.personalDetails.email,
        _id: { $ne: id }
      });

      if (existingEmail) {
        return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 400 });
      }
    }

    const cleanedBody = cleanObjectIdFields(body);
    
    // Ensure currentAddress is mapped to address for DB schema compatibility
    if (cleanedBody.personalDetails) {
      cleanedBody.personalDetails.address = cleanedBody.personalDetails.currentAddress || cleanedBody.personalDetails.address || {};
    }

    const updateData = {
      ...cleanedBody,
      password: cleanedBody.password ? await bcrypt.hash(cleanedBody.password, 10) : existingEmployee.password,
    };

    existingEmployee.set(updateData);
    await existingEmployee.save();

    const employee = await Employee.findById(id)
      .populate('jobDetails.reportingManager', 'personalDetails.firstName personalDetails.lastName employeeId')
      .populate('jobDetails.departmentId', 'departmentName')
      .populate('jobDetails.organizationId', 'name')
      .populate('jobDetails.businessUnitId', 'name')
      .populate('jobDetails.teamId', 'name')
      .populate('jobDetails.costCenterId', 'name code')
      .populate('attendanceApproval.shift1Supervisor', 'personalDetails.firstName personalDetails.lastName employeeId')
      .populate('attendanceApproval.shift2Supervisor', 'personalDetails.firstName personalDetails.lastName employeeId')
      .populate('jobDetails.employeeTypeId', 'employeeType')
      .populate('jobDetails.categoryId', 'employeeCategory')
      .populate('jobDetails.defaultShift', 'name startTime endTime color');

    await logActivity({
      action: "updated",
      entity: "Employee",
      entityId: employee.employeeId,
      description: `Updated employee: ${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`,
      performedBy: {
        userId: authUser.id,
        name: authUser.name,
        role: authUser.role
      },
      req: request
    });

    return NextResponse.json({ success: true, employee });
  } catch (error) {
    console.error('Error in PUT /api/v1/admin/employees/[id]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE employee
export async function DELETE(request, { params }) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ['admin', 'hr', 'company_admin', 'super_admin']);
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isPermanent = searchParams.get('permanent') === 'true';

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid employee ID format' }, { status: 400 });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    // SaaS PROTECTION
    if (authUser.role !== "super_admin" && authUser.organizationId) {
        if (employee.jobDetails?.organizationId?.toString() !== authUser.organizationId.toString()) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }
    }

    if (isPermanent) {
      await Employee.findByIdAndDelete(id);
    } else {
      employee.status = 'Inactive';
      await employee.save();
    }

    await logActivity({
      action: "deleted",
      entity: "Employee",
      entityId: employee.employeeId,
      description: `Deleted employee: ${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`,
      performedBy: {
        userId: authUser.id,
        name: authUser.name,
        role: authUser.role
      },
      req: request
    });

    return NextResponse.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/v1/admin/employees/[id]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
