// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db/connect";
// import Department from "@/lib/db/models/crm/Department/department";

// export async function GET(request, { params }) {
//   try {
//     await dbConnect();
    
//     const { id } = await params;

//     const department = await Department.findById(id);

//     if (!department) {
//       return NextResponse.json(
//         { error: "Department not found" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(department);
//   } catch (error) {
//     return NextResponse.json(
//       { error: error.message },
//       { status: 500 }
//     );
//   }
// }

// export async function PUT(request, { params }) {
//   try {
//     await dbConnect();
    
//     const { id } = await params;
//     const body = await request.json();

//     const department = await Department.findByIdAndUpdate(
//       id,
//       body,
//       { new: true, runValidators: true }
//     );

//     if (!department) {
//       return NextResponse.json(
//         { error: "Department not found" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(
//       { message: "Department updated successfully", department },
//       { status: 200 }
//     );
//   } catch (error) {
//     return NextResponse.json(
//       { error: error.message },
//       { status: 400 }
//     );
//   }
// }

// export async function DELETE(request, { params }) {
//   try {
//     await dbConnect();
    
//     const { id } = await params;

//     const department = await Department.findByIdAndDelete(id);

//     if (!department) {
//       return NextResponse.json(
//         { error: "Department not found" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(
//       { message: "Department deleted successfully" },
//       { status: 200 }
//     );
//   } catch (error) {
//     return NextResponse.json(
//       { error: error.message },
//       { status: 400 }
//     );
//   }
// }


import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Department from "@/lib/db/models/crm/Department/department";
import Organization from "@/lib/db/models/crm/organization/Organization";

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = await params;

    const department = await Department.findById(id)
      .populate('organizationId', 'name')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Transform data for frontend
    const transformedDepartment = {
      _id: department._id,
      departmentName: department.departmentName,
      status: department.status,
      organizationId: department.organizationId?._id,
      organizationName: department.organizationId?.name,
      createdBy: department.createdBy?.name,
      updatedBy: department.updatedBy?.name,
      permissions: department.permissions,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt
    };

    return NextResponse.json(transformedDepartment);
  } catch (error) {
    console.error("Get department error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const body = await request.json();

    // If organizationId is being updated, verify it exists
    if (body.organizationId) {
      const organization = await Organization.findById(body.organizationId);
      if (!organization) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }
    }

    // If departmentName is being updated, check for duplicates
    if (body.departmentName) {
      const existingDepartment = await Department.findOne({
        departmentName: body.departmentName.trim(),
        _id: { $ne: id }
      });
      
      if (existingDepartment) {
        return NextResponse.json(
          { error: "Department name already exists" },
          { status: 400 }
        );
      }
    }

    const department = await Department.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    )
    .populate('organizationId', 'name')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name');

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Transform data for frontend
    const transformedDepartment = {
      _id: department._id,
      departmentName: department.departmentName,
      status: department.status,
      organizationId: department.organizationId?._id,
      organizationName: department.organizationId?.name,
      createdBy: department.createdBy?.name,
      updatedBy: department.updatedBy?.name,
      permissions: department.permissions,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt
    };

    return NextResponse.json(
      { message: "Department updated successfully", department: transformedDepartment },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update department error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = await params;

    const department = await Department.findByIdAndDelete(id);

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Department deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete department error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}