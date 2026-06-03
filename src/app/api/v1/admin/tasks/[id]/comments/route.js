import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Task from '@/lib/db/models/tasks/Task';
import User from '@/lib/db/models/User';
import { getAuthUser, authorize } from '@/lib/auth-util';

// GET — Fetch comments for a task
export async function GET(request, { params }) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin", "employee", "supervisor"]);
        await dbConnect();
        const { id } = await params;

        const task = await Task.findById(id)
            .select('comments')
            .populate('comments.user', 'name email personalDetails')
            .lean();

        if (!task) {
            return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true, 
            comments: task.comments || [] 
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST — Add a comment to a task
export async function POST(request, { params }) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin", "employee", "supervisor"]);
        await dbConnect();
        const { id } = await params;
        const body = await request.json();

        if (!body.comment || !body.comment.trim()) {
            return NextResponse.json({ success: false, error: 'Comment text is required' }, { status: 400 });
        }

        const task = await Task.findByIdAndUpdate(
            id,
            {
                $push: {
                    comments: {
                        user: authUser.id,
                        comment: body.comment.trim(),
                        attachments: body.attachments || []
                    }
                }
            },
            { new: true }
        ).populate('comments.user', 'name email personalDetails');

        if (!task) {
            return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true, 
            comments: task.comments,
            newComment: task.comments[task.comments.length - 1]
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
