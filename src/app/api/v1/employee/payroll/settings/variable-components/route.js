
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import VariablePayConfig from '@/lib/db/models/payroll/VariablePayConfig';

export async function GET() {
    try {
        await dbConnect();
        const configs = await VariablePayConfig.find({}).sort({ createdAt: -1 });
        return NextResponse.json(configs);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const body = await req.json();

        // Basic validation
        if (!body.name || !body.code || !body.frequency) {
            return NextResponse.json({ error: 'Name, Code, and Frequency are required.' }, { status: 400 });
        }

        // Check for duplicates
        const existing = await VariablePayConfig.findOne({
            $or: [{ code: body.code }, { name: body.name }]
        });

        if (existing) {
            return NextResponse.json({ error: 'Component with this Code or Name already exists.' }, { status: 400 });
        }

        const newConfig = await VariablePayConfig.create(body);
        return NextResponse.json(newConfig, { status: 201 });

    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: 'Duplicate entry found.' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
