import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/lib/db/models/tasks/Project';
import Employee from '@/lib/db/models/payroll/Employee';
import { logActivity } from '@/lib/logger';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin", "employee", "supervisor"]);
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const memberId = searchParams.get('memberId');

        // SaaS PROTECTION: Restrict by organization
        let query = {};
        if (authUser.organizationId) {
            query.organizationId = authUser.organizationId;
        }

        
        // Employee-specific filtering: Only show projects they are members of
        if (authUser.role === "employee") {
            query.members = authUser.id;
        }
        if (status) query.status = status;
        if (memberId) query.members = memberId;

        const projects = await Project.find(query)
            .populate('projectManager', 'personalDetails.firstName personalDetails.lastName')
            .populate('members', 'personalDetails.firstName personalDetails.lastName')
            .sort({ createdAt: -1 });

        return NextResponse.json({ success: true, projects });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        await dbConnect();
        const body = await request.json();

        // Auto-assign organizationId from the authenticated user
        if (authUser.role === "admin" && authUser.organizationId) {
            body.organizationId = authUser.organizationId;
        }

        const project = await Project.create(body);

        await logActivity({
            action: "created",
            entity: "Project",
            entityId: project._id,
            description: `Created project: ${project.name}`,
            details: project,
            req: request
        });

        return NextResponse.json({ success: true, project }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
