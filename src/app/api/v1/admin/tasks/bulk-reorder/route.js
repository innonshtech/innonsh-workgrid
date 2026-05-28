import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Task from '@/lib/db/models/tasks/Task';
import { getAuthUser, authorize } from '@/lib/auth-util';

// POST — Batch reorder tasks after drag-and-drop
export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin", "employee", "supervisor"]);
        await dbConnect();

        const { tasks } = await request.json();

        if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
            return NextResponse.json({ success: false, error: 'Tasks array is required' }, { status: 400 });
        }

        // Bulk update all tasks with new status and order
        const bulkOps = tasks.map(t => ({
            updateOne: {
                filter: { _id: t._id, organizationId: authUser.organizationId },
                update: { 
                    $set: { 
                        status: t.status, 
                        boardOrder: t.boardOrder,
                        updatedAt: new Date()
                    } 
                }
            }
        }));

        await Task.bulkWrite(bulkOps);

        return NextResponse.json({ 
            success: true, 
            message: `Updated ${tasks.length} tasks` 
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
