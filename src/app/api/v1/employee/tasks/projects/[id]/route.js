import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/lib/db/models/tasks/Project';
import { logActivity } from '@/lib/logger';

export async function GET(request, { params }) {
    try {
        await dbConnect();
        const project = await Project.findById(params.id)
            .populate('projectManager', 'personalDetails.firstName personalDetails.lastName')
            .populate('members', 'personalDetails.firstName personalDetails.lastName');

        if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });

        return NextResponse.json({ success: true, project });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const body = await request.json();

        const project = await Project.findByIdAndUpdate(params.id, body, { new: true });

        if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });

        await logActivity({
            action: "updated",
            entity: "Project",
            entityId: project._id,
            description: `Updated project: ${project.name}`,
            details: body,
            req: request
        });

        return NextResponse.json({ success: true, project });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        await dbConnect();
        const project = await Project.findByIdAndDelete(params.id);

        if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });

        await logActivity({
            action: "deleted",
            entity: "Project",
            entityId: project._id,
            description: `Deleted project: ${project.name}`,
            req: request
        });

        return NextResponse.json({ success: true, message: 'Project deleted' });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
