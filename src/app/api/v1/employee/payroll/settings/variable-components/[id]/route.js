
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import VariablePayConfig from '@/lib/db/models/payroll/VariablePayConfig';

export async function PUT(req, { params }) {
    try {
        await dbConnect();
        const { id } = params;
        const body = await req.json();

        const updated = await VariablePayConfig.findByIdAndUpdate(
            id,
            { ...body },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return NextResponse.json({ error: 'Component not found' }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        await dbConnect();
        const { id } = params;

        // TODO: Check if this component is assigned to any employee before deleting
        // For now, simple delete
        const deleted = await VariablePayConfig.findByIdAndDelete(id);

        if (!deleted) {
            return NextResponse.json({ error: 'Component not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Component deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
