import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Organization from "@/lib/db/models/crm/organization/Organization";
import BusinessUnit from "@/lib/db/models/crm/organization/BusinessUnit";
import Department from "@/lib/db/models/crm/Department/department";
import Team from "@/lib/db/models/crm/organization/Team";
import Employee from "@/lib/db/models/payroll/Employee";

export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        let orgId = searchParams.get("orgId");

        let org;
        if (!orgId) {
            org = await Organization.findOne();
            if (!org) {
                return NextResponse.json({ error: "No organizations found" }, { status: 404 });
            }
            orgId = org._id;
        } else {
            org = await Organization.findById(orgId);
            if (!org) {
                return NextResponse.json({ error: "Organization not found" }, { status: 404 });
            }
        }

        // Fetch all related data
        const [bus, depts, teams, employees] = await Promise.all([
            BusinessUnit.find({ organizationId: orgId }).populate('headOfUnit', 'personalDetails.firstName personalDetails.lastName'),
            Department.find({ organizationId: orgId }),
            Team.find({}), // Teams are linked to depts, we'll filter in JS to keep it simple or query depts first.
            Employee.find({ 'jobDetails.organizationId': orgId, status: 'Active' })
                .select('personalDetails.firstName personalDetails.lastName jobDetails.designation jobDetails.departmentId jobDetails.businessUnitId jobDetails.teamId employeeId')
        ]);

        // Build the tree
        const buildTree = () => {
            const tree = {
                name: org.name,
                type: 'organization',
                id: org._id,
                children: []
            };

            bus.forEach(bu => {
                const buNode = {
                    name: bu.name,
                    type: 'businessUnit',
                    id: bu._id,
                    head: bu.headOfUnit ? { name: `${bu.headOfUnit.personalDetails.firstName} ${bu.headOfUnit.personalDetails.lastName}` } : null,
                    children: []
                };

                const buDepts = depts.filter(d => d.businessUnitId?.toString() === bu._id.toString());
                buDepts.forEach(dept => {
                    const deptNode = {
                        name: dept.departmentName,
                        type: 'department',
                        id: dept._id,
                        children: []
                    };

                    const deptTeams = teams.filter(t => t.departmentId?.toString() === dept._id.toString());
                    deptTeams.forEach(team => {
                        const teamNode = {
                            name: team.name,
                            type: 'team',
                            id: team._id,
                            children: []
                        };

                        const teamEmps = employees.filter(e => e.jobDetails.teamId?.toString() === team._id.toString());
                        teamEmps.forEach(emp => {
                            teamNode.children.push({
                                name: `${emp.personalDetails.firstName} ${emp.personalDetails.lastName}`,
                                type: 'employee',
                                id: emp._id,
                                designation: emp.jobDetails.designation,
                                employeeId: emp.employeeId
                            });
                        });

                        deptNode.children.push(teamNode);
                    });

                    // Also add employees directly in department if not in a team
                    const directDeptEmps = employees.filter(e =>
                        e.jobDetails.departmentId?.toString() === dept._id.toString() &&
                        !e.jobDetails.teamId
                    );
                    directDeptEmps.forEach(emp => {
                        deptNode.children.push({
                            name: `${emp.personalDetails.firstName} ${emp.personalDetails.lastName}`,
                            type: 'employee',
                            id: emp._id,
                            designation: emp.jobDetails.designation,
                            employeeId: emp.employeeId
                        });
                    });

                    buNode.children.push(deptNode);
                });

                // Add employees directly in BU if not in a dept
                const directBuEmps = employees.filter(e =>
                    e.jobDetails.businessUnitId?.toString() === bu._id.toString() &&
                    !e.jobDetails.departmentId
                );
                directBuEmps.forEach(emp => {
                    buNode.children.push({
                        name: `${emp.personalDetails.firstName} ${emp.personalDetails.lastName}`,
                        type: 'employee',
                        id: emp._id,
                        designation: emp.jobDetails.designation,
                        employeeId: emp.employeeId
                    });
                });

                tree.children.push(buNode);
            });

            // Add departments directly in Org if not in a BU
            const directDepts = depts.filter(d => !d.businessUnitId);
            directDepts.forEach(dept => {
                const deptNode = {
                    name: dept.departmentName,
                    type: 'Department',
                    id: dept._id,
                    children: []
                };
                // Reuse same team/emp logic here if needed, but keeping it simple for now
                tree.children.push(deptNode);
            });

            return tree;
        };

        return NextResponse.json({ data: [buildTree()] });

    } catch (error) {
        console.error("Org Chart API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
