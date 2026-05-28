import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AttendanceRegularization from "@/lib/db/models/payroll/AttendanceRegularization";
import Employee from "@/lib/db/models/payroll/Employee";
import User from "@/lib/db/models/User";
import { getAuthUser } from "@/lib/auth-util";

export async function GET() {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    
    let currentEmployeeId = authUser.id;
    let mappedVia = "none";
    let userRec = null;
    let emp = await Employee.findById(authUser.id).select('_id');
    
    if (emp) {
        mappedVia = "employeeObjId";
    } else {
        userRec = await User.findById(authUser.id).select('employeeId email role');
        if (userRec) {
            let mappedEmp = null;
            if (userRec.employeeId) {
                mappedEmp = await Employee.findOne({ employeeId: userRec.employeeId }).select('_id');
                if (mappedEmp) mappedVia = "userEmployeeId";
            }
            if (!mappedEmp && userRec.email) {
                mappedEmp = await Employee.findOne({ 'personalDetails.email': userRec.email }).select('_id');
                if (mappedEmp) mappedVia = "userEmail";
            }
            if (mappedEmp) currentEmployeeId = mappedEmp._id.toString();
        }
    }

    const testQuery = { approver: currentEmployeeId };

    const requests = await AttendanceRegularization.find({});
    
    return NextResponse.json({
        success: true,
        authUserId: authUser.id,
        authUserRole: authUser.role,
        userRecEmail: userRec?.email,
        computedEmployeeId: currentEmployeeId,
        mappedVia,
        allRequestsCount: requests.length,
        actualRequestsInDb: requests.map(r => ({
            id: r._id,
            approverId: r.approver?.toString()
        })),
        matchTestQuery: await AttendanceRegularization.countDocuments({ approver: currentEmployeeId })
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
