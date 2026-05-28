// api/crm/template/route.js
import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db/connect'
import Template from '@/lib/db/models/crm/Template';
import User from '@/lib/db/models/User';
import { logActivity } from '@/lib/logger';

// Get all templates for user
export async function GET(request) {
  try {
    await dbConnect();

    const templates = await Template.find()
    console.log(templates);

    return NextResponse.json({
     success: true,
      data: templates,
    }, { status: 200 })

  } catch (error) {
    console.error('Get templates error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create new template
export async function POST(request) {
  try {
    await dbConnect();
    const templateData = await request.json()

    console.log(templateData);
    
    
    // TODO: Add authentication - you need to get the user ID from the session/token
    // For now, I'll use a placeholder. You should replace this with actual auth logic.
    const createdBy = templateData.createdBy || '6923fc13158ac11b5f1d88e3'; // Replace with actual user ID
    
    // If setting as default, remove default from other templates
    if (templateData.isDefault) {
      await Template.updateMany(
        { createdBy: createdBy, isDefault: true },
        { $set: { isDefault: false } }
      )
    }

    // Create template using Mongoose create method
    const template = await Template.create({
      ...templateData,
      createdBy: createdBy,
      isActive: true,
      // createdAt and updatedAt are automatically handled by timestamps
    })

    const performer = await User.findById(createdBy);

    await logActivity({
      action: "created",
      entity: "Template",
      entityId: template._id,
      description: `Created payslip template: ${template.name}`,
      performedBy: {
        userId: createdBy,
        name: performer?.name || "Admin/User",
        email: performer?.email,
        role: performer?.role
      },
      req: request
    });

    return NextResponse.json(template, { status: 201 })

  } catch (error) {
    console.error('Create template error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}