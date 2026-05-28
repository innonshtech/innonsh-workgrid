// api/crm/template/[id]/route.js
import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db/connect'
import Template from '@/lib/db/models/crm/Template'

// Get single template by ID
export async function GET(request, { params }) {
  try {
    await dbConnect()
    const { id } = params
    
    const template = await Template.findById(id)
    
    if (!template) {
      return NextResponse.json(
        { message: 'Template not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(template, { status: 200 })
  } catch (error) {
    console.error('Get template error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update template by ID
export async function PUT(request, { params }) {
  try {
    await dbConnect()
    const { id } = params
    const updateData = await request.json()
    
    // TODO: Add authentication - you need to get the user ID from the session/token
    const createdBy = updateData.createdBy || 'placeholder-user-id'
    
    // If setting as default, remove default from other templates
    if (updateData.isDefault) {
      await Template.updateMany(
        { 
          _id: { $ne: id },
          createdBy: createdBy,
          isDefault: true 
        },
        { $set: { isDefault: false } }
      )
    }
    
    // Update the template
    const template = await Template.findByIdAndUpdate(
      id,
      { 
        ...updateData,
        updatedAt: new Date()
      },
      { 
        new: true, // Return the updated document
        runValidators: true // Run model validators
      }
    )
    
    if (!template) {
      return NextResponse.json(
        { message: 'Template not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(template, { status: 200 })
  } catch (error) {
    console.error('Update template error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete template by ID
export async function DELETE(request, { params }) {
  try {
    await dbConnect()
    const { id } = params
    
    // Check if template exists
    const template = await Template.findById(id)
    
    if (!template) {
      return NextResponse.json(
        { message: 'Template not found' },
        { status: 404 }
      )
    }
    
    // Prevent deletion of default template if it's the only one
    if (template.isDefault) {
      const templateCount = await Template.countDocuments({ 
        createdBy: template.createdBy 
      })
      
      if (templateCount <= 1) {
        return NextResponse.json(
          { message: 'Cannot delete the only template' },
          { status: 400 }
        )
      }
      
      // If deleting default template, set another template as default
      const anotherTemplate = await Template.findOne({ 
        _id: { $ne: id },
        createdBy: template.createdBy
      })
      
      if (anotherTemplate) {
        anotherTemplate.isDefault = true
        await anotherTemplate.save()
      }
    }
    
    // Delete the template
    await Template.findByIdAndDelete(id)
    
    return NextResponse.json(
      { message: 'Template deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete template error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}