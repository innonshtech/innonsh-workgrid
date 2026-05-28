import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import JournalEntry from '@/lib/db/models/finance/JournalEntry';

export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const source = searchParams.get('source');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        let query = {};
        if (source) query.source = source;
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const entries = await JournalEntry.find(query)
            .populate('lines.costCenter', 'name code')
            .sort({ date: -1 });

        return NextResponse.json({ entries });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const body = await request.json();

        // Manual journal entry creation
        const entry = await JournalEntry.create(body);
        return NextResponse.json({ entry, message: "Journal entry posted successfully" }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
