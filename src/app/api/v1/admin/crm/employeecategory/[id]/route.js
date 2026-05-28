// // import { NextResponse } from "next/server";
// // import dbConnect from "@/lib/db/connect";
// // import EmployeeCategory from "@/lib/db/models/crm/employee/EmployeeCategory";
// // import EmployeeType from "@/lib/db/models/crm/employee/EmployeeType";
// // import Organization from "@/lib/db/models/crm/organization/Organization";
// // import Department from "@/lib/db/models/crm/Department/department";
// // import Documents from "@/lib/db/models/crm/Documents/Documents";

// // // PUT method for updating employee category
// // export async function PUT(request, { params }) {
// //   try {
// //     await dbConnect();

// //     const { id } = await params;
// //     const body = await request.json();
// //     console.log("Update request body:", body);

// //     const { 
// //       organizationName, 
// //       departmentName, 
// //       employeeType, 
// //       employeeCategory,
// //       supportedDocuments,
// //       updatedBy 
// //     } = body;

// //     // Validate required fields
// //     if (!organizationName || !departmentName || !employeeType || !employeeCategory) {
// //       return NextResponse.json(
// //         { error: "Organization, department, employee type, and category are required" },
// //         { status: 400 }
// //       );
// //     }

// //     // Find organization by name
// //     const organization = await Organization.findOne({ name: organizationName });
// //     if (!organization) {
// //       return NextResponse.json(
// //         { error: "Organization not found" },
// //         { status: 404 }
// //       );
// //     }

// //     // Find department by name and organization
// //     const department = await Department.findOne({ 
// //       departmentName: departmentName,
// //       organizationId: organization._id 
// //     });
    
// //     if (!department) {
// //       return NextResponse.json(
// //         { error: "Department not found in the specified organization" },
// //         { status: 404 }
// //       );
// //     }

// //     // Find employee type
// //     const employeeTypeDoc = await EmployeeType.findOne({
// //       organizationId: organization._id,
// //       departmentId: department._id,
// //       employeeType: employeeType.trim()
// //     });

// //     if (!employeeTypeDoc) {
// //       return NextResponse.json(
// //         { error: "Employee type not found for this organization and department" },
// //         { status: 404 }
// //       );
// //     }

// //     // Check if category already exists (excluding the current one being updated)
// //     const existingCategory = await EmployeeCategory.findOne({
// //       _id: { $ne: id }, // Exclude current category
// //       organizationId: organization._id,
// //       departmentId: department._id,
// //       employeeTypeId: employeeTypeDoc._id,
// //       employeeCategory: employeeCategory.trim()
// //     });

// //     if (existingCategory) {
// //       return NextResponse.json(
// //         { error: "Employee category already exists for this employee type" },
// //         { status: 409 }
// //       );
// //     }

// //     // Validate supported documents if provided
// //     let validDocumentIds = [];
// //     if (supportedDocuments && supportedDocuments.length > 0) {
// //       console.log("Processing supportedDocuments:", supportedDocuments);
      
// //       // First, try to convert string IDs to ObjectIds if they're valid
// //       validDocumentIds = supportedDocuments.map(docId => {
// //         try {
// //           // If it's already an ObjectId string, use it directly
// //           if (mongoose.Types.ObjectId.isValid(docId)) {
// //             // If it's a 24-character hex string, convert to ObjectId
// //             if (typeof docId === 'string' && docId.length === 24) {
// //               return new mongoose.Types.ObjectId(docId);
// //             }
// //             // If it's already an ObjectId, return it
// //             return docId;
// //           }
// //           console.error("Invalid document ID format:", docId);
// //           return null;
// //         } catch (error) {
// //           console.error("Error processing document ID:", docId, error);
// //           return null;
// //         }
// //       }).filter(Boolean);


// //       console.log();
      
// //       // Check if documents exist in the database
// //       const existingDocuments = await Documents?.find({
// //         _id: { $in: validDocumentIds }
// //       }).select("_id");

// //       if (existingDocuments.length !== validDocumentIds.length) {
// //         return NextResponse.json(
// //           { error: "One or more document IDs are invalid" },
// //           { status: 400 }
// //         );
// //       }
// //     }

// //     // Create update payload
// //     const updatePayload = {
// //       organizationId: organization._id,
// //       departmentId: department._id,
// //       employeeTypeId: employeeTypeDoc._id,
// //       employeeCategory: employeeCategory.trim(),
// //       updatedBy: updatedBy || "66e2f79f3b8d2e1f1a9d9c33"
// //     };

// //     // Add supported documents if provided
// //     if (validDocumentIds.length > 0) {
// //       updatePayload.supportedDocuments = validDocumentIds;
// //     }

// //     console.log("Updating employee category with payload:", updatePayload);

// //     // Update the category
// //     const updatedCategory = await EmployeeCategory.findByIdAndUpdate(
// //       id,
// //       updatePayload,
// //       { new: true, runValidators: true }
// //     );

// //     if (!updatedCategory) {
// //       return NextResponse.json(
// //         { error: "Employee category not found" },
// //         { status: 404 }
// //       );
// //     }

// //     // Populate the updated document for response
// //     const populatedCategory = await EmployeeCategory.findById(updatedCategory._id)
// //       .populate("organizationId", "name")
// //       .populate("departmentId", "departmentName")
// //       .populate("employeeTypeId", "employeeType")
// //       .populate("supportedDocuments", "name")
// //       .populate("createdBy", "name")
// //       .populate("updatedBy", "name");

// //     console.log("Updated employee category:", populatedCategory);

// //     return NextResponse.json(
// //       { 
// //         message: "Employee Category updated successfully", 
// //         category: populatedCategory 
// //       },
// //       { status: 200 }
// //     );
// //   } catch (error) {
// //     console.error("Error updating employee category:", error);
    
// //     if (error.code === 11000) {
// //       return NextResponse.json(
// //         { error: "Employee category already exists" },
// //         { status: 409 }
// //       );
// //     }

// //     return NextResponse.json({ error: error.message }, { status: 400 });
// //   }
// // }


// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db/connect";
// import EmployeeCategory from "@/lib/db/models/crm/employee/EmployeeCategory";
// import EmployeeType from "@/lib/db/models/crm/employee/EmployeeType";
// import Organization from "@/lib/db/models/crm/organization/Organization";
// import Department from "@/lib/db/models/crm/Department/department";
// import Documents from "@/lib/db/models/crm/Documents/Documents";

// // PUT method for updating employee category
// export async function PUT(request, { params }) {
//   try {
//     await dbConnect();

//     const { id } = await params;
//     const body = await request.json();
//     console.log("Update request body:", body);

//     const { 
//       organizationName, 
//       departmentName, 
//       employeeType, 
//       employeeCategory,
//       supportedDocuments,
//       updatedBy 
//     } = body;

//     // Validate required fields
//     if (!organizationName || !departmentName || !employeeType || !employeeCategory) {
//       return NextResponse.json(
//         { error: "Organization, department, employee type, and category are required" },
//         { status: 400 }
//       );
//     }

//     // Find organization by name
//     const organization = await Organization.findOne({ name: organizationName });
//     if (!organization) {
//       return NextResponse.json(
//         { error: "Organization not found" },
//         { status: 404 }
//       );
//     }

//     // Find department by name and organization
//     const department = await Department.findOne({ 
//       departmentName: departmentName,
//       organizationId: organization._id 
//     });
    
//     if (!department) {
//       return NextResponse.json(
//         { error: "Department not found in the specified organization" },
//         { status: 404 }
//       );
//     }

//     // Find employee type
//     const employeeTypeDoc = await EmployeeType.findOne({
//       organizationId: organization._id,
//       departmentId: department._id,
//       employeeType: employeeType.trim()
//     });

//     if (!employeeTypeDoc) {
//       return NextResponse.json(
//         { error: "Employee type not found for this organization and department" },
//         { status: 404 }
//       );
//     }

//     // Check if category already exists (excluding the current one being updated)
//     const existingCategory = await EmployeeCategory.findOne({
//       _id: { $ne: id }, // Exclude current category
//       organizationId: organization._id,
//       departmentId: department._id,
//       employeeTypeId: employeeTypeDoc._id,
//       employeeCategory: employeeCategory.trim()
//     });

//     if (existingCategory) {
//       return NextResponse.json(
//         { error: "Employee category already exists for this employee type" },
//         { status: 409 }
//       );
//     }

//     // Create update payload
//     const updatePayload = {
//       organizationId: organization._id,
//       departmentId: department._id,
//       employeeTypeId: employeeTypeDoc._id,
//       employeeCategory: employeeCategory.trim(),
//       updatedBy: updatedBy || "66e2f79f3b8d2e1f1a9d9c33"
//     };

//     // Handle supported documents if provided
//     if (supportedDocuments && supportedDocuments.length > 0) {
//       console.log("Processing supportedDocuments:", supportedDocuments);
      
//       // Simple validation - only accept strings that look like ObjectIds
//       const validDocumentIds = supportedDocuments.filter(docId => {
//         // Check if it's a valid 24-character hex string
//         const isValid = typeof docId === 'string' && /^[0-9a-fA-F]{24}$/.test(docId);
//         if (!isValid) {
//           console.error("Invalid document ID format:", docId);
//         }
//         return isValid;
//       });

//       console.log("Valid document IDs after filtering:", validDocumentIds);

//       if (validDocumentIds.length > 0) {
//         // Check if documents exist in database
//         const existingDocuments = await Documents.find({
//           _id: { $in: validDocumentIds }
//         }).select("_id");

//         console.log("Found existing documents:", existingDocuments.length);

//         if (existingDocuments.length !== validDocumentIds.length) {
//           return NextResponse.json(
//             { error: "One or more document IDs are invalid" },
//             { status: 400 }
//           );
//         }

//         // Mongoose will automatically convert these strings to ObjectIds
//         updatePayload.supportedDocuments = validDocumentIds;
//       }
//     }

//     console.log("Updating employee category with payload:", updatePayload);

//     // Update the category
//     const updatedCategory = await EmployeeCategory.findByIdAndUpdate(
//       id,
//       updatePayload,
//       { new: true, runValidators: true }
//     );

//     if (!updatedCategory) {
//       return NextResponse.json(
//         { error: "Employee category not found" },
//         { status: 404 }
//       );
//     }

//     // Populate the updated document for response
//     const populatedCategory = await EmployeeCategory.findById(updatedCategory._id)
//       .populate("organizationId", "name")
//       .populate("departmentId", "departmentName")
//       .populate("employeeTypeId", "employeeType")
//       .populate("supportedDocuments", "name")
//       .populate("createdBy", "name")
//       .populate("updatedBy", "name");

//     console.log("Updated employee category:", populatedCategory);

//     return NextResponse.json(
//       { 
//         message: "Employee Category updated successfully", 
//         category: populatedCategory 
//       },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Error updating employee category:", error);
    
//     if (error.code === 11000) {
//       return NextResponse.json(
//         { error: "Employee category already exists" },
//         { status: 409 }
//       );
//     }

//     return NextResponse.json({ error: error.message }, { status: 400 });
//   }
// }

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import EmployeeCategory from "@/lib/db/models/crm/employee/EmployeeCategory";
import Documents from "@/lib/db/models/crm/Documents/Documents";
import Organization from "@/lib/db/models/crm/organization/Organization";
import Department from "@/lib/db/models/crm/Department/department";
import EmployeeType from "@/lib/db/models/crm/employee/EmployeeType";

// GET single employee category by ID
export async function GET(request, { params }) {
  try {
    await dbConnect();

    const { id } = await params;
    
    console.log("📥 Fetching employee category with ID:", id);

    const category = await EmployeeCategory.findById(id)
      .populate("organizationId", "name")
      .populate("departmentId", "departmentName")
      .populate("employeeTypeId", "employeeType")
      .populate("supportedDocuments", "name description") // Added description field
      .populate("createdBy", "name")
      .populate("updatedBy", "name");

    if (!category) {
      return NextResponse.json(
        { error: "Employee category not found" },
        { status: 404 }
      );
    }

    console.log("✅ Found employee category:", category.employeeCategory);
    console.log("📄 Supported documents:", category.supportedDocuments);

    return NextResponse.json({
      message: "Employee category retrieved successfully",
      category
    });
  } catch (error) {
    console.error("❌ Error fetching employee category:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT method for updating employee category
export async function PUT(request, { params }) {
  try {
    await dbConnect();

    const { id } = await params;
    const body = await request.json();
    console.log("Update request body:", body);

    const { 
      organizationName, 
      departmentName, 
      employeeType, 
      employeeCategory,
      supportedDocuments,
      updatedBy 
    } = body;

    // Validate required fields
    if (!organizationName || !departmentName || !employeeType || !employeeCategory) {
      return NextResponse.json(
        { error: "Organization, department, employee type, and category are required" },
        { status: 400 }
      );
    }

    // Find organization by name
    const organization = await Organization.findOne({ name: organizationName });
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Find department by name and organization
    const department = await Department.findOne({ 
      departmentName: departmentName,
      organizationId: organization._id 
    });
    
    if (!department) {
      return NextResponse.json(
        { error: "Department not found in the specified organization" },
        { status: 404 }
      );
    }

    // Find employee type
    const employeeTypeDoc = await EmployeeType.findOne({
      organizationId: organization._id,
      departmentId: department._id,
      employeeType: employeeType.trim()
    });

    if (!employeeTypeDoc) {
      return NextResponse.json(
        { error: "Employee type not found for this organization and department" },
        { status: 404 }
      );
    }

    // Check if category already exists (excluding the current one being updated)
    const existingCategory = await EmployeeCategory.findOne({
      _id: { $ne: id }, // Exclude current category
      organizationId: organization._id,
      departmentId: department._id,
      employeeTypeId: employeeTypeDoc._id,
      employeeCategory: employeeCategory.trim()
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "Employee category already exists for this employee type" },
        { status: 409 }
      );
    }

    // Create update payload
    const updatePayload = {
      organizationId: organization._id,
      departmentId: department._id,
      employeeTypeId: employeeTypeDoc._id,
      employeeCategory: employeeCategory.trim(),
      updatedBy: updatedBy || "66e2f79f3b8d2e1f1a9d9c33"
    };

    // Handle supported documents if provided
    if (supportedDocuments && supportedDocuments.length > 0) {
      console.log("Processing supportedDocuments:", supportedDocuments);
      
      // Simple validation - only accept strings that look like ObjectIds
      const validDocumentIds = supportedDocuments.filter(docId => {
        // Check if it's a valid 24-character hex string
        const isValid = typeof docId === 'string' && /^[0-9a-fA-F]{24}$/.test(docId);
        if (!isValid) {
          console.error("Invalid document ID format:", docId);
        }
        return isValid;
      });

      console.log("Valid document IDs after filtering:", validDocumentIds);

      if (validDocumentIds.length > 0) {
        // Check if documents exist in database
        const existingDocuments = await Documents.find({
          _id: { $in: validDocumentIds }
        }).select("_id");

        console.log("Found existing documents:", existingDocuments.length);

        if (existingDocuments.length !== validDocumentIds.length) {
          return NextResponse.json(
            { error: "One or more document IDs are invalid" },
            { status: 400 }
          );
        }

        // Mongoose will automatically convert these strings to ObjectIds
        updatePayload.supportedDocuments = validDocumentIds;
      }
    }

    console.log("Updating employee category with payload:", updatePayload);

    // Update the category
    const updatedCategory = await EmployeeCategory.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return NextResponse.json(
        { error: "Employee category not found" },
        { status: 404 }
      );
    }

    // Populate the updated document for response
    const populatedCategory = await EmployeeCategory.findById(updatedCategory._id)
      .populate("organizationId", "name")
      .populate("departmentId", "departmentName")
      .populate("employeeTypeId", "employeeType")
      .populate("supportedDocuments", "name description") // Added description
      .populate("createdBy", "name")
      .populate("updatedBy", "name");

    console.log("Updated employee category:", populatedCategory);

    return NextResponse.json(
      { 
        message: "Employee Category updated successfully", 
        category: populatedCategory 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating employee category:", error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Employee category already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}