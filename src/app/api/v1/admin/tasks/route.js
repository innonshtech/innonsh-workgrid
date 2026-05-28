// File: app/api/tasks/route.js

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Task from '@/lib/db/models/tasks/Task';
import User from '@/lib/db/models/User';
import Employee from '@/lib/db/models/payroll/Employee';
import Project from '@/lib/db/models/tasks/Project';
import mongoose from 'mongoose';
import { logActivity } from '@/lib/logger';
import { getAuthUser, authorize } from '@/lib/auth-util';

// Helper: Transform tasks to handle consistent name structure
function transformTask(task) {
  let displayName = "Unassigned";
  
  if (task.assignedTo) {
    if (task.assignedTo.personalDetails) {
      const { firstName = "", lastName = "" } = task.assignedTo.personalDetails;
      displayName = `${firstName} ${lastName}`.trim() || task.assignedTo.name || "Unknown";
    } else {
      displayName = task.assignedTo.name || "Unknown";
    }
  }

  return {
    ...task,
    assignedTo: task.assignedTo ? {
      ...task.assignedTo,
      name: displayName
    } : null
  };
}

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "employee", "supervisor"]);
    
    // Connect to database
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project');
    const viewMode = searchParams.get('view'); // 'board' or 'list'
    const assignee = searchParams.get('assignee');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');

    // SaaS PROTECTION: Restrict by organization
    let query = { organizationId: authUser.organizationId };
    
    // Employee-specific filtering: See tasks assigned TO them OR created BY them
    if (authUser.role === "employee") {
      query.$or = [
        { assignedTo: authUser.id },
        { assignedBy: authUser.id }
      ];
    }

    // Project filter
    if (projectId) {
      query.project = projectId;
    }

    // Assignee filter
    if (assignee) {
      query.assignedTo = assignee;
    }

    // Priority filter
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch all tasks from the database matching the query
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email personalDetails')
      .populate('assignedBy', 'name email')
      .populate('project', 'name prefix')
      .populate('dependencies')
      .populate('comments.user', 'name email personalDetails')
      .sort({ boardOrder: 1, createdAt: -1 })
      .lean();

    // If board view requested, group by status
    if (viewMode === 'board') {
      const transformedTasks = tasks.map(transformTask);
      const grouped = transformedTasks.reduce((acc, task) => {
        const status = task.status || 'Pending';
        if (!acc[status]) acc[status] = [];
        acc[status].push(task);
        return acc;
      }, {});

      return NextResponse.json({ 
        success: true,
        data: tasks,
        board: grouped,
        count: tasks.length
      }, { status: 200 });
    }

      // Transform for list view
      const transformedTasks = tasks.map(transformTask);

      return NextResponse.json({ 
        success: true,
        data: transformedTasks,
        count: transformedTasks.length
      }, { status: 200 });

  } catch (error) {
    console.error('❌ Error in tasks API:', error);
    console.error('❌ Error stack:', error.stack);
    
    return NextResponse.json({ 
      success: false,
      error: error.message,
      details: 'Check server logs for more information'
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "super_admin", "employee", "supervisor"]);
    
    await dbConnect();
    
    const body = await request.json();
    
    // CRITICAL: Remove _id to let MongoDB generate a unique one (fixes E11000 duplicate key)
    const { _id,assignedBy, ...cleanBody } = body;

    // Auto-assign organizationId from the authenticated user
    if (authUser.organizationId) {
        cleanBody.organizationId = authUser.organizationId;
    }
    
    // Add timestamps and creator info
    const taskData = {
      ...cleanBody,
      assignedBy: authUser.id, // Always record the authenticated user as the creator
      assignedByModel: "User",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const newTask = await Task.create(taskData);
    console.log('✅ Task created with new ID:', newTask._id);
    
    // Transform for frontend
    const transformedTask = {
      ...newTask.toObject(),
      _id: newTask._id.toString(),
      dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
      startDate: newTask.startDate ? new Date(newTask.startDate).toISOString() : null,
      createdAt: newTask.createdAt.toISOString(),
      updatedAt: newTask.updatedAt.toISOString(),
      completedAt: newTask.completedAt ? new Date(newTask.completedAt).toISOString() : null,
      completedAt: newTask.completedAt ? new Date(newTask.completedAt).toISOString() : null,
    };
    
    // Fetch assignedBy user details for logging
    const performer = await User.findById(newTask.assignedBy);

    await logActivity({
      action: "created",
      entity: "Task",
      entityId: newTask._id,
      description: `Created task: ${newTask.title}`,
      performedBy: {
        userId: newTask.assignedBy,
        name: performer?.name || "Admin/User",
        email: performer?.email,
        role: performer?.role
      },
      details: {
        assignedTo: newTask.assignedTo,
        project: newTask.project,
        priority: newTask.priority
      },
      req: request
    });

    return NextResponse.json({ 
      success: true, 
      task: transformedTask 
    });
    
  } catch (error) {
    console.error('💥 Error in task POST API:', error);
    console.error('💥 Error stack:', error.stack);
    
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return NextResponse.json({ 
        success: false,
        error: 'A task with this ID already exists. Please use a different ID or update the existing task.',
        code: 11000
      }, { status: 409 }); // Conflict
    }
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to create task',
      details: 'Check server logs for more information'
    }, { status: 500 });
  }
}