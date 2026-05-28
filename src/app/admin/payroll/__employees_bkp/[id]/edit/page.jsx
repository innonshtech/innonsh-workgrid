import EmployeeForm from '@/components/payroll/employee-form';
import dbConnect from '@/lib/db/connect';
import Employee from '@/lib/db/models/payroll/Employee';
import Department from '@/lib/db/models/crm/Department/department';
import Organization from '@/lib/db/models/crm/organization/Organization';
import EmployeeType from '@/lib/db/models/crm/employee/EmployeeType';
import EmployeeCategory from '@/lib/db/models/crm/employee/EmployeeCategory';

export default async function EmployeeEditPage({ params }) {
  const { id } = await params;

  await dbConnect();

  // Fetch employee data
  const employeeDoc = await Employee.findById(id)
    .populate('jobDetails.reportingManager', 'personalDetails.firstName personalDetails.lastName employeeId')
    .populate('attendanceApproval.shift1Supervisor', 'personalDetails.firstName personalDetails.lastName employeeId')
    .populate('attendanceApproval.shift2Supervisor', 'personalDetails.firstName personalDetails.lastName employeeId')
    .lean();

  if (!employeeDoc) {
    return <div className="p-8 text-center text-red-500">Employee not found</div>;
  }

  // Serialize the data for client component
  const employeeData = JSON.parse(JSON.stringify(employeeDoc));

  // Format dates if necessary
  if (employeeData.personalDetails?.dateOfJoining) {
    employeeData.personalDetails.dateOfJoining = new Date(
      employeeData.personalDetails.dateOfJoining
    )
      .toISOString()
      .split("T")[0];
  }
  if (employeeData.personalDetails?.dateOfBirth) {
    employeeData.personalDetails.dateOfBirth = new Date(
      employeeData.personalDetails.dateOfBirth
    )
      .toISOString()
      .split("T")[0];
  }

  return <EmployeeForm employeeData={employeeData} isEdit={true} />;
}