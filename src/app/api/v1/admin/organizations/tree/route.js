import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Organization from "@/lib/db/models/crm/organization/Organization";
import BusinessUnit from "@/lib/db/models/crm/organization/BusinessUnit";
import Department from "@/lib/db/models/crm/Department/department";
import Team from "@/lib/db/models/crm/organization/Team";
import Employee from "@/lib/db/models/payroll/Employee";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "hr", "company_admin", "super_admin", "employee"]);
    
    await dbConnect();

    // 1. Fetch Organizations
    const filter = {};
    if (authUser.role !== "super_admin" && authUser.organizationId) {
      filter._id = authUser.organizationId;
    }
    
    const organizations = await Organization.find(filter).lean();
    
    if (!organizations || organizations.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const orgIds = organizations.map(org => org._id);

    // 2. Fetch all related entities in parallel
    const [businessUnits, departments, teams] = await Promise.all([
      BusinessUnit.find({ organizationId: { $in: orgIds }, status: "Active" })
        .populate("headOfUnit", "personalDetails.firstName personalDetails.lastName name")
        .lean(),
      Department.find({ organizationId: { $in: orgIds }, status: "Active" }).lean(),
      Team.find({ status: "Active" })
        .populate("teamLead", "personalDetails.firstName personalDetails.lastName name")
        .lean() // Team references departmentId, not organizationId directly
    ]);

    // Helper to format employee name
    const formatName = (emp) => {
      if (!emp) return null;
      if (emp.personalDetails && emp.personalDetails.firstName) {
        return `${emp.personalDetails.firstName} ${emp.personalDetails.lastName || ''}`.trim();
      }
      return emp.name || "Unknown";
    };

    // 3. Build the hierarchical tree
    const tree = organizations.map(org => {
      const orgIdStr = org._id.toString();

      // Find BUs for this Org
      const orgBUs = businessUnits.filter(bu => bu.organizationId.toString() === orgIdStr);
      
      // Find Departments for this Org
      const orgDepts = departments.filter(dept => dept.organizationId.toString() === orgIdStr);

      const buNodes = orgBUs.map(bu => {
        const buIdStr = bu._id.toString();
        // Find Depts belonging to this BU
        const buDepts = orgDepts.filter(dept => dept.businessUnitId?.toString() === buIdStr);
        
        const deptNodes = buDepts.map(dept => {
          const deptIdStr = dept._id.toString();
          // Find Teams belonging to this Dept
          const deptTeams = teams.filter(team => team.departmentId.toString() === deptIdStr);
          
          const teamNodes = deptTeams.map(team => ({
            name: team.name,
            type: "team",
            head: team.teamLead ? { name: formatName(team.teamLead) } : null,
            children: []
          }));

          return {
            name: dept.departmentName,
            type: "department",
            head: null, // Department model currently lacks a head field
            children: teamNodes
          };
        });

        return {
          name: bu.name,
          type: "businessUnit",
          head: bu.headOfUnit ? { name: formatName(bu.headOfUnit) } : null,
          children: deptNodes
        };
      });

      // Handle standalone departments (not assigned to a BU)
      const standaloneDepts = orgDepts.filter(dept => !dept.businessUnitId);
      const standaloneDeptNodes = standaloneDepts.map(dept => {
        const deptIdStr = dept._id.toString();
        const deptTeams = teams.filter(team => team.departmentId.toString() === deptIdStr);
        
        const teamNodes = deptTeams.map(team => ({
          name: team.name,
          type: "team",
          head: team.teamLead ? { name: formatName(team.teamLead) } : null,
          children: []
        }));

        return {
          name: dept.departmentName,
          type: "department",
          head: null,
          children: teamNodes
        };
      });

      return {
        name: org.name,
        type: "organization",
        head: null, // Organization head/CEO could be added here if in schema
        children: [...buNodes, ...standaloneDeptNodes]
      };
    });

    return NextResponse.json({
      success: true,
      data: tree
    });

  } catch (error) {
    console.error("GET ORG TREE ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
