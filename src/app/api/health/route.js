
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';

export async function GET() {
    return NextResponse.json({ status: 'ok', has_db: !!dbConnect });
}
