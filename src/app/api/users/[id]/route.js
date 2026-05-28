import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/db/models/User';

export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = params;

        // Validate ID format
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return NextResponse.json({ error: 'Invalid User ID format' }, { status: 400 });
        }

        const user = await User.findById(id).select('-password'); // Exclude password

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
